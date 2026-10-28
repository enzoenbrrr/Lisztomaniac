import React, { useLayoutEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Accidental,
  TickContext,
  ModifierContext,
} from 'vexflow';
import { Volume2 } from 'lucide-react';

// Dimensions assurant que la clé de sol (qui descend sous la 5e ligne)
// et les éventuelles lignes supplémentaires soient 100% visibles sans rognage.
const SVG_WIDTH = 180;
const SVG_HEIGHT = 125;
const STAVE_WIDTH = 160;
const STAVE_X = (SVG_WIDTH - STAVE_WIDTH) / 2;
const STAVE_Y = 5;

export default function FirstNotePreview({
  clef = 'treble',
  keySignature = 'C',
  firstNote,
  onPlayFirstNote,
  isPlaying = false,
}) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !firstNote) return;

    container.innerHTML = '';

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(SVG_WIDTH, SVG_HEIGHT);
    const context = renderer.getContext();

    const staveStroke = 'rgba(255, 255, 255, 0.45)';
    context.setFillStyle('#f4f4f5');
    context.setStrokeStyle(staveStroke);
    context.setLineWidth(1.3);

    const stave = new Stave(STAVE_X, STAVE_Y, STAVE_WIDTH);
    stave.addClef(clef);
    if (keySignature && keySignature !== 'C') {
      stave.addKeySignature(keySignature);
    }
    stave.setContext(context).draw();

    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.style.overflow = 'visible';
    }

    // Positionnement de la note centré dans l'espace disponible après la clé/armure
    const noteAreaStartX = stave.getNoteStartX();
    const noteAreaEndX = stave.getNoteEndX() - 14;
    const targetX = (noteAreaStartX + noteAreaEndX) / 2;

    const staveNote = new StaveNote({
      clef,
      keys: [firstNote.vexflowKey || 'g/4'],
      duration: 'q',
      auto_stem: true,
    });

    if (firstNote.accidentalSymbol) {
      staveNote.addModifier(new Accidental(firstNote.accidentalSymbol), 0);
    }

    const noteColor = '#34d399';
    staveNote.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
    staveNote.setLedgerLineStyle({
      fillStyle: noteColor,
      strokeStyle: noteColor,
      lineWidth: 1.8,
    });

    staveNote.setStave(stave);
    staveNote.setContext(context);

    if (staveNote.getModifiers().length > 0) {
      staveNote.addToModifierContext(new ModifierContext());
    }

    const tickContext = new TickContext();
    tickContext.addTickable(staveNote).preFormat().setX(0);

    const headBeginX = staveNote.getNoteHeadBeginX();
    const headEndX = staveNote.getNoteHeadEndX();
    const initialCenterX = (headBeginX + headEndX) / 2;
    tickContext.setX(targetX - initialCenterX);

    staveNote.draw();
  }, [clef, keySignature, firstNote]);

  if (!firstNote) return null;

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 flex flex-col items-center justify-center text-center mx-auto max-w-sm sm:max-w-md border-emerald-500/20 shadow-lg shadow-black/20 space-y-1">
      <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
        1ʳᵉ Note repère
      </div>

      <div
        ref={containerRef}
        className="w-[180px] h-[125px] flex items-center justify-center mx-auto overflow-visible"
      />

      <div className="flex items-center justify-center gap-3 pt-0.5">
        <span className="font-display text-base font-bold text-white tracking-wide">
          {firstNote.nameFr}
        </span>

        <button
          type="button"
          onClick={onPlayFirstNote}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            isPlaying
              ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30 scale-105'
              : 'glass-button text-zinc-200 hover:text-white hover:border-emerald-500/40'
          }`}
          title="Écouter la note de départ"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{isPlaying ? 'Lecture…' : 'Écouter'}</span>
        </button>
      </div>
    </div>
  );
}
