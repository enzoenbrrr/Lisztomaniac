import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Background from './components/layout/Background';
import Navbar from './components/layout/Navbar';
import MainMenu from './components/menu/MainMenu';
// Vues et modales volumineuses chargées à la demande (Code-Splitting / Lazy Loading)
const CoursesView = lazy(() => import('./components/menu/CoursesView'));
const ProfileModal = lazy(() => import('./components/menu/ProfileModal'));
const SettingsModal = lazy(() => import('./components/menu/SettingsModal'));
const SightReadingSetup = lazy(() => import('./components/menu/SightReadingSetup'));
const RhythmSightReadingSetup = lazy(() => import('./components/menu/RhythmSightReadingSetup'));
const NoteDictationSetup = lazy(() => import('./components/menu/NoteDictationSetup'));
const IntervalTrainingSetup = lazy(() => import('./components/menu/IntervalTrainingSetup'));
const SightReadingExercise = lazy(() => import('./components/exercises/SightReading/SightReadingExercise'));
const RhythmSightReadingExercise = lazy(() => import('./components/exercises/RhythmSightReading/RhythmSightReadingExercise'));
const NoteDictationExercise = lazy(() => import('./components/exercises/NoteDictation/NoteDictationExercise'));
const IntervalTrainingExercise = lazy(() => import('./components/exercises/IntervalTraining/IntervalTrainingExercise'));

function ViewSuspenseLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-emerald-400 animate-spin" />
      <span className="text-xs font-medium text-zinc-400">Chargement…</span>
    </div>
  );
}
import { useMidi } from './hooks/useMidi';
import { audioService } from './services/AudioService';
import {
  loadUserProfile,
  updateUsername,
  recordGameSession,
  recordIntervalGameSession,
  resetUserStats,
  loadExerciseConfigs,
  saveExerciseConfig,
  loadTheme,
  saveTheme,
  loadCustomBg,
  saveCustomBg,
  loadAudioSettings,
  saveAudioSettings,
} from './utils/storage';
import {
  detectImageBrightness,
} from './utils/colorExtractor';

/**
 * Composant racine Single Page Application (SPA).
 * Gère la navigation fluide entre :
 * - 'menu'         : Menu Principal
 * - 'setup'        : Paramétrage Lecture à Vue classique
 * - 'game'         : Exercice Lecture à Vue classique
 * - 'rhythm-setup' : Paramétrage Lecture à Vue avec Rythme
 * - 'rhythm-game'  : Exercice Lecture à Vue avec Rythme (Grand Staff + Métronome)
 * - 'dictation-setup' : Paramétrage Dictée de notes
 * - 'dictation-game'  : Exercice Dictée de notes
 * - 'interval-setup'  : Paramétrage L'Oreille Harmonique (Intervalles)
 * - 'interval-game'   : Exercice L'Oreille Harmonique (Intervalles)
 * - 'courses'         : Bibliothèque de cours PDF
 */
