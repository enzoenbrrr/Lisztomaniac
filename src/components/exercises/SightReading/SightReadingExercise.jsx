import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  Flame,
  Flag,
  RotateCcw,
  Piano,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import StaffRenderer from './StaffRenderer';
import VirtualPiano from './VirtualPiano';
import GameOverModal from './GameOverModal';
import { useMidi } from '../../../hooks/useMidi';
import audioService from '../../../services/AudioService';
import {
  generateRandomNote,
  isMidiNoteMatch,
  formatScaleLabelFr,
} from '../../../utils/musicTheory';
import {
  applySightRankedRules,
  computeSightRankedScore,
} from '../../../utils/rankedRules';

const TIME_ATTACK_DURATION = 60; // 60 secondes
const PRE_GAME_COUNTDOWN = 3;    // Décompte de 3 secondes avant le Time Attack

const CLEF_NAMES = {
  treble: 'Clé de Sol',
  bass: 'Clé de Fa',
  grand: 'Grand Staff',
};

function createInitialNotePair(config) {
  const first = generateRandomNote(config, null);
  const second = generateRandomNote(config, first.midi);
  const third = generateRandomNote(config, second.midi);
  return {
    current: first,
    next: second,
    third: third,
    exiting: null,
    transitionKey: 0,
  };
}

/**
 * Composant complet de l'exercice de Lecture à Vue — Compact & 100% Responsive.
 * Conçu pour tenir entièrement dans la hauteur de l'écran sans scroller,
 * afin que la barre de temps et le chronomètre restent toujours visibles.
 */
