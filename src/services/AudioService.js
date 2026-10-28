import { loadAudioSettings } from '../utils/storage';

/**
 * Service Audio Lisztomaniac non-bloquant :
 * - Le moteur SoundFont (DarkCFX.sf3) tourne sur un AudioWorklet (thread audio dédié),
 *   ce qui garantit que le décodage et la synthèse n'entraînent AUCUN freeze ou ralentissement
 *   sur le thread principal de l'interface utilisateur.
 * - En cas d'indisponibilité de l'AudioWorklet ou pendant le téléchargement initial,
 *   le synthétiseur acoustique Web Audio natif assure une continuité sonore 100% fluide.
 */
class AudioService {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.dryGain = null;
    this.reverbGain = null;
    this.reverbNode = null;
    this.compressor = null;
    this.noiseBuffer = null;

    this.enabled = true;
    this.volume = 0.75;

    // Voix synthétiques natives Web Audio
    this.activeVoices = new Map(); // midiNote -> { release: Function }

    // Réglages audio utilisateur
    const savedAudio = loadAudioSettings();
    this.soundfontChoice = savedAudio.soundfont || 'DarkCFX'; // 'DarkCFX' | 'synth'
    this.polyphony = savedAudio.polyphony || 64;

    // Moteur SoundFont
    this.synth = null;
    this.synthNode = null;
    this.sfontId = null;
    this.isWorklet = false;
    this.soundfontStatus = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'
    this.soundfontProgress = 0;
    this.soundfontError = null;
    this.synthActiveNotes = new Set();
    this.stateListeners = new Set();
    this.loadPromise = null;

