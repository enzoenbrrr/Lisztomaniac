import React, { useState, useRef } from 'react';
import {
  X,
  Moon,
  Sun,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Link2,
  RotateCcw,
  RefreshCw,
  Piano,
  Check,
  Radio,
  Loader2,
  Sliders,
} from 'lucide-react';
import { compressImageFileToDataUrl } from '../../utils/colorExtractor';

/**
 * Modale de Paramètres d'inspiration Apple :
 * - Choix du thème (Sombre, Clair, Galaxy, Concert/Personnalisé)
 * - Personnalisation de l'image de fond (Glisser-déposer ou URL)
 * - Configuration et test du clavier maître MIDI
 * - Rendu sonore & Piano : Sélection du SoundFont (DarkCFX .sf3 vs Web Audio) et polyphonie
 */
export default function SettingsModal({
  theme,
  onSelectTheme,
  customBg,
  onChangeCustomBg,
  concertTone = 'dark',
  midiState,
  audioSettings,
  onChangeAudioSettings,
  soundfontState,
  onReloadSoundfont,
  onClose,
}) {
  const {
    connected,
    supported,
    inputs,
    selectedInputId,
    lastPlayedNote,
    selectInput,
    reconnect,
  } = midiState;

  const [urlInput, setUrlInput] = useState(() =>
    customBg && !customBg.startsWith('data:') ? customBg : ''
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const defaultConcertBg = `${import.meta.env.BASE_URL}bg-concert.webp`;
  const activeConcertPreview = customBg || defaultConcertBg;

  const THEMES = [
    {
      id: 'dark',
      label: 'Sombre',
      sub: 'Noir animé',
      icon: Moon,
      previewClass: 'bg-[#09090b] border-white/20 text-white',
    },
    {
      id: 'light',
      label: 'Clair',
      sub: 'Blanc nacré',
      icon: Sun,
      previewClass: 'bg-[#f4f4f6] border-zinc-300 text-zinc-900',
    },
    {
      id: 'galaxy',
      label: 'Galaxy',
      sub: 'Cosmique doux',
      icon: Sparkles,
      previewClass:
        'bg-gradient-to-br from-[#0f1026] via-[#1e1b4b] to-[#2e1065] border-indigo-400/40 text-indigo-100',
    },
    {
      id: 'concert',
      label: 'Concert',
      sub: 'Fond personnalisé',
      icon: ImageIcon,
      previewClass: 'bg-zinc-900 border-amber-200/30 text-white bg-cover bg-center',
      bgImage: activeConcertPreview,
    },
  ];

  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setUploadError('Veuillez déposer un fichier image valide (JPG, PNG, WebP).');
      return;
    }
    setUploadError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      onChangeCustomBg(dataUrl);
      if (theme !== 'concert') onSelectTheme('concert');
    } catch {
      setUploadError('Impossible de charger cette image.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleApplyUrl = (e) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setUploadError(null);
    onChangeCustomBg(trimmed);
    if (theme !== 'concert') onSelectTheme('concert');
  };

  const handleResetConcertBg = () => {
    setUrlInput('');
    setUploadError(null);
    onChangeCustomBg(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="glass-panel-strong backdrop-blur-2xl w-full max-w-lg max-h-[90dvh] flex flex-col rounded-3xl overflow-hidden relative shadow-2xl">
        {/* En-tête fixe */}
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <h2
            id="settings-modal-title"
            className="font-display text-xl font-semibold text-white tracking-tight"
          >
            Paramètres
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="glass-pill w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu défilable */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">

        {/* 1. Thème de l'application */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-zinc-400 px-1">Apparence</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {THEMES.map((item) => {
              const Icon = item.icon;
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTheme(item.id)}
                  className={`rounded-2xl p-3 text-left border transition-all flex flex-col justify-between gap-3 relative backdrop-blur-md ${
                    active
                      ? 'apple-tile-checked shadow-sm'
                      : 'glass-tile'
                  }`}
                >
                  {/* Aperçu visuel du thème */}
                  <div className="flex items-center justify-between w-full">
                    <div
                      style={
                        item.bgImage
                          ? { backgroundImage: `url("${item.bgImage}")` }
                          : undefined
                      }
                      className={`theme-preview-box w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner ${item.previewClass}`}
                    >
                      <Icon className="w-4 h-4 drop-shadow" />
                    </div>
                    {active && (
                      <div className="apple-check-badge w-5 h-5 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-display text-xs font-semibold text-white">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Panneau de personnalisation du thème Concert / Image */}
          {theme === 'concert' && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3.5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white">
                  Fond personnalisé ({concertTone === 'light' ? 'Interface claire' : 'Interface sombre'})
                </span>

                {customBg && (
                  <button
                    type="button"
                    onClick={handleResetConcertBg}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Fond par défaut</span>
                  </button>
                )}
              </div>

              {/* Zone Glisser-Déposer ou Clic */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border border-dashed p-3.5 text-center cursor-pointer transition-all flex items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-white bg-white/10'
                    : 'border-white/20 hover:border-white/40 bg-white/[0.02]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Upload className="w-4 h-4 text-zinc-300 shrink-0" />
                <span className="text-xs text-zinc-300">
                  Glissez une image ici ou <strong className="text-white">parcourir</strong>
                </span>
              </div>

              {/* Champ Lien URL d'image */}
              <form onSubmit={handleApplyUrl} className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Ou collez le lien d’une image (https://...)"
                    className="glass-input w-full rounded-xl pl-8 pr-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="glass-button rounded-xl px-3.5 py-2 text-xs font-semibold text-white shrink-0"
                >
                  Appliquer
                </button>
              </form>

              {uploadError && (
                <p className="text-[11px] text-rose-400">{uploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* 2. Rendu sonore & Piano (SoundFont & Polyphonie) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-zinc-400">Rendu sonore & Piano</span>
            {soundfontState?.status === 'loading' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Chargement {soundfontState.progress ? `${Math.round(soundfontState.progress)}%` : '...'}</span>
              </span>
            )}
            {soundfontState?.status === 'ready' && audioSettings?.soundfont === 'DarkCFX' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>DarkCFX actif</span>
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] divide-y divide-white/[0.07] overflow-hidden backdrop-blur-md">
            {/* Choix du SoundFont */}
            <div className="p-4 space-y-2.5">
              <label className="text-xs font-medium text-white block">
                Banque de sons (SoundFont)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option DarkCFX (.sf3) */}
                <button
                  type="button"
                  onClick={() => onChangeAudioSettings({ soundfont: 'DarkCFX' })}
                  className={`rounded-xl p-3 text-left border transition-all flex flex-col gap-1 relative ${
                    audioSettings?.soundfont === 'DarkCFX'
                      ? 'apple-tile-checked shadow-sm'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-display text-xs font-semibold text-white">DarkCFX</span>
                    {audioSettings?.soundfont === 'DarkCFX' && (
                      <div className="apple-check-badge w-4 h-4 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">Yamaha CFX Concert (.sf3)</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {soundfontState?.status === 'ready' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Prêt en mémoire (js-synthesizer)
                      </span>
                    )}
                    {soundfontState?.status === 'loading' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Téléchargement ({soundfontState.progress}%)
                      </span>
                    )}
                    {soundfontState?.status === 'error' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReloadSoundfont?.();
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-400 hover:text-rose-300 underline"
                      >
                        Erreur — Réessayer
                      </button>
                    )}
                  </div>
                </button>

                {/* Option Synthétiseur Web Audio natif */}
                <button
                  type="button"
                  onClick={() => onChangeAudioSettings({ soundfont: 'synth' })}
                  className={`rounded-xl p-3 text-left border transition-all flex flex-col gap-1 relative ${
                    audioSettings?.soundfont === 'synth'
                      ? 'apple-tile-checked shadow-sm'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-display text-xs font-semibold text-white">Synthèse Web Audio</span>
                    {audioSettings?.soundfont === 'synth' && (
                      <div className="apple-check-badge w-4 h-4 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">Synthétiseur natif léger</span>
                  <span className="mt-1 text-[10px] text-zinc-500">Sans téléchargement</span>
                </button>
              </div>
            </div>

            {/* Réglage de la polyphonie */}
            <div className="px-4 py-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white block">Polyphonie maximale</span>
                  <span className="text-[11px] text-zinc-400">Voix simultanées du synthétiseur</span>
                </div>
                <span className="text-xs font-semibold text-white bg-white/10 px-2.5 py-0.5 rounded-md font-mono">
                  {audioSettings?.polyphony || 64} voix
                </span>
              </div>

              {/* Boutons sélecteurs de polyphonie */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[16, 32, 64, 128, 256].map((count) => {
                  const active = (audioSettings?.polyphony || 64) === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onChangeAudioSettings({ polyphony: count })}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        active
                          ? 'bg-white text-zinc-950 border-white shadow-sm'
                          : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border-white/[0.06]'
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Configuration du Clavier MIDI */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-zinc-400">Clavier MIDI</span>
            <button
              type="button"
              onClick={reconnect}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Actualiser</span>
            </button>
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] divide-y divide-white/[0.07] overflow-hidden backdrop-blur-md">
            {/* État de la connexion */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Piano className="w-4 h-4 text-zinc-300 shrink-0" />
                <span className="text-xs font-medium text-white">État</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    !supported
                      ? 'bg-rose-500'
                      : connected
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-zinc-500'
                  }`}
                />
                <span className="font-medium text-zinc-200">
                  {!supported
                    ? 'Non supporté par ce navigateur'
                    : connected
                    ? `${inputs.length} clavier${inputs.length > 1 ? 's' : ''} détecté${
                        inputs.length > 1 ? 's' : ''
                      }`
                    : 'Aucun clavier détecté (clavier virtuel)'}
                </span>
              </div>
            </div>

            {/* Sélection du périphérique MIDI */}
            {supported && (
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <label htmlFor="midi-device-select" className="text-xs font-medium text-white shrink-0">
                  Périphérique
                </label>
                {connected ? (
                  <select
                    id="midi-device-select"
                    value={selectedInputId}
                    onChange={(e) => selectInput(e.target.value)}
                    className="glass-input rounded-xl px-3 py-1.5 text-xs font-medium max-w-[210px] truncate cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-950 text-zinc-100">
                      Tous les claviers ({inputs.length})
                    </option>
                    {inputs.map((input) => (
                      <option
                        key={input.id}
                        value={input.id}
                        className="bg-zinc-950 text-zinc-100"
                      >
                        {input.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-zinc-500">Branchez un clavier USB/MIDI</span>
                )}
              </div>
            )}

            {/* Moniteur de test de note en direct */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Radio
                  className={`w-3.5 h-3.5 ${
                    lastPlayedNote ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'
                  }`}
                />
                <span className="text-xs font-medium text-white">Dernière note reçue</span>
              </div>
              {lastPlayedNote ? (
                <span className="text-xs font-semibold text-white">
                  {lastPlayedNote.nameFr}{' '}
                  <span className="text-zinc-400 font-normal">
                    (MIDI #{lastPlayedNote.midi})
                  </span>
                </span>
              ) : (
                <span className="text-xs text-zinc-500">Jouez une touche…</span>
              )}
            </div>
          </div>
        </div>

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="glass-button-primary w-full rounded-2xl py-3 text-xs sm:text-sm font-semibold"
        >
          Terminé
        </button>
        </div>
      </div>
    </div>
  );
}
