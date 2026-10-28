/**
 * Gestionnaire de persistance locale via Cookies (et miroir LocalStorage)
 * Stocke le pseudo de l'utilisateur, les meilleurs scores par configuration
 * et les statistiques globales.
 */

const COOKIE_NAME = 'lisztomaniac_profile_v1';
const CONFIGS_COOKIE_NAME = 'lisztomaniac_configs_v1';
const THEME_COOKIE_NAME = 'lisztomaniac_theme_v1';
const CUSTOM_BG_STORAGE_KEY = 'lisztomaniac_custom_bg_v1';
const COOKIE_EXPIRY_DAYS = 365;

export const DEFAULT_SIGHT_CONFIG = {
  sessionType: 'ranked', // 'ranked' (Classé) | 'practice' (Entraînement)
  clef: 'treble',
  keySignature: 'C',
  scaleMode: 'major',
  accidentals: false,
  ledgerLines: false,
  mode: 'time_attack',
};

export const DEFAULT_RHYTHM_CONFIG = {
  sessionType: 'ranked', // 'ranked' (Classé) | 'practice' (Entraînement)
  clef: 'grand',
  keySignature: 'C',
  scaleMode: 'major',
  bpm: 80,
  timeSignature: '4/4',
  measureCount: 8,
  selectedDurations: ['q', '8'],
  accidentals: false,
  ledgerLines: false,
};

export const DEFAULT_DICTATION_CONFIG = {
  clef: 'treble',
  measureCount: 4,
  selectedDurations: ['q', '8'],
  selectedTimeSignatures: ['2/4', '3/4', '4/4'],
  includeRests: false,
  melodyMode: 'scale', // 'scale' | 'random'
  keySignature: 'C',
  maxInterval: 4,      // Quarte par défaut
  bpm: 72,
};

export const DEFAULT_INTERVALS_CONFIG = {
  mode: 'ranked',           // 'ranked' | 'practice'
  roundCount: 10,           // 5 à 20 manches (pour mode entraînement)
  maxInterval: 12,          // 4 (Tierce M), 7 (Quinte J), 12 (Octave)
  playbackMode: 'harmonic', // 'harmonic' (en même temps) | 'melodic' (l'une après l'autre) | 'mixed'
  allowReplay: true,        // true en entraînement, forcé false en ranked
};

const DEFAULT_PROFILE = {
  username: 'Pianiste',
  createdAt: new Date().toISOString(),
  stats: {
    gamesPlayed: 0,
    totalNotesHit: 0,
    totalNotesMissed: 0,
    bestTimeAttackScore: 0,
    bestNps: 0,
    bestAccuracy: 0,
    bestIntervalRankedScore: 0, // Sur 15 en mode Ranked
  },
  // Records du Mode Classé par exercice et par clé (Sol / Fa / Grand Staff)
  //  - sight  : score = nombre de notes trouvées en 60 s avant la 1ère faute (mort subite)
  //  - rhythm : score = nombre de notes validées en tempo sur mesures infinies avant la 1ère faute (mort subite)
  rankedRecords: {
    sight: {
      treble: { score: 0, nps: 0, accuracy: 0, perfect: 0 },
      bass: { score: 0, nps: 0, accuracy: 0, perfect: 0 },
      grand: { score: 0, nps: 0, accuracy: 0, perfect: 0 },
    },
    rhythm: {
      treble: { score: 0, nps: 0, accuracy: 0, perfect: 0 },
      bass: { score: 0, nps: 0, accuracy: 0, perfect: 0 },
      grand: { score: 0, nps: 0, accuracy: 0, perfect: 0 },
    },
  },
  recentGames: [],
  recentIntervalGames: [],
};

const RANKED_CLEF_KEYS = ['treble', 'bass', 'grand'];
const RANKED_EXERCISES = ['sight', 'rhythm'];

/**
 * Fusionne les records classés sauvegardés avec la structure par défaut.
 */
