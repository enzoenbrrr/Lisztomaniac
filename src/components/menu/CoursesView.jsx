import React from 'react';
import { ArrowLeft, BookOpen, ExternalLink, FileText, Calendar, User } from 'lucide-react';
import { PDF_COURSES, getPdfUrl, getPdfCoverUrl } from '../../data/coursesData';

/**
 * Page « Cours & Bibliothèque » : liste complète des 4 ouvrages musicaux de référence.
 */
export default function CoursesView({ onBack }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10 space-y-6">
      <section className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6">
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
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-zinc-300" />
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Bibliothèque & Méthodes de référence
              </h1>
            </div>
          </div>
          <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
            4 documents originaux (PDF)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {PDF_COURSES.map((course) => (
            <article
              key={course.id}
              className={`glass-card rounded-3xl p-5 sm:p-6 group relative overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:border-white/20 flex flex-col justify-between ${course.accentGlow}`}
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                <a
                  href={getPdfUrl(course.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative shrink-0 w-28 sm:w-32 self-center sm:self-start group/thumb block"
                  title={`Ouvrir ${course.title} (PDF)`}
                >
                  <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-xl group-hover/thumb:border-white/40 transition-all duration-300">
                    <img
                      src={getPdfCoverUrl(course.coverImage)}
                      alt={`Première page de ${course.title}`}
                      className="w-full h-auto object-cover object-top transition-transform duration-500 group-hover/thumb:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 right-2 p-1 rounded-md bg-black/60 backdrop-blur-md text-white/90">
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </a>

                <div className="flex-1 min-w-0 space-y-3">
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
