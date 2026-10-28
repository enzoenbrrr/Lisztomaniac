import React from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  RotateCcw,
  Home,
  Sliders,
  Sparkles,
} from 'lucide-react';

const CLEF_LABELS = {
  treble: 'Clé de Sol 𝄞',
  bass: 'Clé de Fa 𝄢',
  grand: 'Grand Staff 𝄞𝄢',
};

/**
 * Modale Glassmorphism monochrome de fin de partie.
 * Utilise des couleurs indicatives uniquement sur les compteurs de succès (vert),
 * d'erreur (rouge) et de nouveau record (ambre).
 */
export default function GameOverModal({
  stats,
  config,
  isNewRecord,
  bestScoreForClef,
  rankedScore = 0,
  rankedSuffix = '',
  onReplay,
  onBackToSetup,
  onBackToMenu,
}) {
  const {
    notesHit = 0,
    notesMissed = 0,
    nps = 0,
    accuracy = 0,
    elapsedSeconds = 60,
  } = stats;

  const isRanked = config.sessionType === 'ranked';
  const sessionLabel = isRanked
    ? 'Défi Classé'
    : config.mode === 'time_attack'
      ? 'Time Attack (60s)'
      : config.mode === 'rhythm'
        ? 'Entraînement rythmique'
        : `Session Libre (${Math.max(1, Math.round(elapsedSeconds))}s)`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
    >
      <div className="glass-panel-strong backdrop-blur-2xl w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl p-5 sm:p-8 space-y-5 sm:space-y-6 relative">
        {/* Halo lumineux supérieur sobre */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full blur-3xl pointer-events-none ${isNewRecord ? 'bg-amber-400/15' : 'bg-white/10'
            }`}
        />

        {/* En-tête de la modale */}
        <div className="text-center space-y-2 relative">
          {isNewRecord ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nouveau Record Sauvegardé !</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.07] border border-white/15 text-zinc-300 text-xs font-medium">
              <span>{CLEF_LABELS[config.clef]}</span>
              <span>•</span>
              <span>{sessionLabel}</span>
            </div>
          )}

          <h2
            id="gameover-modal-title"
            className="font-display text-2xl sm:text-3xl font-bold text-white"
          >
            {isRanked && stats.reason === 'strike'
              ? 'Faute commise — Mort subite !'
              : config.mode === 'time_attack'
                ? 'Temps Écoulé !'
                : 'Session Terminée'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isRanked && stats.reason === 'strike'
              ? stats.strikeDetail
                ? `${stats.strikeDetail} — en Mode Classé, la 1ère faute met fin à la session.`
                : 'En mode Classé, la première faute met fin à la session (Mort subite).'
              : config.mode === 'time_attack'
                ? 'Les 60 secondes sont écoulées. Voici votre performance :'
                : 'Voici le bilan de votre déchiffrage au clavier MIDI'}
          </p>
        </div>

        {/* Grille des 4 statistiques principales */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* 1. Nombre total de notes trouvées (Indicatif : Vert) */}
          <div className="glass-button rounded-2xl p-4 flex flex-col justify-between border-emerald-500/25">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-400">
              <span>Notes trouvées</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
              {notesHit}
            </div>
            {isRanked && (
              <div className="text-[11px] text-zinc-400 mt-1">
                Record clé : <strong className="text-zinc-200">{bestScoreForClef}{bestScoreForClef > 1 ? ' notes' : ' note'}</strong>
              </div>
            )}
          </div>

          {/* 2. Nombre de notes ratées / erreurs (Indicatif : Rouge) */}
          <div className="glass-button rounded-2xl p-4 flex flex-col justify-between border-rose-500/25">
            <div className="flex items-center justify-between text-xs font-medium text-rose-400">
              <span>Erreurs</span>
              <XCircle className="w-4 h-4" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
              {notesMissed}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              Sur {notesHit + notesMissed} tentative{notesHit + notesMissed > 1 ? 's' : ''}
            </div>
          </div>

          {/* 3. Ratio de Notes Par Seconde (Monochrome) */}
          <div className="glass-button rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <span>Vitesse (NPS)</span>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
              {nps.toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Notes Par Seconde</div>
          </div>

          {/* 4. Précision en % (Monochrome) */}
          <div className="glass-button rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <span>Précision</span>
              <Target className="w-4 h-4 text-white" />
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
              {accuracy}%
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {accuracy >= 95
                ? 'Maîtrise excellente'
                : accuracy >= 80
                  ? 'Très bonne régularité'
                  : 'Continuez à pratiquer'}
            </div>
          </div>
        </div>

        {/* Score classé & record de la catégorie (Mode Classé) ou rappel Entraînement */}
        {isRanked ? (
          <div className="rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 px-4 py-3 flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-400 uppercase tracking-wider">
                  Score classé · {CLEF_LABELS[config.clef]}
                </div>
                <div className="font-display text-2xl font-bold text-white leading-tight">
                  {rankedScore}
                  <span className="text-sm font-normal text-zinc-400">{rankedSuffix}</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] text-zinc-400">Record</div>
              <div className="font-display text-lg font-bold text-amber-300">
                {bestScoreForClef}
                <span className="text-xs font-normal text-zinc-400">{bestScoreForClef > 1 ? ' notes' : ' note'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-xs text-zinc-400 flex items-center gap-2 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Mode Entraînement : aucun record n’est enregistré. Passez en Mode Classé pour entrer au classement.</span>
          </div>
        )}

        {/* Boutons d'action : Rejouer / Paramètres / Menu */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="glass-button-primary w-full sm:flex-1 rounded-xl py-3 px-5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rejouer</span>
          </button>

          <button
            type="button"
            onClick={onBackToSetup}
            className="glass-button w-full sm:w-auto rounded-xl py-3 px-4 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5"
          >
            <Sliders className="w-4 h-4" />
            <span>Paramètres</span>
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="glass-button w-full sm:w-auto rounded-xl py-3 px-4 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
