import { generateRandomNote } from './musicTheory';

/**
 * Signatures temporelles disponibles :
 * - Binaires (unité de temps = la Noire ♩) : 4/4, 3/4, 2/4
 * - Ternaires (unité de temps = la Noire pointée ♩.) : 6/8, 9/8, 12/8
 */
export const TIME_SIGNATURES = {
  '4/4': {
    beatsPerMeasure: 4,
    isTernary: false,
    unitLabel: 'Noire (♩)',
    category: 'Binaire',
    label: '4/4 (4 temps binaires)',
  },
  '3/4': {
    beatsPerMeasure: 3,
    isTernary: false,
    unitLabel: 'Noire (♩)',
    category: 'Binaire',
    label: '3/4 (3 temps binaires)',
  },
  '2/4': {
    beatsPerMeasure: 2,
    isTernary: false,
    unitLabel: 'Noire (♩)',
    category: 'Binaire',
    label: '2/4 (2 temps binaires)',
  },
  '6/8': {
    beatsPerMeasure: 2,
    isTernary: true,
    unitLabel: 'Noire pointée (♩.)',
    category: 'Ternaire',
    label: '6/8 (2 temps ternaires)',
  },
  '9/8': {
    beatsPerMeasure: 3,
    isTernary: true,
    unitLabel: 'Noire pointée (♩.)',
    category: 'Ternaire',
    label: '9/8 (3 temps ternaires)',
  },
  '12/8': {
    beatsPerMeasure: 4,
    isTernary: true,
    unitLabel: 'Noire pointée (♩.)',
    category: 'Ternaire',
    label: '12/8 (4 temps ternaires)',
  },
};

/**
 * Catalogue des valeurs de temps (figures rythmiques) cochables individuellement.
 */
export const RHYTHM_VALUES = [
  {
    id: 'w',
    label: 'Ronde',
    symbol: '𝅝',
    sublabel: '4 temps (en 4/4)',
  },
  {
    id: 'h',
    label: 'Blanche',
    symbol: '𝅗𝅥',
    sublabel: '2 temps (ou 𝅗𝅥. en ternaire)',
  },
  {
    id: 'qd',
    label: 'Noire pointée',
    symbol: '♩.',
    sublabel: '1 temps ternaire / 1,5 temps binaire',
  },
  {
    id: 'q',
    label: 'Noire',
    symbol: '♩',
    sublabel: '1 temps binaire (♩+♪ en ternaire)',
  },
  {
    id: '8',
    label: 'Croches',
    symbol: '♪♪',
    sublabel: 'Par 2 en binaire, par 3 en ternaire',
  },
  {
    id: '16',
    label: 'Doubles-croches',
    symbol: '♬',
    sublabel: 'Subdivision rapide du temps',
  },
];

export const DURATION_LABELS_FR = {
  w: 'Ronde',
  hd: 'Blanche pointée',
  h: 'Blanche',
  qd: 'Noire pointée',
  q: 'Noire',
  '8': 'Croche',
  '16': 'Double-croche',
};

/**
 * Choisit la portée ('treble' ou 'bass') selon le mode de clé sélectionné.
 */
function pickStaffClef(clefMode) {
  if (clefMode === 'treble') return 'treble';
  if (clefMode === 'bass') return 'bass';
  return Math.random() < 0.5 ? 'treble' : 'bass';
}

/**
 * Génère le contenu rythmique d'une seule mesure.
 */