export default function App() {
  const [profile, setProfile] = useState(() => loadUserProfile());
  const [currentView, setCurrentView] = useState('menu');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(() => loadTheme());
  const [customBg, setCustomBg] = useState(() => loadCustomBg());
  const [concertTone, setConcertTone] = useState('dark');

  // Paramètres audio & état du SoundFont DarkCFX
  const [audioSettings, setAudioSettings] = useState(() => loadAudioSettings());
  const [soundfontState, setSoundfontState] = useState(() => audioService.getSoundFontState());

  const [exerciseConfig, setExerciseConfig] = useState(
    () => loadExerciseConfigs().sightReading
  );

  const [rhythmConfig, setRhythmConfig] = useState(
    () => loadExerciseConfigs().rhythmSightReading
  );

  const [dictationConfig, setDictationConfig] = useState(
    () => loadExerciseConfigs().noteDictation
  );

  const [intervalsConfig, setIntervalsConfig] = useState(
    () => loadExerciseConfigs().intervals
  );

  // Permet de jouer librement de la musique au clavier MIDI sur le menu principal (avec support vélocité et pédale sustain)
  const handleMidiNoteOn = useCallback(
    (noteInfo) => {
      if (currentView === 'menu') {
        if (audioSettings.soundfont === 'DarkCFX' && soundfontState?.status === 'idle') {
          audioService.initSoundFont('DarkCFX');
        }
        audioService.noteOn(noteInfo.midi, noteInfo.velocity || 80);
      }
    },
    [currentView, audioSettings.soundfont, soundfontState?.status]
  );

  const handleMidiNoteOff = useCallback(
    (noteInfo) => {
      if (currentView === 'menu') {
        audioService.noteOff(noteInfo.midi);
      }
    },
    [currentView]
  );

  const handleMidiControlChange = useCallback(
    (ccInfo) => {
      if (currentView === 'menu') {
        audioService.controlChange(ccInfo.controller, ccInfo.value);
      }
    },
    [currentView]
  );

  // Connexion au gestionnaire MIDI global
  const midiState = useMidi({
    onNoteOn: handleMidiNoteOn,
    onNoteOff: handleMidiNoteOff,
    onControlChange: handleMidiControlChange,
  });

  // Gestion de la navigation dans l'historique natif du navigateur (Bouton Précédent / Back natif)
  useEffect(() => {
    if (!window.history.state || !window.history.state.view) {
      window.history.replaceState({ view: 'menu', modal: null }, '');
    }

    const handlePopState = (event) => {
      const state = event.state;
      if (!state) {
        setCurrentView('menu');
        setIsSettingsOpen(false);
        setIsProfileOpen(false);
        return;
      }

      // Restauration ou fermeture des modales selon l'état d'historique
      if (state.modal === 'settings') {
        setIsSettingsOpen(true);
        setIsProfileOpen(false);
      } else if (state.modal === 'profile') {
        setIsProfileOpen(true);
        setIsSettingsOpen(false);
      } else {
        setIsSettingsOpen(false);
        setIsProfileOpen(false);
      }

      // Navigation vers la vue correspondante
      if (state.view) {
        setCurrentView(state.view);
      } else {
        setCurrentView('menu');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Initialisation et chargement immédiat du SoundFont DarkCFX dès le début de la page
  useEffect(() => {
    // S'abonner aux changements d'état du SoundFont (pourcentage dans le header & settings)
    const unsubscribe = audioService.onSoundFontStateChange((state) => {
      setSoundfontState(state);
    });

    // Chargement immédiat dès le chargement de l'application
    if (audioSettings.soundfont === 'DarkCFX') {
      audioService.initSoundFont('DarkCFX');
    }

    return () => {
      unsubscribe();
    };
  }, [audioSettings.soundfont]);

  // Garantit que le haut de la page est visible et coupe les notes résiduelles lors d'un changement de vue
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    audioService.stopAll();
    audioService.controlChange(64, 0);
  }, [currentView]);

  const handleSelectTheme = useCallback((nextTheme) => {
    const saved = saveTheme(nextTheme);
    setTheme(saved);
  }, []);

  const handleChangeCustomBg = useCallback((nextBg) => {
    const saved = saveCustomBg(nextBg);
    setCustomBg(saved);
  }, []);

  const handleChangeAudioSettings = useCallback((diff) => {
    const updated = saveAudioSettings(diff);
    if (updated) {
      setAudioSettings(updated);
      if (diff.polyphony !== undefined) {
        audioService.setPolyphony(diff.polyphony);
      }
      if (diff.soundfont !== undefined) {
        audioService.setSoundfontChoice(diff.soundfont);
      }
    }
  }, []);

  const handleReloadSoundfont = useCallback(() => {
    audioService.initSoundFont('DarkCFX');
  }, []);

  // Détecte automatiquement si l'image de fond est claire ou sombre pour adapter l'interface
  useEffect(() => {
    // Si ce n'est pas le thème concert et qu'il n'y a pas d'image personnalisée,
    // on ne gaspille pas de bande passante et on reste sur le ton sombre par défaut
    if (theme !== 'concert' && !customBg) {
      setConcertTone('dark');
      return;
    }
    let cancelled = false;
    const effectiveImg = customBg || `${import.meta.env.BASE_URL}bg-concert.webp`;
    detectImageBrightness(effectiveImg).then((tone) => {
      if (!cancelled) {
        setConcertTone(tone);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [theme, customBg]);

  const handleUpdateUsername = useCallback((newName) => {
    const updated = updateUsername(newName);
    setProfile(updated);
  }, []);

  const handleResetStats = useCallback(() => {
    const updated = resetUserStats();
    setProfile(updated);
  }, []);

  const handleSessionComplete = useCallback((sessionStats) => {
    const { profile: updatedProfile, isNewRecord } = recordGameSession(sessionStats);
    setProfile(updatedProfile);
    return { isNewRecord };
  }, []);

  // Gestion des modales avec historique natif
  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
    setIsProfileOpen(false);
    window.history.pushState({ view: currentView, modal: 'settings' }, '');
  }, [currentView]);

  const handleCloseSettings = useCallback(() => {
    if (window.history.state?.modal === 'settings') {
      window.history.back();
    } else {
      setIsSettingsOpen(false);
    }
  }, []);

  const handleOpenProfile = useCallback(() => {
    setIsProfileOpen(true);
    setIsSettingsOpen(false);
    window.history.pushState({ view: currentView, modal: 'profile' }, '');
  }, [currentView]);

  const handleCloseProfile = useCallback(() => {
    if (window.history.state?.modal === 'profile') {
      window.history.back();
    } else {
      setIsProfileOpen(false);
    }
  }, []);

  // Navigation vers le menu principal
  const handleBackToMenu = useCallback(() => {
    setIsSettingsOpen(false);
    setIsProfileOpen(false);
    if (window.history.state && window.history.state.view && window.history.state.view !== 'menu') {
      window.history.back();
    } else {
      setCurrentView('menu');
      window.history.replaceState({ view: 'menu', modal: null }, '');
    }
  }, []);

  // Navigation vers la page de configuration depuis un jeu
  const handleBackToSetup = useCallback((setupView) => {
    setCurrentView(setupView);
    window.history.replaceState({ view: setupView, modal: null }, '');
  }, []);

  const handleSelectExercise = (exerciseId) => {
    let nextView = 'setup';
    if (exerciseId === 'sight-reading') {
      nextView = 'setup';
    } else if (exerciseId === 'rhythm-sight-reading') {
      nextView = 'rhythm-setup';
    } else if (exerciseId === 'note-dictation') {
      nextView = 'dictation-setup';
    } else if (exerciseId === 'interval-training') {
      nextView = 'interval-setup';
    } else if (exerciseId === 'courses') {
      nextView = 'courses';
    }
    setCurrentView(nextView);
    window.history.pushState({ view: nextView, modal: null }, '');
  };

  const handleUpdateSightConfig = useCallback((nextConfig) => {
    setExerciseConfig(nextConfig);
    saveExerciseConfig('sightReading', nextConfig);
  }, []);

  const handleUpdateRhythmConfig = useCallback((nextConfig) => {
    setRhythmConfig(nextConfig);
    saveExerciseConfig('rhythmSightReading', nextConfig);
  }, []);

  const handleUpdateDictationConfig = useCallback((nextConfig) => {
    setDictationConfig(nextConfig);
    saveExerciseConfig('noteDictation', nextConfig);
  }, []);

  const handleUpdateIntervalsConfig = useCallback((nextConfig) => {
    setIntervalsConfig(nextConfig);
    saveExerciseConfig('intervals', nextConfig);
  }, []);

  const handleIntervalSessionComplete = useCallback((sessionData) => {
    const { profile: updatedProfile, isNewRecord } = recordIntervalGameSession(sessionData);
    setProfile(updatedProfile);
    return { isNewRecord };
  }, []);

  const handleStartGame = (config) => {
    setExerciseConfig(config);
    saveExerciseConfig('sightReading', config);
    setCurrentView('game');
    // Le jeu remplace le setup dans l'historique : le retour arrière natif ramène directement au menu !
    window.history.replaceState({ view: 'game', modal: null }, '');
  };

  const handleStartRhythmGame = (config) => {
    setRhythmConfig(config);
    saveExerciseConfig('rhythmSightReading', config);
    setCurrentView('rhythm-game');
    window.history.replaceState({ view: 'rhythm-game', modal: null }, '');
  };

  const handleStartDictationGame = (config) => {
    setDictationConfig(config);
    saveExerciseConfig('noteDictation', config);
    setCurrentView('dictation-game');
    window.history.replaceState({ view: 'dictation-game', modal: null }, '');
  };

  const handleStartIntervalsGame = (config) => {
    setIntervalsConfig(config);
    saveExerciseConfig('intervals', config);
    setCurrentView('interval-game');
    window.history.replaceState({ view: 'interval-game', modal: null }, '');
  };

  return (
    <div
      data-theme={theme}
      data-concert-tone={concertTone}
      className="min-h-dvh flex flex-col relative text-zinc-100"
    >
      <Background
        theme={theme}
        customBg={customBg}
        concertTone={concertTone}
        interactive={
          currentView !== 'game' &&
          currentView !== 'rhythm-game' &&
          currentView !== 'dictation-game'
        }
        lastPlayedNote={midiState.lastPlayedNote}
      />

      <Navbar
        profile={profile}
        midiState={midiState}
        soundfontState={soundfontState}
        audioSettings={audioSettings}
        onChangeAudioSettings={handleChangeAudioSettings}
        onReloadSoundfont={handleReloadSoundfont}
        currentView={currentView}
        onOpenProfile={handleOpenProfile}
        onOpenSettings={handleOpenSettings}
        onNavigateHome={handleBackToMenu}
      />

      <div className="flex-1">
        <Suspense fallback={<ViewSuspenseLoader />}>
          {currentView === 'menu' && (
            <MainMenu
              profile={profile}
              onSelectExercise={handleSelectExercise}
              onOpenProfile={handleOpenProfile}
            />
          )}

          {currentView === 'setup' && (
            <SightReadingSetup
              initialConfig={exerciseConfig}
              rankedRecords={profile.rankedRecords?.sight}
              onChangeConfig={handleUpdateSightConfig}
              onStartGame={handleStartGame}
              onBack={handleBackToMenu}
            />
          )}

          {currentView === 'game' && (
            <SightReadingExercise
              config={exerciseConfig}
              profile={profile}
              onSessionComplete={handleSessionComplete}
              onBackToSetup={() => handleBackToSetup('setup')}
              onBackToMenu={handleBackToMenu}
            />
          )}

          {currentView === 'rhythm-setup' && (
            <RhythmSightReadingSetup
              initialConfig={rhythmConfig}
              rankedRecords={profile.rankedRecords?.rhythm}
              onChangeConfig={handleUpdateRhythmConfig}
              onStartGame={handleStartRhythmGame}
              onBack={handleBackToMenu}
            />
          )}

          {currentView === 'rhythm-game' && (
            <RhythmSightReadingExercise
              config={rhythmConfig}
              profile={profile}
              onSessionComplete={handleSessionComplete}
              onBackToSetup={() => handleBackToSetup('rhythm-setup')}
              onBackToMenu={handleBackToMenu}
            />
          )}

          {currentView === 'dictation-setup' && (
            <NoteDictationSetup
              initialConfig={dictationConfig}
              onChangeConfig={handleUpdateDictationConfig}
              onStartGame={handleStartDictationGame}
              onBack={handleBackToMenu}
            />
          )}

          {currentView === 'courses' && (
            <CoursesView onBack={handleBackToMenu} />
          )}

          {currentView === 'dictation-game' && (
            <NoteDictationExercise
              config={dictationConfig}
              onSessionComplete={handleSessionComplete}
              onBackToSetup={() => handleBackToSetup('dictation-setup')}
              onBackToMenu={handleBackToMenu}
            />
          )}

          {currentView === 'interval-setup' && (
            <IntervalTrainingSetup
              initialConfig={intervalsConfig}
              rankedRecord={profile.stats?.bestIntervalRankedScore || 0}
              onChangeConfig={handleUpdateIntervalsConfig}
              onStartGame={handleStartIntervalsGame}
              onBack={handleBackToMenu}
            />
          )}

          {currentView === 'interval-game' && (
            <IntervalTrainingExercise
              config={intervalsConfig}
              onSessionComplete={handleIntervalSessionComplete}
              onBackToSetup={() => handleBackToSetup('interval-setup')}
              onBackToMenu={handleBackToMenu}
            />
          )}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        {isProfileOpen && (
          <ProfileModal
            profile={profile}
            onClose={handleCloseProfile}
            onUpdateUsername={handleUpdateUsername}
            onResetStats={handleResetStats}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal
            theme={theme}
            onSelectTheme={handleSelectTheme}
            customBg={customBg}
            onChangeCustomBg={handleChangeCustomBg}
            concertTone={concertTone}
            midiState={midiState}
            audioSettings={audioSettings}
            onChangeAudioSettings={handleChangeAudioSettings}
            soundfontState={soundfontState}
            onReloadSoundfont={handleReloadSoundfont}
            onClose={handleCloseSettings}
          />
        )}
      </Suspense>
    </div>
  );
}
