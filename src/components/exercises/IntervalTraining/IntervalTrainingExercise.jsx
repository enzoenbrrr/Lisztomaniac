import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Volume2,
  ArrowLeft,
  RotateCcw,
  Check,
  X,
  Trophy,
  Ear,
  Sparkles,
  ChevronRight,
  Flame,
} from 'lucide-react';
import audioService from '../../../services/AudioService';
import {
  INTERVALS_CATALOG,
  generateRandomInterval,
  midiToNoteInfo,
} from '../../../utils/musicTheory';

/**
 * Composant de jeu « L'Oreille Harmonique » (Reconnaissance d'intervalles à l'oreille).
 * Gère le déroulement des manches, la synthèse sonore (harmonique / mélodique),
 * les raccourcis clavier, la validation instantanée et l'écran de fin de session.
 */
export default function IntervalTrainingExercise({
  config,
  onSessionComplete,
  onBackToSetup,
  onBackToMenu,
}) {
  const isRanked = config.mode === 'ranked';
  const totalRounds = isRanked ? 15 : (config.roundCount || 10);
  const maxInterval = isRanked ? 12 : (config.maxInterval || 12);
  const playbackMode = isRanked ? 'harmonic' : (config.playbackMode || 'harmonic');
  const allowReplay = isRanked ? false : Boolean(config.allowReplay);

  // Liste des intervalles autorisés pour la session
  const eligibleIntervals = INTERVALS_CATALOG.filter(
    (item) => item.semitones <= maxInterval
  );

  // État de la session
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionRecordInfo, setSessionRecordInfo] = useState(null);

  const playbackTimersRef = useRef([]);
  const autoNextTimerRef = useRef(null);
  const hasFinishedRef = useRef(false);

  const clearPlaybackTimers = useCallback(() => {
    playbackTimersRef.current.forEach((id) => clearTimeout(id));
    playbackTimersRef.current = [];
    audioService.stopAll();
    setIsPlaying(false);
  }, []);

  // Génère et joue un nouveau problème
  const loadRound = useCallback(
    (index) => {
      clearPlaybackTimers();
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }

      setSelectedAnswer(null);
      setIsAnswerRevealed(false);
      setPlayCount(0);

      const previousSemitones = currentProblem?.interval?.semitones || null;
      const newProblem = generateRandomInterval(
        maxInterval,
        playbackMode,
        previousSemitones
      );
      setCurrentProblem(newProblem);
    },
    [clearPlaybackTimers, currentProblem, maxInterval, playbackMode]
  );

  // Joue l'intervalle audio (soit simultané soit successif)
  const playInterval = useCallback(
    (problem) => {
      if (!problem) return;
      clearPlaybackTimers();
      audioService.setEnabled(true);
      setIsPlaying(true);
      setPlayCount((c) => c + 1);

      const { rootMidi, secondMidi, playbackType } = problem;

      if (playbackType === 'harmonic') {
        // Harmonique : les 2 notes en même temps
        audioService.noteOn(rootMidi, 88);
        audioService.noteOn(secondMidi, 88);

        const stopId = setTimeout(() => {
          audioService.noteOff(rootMidi);
          audioService.noteOff(secondMidi);
          setIsPlaying(false);
        }, 1700);
        playbackTimersRef.current.push(stopId);
      } else {
        // Mélodique : note de base d'abord, puis note haute
        audioService.noteOn(rootMidi, 90);

        const off1 = setTimeout(() => {
          audioService.noteOff(rootMidi);
        }, 700);

        const on2 = setTimeout(() => {
          audioService.noteOn(secondMidi, 90);
        }, 820);

        const off2 = setTimeout(() => {
          audioService.noteOff(secondMidi);
          setIsPlaying(false);
        }, 1800);

        playbackTimersRef.current.push(off1, on2, off2);
      }
    },
    [clearPlaybackTimers]
  );

  // Initialisation de la première manche (en attente du choix d'écoute de l'utilisateur)
  useEffect(() => {
    loadRound(0);
    return () => {
      clearPlaybackTimers();
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Passage à la manche suivante ou terminaison du jeu
  const handleNextRound = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    if (roundIndex + 1 < totalRounds) {
      setRoundIndex((i) => i + 1);
      loadRound(roundIndex + 1);
    } else {
      // Fin de partie
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      setIsFinished(true);
      clearPlaybackTimers();

      const finalScore = score;
      const accuracy = Math.round((finalScore / totalRounds) * 100);

      if (onSessionComplete) {
        const result = onSessionComplete({
          score: finalScore,
          totalRounds,
          accuracy,
          isRanked,
        });
        setSessionRecordInfo(result);
      }
    }
  }, [
    clearPlaybackTimers,
    isRanked,
    loadRound,
    onSessionComplete,
    roundIndex,
    score,
    totalRounds,
  ]);

  // Validation d'une réponse utilisateur
  const handleSelectAnswer = useCallback(
    (intervalItem) => {
      if (isAnswerRevealed || !currentProblem) return;

      setSelectedAnswer(intervalItem);
      setIsAnswerRevealed(true);

      const isCorrect = intervalItem.semitones === currentProblem.interval.semitones;

      if (isCorrect) {
        setScore((s) => s + 1);
        setStreak((prev) => {
          const next = prev + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
      }

      // Rejoue doucement les deux notes pour que l'oreille mémorise le bon intervalle
      setTimeout(() => {
        audioService.noteOn(currentProblem.rootMidi, 80);
        audioService.noteOn(currentProblem.secondMidi, 80);
        setTimeout(() => {
          audioService.noteOff(currentProblem.rootMidi);
          audioService.noteOff(currentProblem.secondMidi);
        }, 1100);
      }, 150);

      // Transition automatique après 1.6 seconde
      autoNextTimerRef.current = setTimeout(() => {
        handleNextRound();
      }, 1600);
    },
    [currentProblem, handleNextRound, isAnswerRevealed]
  );

  // Gestion des raccourcis clavier (1..9, 0, -, = et Espace / Entrée)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isAnswerRevealed) {
          handleNextRound();
        } else if (playCount === 0 && currentProblem) {
          playInterval(currentProblem);
        } else if (allowReplay && !isPlaying && currentProblem) {
          playInterval(currentProblem);
        }
        return;
      }

      if (playCount > 0 && !isAnswerRevealed) {
        const found = eligibleIntervals.find((item) => item.shortcut === e.key);
        if (found) {
          e.preventDefault();
          handleSelectAnswer(found);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    allowReplay,
    currentProblem,
    eligibleIntervals,
    handleNextRound,
    handleSelectAnswer,
    isAnswerRevealed,
    isPlaying,
    playCount,
    playInterval,
  ]);

  // Données des notes pour la révélation pédagogique
  const rootNoteName = currentProblem
    ? midiToNoteInfo(currentProblem.rootMidi).displayNameFr
    : '';
  const secondNoteName = currentProblem
    ? midiToNoteInfo(currentProblem.secondMidi).displayNameFr
    : '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 animate-fade-in select-none">
      {/* 1. Barre supérieure : Retour, Progression, Score & Badge */}
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToSetup}
          className="h-10 px-3 sm:px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all shrink-0 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Quitter</span>
        </button>

        {/* Jauge de manche */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 font-display text-xs font-semibold text-white tracking-wide backdrop-blur-md">
            Manche {roundIndex + 1} <span className="text-zinc-500">/ {totalRounds}</span>
          </div>

          {streak >= 3 && (
            <div className="px-2.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center gap-1 text-[11px] font-semibold text-amber-300 animate-pulse backdrop-blur-md">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {streak}
            </div>
          )}
        </div>

        {/* Score & Type de session */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-300 backdrop-blur-md">
            Score : <span className="text-white font-bold">{score}</span>
          </div>

          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border backdrop-blur-md ${
              isRanked
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
            }`}
          >
            {isRanked ? (
              <>
                <Trophy className="w-3 h-3" /> Classé
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" /> Entraînement
              </>
            )}
          </span>
        </div>
      </header>

      {/* 2. Zone d'écoute centrale & Révélation */}
      <section className="glass-panel rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
        {/* Halo décoratif interactif */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            isPlaying
              ? 'bg-gradient-to-b from-indigo-500/10 to-transparent opacity-100'
              : 'opacity-0'
          }`}
        />

        {/* Contenu central : Choix du moment d'écoute quand on est prêt, ou visualiseur d'écoute */}
        {playCount === 0 ? (
          /* Bouton de démarrage d'écoute à la demande */
          <button
            type="button"
            onClick={() => playInterval(currentProblem)}
            className="group flex flex-col items-center gap-3.5 cursor-pointer focus:outline-none my-1"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 hover:border-white/40 flex items-center justify-center text-white shadow-xl group-hover:scale-105 group-hover:shadow-[0_0_35px_rgba(255,255,255,0.22)] transition-all backdrop-blur-md">
              <Play className="w-9 h-9 sm:w-10 sm:h-10 fill-current ml-1 text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-1 text-center">
              <div className="font-display text-base font-semibold text-white flex items-center justify-center gap-2">
                Écouter l’intervalle
              </div>
              <p className="text-xs text-zinc-400">
                Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-300 font-mono">Espace</kbd> ou cliquez quand vous êtes prêt
              </p>
            </div>
          </button>
        ) : (
          /* Disque actif avec ondes sonores animées pendant la lecture ou état après écoute */
          <>
            <div className="relative flex items-center justify-center">
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border flex items-center justify-center transition-all duration-300 backdrop-blur-md ${
                  isPlaying
                    ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_35px_rgba(99,102,241,0.35)] scale-105'
                    : 'bg-white/[0.04] border-white/10'
                }`}
              >
                {/* Onde sonore animée */}
                <div className="flex items-center gap-1.5 h-10">
                  {[0.4, 0.8, 1, 0.7, 0.5].map((scale, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-200 ${
                        isPlaying ? 'bg-indigo-300 animate-pulse' : 'bg-zinc-600 h-2'
                      }`}
                      style={
                        isPlaying
                          ? {
                              height: `${scale * 36}px`,
                              animationDelay: `${i * 120}ms`,
                            }
                          : {}
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Indication du mode de jeu sonore */}
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {currentProblem?.playbackType === 'harmonic'
                  ? 'Notes simultanées (Harmonique)'
                  : 'Notes successives (Mélodique)'}
              </div>
              <p className="text-xs text-zinc-500">
                {isPlaying
                  ? 'Écoute en cours…'
                  : isRanked
                  ? 'Écoute unique terminée · Choisissez l’intervalle ci-dessous'
                  : allowReplay
                  ? 'Intervalle joué · Réécoutez ou choisissez votre réponse'
                  : '1 seule écoute terminée'}
              </p>
            </div>

            {/* Bouton de réécoute (uniquement si autorisé en mode entraînement) */}
            {allowReplay && !isAnswerRevealed && (
              <button
                type="button"
                onClick={() => playInterval(currentProblem)}
                disabled={isPlaying}
                title="Réécouter l’intervalle (Raccourci : Espace)"
                className="glass-button rounded-2xl px-5 py-2.5 flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-white disabled:opacity-40 transition-all cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
                <span>Réécouter</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-zinc-400">
                  Espace
                </kbd>
              </button>
            )}
          </>
        )}

        {/* Zone de révélation après avoir répondu */}
        {isAnswerRevealed && currentProblem && (
          <div className="w-full max-w-md pt-2 animate-fade-in">
            <div
              className={`rounded-2xl p-4 border flex items-center justify-between gap-3 text-left ${
                selectedAnswer?.semitones === currentProblem.interval.semitones
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedAnswer?.semitones === currentProblem.interval.semitones
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {selectedAnswer?.semitones === currentProblem.interval.semitones ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold">
                    {currentProblem.interval.name} ({currentProblem.interval.shortName})
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Notes jouées : <span className="text-white font-medium">{rootNoteName}</span> &{' '}
                    <span className="text-white font-medium">{secondNoteName}</span> ·{' '}
                    {currentProblem.interval.semitones} demi-ton
                    {currentProblem.interval.semitones > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextRound}
                className="glass-button rounded-xl px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
              >
                Suivant <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Grille des boutons d'intervalles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Choisissez l’intervalle
          </label>
          <span className="text-[11px] text-zinc-500">
            {playCount === 0
              ? 'Écoutez d’abord l’intervalle pour répondre'
              : eligibleIntervals.length <= 2
              ? 'Raccourcis : touche 1 (demi-ton) et 2 (un ton)'
              : 'Raccourcis : touches 1 à 9, 0, -, ='}
          </span>
        </div>

        <div
          className={`grid gap-2.5 sm:gap-3 ${
            eligibleIntervals.length <= 2
              ? 'grid-cols-2 max-w-lg mx-auto'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
          }`}
        >
          {eligibleIntervals.map((item) => {
            const isSelected = selectedAnswer?.semitones === item.semitones;
            const isCorrect = isAnswerRevealed && item.semitones === currentProblem?.interval.semitones;
            const isWrong = isSelected && !isCorrect;

            let buttonStyle = 'glass-button text-zinc-300 hover:text-white hover:bg-white/10';

            if (playCount === 0) {
              buttonStyle = 'opacity-35 border-white/5 cursor-not-allowed';
            } else if (isAnswerRevealed) {
              if (isCorrect) {
                buttonStyle =
                  'bg-emerald-500/25 border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.35)]';
              } else if (isWrong) {
                buttonStyle =
                  'bg-rose-500/25 border-rose-500 text-rose-200 line-through opacity-75';
              } else {
                buttonStyle = 'opacity-40 border-white/5';
              }
            }

            return (
              <button
                key={item.semitones}
                type="button"
                disabled={playCount === 0 || isAnswerRevealed}
                onClick={() => handleSelectAnswer(item)}
                className={`rounded-2xl p-3 sm:p-3.5 text-left transition-all flex flex-col justify-between min-h-[76px] relative group ${
                  playCount > 0 && !isAnswerRevealed ? 'cursor-pointer' : ''
                } ${buttonStyle}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-display text-base font-bold tracking-tight">
                    {item.shortName}
                  </span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 group-hover:text-zinc-200">
                    {item.shortcut}
                  </kbd>
                </div>

                <div className="flex items-center justify-between w-full text-[11px] text-zinc-400 mt-1">
                  <span className="truncate pr-1">{item.name}</span>
                  <span className="shrink-0 text-zinc-500 font-normal">
                    {item.semitones === 1
                      ? '1 d-t (demi-ton)'
                      : item.semitones === 2
                      ? '2 d-t (1 ton)'
                      : `${item.semitones} d-t`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Modale de Fin de Session (Game Over / Résultat) */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 text-center border border-white/15 shadow-2xl relative backdrop-blur-2xl">
            {/* Badge Nouveau Record Classé */}
            {isRanked && sessionRecordInfo?.isNewRecord && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/35 text-amber-300 font-semibold text-xs tracking-wide animate-bounce backdrop-blur-sm">
                <Trophy className="w-4 h-4 fill-current" />
                Nouveau Record Classé !
              </div>
            )}

            <div className="space-y-1">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Session Terminée !
              </h2>
              <p className="text-xs text-zinc-400">
                {isRanked
                  ? 'Défi Classé des 15 intervalles terminé'
                  : 'Entraînement aux intervalles terminé'}
              </p>
            </div>

            {/* Statistiques clés */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                  Score
                </span>
                <span className="font-display text-2xl font-bold text-white">
                  {score} <span className="text-xs text-zinc-400 font-normal">/ {totalRounds}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                  Précision
                </span>
                <span className="font-display text-2xl font-bold text-emerald-400">
                  {Math.round((score / totalRounds) * 100)}%
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                  Meilleure série
                </span>
                <span className="font-display text-2xl font-bold text-indigo-400">
                  {bestStreak}
                </span>
              </div>
            </div>

            {/* Actions : Rejouer ou Menu */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  hasFinishedRef.current = false;
                  setIsFinished(false);
                  setScore(0);
                  setStreak(0);
                  setBestStreak(0);
                  setRoundIndex(0);
                  loadRound(0);
                }}
                className="glass-button-primary w-full py-3.5 rounded-2xl font-display text-sm font-semibold flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Rejouer la session
              </button>

              <button
                type="button"
                onClick={onBackToMenu}
                className="glass-button w-full py-3 rounded-2xl text-xs font-semibold text-zinc-300 hover:text-white"
              >
                Retour au menu principal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