export function generateSingleMeasure({
  measureIndex,
  beatsPerMeasure,
  isTernary,
  activeSet,
  clef,
  keySignature,
  accidentals,
  ledgerLines,
  lastMidiRef,
  globalNoteIndexRef,
}) {
  const measureNotes = [];
  let currentBeat = 0;

  const createNoteEvent = ({
    staffClef,
    measureIndex: mIdx,
    beatInMeasure,
    vexDuration,
    dots = 0,
    durationKey,
    durationBeats,
    beamGroupId = null,
  }) => {
    const baseNote = generateRandomNote(
      { clef: staffClef, keySignature, accidentals, ledgerLines },
      lastMidiRef.current
    );
    lastMidiRef.current = baseNote.midi;

    const noteEvent = {
      ...baseNote,
      noteIndex: globalNoteIndexRef.current++,
      measureIndex: mIdx,
      beatInMeasure,
      globalBeat: mIdx * beatsPerMeasure + beatInMeasure,
      duration: vexDuration, // 'w' | 'h' | 'q' | '8' | '16'
      dots,                  // 0 ou 1 (pour noire pointée / blanche pointée)
      durationKey,           // clé d'affichage FR
      durationBeats,
      beamGroupId,
      status: 'pending',
    };

    return noteEvent;
  };

  const m = measureIndex;

  while (currentBeat < beatsPerMeasure - 0.001) {
    const remainingBeats = beatsPerMeasure - currentBeat;
    const staffClef = pickStaffClef(clef);

    if (isTernary) {
      // --- MODE TERNAIRE (6/8, 9/8, 12/8 : 1 temps = 1 Noire pointée = 3 croches) ---
      const candidates = [];
      if (activeSet.has('h') && remainingBeats >= 2) {
        candidates.push('hd'); // Blanche pointée = 2 temps ternaires
      }
      if (activeSet.has('qd') && remainingBeats >= 1) {
        candidates.push('qd'); // Noire pointée = 1 temps ternaire
      }
      if (activeSet.has('q') && remainingBeats >= 1) {
        candidates.push('q_8'); // Noire + Croche = 2/3 + 1/3 = 1 temps ternaire
      }
      if (activeSet.has('8') && remainingBeats >= 1) {
        candidates.push('8_triplet'); // 3 Croches = 1/3 + 1/3 + 1/3 = 1 temps ternaire
      }
      if (activeSet.has('16') && remainingBeats >= 1) {
        candidates.push('16_sextuplet'); // 6 Doubles-croches dans 1 temps ternaire
      }

      // Fallback si l'utilisateur n'a coché que 'w' en ternaire
      if (candidates.length === 0) {
        candidates.push('qd');
      }

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      if (chosen === 'hd') {
        const ev = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat,
          vexDuration: 'h',
          dots: 1,
          durationKey: 'hd',
          durationBeats: 2,
        });
        measureNotes.push(ev);
        currentBeat += 2;
      } else if (chosen === 'qd') {
        const ev = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat,
          vexDuration: 'q',
          dots: 1,
          durationKey: 'qd',
          durationBeats: 1,
        });
        measureNotes.push(ev);
        currentBeat += 1;
      } else if (chosen === 'q_8') {
        // Noire (2/3 du temps) + Croche (1/3 du temps)
        const ev1 = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat,
          vexDuration: 'q',
          dots: 0,
          durationKey: 'q',
          durationBeats: 2 / 3,
        });
        const ev2 = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat + 2 / 3,
          vexDuration: '8',
          dots: 0,
          durationKey: '8',
          durationBeats: 1 / 3,
        });
        measureNotes.push(ev1, ev2);
        currentBeat += 1;
      } else if (chosen === '8_triplet') {
        // 3 croches ligaturées (1/3 de temps ternaire chacune)
        const beamGroupId = `beam-${m}-${currentBeat}`;
        for (let sub = 0; sub < 3; sub++) {
          const ev = createNoteEvent({
            staffClef,
            measureIndex: m,
            beatInMeasure: currentBeat + sub / 3,
            vexDuration: '8',
            dots: 0,
            durationKey: '8',
            durationBeats: 1 / 3,
            beamGroupId,
          });
          measureNotes.push(ev);
        }
        currentBeat += 1;
      } else if (chosen === '16_sextuplet') {
        // 6 doubles-croches ligaturées par 3 (ou 6)
        const beamGroupId = `beam16-${m}-${currentBeat}`;
        for (let sub = 0; sub < 6; sub++) {
          const ev = createNoteEvent({
            staffClef,
            measureIndex: m,
            beatInMeasure: currentBeat + sub / 6,
            vexDuration: '16',
            dots: 0,
            durationKey: '16',
            durationBeats: 1 / 6,
            beamGroupId,
          });
          measureNotes.push(ev);
        }
        currentBeat += 1;
      }
    } else {
      // --- MODE BINAIRE (2/4, 3/4, 4/4 : 1 temps = 1 Noire) ---
      const candidates = [];
      if (activeSet.has('w') && remainingBeats >= 4 && currentBeat === 0) {
        candidates.push('w');
      }
      if (activeSet.has('h') && remainingBeats >= 2) {
        candidates.push('h');
      }
      if (activeSet.has('qd') && remainingBeats >= 2) {
        candidates.push('qd_8'); // Noire pointée (1.5) + Croche (0.5) = 2 temps
      }
      if (activeSet.has('q') && remainingBeats >= 1) {
        candidates.push('q');
      }
      if (activeSet.has('8') && remainingBeats >= 1) {
        candidates.push('8_pair');
      }
      if (activeSet.has('16') && remainingBeats >= 1) {
        candidates.push('16_quad');
      }

      if (candidates.length === 0) {
        candidates.push('q');
      }

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      if (chosen === 'w') {
        const ev = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat,
          vexDuration: 'w',
          dots: 0,
          durationKey: 'w',
          durationBeats: 4,
        });
        measureNotes.push(ev);
        currentBeat += 4;
      } else if (chosen === 'h') {
        const ev = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat,
          vexDuration: 'h',
          dots: 0,
          durationKey: 'h',
          durationBeats: 2,
        });
        measureNotes.push(ev);
        currentBeat += 2;
      } else if (chosen === 'qd_8') {
        // Noire pointée (1.5 temps) suivie d'une croche (0.5 temps)
        const ev1 = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat,
          vexDuration: 'q',
          dots: 1,
          durationKey: 'qd',
          durationBeats: 1.5,
        });
        const ev2 = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat + 1.5,
          vexDuration: '8',
          dots: 0,
          durationKey: '8',
          durationBeats: 0.5,
        });
        measureNotes.push(ev1, ev2);
        currentBeat += 2;
      } else if (chosen === 'q') {
        const ev = createNoteEvent({
          staffClef,
          measureIndex: m,
          beatInMeasure: currentBeat,
          vexDuration: 'q',
          dots: 0,
          durationKey: 'q',
          durationBeats: 1,
        });
        measureNotes.push(ev);
        currentBeat += 1;
      } else if (chosen === '8_pair') {
        const beamGroupId = `beam8-${m}-${currentBeat}`;
        for (let sub = 0; sub < 2; sub++) {
          const ev = createNoteEvent({
            staffClef,
            measureIndex: m,
            beatInMeasure: currentBeat + sub * 0.5,
            vexDuration: '8',
            dots: 0,
            durationKey: '8',
            durationBeats: 0.5,
            beamGroupId,
          });
          measureNotes.push(ev);
        }
        currentBeat += 1;
      } else if (chosen === '16_quad') {
        const beamGroupId = `beam16-${m}-${currentBeat}`;
        for (let sub = 0; sub < 4; sub++) {
          const ev = createNoteEvent({
            staffClef,
            measureIndex: m,
            beatInMeasure: currentBeat + sub * 0.25,
            vexDuration: '16',
            dots: 0,
            durationKey: '16',
            durationBeats: 0.25,
            beamGroupId,
          });
          measureNotes.push(ev);
        }
        currentBeat += 1;
      }
    }
  }

  return measureNotes;
}

