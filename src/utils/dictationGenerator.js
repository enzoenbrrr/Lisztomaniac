import {
  BLACK_KEY_INDICES,
  STAFF_RANGES,
  getKeySignatureInfo,
  midiToNoteInfo,
} from './musicTheory';
import { TIME_SIGNATURES, DURATION_LABELS_FR } from './rhythmGenerator';

const DIATONIC_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_SEMITONES = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const LETTER_NAMES_FR = {
  C: 'Do',
  D: 'Ré',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
};

/**
 * Catalogue des intervalles maximums configurables entre deux notes consécutives.
 */
export const MAX_INTERVAL_OPTIONS = [
  { id: 2, label: 'Seconde', shortLabel: '2de', maxSemitones: 2, maxSteps: 1 },
  { id: 3, label: 'Tierce', shortLabel: '3ce', maxSemitones: 4, maxSteps: 2 },
  { id: 4, label: 'Quarte', shortLabel: '4te', maxSemitones: 5, maxSteps: 3 },
  { id: 5, label: 'Quinte', shortLabel: '5te', maxSemitones: 7, maxSteps: 4 },
  { id: 6, label: 'Sixte', shortLabel: '6te', maxSemitones: 9, maxSteps: 5 },
  { id: 8, label: 'Octave', shortLabel: '8ve', maxSemitones: 12, maxSteps: 7 },
];

/**
 * Catalogue des valeurs rythmiques utilisables dans l'éditeur de dictée.
 * `beatsBinary` = durée en temps binaire (1 temps = Noire ♩)
 * `beatsTernary` = durée en temps ternaire (1 temps = Noire pointée ♩.)
 */
export const DICTATION_DURATIONS = [
  {
    id: 'w',
    vexDuration: 'w',
    dots: 0,
    label: 'Ronde',
    symbol: '𝅝',
    restSymbol: '𝄻',
    beatsBinary: 4,
    beatsTernary: null, // Non utilisé en ternaire standard
  },
  {
    id: 'hd',
    vexDuration: 'h',
    dots: 1,
    label: 'Blanche pointée',
    symbol: '𝅗𝅥.',
    restSymbol: '𝄼.',
    beatsBinary: 3,
    beatsTernary: 2,
  },
  {
    id: 'h',
    vexDuration: 'h',
    dots: 0,
    label: 'Blanche',
    symbol: '𝅗𝅥',
    restSymbol: '𝄼',
    beatsBinary: 2,
    beatsTernary: null,
  },
  {
    id: 'qd',
    vexDuration: 'q',
    dots: 1,
    label: 'Noire pointée',
    symbol: '♩.',
    restSymbol: '𝄽.',
    beatsBinary: 1.5,
    beatsTernary: 1,
  },
  {
    id: 'q',
    vexDuration: 'q',
    dots: 0,
    label: 'Noire',
    symbol: '♩',
    restSymbol: '𝄽',
    beatsBinary: 1,
    beatsTernary: 2 / 3,
  },
  {
    id: '8',
    vexDuration: '8',
    dots: 0,
    label: 'Croche',
    symbol: '♪',
    restSymbol: '𝄾',
    beatsBinary: 0.5,
    beatsTernary: 1 / 3,
  },
  {
    id: '16',
    vexDuration: '16',
    dots: 0,
    label: 'Double-croche',
    symbol: '♬',
    restSymbol: '𝄿',
    beatsBinary: 0.25,
    beatsTernary: 1 / 6,
  },
];

export const DICTATION_DURATION_MAP = Object.fromEntries(
  DICTATION_DURATIONS.map((d) => [d.id, d])
);

/**
 * Retourne la durée en unités de temps de la mesure pour un `durationKey` donné.
 */
export function getDurationBeats(durationKey, isTernary = false) {
  const item = DICTATION_DURATION_MAP[durationKey];
  if (!item) return isTernary ? 1 / 3 : 1;
  if (isTernary) {
    if (item.beatsTernary !== null) return item.beatsTernary;
    if (durationKey === 'h') return 2;
    if (durationKey === 'w') return 3;
  }
  return item.beatsBinary;
}