function mergeRankedRecords(saved) {
  const merged = structuredClone(DEFAULT_PROFILE.rankedRecords);
  for (const exercise of RANKED_EXERCISES) {
    for (const clef of RANKED_CLEF_KEYS) {
      merged[exercise][clef] = {
        ...merged[exercise][clef],
        ...(saved?.[exercise]?.[clef] || {}),
      };
    }
  }
  return merged;
}

/**
 * Lit un cookie par son nom.
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const part of cookies) {
    const [key, ...valParts] = part.split('=');
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(valParts.join('='));
    }
  }
  return null;
}

/**
 * Écrit un cookie encodé en URI avec une durée de vie en jours.
 */
function setCookie(name, value, days = COOKIE_EXPIRY_DAYS) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Charge le profil utilisateur depuis les Cookies (avec fallback LocalStorage).
 * @returns {typeof DEFAULT_PROFILE}
 */
export function loadUserProfile() {
  try {
    const rawCookie = getCookie(COOKIE_NAME);
    const rawLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(COOKIE_NAME) : null;
    const rawData = rawCookie || rawLocal;

    if (!rawData) {
      saveUserProfile(DEFAULT_PROFILE);
      return structuredClone(DEFAULT_PROFILE);
    }

    const parsed = JSON.parse(rawData);
    const isLegacyProfile = !parsed.rankedRecords;
    const stats = { ...DEFAULT_PROFILE.stats, ...(parsed.stats || {}) };

    // Migration : les anciens records (sans règles imposées) ne sont pas comparables au Mode Classé
    if (isLegacyProfile) {
      stats.bestTimeAttackScore = 0;
      stats.bestNps = 0;
    }

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      stats,
      rankedRecords: mergeRankedRecords(parsed.rankedRecords),
      recentGames: Array.isArray(parsed.recentGames) ? parsed.recentGames.slice(0, 8) : [],
      recentIntervalGames: Array.isArray(parsed.recentIntervalGames) ? parsed.recentIntervalGames.slice(0, 8) : [],
    };
  } catch (err) {
    console.warn('Erreur lors de la lecture du profil cookie, réinitialisation :', err);
    return structuredClone(DEFAULT_PROFILE);
  }
}

/**
 * Sauvegarde le profil utilisateur dans les Cookies et LocalStorage.
 * @param {object} profile
 */
export function saveUserProfile(profile) {
  try {
    const serialized = JSON.stringify(profile);
    setCookie(COOKIE_NAME, serialized, COOKIE_EXPIRY_DAYS);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COOKIE_NAME, serialized);
    }
  } catch (err) {
    console.error('Impossible de sauvegarder le profil utilisateur :', err);
  }
  return profile;
}

/**
 * Met à jour uniquement le pseudo de l'utilisateur.
 * @param {string} newUsername
 */
export function updateUsername(newUsername) {
  const cleanName = (newUsername || '').trim().slice(0, 24) || 'Pianiste';
  const profile = loadUserProfile();
  const updated = { ...profile, username: cleanName };
  return saveUserProfile(updated);
}

/**
 * Enregistre le résultat d'une session et vérifie si un record classé est battu.
 * Les records sont sauvegardés UNIQUEMENT pour les sessions classées (sessionType === 'ranked')
 * des exercices de lecture à vue ('sight' et 'rhythm'), séparément pour chaque clé.
 *
 * @param {object} result
 * @param {'sight'|'rhythm'|'dictation'} [result.exercise] - Exercice joué
 * @param {'ranked'|'practice'} [result.sessionType] - Type de session
 * @param {number} result.notesHit - Nombre de notes trouvées
 * @param {number} result.notesMissed - Nombre d'erreurs
 * @param {number} result.nps - Notes par seconde
 * @param {number} result.accuracy - Précision en %
 * @param {number} [result.score] - Score classé calculé par l'exercice
 * @param {number} [result.perfectCount] - Notes parfaitement dans le tempo (rythme)
 * @param {string} result.clef - 'treble' | 'bass' | 'grand'
 * @param {string} result.mode - 'time_attack' | 'free' | 'rhythm' | 'dictation'
 * @returns {{ profile: object, isNewRecord: boolean }}
 */
