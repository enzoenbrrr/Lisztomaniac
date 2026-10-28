import { midiToNoteInfo } from '../utils/musicTheory';

// Codes de statut MIDI (nibble supérieur)
const MIDI_STATUS = {
  NOTE_OFF: 0x80,       // 128
  NOTE_ON: 0x90,        // 144
  CONTROL_CHANGE: 0xb0, // 176 (ex: CC 64 = Damper/Sustain)
};

// Fenêtre anti-rebond / anti-doublon multi-ports ou multi-canaux (en ms)
const NOTE_DEBOUNCE_MS = 120;

/**
 * Service Singleton gérant la Web MIDI API native.
 * Écoute les branchements/débranchements à chaud, filtre les doublons multi-canaux/multi-ports
 * et normalise les événements NoteOn / NoteOff / ControlChange de tous les claviers maîtres connectés.
 */
class MidiService {
  constructor() {
    this.midiAccess = null;
    this.inputs = new Map();
    this.selectedInputId = 'all'; // 'all' ou ID spécifique d'un périphérique
    this.isSupported =
      typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';

    // Abonnés aux événements
    this.noteOnListeners = new Set();
    this.noteOffListeners = new Set();
    this.controlChangeListeners = new Set();
    this.stateChangeListeners = new Set();

    // Suivi des notes actuellement maintenues et horodatage anti-rebond
    this.activeNotes = new Map();
    this.lastNoteOnTimestamp = new Map();
  }

  /**
   * Initialise la connexion Web MIDI et attache les écouteurs aux ports d'entrée.
   */
  async init() {
    if (!this.isSupported) {
      const status = {
        supported: false,
        connected: false,
        inputs: [],
        error:
          'La Web MIDI API n’est pas supportée par ce navigateur (utilisez Chrome, Edge ou Opera).',
      };
      this._notifyStateChange(status);
      return status;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      this.midiAccess.onstatechange = () => {
        this._refreshInputs();
      };

      return this._refreshInputs();
    } catch (err) {
      const status = {
        supported: true,
        connected: false,
        inputs: [],
        error: `Accès MIDI refusé ou indisponible : ${err.message}`,
      };
      this._notifyStateChange(status);
      return status;
    }
  }

  /**
   * Parcourt les entrées MIDI disponibles et attache le gestionnaire de messages.
   */
  _refreshInputs() {
    this.inputs.clear();

    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) {
        if (input.state === 'connected') {
          this.inputs.set(input.id, {
            id: input.id,
            name: input.name || 'Clavier MIDI Générique',
            manufacturer: input.manufacturer || 'Inconnu',
            state: input.state,
          });
          input.onmidimessage = (event) => this._handleMidiMessage(event, input.id);
        }
      }
    }

    const inputList = Array.from(this.inputs.values());
    const status = {
      supported: true,
      connected: inputList.length > 0,
      inputs: inputList,
      selectedInputId: this.selectedInputId,
    };

    this._notifyStateChange(status);
    return status;
  }

  /**
   * Sélectionne un périphérique MIDI particulier ou 'all' pour écouter toutes les entrées.
   */
  selectInput(inputId = 'all') {
    this.selectedInputId = inputId;
    this.activeNotes.clear();
    this._refreshInputs();
  }

  /**
   * Décode la trame binaire MIDI [status, data1, data2].
   */
  _handleMidiMessage(event, inputId) {
    if (this.selectedInputId !== 'all' && this.selectedInputId !== inputId) {
      return;
    }

    const { data } = event;
    if (!data || data.length < 2) return;

    const [status, data1, data2 = 0] = data;

    // Filtrage des messages Système Temps Réel (ex: 0xF8 Timing Clock, 0xFE Active Sensing)
    if (status >= 0xf0) return;

    // Réveil immédiat du sous-système audio dès réception d'un événement MIDI
    if (typeof window !== 'undefined' && typeof window.__lisztAudioResume === 'function') {
      window.__lisztAudioResume();
    }

    const command = status & 0xf0;
    const channel = (status & 0x0f) + 1;

    // Note On avec vélocité > 0
    if (command === MIDI_STATUS.NOTE_ON && data2 > 0) {
      this._triggerNoteOn(data1, data2, channel, inputId);
    }
    // Note Off standard OU Note On avec vélocité 0
    else if (
      command === MIDI_STATUS.NOTE_OFF ||
      (command === MIDI_STATUS.NOTE_ON && data2 === 0)
    ) {
      this._triggerNoteOff(data1, channel, inputId);
    }
    // Control Change (ex: Pédale forte / Sustain CC 64)
    else if (command === MIDI_STATUS.CONTROL_CHANGE) {
      this._triggerControlChange(data1, data2, channel, inputId);
    }
  }

  _triggerNoteOn(midiNote, velocity = 80, channel = 1, sourceId = 'virtual') {
    const now = performance.now();
    const lastTime = this.lastNoteOnTimestamp.get(midiNote) || 0;

    // Protection anti-rebond / anti-doublon
    if (this.activeNotes.has(midiNote) || now - lastTime < NOTE_DEBOUNCE_MS) {
      return;
    }

    this.lastNoteOnTimestamp.set(midiNote, now);

    const noteInfo = {
      ...midiToNoteInfo(midiNote),
      velocity,
      normalizedVelocity: +(velocity / 127).toFixed(2),
      channel,
      sourceId,
      timestamp: now,
    };

    this.activeNotes.set(midiNote, noteInfo);
    this.noteOnListeners.forEach((cb) => cb(noteInfo));
  }

  _triggerNoteOff(midiNote, channel = 1, sourceId = 'virtual') {
    if (!this.activeNotes.has(midiNote)) return;

    const noteInfo = {
      ...midiToNoteInfo(midiNote),
      channel,
      sourceId,
      timestamp: performance.now(),
    };

    this.activeNotes.delete(midiNote);
    this.noteOffListeners.forEach((cb) => cb(noteInfo));
  }

  _triggerControlChange(controller, value, channel = 1, sourceId = 'virtual') {
    const info = {
      controller,
      value,
      channel,
      sourceId,
      timestamp: performance.now(),
    };
    this.controlChangeListeners.forEach((cb) => cb(info));
  }

  /**
   * Permet de simuler une note MIDI (clavier virtuel à l'écran).
   */
  simulateNote(midiNote, durationMs = 200) {
    this.activeNotes.delete(midiNote);
    this.lastNoteOnTimestamp.delete(midiNote);

    this._triggerNoteOn(midiNote, 100, 1, 'virtual-keyboard');
    setTimeout(() => {
      this._triggerNoteOff(midiNote, 1, 'virtual-keyboard');
    }, durationMs);
  }

  // --- Gestion des abonnements (Observer pattern) ---

  onNoteOn(callback) {
    this.noteOnListeners.add(callback);
    return () => this.noteOnListeners.delete(callback);
  }

  onNoteOff(callback) {
    this.noteOffListeners.add(callback);
    return () => this.noteOffListeners.delete(callback);
  }

  onControlChange(callback) {
    this.controlChangeListeners.add(callback);
    return () => this.controlChangeListeners.delete(callback);
  }

  onStateChange(callback) {
    this.stateChangeListeners.add(callback);
    return () => this.stateChangeListeners.delete(callback);
  }

  _notifyStateChange(status) {
    this.stateChangeListeners.forEach((cb) => cb(status));
  }
}

export const midiService = new MidiService();
export default midiService;