export default function SightReadingExercise({
  config: rawConfig,
  profile,
  onSessionComplete,
  onBackToSetup,
  onBackToMenu,
}) {
  // En Mode Classé, les règles imposées (sans armure, lignes supp., altérations, 60 s) écrasent les réglages libres
  const config = useMemo(() => applySightRankedRules(rawConfig), [rawConfig]);
  const isRanked = config.sessionType === 'ranked';
  const isTimeAttack = config.mode === 'time_attack';

  const [notePair, setNotePair] = useState(() => createInitialNotePair(config));
  const notePairRef = useRef(notePair);
  notePairRef.current = notePair;

  const [countdown, setCountdown] = useState(PRE_GAME_COUNTDOWN);
  const [showGoFlash, setShowGoFlash] = useState(false);
  const [notesHit, setNotesHit] = useState(0);
  const [notesMissed, setNotesMissed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_ATTACK_DURATION);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  const [manualPianoToggle, setManualPianoToggle] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => audioService.enabled);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      audioService.setEnabled(next);
      return next;
    });
  }, []);

  // Remonte immédiatement en haut de page au montage et coupe le son à la sortie
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    return () => {
      audioService.stopAll();
    };
  }, []);

  const [feedbackState, setFeedbackState] = useState('idle');
  const [lastFeedbackMessage, setLastFeedbackMessage] = useState(null);

  const feedbackTimeoutRef = useRef(null);
  const startTimeRef = useRef(performance.now());
  const lastStepTimeRef = useRef(0);
  const lastPlayedMidiRef = useRef(null);
  const hasSavedSessionRef = useRef(false);

  const statsRef = useRef({ notesHit: 0, notesMissed: 0 });
  statsRef.current = { notesHit, notesMissed };

  const finishGame = useCallback(
    (finalDurationSec, options = {}) => {
      if (hasSavedSessionRef.current) return;
      hasSavedSessionRef.current = true;
      setIsGameOver(true);

      const hit = options.overrideHit !== undefined ? options.overrideHit : statsRef.current.notesHit;
      const missed = options.overrideMissed !== undefined ? options.overrideMissed : statsRef.current.notesMissed;
      const reason = options.reason || (finalDurationSec >= TIME_ATTACK_DURATION ? 'time' : 'normal');
      const strikeDetail = options.strikeDetail || null;

      const totalAttempts = hit + missed;
      const accuracy = totalAttempts > 0 ? Math.round((hit / totalAttempts) * 100) : 0;
      const effectiveSeconds = Math.max(1, finalDurationSec);
      const nps = +(hit / effectiveSeconds).toFixed(2);
      const score = computeSightRankedScore(hit, missed);

      setFinalResult({
        notesHit: hit,
        notesMissed: missed,
        nps,
        accuracy,
        elapsedSeconds: effectiveSeconds,
        score,
        reason,
        strikeDetail,
      });

      if (onSessionComplete) {
        const result = onSessionComplete({
          exercise: 'sight',
          sessionType: config.sessionType,
          notesHit: hit,
          notesMissed: missed,
          nps,
          accuracy,
          score,
          clef: config.clef,
          mode: config.mode,
          reason,
        });
        if (result?.isNewRecord) {
          setIsNewRecord(true);
        }
      }
    },
    [config.clef, config.mode, config.sessionType, onSessionComplete]
  );

  // Décompte initial de 3 secondes avant le départ de l'exercice
  useEffect(() => {
    if (countdown <= 0 || isGameOver) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          setShowGoFlash(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isGameOver]);

  // Extinction automatique du flash "GO !" après 550ms
  useEffect(() => {
    if (!showGoFlash) return;
    const t = setTimeout(() => setShowGoFlash(false), 550);
    return () => clearTimeout(t);
  }, [showGoFlash]);

  // Boucle temporelle (Timer 60s ou Chronomètre Libre)
  useEffect(() => {
    if (isGameOver || countdown > 0) return;

    startTimeRef.current = performance.now();

    const interval = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(elapsed);

      if (isTimeAttack) {
        const remaining = Math.max(0, TIME_ATTACK_DURATION - Math.floor(elapsed));
        setSecondsLeft(remaining);

        if (elapsed >= TIME_ATTACK_DURATION) {
          clearInterval(interval);
          finishGame(TIME_ATTACK_DURATION, { reason: 'time' });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isGameOver, countdown, isTimeAttack, finishGame]);

  const handleReplay = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    hasSavedSessionRef.current = false;
    startTimeRef.current = performance.now();
    lastStepTimeRef.current = 0;
    lastPlayedMidiRef.current = null;

    const freshPair = createInitialNotePair(config);
    notePairRef.current = freshPair;
    setNotePair(freshPair);

    setNotesHit(0);
    setNotesMissed(0);
    setStreak(0);
    setSecondsLeft(TIME_ATTACK_DURATION);
    setElapsedSeconds(0);
    setFeedbackState('idle');
    setLastFeedbackMessage(null);
    setIsNewRecord(false);
    setFinalResult(null);
    setIsGameOver(false);
    setShowGoFlash(false);
    setCountdown(PRE_GAME_COUNTDOWN);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [config]);

  const handleMidiNoteOn = useCallback(
    (playedNoteInfo) => {
      // Joue le son de piano acoustique avec résonance naturelle
      audioService.noteOn(playedNoteInfo.midi, playedNoteInfo.velocity);

      if (isGameOver || countdown > 0) return;

      const now = performance.now();
      const activePair = notePairRef.current;

      // Protection contre les échos MIDI multi-canaux / multi-ports
      if (
        playedNoteInfo.midi === lastPlayedMidiRef.current &&
        now - lastStepTimeRef.current < 250
      ) {
        return;
      }

      lastStepTimeRef.current = now;
      lastPlayedMidiRef.current = playedNoteInfo.midi;

      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }

      const isCorrect = isMidiNoteMatch(playedNoteInfo.midi, activePair.current.midi);

      // Passe à la note suivante qu'elle soit juste ou ratée (file de 3 notes : Cible + 2 notes d'avance)
      const upcomingNote = generateRandomNote(config, activePair.third.midi);
      const updatedPair = {
        current: activePair.next,
        next: activePair.third,
        third: upcomingNote,
        exiting: activePair.current,
        transitionKey: activePair.transitionKey + 1,
      };

      notePairRef.current = updatedPair;
      setNotePair(updatedPair);

      if (isCorrect) {
        setNotesHit((h) => h + 1);
        setStreak((s) => s + 1);
        setFeedbackState('success');
        setLastFeedbackMessage({
          type: 'success',
          text: `Correct : ${activePair.current.nameFr} (${activePair.current.nameEn})`,
        });

        feedbackTimeoutRef.current = setTimeout(() => {
          setFeedbackState('idle');
        }, 420);
      } else {
        const nextMissed = statsRef.current.notesMissed + 1;
        setNotesMissed(nextMissed);
        setStreak(0);
        setFeedbackState('error');
        setLastFeedbackMessage({
          type: 'error',
          text: `Raté : ${playedNoteInfo.nameFr} joué au lieu de ${activePair.current.nameFr}`,
        });

        if (isRanked) {
          // Mort subite : fin immédiate de la session !
          const elapsed = (performance.now() - startTimeRef.current) / 1000;
          finishGame(elapsed, {
            overrideHit: notesHit,
            overrideMissed: nextMissed,
            reason: 'strike',
            strikeDetail: `Fausse note : ${playedNoteInfo.nameFr} joué au lieu de ${activePair.current.nameFr}`,
          });
          return;
        }

        feedbackTimeoutRef.current = setTimeout(() => {
          setFeedbackState('idle');
        }, 480);
      }
    },
    [config, isGameOver, countdown, isRanked, finishGame, notesHit]
  );

  const handleMidiNoteOff = useCallback((noteInfo) => {
    audioService.noteOff(noteInfo.midi);
  }, []);

  const { connected, activeNotes, simulateNote } = useMidi({
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
  });

  const isPianoVisible = manualPianoToggle !== null ? manualPianoToggle : !connected;

  const totalAttempts = notesHit + notesMissed;
  const liveAccuracy = totalAttempts > 0 ? Math.round((notesHit / totalAttempts) * 100) : 100;
  const activeDuration = isTimeAttack
    ? Math.max(1, TIME_ATTACK_DURATION - secondsLeft)
    : Math.max(1, elapsedSeconds);
  const liveNps = notesHit > 0 ? +(notesHit / activeDuration).toFixed(2) : 0;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const timeProgressPct = isTimeAttack ? (secondsLeft / TIME_ATTACK_DURATION) * 100 : 100;
  const isLowTime = isTimeAttack && secondsLeft <= 10;
  const bestScoreForClef = profile?.rankedRecords?.sight?.[config.clef]?.score || 0;
  const isShowingIntroBanner = countdown > 0 || showGoFlash;

  return (
    <main className="mx-auto max-w-5xl px-3 py-2.5 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
      {/* HUD Supérieur : Affiche le Grand Décompte (3, 2, 1 puis GO !) au lancement, puis les statistiques */}
      <section className="glass-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 relative overflow-hidden">
        {/* Contenu statistique (Temps, Bonnes réponses, Erreurs) : masqué pendant 3-2-1-GO puis ré-affiché sans saut */}
        <div
          className={`space-y-3 transition-opacity duration-200 ${
            isShowingIntroBanner ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'
          }`}
          aria-hidden={isShowingIntroBanner}
        >
          {/* Barre de progression temporelle bien visible en haut */}
          {isTimeAttack && (
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  isLowTime ? 'bg-rose-500' : 'apple-progress-bar'
                }`}
                style={{ width: `${timeProgressPct}%` }}
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Ligne haut sur mobile / Gauche sur desktop : Retour + Titre + Actions rapides */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={onBackToSetup}
                  className="glass-button p-2 rounded-xl text-zinc-300 hover:text-white shrink-0"
                  title="Modifier les paramètres"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display text-sm sm:text-base font-bold text-white truncate">
                      {CLEF_NAMES[config.clef]}
                    </h1>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200 shrink-0">
                      {isRanked ? 'Classé · 60s' : isTimeAttack ? '60s' : 'Libre'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {isRanked
                      ? 'Sans armure • Lignes supp. • Altérations'
                      : `${formatScaleLabelFr(config.keySignature, config.scaleMode)} • ${
                          config.ledgerLines ? 'Avec lignes supp.' : 'Portée standard'
                        }`}
                  </p>
                </div>
              </div>

              {/* Boutons d'action affichés à droite du titre sur mobile */}
              <div className="flex md:hidden items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? 'Couper le son du piano' : 'Activer le son du piano'}
                  className={`glass-button p-2 rounded-xl ${
                    soundEnabled ? 'text-white' : 'text-zinc-500'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleReplay}
                  title="Recommencer"
                  className="glass-button p-2 rounded-xl text-zinc-300 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {!isTimeAttack && (
                  <button
                    type="button"
                    onClick={() => finishGame(elapsedSeconds)}
                    className="glass-button-primary rounded-xl px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Fin</span>
                  </button>
                )}
              </div>
            </div>

            {/* Grille épurée des 3 compteurs uniquement : Temps, Bonnes réponses, Erreurs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1 max-w-lg">
              <div
                className={`glass-button rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col justify-center ${
                  isLowTime ? 'border-rose-500/60 bg-rose-500/15 animate-pulse' : ''
                }`}
              >
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1 truncate">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-300 shrink-0" />
                  <span>{isTimeAttack ? 'Temps' : 'Durée'}</span>
                </span>
                <span
                  className={`font-display text-sm sm:text-lg font-bold ${
                    isLowTime ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {isTimeAttack ? `${secondsLeft}s` : formatTimer(elapsedSeconds)}
                </span>
              </div>

              <div className="glass-button rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1 truncate">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                  <span>Justes</span>
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-sm sm:text-lg font-bold text-emerald-400">
                    {notesHit}
                  </span>
                  {streak >= 3 && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 flex items-center">
                      <Flame className="w-2.5 h-2.5 fill-current" />
                      {streak}
                    </span>
                  )}
                </div>
              </div>

              <div className="glass-button rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1 truncate">
                  <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400 shrink-0" />
                  <span>Erreurs</span>
                </span>
                <span className="font-display text-sm sm:text-lg font-bold text-rose-400">
                  {notesMissed}
                </span>
              </div>
            </div>

            {/* Actions rapides sur Desktop */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Couper le son du piano' : 'Activer le son du piano'}
                className={`glass-button p-2.5 rounded-xl transition-colors ${
                  soundEnabled ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleReplay}
                title="Recommencer la partie"
                className="glass-button p-2.5 rounded-xl text-zinc-300 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {!isTimeAttack && (
                <button
                  type="button"
                  onClick={() => finishGame(elapsedSeconds)}
                  className="glass-button-primary rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Terminer</span>
                </button>
              )}
            </div>
          </div>

          {/* Bandeau de feedback instantané */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] sm:text-xs gap-2">
            {lastFeedbackMessage ? (
              <div
                className={`inline-flex items-center gap-1.5 font-semibold truncate ${
                  lastFeedbackMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {lastFeedbackMessage.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span className="truncate">{lastFeedbackMessage.text}</span>
              </div>
            ) : (
              <div className="text-zinc-400 flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-zinc-200 shrink-0" />
                <span className="truncate">
                  Jouez la note dans la zone <strong className="text-white">Cible</strong> tout en anticipant la{' '}
                  <strong className="text-zinc-200">Suivante</strong>.
                </span>
              </div>
            )}

            <div className="text-zinc-400 hidden sm:block shrink-0">
              Record : <strong className="text-white">{bestScoreForClef} notes</strong>
            </div>
          </div>
        </div>

        {/* GRAND DÉCOMPTE (3, 2, 1 PUIS GO !) À LA PLACE DES STATISTIQUES */}
        {isShowingIntroBanner && (
          <div className="inset-0 absolute z-20 flex items-center justify-between gap-3 px-3 sm:px-6 select-none">
            {/* Bouton Retour + Rappel de la clé à gauche */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onBackToSetup}
                className="glass-button p-2 rounded-xl text-zinc-300 hover:text-white"
                title="Modifier les paramètres"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="hidden sm:block">
                <div className="font-display text-sm font-bold text-white">
                  {CLEF_NAMES[config.clef]}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {isTimeAttack ? 'Mode 60 secondes' : 'Mode libre'}
                </div>
              </div>
            </div>

            {/* Centre : Cadran circulaire géant (3, 2, 1 puis GO !) */}
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                <div
                  key={`wave-${countdown > 0 ? countdown : 'go'}`}
                  className="absolute inset-1.5 rounded-full countdown-pulse-wave"
                />

                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full -rotate-90 overflow-visible"
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="43"
                    fill="none"
                    strokeWidth="6"
                    className="countdown-ring-track"
                  />
                  {countdown > 0 && (
                    <circle
                      key={`ring-${countdown}`}
                      cx="50"
                      cy="50"
                      r="43"
                      fill="none"
                      strokeWidth="6.5"
                      strokeLinecap="round"
                      className="countdown-ring-progress"
                    />
                  )}
                </svg>

                {countdown > 0 ? (
                  <span
                    key={`num-${countdown}`}
                    className="absolute inset-0 flex items-center justify-center font-display text-4xl sm:text-5xl font-black tracking-tighter leading-none text-white countdown-number-pop"
                  >
                    {countdown}
                  </span>
                ) : (
                  <span
                    key="go-label"
                    className="absolute inset-0 flex items-center justify-center font-display text-2xl sm:text-3xl font-black tracking-tight leading-none text-emerald-400 countdown-number-pop"
                  >
                    GO !
                  </span>
                )}
              </div>

              <div className="flex flex-col items-start justify-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-semibold text-white mb-1">
                  <span>{countdown > 0 ? 'Départ imminent' : "C'est parti !"}</span>
                </div>
                <div className="font-display text-base sm:text-xl font-bold text-white tracking-tight">
                  {countdown > 0 ? 'Préparez vos 3 premières notes' : 'Jouez la note cible !'}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {[3, 2, 1].map((step) => {
                    const isCurrent = countdown === step;
                    const isPassed = countdown < step;
                    return (
                      <span
                        key={step}
                        className={`countdown-step-bar h-1.5 rounded-full transition-all duration-300 ${
                          isCurrent
                            ? 'w-7 sm:w-9 is-current'
                            : isPassed
                            ? 'w-2.5 sm:w-3 is-passed'
                            : 'w-2.5 sm:w-3'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions rapides à droite (Son / Recommencer) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Couper le son du piano' : 'Activer le son du piano'}
                className={`glass-button p-2 sm:p-2.5 rounded-xl transition-colors ${
                  soundEnabled ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleReplay}
                title="Recommencer"
                className="glass-button p-2 sm:p-2.5 rounded-xl text-zinc-300 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Portée musicale centrale VexFlow : les 3 notes initiales (CIBLE + 2 SUIVANTES) restent 100% visibles sans aucun élément par-dessus */}
      <div className="relative">
        <StaffRenderer
          clefMode={config.clef}
          keySignature={config.keySignature || 'C'}
          currentNote={notePair.current}
          nextNote={notePair.next}
          thirdNote={notePair.third}
          exitingNote={notePair.exiting}
          feedbackState={feedbackState}
          transitionKey={notePair.transitionKey}
          isCountingDown={countdown > 0}
        />
      </div>

      {/* Bouton discret pour afficher / masquer le clavier visuel + Clavier conditionnel */}
      <div className="space-y-2">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setManualPianoToggle(!isPianoVisible)}
            className="glass-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            <Piano className="w-3.5 h-3.5" />
            <span>
              {isPianoVisible ? 'Masquer le clavier visuel' : 'Afficher le clavier visuel'}
            </span>
            {isPianoVisible ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {isPianoVisible && (
          <VirtualPiano
            clefMode={config.clef}
            activeNotes={activeNotes}
            onSimulateNote={simulateNote}
          />
        )}
      </div>

      {/* Modale Glassmorphism de fin de partie */}
      {isGameOver && (
        <GameOverModal
          stats={{
            notesHit: finalResult?.notesHit ?? notesHit,
            notesMissed: finalResult?.notesMissed ?? notesMissed,
            nps: finalResult?.nps ?? (notesHit > 0 ? +(notesHit / Math.max(1, isTimeAttack ? TIME_ATTACK_DURATION : elapsedSeconds)).toFixed(2) : 0),
            accuracy: finalResult?.accuracy ?? (totalAttempts > 0 ? Math.round((notesHit / totalAttempts) * 100) : 0),
            elapsedSeconds: finalResult?.elapsedSeconds ?? elapsedSeconds,
            reason: finalResult?.reason,
            strikeDetail: finalResult?.strikeDetail,
          }}
          config={config}
          isNewRecord={isNewRecord}
          bestScoreForClef={bestScoreForClef}
          rankedScore={finalResult?.score ?? computeSightRankedScore(notesHit, notesMissed)}
          rankedSuffix={(finalResult?.score ?? notesHit) > 1 ? ' notes' : ' note'}
          onReplay={handleReplay}
          onBackToSetup={onBackToSetup}
          onBackToMenu={onBackToMenu}
        />
      )}
    </main>
  );
}