/**
 * Construit la liste ordonnée des degrés diatoniques sur la portée (sans lignes supplémentaires)
 * pour la clé et l'armure données.
 */
export function getScaleStepsForClef(clef = 'treble', keySignature = 'C') {
  const range = (STAFF_RANGES[clef] || STAFF_RANGES.treble).standard;
  const keyInfo = getKeySignatureInfo(keySignature);
  const steps = [];

  for (let octave = 1; octave <= 6; octave++) {
    for (const letter of DIATONIC_LETTERS) {
      const naturalMidi = (octave + 1) * 12 + NATURAL_SEMITONES[letter];
      if (naturalMidi >= range.min && naturalMidi <= range.max) {
        const keyAlt = keyInfo.alterations[letter] || 0;
        const midi = naturalMidi + keyAlt;
        const altSuffixFr = keyAlt === 1 ? '♯' : keyAlt === -1 ? '♭' : '';
        const altSuffixEn = keyAlt === 1 ? '#' : keyAlt === -1 ? 'b' : '';
        const baseNameFr = `${LETTER_NAMES_FR[letter]}${altSuffixFr}`;

        steps.push({
          stepIndex: steps.length,
          letter,
          octave,
          naturalMidi,
          keyAlt,
          midi,
          vexflowKey: `${letter.toLowerCase()}/${octave}`,
          accidentalSymbol: null, // Déjà à l'armure
          nameFr: `${baseNameFr}${octave}`,
          baseNameFr,
          nameEn: `${letter}${altSuffixEn}${octave}`,
          clef,
        });
      }
    }
  }

  return steps;
}

/**
 * Construit un événement note (ou silence) à partir d'un degré sur la portée ou d'un numéro MIDI.
 */
export function createStepNoteObject({
  letter,
  octave,
  effectiveAlt = 0,
  keyAlt = 0,
  clef = 'treble',
  durationKey = 'q',
  isTernary = false,
  isRest = false,
  measureIndex = 0,
  beatInMeasure = 0,
  beatsPerMeasure = 4,
  beamGroupId = null,
}) {
  const durMeta = DICTATION_DURATION_MAP[durationKey] || DICTATION_DURATION_MAP.q;
  const durationBeats = getDurationBeats(durationKey, isTernary);

  if (isRest) {
    const restKey = clef === 'bass' ? 'd/3' : 'b/4';
    return {
      id: `rest-${measureIndex}-${beatInMeasure.toFixed(3)}-${Math.random().toString(36).slice(2, 6)}`,
      isRest: true,
      midi: null,
      clef,
      vexflowKey: restKey,
      accidentalSymbol: null,
      nameFr: 'Silence',
      baseNameFr: 'Silence',
      nameEn: 'Rest',
      duration: durMeta.vexDuration,
      dots: durMeta.dots,
      durationKey,
      durationBeats,
      measureIndex,
      beatInMeasure,
      globalBeat: measureIndex * beatsPerMeasure + beatInMeasure,
      beamGroupId: null,
    };
  }

  const naturalMidi = (octave + 1) * 12 + NATURAL_SEMITONES[letter];
  const midi = naturalMidi + effectiveAlt;
  const isAlteredFromKeySig = effectiveAlt !== keyAlt;

  let accidentalSymbol = null;
  if (isAlteredFromKeySig) {
    if (effectiveAlt === 1) accidentalSymbol = '#';
    else if (effectiveAlt === -1) accidentalSymbol = 'b';
    else accidentalSymbol = 'n';
  }

  const altSuffixFr =
    effectiveAlt === 1 ? '♯' : effectiveAlt === -1 ? '♭' : isAlteredFromKeySig ? '♮' : '';
  const altSuffixEn =
    effectiveAlt === 1 ? '#' : effectiveAlt === -1 ? 'b' : '';

  const baseNameFr = `${LETTER_NAMES_FR[letter]}${altSuffixFr}`;
  const vexAcc = accidentalSymbol === '#' ? '#' : accidentalSymbol === 'b' ? 'b' : '';

  return {
    id: `note-${midi}-${measureIndex}-${beatInMeasure.toFixed(3)}-${Math.random().toString(36).slice(2, 6)}`,
    isRest: false,
    midi,
    letter,
    octave,
    effectiveAlt,
    keyAlt,
    clef,
    vexflowKey: `${letter.toLowerCase()}${vexAcc}/${octave}`,
    accidentalSymbol,
    nameFr: `${baseNameFr}${octave}`,
    baseNameFr,
    nameEn: `${letter}${altSuffixEn}${octave}`,
    duration: durMeta.vexDuration,
    dots: durMeta.dots,
    durationKey,
    durationBeats,
    measureIndex,
    beatInMeasure,
    globalBeat: measureIndex * beatsPerMeasure + beatInMeasure,
    beamGroupId,
  };
}

