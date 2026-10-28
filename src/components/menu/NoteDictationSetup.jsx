import React, { useState, useEffect } from 'react';
import {
  Play,
  ArrowLeft,
  Check,
  Shuffle,
} from 'lucide-react';
import { RHYTHM_VALUES } from '../../utils/rhythmGenerator';
import { MAX_INTERVAL_OPTIONS } from '../../utils/dictationGenerator';
import ScaleSelector from './ScaleSelector';

const CLEF_OPTIONS = [
  { id: 'treble', label: 'Clé de Sol', symbol: '𝄞' },
  { id: 'bass', label: 'Clé de Fa', symbol: '𝄢' },
];

const MEASURE_COUNTS = [2, 4, 6, 8];
const ALL_TIME_SIGNATURES = ['2/4', '3/4', '4/4', '6/8', '9/8', '12/8'];
const QUICK_BPMS = [50, 60, 75, 90];

/**
 * Écran de paramétrage d'inspiration Apple pour l'exercice « Dictée de note ».
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    onStartGame(config);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-10">
      <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6">
        {/* En-tête minimaliste */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="glass-pill w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white"
              title="Retour"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="font-display text-xl font-semibold text-white tracking-tight">
              Dictée de note
            </h1>
          </div>

          <div className="glass-pill rounded-full px-3 py-1 text-xs text-zinc-300 font-medium">
            {config.measureCount} mesures · Écriture papier & crayon
          </div>
        </div>

        {/* Clé & Nombre de mesures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Clé */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-400 px-1">Clé</span>
            <div className="grid grid-cols-2 gap-2">
              {CLEF_OPTIONS.map((item) => {
                const selected = config.clef === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, clef: item.id }))}
                    className={`rounded-2xl py-3 px-3 text-center transition-all border backdrop-blur-md ${
                      selected
                        ? 'apple-segment-active'
                        : 'glass-tile text-white'
                    }`}
                  >
                    <div className="text-xl font-serif leading-none mb-1">{item.symbol}</div>
                    <div className="font-display font-semibold text-xs">{item.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nombre de mesures */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-400 px-1">Nombre de mesures</span>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] h-[62px] items-center backdrop-blur-md">
              {MEASURE_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, measureCount: count }))}
                  className={`h-full rounded-xl text-xs font-display font-semibold transition-all ${
                    config.measureCount === count
                      ? 'apple-segment-active'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tempo d'écoute (BPM) */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Tempo d'écoute</span>
            <span className="font-display text-sm font-semibold text-white">
              {config.bpm} BPM
            </span>
          </div>

          <input
            type="range"
            min={30}
            max={150}
            step={5}
            value={config.bpm}
            onChange={(e) => setConfig((prev) => ({ ...prev, bpm: Number(e.target.value) }))}
            className="w-full accent-current cursor-pointer h-1.5 rounded-lg bg-white/15"
          />

          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_BPMS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, bpm: b }))}
                className={`py-1 rounded-lg text-[11px] font-medium transition-all ${
                  config.bpm === b
                    ? 'apple-segment-active font-semibold'
                    : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Valeurs de temps voulues (Cases épurées) */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-400 px-1">
            Valeurs de temps voulues
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {RHYTHM_VALUES.map((val) => {
              const checked = config.selectedDurations.includes(val.id);
              return (
                <button
                  key={val.id}
                  type="button"
                  onClick={() => toggleDuration(val.id)}
                  className={`rounded-2xl px-3.5 py-3 text-left border transition-all flex items-center justify-between gap-2 backdrop-blur-md ${
                    checked
                      ? 'apple-tile-checked'
                      : 'glass-tile text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-serif text-lg leading-none text-white w-5 text-center shrink-0">
                      {val.symbol}
                    </span>
                    <span className="font-display font-medium text-xs truncate">
                      {val.label}
                    </span>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      checked
                        ? 'apple-check-badge'
                        : 'border border-white/20 bg-transparent'
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Signatures de temps (Sélection multiple : 1 tirée au hasard au lancement) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-zinc-400">
              Signatures de temps possibles
            </span>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Shuffle className="w-3 h-3" />
              <span>1 choisie au hasard (à reconnaître à l’oreille)</span>
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ALL_TIME_SIGNATURES.map((sig) => {
              const checked = config.selectedTimeSignatures.includes(sig);
              return (
                <button
                  key={sig}
                  type="button"
                  onClick={() => toggleTimeSignature(sig)}
                  className={`py-2.5 px-2.5 rounded-2xl text-xs font-display font-semibold border transition-all flex items-center justify-between gap-1.5 backdrop-blur-md ${
                    checked
                      ? 'apple-tile-checked'
                      : 'glass-tile text-zinc-400'
                  }`}
                >
                  <span>{sig}</span>
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                      checked ? 'apple-check-badge' : 'border border-white/20'
                    }`}
                  >
                    {checked && <Check className="w-2 h-2 stroke-[3]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Type de mélodie : Mélodie d'une gamme vs Notes hasardeuses */}
        <div className="space-y-3">
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-400 px-1">
              Nature de la mélodie
            </span>
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, melodyMode: 'scale' }))}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  config.melodyMode === 'scale'
                    ? 'apple-segment-active'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Mélodie d’une gamme
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, melodyMode: 'random' }))}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  config.melodyMode === 'random'
                    ? 'apple-segment-active'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Notes hasardeuses
              </button>
            </div>
          </div>

          {config.melodyMode === 'scale' && (
            <ScaleSelector
              keySignature={config.keySignature || 'C'}
              onChange={({ keySignature }) =>
                setConfig((prev) => ({ ...prev, keySignature }))
              }
            />
          )}
        </div>

        {/* Intervalle maximum entre deux notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-zinc-400">
              Intervalle maximum entre deux notes
            </span>
            <span className="text-[11px] text-zinc-500">
              {MAX_INTERVAL_OPTIONS.find((o) => o.id === config.maxInterval)?.label}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
            {MAX_INTERVAL_OPTIONS.map((opt) => {
              const active = config.maxInterval === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, maxInterval: opt.id }))}
                  className={`py-2 rounded-xl text-xs font-display font-semibold transition-all ${
                    active
                      ? 'apple-segment-active'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Options : Présence de silences */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-400 px-1">Options</span>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden backdrop-blur-md">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, includeRests: !prev.includeRests }))}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-white">Présence de silences</span>
                <span className="text-xs text-zinc-500">𝄽 / 𝄾</span>
              </div>
              <div
                className={`apple-switch w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                  config.includeRests ? 'is-on' : ''
                }`}
              >
                <div
                  className={`apple-switch-thumb w-5 h-5 rounded-full transition-transform duration-200 ${
                    config.includeRests ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Bouton principal */}
        <button
          type="submit"
          className="glass-button-primary w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Commencer la dictée</span>
        </button>
      </form>
    </main>
  );
}

