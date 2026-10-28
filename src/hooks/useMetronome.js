import { useState, useEffect, useRef, useCallback } from 'react';
import audioService from '../services/AudioService';

const STORAGE_KEY = 'lisztomaniac_metronome_v1';
export const MIN_BPM = 30;
export const MAX_BPM = 150;
export const MIN_BEATS = 1;
export const MAX_BEATS = 12;

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bpm: clamp(Math.round(Number(parsed.bpm)) || 80, MIN_BPM, MAX_BPM),
        beats: clamp(Math.round(Number(parsed.beats)) || 4, MIN_BEATS, MAX_BEATS),
      };
    }
  } catch {
    // Valeurs par défaut
  }
  return { bpm: 80, beats: 4 };
}

/**
 * Métronome global : planifie les clics sur l'horloge audio (précis, sans dérive)
 * et expose le temps courant (0..beats-1) pour allumer les LEDs.
 */
export function useMetronome() {
  const [settings, setSettings] = useState(loadSettings);
  const [isRunning, setIsRunning] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const schedulerRef = useRef(null);
  const visualTimersRef = useRef(new Set());
  const nextBeatTimeRef = useRef(0);
  const nextBeatIndexRef = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Persistance facultative
    }
  }, [settings]);

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    visualTimersRef.current.forEach((id) => clearTimeout(id));
    visualTimersRef.current.clear();
  }, []);

  const start = useCallback(() => {
    const now = audioService.getAudioTime();
    if (now === null) return;
    stopScheduler();

    nextBeatTimeRef.current = now + 0.06;
    nextBeatIndexRef.current = 0;
    setIsRunning(true);

    const tick = () => {
      const currentTime = audioService.getAudioTime();
      if (currentTime === null) return;

      while (nextBeatTimeRef.current < currentTime + SCHEDULE_AHEAD_SEC) {
        const { bpm, beats } = settingsRef.current;
        const beatIndex = nextBeatIndexRef.current % beats;
        const when = nextBeatTimeRef.current;

        audioService.playMetronomeClick(beatIndex === 0, { force: true, when });

        const delayMs = Math.max(0, (when - currentTime) * 1000);
        const timerId = setTimeout(() => {
          setActiveBeat(beatIndex);
          visualTimersRef.current.delete(timerId);
        }, delayMs);
        visualTimersRef.current.add(timerId);

        nextBeatTimeRef.current += 60 / bpm;
        nextBeatIndexRef.current = (beatIndex + 1) % beats;
      }
    };

    tick();
    schedulerRef.current = setInterval(tick, LOOKAHEAD_MS);
  }, [stopScheduler]);

  const stop = useCallback(() => {
    stopScheduler();
    setIsRunning(false);
    setActiveBeat(-1);
  }, [stopScheduler]);

  const toggle = useCallback(() => {
    if (isRunning) stop();
    else start();
  }, [isRunning, start, stop]);

  useEffect(() => () => stopScheduler(), [stopScheduler]);

  const setBpm = useCallback((value) => {
    setSettings((prev) => ({
      ...prev,
      bpm: clamp(Math.round(Number(value)) || prev.bpm, MIN_BPM, MAX_BPM),
    }));
  }, []);

  const setBeats = useCallback((value) => {
    setSettings((prev) => {
      const beats = clamp(Math.round(Number(value)) || prev.beats, MIN_BEATS, MAX_BEATS);
      return { ...prev, beats };
    });
    // Repart du temps 1 si le nombre de temps change pendant la lecture
    nextBeatIndexRef.current = 0;
  }, []);

  return {
    bpm: settings.bpm,
    beats: settings.beats,
    isRunning,
    activeBeat,
    setBpm,
    setBeats,
    toggle,
  };
}