export function recordGameSession(result) {
  const profile = loadUserProfile();
  const {
    exercise = 'sight',
    sessionType = 'practice',
    notesHit = 0,
    notesMissed = 0,
    nps = 0,
    accuracy = 0,
    score = 0,
    perfectCount = 0,
    clef = 'treble',
    mode = 'time_attack',
  } = result;

  const isRanked =
    sessionType === 'ranked' && RANKED_EXERCISES.includes(exercise) && RANKED_CLEF_KEYS.includes(clef);

  const previousRecord = profile.rankedRecords?.[exercise]?.[clef] || {
    score: 0,
    nps: 0,
    accuracy: 0,
    perfect: 0,
  };

  const isNewRecord =
    isRanked &&
    score > 0 &&
    (score > previousRecord.score ||
      (score === previousRecord.score && perfectCount > (previousRecord.perfect || 0)));

  let updatedRankedRecords = profile.rankedRecords;
  if (isNewRecord) {
    updatedRankedRecords = {
      ...profile.rankedRecords,
      [exercise]: {
        ...profile.rankedRecords[exercise],
        [clef]: { score, nps, accuracy, perfect: perfectCount },
      },
    };
  }

  const bestSightScore = Math.max(
    0,
    ...RANKED_CLEF_KEYS.map((key) => updatedRankedRecords?.sight?.[key]?.score || 0)
  );

  const updatedStats = {
    ...profile.stats,
    gamesPlayed: (profile.stats.gamesPlayed || 0) + 1,
    totalNotesHit: (profile.stats.totalNotesHit || 0) + notesHit,
    totalNotesMissed: (profile.stats.totalNotesMissed || 0) + notesMissed,
    bestTimeAttackScore: bestSightScore,
    bestNps:
      isRanked && exercise === 'sight' && notesHit > 0
        ? Math.max(profile.stats.bestNps || 0, nps)
        : profile.stats.bestNps || 0,
    bestAccuracy:
      notesHit >= 5
        ? Math.max(profile.stats.bestAccuracy || 0, accuracy)
        : profile.stats.bestAccuracy || 0,
  };

  const recentEntry = {
    id: Date.now(),
    date: new Date().toISOString(),
    exercise,
    sessionType,
    clef,
    mode,
    notesHit,
    notesMissed,
    nps,
    accuracy,
    score,
  };

  const updatedProfile = {
    ...profile,
    stats: updatedStats,
    rankedRecords: updatedRankedRecords,
    recentGames: [recentEntry, ...(profile.recentGames || [])].slice(0, 6),
  };

  saveUserProfile(updatedProfile);
  return { profile: updatedProfile, isNewRecord };
}

/**
 * Enregistre le résultat d'une session d'intervalles.
 * Le meilleur score est sauvegardé dans le profil UNIQUEMENT pour le mode classé (Ranked).
 *
 * @param {object} session
 * @param {number} session.score - Nombre d'intervalles corrects
 * @param {number} session.totalRounds - Nombre total de manches (15 en ranked)
 * @param {number} session.accuracy - Précision en %
 * @param {boolean} session.isRanked - Indique si la session s'est jouée en mode Classé
 * @returns {{ profile: object, isNewRecord: boolean }}
 */
