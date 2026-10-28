import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Check, AlertCircle } from 'lucide-react';

const PANEL_WIDTH = 268;
const VIEWPORT_MARGIN = 8;

/**
 * Widget de sélection et réglage rapide du son piano dans le Header.
 * Permet de basculer instantanément entre DarkCFX (.sf3) et la Synthèse Web Audio,
 * ainsi que d'ajuster la polyphonie avec un menu déroulant flottant calqué sur le métronome.
 */
export default function SoundWidget({
  soundfontState,
  audioSettings,
  onChangeAudioSettings,
  onReloadSoundfont,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  const isLoading = soundfontState?.status === 'loading';
  const isError = soundfontState?.status === 'error';
  const isReady = soundfontState?.status === 'ready';
  const progress = Math.min(100, Math.max(0, soundfontState?.progress || 0));

  const currentChoice = audioSettings?.soundfont || 'DarkCFX';
  const currentPolyphony = audioSettings?.polyphony || 64;
  const soundName = currentChoice === 'synth' ? 'Web Audio' : 'DarkCFX';

  const updatePanelPosition = () => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const idealLeft = rect.left + rect.width / 2 - PANEL_WIDTH / 2;
    const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN;
    setPanelPos({
      top: rect.bottom + 8,
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
      {/* Bouton pilule dans le Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        title="Changer la banque sonore du piano"
        className={`glass-pill h-8 rounded-full border px-2.5 sm:px-3 flex items-center gap-1.5 transition-all cursor-pointer ${isLoading
            ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-300'
            : isError
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              : isOpen
                ? 'bg-white/[0.12] border-white/20 text-white'
                : 'text-zinc-200 hover:text-white'
          }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300 shrink-0" />
            <span className="text-xs font-medium font-mono text-amber-300">
              <span className="hidden xs:inline font-sans mr-1">{soundName}</span>
              {progress}%
            </span>
          </>
        ) : isError ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-xs font-medium hidden xs:inline">Erreur son</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] shrink-0" />
            <span className="text-xs font-semibold tracking-tight text-white font-display">
              {soundName}
            </span>
          </>
        )}
        <ChevronDown
          className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {/* Menu déroulant style Metronome / Apple Glassmorphism */}
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top, left: panelPos.left, width: PANEL_WIDTH }}
            className="glass-panel fixed rounded-2xl p-4 space-y-3.5 z-50 animate-fade-in-up"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Rendu sonore
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {progress}%
                </span>
              )}
            </div>

            {/* Options de sons */}
            <div className="space-y-1.5">
              {/* Option DarkCFX */}
              <button
                type="button"
                onClick={() => {
                  onChangeAudioSettings?.({ soundfont: 'DarkCFX' });
                }}
                className={`w-full rounded-xl p-2.5 text-left border transition-all flex items-center justify-between gap-2 cursor-pointer ${currentChoice === 'DarkCFX'
                    ? 'apple-tile-checked shadow-sm'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]'
                  }`}
              >
                <div className="min-w-0">
                  <div className="font-display text-xs font-semibold text-white truncate">
                    DarkCFX
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Yamaha CFX Concert (.sf3)
                  </div>
                  {isReady && currentChoice === 'DarkCFX' && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Prêt en mémoire
                    </div>
                  )}
                  {isLoading && currentChoice === 'DarkCFX' && (
                    <div className="text-[10px] text-amber-300 flex items-center gap-1 mt-0.5">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Chargement ({progress}%)
                    </div>
                  )}
                  {isError && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onReloadSoundfont?.();
                      }}
                      className="text-[10px] text-rose-400 underline hover:text-rose-300 block mt-0.5 cursor-pointer"
                    >
                      Erreur — Réessayer
                    </span>
                  )}
                </div>

                {currentChoice === 'DarkCFX' && (
                  <div className="apple-check-badge w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Option Web Audio */}
              <button
                type="button"
                onClick={() => {
                  onChangeAudioSettings?.({ soundfont: 'synth' });
                }}
                className={`w-full rounded-xl p-2.5 text-left border transition-all flex items-center justify-between gap-2 cursor-pointer ${currentChoice === 'synth'
                    ? 'apple-tile-checked shadow-sm'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]'
                  }`}
              >
                <div className="min-w-0">
                  <div className="font-display text-xs font-semibold text-white truncate">
                    Synthèse Web Audio
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Synthétiseur acoustique léger
                  </div>
                </div>

                {currentChoice === 'synth' && (
                  <div className="apple-check-badge w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>

            {/* Polyphonie */}
            <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-zinc-400">Polyphonie</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[16, 32, 64, 128, 256].map((count) => {
                  const active = currentPolyphony === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onChangeAudioSettings?.({ polyphony: count })}
                      className={`py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${active
                          ? 'bg-white text-zinc-950 border-white shadow-sm'
                          : 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border-white/[0.06]'
                        }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
}