/**
 * Génère une partition rythmique complète selon la clé (Sol, Fa ou Grand Staff),
 * la signature temporelle (binaire ou ternaire) et les valeurs de temps cochées.
 *
 * En mode Classé ou si `measureCount === Infinity`, génère un tampon initial de 40 mesures.
 *
 * @param {object} config
 * @param {'treble' | 'bass' | 'grand'} config.clef
 * @param {number} config.bpm
 * @param {'4/4' | '3/4' | '2/4' | '6/8' | '9/8' | '12/8'} config.timeSignature
 * @param {number} config.measureCount
 * @param {string[]} config.selectedDurations - Tableau d'IDs cochés ex: ['q', '8']
 * @param {boolean} config.accidentals
 * @param {boolean} config.ledgerLines
 * @param {string} [config.sessionType] - 'ranked' | 'practice'
 */
export function generateRhythmScore(config = {}) {
  const {
    clef = 'grand',
    keySignature = 'C',
    timeSignature = '4/4',
    measureCount = 8,
    selectedDurations = ['q', '8'],
    accidentals = false,
    ledgerLines = false,
    sessionType,
  } = config;

  const sigInfo = TIME_SIGNATURES[timeSignature] || TIME_SIGNATURES['4/4'];
  const { beatsPerMeasure, isTernary } = sigInfo;

  const activeSet = new Set(
    Array.isArray(selectedDurations) && selectedDurations.length > 0
      ? selectedDurations
      : ['q']
  );

  const isRanked = sessionType === 'ranked';
  const effectiveMeasureCount =
    measureCount === Infinity || isRanked ? 40 : (measureCount || 8);

  const lastMidiRef = { current: null };
  const globalNoteIndexRef = { current: 0 };
  const measures = [];
  const flatNotes = [];

  for (let m = 0; m < effectiveMeasureCount; m++) {
    const mNotes = generateSingleMeasure({
      measureIndex: m,
      beatsPerMeasure,
      isTernary,
      activeSet,
      clef,
      keySignature,
      accidentals,
      ledgerLines,
      lastMidiRef,
      globalNoteIndexRef,
    });
    measures.push(mNotes);
    flatNotes.push(...mNotes);
  }

  return {
    measures,
    flatNotes,
    beatsPerMeasure,
    isTernary,
    unitLabel: sigInfo.unitLabel,
    totalBeats: effectiveMeasureCount * beatsPerMeasure,
    _lastMidi: lastMidiRef.current,
    _globalNoteIndex: globalNoteIndexRef.current,
  };
}

