import React, { useState, useEffect } from 'react';
import {
  Play,
  ArrowLeft,
  Trophy,
  Ear,
  Volume2,
  Check,
  RotateCcw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_INTERVALS_CONFIG } from '../../utils/storage';

const MAX_INTERVAL_PRESETS = [
  { value: 2, label: 'Seconde majeure (2M)', desc: '2m & 2M · Demi-ton et Ton' },
  { value: 4, label: 'Tierce majeure (3M)', desc: '2m, 2M, 3m, 3M · 1 à 4 demi-tons' },
  { value: 7, label: 'Quinte juste (5J)', desc: 'Jusqu’à la quinte · 1 à 7 demi-tons' },
  { value: 12, label: 'Octave complète (8J)', desc: 'Tous les intervalles · 1 à 12 demi-tons' },
];

const PLAYBACK_MODES = [
  { id: 'harmonic', label: 'En même temps', desc: 'Harmonique (simultané)' },
  { id: 'melodic', label: 'L’une après l’autre', desc: 'Mélodique (successif)' },
  { id: 'mixed', label: 'Mixte aléatoire', desc: 'Harmonique ou mélodique' },
];

const ROUND_PRESETS = [5, 10, 15, 20];

/**
 * Écran de configuration de l'exercice « L'Oreille Harmonique » (Reconnaissance d'intervalles).
 * Propose le Mode Classé (15 manches, notes simultanées, 1 écoute, record sauvegardé)
 * et le Mode Entraînement (manches libres de 5 à 20, choix de l'intervalle max et réécoutes).
 */
export default function IntervalTrainingSetup({
  initialConfig,
  rankedRecord = 0,
  onChangeConfig,
  onStartGame,
  onBack,
}) {
  const [config, setConfig] = useState(() => ({
    ...DEFAULT_INTERVALS_CONFIG,
    ...(initialConfig || {}),
  }));

  useEffect(() => {
    if (onChangeConfig) {
      onChangeConfig(config);
    }
  }, [config, onChangeConfig]);

  const isRanked = config.mode === 'ranked';

  const handleSelectMode = (mode) => {
    if (mode === 'ranked') {
      setConfig((prev) => ({
        ...prev,
        mode: 'ranked',
        roundCount: 15,
        playbackMode: 'harmonic',
        maxInterval: 12,
        allowReplay: false,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        mode: 'practice',
        allowReplay: true,
      }));
    }
  };

  const handleStart = () => {
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
            Exercice d’écoute
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Ear className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
            L’Oreille Harmonique
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Identifiez l’intervalle entre deux notes jouées simultanément ou successivement.
          </p>
        </div>
      </div>

      {/* Sélecteur de Mode : Classé vs Entraînement (Apple Segmented Control) */}
      <section className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
          Type de session
        </label>
        <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleSelectMode('ranked')}
            className={`rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-1.5 transition-all text-center backdrop-blur-sm ${
              isRanked
                ? 'bg-white/15 text-white shadow-lg border border-white/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-display text-sm font-semibold">
              <Trophy className="w-4 h-4 text-amber-400" />
              Mode Classé (Ranked)
            </div>
            <span className="text-[11px] text-zinc-400">
              15 manches · Notes simultanées · 1 seule écoute
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('practice')}
            className={`rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-1.5 transition-all text-center backdrop-blur-sm ${
              !isRanked
                ? 'bg-white/15 text-white shadow-lg border border-white/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-display text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Mode Entraînement
            </div>
            <span className="text-[11px] text-zinc-400">
              Personnalisé · Réécoutes autorisées
            </span>
          </button>
        </div>
      </section>

      {/* Bannière Mode Classé */}
      {isRanked ? (
        <section className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4 border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-300">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Défi Officiel des Intervalles
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  15 intervalles consécutifs joués en accords harmoniques.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-zinc-400 block uppercase tracking-wider">
                Record actuel
              </span>
              <span className="font-display text-2xl font-bold text-amber-400">
                {rankedRecord}{' '}
                <span className="text-sm font-normal text-zinc-400">/ 15</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-zinc-300 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>15 manches imposées</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Notes en même temps</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1 seule écoute (sans réécoute)</span>
            </div>
          </div>
        </section>
      ) : (
        /* Options spécifiques au Mode Entraînement */
        <div className="space-y-6 animate-fade-in">
          {/* 1. Nombre de manches (5 à 20) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Nombre de manches
              </label>
              <span className="font-display text-sm font-semibold text-white">
                {config.roundCount} manches
              </span>
            </div>

            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                {ROUND_PRESETS.map((rounds) => (
                  <button
                    key={rounds}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, roundCount: rounds }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all backdrop-blur-sm ${
                      config.roundCount === rounds
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300'
                    }`}
                  >
                    {rounds}
                  </button>
                ))}
              </div>

              {/* Slider continu 5..20 */}
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={config.roundCount}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, roundCount: Number(e.target.value) }))
                }
                className="w-full accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </section>

          {/* 2. Intervalle maximum */}
          <section className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Intervalle maximum
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MAX_INTERVAL_PRESETS.map((preset) => {
                const isSelected = config.maxInterval === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, maxInterval: preset.value }))}
                    className={`rounded-2xl p-4 text-left transition-all flex flex-col justify-between min-h-[90px] border backdrop-blur-md ${
                      isSelected
                        ? 'apple-tile-checked shadow-md'
                        : 'glass-tile text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-display text-sm font-semibold">
                        {preset.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-2">
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Mode d'écoute (Harmonique vs Mélodique vs Mixte) */}
          <section className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Mode d'écoute
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAYBACK_MODES.map((mode) => {
                const isSelected = config.playbackMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, playbackMode: mode.id }))}
                    className={`rounded-2xl p-4 text-left transition-all border backdrop-blur-md ${
                      isSelected
                        ? 'apple-tile-checked shadow-md'
                        : 'glass-tile text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-display text-sm font-semibold">
                        {mode.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-[11px] text-zinc-400 mt-1 block">
                      {mode.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Option de réécoute */}
          <section className="glass-panel rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-white block">
                Autoriser la réécoute
              </span>
              <span className="text-[11px] text-zinc-400 block">
                Permet de réentendre l’intervalle autant de fois que désiré pendant la manche.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.allowReplay}
              onClick={() => setConfig((prev) => ({ ...prev, allowReplay: !prev.allowReplay }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.allowReplay ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                  config.allowReplay ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </section>
        </div>
      )}

      {/* Bouton de lancement */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleStart}
          className="glass-button-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 font-display text-base font-semibold shadow-xl group hover:scale-[1.01] transition-transform"
        >
          <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
          {isRanked ? 'Lancer le Défi Classé' : 'Démarrer l’entraînement'}
        </button>
      </div>
    </main>
  );
}

