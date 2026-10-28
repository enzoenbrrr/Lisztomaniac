import React, { useState } from 'react';
import {
  Eye,
  Headphones,
  Activity,
  Ear,
  Trophy,
  Zap,
  Target,
  ChevronRight,
  Lock,
  BookOpen,
  ExternalLink,
  FileText,
  Calendar,
  User,
} from 'lucide-react';
import { PDF_COURSES, getPdfUrl, getPdfCoverUrl } from '../../data/coursesData';

const EXERCISES = [
  {
    id: 'sight-reading',
    title: 'Lecture à vue simple',
    subtitle: 'Déchiffrez les notes en temps réel directement sur la portée musicale.',
    category: 'reading',
    categoryLabel: 'Lecture',
    available: true,
    icon: Eye,
  },
  {
    id: 'rhythm-sight-reading',
    title: 'Lecture à vue rythmée',
    subtitle: 'Développez votre régularité sur une partition défilante calée au métronome.',
    category: 'reading',
    categoryLabel: 'Lecture',
    available: true,
    icon: Activity,
  },
  {
    id: 'note-dictation',
    title: 'Dictée de notes',
    subtitle: 'Exercez votre oreille en retranscrivant fidèlement sur papier ce que vous entendez.',
    category: 'ear_training',
    categoryLabel: 'Écoute',
    available: true,
    icon: Headphones,
  },
  {
    id: 'interval-training',
    title: "L'Oreille Harmonique",
    subtitle: 'Percevez les intervalles à l’oreille et relevez le Défi Classé officiel.',
    category: 'ear_training',
    categoryLabel: 'Écoute',
    available: true,
    icon: Ear,
  },
];

/**
 * Menu Principal minimaliste d'inspiration Apple.
 */