/**
 * Convertit un numéro MIDI entré par l'utilisateur (clavier MIDI ou piano virtuel)
 * en coordonnées (letter, octave, effectiveAlt) adaptées à l'armure active.
 */
export function midiToDictationStep(midiNumber, clef = 'treble', keySignature = 'C') {
  const keyInfo = getKeySignatureInfo(keySignature);
  const scaleSteps = getScaleStepsForClef(clef, keySignature);

  // 1. Vérifie d'abord si ce numéro MIDI correspond exactement à un degré diatonique de l'armure
  const exactScaleStep = scaleSteps.find((s) => s.midi === midiNumber);
  if (exactScaleStep) {
    return {
      letter: exactScaleStep.letter,
      octave: exactScaleStep.octave,
      effectiveAlt: exactScaleStep.keyAlt,
      keyAlt: exactScaleStep.keyAlt,
    };
  }

  // 2. Sinon, calcule l'écriture chromatique ou bécarre la plus naturelle
  const preferFlats = keyInfo.type === 'flat';
  const info = midiToNoteInfo(midiNumber, preferFlats, clef);
  const letter = info.nameEn[0].toUpperCase();
  const octave = info.octave;
  const keyAlt = keyInfo.alterations[letter] || 0;
  const effectiveAlt = info.isAccidental ? (preferFlats ? -1 : 1) : 0;

  return {
    letter,
    octave,
    effectiveAlt,
    keyAlt,
  };
}

/**
 * Tire la prochaine hauteur de note en respectant le mode ('scale' ou 'random')
 * et l'intervalle maximum (`maxInterval`) par rapport à `previousPitch`.
 */