export function recordIntervalGameSession(session) {
  const profile = loadUserProfile();
  const { score = 0, totalRounds = 15, accuracy = 0, isRanked = false } = session;

  const previousBest = profile.stats.bestIntervalRankedScore || 0;
  let isNewRecord = false;
  let updatedRankedScore = previousBest;

  if (isRanked && score > previousBest) {
    isNewRecord = true;
    updatedRankedScore = score;
  }

  const recentEntry = {
    id: Date.now(),
    date: new Date().toISOString(),
    score,
    totalRounds,
    accuracy,
    isRanked,
  };

  const updatedProfile = {
    ...profile,
    stats: {
      ...profile.stats,
      gamesPlayed: (profile.stats.gamesPlayed || 0) + 1,
      totalNotesHit: (profile.stats.totalNotesHit || 0) + score,
      totalNotesMissed: (profile.stats.totalNotesMissed || 0) + (totalRounds - score),
      bestIntervalRankedScore: updatedRankedScore,
    },
    recentIntervalGames: [recentEntry, ...(profile.recentIntervalGames || [])].slice(0, 8),
  };

  saveUserProfile(updatedProfile);
  return { profile: updatedProfile, isNewRecord };
}

/**
 * Réinitialise les statistiques tout en conservant le pseudo.
 */
export function resetUserStats() {
  const current = loadUserProfile();
  const reset = {
    ...structuredClone(DEFAULT_PROFILE),
    username: current.username,
  };
  return saveUserProfile(reset);
}

/**
 * Charge les derniers paramètres sauvegardés pour chaque exercice (Cookies + LocalStorage).
 */
export function loadExerciseConfigs() {
  try {
    const rawCookie = getCookie(CONFIGS_COOKIE_NAME);
    const rawLocal =
      typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIGS_COOKIE_NAME) : null;
    const rawData = rawLocal || rawCookie;

    if (!rawData) {
      return {
        sightReading: { ...DEFAULT_SIGHT_CONFIG },
        rhythmSightReading: { ...DEFAULT_RHYTHM_CONFIG },
        noteDictation: { ...DEFAULT_DICTATION_CONFIG },
        intervals: { ...DEFAULT_INTERVALS_CONFIG },
      };
    }

    const parsed = JSON.parse(rawData);
    return {
      sightReading: {
        ...DEFAULT_SIGHT_CONFIG,
        ...(parsed.sightReading || {}),
      },
      rhythmSightReading: {
        ...DEFAULT_RHYTHM_CONFIG,
        ...(parsed.rhythmSightReading || {}),
        selectedDurations:
          Array.isArray(parsed.rhythmSightReading?.selectedDurations) &&
          parsed.rhythmSightReading.selectedDurations.length > 0
            ? parsed.rhythmSightReading.selectedDurations
            : DEFAULT_RHYTHM_CONFIG.selectedDurations,
      },
      noteDictation: {
        ...DEFAULT_DICTATION_CONFIG,
        ...(parsed.noteDictation || {}),
        selectedDurations:
          Array.isArray(parsed.noteDictation?.selectedDurations) &&
          parsed.noteDictation.selectedDurations.length > 0
            ? parsed.noteDictation.selectedDurations
            : DEFAULT_DICTATION_CONFIG.selectedDurations,
        selectedTimeSignatures:
          Array.isArray(parsed.noteDictation?.selectedTimeSignatures) &&
          parsed.noteDictation.selectedTimeSignatures.length > 0
            ? parsed.noteDictation.selectedTimeSignatures
            : DEFAULT_DICTATION_CONFIG.selectedTimeSignatures,
      },
      intervals: {
        ...DEFAULT_INTERVALS_CONFIG,
        ...(parsed.intervals || {}),
      },
    };
  } catch {
    return {
      sightReading: { ...DEFAULT_SIGHT_CONFIG },
      rhythmSightReading: { ...DEFAULT_RHYTHM_CONFIG },
      noteDictation: { ...DEFAULT_DICTATION_CONFIG },
      intervals: { ...DEFAULT_INTERVALS_CONFIG },
    };
  }
}

/**
 * Sauvegarde les paramètres d'un exercice ('sightReading' ou 'rhythmSightReading').
 */
export function saveExerciseConfig(key, config) {
  try {
    const current = loadExerciseConfigs();
    const updated = {
      ...current,
      [key]: config,
    };
    const serialized = JSON.stringify(updated);
    setCookie(CONFIGS_COOKIE_NAME, serialized, COOKIE_EXPIRY_DAYS);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONFIGS_COOKIE_NAME, serialized);
    }
    return updated;
  } catch (err) {
    console.error('Impossible de sauvegarder la configuration :', err);
    return null;
  }
}

