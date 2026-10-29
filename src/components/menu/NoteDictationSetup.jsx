import React, { useState, useEffect } from 'react';
import {
  Play,
  ArrowLeft,
  Headphones,
  Check,
  Shuffle,
  FileText,
  Music,
} from 'lucide-react';
import { RHYTHM_VALUES } from '../../utils/rhythmGenerator';
import { MAX_INTERVAL_OPTIONS } from '../../utils/dictationGenerator';
import ScaleSelector from './ScaleSelector';

const CLEF_OPTIONS = [
  {
    id: 'treble',
    label: 'Clé de Sol',
    symbol: '𝄞',
    desc: 'Registre aigu & médium (main droite)',
  },
  {
    id: 'bass',
    label: 'Clé de Fa',
    symbol: '𝄢',
    desc: 'Registre grave & médium (main gauche)',
  },
];

const MEASURE_COUNTS = [2, 4, 6, 8];
const ALL_TIME_SIGNATURES = ['2/4', '3/4', '4/4', '6/8', '9/8', '12/8'];
const QUICK_BPMS = [50, 60, 75, 90];

/**
 * Écran de configuration de l'exercice « Dictée de notes ».
 * Calqué sur le design system moderne et spacieux de « L'Oreille Harmonique » :
 * - Large conteneur spacieux (max-w-3xl) avec hiérarchie claire.
 * - Guide de transcription papier & crayon d'inspiration Apple.
 * - Tuiles de sélection confortables avec badges, sliders et interrupteurs iOS.
 */
