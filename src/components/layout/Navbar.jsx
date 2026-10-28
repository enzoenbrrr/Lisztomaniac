import React from 'react';
import { User, Piano, Settings } from 'lucide-react';
import MetronomeWidget from './MetronomeWidget';
import SoundWidget from './SoundWidget';

/**
 * Barre de navigation minimaliste d'inspiration Apple (macOS / visionOS).
 * Affiche le sélecteur de son (SoundWidget) à côté du métronome, le profil couplé à l'état du périphérique MIDI,
 * et les paramètres épurés (roue crantée seule).
 */
export default function Navbar({
  profile,
  midiState,
  soundfontState,
  audioSettings,
  onChangeAudioSettings,
  onReloadSoundfont,
  onOpenProfile,
  onOpenSettings,
  onNavigateHome,
}) {
  const { connected, supported, inputs = [], selectedInputId } = midiState || {};

  // Libellé et état du périphérique MIDI connecté
  const activeDevice = inputs.find((inp) => inp.id === selectedInputId);
  const midiDeviceLabel = !supported
    ? 'Non supporté'
    : connected
      ? (inputs.length > 1 && selectedInputId === 'all')
        ? `${inputs.length} claviers`
        : (activeDevice?.name || inputs[0]?.name || 'Connecté')
      : 'Non détecté';

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav className="glass-panel mx-auto max-w-5xl rounded-2xl px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between gap-3">
        {/* Actions gauche : Logo + Choix du son + Métronome */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Identité Lisztomaniac */}
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center text-left group focus:outline-none shrink-0 p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
            title="Accueil Lisztomaniac"
          >
            <img
              src={`${import.meta.env.BASE_URL}icon.svg`}
              alt="Lisztomaniac"
              width="20"
              height="20"
              className="w-5 h-5 object-contain group-hover:scale-105 transition-transform"
            />
          </button>

          {/* 1. Menu déroulant de sélection du son piano */}
          <SoundWidget
            soundfontState={soundfontState}
            audioSettings={audioSettings}
            onChangeAudioSettings={onChangeAudioSettings}
            onReloadSoundfont={onReloadSoundfont}
          />

          {/* 2. Métronome global */}
          <MetronomeWidget />
        </div>

        {/* Actions droite : Profil / MIDI + Paramètres */}
        <div className="flex items-center gap-2">
          {/* 3. Profil utilisateur couplé au statut du périphérique MIDI */}
          <button
            type="button"
            onClick={onOpenProfile}
            title={
              !supported
                ? 'Web MIDI non supporté par ce navigateur'
                : connected
                  ? `Clavier MIDI détecté : ${midiDeviceLabel}`
                  : 'Aucun clavier MIDI détecté'
            }
            className="glass-pill h-8 rounded-full px-2.5 sm:px-3.5 flex items-center gap-2 shrink-0"
          >
            <User className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
            <span className="text-xs font-medium text-white max-w-[85px] sm:max-w-[120px] truncate hidden xs:inline">
              {profile.username}
            </span>
            <span className="flex items-center gap-1.5 pl-2 border-l border-white/10 shrink-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${!supported
                  ? 'bg-rose-500'
                  : connected
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]'
                    : 'bg-zinc-500'
                  }`}
              />
              <Piano
                className={`w-3.5 h-3.5 shrink-0 ${!supported
                  ? 'text-rose-400'
                  : connected
                    ? 'text-emerald-400'
                    : 'text-zinc-500'
                  }`}
              />
            </span>
          </button>

          {/* 4. Bouton Paramètres (roue crantée seule) */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Paramètres (Clavier MIDI, Son & Thème)"
            aria-label="Paramètres"
            className="glass-pill w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white shrink-0 relative"
          >
            <Settings className="w-4 h-4 text-zinc-300" />
          </button>
        </div>
      </nav>
    </header>
  );
}