export default function MainMenu({ profile, onSelectExercise, onOpenProfile }) {
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'reading' | 'ear_training'

  const { stats, rankedRecords } = profile;
  const bestSightScore = Math.max(
    0,
    ...['treble', 'bass', 'grand'].map((key) => rankedRecords?.sight?.[key]?.score || 0)
  );
  const bestRhythmScore = Math.max(
    0,
    ...['treble', 'bass', 'grand'].map((key) => rankedRecords?.rhythm?.[key]?.score || 0)
  );

  const displayedExercises =
    selectedCategory === 'all'
      ? EXERCISES
      : EXERCISES.filter((ex) => ex.category === selectedCategory);

  const readingCount = EXERCISES.filter((ex) => ex.category === 'reading').length;
  const earCount = EXERCISES.filter((ex) => ex.category === 'ear_training').length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-10 animate-fade-in">
      {/* En-tête épuré + pilules de statistiques */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Studio d’entraînement
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Bonjour, {profile.username}
          </h1>
        </div>

        {/* Pilule de statistiques cliquable */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-5 sm:gap-6 text-left hover:border-white/25 transition-all self-start sm:self-auto"
        >
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex flex-col leading-none gap-1">
              <p className="font-display text-base font-semibold text-white leading-none">
                {stats.bestTimeAttackScore}
              </p>
              <span className="text-[11px] text-zinc-500">Record Classé 60s</span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-zinc-300 shrink-0" />
            <div className="flex flex-col leading-none gap-1">
              <p className="font-display text-base font-semibold text-white leading-none">
                {stats.bestNps.toFixed(1)}/s
              </p>
              <span className="text-[11px] text-zinc-500">Vitesse</span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2.5">
            <Target className="w-4 h-4 text-zinc-300 shrink-0" />
            <div className="flex flex-col leading-none gap-1">
              <p className="font-display text-base font-semibold text-white leading-none">
                {stats.totalNotesHit}
              </p>
              <span className="text-[11px] text-zinc-500">Notes lues</span>
            </div>
          </div>
        </button>
      </section>

      {/* Sélecteur de catégorie & Classification (Tous · Lecture · Écoute) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Exercices
          </p>

          {/* Pilules de filtrage interactives */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md self-start sm:self-auto gap-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-white/15 text-white shadow-sm font-semibold backdrop-blur-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tous <span className="opacity-60 text-[10px] ml-0.5">{EXERCISES.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('reading')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                selectedCategory === 'reading'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-500/30 shadow-sm font-semibold backdrop-blur-sm'
                  : 'text-zinc-400 hover:text-sky-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.85)]" />
              Lecture <span className="opacity-60 text-[10px]">{readingCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('ear_training')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                selectedCategory === 'ear_training'
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30 shadow-sm font-semibold backdrop-blur-sm'
                  : 'text-zinc-400 hover:text-purple-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.85)]" />
              Écoute <span className="opacity-60 text-[10px]">{earCount}</span>
            </button>
          </div>
        </div>

        {/* Grille d'exercices spacieuse 2 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {displayedExercises.map((exercise) => {
            const Icon = exercise.icon;
            const isReading = exercise.category === 'reading';

            let recordText = null;
            if (exercise.id === 'sight-reading' && bestSightScore > 0) {
              recordText = `Record Classé · ${bestSightScore} note${bestSightScore > 1 ? 's' : ''}`;
            } else if (exercise.id === 'rhythm-sight-reading' && bestRhythmScore > 0) {
              recordText = `Record Classé · ${bestRhythmScore} note${bestRhythmScore > 1 ? 's' : ''}`;
            } else if (exercise.id === 'interval-training' && stats.bestIntervalRankedScore > 0) {
              recordText = `Record Classé · ${stats.bestIntervalRankedScore}/15`;
            }

            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => exercise.available && onSelectExercise(exercise.id)}
                className={`glass-card rounded-3xl p-6 sm:p-7 text-left flex flex-col justify-between min-h-[210px] sm:min-h-[230px] group relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-white/20 cursor-pointer ${
                  isReading
                    ? 'hover:shadow-[0_0_35px_rgba(56,189,248,0.12)]'
                    : 'hover:shadow-[0_0_35px_rgba(192,132,252,0.12)]'
                }`}
              >
                {/* 1. Haut de carte : Icône stylisée épurée */}
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-all duration-300 backdrop-blur-sm ${
                      isReading
                        ? 'bg-sky-500/10 border border-sky-500/20 group-hover:scale-110 group-hover:bg-sky-500/20'
                        : 'bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="w-8 h-8 rounded-full bg-white/[0.04] backdrop-blur-sm flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 2. Centre : Grand Titre & Description fluide avec respiration */}
                <div className="my-5 space-y-1.5">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-white transition-colors">
                    {exercise.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md">
                    {exercise.subtitle}
                  </p>
                </div>

                {/* 3. Bas de carte : Record si existant & Bouton d'action */}
                <div className="flex items-center justify-between w-full pt-3 border-t border-white/[0.05]">
                  {recordText ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {recordText}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500 font-medium">
                      Prêt à s’entraîner
                    </span>
                  )}

                  <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
                    <span>Commencer</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Bibliothèque & Ouvrages de référence (4 PDF avec couverture, auteur, année, pages et explication) */}
      <section className="space-y-4 pt-4 border-t border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Bibliothèque & Méthodes
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              Ouvrages de référence
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            4 méthodes et cours originaux en PDF
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {PDF_COURSES.map((course) => (
            <article
              key={course.id}
              className="glass-card rounded-3xl p-5 sm:p-6 group relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-white/20 flex flex-col justify-between hover:shadow-[0_0_35px_rgba(255,255,255,0.06)]"
            >
              {/* Contenu supérieur : Couverture + Métadonnées & Étiquettes */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                {/* Couverture de la 1ère page */}
                <a
                  href={getPdfUrl(course.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative shrink-0 w-28 sm:w-32 self-center sm:self-start group/thumb block"
                  title={`Ouvrir ${course.title} (PDF)`}
                >
                  <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-xl group-hover/thumb:border-white/40 transition-all duration-300 aspect-[3/4.2]">
                    <img
                      src={getPdfCoverUrl(course.coverImage)}
                      alt={`Première page de ${course.title}`}
                      width="240"
                      height="336"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover/thumb:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 right-2 p-1 rounded-md bg-black/60 backdrop-blur-md text-white/90">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </a>

                {/* Métadonnées, Titre, Auteur, Année, Pages, Étiquettes */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Badges : Année, Pages */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] sm:text-[11px] text-zinc-300 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>{course.year}</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-zinc-300 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-zinc-400" />
                      <span>{course.pages} pages</span>
                    </span>
                  </div>

                  {/* Titre & Créateur */}
                  <div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                      {course.title}
                    </h3>
                    <p className="text-xs font-medium text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{course.author}</span>
                    </p>
                  </div>

                  {/* Minis étiquettes monochromes */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {course.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] sm:text-[11px] font-medium text-zinc-300 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pied de carte : Bouton Consulter le PDF */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06]">
                <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[180px] sm:max-w-xs">
                  {course.file}
                </span>
                <a
                  href={getPdfUrl(course.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-button rounded-xl py-2 px-3.5 text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-1.5 transition-all group-hover:border-white/30 shrink-0"
                >
                  <span>Consulter le PDF</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
