/**
 * Règles imposées du Mode Classé pour les exercices de lecture à vue.
 * Le classement est réparti en 3 catégories : Clé de Sol, Clé de Fa et Grand Staff.
 * Les paramètres libres du mode Entraînement sont conservés intacts dans la configuration :
 * les règles ci-dessous ne sont appliquées qu'au lancement d'une partie classée.
 */

export const RANKED_CLEFS = [
  { id: 'treble', label: 'Clé de Sol', symbol: '𝄞' },
  { id: 'bass', label: 'Clé de Fa', symbol: '𝄢' },
  { id: 'grand', label: 'Grand Staff', symbol: '𝄞 𝄢' },
];

export const RANKED_CLEF_LABELS = {
  treble: 'Clé de Sol',
  bass: 'Clé de Fa',
  grand: 'Grand Staff',
};

/** Lecture à vue simple : 60 secondes chrono, mort subite (1 faute = fin), sans armure, lignes supp. + altérations. */
export const RANKED_SIGHT_RULES = {
  keySignature: 'C',
  scaleMode: 'major',
  accidentals: true,
  ledgerLines: true,
  mode: 'time_attack',
};

/** Lecture à vue rythmée : 50 BPM, 4/4, blanches / noires / croches, mesures infinies, mort subite (1 faute = fin). */
export const RANKED_RHYTHM_RULES = {
  keySignature: 'C',
  scaleMode: 'major',
  accidentals: true,
  ledgerLines: true,
  bpm: 50,
  timeSignature: '4/4',
  measureCount: Infinity,
  selectedDurations: ['h', 'q', '8'],
};

export function isRankedConfig(config) {
  return config?.sessionType === 'ranked';
}

/** Retourne la configuration effective de la Lecture à vue simple (règles classées appliquées si besoin). */
export function applySightRankedRules(config) {
  return isRankedConfig(config) ? { ...config, ...RANKED_SIGHT_RULES } : config;
}

/** Retourne la configuration effective de la Lecture à vue rythmée (règles classées appliquées si besoin). */
export function applyRhythmRankedRules(config) {
  return isRankedConfig(config)
    ? { ...config, ...RANKED_RHYTHM_RULES, selectedDurations: [...RANKED_RHYTHM_RULES.selectedDurations] }
    : config;
}

/**
 * Score classé de la Lecture à vue simple : nombre de notes trouvées avant la fin des 60s
 * ou avant la première faute (mort subite).
 */
export function computeSightRankedScore(notesHit, notesMissed = 0) {
  return Math.max(0, notesHit || 0);
}

/**
 * Score classé de la Lecture à vue rythmée : nombre de notes validées en tempo
 * sur mesures infinies avant la première faute (mort subite).
 */
export function computeRhythmRankedScore(notesHit, notesMissed = 0) {
  return Math.max(0, notesHit || 0);
}


