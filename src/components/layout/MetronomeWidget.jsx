import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Square, Minus, Plus, ChevronDown } from 'lucide-react';
import {
  useMetronome,
  MIN_BPM,
  MAX_BPM,
  MIN_BEATS,
  MAX_BEATS,
} from '../../hooks/useMetronome';

const PANEL_WIDTH = 256;
const VIEWPORT_MARGIN = 8;

/**
 * Métronome toujours disponible dans le Header :
 * une LED par temps (4 en 4/4), une seule allumée à chaque battement.
 * Le panneau déroulant règle le tempo (BPM) et le nombre de temps.
 *
 * Le panneau est rendu via un portail (hors de la barre de navigation, qui possède
 * elle-même un `backdrop-filter` : un enfant imbriqué ne pourrait pas flouter le fond de la page),
 * à l'intérieur de la racine `[data-theme]` pour conserver les styles du thème actif.
 */
export default function MetronomeWidget() {
  const { bpm, beats, isRunning, activeBeat, setBpm, setBeats, toggle } = useMetronome();
  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  const updatePanelPosition = () => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const idealLeft = rect.left + rect.width / 2 - PANEL_WIDTH / 2;
    const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN;
    setPanelPos({
      top: rect.bottom + 10,
      left: Math.max(VIEWPORT_MARGIN, Math.min(idealLeft, maxLeft)),
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen]);

  // Ferme le panneau au clic extérieur ou sur Échap
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (e) => {
      const insideWidget = rootRef.current?.contains(e.target);
      const insidePanel = panelRef.current?.contains(e.target);
      if (!insideWidget && !insidePanel) setIsOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const portalTarget =
    (rootRef.current && rootRef.current.closest('[data-theme]')) || document.body;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div className="glass-pill h-8 rounded-full pl-1 pr-1 flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggle}
          title={isRunning ? 'Arrêter le métronome' : 'Lancer le métronome'}
          aria-label={isRunning ? 'Arrêter le métronome' : 'Lancer le métronome'}
          aria-pressed={isRunning}
          className={`no-lift w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${isRunning
            ? 'glass-button-primary'
            : 'bg-white/[0.07] hover:bg-white/[0.14] text-zinc-200 hover:text-white'
            }`}
        >
          {isRunning ? (
            <Square className="w-2.5 h-2.5 fill-current" />
          ) : (
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          )}
        </button>

        {/* LEDs : une par temps */}
        <div
          className="flex items-center gap-1 sm:gap-1.5 justify-center"
          role="img"
          aria-label={`Métronome, ${beats} temps`}
        >
          {Array.from({ length: beats }).map((_, i) => {
            const lit = isRunning && activeBeat === i;
            const isDownbeat = i === 0;
            return (
              <span
                key={i}
                className={`block rounded-full transition-all duration-75 ${isDownbeat ? 'w-2.5 h-2.5' : 'w-2 h-2'
                  } ${lit
                    ? isDownbeat
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]'
                      : 'bg-amber-300 shadow-[0_0_9px_rgba(252,211,77,0.9)]'
                    : 'bg-white/20'
                  }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          title="Régler le métronome"
          className="h-6 pl-2 pr-1.5 rounded-full hover:bg-white/[0.1] flex items-center gap-0.5 text-[11px] font-semibold text-zinc-200 hover:text-white transition-colors"
        >
          <span className="tabular-nums">{bpm}</span>
          <ChevronDown
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top + 16, left: panelPos.left, width: PANEL_WIDTH }}
            className="glass-panel backdrop-blur-2xl fixed rounded-2xl p-4 space-y-4 z-50"
          >
            {/* Tempo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Tempo</span>
                <span className="text-xs text-zinc-300 tabular-nums">{bpm} BPM</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBpm(bpm - 5)}
                  disabled={bpm <= MIN_BPM}
                  aria-label="Diminuer le tempo de 5 BPM"
                  className="glass-button w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  step={5}
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  aria-label="Tempo en BPM"
                  className="flex-1 min-w-0 accent-white"
                />
                <button
                  type="button"
                  onClick={() => setBpm(bpm + 5)}
                  disabled={bpm >= MAX_BPM}
                  aria-label="Augmenter le tempo de 5 BPM"
                  className="glass-button w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Nombre de temps par mesure */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Temps par mesure</span>
                <span className="text-xs text-zinc-300 tabular-nums">{beats}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBeats(beats - 1)}
                  disabled={beats <= MIN_BEATS}
                  aria-label="Moins de temps"
                  className="glass-button w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {[2, 3, 4, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBeats(n)}
                      className={`py-1.5 rounded-lg text-xs font-display font-semibold transition-all ${beats === n
                        ? 'apple-segment-active'
                        : 'text-zinc-400 hover:text-white bg-white/[0.04]'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setBeats(beats + 1)}
                  disabled={beats >= MAX_BEATS}
                  aria-label="Plus de temps"
                  className="glass-button w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
}

