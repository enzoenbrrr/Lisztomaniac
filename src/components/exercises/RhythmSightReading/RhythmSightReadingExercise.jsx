import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Flame,
  RotateCcw,
  Piano,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Gauge,
} from 'lucide-react';
import RhythmStaffRenderer from './RhythmStaffRenderer';
import VirtualPiano from '../SightReading/VirtualPiano';
import GameOverModal from '../SightReading/GameOverModal';
import { useMidi } from '../../../hooks/useMidi';
import audioService from '../../../services/AudioService';
import {
  generateRhythmScore,
  appendRhythmMeasures,
  DURATION_LABELS_FR,
} from '../../../utils/rhythmGenerator';
import { isMidiNoteMatch, formatScaleLabelFr } from '../../../utils/musicTheory';
import { applyRhythmRankedRules, computeRhythmRankedScore } from '../../../utils/rankedRules';

const CLEF_NAMES = {
  treble: 'Clé de Sol',
  bass: 'Clé de Fa',
  grand: 'Grand Staff',
};

/**
 * Exercice complet : Lecture à Vue avec Rythme
 * - Clé de Sol, Clé de Fa ou Grand Staff
 * - Mesure 0 vide au départ pour se calibrer visuellement et auditivement sur le métronome
 * - Signatures Binaires (♩) et Ternaires à la noire pointée (♩.)
 * - Marge d'erreur temporelle sur le rythme
 */
