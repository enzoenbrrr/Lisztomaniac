import React from 'react';
import { BLACK_KEY_INDICES, NOTE_NAMES_FR } from '../../../utils/musicTheory';

/**
 * Clavier de piano virtuel interactif au style Noir & Blanc classique.
 */
export default function VirtualPiano({
  clefMode = 'treble',
  activeNotes = [],
  onSimulateNote,
}) {
  const startMidi = clefMode === 'bass' ? 36 : 48; // Do2 ou Do3
  const endMidi = clefMode === 'treble' ? 84 : 72;   // Do6 ou Do5

  const activeMidiSet = new Set(activeNotes.map((n) => n.midi));

  const keys = [];
  for (let midi = startMidi; midi <= endMidi; midi++) {
    const pitchClass = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const isBlack = BLACK_KEY_INDICES.has(pitchClass);
    keys.push({
      midi,
      pitchClass,
      octave,
      isBlack,
      label: pitchClass === 0 ? `Do${octave}` : NOTE_NAMES_FR[pitchClass],
    });
  }

  return (
    <div className="glass-panel rounded-2xl p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
        <span>Clavier de contrôle MIDI & Simulation souris</span>
        <span>Do central = Do4 (MIDI 60)</span>
      </div>

      <div className="relative flex justify-center overflow-x-auto py-1 select-none">
        <div className="inline-flex items-start gap-0.5">
          {keys.map((k) => {
            const isPressed = activeMidiSet.has(k.midi);
            const isMiddleC = k.midi === 60;

            if (k.isBlack) {
              return (
                <button
                  key={k.midi}
                  type="button"
                  onClick={() => onSimulateNote(k.midi)}
                  title={`${k.label}${k.octave} (MIDI ${k.midi})`}
                  className={`-mx-2.5 z-10 w-5 sm:w-6 h-16 sm:h-20 rounded-b-lg border transition-all flex items-end justify-center pb-1.5 text-[9px] font-semibold ${
                    isPressed
                      ? 'bg-zinc-300 border-white text-zinc-950 translate-y-0.5 shadow-lg'
                      : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-700 text-zinc-500'
                  }`}
                >
                  ♯
                </button>
              );
            }

            return (
              <button
                key={k.midi}
                type="button"
                onClick={() => onSimulateNote(k.midi)}
                title={`${NOTE_NAMES_FR[k.pitchClass]}${k.octave} (MIDI ${k.midi})`}
                className={`w-8 sm:w-9 h-24 sm:h-28 rounded-b-xl border transition-all flex flex-col items-center justify-end pb-2 text-[10px] font-medium ${
                  isPressed
                    ? 'bg-zinc-300 border-white text-zinc-950 translate-y-0.5 shadow-inner'
                    : 'bg-zinc-100 hover:bg-white border-zinc-300 text-zinc-900'
                }`}
              >
                {isMiddleC && (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 mb-1" />
                )}
                <span className={k.pitchClass === 0 ? 'font-bold text-zinc-950' : 'opacity-65'}>
                  {k.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
