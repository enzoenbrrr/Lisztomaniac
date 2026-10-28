/**
 * Utilitaires de théorie musicale, conversion MIDI <-> VexFlow / Solfège FR,
 * gestion des gammes Majeures / Mineures avec armure à la clé (Cycle des Quintes)
 * et générateur aléatoire de notes selon la configuration de l'exercice.
 * 60 = Do central (C4 / Do4)
 */

export const NOTE_NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT_EN = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const NOTE_NAMES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const NOTE_NAMES_FLAT_FR = ['Do', 'Réb', 'Ré', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

// Indices des touches noires dans l'octave (0 = Do)
export const BLACK_KEY_INDICES = new Set([1, 3, 6, 8, 10]);

// Demi-tons naturels par degré diatonique (par rapport à Do = 0)
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

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function buildAlterationsMap(type, count) {
  const map = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (type === 'sharp') {
    for (let i = 0; i < count; i++) {
      map[SHARP_ORDER[i]] = 1;
    }
  } else if (type === 'flat') {
    for (let i = 0; i < count; i++) {
      map[FLAT_ORDER[i]] = -1;
    }
  }
  return map;
}

function buildAlteredNotesListFr(type, count) {
  if (type === 'sharp') {
    return SHARP_ORDER.slice(0, count).map((l) => `${LETTER_NAMES_FR[l]}♯`);
  }
  if (type === 'flat') {
    return FLAT_ORDER.slice(0, count).map((l) => `${LETTER_NAMES_FR[l]}♭`);
  }
  return [];
}

/**
 * Catalogue complet des 15 armures à la clé (Cycle des Quintes : 0, 1♯..7♯, 1♭..7♭)
 * compatibles nativement avec VexFlow `stave.addKeySignature(id)`.
 */
export const KEY_SIGNATURES = [
  {
    id: 'C',
    type: 'none',
    count: 0,
    badge: '0',
    majorFr: 'Do Majeur',
    majorShortFr: 'Do',
    minorFr: 'La mineur',
    minorShortFr: 'La',
  },
  // --- Armures avec Dièses (♯) ---
  {
    id: 'G',
    type: 'sharp',
    count: 1,
    badge: '1♯',
    majorFr: 'Sol Majeur',
    majorShortFr: 'Sol',
    minorFr: 'Mi mineur',
    minorShortFr: 'Mi',
  },
  {
    id: 'D',
    type: 'sharp',
    count: 2,
    badge: '2♯',
    majorFr: 'Ré Majeur',
    majorShortFr: 'Ré',
    minorFr: 'Si mineur',
    minorShortFr: 'Si',
  },
  {
    id: 'A',
    type: 'sharp',
    count: 3,
    badge: '3♯',
    majorFr: 'La Majeur',
    majorShortFr: 'La',
    minorFr: 'Fa♯ mineur',
    minorShortFr: 'Fa♯',
  },
  {
    id: 'E',
    type: 'sharp',
    count: 4,
    badge: '4♯',
    majorFr: 'Mi Majeur',
    majorShortFr: 'Mi',
    minorFr: 'Do♯ mineur',
    minorShortFr: 'Do♯',
  },
  {
    id: 'B',
    type: 'sharp',
    count: 5,
    badge: '5♯',
    majorFr: 'Si Majeur',
    majorShortFr: 'Si',
    minorFr: 'Sol♯ mineur',
    minorShortFr: 'Sol♯',
  },
  {
    id: 'F#',
    type: 'sharp',
    count: 6,
    badge: '6♯',
    majorFr: 'Fa♯ Majeur',
    majorShortFr: 'Fa♯',
    minorFr: 'Ré♯ mineur',
    minorShortFr: 'Ré♯',
  },
  {
    id: 'C#',
    type: 'sharp',
    count: 7,
    badge: '7♯',
    majorFr: 'Do♯ Majeur',
    majorShortFr: 'Do♯',
    minorFr: 'La♯ mineur',
    minorShortFr: 'La♯',
  },
  // --- Armures avec Bémols (♭) ---
  {
    id: 'F',
    type: 'flat',
    count: 1,
    badge: '1♭',
    majorFr: 'Fa Majeur',
    majorShortFr: 'Fa',
    minorFr: 'Ré mineur',
    minorShortFr: 'Ré',
  },
  {
    id: 'Bb',
    type: 'flat',
    count: 2,
    badge: '2♭',
    majorFr: 'Si♭ Majeur',
    majorShortFr: 'Si♭',
    minorFr: 'Sol mineur',
    minorShortFr: 'Sol',
  },
  {
    id: 'Eb',
    type: 'flat',
    count: 3,
    badge: '3♭',
    majorFr: 'Mi♭ Majeur',
    majorShortFr: 'Mi♭',
    minorFr: 'Do mineur',
    minorShortFr: 'Do',
  },
  {
    id: 'Ab',
    type: 'flat',
    count: 4,
    badge: '4♭',
    majorFr: 'La♭ Majeur',
    majorShortFr: 'La♭',
    minorFr: 'Fa mineur',
    minorShortFr: 'Fa',
  },
  {
    id: 'Db',
    type: 'flat',
    count: 5,
    badge: '5♭',
    majorFr: 'Ré♭ Majeur',
    majorShortFr: 'Ré♭',
    minorFr: 'Si♭ mineur',
    minorShortFr: 'Si♭',
  },
  {
    id: 'Gb',
    type: 'flat',
    count: 6,
    badge: '6♭',
    majorFr: 'Sol♭ Majeur',
    majorShortFr: 'Sol♭',
    minorFr: 'Mi♭ mineur',
    minorShortFr: 'Mi♭',
  },
  {
    id: 'Cb',
    type: 'flat',
    count: 7,
    badge: '7♭',
    majorFr: 'Do♭ Majeur',
    majorShortFr: 'Do♭',
    minorFr: 'La♭ mineur',
    minorShortFr: 'La♭',
  },
].map((entry) => ({
  ...entry,
  alterations: buildAlterationsMap(entry.type, entry.count),
  alteredNotesFr: buildAlteredNotesListFr(entry.type, entry.count),
}));

export const KEY_SIGNATURE_MAP = Object.fromEntries(
  KEY_SIGNATURES.map((k) => [k.id, k])
);

/**
 * Retourne les informations complètes d'une armure à la clé (fallback sur Do Majeur / La mineur).
 */
export function getKeySignatureInfo(keySignature = 'C') {
  return KEY_SIGNATURE_MAP[keySignature] || KEY_SIGNATURE_MAP.C;
}

/**
 * Formate uniquement l'armure active pour l'affichage dans l'interface (sans révéler le nom de la gamme).
 * Ex: "Armure : 1♯" ou "Armure : 3♭" ou "Armure vierge (0)"
 */
export function formatScaleLabelFr(keySignature = 'C') {
  const info = getKeySignatureInfo(keySignature);
  if (info.count === 0) {
    return 'Armure vierge (0)';
  }
  return `Armure : ${info.badge}`;
}

/**
 * Tessitures (en numéros MIDI naturels de référence) pour chaque clé, avec ou sans lignes supplémentaires.
 * - Sans lignes supp. (standard) : strictement sur/entre les 5 lignes de la portée.
 * - Avec lignes supp. (ledger)   : jusqu'à 2-3 lignes supplémentaires au-dessus et en dessous.
 */
export const STAFF_RANGES = {
  treble: {
    standard: { min: 62, max: 79 }, // Ré4 (D4) à Sol5 (G5) -> aucune ligne supplémentaire
    ledger: { min: 57, max: 84 },   // La3 (A3) à Do6 (C6)  -> inclut les lignes supplémentaires
  },
  bass: {
    standard: { min: 41, max: 59 }, // Fa2 (F2) à Si3 (B3)  -> aucune ligne supplémentaire
    ledger: { min: 36, max: 64 },   // Do2 (C2) à Mi4 (E4)  -> inclut les lignes supplémentaires
  },
};

/**
 * Convertit un numéro de note MIDI (21 à 108 pour un piano 88 touches)
 * en un objet riche utilisable par l'UI et par VexFlow.
 *
 * @param {number} midiNumber - Numéro MIDI (ex: 60 pour Do4 / C4)
 * @param {boolean} preferFlats - Si true, privilégie l'orthographe bémol (ex: Db au lieu de C#)
 * @param {'treble' | 'bass'} targetClef - Clé sur laquelle la note doit être dessinée
 * @returns {object} Métadonnées complètes de la note
 */
export function midiToNoteInfo(midiNumber, preferFlats = false, targetClef = null) {
  const pitchClass = ((midiNumber % 12) + 12) % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  const isAccidental = BLACK_KEY_INDICES.has(pitchClass);

  const nameEn = preferFlats ? NOTE_NAMES_FLAT_EN[pitchClass] : NOTE_NAMES_EN[pitchClass];
  const nameFr = preferFlats ? NOTE_NAMES_FLAT_FR[pitchClass] : NOTE_NAMES_FR[pitchClass];

  // Format attendu par VexFlow : ex. "c/4", "c#/4", "db/4"
  const vexflowKey = `${nameEn.toLowerCase()}/${octave}`;
  const accidentalSymbol = isAccidental ? (preferFlats ? 'b' : '#') : null;

  // Détermination automatique de la clé si non fournie (60 = Do4 = frontière Sol/Fa)
  const resolvedClef = targetClef || (midiNumber >= 60 ? 'treble' : 'bass');

  // Calcul de la fréquence en Hz (La4 = 69 = 440Hz)
  const frequency = +(440 * Math.pow(2, (midiNumber - 69) / 12)).toFixed(2);

  return {
    id: `${midiNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    midi: midiNumber,
    pitchClass,
    octave,
    isAccidental,
    accidentalSymbol,
    preferFlats,
    clef: resolvedClef,                 // 'treble' | 'bass'
    nameEn: `${nameEn}${octave}`,       // ex: "C#4" ou "Db4"
    nameFr: `${nameFr}${octave}`,       // ex: "Do#4" ou "Réb4"
    baseNameFr: nameFr,                 // ex: "Do#"
    vexflowKey,                         // ex: "c#/4"
    frequency,
  };
}

/**
 * Construit un objet note VexFlow à partir d'un degré diatonique (letter, octave)
 * en tenant compte de l'armure à la clé (`keyAlt`) et d'une éventuelle altération accidentelle.
 *
 * - Si la note suit l'armure à la clé (`effectiveAlt === keyAlt`), `accidentalSymbol` vaut `null`
 *   car l'altération (♯ ou ♭) est déjà affichée dans l'armure à la clé !
 * - Si la note possède une altération accidentelle hors armure, `accidentalSymbol` vaut `'#'`, `'b'` ou `'n'` (bécarre ♮).
 */
function buildStaffStepNote({
  letter,
  octave,
  effectiveAlt,
  keyAlt,
  targetClef,
}) {
  const naturalMidi = (octave + 1) * 12 + NATURAL_SEMITONES[letter];
  const midiNumber = naturalMidi + effectiveAlt;
  const pitchClass = ((midiNumber % 12) + 12) % 12;

  const isAlteredFromKeySig = effectiveAlt !== keyAlt;
  let accidentalSymbol = null;
  if (isAlteredFromKeySig) {
    if (effectiveAlt === 1) accidentalSymbol = '#';
    else if (effectiveAlt === -1) accidentalSymbol = 'b';
    else accidentalSymbol = 'n'; // Bécarre (♮) annulant l'armure à la clé
  }

  const altSuffixFr =
    effectiveAlt === 1 ? '♯' : effectiveAlt === -1 ? '♭' : isAlteredFromKeySig ? '♮' : '';
  const altSuffixEn =
    effectiveAlt === 1 ? '#' : effectiveAlt === -1 ? 'b' : '';

  const baseNameFr = `${LETTER_NAMES_FR[letter]}${altSuffixFr}`;
  const baseNameEn = `${letter}${altSuffixEn}`;

  const vexKeyAccidental =
    accidentalSymbol === '#' ? '#' : accidentalSymbol === 'b' ? 'b' : '';
  const vexflowKey = `${letter.toLowerCase()}${vexKeyAccidental}/${octave}`;

  const frequency = +(440 * Math.pow(2, (midiNumber - 69) / 12)).toFixed(2);

  return {
    id: `${midiNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    midi: midiNumber,
    pitchClass,
    octave,
    isAccidental: effectiveAlt !== 0,
    accidentalSymbol,
    preferFlats: effectiveAlt === -1,
    clef: targetClef,
    nameEn: `${baseNameEn}${octave}`,
    nameFr: `${baseNameFr}${octave}`,
    baseNameFr,
    vexflowKey,
    frequency,
  };
}

/**
 * Génère la liste des degrés diatoniques (letter, octave) disponibles sur la portée.
 */
function getDiatonicStaffSteps(staffClef, ledgerLines) {
  const rangeGroup = STAFF_RANGES[staffClef] || STAFF_RANGES.treble;
  const { min, max } = ledgerLines ? rangeGroup.ledger : rangeGroup.standard;

  const steps = [];
  for (let octave = 1; octave <= 6; octave++) {
    for (const letter of DIATONIC_LETTERS) {
      const naturalMidi = (octave + 1) * 12 + NATURAL_SEMITONES[letter];
      if (naturalMidi >= min && naturalMidi <= max) {
        steps.push({ letter, octave, naturalMidi });
      }
    }
  }
  return steps;
}

/**
 * Génère la liste des notes MIDI candidates selon les paramètres de l'exercice.
 */
export function getCandidateMidiNotes(staffClef, accidentals, ledgerLines, keySignature = 'C') {
  const keyInfo = getKeySignatureInfo(keySignature);
  const steps = getDiatonicStaffSteps(staffClef, ledgerLines);
  const midiSet = new Set();

  for (const step of steps) {
    const keyAlt = keyInfo.alterations[step.letter] || 0;
    const diatonicMidi = step.naturalMidi + keyAlt;
    if (diatonicMidi >= 36 && diatonicMidi <= 84) {
      midiSet.add(diatonicMidi);
    }
    if (accidentals) {
      for (const alt of [-1, 0, 1]) {
        const m = step.naturalMidi + alt;
        if (m >= 36 && m <= 84) {
          midiSet.add(m);
        }
      }
    }
  }

  return Array.from(midiSet).sort((a, b) => a - b);
}

/**
 * Tire aléatoirement une nouvelle note selon la clé, la gamme (armure à la clé)
 * et les options choisies par le joueur, en évitant de répéter la note précédente.
 *
 * @param {object} config
 * @param {'treble' | 'bass' | 'grand'} config.clef
 * @param {string} [config.keySignature='C'] - Armure à la clé VexFlow ('C', 'G', 'D', 'F', 'Bb', etc.)
 * @param {boolean} config.accidentals - Autoriser les altérations accidentelles hors armure
 * @param {boolean} config.ledgerLines - Autoriser les lignes supplémentaires
 * @param {number|null} [previousMidi=null] - Dernier numéro MIDI généré (anti-doublon)
 * @returns {object} Objet note complet prêt pour VexFlow et la comparaison MIDI
 */
export function generateRandomNote(config = {}, previousMidi = null) {
  const {
    clef = 'treble',
    keySignature = 'C',
    accidentals = false,
    ledgerLines = false,
  } = config;

  const targetClef =
    clef === 'grand' ? (Math.random() < 0.5 ? 'treble' : 'bass') : clef;

  const keyInfo = getKeySignatureInfo(keySignature);
  const steps = getDiatonicStaffSteps(targetClef, ledgerLines);

  // Construction des candidats (notes diatoniques de la gamme + altérations accidentelles si activées)
  const candidates = [];

  for (const step of steps) {
    const keyAlt = keyInfo.alterations[step.letter] || 0;
    const diatonicMidi = step.naturalMidi + keyAlt;

    // 1. Note diatonique de la gamme (sans symbole accidentel devant la note car déjà à l'armure)
    if (diatonicMidi >= 36 && diatonicMidi <= 84) {
      candidates.push({
        letter: step.letter,
        octave: step.octave,
        effectiveAlt: keyAlt,
        keyAlt,
        midi: diatonicMidi,
        weight: accidentals ? 3 : 1, // Privilégie la gamme tout en introduisant des altérations accidentelles
      });
    }

    // 2. Altérations accidentelles hors armure (si l'option Altérations est activée)
    if (accidentals) {
      if (keyAlt !== 0) {
        // Si la note est diésée ou bémolisée à l'armure, on peut générer un bécarre (♮)
        if (step.naturalMidi >= 36 && step.naturalMidi <= 84) {
          candidates.push({
            letter: step.letter,
            octave: step.octave,
            effectiveAlt: 0,
            keyAlt,
            midi: step.naturalMidi,
            weight: 1,
          });
        }
      } else {
        // Si la note est naturelle à l'armure, on peut générer un # ou un b chromatique
        for (const alt of [1, -1]) {
          const m = step.naturalMidi + alt;
          const pc = ((m % 12) + 12) % 12;
          if (BLACK_KEY_INDICES.has(pc) && m >= 36 && m <= 84) {
            candidates.push({
              letter: step.letter,
              octave: step.octave,
              effectiveAlt: alt,
              keyAlt,
              midi: m,
              weight: 1,
            });
          }
        }
      }
    }
  }

  // Filtrage anti-répétition immédiate sur le numéro MIDI
  const filtered =
    candidates.length > 1 && previousMidi !== null
      ? candidates.filter((c) => c.midi !== previousMidi)
      : candidates;

  const pool = filtered.length > 0 ? filtered : candidates;

  // Tirage pondéré
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * totalWeight;
  let chosen = pool[pool.length - 1];
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) {
      chosen = item;
      break;
    }
  }

  return buildStaffStepNote({
    letter: chosen.letter,
    octave: chosen.octave,
    effectiveAlt: chosen.effectiveAlt,
    keyAlt: chosen.keyAlt,
    targetClef,
  });
}

