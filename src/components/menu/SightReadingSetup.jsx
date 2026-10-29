import React, { useState, useEffect } from 'react';
import {
  Play,
  ArrowLeft,
  Trophy,
  Eye,
  Sparkles,
  Clock,
  Infinity as InfinityIcon,
  Check,
} from 'lucide-react';
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
  {
    id: 'grand',
    label: 'Grand Staff',
    symbol: '𝄞 𝄢',
    desc: 'Deux clés réunies · Lecture complète pour piano',
  },
];

const RANKED_RULES = [
  '60 secondes chrono',
  'Mort subite (1 faute = fin)',
  'Sans armure à la clé (Do majeur)',
  'Lignes supplémentaires incluses',
  'Altérations accidentelles (♯ / ♭ / ♮)',
];

/**
 * Écran de configuration de l'exercice « Lecture à vue simple ».
 * Calqué sur le design system moderne et spacieux de « L'Oreille Harmonique » :
 * - Mode Classé : 3 catégories de clés avec record dédié, 60s & mort subite, règles imposées.
 * - Mode Entraînement : Clé libre, armure au choix, chrono 60s ou mode infini, options d'altérations.
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

  const handleSelectSessionType = (type) => {
    if (type === 'ranked') {
      setConfig((prev) => ({
        ...prev,
        sessionType: 'ranked',
        keySignature: 'C',
        scaleMode: 'major',
        accidentals: true,
        ledgerLines: true,
        mode: 'time_attack',
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        sessionType: 'practice',
      }));
    }
  };

  const handleStart = (e) => {
    if (e) e.preventDefault();
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    onStartGame(config);
  };

  const currentClefRecord = rankedRecords?.[config.clef]?.score || 0;

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
            Exercice de lecture
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400" />
            Lecture à vue simple
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Déchiffrez les notes en temps réel directement sur la portée musicale.
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
            onClick={() => handleSelectSessionType('ranked')}
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
              60s chrono · Mort subite · Record officiel
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectSessionType('practice')}
            className={`rounded-xl py-3 px-4 flex flex-col items-center justify-center gap-1.5 transition-all text-center backdrop-blur-sm ${
              !isRanked
                ? 'bg-white/15 text-white shadow-lg border border-white/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex items-center gap-2 font-display text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-sky-400" />
              Mode Entraînement
            </div>
            <span className="text-[11px] text-zinc-400">
              Personnalisé · Sans limite de temps
            </span>
          </button>
        </div>
      </section>

      {/* Bannière Mode Classé */}
      {isRanked ? (
        <section className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6 border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent">
          {/* Header du défi */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-300 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Défi Classé · 60s & Mort subite
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  1 seule faute met fin au chrono. Chaque clé possède son classement distinct.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-zinc-400 block uppercase tracking-wider">
                Record actuel
              </span>
              <span className="font-display text-2xl font-bold text-amber-400">
                {currentClefRecord}{' '}
                <span className="text-sm font-normal text-zinc-400">notes</span>
              </span>
            </div>
          </div>

          {/* 3 Catégories de Clés en Mode Classé */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Catégorie de portée
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CLEF_OPTIONS.map((item) => {
                const selected = config.clef === item.id;
                const record = rankedRecords?.[item.id]?.score || 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, clef: item.id }))}
                    className={`rounded-2xl p-4 text-left transition-all border backdrop-blur-md flex flex-col justify-between min-h-[110px] ${
                      selected
                        ? 'apple-tile-checked shadow-md border-amber-400/50'
                        : 'glass-tile text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-2xl font-serif leading-none">{item.symbol}</span>
                      {selected && <Check className="w-4 h-4 text-amber-400" />}
                    </div>

                    <div className="mt-2">
                      <span className="font-display text-sm font-semibold text-white block">
                        {item.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 mt-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        {record > 0 ? `${record} note${record > 1 ? 's' : ''}` : 'Aucun record'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Règles imposées */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block px-1">
              Règles officielles imposées
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs text-zinc-300">
              {RANKED_RULES.map((rule) => (
                <div key={rule} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Options spécifiques au Mode Entraînement */
        <div className="space-y-6 animate-fade-in">
          {/* 1. Choix de la Clé */}
          <section className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Portée et Clé musicale
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* 2. Armure à la clé */}
          <section className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Armure à la clé (Tonalité)
            </label>
            <ScaleSelector
              keySignature={config.keySignature || 'C'}
              onChange={({ keySignature }) =>
                setConfig((prev) => ({ ...prev, keySignature }))
              }
            />
          </section>

          {/* 3. Mode de jeu (Chrono 60s vs Mode libre) */}
          <section className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Format d’entraînement
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, mode: 'time_attack' }))}
                className={`rounded-2xl p-4 text-left transition-all border backdrop-blur-md flex flex-col justify-between min-h-[90px] ${
                  config.mode === 'time_attack'
                    ? 'apple-tile-checked shadow-md'
                    : 'glass-tile text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="font-display text-sm font-semibold">
                      Chrono 60 secondes
                    </span>
                  </div>
                  {config.mode === 'time_attack' && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-[11px] text-zinc-400 mt-2">
                  Déchiffrez le maximum de notes avant la fin du temps imparti.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, mode: 'free' }))}
                className={`rounded-2xl p-4 text-left transition-all border backdrop-blur-md flex flex-col justify-between min-h-[90px] ${
                  config.mode === 'free'
                    ? 'apple-tile-checked shadow-md'
                    : 'glass-tile text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <InfinityIcon className="w-4 h-4 text-sky-400" />
                    <span className="font-display text-sm font-semibold">
                      Mode libre infini
                    </span>
                  </div>
                  {config.mode === 'free' && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-[11px] text-zinc-400 mt-2">
                  Lecture détendue sans limite de temps ni de fautes.
                </span>
              </button>
            </div>
          </section>

          {/* 4. Options d'affichage (Altérations & Lignes supplémentaires) */}
          <section className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Options d’écriture
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Altérations accidentelles */}
              <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-white block">
                    Altérations accidentelles
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    Intègre des notes dièses (♯), bémols (♭) et bécarres (♮).
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.accidentals}
                  onClick={() => setConfig((prev) => ({ ...prev, accidentals: !prev.accidentals }))}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    config.accidentals ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                      config.accidentals ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Lignes supplémentaires */}
              <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-white block">
                    Lignes supplémentaires
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    Notes au-delà des 5 lignes standard de la portée.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.ledgerLines}
                  onClick={() => setConfig((prev) => ({ ...prev, ledgerLines: !prev.ledgerLines }))}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    config.ledgerLines ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                      config.ledgerLines ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Bouton principal de lancement */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleStart}
          className="glass-button-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 font-display text-base font-semibold shadow-xl group hover:scale-[1.01] transition-transform cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
          <span>{isRanked ? 'Lancer le Défi Classé' : 'Démarrer l’entraînement'}</span>
        </button>
      </div>
    </main>
  );
}