export default function RhythmSightReadingExercise({
  config: rawConfig,
  profile,
  onSessionComplete,
  onBackToSetup,
  onBackToMenu,
}) {
  // En Mode Classé, les règles imposées (50 BPM, 4/4, h/q/8, mesures infinies, sans armure...) écrasent les réglages libres
  const config = useMemo(() => applyRhythmRankedRules(rawConfig), [rawConfig]);
  const isRanked = config.sessionType === 'ranked';
  const isInfinite = isRanked || config.measureCount === Infinity;
  const {
    clef = 'grand',
    bpm = 80,
    timeSignature = '4/4',
    measureCount = 8,
  } = config;

  const secPerBeat = 60 / bpm;

  // Marge d'erreur temporelle sur le rythme (en secondes)
  const timingWindowSec = Math.max(0.27, Math.min(0.38, secPerBeat * 0.44));
  const perfectWindowSec = Math.max(0.13, secPerBeat * 0.2);

  // Partition générée (tampon initial étendu en mode infini)
  const [score, setScore] = useState(() => generateRhythmScore(config));
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const { beatsPerMeasure, isTernary, totalBeats } = score;

  // Démarre à -beatsPerMeasure pour la Mesure 0 vide de calibration au métronome
  const [currentGlobalBeat, setCurrentGlobalBeat] = useState(-beatsPerMeasure);
  const currentGlobalBeatRef = useRef(-beatsPerMeasure);

  const [notesHit, setNotesHit] = useState(0);
  const [notesMissed, setNotesMissed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  const [feedbackState, setFeedbackState] = useState('idle');
  const [lastFeedbackMessage, setLastFeedbackMessage] = useState(null);

  const [manualPianoToggle, setManualPianoToggle] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => audioService.enabled);

  const rafRef = useRef(null);
  const startPerfRef = useRef(null);
  const lastClickedBeatRef = useRef(null);
  const lastPlayedMidiRef = useRef(null);
  const lastStepTimeRef = useRef(0);
  const feedbackTimeoutRef = useRef(null);
  const hasSavedSessionRef = useRef(false);

  const statsRef = useRef({ notesHit: 0, notesMissed: 0 });
  statsRef.current = { notesHit, notesMissed };

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      audioService.setEnabled(next);
      return next;
    });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    return () => {
      audioService.stopAll();
    };
  }, []);

  // Fin de la partition rythmique
  const finishExercise = useCallback((options = {}) => {
    if (hasSavedSessionRef.current) return;
    hasSavedSessionRef.current = true;
    setIsGameOver(true);

    const hit = statsRef.current.notesHit;
    const missed =
      options.overrideMissed !== undefined
        ? options.overrideMissed
        : statsRef.current.notesMissed;
    const reason = options.reason || 'complete';
    const strikeDetail = options.strikeDetail || null;

    // Notes jamais jouées : en mode entraînement complet, les notes restantes sont comptées comme manquées.
    // En mode Classé (mort subite sur mesures infinies), on ne compte PAS les notes futures du buffer.
    const flat = scoreRef.current.flatNotes;
    const unplayedCount = isRanked ? 0 : flat.filter((n) => n.status === 'pending').length;
    const perfectCount = flat.filter((n) => n.status === 'perfect').length;
    const finalMissed = missed + unplayedCount;

    const total = hit + finalMissed;
    const accuracy = total > 0 ? Math.round((hit / total) * 100) : 0;
    const durationSec = Math.max(1, Math.max(0, currentGlobalBeatRef.current) * secPerBeat);
    const nps = +(hit / durationSec).toFixed(2);
    const rankedScore = computeRhythmRankedScore(hit, finalMissed);

    setFinalResult({
      score: rankedScore,
      notesHit: hit,
      notesMissed: finalMissed,
      accuracy,
      nps,
      durationSec,
      reason,
      strikeDetail,
    });

    if (onSessionComplete) {
      const result = onSessionComplete({
        exercise: 'rhythm',
        sessionType: config.sessionType,
        notesHit: hit,
        notesMissed: finalMissed,
        nps,
        accuracy,
        score: rankedScore,
        perfectCount,
        clef,
        mode: 'rhythm',
        reason,
      });
      if (result?.isNewRecord) {
        setIsNewRecord(true);
      }
    }
  }, [clef, config.sessionType, isRanked, onSessionComplete, secPerBeat]);


  // Boucle haute précision : Métronome sonore + Curseur de lecture + Détection des notes dépassées
  useEffect(() => {
    if (isGameOver) return;

    startPerfRef.current = performance.now();
    lastClickedBeatRef.current = null;

    const tick = (now) => {
      const elapsedSec = (now - startPerfRef.current) / 1000;
      const elapsedBeats = elapsedSec / secPerBeat;
      // On démarre à -beatsPerMeasure (Mesure 0 vide de calibration)
      const globalBeat = elapsedBeats - beatsPerMeasure;

      currentGlobalBeatRef.current = globalBeat;
      setCurrentGlobalBeat(globalBeat);

      // 1. Clic de métronome sur chaque unité de temps (Noire en binaire, Noire pointée en ternaire)
      const wholeBeat = Math.floor(globalBeat + 0.0001);
      if (wholeBeat !== lastClickedBeatRef.current && (isInfinite || wholeBeat < totalBeats)) {
        lastClickedBeatRef.current = wholeBeat;
        const beatInBar =
          ((wholeBeat % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure;
        const isDownbeat = beatInBar === 0;
        audioService.playMetronomeClick(isDownbeat);
      }

      // Extension automatique de la partition en mode infini
      if (isInfinite && globalBeat >= 0) {
        const curScore = scoreRef.current;
        const curMeasureIdx = Math.floor(globalBeat / beatsPerMeasure);
        if (curMeasureIdx >= curScore.measures.length - 15) {
          const expanded = appendRhythmMeasures(curScore, config, 25);
          scoreRef.current = expanded;
          setScore(expanded);
        }
      }

      // 2. Vérification des notes non jouées dont la fenêtre de tolérance est dépassée
      if (globalBeat >= 0) {
        let missedCountIncrement = 0;
        let missedNoteSample = null;
        let mutated = false;

        const currentScore = scoreRef.current;
        const updatedMeasures = currentScore.measures.map((mNotes) =>
          mNotes.map((note) => {
            if (note.status === 'pending') {
              const lateBySec = (globalBeat - note.globalBeat) * secPerBeat;
              if (lateBySec > timingWindowSec) {
                mutated = true;
                missedCountIncrement++;
                missedNoteSample = note;
                return { ...note, status: 'missed' };
              }
            }
            return note;
          })
        );

        if (mutated) {
          const updatedFlat = updatedMeasures.flat();
          const newScore = {
            ...currentScore,
            measures: updatedMeasures,
            flatNotes: updatedFlat,
          };
          scoreRef.current = newScore;
          setScore(newScore);
          const nextMissed = statsRef.current.notesMissed + missedCountIncrement;
          setNotesMissed(nextMissed);
          setStreak(0);
          setFeedbackState('error');
          if (missedNoteSample) {
            setLastFeedbackMessage({
              type: 'error',
              text: `Temps dépassé : ${missedNoteSample.nameFr} (${
                DURATION_LABELS_FR[missedNoteSample.durationKey || missedNoteSample.duration] || ''
              })`,
            });
          }

          if (isRanked) {
            // Mort subite : fin immédiate au premier oubli de note !
            finishExercise({
              reason: 'strike',
              strikeDetail: missedNoteSample
                ? `Temps dépassé : ${missedNoteSample.nameFr}`
                : 'Note manquée dans le tempo',
              overrideMissed: nextMissed,
            });
            return;
          }

          if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
          feedbackTimeoutRef.current = setTimeout(() => {
            setFeedbackState('idle');
          }, 450);
        }
      }

      // 3. Fin de la partition (uniquement en mode classique non-infini)
      if (!isInfinite && globalBeat >= totalBeats + 0.25) {
        finishExercise({ reason: 'complete' });
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    isGameOver,
    beatsPerMeasure,
    totalBeats,
    secPerBeat,
    timingWindowSec,
    finishExercise,
    isInfinite,
    isRanked,
    config,
  ]);

  // Recommencer avec une nouvelle partition rythmique
  const handleReplay = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    hasSavedSessionRef.current = false;
    lastPlayedMidiRef.current = null;
    lastStepTimeRef.current = 0;

    const freshScore = generateRhythmScore(config);
    scoreRef.current = freshScore;
    setScore(freshScore);

    currentGlobalBeatRef.current = -freshScore.beatsPerMeasure;
    setCurrentGlobalBeat(-freshScore.beatsPerMeasure);
    setNotesHit(0);
    setNotesMissed(0);
    setStreak(0);
    setFeedbackState('idle');
    setLastFeedbackMessage(null);
    setIsNewRecord(false);
    setFinalResult(null);
    setIsGameOver(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [config]);

  // Validation d'une note MIDI avec marge d'erreur temporelle sur le rythme
  const handleMidiNoteOn = useCallback(
    (playedNoteInfo) => {
      audioService.noteOn(playedNoteInfo.midi, playedNoteInfo.velocity);

      const globalBeat = currentGlobalBeatRef.current;
      // Ignore les notes jouées pendant la Mesure 0 de calibration (sauf toute fin pour anticipation)
      if (isGameOver || globalBeat < -0.45) return;

      const now = performance.now();
      if (
        playedNoteInfo.midi === lastPlayedMidiRef.current &&
        now - lastStepTimeRef.current < 140
      ) {
        return;
      }
      lastStepTimeRef.current = now;
      lastPlayedMidiRef.current = playedNoteInfo.midi;

      const currentScore = scoreRef.current;

      // Recherche de la note 'pending' la plus proche temporellement dans la marge d'erreur
      let bestCandidate = null;
      let bestDeltaSec = Infinity;

      for (const note of currentScore.flatNotes) {
        if (note.status !== 'pending') continue;
        const deltaSec = Math.abs(globalBeat - note.globalBeat) * secPerBeat;
        if (deltaSec <= timingWindowSec && deltaSec < bestDeltaSec) {
          bestCandidate = note;
          bestDeltaSec = deltaSec;
        }
      }

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

      if (!bestCandidate) {
        const nextMissed = statsRef.current.notesMissed + 1;
        setNotesMissed(nextMissed);
        setStreak(0);
        setFeedbackState('error');
        setLastFeedbackMessage({
          type: 'error',
          text: `Hors tempo : ${playedNoteInfo.nameFr} joué en dehors du temps attendu`,
        });

        if (isRanked) {
          finishExercise({
            reason: 'strike',
            strikeDetail: `Hors tempo (${playedNoteInfo.nameFr})`,
            overrideMissed: nextMissed,
          });
          return;
        }

        feedbackTimeoutRef.current = setTimeout(() => {
          setFeedbackState('idle');
        }, 420);
        return;
      }

      const isPitchCorrect = isMidiNoteMatch(playedNoteInfo.midi, bestCandidate.midi);
      const signedDeltaMs = Math.round(
        (globalBeat - bestCandidate.globalBeat) * secPerBeat * 1000
      );
      const newStatus = isPitchCorrect
        ? bestDeltaSec <= perfectWindowSec
          ? 'perfect'
          : 'good'
        : 'missed';

      const updatedMeasures = currentScore.measures.map((mNotes) =>
        mNotes.map((n) => (n.id === bestCandidate.id ? { ...n, status: newStatus } : n))
      );
      const newScore = {
        ...currentScore,
        measures: updatedMeasures,
        flatNotes: updatedMeasures.flat(),
      };
      scoreRef.current = newScore;
      setScore(newScore);

      if (isPitchCorrect) {
        setNotesHit((h) => h + 1);
        setStreak((s) => s + 1);
        setFeedbackState('success');

        const timingHint =
          bestDeltaSec <= perfectWindowSec
            ? 'Parfait dans le tempo !'
            : signedDeltaMs < 0
            ? `Validé (légèrement tôt : ${signedDeltaMs}ms)`
            : `Validé (légèrement tard : +${signedDeltaMs}ms)`;

        setLastFeedbackMessage({
          type: 'success',
          text: `${bestCandidate.nameFr} — ${timingHint}`,
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
          text: `Fausse note : ${playedNoteInfo.nameFr} joué au lieu de ${bestCandidate.nameFr}`,
        });

        if (isRanked) {
          finishExercise({
            reason: 'strike',
            strikeDetail: `Fausse note (${playedNoteInfo.nameFr} au lieu de ${bestCandidate.nameFr})`,
            overrideMissed: nextMissed,
          });
          return;
        }

        feedbackTimeoutRef.current = setTimeout(() => {
          setFeedbackState('idle');
        }, 460);
      }
    },
    [isGameOver, secPerBeat, timingWindowSec, perfectWindowSec, isRanked, finishExercise]
  );

  const handleMidiNoteOff = useCallback((noteInfo) => {
    audioService.noteOff(noteInfo.midi);
  }, []);

  const { connected, activeNotes, simulateNote } = useMidi({
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
  });

  const isPianoVisible = manualPianoToggle !== null ? manualPianoToggle : !connected;

  // Calculs d'affichage de la mesure courante :
  // - Pendant isCountIn (Mesure 0 vide de calibration) :
  //   Gauche = [] (vide), Droite = score.measures[0] (Mesure 1 déjà visible !)
  // - Pendant le jeu (globalBeat >= 0) :
  //   Gauche = score.measures[activeMeasureIndex], Droite = score.measures[activeMeasureIndex + 1]
  const isCountIn = currentGlobalBeat < 0;
  const activeMeasureIndex = isCountIn
    ? 0
    : isRanked
    ? Math.floor(currentGlobalBeat / beatsPerMeasure)
    : Math.min(measureCount - 1, Math.floor(currentGlobalBeat / beatsPerMeasure));

  const currentBeatInMeasure = isCountIn
    ? currentGlobalBeat + beatsPerMeasure
    : currentGlobalBeat - activeMeasureIndex * beatsPerMeasure;

  const activeBeatNumber =
    (((Math.floor(currentGlobalBeat + 0.0001) % beatsPerMeasure) + beatsPerMeasure) %
      beatsPerMeasure) +
    1;

  const currentMeasureNotes = isCountIn
    ? []
    : score.measures[activeMeasureIndex] || [];

  const nextMeasureNotes = isCountIn
    ? score.measures[0] || null
    : isRanked
    ? score.measures[activeMeasureIndex + 1] || null
    : activeMeasureIndex + 1 < measureCount
    ? score.measures[activeMeasureIndex + 1]
    : null;

  const progressPct = isCountIn
    ? 0
    : isRanked
    ? Math.min(100, Math.max(0, (currentBeatInMeasure / beatsPerMeasure) * 100))
    : Math.min(100, Math.max(0, (currentGlobalBeat / totalBeats) * 100));


  const totalAttempts = notesHit + notesMissed;
  const liveAccuracy = totalAttempts > 0 ? Math.round((notesHit / totalAttempts) * 100) : 100;
  const elapsedPlaySec = Math.max(1, Math.max(0, currentGlobalBeat) * secPerBeat);
  const liveNps = notesHit > 0 ? +(notesHit / elapsedPlaySec).toFixed(2) : 0;

  return (
    <main className="mx-auto max-w-5xl px-3 py-2.5 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
      {/* HUD Supérieur : Progression des mesures, Métronome visuel, Compteurs */}
      <section className="glass-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4 space-y-3 relative overflow-hidden">
        {/* Barre de progression globale sur le nombre de mesures */}
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full apple-progress-bar transition-all duration-150 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Infos de configuration */}
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
                    {CLEF_NAMES[clef]}
                  </h1>
                  <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200">
                    {isRanked ? 'Classé · ' : ''}{timeSignature} • {isTernary ? '♩.' : '♩'} = {bpm} BPM
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {formatScaleLabelFr(config.keySignature, config.scaleMode)} •{' '}
                  {isCountIn
                    ? 'Mesure 0 (Calibration)'
                    : isRanked
                    ? `Mesure ${activeMeasureIndex + 1} · Mort subite`
                    : `Mesure ${activeMeasureIndex + 1}/${measureCount}`}
                </p>
              </div>
            </div>

            {/* Actions mobiles */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleSound}
                className={`glass-button p-2 rounded-xl ${
                  soundEnabled ? 'text-white' : 'text-zinc-500'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleReplay}
                className="glass-button p-2 rounded-xl text-zinc-300 hover:text-white"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compteurs épurés : Temps (Métronome), Justes, Erreurs */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1 max-w-lg">
            {/* Témoin de temps du Métronome */}
            <div className="glass-button rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-center">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1 truncate">
                <Gauge className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-300 shrink-0" />
                <span>Temps ({isTernary ? '♩.' : '♩'})</span>
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: beatsPerMeasure }).map((_, idx) => {
                  const beatNum = idx + 1;
                  const active = activeBeatNumber === beatNum;
                  return (
                    <span
                      key={beatNum}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                        active
                          ? beatNum === 1
                            ? 'apple-segment-active scale-110'
                            : 'apple-tile-checked scale-105'
                          : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      {beatNum}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Notes Justes */}
            <div className="glass-button rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-center">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                <span>Justes</span>
              </span>
              <div className="flex items-baseline gap-1">
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

            {/* Erreurs / Hors tempo */}
            <div className="glass-button rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-center">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 flex items-center gap-1 truncate">
                <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400 shrink-0" />
                <span>Erreurs</span>
              </span>
              <span className="font-display text-sm sm:text-lg font-bold text-rose-400">
                {notesMissed}
              </span>
            </div>
          </div>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Couper le son (Piano & Métronome)' : 'Activer le son'}
              className={`glass-button p-2.5 rounded-xl transition-colors ${
                soundEnabled ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleReplay}
              title="Générer une nouvelle partition"
              className="glass-button p-2.5 rounded-xl text-zinc-300 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bandeau de feedback rythmique */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] sm:text-xs gap-2">
          {isCountIn ? (
            <div className="text-zinc-200 font-semibold flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-white animate-spin shrink-0" />
              <span className="truncate">
                Mesure 0 à vide (Calibration métronome : Temps {activeBeatNumber}/{beatsPerMeasure}) — La Mesure 1 est prête à droite !
              </span>
            </div>
          ) : lastFeedbackMessage ? (
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
                Suivez le curseur et le clic du métronome ({isTernary ? '♩.' : '♩'} = {bpm} BPM).
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Portée VexFlow à défilement continu des mesures vers la barre fixe CIBLE */}
      <RhythmStaffRenderer
        clefMode={clef}
        keySignature={config.keySignature || 'C'}
        timeSignature={timeSignature}
        beatsPerMeasure={beatsPerMeasure}
        measures={score.measures}
        flatNotes={score.flatNotes}
        totalMeasures={score.measures.length}
        currentGlobalBeat={currentGlobalBeat}
        feedbackState={feedbackState}
        isInfinite={isInfinite}
      />

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
            clefMode={clef}
            activeNotes={activeNotes}
            onSimulateNote={simulateNote}
          />
        )}
      </div>

      {/* Modale de fin d'exercice */}
      {isGameOver && (
        <GameOverModal
          stats={{
            notesHit: finalResult?.notesHit ?? notesHit,
            notesMissed: finalResult?.notesMissed ?? notesMissed,
            nps: finalResult?.nps ?? liveNps,
            accuracy:
              finalResult?.accuracy ??
              (totalAttempts > 0 ? Math.round((notesHit / totalAttempts) * 100) : 0),
            elapsedSeconds: Math.round(finalResult?.durationSec ?? (totalBeats * secPerBeat)),
            reason: finalResult?.reason,
            strikeDetail: finalResult?.strikeDetail,
          }}
          config={{ ...config, mode: 'rhythm' }}
          isNewRecord={isNewRecord}
          bestScoreForClef={profile?.rankedRecords?.rhythm?.[clef]?.score || 0}
          rankedScore={finalResult?.score ?? computeRhythmRankedScore(notesHit, notesMissed)}
          rankedSuffix={(finalResult?.score ?? notesHit) > 1 ? ' notes' : ' note'}
          onReplay={handleReplay}
          onBackToSetup={onBackToSetup}
          onBackToMenu={onBackToMenu}
        />
      )}
    </main>
  );
}