    // Déverrouillage automatique du contexte audio lors de la première interaction
    if (typeof window !== 'undefined') {
      window.__lisztAudioResume = () => this.resumeContext();

      const events = ['pointerdown', 'keydown', 'click', 'touchstart'];
      const unlock = () => {
        this.resumeContext();
        if (this.ctx && this.ctx.state === 'running') {
          events.forEach((evt) => window.removeEventListener(evt, unlock));
        }
      };
      events.forEach((evt) => window.addEventListener(evt, unlock, { passive: true }));
    }
  }

  /**
   * Réveille immédiatement le contexte Web Audio s'il était suspendu par le navigateur.
   */
  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  /**
   * Initialise le graphe Web Audio (Compresseur + Réverbération de salle + Bus Dry/Wet).
   */
  _ensureContext() {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      // Compresseur maître anti-écrêtage
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 3.5;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.22;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 0.85;

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.24;

      this.reverbNode = this._createRoomReverb(1.6, 2.8);

      // Câblage : dryGain -> compressor, reverbNode -> reverbGain -> compressor -> masterGain -> destination
      this.dryGain.connect(this.compressor);
      if (this.reverbNode) {
        this.reverbNode.connect(this.reverbGain);
        this.reverbGain.connect(this.compressor);
      }
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this._createHammerNoiseBuffer();

      if (this.synthNode) {
        try {
          this.synthNode.connect(this.dryGain);
        } catch {}
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  _createRoomReverb(durationSec = 1.6, decay = 2.8) {
    try {
      const rate = this.ctx.sampleRate;
      const length = Math.floor(rate * durationSec);
      const impulse = this.ctx.createBuffer(2, length, rate);

      for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const t = i / length;
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * 0.5;
        }
      }

      const convolver = this.ctx.createConvolver();
      convolver.buffer = impulse;
      return convolver;
    } catch {
      return null;
    }
  }

  _createHammerNoiseBuffer() {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * 0.035);
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, 2.2);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    return buffer;
  }

  /**
   * Charge le SoundFont DarkCFX en arrière-plan sans bloquer l'interface.
   * Utilise AudioWorklet pour exécuter le décodage et la synthèse hors du thread principal.
   */
  async initSoundFont(name = 'DarkCFX') {
    if (this.soundfontStatus === 'ready' && this.synth) {
      return true;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      try {
        this.soundfontStatus = 'loading';
        this.soundfontProgress = 5;
        this.soundfontError = null;
        this._notifyStateChange();

        const ctx = this._ensureContext();
        if (!ctx) {
          throw new Error('Web Audio indisponible');
        }

        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`;

        const soundUrl = `${baseUrl}sounds/${name}.sf3`;

        // 1. Lancement simultané du chargement du SoundFont (Réseau ou Cache Storage local)
        const soundFontPromise = this._loadSoundFontBuffer(soundUrl);

        // 2. Lancement simultané de l'initialisation du moteur FluidSynth / AudioWorklet
        const synthInitPromise = (async () => {
          const libUrl = new URL(`${baseUrl}libfluidsynth-2.4.6-with-libsndfile.js`, window.location.href).href;
          const workletUrl = new URL(`${baseUrl}js-synthesizer.worklet.js`, window.location.href).href;

          const [{ AudioWorkletNodeSynthesizer, Synthesizer, waitForReady }] = await Promise.all([
            import('js-synthesizer'),
          ]);

          let useWorklet = Boolean(ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined');

          if (useWorklet) {
            try {
              await ctx.audioWorklet.addModule(libUrl);
              await ctx.audioWorklet.addModule(workletUrl);

              this.synth = new AudioWorkletNodeSynthesizer();
              this.synthNode = this.synth.createAudioNode(ctx, {
                polyphony: this.polyphony,
                initialGain: 0.65,
                reverbActive: true,
                reverbRoomSize: 0.45,
                reverbDamp: 0.35,
                reverbWidth: 0.7,
                reverbLevel: 0.3,
              });
              this.synthNode.connect(this.dryGain);
              this.isWorklet = true;
            } catch (workletErr) {
              console.warn('AudioWorklet indisponible, repli sur le mode asynchrone principal :', workletErr);
              useWorklet = false;
            }
          }

          // Fallback si AudioWorklet non supporté dans l'environnement
          if (!useWorklet) {
            await this._loadScriptFallback(libUrl);
            await waitForReady();

            if (!this.synth) {
              this.synth = new Synthesizer();
              this.synth.init(ctx.sampleRate, {
                polyphony: this.polyphony,
                initialGain: 0.65,
                reverbActive: true,
                reverbRoomSize: 0.45,
                reverbDamp: 0.35,
                reverbWidth: 0.7,
                reverbLevel: 0.3,
              });
              this.synthNode = this.synth.createAudioNode(ctx, 2048);
              this.synthNode.connect(this.dryGain);
            }
            this.isWorklet = false;
          }
        })();

        // 3. Attente synchronisée des deux opérations parallèles (moteur audio + fichier soundfont)
        const [, sfBuffer] = await Promise.all([synthInitPromise, soundFontPromise]);

        this.soundfontProgress = 88;
        this._notifyStateChange();

        // Chargement du SoundFont dans FluidSynth (exécuté sur le thread worklet si dispo)
        this.sfontId = await this.synth.loadSFont(sfBuffer);

        // Préchauffage FluidSynth en tâche de fond (warm-up) :
        // 1. Désactive le canal percussion 9 pour éliminer tout avertissement
        // 2. Sélectionne explicitement le preset 0 (Yamaha CFX Grand) sur le canal 0
        // 3. Joue des notes silencieuses de chauffe sur 3 octaves pour décoder les zones Vorbis en RAM
        //    avant la première note jouée par l'utilisateur
        try {
          if (typeof this.synth.midiSetChannelType === 'function') {
            this.synth.midiSetChannelType(9, 0);
          }
          if (typeof this.synth.midiProgramSelect === 'function') {
            this.synth.midiProgramSelect(0, this.sfontId, 0, 0);
          }
          // Déclencher les registres grave, médium et aigu pour forcer la mise en cache
          this.synth.midiNoteOn(0, 48, 1);
          this.synth.midiNoteOn(0, 60, 1);
          this.synth.midiNoteOn(0, 72, 1);
          this.synth.midiAllSoundsOff();
        } catch (warmupErr) {
          console.warn('Erreur lors du préchauffage des voix FluidSynth :', warmupErr);
        }

        this.soundfontStatus = 'ready';
        this.soundfontProgress = 100;
        this.soundfontError = null;
        this._notifyStateChange();
        return true;
      } catch (err) {
        console.warn('Échec chargement SoundFont DarkCFX (fallback Web Audio actif) :', err);
        this.soundfontStatus = 'error';
        this.soundfontError = err?.message || 'Erreur inconnue';
        this._notifyStateChange();
        return false;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  _loadScriptFallback(src) {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.Module && window.Module._fluid_synth_sfload) {
        return resolve();
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  /**
   * Télécharge ou extrait du Cache Storage local le buffer du SoundFont DarkCFX.
   * Utilise l'API Cache du navigateur pour un chargement instantané (< 100ms) dès la deuxième visite.
   */
  async _loadSoundFontBuffer(soundUrl) {
    // 1. Tenter la lecture instantanée depuis le Cache Storage local
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await window.caches.open('liszt-soundfonts-v1');
        const cachedResponse = await cache.match(soundUrl);
        if (cachedResponse) {
          const sfBuffer = await cachedResponse.arrayBuffer();
          this.soundfontProgress = 85;
          this._notifyStateChange();
          return sfBuffer;
        }
      } catch (cacheErr) {
        console.warn('Cache Storage non disponible :', cacheErr);
      }
    }

    // 2. Téléchargement réseau avec notification de progression bridée (throttle)
    const response = await fetch(soundUrl);
    if (!response.ok) {
      throw new Error(`Erreur réseau HTTP ${response.status} (${soundUrl})`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    let lastReportedPct = 15;
    let lastReportTime = Date.now();

    let sfBuffer;
    if (response.body && typeof ReadableStream !== 'undefined') {
      const reader = response.body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;

        if (total > 0) {
          const currentPct = Math.min(85, Math.round(15 + (loaded / total) * 70));
          const now = Date.now();
          if (currentPct - lastReportedPct >= 4 || now - lastReportTime > 250) {
            lastReportedPct = currentPct;
            lastReportTime = now;
            this.soundfontProgress = currentPct;
            this._notifyStateChange();
          }
        }
      }

      const merged = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      sfBuffer = merged.buffer;
    } else {
      sfBuffer = await response.arrayBuffer();
    }

    // 3. Sauvegarder dans Cache Storage pour rendre tous les futurs chargements instantanés
    if (typeof window !== 'undefined' && 'caches' in window && sfBuffer) {
      try {
        const cache = await window.caches.open('liszt-soundfonts-v1');
        const cacheResponse = new Response(sfBuffer.slice(0), {
          headers: {
            'Content-Type': 'audio/x-soundfont',
            'Content-Length': String(sfBuffer.byteLength),
          },
        });
        cache.put(soundUrl, cacheResponse).catch(() => {});
      } catch {}
    }

    return sfBuffer;
  }

  getSoundFontState() {
    return {
      status: this.soundfontStatus,
      progress: this.soundfontProgress,
      error: this.soundfontError,
      choice: this.soundfontChoice,
      polyphony: this.polyphony,
    };
  }

  onSoundFontStateChange(callback) {
    this.stateListeners.add(callback);
    callback(this.getSoundFontState());
    return () => this.stateListeners.delete(callback);
  }

  _notifyStateChange() {
    const state = this.getSoundFontState();
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (e) {
        console.error(e);
      }
    }
  }

  setPolyphony(count) {
    const val = [16, 32, 64, 128, 256].includes(Number(count)) ? Number(count) : 64;
    this.polyphony = val;

    if (this.synth) {
      try {
        if (this.isWorklet && typeof this.synth.callFunction === 'function') {
          this.synth.callFunction('setPolyphony', val).catch(() => {});
        } else if (typeof this.synth.getRawSynthesizer === 'function') {
          const raw = this.synth.getRawSynthesizer();
          const mod = typeof window !== 'undefined' ? window.Module : null;
          if (mod && typeof mod._fluid_synth_set_polyphony === 'function') {
            mod._fluid_synth_set_polyphony(raw, val);
          }
        }
      } catch (err) {
        console.warn('Impossible de modifier dynamiquement la polyphonie :', err);
      }
    }
    this._notifyStateChange();
  }

  setSoundfontChoice(choice) {
    this.soundfontChoice = choice === 'synth' ? 'synth' : 'DarkCFX';
    if (this.soundfontChoice === 'DarkCFX' && this.soundfontStatus === 'idle') {
      this.initSoundFont('DarkCFX');
    }
    this._notifyStateChange();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stopAll();
    }
  }

  noteOn(midiNote, velocity = 90) {
    if (!this.enabled) return;

    const ctx = this._ensureContext();
    if (!ctx) return;

    const vel = Math.max(1, Math.min(127, Math.round(velocity)));

    // Si DarkCFX est actif et prêt, jouer via js-synthesizer (AudioWorklet)
    if (
      this.soundfontChoice === 'DarkCFX' &&
      this.soundfontStatus === 'ready' &&
      this.synth
    ) {
      this.synth.midiNoteOn(0, midiNote, vel);
      this.synthActiveNotes.add(midiNote);
      return;
    }

    // Sinon, synthèse Web Audio acoustique native
    this._playNativeSyntheticVoice(ctx, midiNote, vel);
  }

  noteOff(midiNote) {
    if (this.synthActiveNotes.has(midiNote)) {
      if (this.synth) {
        this.synth.midiNoteOff(0, midiNote);
      }
      this.synthActiveNotes.delete(midiNote);
    }

    const voice = this.activeVoices.get(midiNote);
    if (voice) {
      voice.release();
      this.activeVoices.delete(midiNote);
    }
  }

  stopAll() {
    if (this.synth) {
      try {
        this.synth.midiAllSoundsOff();
      } catch {}
    }
    this.synthActiveNotes.clear();

    for (const [midiNote, voice] of this.activeVoices.entries()) {
      voice.release();
      this.activeVoices.delete(midiNote);
    }
  }

  /**
   * Transmet un message MIDI Control Change (ex: CC 64 pour la pédale forte / sustain).
   * @param {number} ctrl - Numéro du contrôleur (ex: 64)
   * @param {number} val - Valeur (0 à 127)
   * @param {number} [channel=0]
   */
  controlChange(ctrl, val, channel = 0) {
    if (!this.enabled) return;
    if (this.synth) {
      try {
        this.synth.midiControl(channel, ctrl, val);
      } catch {}
    }
  }

  _playNativeSyntheticVoice(ctx, midiNote, velocity) {
    if (this.activeVoices.has(midiNote)) {
      const prev = this.activeVoices.get(midiNote);
      prev.release();
      this.activeVoices.delete(midiNote);
    }

    const now = ctx.currentTime;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const velNorm = Math.max(0.2, Math.min(1, velocity / 127));

    const registerFactor = Math.max(0.45, Math.min(1.6, Math.pow(261.63 / freq, 0.35)));
    const naturalDecayTime = 3.2 * registerFactor;

    const voiceGain = ctx.createGain();
    const peakGain = 0.24 * Math.pow(velNorm, 0.85);

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(peakGain, now + 0.005);
    voiceGain.gain.setTargetAtTime(peakGain * 0.52, now + 0.006, 0.09);
    voiceGain.gain.setTargetAtTime(0.0001, now + 0.2, naturalDecayTime * 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const attackCutoff = Math.min(14000, freq * (5.5 + velNorm * 5));
    const sustainCutoff = Math.min(5500, Math.max(320, freq * 2.4));
    filter.frequency.setValueAtTime(attackCutoff, now);
    filter.frequency.setTargetAtTime(sustainCutoff, now + 0.015, 0.22);
    filter.Q.value = 0.7;

    filter.connect(voiceGain);
    voiceGain.connect(this.dryGain);
    if (this.reverbNode) {
      voiceGain.connect(this.reverbNode);
    }

    if (this.noiseBuffer) {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = Math.min(4000, Math.max(600, freq * 2.5));
      noiseFilter.Q.value = 1.2;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.045 * velNorm;

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(voiceGain);
      noiseSource.start(now);
    }

    const partials = [
      { type: 'triangle', ratio: 1.0, detune: -1.6, amp: 0.65, decayTau: naturalDecayTime * 0.55 },
      { type: 'sine', ratio: 1.0, detune: 1.6, amp: 0.55, decayTau: naturalDecayTime * 0.55 },
      { type: 'sine', ratio: 2.0005, detune: -1.2, amp: 0.38, decayTau: naturalDecayTime * 0.38 },
      { type: 'sine', ratio: 3.0018, detune: 1.5, amp: 0.16, decayTau: naturalDecayTime * 0.24 },
      { type: 'sine', ratio: 4.004, detune: 0, amp: 0.07, decayTau: naturalDecayTime * 0.15 },
      { type: 'sine', ratio: 5.008, detune: 2.0, amp: 0.03 * velNorm, decayTau: 0.14 },
    ];

    const maxLifetime = now + naturalDecayTime + 2.5;

    const oscillators = partials.map((p) => {
      const osc = ctx.createOscillator();
      const partialGain = ctx.createGain();

      osc.type = p.type;
      osc.frequency.setValueAtTime(freq * p.ratio, now);
      osc.detune.setValueAtTime(p.detune, now);

      partialGain.gain.setValueAtTime(p.amp, now);
      partialGain.gain.setTargetAtTime(0.0001, now + 0.02, p.decayTau);

      osc.connect(partialGain);
      partialGain.connect(filter);
      osc.start(now);
      osc.stop(maxLifetime);

      return osc;
    });

    const cleanupTimer = setTimeout(() => {
      this.activeVoices.delete(midiNote);
    }, (naturalDecayTime + 2.6) * 1000);

    let isReleased = false;
    const triggerRelease = () => {
      if (isReleased) return;
      isReleased = true;
      clearTimeout(cleanupTimer);

      const releaseNow = ctx.currentTime;
      const elapsedSinceStrike = releaseNow - now;
      const delayBeforeDamper = Math.max(0, 0.28 - elapsedSinceStrike);
      const damperStartTime = releaseNow + delayBeforeDamper;
      const damperTimeConstant = 0.24;
      const stopTime = damperStartTime + damperTimeConstant * 5.2;

      try {
        voiceGain.gain.cancelScheduledValues(damperStartTime);
        voiceGain.gain.setTargetAtTime(0.0001, damperStartTime, damperTimeConstant);

        oscillators.forEach((osc) => {
          try {
            osc.stop(stopTime);
          } catch {}
        });
      } catch {}
    };

    this.activeVoices.set(midiNote, { release: triggerRelease });
  }

  playMetronomeClick(isDownbeat = false, options = {}) {
    if (!this.enabled && !options.force) return;

    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = Math.max(ctx.currentTime, options.when ?? 0);

    const osc = ctx.createOscillator();
    const clickGain = ctx.createGain();

    const baseFreq = isDownbeat ? 1180 : 820;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.032);

    const peak = isDownbeat ? 0.34 : 0.22;
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.linearRampToValueAtTime(peak, now + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

    osc.connect(clickGain);
    clickGain.connect(this.dryGain);

    osc.start(now);
    osc.stop(now + 0.042);
  }

  getAudioTime() {
    const ctx = this._ensureContext();
    return ctx ? ctx.currentTime : null;
  }
}

export const audioService = new AudioService();
export default audioService;
