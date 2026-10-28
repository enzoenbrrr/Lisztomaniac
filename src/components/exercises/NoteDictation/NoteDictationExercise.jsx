import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Play,
  Square,
  Sparkles,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import audioService from '../../../services/AudioService';
import { formatScaleLabelFr } from '../../../utils/musicTheory';
import { generateDictationScore } from '../../../utils/dictationGenerator';
import FirstNotePreview from './FirstNotePreview';
import DictationScoreViewer from './DictationScoreViewer';

const CLEF_NAMES = {
  treble: 'Clé de Sol',
  bass: 'Clé de Fa',
};

const MAX_LISTENS_PER_MEASURE = 3;

export default function NoteDictationExercise({
  config,
  onSessionComplete,
  onBackToSetup,
  onBackToMenu,
}) {
  const [score, setScore] = useState(() => generateDictationScore(config));
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const {
    clef,
    keySignature,
    melodyMode,
    timeSignature,
    beatsPerMeasure,
    isTernary,
    bpm,
    measureCount,
    firstNote,
  } = score;

  const secPerBeat = 60 / bpm;

  // Phase : 'listening' (écoutes) | 'revealed' (partition dévoilée)
  const [dictationPhase, setDictationPhase] = useState('listening');

  // Identifiant sonore en cours de lecture
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  // Compteur d'écoutes par mesure
  const [listensLeftByMeasure, setListensLeftByMeasure] = useState(() =>
    Array(measureCount).fill(MAX_LISTENS_PER_MEASURE)
  );

  // Mesure active surlignée sur la partition révélée
  const [activeRevealedMeasure, setActiveRevealedMeasure] = useState(null);

  const playbackTimersRef = useRef([]);

  const stopPlayback = useCallback(() => {
    playbackTimersRef.current.forEach((t) => clearTimeout(t));
    playbackTimersRef.current = [];
    audioService.stopAll();
    setCurrentlyPlaying(null);
    setActiveRevealedMeasure(null);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // Joue une séquence de mesures sans métronome
  const playMeasureRange = useCallback(
    ({ id, startMeasure, endMeasure, includeNextFirstNote = false, onComplete }) => {
      stopPlayback();
      audioService.setEnabled(true);
      setCurrentlyPlaying(id);

      const silentLeadInSec = 0.22;
      const totalMeasures = endMeasure - startMeasure + 1;
      const totalBeats = totalMeasures * beatsPerMeasure;

      // Lecture des notes de la ou des mesure(s) demandée(s)
      for (let m = startMeasure; m <= endMeasure; m++) {
        const localOffset = m - startMeasure;
        const measureBaseSec = silentLeadInSec + localOffset * beatsPerMeasure * secPerBeat;
        const mNotes = scoreRef.current.measures[m] || [];

        mNotes.forEach((ev) => {
          if (ev.isRest || ev.midi === null) return;
          const noteStartSec = measureBaseSec + ev.beatInMeasure * secPerBeat;
          const noteDurSec = Math.max(0.16, ev.durationBeats * secPerBeat * 0.9);

          const onId = setTimeout(() => {
            audioService.noteOn(ev.midi, 88);
          }, noteStartSec * 1000);

          const offId = setTimeout(() => {
            audioService.noteOff(ev.midi);
          }, (noteStartSec + noteDurSec) * 1000);

          playbackTimersRef.current.push(onId, offId);
        });
      }

      let finalAudioEndSec = silentLeadInSec + totalBeats * secPerBeat;

      // Lors d'une écoute isolée de mesure : joue aussi la 1re note de la mesure suivante (si elle existe)
      // avec une durée fixe d'une noire (1 temps) afin de donner le point de repère d'arrivée
      // sans dévoiler le rythme de la prochaine mesure.
      if (
        includeNextFirstNote &&
        startMeasure === endMeasure &&
        startMeasure + 1 < scoreRef.current.measureCount
      ) {
        const nextMeasureNotes = scoreRef.current.measures[startMeasure + 1] || [];
        const nextFirst = nextMeasureNotes.find((n) => !n.isRest && n.midi !== null);

        if (nextFirst) {
          const nextStartSec =
            silentLeadInSec + (totalBeats + (nextFirst.beatInMeasure || 0)) * secPerBeat;
          const quarterDurSec = Math.max(
            0.22,
            (isTernary ? (2 / 3) * secPerBeat : secPerBeat) * 0.9
          );

          const onId = setTimeout(() => {
            audioService.noteOn(nextFirst.midi, 84);
          }, nextStartSec * 1000);

          const offId = setTimeout(() => {
            audioService.noteOff(nextFirst.midi);
          }, (nextStartSec + quarterDurSec) * 1000);

          playbackTimersRef.current.push(onId, offId);
          finalAudioEndSec = nextStartSec + quarterDurSec;
        }
      }

      const totalDurationMs = (finalAudioEndSec + 0.38) * 1000;
      const doneId = setTimeout(() => {
        stopPlayback();
        onComplete?.();
      }, totalDurationMs);

      playbackTimersRef.current.push(doneId);
    },
    [beatsPerMeasure, isTernary, secPerBeat, stopPlayback]
  );

  // Joue la première note de repère isolée
  const handlePlayFirstNote = useCallback(() => {
    if (currentlyPlaying === 'first_note') {
      stopPlayback();
      return;
    }
    stopPlayback();
    if (!firstNote?.midi) return;
    audioService.setEnabled(true);
    setCurrentlyPlaying('first_note');
    audioService.noteOn(firstNote.midi, 92);

    const offTimer = setTimeout(() => {
      audioService.noteOff(firstNote.midi);
      setCurrentlyPlaying(null);
    }, 1200);
    playbackTimersRef.current.push(offTimer);
  }, [currentlyPlaying, firstNote, stopPlayback]);

  // Écoute globale initiale
  const handleToggleInitialFull = useCallback(() => {
    if (currentlyPlaying === 'initial_full') {
      stopPlayback();
      return;
    }
    playMeasureRange({
      id: 'initial_full',
      startMeasure: 0,
      endMeasure: measureCount - 1,
    });
  }, [currentlyPlaying, measureCount, playMeasureRange, stopPlayback]);

  // Écoute d'une mesure (décompte 1 écoute)
  const handleToggleMeasureListen = useCallback(
    (measureIdx) => {
      const playingId = `measure_${measureIdx}`;
      if (currentlyPlaying === playingId) {
        stopPlayback();
        return;
      }

      const remaining = listensLeftByMeasure[measureIdx] ?? 0;
      if (remaining <= 0) return;

      setListensLeftByMeasure((prev) =>
        prev.map((val, idx) => (idx === measureIdx ? Math.max(0, val - 1) : val))
      );

      playMeasureRange({
        id: playingId,
        startMeasure: measureIdx,
        endMeasure: measureIdx,
        includeNextFirstNote: true,
      });
    },
    [currentlyPlaying, listensLeftByMeasure, playMeasureRange, stopPlayback]
  );

  // Écoute globale finale
  const handleToggleFinalFull = useCallback(() => {
    if (currentlyPlaying === 'final_full') {
      stopPlayback();
      return;
    }
    playMeasureRange({
      id: 'final_full',
      startMeasure: 0,
      endMeasure: measureCount - 1,
    });
  }, [currentlyPlaying, measureCount, playMeasureRange, stopPlayback]);

  // Révélation de la solution
  const handleRevealSolution = useCallback(() => {
    stopPlayback();
    setDictationPhase('revealed');
    if (onSessionComplete) {
      onSessionComplete({
        notesHit: score.flatNotes.length,
        notesMissed: 0,
        nps: 0,
        accuracy: 100,
        clef,
        exercise: 'dictation',
        mode: 'dictation',
      });
    }
  }, [stopPlayback, onSessionComplete, score.flatNotes.length, clef]);

  // Réécoute de toute la solution
  const handlePlaySolutionFull = useCallback(() => {
    if (currentlyPlaying === 'solution_full') {
      stopPlayback();
      return;
    }
    playMeasureRange({
      id: 'solution_full',
      startMeasure: 0,
      endMeasure: measureCount - 1,
    });
  }, [currentlyPlaying, measureCount, playMeasureRange, stopPlayback]);

  // Réécoute d'une mesure isolée dans la solution
  const handlePlaySolutionMeasure = useCallback(
    (measureIdx) => {
      const playingId = `solution_measure_${measureIdx}`;
      if (currentlyPlaying === playingId) {
        stopPlayback();
        return;
      }
      setActiveRevealedMeasure(measureIdx);
      playMeasureRange({
        id: playingId,
        startMeasure: measureIdx,
        endMeasure: measureIdx,
        includeNextFirstNote: true,
        onComplete: () => setActiveRevealedMeasure(null),
      });
    },
    [currentlyPlaying, playMeasureRange, stopPlayback]
  );

  // Nouvelle dictée
  const handleNewDictation = useCallback(() => {
    stopPlayback();
    const freshScore = generateDictationScore(config);
    scoreRef.current = freshScore;
    setScore(freshScore);
    setDictationPhase('listening');
    setListensLeftByMeasure(Array(freshScore.measureCount).fill(MAX_LISTENS_PER_MEASURE));
    setActiveRevealedMeasure(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [config, stopPlayback]);

  // Refaire la même dictée
  const handleRetrySameDictation = useCallback(() => {
    stopPlayback();
    setDictationPhase('listening');
    setListensLeftByMeasure(Array(score.measureCount).fill(MAX_LISTENS_PER_MEASURE));
    setActiveRevealedMeasure(null);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [score.measureCount, stopPlayback]);

  return (
    <main className="mx-auto max-w-3xl px-3 py-3 sm:px-6 sm:py-5 space-y-4">
      {/* 1. EN-TÊTE ULTRA SIMPLE */}
      <header className="glass-panel rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              stopPlayback();
              onBackToSetup();
            }}
            className="glass-pill w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white shrink-0"
            title="Modifier les paramètres"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-lg font-bold text-white tracking-tight truncate">
              Dictée • {CLEF_NAMES[clef]}
            </h1>
            <div className="text-xs text-zinc-400 truncate">
              {measureCount} mesures • {bpm} BPM •{' '}
              {melodyMode === 'scale'
                ? formatScaleLabelFr(keySignature)
                : 'Hasardeuse'}
            </div>
          </div>
        </div>

        {dictationPhase === 'revealed' && (
          <button
            type="button"
            onClick={handleNewDictation}
            className="glass-button-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nouvelle</span>
          </button>
        )}
      </header>

      {/* =========================================================================
          PHASE D'ÉCOUTES (Épurée au maximum)
         ========================================================================= */}
      {dictationPhase === 'listening' && (
        <div className="space-y-3.5">
          {/* 1. LA PREMIÈRE NOTE REPÈRE */}
          {firstNote && (
            <FirstNotePreview
              clef={clef}
              keySignature={keySignature}
              firstNote={firstNote}
              onPlayFirstNote={handlePlayFirstNote}
              isPlaying={currentlyPlaying === 'first_note'}
            />
          )}

          {/* 2. LES ÉCOUTES (DE HAUT EN BAS) */}
          <section className="space-y-2">
            {/* ÉCOUTE GLOBALE INITIALE */}
            <div
              className={`glass-panel rounded-2xl p-3.5 flex items-center justify-between gap-3 border transition-all ${
                currentlyPlaying === 'initial_full'
                  ? 'border-emerald-500/60 bg-emerald-500/[0.04]'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="font-display text-sm font-semibold text-white">
                1. Écoute globale initiale
              </div>

              <button
                type="button"
                onClick={handleToggleInitialFull}
                className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
                  currentlyPlaying === 'initial_full'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'glass-button-primary'
                }`}
              >
                {currentlyPlaying === 'initial_full' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Arrêter</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Écouter la mélodie</span>
                  </>
                )}
              </button>
            </div>

            {/* ÉCOUTES MESURE PAR MESURE */}
            {Array.from({ length: measureCount }).map((_, mIdx) => {
              const playingId = `measure_${mIdx}`;
              const isPlayingThis = currentlyPlaying === playingId;
              const listensLeft = listensLeftByMeasure[mIdx] ?? 0;
              const isExhausted = listensLeft <= 0;

              return (
                <div
                  key={mIdx}
                  className={`glass-panel rounded-2xl p-3.5 flex items-center justify-between gap-3 border transition-all ${
                    isPlayingThis
                      ? 'border-emerald-500/60 bg-emerald-500/[0.04]'
                      : isExhausted
                      ? 'opacity-60 border-white/[0.06]'
                      : 'hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-semibold text-white">
                      Mesure {mIdx + 1}
                    </span>

                    {/* Pastilles 3/3 */}
                    <div className="flex items-center gap-1.5 ml-1">
                      {[0, 1, 2].map((dotIdx) => {
                        const isAvailable = dotIdx < listensLeft;
                        return (
                          <span
                            key={dotIdx}
                            className={`w-2 h-2 rounded-full transition-all ${
                              isAvailable
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                                : 'bg-zinc-700'
                            }`}
                          />
                        );
                      })}
                      <span className="text-[11px] text-zinc-400 ml-1">
                        ({listensLeft}/3)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isPlayingThis && isExhausted}
                    onClick={() => handleToggleMeasureListen(mIdx)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
                      isPlayingThis
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : isExhausted
                        ? 'glass-button opacity-40 cursor-not-allowed text-zinc-500'
                        : 'glass-button text-white hover:border-emerald-500/40'
                    }`}
                  >
                    {isPlayingThis ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Arrêter</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Écouter</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}

            {/* ÉCOUTE GLOBALE FINALE */}
            <div
              className={`glass-panel rounded-2xl p-3.5 flex items-center justify-between gap-3 border transition-all ${
                currentlyPlaying === 'final_full'
                  ? 'border-emerald-500/60 bg-emerald-500/[0.04]'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="font-display text-sm font-semibold text-white">
                3. Écoute globale finale
              </div>

              <button
                type="button"
                onClick={handleToggleFinalFull}
                className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-all ${
                  currentlyPlaying === 'final_full'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'glass-button text-white hover:border-emerald-500/40'
                }`}
              >
                {currentlyPlaying === 'final_full' ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Arrêter</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Relecture</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* BOUTON RÉVÉLER */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleRevealSolution}
              className="glass-button-primary w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Révéler la partition</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PHASE DE RÉVÉLATION (Sobre & Directe)
         ========================================================================= */}
      {dictationPhase === 'revealed' && (
        <div className="space-y-4">
          {/* BANDEAU DE RÉVÉLATION */}
          <section className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-emerald-500/30">
            <div>
              <div className="font-display text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Partition révélée</span>
              </div>
              <div className="text-xs text-zinc-300 mt-0.5">
                Signature : <strong className="text-white text-sm">{timeSignature}</strong> (
                {isTernary ? 'Ternaire' : 'Binaire'}) • {bpm} BPM
              </div>
            </div>

            {/* COMMANDES DE RÉÉCOUTE */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handlePlaySolutionFull}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  currentlyPlaying === 'solution_full'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'glass-button-primary'
                }`}
              >
                {currentlyPlaying === 'solution_full' ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    <span>Arrêter</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Tout écouter</span>
                  </>
                )}
              </button>

              {Array.from({ length: measureCount }).map((_, mIdx) => (
                <button
                  key={mIdx}
                  type="button"
                  onClick={() => handlePlaySolutionMeasure(mIdx)}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all border ${
                    currentlyPlaying === `solution_measure_${mIdx}`
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-bold'
                      : 'glass-button text-zinc-300 hover:text-white'
                  }`}
                >
                  M.{mIdx + 1}
                </button>
              ))}
            </div>
          </section>

          {/* LA PARTITION COMPLÈTE VEXFLOW */}
          <DictationScoreViewer
            clef={clef}
            keySignature={keySignature}
            timeSignature={timeSignature}
            measures={score.measures}
            activeMeasureIndex={activeRevealedMeasure}
            onMeasureClick={handlePlaySolutionMeasure}
          />

          {/* ACTIONS */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleRetrySameDictation}
              className="glass-button rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:text-white flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refaire</span>
            </button>

            <button
              type="button"
              onClick={handleNewDictation}
              className="glass-button-primary rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nouvelle dictée</span>
            </button>

            <button
              type="button"
              onClick={onBackToSetup}
              className="glass-button rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              Paramètres
            </button>

            <button
              type="button"
              onClick={onBackToMenu}
              className="glass-button rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Menu
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