/**
 * Ajoute dynamiquement des mesures supplémentaires à la partition existante (mode infini).
 *
 * @param {object} score - Partition courante retournée par generateRhythmScore
 * @param {object} config - Configuration du jeu
 * @param {number} [count=25] - Nombre de mesures à ajouter
 */
export function appendRhythmMeasures(score, config = {}, count = 25) {
  if (!score || !Array.isArray(score.measures)) return score;

  const {
    clef = 'grand',
    keySignature = 'C',
    timeSignature = '4/4',
    selectedDurations = ['q', '8'],
    accidentals = false,
    ledgerLines = false,
  } = config;

  const sigInfo = TIME_SIGNATURES[timeSignature] || TIME_SIGNATURES['4/4'];
  const { beatsPerMeasure, isTernary } = sigInfo;

  const activeSet = new Set(
    Array.isArray(selectedDurations) && selectedDurations.length > 0
      ? selectedDurations
      : ['q']
  );

  const startIndex = score.measures.length;
  const lastMidiRef = { current: score._lastMidi ?? null };
  const globalNoteIndexRef = { current: score._globalNoteIndex ?? score.flatNotes.length };

  const newMeasures = [];
  const newFlatNotes = [];

  for (let m = startIndex; m < startIndex + count; m++) {
    const mNotes = generateSingleMeasure({
      measureIndex: m,
      beatsPerMeasure,
      isTernary,
      activeSet,
      clef,
      keySignature,
      accidentals,
      ledgerLines,
      lastMidiRef,
      globalNoteIndexRef,
    });
    newMeasures.push(mNotes);
    newFlatNotes.push(...mNotes);
  }

  return {
    ...score,
    measures: [...score.measures, ...newMeasures],
    flatNotes: [...score.flatNotes, ...newFlatNotes],
    totalBeats: (score.measures.length + count) * beatsPerMeasure,
    _lastMidi: lastMidiRef.current,
    _globalNoteIndex: globalNoteIndexRef.current,
  };
}

