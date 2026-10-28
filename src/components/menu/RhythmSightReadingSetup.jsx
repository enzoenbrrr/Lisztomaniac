import React, { useState, useEffect } from 'react';
import {
  Play,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { TIME_SIGNATURES, RHYTHM_VALUES } from '../../utils/rhythmGenerator';
import ScaleSelector from './ScaleSelector';
import RankedChallengePanel, { SessionTypeSwitch } from './RankedChallengePanel';

const CLEF_OPTIONS = [
  { id: 'treble', label: 'Clé de Sol', symbol: '𝄞' },
  { id: 'bass', label: 'Clé de Fa', symbol: '𝄢' },
  { id: 'grand', label: 'Grand Staff', symbol: '𝄞 𝄢' },
];

const MEASURE_COUNTS = [4, 8, 12, 16];

const RANKED_RULES = [
  'Tempo fixe à 50 BPM · 4/4',
  'Mesures infinies · Mort subite (1 faute = fin)',
  'Blanches, noires et croches',
  'Sans armure à la clé',
  'Lignes supplémentaires',
  'Altérations accidentelles',
];
const QUICK_BPMS = [60, 80, 100, 120];

/**
 * Configuration épurée d'inspiration Apple pour la Lecture Rythmique.
 */
export default function RhythmSightReadingSetup({
  initialConfig,
  rankedRecords,
  onChangeConfig,
  onStartGame,
  onBack,
}) {
  const [config, setConfig] = useState(() => ({
    sessionType: initialConfig?.sessionType === 'practice' ? 'practice' : 'ranked',
    clef: initialConfig?.clef || 'grand',
    keySignature: initialConfig?.keySignature || 'C',
    scaleMode: initialConfig?.scaleMode || 'major',
    bpm: initialConfig?.bpm || 80,
    timeSignature: initialConfig?.timeSignature || '4/4',
    measureCount: initialConfig?.measureCount || 8,
    selectedDurations:
      Array.isArray(initialConfig?.selectedDurations) &&
      initialConfig.selectedDurations.length > 0
        ? initialConfig.selectedDurations
        : ['q', '8'],
    accidentals: Boolean(initialConfig?.accidentals),
    ledgerLines: Boolean(initialConfig?.ledgerLines),
  }));

  useEffect(() => {
    if (onChangeConfig) {
      onChangeConfig(config);
    }
  }, [config, onChangeConfig]);

  const isRanked = config.sessionType === 'ranked';
  const currentSig = TIME_SIGNATURES[config.timeSignature] || TIME_SIGNATURES['4/4'];

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
              Lecture à vue rythmée
            </h1>
          </div>

          <div className="glass-pill rounded-full px-3 py-1 text-xs text-zinc-300 font-medium">
            {isRanked ? '4/4' : config.timeSignature} · {isRanked || !currentSig.isTernary ? '♩' : '♩.'} = {isRanked ? 50 : config.bpm}
          </div>
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
            title="Défi Classé · Mort subite"
            scoreHint="Score = nombre de notes validées en tempo sans erreur"
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
                      className={`rounded-2xl py-3.5 px-3 text-center transition-all border backdrop-blur-md ${
                        selected
                          ? 'apple-segment-active'
                          : 'glass-tile text-white'
                      }`}
                    >
                      <div className="text-2xl font-serif leading-none mb-1.5">{item.symbol}</div>
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

            {/* Figures rythmiques (Cases épurées) */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400 px-1">Figures rythmiques</span>
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

            {/* Signature temporelle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-zinc-400">Signature</span>
                <span className="text-[11px] text-zinc-500">
                  {currentSig.isTernary ? 'Ternaire (♩.)' : 'Binaire (♩)'}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
                {['2/4', '3/4', '4/4', '6/8', '9/8', '12/8'].map((sig) => {
                  const active = config.timeSignature === sig;
                  return (
                    <button
                      key={sig}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, timeSignature: sig }))}
                      className={`py-2 rounded-xl text-xs font-display font-semibold transition-all ${
                        active
                          ? 'apple-segment-active'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sig}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tempo & Mesures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tempo */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Tempo</span>
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

              {/* Nombre de mesures */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col justify-between gap-3 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Mesures</span>
                  <span className="text-[11px] text-zinc-500">+1 mesure de départ</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  {MEASURE_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, measureCount: count }))}
                      className={`py-2 rounded-lg text-xs font-display font-semibold transition-all ${
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

            {/* Options — Liste groupée avec interrupteurs iOS */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-400 px-1">Options</span>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] divide-y divide-white/[0.07] overflow-hidden backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, accidentals: !prev.accidentals }))}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
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

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, ledgerLines: !prev.ledgerLines }))}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
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