/**
 * Vérifie si la note MIDI jouée correspond à la note cible.
 * Grâce à la comparaison par numéro MIDI, l'enharmonie (ex: Do#4 vs Réb4 = 61, Mi#4 vs Fa4 = 65)
 * est nativement gérée sans ambiguïté.
 *
 * @param {number} playedMidi - Numéro MIDI reçu du clavier maître
 * @param {number} targetMidi - Numéro MIDI de la note affichée sur la portée
 * @returns {boolean}
 */
export function isMidiNoteMatch(playedMidi, targetMidi) {
  return playedMidi === targetMidi;
}

/**
 * Catalogue complet des 12 intervalles simples (1 à 12 demi-tons).
 */
export const INTERVALS_CATALOG = [
  { semitones: 1, shortName: '2m', name: 'Seconde mineure', quality: 'mineure', degrees: 2, shortcut: '1' },
  { semitones: 2, shortName: '2M', name: 'Seconde majeure', quality: 'majeure', degrees: 2, shortcut: '2' },
  { semitones: 3, shortName: '3m', name: 'Tierce mineure', quality: 'mineure', degrees: 3, shortcut: '3' },
  { semitones: 4, shortName: '3M', name: 'Tierce majeure', quality: 'majeure', degrees: 3, shortcut: '4' },
  { semitones: 5, shortName: '4J', name: 'Quarte juste', quality: 'juste', degrees: 4, shortcut: '5' },
  { semitones: 6, shortName: 'Triton', name: 'Triton (4A / 5d)', quality: 'triton', degrees: 4, shortcut: '6' },
  { semitones: 7, shortName: '5J', name: 'Quinte juste', quality: 'juste', degrees: 5, shortcut: '7' },
  { semitones: 8, shortName: '6m', name: 'Sixte mineure', quality: 'mineure', degrees: 6, shortcut: '8' },
  { semitones: 9, shortName: '6M', name: 'Sixte majeure', quality: 'majeure', degrees: 6, shortcut: '9' },
  { semitones: 10, shortName: '7m', name: 'Septième mineure', quality: 'mineure', degrees: 7, shortcut: '0' },
  { semitones: 11, shortName: '7M', name: 'Septième majeure', quality: 'majeure', degrees: 7, shortcut: '-' },
  { semitones: 12, shortName: '8J', name: 'Octave', quality: 'juste', degrees: 8, shortcut: '=' },
];

