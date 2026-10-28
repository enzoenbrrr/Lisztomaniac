import React, { useState, useEffect } from 'react';
import {
  Clock,
  Infinity as InfinityIcon,
  Play,
  ArrowLeft,
  Trophy,
} from 'lucide-react';
import ScaleSelector from './ScaleSelector';
import RankedChallengePanel, { SessionTypeSwitch } from './RankedChallengePanel';

const CLEF_OPTIONS = [
  { id: 'treble', label: 'Clé de Sol', symbol: '𝄞' },
  { id: 'bass', label: 'Clé de Fa', symbol: '𝄢' },
  { id: 'grand', label: 'Grand Staff', symbol: '𝄞 𝄢' },
];

const RANKED_RULES = [
  '60 secondes chrono',
  'Mort subite (1 faute = fin)',
  'Sans armure à la clé',
  'Lignes supplémentaires',
  'Altérations accidentelles',
];

/**
 * Configuration épurée d'inspiration Apple pour la Lecture à Vue.
 * Deux types de session :
 *  - Mode Classé : règles imposées, 3 catégories (Sol / Fa / Grand Staff), record sauvegardé.
 *  - Mode Entraînement : paramètres libres, aucun record.
 */
export default function SightReadingSetup({
  initialConfig,
  rankedRecords,
  onChangeConfig,
  onStartGame,
  onBack,
}) {
  const [config, setConfig] = useState(() => ({
    sessionType: initialConfig?.sessionType === 'practice' ? 'practice' : 'ranked',
    clef: initialConfig?.clef || 'treble',
    keySignature: initialConfig?.keySignature || 'C',
    scaleMode: initialConfig?.scaleMode || 'major',
    accidentals: Boolean(initialConfig?.accidentals),
    ledgerLines: Boolean(initialConfig?.ledgerLines),
    mode: initialConfig?.mode || 'time_attack',
  }));

  useEffect(() => {
    if (onChangeConfig) {
      onChangeConfig(config);
    }
  }, [config, onChangeConfig]);

  const isRanked = config.sessionType === 'ranked';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    onStartGame(config);
  };

  const currentClefRecord = rankedRecords?.[config.clef]?.score || 0;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:py-12">
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
              Lecture à vue simple
            </h1>
          </div>

          {isRanked && currentClefRecord > 0 && (
            <div className="glass-pill rounded-full px-3 py-1 text-xs text-zinc-300 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-white">{currentClefRecord}</span>
            </div>
          )}
        </div>

        {/* Type de session : Classé vs Entraînement */}
        <SessionTypeSwitch
          sessionType={config.sessionType}
          onChange={(sessionType) => setConfig((prev) => ({ ...prev, sessionType }))}
          rankedHint="Règles imposées · Record"
          practiceHint="Réglages libres"
        />

        {isRanked ? (
          <RankedChallengePanel
            title="Défi Classé · 60s & Mort subite"
            scoreHint="Score = nombre de notes justes avant fin du chrono ou 1ère faute"
            rules={RANKED_RULES}
            clef={config.clef}
            onChangeClef={(clef) => setConfig((prev) => ({ ...prev, clef }))}
            records={rankedRecords}
            formatScore={(score) => `${score} note${score > 1 ? 's' : ''}`}
          />
        ) : (
          <>
            {/* Clé */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400 px-1">Clé</span>
              <div className="grid grid-cols-3 gap-2.5">
                {CLEF_OPTIONS.map((item) => {
                  const selected = config.clef === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, clef: item.id }))}
                      className={`rounded-2xl py-4 px-3 text-center transition-all border backdrop-blur-md ${
                        selected
                          ? 'apple-segment-active'
                          : 'glass-tile text-white'
                      }`}
                    >
                      <div className="text-2xl font-serif leading-none mb-2">{item.symbol}</div>
                      <div className="font-display font-semibold text-xs">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Armure à la clé */}
            <ScaleSelector
              keySignature={config.keySignature || 'C'}
              onChange={({ keySignature }) =>
                setConfig((prev) => ({ ...prev, keySignature }))
              }
            />

            {/* Mode — Contrôle segmenté style Apple */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400 px-1">Mode</span>
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, mode: 'time_attack' }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    config.mode === 'time_attack'
                      ? 'apple-segment-active'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>60 secondes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, mode: 'free' }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    config.mode === 'free'
                      ? 'apple-segment-active'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <InfinityIcon className="w-3.5 h-3.5" />
                  <span>Mode libre</span>
                </button>
              </div>
            </div>

            {/* Options — Liste groupée avec interrupteurs iOS */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400 px-1">Options</span>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] divide-y divide-white/[0.07] overflow-hidden backdrop-blur-md">
                {/* Altérations */}
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, accidentals: !prev.accidentals }))}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-medium text-white">Altérations accidentelles</span>
                    <span className="text-xs text-zinc-500">♯ / ♭ / ♮</span>
                  </div>
                  <div
                    className={`apple-switch w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                      config.accidentals ? 'is-on' : ''
                    }`}
                  >
                    <div
                      className={`apple-switch-thumb w-5 h-5 rounded-full transition-transform duration-200 ${
                        config.accidentals ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Lignes supplémentaires */}
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, ledgerLines: !prev.ledgerLines }))}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-sm font-medium text-white">Lignes supplémentaires</span>
                  <div
                    className={`apple-switch w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                      config.ledgerLines ? 'is-on' : ''
                    }`}
                  >
                    <div
                      className={`apple-switch-thumb w-5 h-5 rounded-full transition-transform duration-200 ${
                        config.ledgerLines ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Bouton principal */}
        <button
          type="submit"
          className="glass-button-primary w-full rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isRanked ? 'Lancer le Défi Classé' : 'Commencer l’entraînement'}</span>
        </button>
      </form>
    </main>
  );
}
