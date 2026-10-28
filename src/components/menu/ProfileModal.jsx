import React, { useState } from 'react';
import { X, User, Trophy, RotateCcw, Check, Clock, Ear, Activity } from 'lucide-react';

const CLEF_LABELS = {
  treble: 'Clé de Sol 𝄞',
  bass: 'Clé de Fa 𝄢',
  grand: 'Grand Staff 𝄞𝄢',
};

const EXERCISE_LABELS = {
  sight: 'Lecture à vue',
  rhythm: 'Lecture rythmée',
  dictation: 'Dictée',
};

/**
 * Modale Glassmorphism monochrome permettant de modifier le pseudo
 * et de visualiser les records et l'historique des parties.
 */
export default function ProfileModal({
  profile,
  onClose,
  onUpdateUsername,
  onResetStats,
}) {
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSaveName = (e) => {
    e.preventDefault();
    onUpdateUsername(usernameInput);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="glass-panel-strong backdrop-blur-2xl w-full max-w-xl max-h-[90dvh] flex flex-col rounded-3xl overflow-hidden relative shadow-2xl">
        {/* En-tête */}
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="font-display text-xl font-bold text-white">
                Profil Pianiste & Statistiques
              </h2>
              <p className="text-xs text-zinc-400">
                Données sauvegardées localement via Cookies & LocalStorage
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="glass-button p-2 rounded-xl text-zinc-400 hover:text-white"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">

        {/* Formulaire Pseudo */}
        <form onSubmit={handleSaveName} className="space-y-2">
          <label htmlFor="username-input" className="block text-xs font-medium text-zinc-300">
            Pseudo du joueur
          </label>
          <div className="flex gap-2.5">
            <input
              id="username-input"
              type="text"
              maxLength={24}
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Votre pseudo..."
              className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="glass-button-primary rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" /> Enregistré
                </>
              ) : (
                'Sauvegarder'
              )}
            </button>
          </div>
        </form>

        {/* Records Classés — Lecture à vue simple (60 s, Mort subite) */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Lecture à vue simple · Classé
            </span>
            <span className="text-[11px] text-zinc-500 font-normal">60 s · Mort subite</span>
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(CLEF_LABELS).map(([clefKey, label]) => {
              const rec = profile.rankedRecords?.sight?.[clefKey] || { score: 0, nps: 0, accuracy: 0 };
              return (
                <div key={clefKey} className="glass-button rounded-2xl p-3.5 text-center">
                  <div className="text-xs font-medium text-zinc-300">{label}</div>
                  <div className="font-display text-2xl font-bold text-white my-1">
                    {rec.score}
                    <span className="text-xs font-normal text-zinc-400 ml-1">notes</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {rec.score > 0 ? `${rec.nps.toFixed(2)} NPS` : 'Aucun record'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Records Classés — Lecture à vue rythmée (Mesures infinies, Mort subite, 50 BPM) */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Lecture à vue rythmée · Classé
            </span>
            <span className="text-[11px] text-zinc-500 font-normal">Infini · Mort subite · 50 BPM</span>
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(CLEF_LABELS).map(([clefKey, label]) => {
              const rec = profile.rankedRecords?.rhythm?.[clefKey] || { score: 0, perfect: 0 };
              return (
                <div key={clefKey} className="glass-button rounded-2xl p-3.5 text-center">
                  <div className="text-xs font-medium text-zinc-300">{label}</div>
                  <div className="font-display text-2xl font-bold text-white my-1">
                    {rec.score}
                    <span className="text-xs font-normal text-zinc-400 ml-1">notes</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {rec.score > 0 ? `${rec.perfect || 0} parfaite${rec.perfect > 1 ? 's' : ''}` : 'Aucun record'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Record Défi Classé des Intervalles */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Ear className="w-3.5 h-3.5 text-indigo-400" />
              L'Oreille Harmonique · Défi Classé
            </span>
            <span className="text-[11px] text-zinc-500 font-normal">15 Intervalles</span>
          </h3>
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-zinc-300">Meilleur score enregistré</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Mode 15 manches · Notes simultanées · 1 écoute</div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-bold text-white">
                {profile.stats.bestIntervalRankedScore || 0}{' '}
                <span className="text-sm font-normal text-zinc-400">/ 15</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-medium">
                {profile.stats.bestIntervalRankedScore
                  ? `${Math.round((profile.stats.bestIntervalRankedScore / 15) * 100)}% de réussite`
                  : 'Aucun essai classé'}
              </div>
            </div>
          </div>
        </div>

        {/* Historique récent */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-300" />
            Dernières sessions
          </h3>
          {profile.recentGames?.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {profile.recentGames.map((game) => (
                <div
                  key={game.id}
                  className="glass-button rounded-xl px-3.5 py-2 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {CLEF_LABELS[game.clef] || game.clef}
                    </span>
                    <span className="text-zinc-400">
                      ({EXERCISE_LABELS[game.exercise] || 'Lecture'}
                      {game.sessionType === 'ranked' ? ' · Classé' : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold">{game.notesHit} notes</span>
                    <span className="text-zinc-300">{(game.nps || 0).toFixed(2)} NPS</span>
                    <span className="text-zinc-400">{game.accuracy}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-2">
              Aucune partie enregistrée pour le moment.
            </p>
          )}
        </div>
        </div>

        {/* Actions de pied de modale (fixe) */}
        <div className="p-4 sm:px-6 border-t border-white/10 flex items-center justify-between shrink-0 bg-white/[0.01] backdrop-blur-sm">
          <button
            type="button"
            onClick={onResetStats}
            className="text-xs text-rose-400/80 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser les scores
          </button>

          <button
            type="button"
            onClick={onClose}
            className="glass-button rounded-xl px-5 py-2 text-xs font-semibold text-white"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
