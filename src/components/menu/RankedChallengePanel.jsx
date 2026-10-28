import React from 'react';
import { Trophy, Check, Sparkles } from 'lucide-react';
import { RANKED_CLEFS } from '../../utils/rankedRules';

/**
 * Sélecteur de type de session : Mode Classé vs Mode Entraînement (contrôle segmenté Apple).
 */
export function SessionTypeSwitch({ sessionType, onChange, rankedHint, practiceHint }) {
  const isRanked = sessionType === 'ranked';

  const base =
    'rounded-xl py-3 px-3 sm:px-4 flex flex-col items-center justify-center gap-1.5 transition-all text-center backdrop-blur-sm';
  const on = 'bg-white/15 text-white shadow-lg border border-white/20';
  const off = 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]';

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-zinc-400 px-1">Type de session</span>
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
        <button
          type="button"
          onClick={() => onChange('ranked')}
          className={`${base} ${isRanked ? on : off}`}
        >
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <Trophy className="w-4 h-4 text-amber-400" />
            Mode Classé
          </div>
          <span className="text-[11px] text-zinc-400">{rankedHint}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('practice')}
          className={`${base} ${!isRanked ? on : off}`}
        >
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Entraînement
          </div>
          <span className="text-[11px] text-zinc-400">{practiceHint}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Panneau du Défi Classé : choix de la clé (Sol / Fa / Grand Staff) avec record associé
 * et rappel des règles imposées.
 *
 * @param {object} props
 * @param {string} props.title - Titre du défi
 * @param {string[]} props.rules - Règles imposées affichées sous forme de pastilles
 * @param {string} props.clef - Clé sélectionnée
 * @param {(clef: string) => void} props.onChangeClef
 * @param {Record<string, {score: number}>} props.records - Records par clé
 * @param {(score: number) => string} props.formatScore - Formatage du score affiché
 * @param {string} props.scoreHint - Explication du calcul du score
 */
export default function RankedChallengePanel({
  title,
  rules,
  clef,
  onChangeClef,
  records,
  formatScore,
  scoreHint,
}) {
  const currentRecord = records?.[clef]?.score || 0;

  return (
    <section className="rounded-3xl p-5 sm:p-6 space-y-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-300 shrink-0 backdrop-blur-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-semibold text-white truncate">
              {title}
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">{scoreHint}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Record</span>
          <span className="font-display text-xl sm:text-2xl font-bold text-amber-400">
            {formatScore(currentRecord)}
          </span>
        </div>
      </div>

      {/* Catégories de classement : une par clé */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-zinc-400 px-1">Catégorie</span>
        <div className="grid grid-cols-3 gap-2.5">
          {RANKED_CLEFS.map((item) => {
            const selected = clef === item.id;
            const record = records?.[item.id]?.score || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeClef(item.id)}
                className={`rounded-2xl py-3.5 px-2 text-center transition-all border backdrop-blur-md ${selected ? 'apple-segment-active' : 'glass-tile text-white'
                  }`}
              >
                <div className="text-2xl font-serif leading-none mb-1.5">{item.symbol}</div>
                <div className="font-display font-semibold text-xs">{item.label}</div>
                <div
                  className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${selected ? '' : 'text-amber-300'
                    }`}
                >
                  <Trophy className="w-3 h-3" />
                  {record > 0 ? formatScore(record) : '—'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Règles imposées */}
      <div className="pt-1 border-t border-white/10">
        <span className="text-[11px] font-medium text-zinc-400 block mt-3 mb-2 px-1">
          Règles imposées
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-300">
          {rules.map((rule) => (
            <div key={rule} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