function pickNextPitch({
  clef,
  melodyMode,
  keySignature,
  maxInterval,
  previousPitch,
}) {
  const intervalInfo =
    MAX_INTERVAL_OPTIONS.find((opt) => opt.id === maxInterval) ||
    MAX_INTERVAL_OPTIONS[2]; // Défaut : Quarte
  const { maxSemitones, maxSteps } = intervalInfo;

  const scaleSteps = getScaleStepsForClef(clef, keySignature);

  if (melodyMode === 'scale') {
    if (!previousPitch) {
      // Pour la 1re note, privilégie le milieu de la portée (ou la tonique si présente)
      const middlePool = scaleSteps.slice(
        Math.max(0, Math.floor(scaleSteps.length * 0.2)),
        Math.min(scaleSteps.length, Math.ceil(scaleSteps.length * 0.8))
      );
      const chosen =
        middlePool[Math.floor(Math.random() * middlePool.length)] || scaleSteps[0];
      return {
        letter: chosen.letter,
        octave: chosen.octave,
        effectiveAlt: chosen.keyAlt,
        keyAlt: chosen.keyAlt,
        midi: chosen.midi,
        stepIndex: chosen.stepIndex,
      };
    }

    const candidates = scaleSteps.filter((s) => {
      const stepDiff = Math.abs(s.stepIndex - previousPitch.stepIndex);
      const semiDiff = Math.abs(s.midi - previousPitch.midi);
      return stepDiff >= 1 && stepDiff <= maxSteps && semiDiff <= maxSemitones + 1;
    });

    const pool = candidates.length > 0 ? candidates : scaleSteps;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return {
      letter: chosen.letter,
      octave: chosen.octave,
      effectiveAlt: chosen.keyAlt,
      keyAlt: chosen.keyAlt,
      midi: chosen.midi,
      stepIndex: chosen.stepIndex,
    };
  }

  // Mode 'random' (notes hasardeuses / chromatiques dans la tessiture standard de la clé)
  const range = (STAFF_RANGES[clef] || STAFF_RANGES.treble).standard;
  const allCandidates = [];

  for (const step of scaleSteps) {
    for (const alt of [-1, 0, 1]) {
      const m = step.naturalMidi + alt;
      if (m < range.min || m > range.max) continue;
      // Évite les enharmonies blanches type Mi#, Si#, Dob, Fab en mode chromatique libre
      const pc = ((m % 12) + 12) % 12;
      if (alt !== 0 && !BLACK_KEY_INDICES.has(pc)) continue;

      allCandidates.push({
        letter: step.letter,
        octave: step.octave,
        effectiveAlt: alt,
        keyAlt: 0,
        midi: m,
        stepIndex: step.stepIndex,
      });
    }
  }

  if (!previousPitch) {
    const chosen = allCandidates[Math.floor(Math.random() * allCandidates.length)];
    return chosen;
  }

  const nearby = allCandidates.filter((c) => {
    const semiDiff = Math.abs(c.midi - previousPitch.midi);
    return semiDiff >= 1 && semiDiff <= maxSemitones;
  });

  const pool = nearby.length > 0 ? nearby : allCandidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Recalcule les `beamGroupId` d'une mesure afin que les croches/doubles-croches consécutives
 * situées dans le même temps soient proprement ligaturées par VexFlow.
 */
export function recomputeMeasureBeams(measureNotes, measureIndex = 0) {
  let currentBeat = 0;
  const updated = measureNotes.map((note) => {
    const beatStart = currentBeat;
    currentBeat += note.durationBeats;
    const wholeBeatIndex = Math.floor(beatStart + 0.001);
    const isBeamable =
      !note.isRest && (note.durationKey === '8' || note.durationKey === '16');

    return {
      ...note,
      measureIndex,
      beatInMeasure: beatStart,
      beamGroupId: isBeamable ? `dict-beam-${measureIndex}-${wholeBeatIndex}` : null,
    };
  });

  return updated;
}

/**
 * Génère une dictée musicale complète selon les paramètres choisis par l'utilisateur.
 */
export function generateDictationScore(config = {}) {
  const {
    clef = 'treble',
    measureCount = 4,
    selectedDurations = ['q', '8'],
    selectedTimeSignatures = ['4/4'],
    includeRests = false,
    melodyMode = 'scale', // 'scale' | 'random'
    keySignature = 'C',
    maxInterval = 4,
    bpm = 72,
  } = config;

  const effectiveKeySig = melodyMode === 'scale' ? keySignature || 'C' : 'C';

  // Tirage au sort d'une signature temporelle parmi celles cochées
  const validSigs =
    Array.isArray(selectedTimeSignatures) && selectedTimeSignatures.length > 0
      ? selectedTimeSignatures.filter((s) => TIME_SIGNATURES[s])
      : ['4/4'];
  const chosenTimeSignature =
    validSigs[Math.floor(Math.random() * validSigs.length)] || '4/4';

  const sigInfo = TIME_SIGNATURES[chosenTimeSignature] || TIME_SIGNATURES['4/4'];
  const { beatsPerMeasure, isTernary } = sigInfo;

  const activeSet = new Set(
    Array.isArray(selectedDurations) && selectedDurations.length > 0
      ? selectedDurations
      : ['q']
  );

  const measures = [];
  let lastPitch = null;

  for (let m = 0; m < measureCount; m++) {
    const rawEvents = [];
    let currentBeat = 0;

    while (currentBeat < beatsPerMeasure - 0.001) {
      const remainingBeats = beatsPerMeasure - currentBeat;
      const isVeryFirstNote = m === 0 && currentBeat < 0.001;

      if (isTernary) {
        // --- MODE TERNAIRE (6/8, 9/8, 12/8 : 1 temps = Noire pointée) ---
        const patterns = [];
        if (activeSet.has('h') && remainingBeats >= 2 - 0.001) {
          patterns.push([{ durationKey: 'hd', canBeRest: false }]);
        }
        if (activeSet.has('qd') && remainingBeats >= 1 - 0.001) {
          patterns.push([{ durationKey: 'qd', canBeRest: true }]);
        }
        if (activeSet.has('q') && remainingBeats >= 1 - 0.001) {
          patterns.push([
            { durationKey: 'q', canBeRest: false },
            { durationKey: '8', canBeRest: true },
          ]);
        }
        if (activeSet.has('8') && remainingBeats >= 1 - 0.001) {
          patterns.push([
            { durationKey: '8', canBeRest: false },
            { durationKey: '8', canBeRest: false },
            { durationKey: '8', canBeRest: true },
          ]);
        }
        if (activeSet.has('16') && remainingBeats >= 1 - 0.001) {
          patterns.push([
            { durationKey: '16', canBeRest: false },
            { durationKey: '16', canBeRest: false },
            { durationKey: '8', canBeRest: false },
            { durationKey: '8', canBeRest: false },
          ]);
        }

        if (patterns.length === 0) {
          patterns.push([{ durationKey: 'qd', canBeRest: true }]);
        }

        const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];

        for (let i = 0; i < chosenPattern.length; i++) {
          const item = chosenPattern[i];
          const firstInScore = isVeryFirstNote && i === 0;
          const makeRest =
            !firstInScore && includeRests && item.canBeRest && Math.random() < 0.2;

          if (makeRest) {
            const ev = createStepNoteObject({
              clef,
              durationKey: item.durationKey,
              isTernary,
              isRest: true,
              measureIndex: m,
              beatInMeasure: currentBeat,
              beatsPerMeasure,
            });
            rawEvents.push(ev);
            currentBeat += ev.durationBeats;
          } else {
            const pitch = pickNextPitch({
              clef,
              melodyMode,
              keySignature: effectiveKeySig,
              maxInterval,
              previousPitch: lastPitch,
            });
            lastPitch = pitch;

            const ev = createStepNoteObject({
              ...pitch,
              clef,
              durationKey: item.durationKey,
              isTernary,
              isRest: false,
              measureIndex: m,
              beatInMeasure: currentBeat,
              beatsPerMeasure,
            });
            rawEvents.push(ev);
            currentBeat += ev.durationBeats;
          }
        }
      } else {
        // --- MODE BINAIRE (2/4, 3/4, 4/4 : 1 temps = Noire) ---
        const patterns = [];
        if (activeSet.has('w') && remainingBeats >= 4 - 0.001 && currentBeat < 0.001) {
          patterns.push([{ durationKey: 'w', canBeRest: false }]);
        }
        if (activeSet.has('h') && remainingBeats >= 2 - 0.001) {
          patterns.push([{ durationKey: 'h', canBeRest: false }]);
        }
        if (activeSet.has('qd') && remainingBeats >= 2 - 0.001) {
          patterns.push([
            { durationKey: 'qd', canBeRest: false },
            { durationKey: '8', canBeRest: true },
          ]);
        }
        if (activeSet.has('q') && remainingBeats >= 1 - 0.001) {
          patterns.push([{ durationKey: 'q', canBeRest: true }]);
        }
        if (activeSet.has('8') && remainingBeats >= 1 - 0.001) {
          patterns.push([
            { durationKey: '8', canBeRest: false },
            { durationKey: '8', canBeRest: true },
          ]);
        }
        if (activeSet.has('16') && remainingBeats >= 1 - 0.001) {
          patterns.push([
            { durationKey: '16', canBeRest: false },
            { durationKey: '16', canBeRest: false },
            { durationKey: '16', canBeRest: false },
            { durationKey: '16', canBeRest: false },
          ]);
        }

        if (patterns.length === 0) {
          patterns.push([{ durationKey: 'q', canBeRest: true }]);
        }

        const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)];

        for (let i = 0; i < chosenPattern.length; i++) {
          const item = chosenPattern[i];
          const firstInScore = isVeryFirstNote && i === 0;
          const makeRest =
            !firstInScore && includeRests && item.canBeRest && Math.random() < 0.22;

          if (makeRest) {
            const ev = createStepNoteObject({
              clef,
              durationKey: item.durationKey,
              isTernary,
              isRest: true,
              measureIndex: m,
              beatInMeasure: currentBeat,
              beatsPerMeasure,
            });
            rawEvents.push(ev);
            currentBeat += ev.durationBeats;
          } else {
            const pitch = pickNextPitch({
              clef,
              melodyMode,
              keySignature: effectiveKeySig,
              maxInterval,
              previousPitch: lastPitch,
            });
            lastPitch = pitch;

            const ev = createStepNoteObject({
              ...pitch,
              clef,
              durationKey: item.durationKey,
              isTernary,
              isRest: false,
              measureIndex: m,
              beatInMeasure: currentBeat,
              beatsPerMeasure,
            });
            rawEvents.push(ev);
            currentBeat += ev.durationBeats;
          }
        }
      }
    }

    const beamedMeasure = recomputeMeasureBeams(rawEvents, m).map((ev) => ({
      ...ev,
      globalBeat: m * beatsPerMeasure + ev.beatInMeasure,
    }));
    measures.push(beamedMeasure);
  }

  const flatNotes = measures.flat();

  // Prépare les mesures initiales de l'utilisateur :
  // La toute 1re note (Mesure 1, temps 0) est donnée en hauteur, mais TOUJOURS affichée comme une Noire ('q')
  // afin que l'utilisateur doive lui-même identifier et ajuster sa vraie valeur de temps !
  const targetFirst = measures[0]?.[0] || null;
  const firstNote = targetFirst
    ? {
        ...createStepNoteObject({
          letter: targetFirst.letter,
          octave: targetFirst.octave,
          effectiveAlt: targetFirst.effectiveAlt,
          keyAlt: targetFirst.keyAlt,
          clef,
          durationKey: 'q',
          isTernary,
          isRest: false,
          measureIndex: 0,
          beatInMeasure: 0,
          beatsPerMeasure,
        }),
        isGivenFirstNote: true,
      }
    : null;
  const initialUserMeasures = measures.map((_, idx) =>
    idx === 0 && firstNote ? [firstNote] : []
  );

  return {
    clef,
    keySignature: effectiveKeySig,
    melodyMode,
    timeSignature: chosenTimeSignature,
    beatsPerMeasure,
    isTernary,
    bpm,
    measureCount,
    measures,
    flatNotes,
    firstNote,
    initialUserMeasures,
    totalBeats: measureCount * beatsPerMeasure,
  };
}