/**
 * Génère un problème d'intervalle aléatoire selon les paramètres de jeu.
 *
 * @param {number} maxSemitones - Demi-tons maximum autorisés (4, 7 ou 12)
 * @param {'harmonic' | 'melodic' | 'mixed'} playbackMode
 * @param {number|null} previousSemitones - Pour éviter deux fois de suite exactement le même intervalle
 * @returns {{ rootMidi: number, secondMidi: number, interval: typeof INTERVALS_CATALOG[0], playbackType: 'harmonic' | 'melodic' }}
 */
export function generateRandomInterval(maxSemitones = 12, playbackMode = 'harmonic', previousSemitones = null) {
  let eligible = INTERVALS_CATALOG.filter((item) => item.semitones <= maxSemitones);
  if (eligible.length > 1 && previousSemitones !== null) {
    const withoutPrevious = eligible.filter((item) => item.semitones !== previousSemitones);
    if (withoutPrevious.length > 0) eligible = withoutPrevious;
  }

  const chosenInterval = eligible[Math.floor(Math.random() * eligible.length)];

  // Note de base dans le médium du piano : entre Do3 (48) et Sol4 (67)
  const rootMidi = Math.floor(Math.random() * (67 - 48 + 1)) + 48;
  const secondMidi = rootMidi + chosenInterval.semitones;

  const playbackType =
    playbackMode === 'mixed'
      ? (Math.random() < 0.5 ? 'harmonic' : 'melodic')
      : playbackMode;

  return {
    rootMidi,
    secondMidi,
    interval: chosenInterval,
    playbackType,
  };
}
