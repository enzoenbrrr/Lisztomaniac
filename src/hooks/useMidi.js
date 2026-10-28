import { useState, useEffect, useCallback } from 'react';
import midiService from '../services/MidiService';

/**
 * Hook React pour consommer facilement le MidiService dans n'importe quel composant.
 *
 * @param {object} options
 * @param {function} [options.onNoteOn] - Callback appelé immédiatement à chaque note jouée
 * @param {function} [options.onNoteOff] - Callback appelé au relâchement d'une note
 * @param {function} [options.onControlChange] - Callback appelé lors des messages de contrôle (ex: pédale sustain CC 64)
 */
export function useMidi({ onNoteOn, onNoteOff, onControlChange } = {}) {
  const [midiState, setMidiState] = useState({
    supported: midiService.isSupported,
    connected: false,
    inputs: [],
    selectedInputId: midiService.selectedInputId,
    error: null,
  });

  const [activeNotes, setActiveNotes] = useState([]);
  const [lastPlayedNote, setLastPlayedNote] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Écoute des changements d'état des périphériques MIDI (branchement/débranchement)
    const unsubscribeState = midiService.onStateChange((newState) => {
      if (isMounted) {
        setMidiState((prev) => ({ ...prev, ...newState }));
      }
    });

    // Initialisation de l'accès Web MIDI
    midiService.init();

    return () => {
      isMounted = false;
      unsubscribeState();
    };
  }, []);

  useEffect(() => {
    const unsubscribeNoteOn = midiService.onNoteOn((noteInfo) => {
      setLastPlayedNote(noteInfo);
      setActiveNotes(Array.from(midiService.activeNotes.values()));
      if (onNoteOn) onNoteOn(noteInfo);
    });

    const unsubscribeNoteOff = midiService.onNoteOff((noteInfo) => {
      setActiveNotes(Array.from(midiService.activeNotes.values()));
      if (onNoteOff) onNoteOff(noteInfo);
    });

    const unsubscribeCC = onControlChange
      ? midiService.onControlChange((ccInfo) => {
          onControlChange(ccInfo);
        })
      : null;

    return () => {
      unsubscribeNoteOn();
      unsubscribeNoteOff();
      if (unsubscribeCC) unsubscribeCC();
    };
  }, [onNoteOn, onNoteOff, onControlChange]);

  const selectInput = useCallback((inputId) => {
    midiService.selectInput(inputId);
  }, []);

  const simulateNote = useCallback((midiNumber, durationMs) => {
    midiService.simulateNote(midiNumber, durationMs);
  }, []);

  const reconnect = useCallback(() => {
    return midiService.init();
  }, []);

  return {
    ...midiState,
    activeNotes,
    lastPlayedNote,
    selectInput,
    simulateNote,
    reconnect,
  };
}