/**
 * Évalue et corrige la dictée écrite par l'utilisateur par rapport à la mélodie cible.
 * Compare chaque événement (position temporelle, hauteur MIDI / silence, et durée)
 * ainsi que la signature de temps reconnue par l'utilisateur.
 */
export function evaluateDictation(
  targetMeasures,
  userMeasures,
  targetTimeSignature = null,
  guessedTimeSignature = null
) {
  let totalTargetEvents = 0;
  let totalUserEvents = 0;
  let exactMatches = 0;
  let pitchOnlyMatches = 0;

  const annotatedUserMeasures = [];
  const measureSummaries = [];

  for (let m = 0; m < targetMeasures.length; m++) {
    const tNotes = targetMeasures[m] || [];
    const uNotes = userMeasures[m] || [];

    totalTargetEvents += tNotes.length;
    totalUserEvents += uNotes.length;
    let measureExact = 0;

    const annotatedNotes = uNotes.map((uNote, uIdx) => {
      // 1. Cherche l'événement cible au même temps dans la mesure (tolérance 0.08 temps)
      const matchingBeatTarget = tNotes.find(
        (t) => Math.abs(t.beatInMeasure - uNote.beatInMeasure) < 0.08
      );

      if (!matchingBeatTarget) {
        // Fallback par index si une erreur de durée précédente a décalé le temps mais que la note est la bonne
        const indexTarget = tNotes[uIdx];
        const samePitchByIndex =
          indexTarget &&
          ((uNote.isRest && indexTarget.isRest) ||
            (!uNote.isRest && !indexTarget.isRest && uNote.midi === indexTarget.midi));

        if (samePitchByIndex) {
          pitchOnlyMatches++;
          return {
            ...uNote,
            correctionStatus: 'partial',
            correctionHint: 'Bonne hauteur, mais décalée dans la mesure',
          };
        }

        return {
          ...uNote,
          correctionStatus: 'wrong',
          correctionHint:
            uIdx >= tNotes.length ? 'Note en surnombre dans la mesure' : 'Décalé rythmiquement',
        };
      }

      const samePitchOrRest =
        (uNote.isRest && matchingBeatTarget.isRest) ||
        (!uNote.isRest && !matchingBeatTarget.isRest && uNote.midi === matchingBeatTarget.midi);

      const sameDuration =
        Math.abs(uNote.durationBeats - matchingBeatTarget.durationBeats) < 0.05;

      if (samePitchOrRest && sameDuration) {
        exactMatches++;
        measureExact++;
        return {
          ...uNote,
          correctionStatus: 'correct',
          correctionHint: 'Parfait',
        };
      }

      if (samePitchOrRest && !sameDuration) {
        pitchOnlyMatches++;
        return {
          ...uNote,
          correctionStatus: 'partial',
          correctionHint: `Bonne hauteur, mais durée attendue : ${
            DURATION_LABELS_FR[matchingBeatTarget.durationKey] || matchingBeatTarget.durationKey
          }`,
        };
      }

      if (!samePitchOrRest && sameDuration) {
        return {
          ...uNote,
          correctionStatus: 'partial',
          correctionHint: `Bon rythme, mais note attendue : ${matchingBeatTarget.nameFr}`,
        };
      }

      return {
        ...uNote,
        correctionStatus: 'wrong',
        correctionHint: `Attendu : ${matchingBeatTarget.nameFr} (${
          DURATION_LABELS_FR[matchingBeatTarget.durationKey] || matchingBeatTarget.durationKey
        })`,
      };
    });

    annotatedUserMeasures.push(annotatedNotes);
    measureSummaries.push({
      measureIndex: m,
      targetCount: tNotes.length,
      userCount: uNotes.length,
      exactCount: measureExact,
      isPerfect: measureExact === tNotes.length && uNotes.length === tNotes.length,
    });
  }

  const isTimeSignatureCorrect =
    Boolean(targetTimeSignature) && guessedTimeSignature === targetTimeSignature;

  const denominator = Math.max(1, totalTargetEvents, totalUserEvents);
  const noteScorePoints = exactMatches + pitchOnlyMatches * 0.5;
  const noteAccuracy = (noteScorePoints / denominator) * 100;
  const accuracy = Math.min(
    100,
    Math.round(targetTimeSignature ? noteAccuracy * 0.9 + (isTimeSignatureCorrect ? 10 : 0) : noteAccuracy)
  );

  return {
    annotatedUserMeasures,
    measureSummaries,
    totalTargetEvents,
    totalUserEvents,
    exactMatches,
    pitchOnlyMatches,
    missedCount: Math.max(0, denominator - exactMatches),
    accuracy,
    targetTimeSignature,
    guessedTimeSignature,
    isTimeSignatureCorrect,
  };
}