/**
 * Charge le thème de l'application ('dark' par défaut, 'light', 'galaxy', ou 'concert').
 */
export function loadTheme() {
  try {
    const rawLocal =
      typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_COOKIE_NAME) : null;
    const rawCookie = getCookie(THEME_COOKIE_NAME);
    const theme = rawLocal || rawCookie;
    if (theme === 'light' || theme === 'galaxy' || theme === 'concert' || theme === 'dark') {
      return theme;
    }
    return 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Sauvegarde le thème de l'application ('dark', 'light', 'galaxy', 'concert').
 */
export function saveTheme(theme) {
  const validTheme = ['dark', 'light', 'galaxy', 'concert'].includes(theme) ? theme : 'dark';
  try {
    setCookie(THEME_COOKIE_NAME, validTheme, COOKIE_EXPIRY_DAYS);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_COOKIE_NAME, validTheme);
    }
  } catch (err) {
    console.error('Impossible de sauvegarder le thème :', err);
  }
  return validTheme;
}

/**
 * Charge l'image de fond personnalisée (URL ou DataURL) pour le thème Concert/Custom.
 * Retourne null si l'image par défaut (public/bg-concert.jpg) est utilisée.
 */
export function loadCustomBg() {
  try {
    const rawLocal =
      typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOM_BG_STORAGE_KEY) : null;
    const rawCookie = getCookie(CUSTOM_BG_STORAGE_KEY);
    return rawLocal || rawCookie || null;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde ou réinitialise (si null/vide) l'image de fond personnalisée.
 */
export function saveCustomBg(imageSrc) {
  try {
    if (!imageSrc) {
      setCookie(CUSTOM_BG_STORAGE_KEY, '', -1);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(CUSTOM_BG_STORAGE_KEY);
      }
      return null;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_BG_STORAGE_KEY, imageSrc);
    }
    if (imageSrc.length < 1800) {
      setCookie(CUSTOM_BG_STORAGE_KEY, imageSrc, COOKIE_EXPIRY_DAYS);
    }
    return imageSrc;
  } catch (err) {
    console.error('Impossible de sauvegarder le fond personnalisé :', err);
    return imageSrc;
  }
}



const AUDIO_SETTINGS_COOKIE_NAME = 'lisztomaniac_audio_v1';

export const DEFAULT_AUDIO_SETTINGS = {
  soundfont: 'DarkCFX', // 'DarkCFX' | 'synth'
  polyphony: 64,        // 16 | 32 | 64 | 128 | 256
};

/**
 * Charge les réglages audio globaux (SoundFont sélectionné et polyphonie).
 */
export function loadAudioSettings() {
  try {
    const rawLocal =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(AUDIO_SETTINGS_COOKIE_NAME)
        : null;
    const rawCookie = getCookie(AUDIO_SETTINGS_COOKIE_NAME);
    const parsed = JSON.parse(rawLocal || rawCookie || '{}');

    return {
      soundfont: parsed.soundfont === 'synth' ? 'synth' : 'DarkCFX',
      polyphony: [16, 32, 64, 128, 256].includes(Number(parsed.polyphony))
        ? Number(parsed.polyphony)
        : 64,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

/**
 * Sauvegarde les réglages audio globaux.
 */
export function saveAudioSettings(settings) {
  try {
    const current = loadAudioSettings();
    const updated = { ...current, ...settings };
    const serialized = JSON.stringify(updated);
    setCookie(AUDIO_SETTINGS_COOKIE_NAME, serialized, COOKIE_EXPIRY_DAYS);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUDIO_SETTINGS_COOKIE_NAME, serialized);
    }
    return updated;
  } catch (err) {
    console.error('Impossible de sauvegarder les paramètres audio :', err);
    return null;
  }
}