export default function NoteDictationSetup({
  initialConfig,
  onChangeConfig,
  onStartGame,
  onBack,
}) {
  const [config, setConfig] = useState(() => ({
    clef: initialConfig?.clef || 'treble',
    measureCount: initialConfig?.measureCount || 4,
    selectedDurations:
      Array.isArray(initialConfig?.selectedDurations) &&
      initialConfig.selectedDurations.length > 0
        ? initialConfig.selectedDurations
        : ['q', '8'],
    selectedTimeSignatures:
      Array.isArray(initialConfig?.selectedTimeSignatures) &&
      initialConfig.selectedTimeSignatures.length > 0
        ? initialConfig.selectedTimeSignatures
        : ['2/4', '3/4', '4/4'],
    includeRests: Boolean(initialConfig?.includeRests),
    melodyMode: initialConfig?.melodyMode || 'scale', // 'scale' | 'random'
    keySignature: initialConfig?.keySignature || 'C',
    maxInterval: initialConfig?.maxInterval || 4,
    bpm: initialConfig?.bpm || 72,
  }));

  useEffect(() => {
    if (onChangeConfig) {
      onChangeConfig(config);
    }
  }, [config, onChangeConfig]);

  const toggleDuration = (id) => {
    setConfig((prev) => {
      const exists = prev.selectedDurations.includes(id);
      if (exists && prev.selectedDurations.length <= 1) {
        return prev;
      }
      const next = exists
        ? prev.selectedDurations.filter((item) => item !== id)
        : [...prev.selectedDurations, id];
      return { ...prev, selectedDurations: next };
    });
  };

  const toggleTimeSignature = (sig) => {
    setConfig((prev) => {
      const exists = prev.selectedTimeSignatures.includes(sig);
      if (exists && prev.selectedTimeSignatures.length <= 1) {
        return prev;
      }
      const next = exists
        ? prev.selectedTimeSignatures.filter((item) => item !== sig)
        : [...prev.selectedTimeSignatures, sig];
      return { ...prev, selectedTimeSignatures: next };
    });
  };

  const handleStart = (e) => {
    if (e) e.preventDefault();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    onStartGame(config);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 space-y-8 animate-fade-in">
      {/* En-tête : Bouton retour + Titre & Sous-titre */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour au menu principal"
          className="w-10 h-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all shrink-0 mt-0.5 backdrop-blur-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Exercice d’écoute & transcription
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400" />
            Dictée de notes
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Exercez votre oreille en retranscrivant sur papier ce que vous entendez.
          </p>
        </div>
      </div>

      {/* Guide & Méthode de travail */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4 border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center text-purple-300 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-white">
                Méthode de travail sur papier à musique
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                Munissez-vous d'une portée et d'un crayon. Écoutez le motif joué au piano autant de fois que désiré, notez ce que vous entendez, puis révélez la partition corrigée.
              </p>
            </div>
          </div>

          <div className="glass-pill rounded-full px-3.5 py-1.5 text-xs text-purple-200 font-semibold border border-purple-400/20 bg-purple-500/10 self-start sm:self-auto shrink-0 flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5" />
            <span>{config.measureCount} mesures · {config.bpm} BPM</span>
          </div>
        </div>
      </section>

      {/* Options de l'exercice */}
      <div className="space-y-6 animate-fade-in">
        {/* 1. Clé de la dictée */}
        <section className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
            Portée et Clé musicale
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CLEF_OPTIONS.map((item) => {
              const selected = config.clef === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, clef: item.id }))}
                  className={`rounded-2xl p-4 text-left transition-all border backdrop-blur-md flex flex-col justify-between min-h-[110px] ${
                    selected
                      ? 'apple-tile-checked shadow-md'
                      : 'glass-tile text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-2xl font-serif leading-none">{item.symbol}</span>
                    {selected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  <div className="mt-2">
                    <span className="font-display text-sm font-semibold text-white block">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block leading-tight">
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Longueur de la dictée (Mesures) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Nombre de mesures
            </label>
            <span className="font-display text-sm font-semibold text-white">
              {config.measureCount} mesures
            </span>
          </div>

          <div className="glass-panel rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {MEASURE_COUNTS.map((count) => {
                const active = config.measureCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, measureCount: count }))}
                    className={`py-2.5 rounded-xl text-xs font-display font-semibold transition-all backdrop-blur-sm ${
                      active
                        ? 'bg-white text-black shadow-sm font-bold'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300'
                    }`}
                  >
                    {count} mesures
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] text-zinc-400 text-center block">
              Longueur idéale pour l’entraînement de l’oreille musicale
            </span>
          </div>
        </section>

        {/* 3. Nature de la mélodie & Tonalité */}
        <section className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
            Nature de la mélodie
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, melodyMode: 'scale' }))}
              className={`rounded-2xl p-4 text-left transition-all border backdrop-blur-md flex flex-col justify-between min-h-[90px] ${
                config.melodyMode === 'scale'
                  ? 'apple-tile-checked shadow-md'
                  : 'glass-tile text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display text-sm font-semibold">
                  Mélodie d’une gamme
                </span>
                {config.melodyMode === 'scale' && <Check className="w-4 h-4 text-white" />}
              </div>
              <span className="text-[11px] text-zinc-400 mt-2">
                Phrasé musical cohérent suivant une tonalité définie.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, melodyMode: 'random' }))}
              className={`rounded-2xl p-4 text-left transition-all border backdrop-blur-md flex flex-col justify-between min-h-[90px] ${
                config.melodyMode === 'random'
                  ? 'apple-tile-checked shadow-md'
                  : 'glass-tile text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display text-sm font-semibold">
                  Notes hasardeuses
                </span>
                {config.melodyMode === 'random' && <Check className="w-4 h-4 text-white" />}
              </div>
              <span className="text-[11px] text-zinc-400 mt-2">
                Intervalles libres et imprévisibles pour une écoute pure.
              </span>
            </button>
          </div>

          {config.melodyMode === 'scale' && (
            <div className="pt-2 animate-fade-in">
              <ScaleSelector
                keySignature={config.keySignature || 'C'}
                onChange={({ keySignature }) =>
                  setConfig((prev) => ({ ...prev, keySignature }))
                }
              />
            </div>
          )}
        </section>

        {/* 4. Intervalle maximum entre deux notes */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Intervalle maximum entre deux notes
            </label>
            <span className="text-[11px] text-zinc-400 font-medium">
              {MAX_INTERVAL_OPTIONS.find((o) => o.id === config.maxInterval)?.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {MAX_INTERVAL_OPTIONS.map((opt) => {
              const active = config.maxInterval === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, maxInterval: opt.id }))}
                  className={`py-3 px-2 rounded-2xl text-xs font-display font-semibold transition-all border backdrop-blur-md flex items-center justify-center gap-1.5 ${
                    active
                      ? 'apple-tile-checked shadow-md'
                      : 'glass-tile text-zinc-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. Tempo d'écoute (BPM) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Tempo de restitution
            </label>
            <span className="font-display text-sm font-semibold text-white">
              {config.bpm} BPM
            </span>
          </div>

          <div className="glass-panel rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              {QUICK_BPMS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, bpm: b }))}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all backdrop-blur-sm ${
                    config.bpm === b
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={30}
              max={150}
              step={5}
              value={config.bpm}
              onChange={(e) => setConfig((prev) => ({ ...prev, bpm: Number(e.target.value) }))}
              className="w-full accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        </section>

        {/* 6. Figures rythmiques voulues */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Figures de notes autorisées
            </label>
            <span className="text-[11px] text-zinc-500">
              {config.selectedDurations.length} figure{config.selectedDurations.length > 1 ? 's' : ''} active{config.selectedDurations.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {RHYTHM_VALUES.map((val) => {
              const checked = config.selectedDurations.includes(val.id);
              return (
                <button
                  key={val.id}
                  type="button"
                  onClick={() => toggleDuration(val.id)}
                  className={`rounded-2xl p-3.5 text-left border transition-all flex flex-col justify-between min-h-[92px] backdrop-blur-md ${
                    checked
                      ? 'apple-tile-checked shadow-md'
                      : 'glass-tile text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-serif text-2xl leading-none text-white">
                      {val.symbol}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'apple-check-badge'
                          : 'border border-white/20 bg-transparent'
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  <span className="font-display font-medium text-xs text-white truncate mt-2">
                    {val.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 7. Signatures temporelles possibles */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Signatures de temps possibles
            </label>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Shuffle className="w-3 h-3 text-purple-400" />
              <span>1 tirée au sort à reconnaître</span>
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {ALL_TIME_SIGNATURES.map((sig) => {
              const checked = config.selectedTimeSignatures.includes(sig);
              return (
                <button
                  key={sig}
                  type="button"
                  onClick={() => toggleTimeSignature(sig)}
                  className={`py-3 px-2 rounded-2xl text-xs font-display font-semibold border transition-all flex items-center justify-center gap-2 backdrop-blur-md ${
                    checked
                      ? 'apple-tile-checked shadow-md'
                      : 'glass-tile text-zinc-300'
                  }`}
                >
                  <span>{sig}</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                      checked ? 'apple-check-badge' : 'border border-white/20'
                    }`}
                  >
                    {checked && <Check className="w-2 h-2 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 8. Options : Présence de silences */}
        <section className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
            Options d’écriture
          </label>
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-white block">
                Présence de silences
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Intègre des pauses, demi-pauses et soupirs (𝄽 / 𝄾) dans la dictée.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.includeRests}
              onClick={() => setConfig((prev) => ({ ...prev, includeRests: !prev.includeRests }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                config.includeRests ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  config.includeRests ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </section>
      </div>

      {/* Bouton principal de lancement */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleStart}
          className="glass-button-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 font-display text-base font-semibold shadow-xl group hover:scale-[1.01] transition-transform cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
          <span>Commencer la dictée</span>
        </button>
      </div>
    </main>
  );
}
