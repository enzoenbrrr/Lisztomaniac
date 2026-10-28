import React, { useLayoutEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Accidental,
  TickContext,
  ModifierContext,
  Beam,
  Dot,
  BarlineType,
} from 'vexflow';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_WIDTH = 760;
const ROW_HEIGHT = 146;
const START_Y = 28;

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * Visualiseur de partition complète pour la révélation de la dictée :
 * - Affiche toutes les mesures (2, 4, 6 ou 8) réparties sur des portées de 2 mesures par système.
 * - Inclut la clé, l'armure, la signature temporelle révélée, les ligatures, les silences et la double barre finale.
 * - Surligne la mesure actuellement en cours de réécoute (activeMeasureIndex).
 * - Permet de cliquer sur une mesure pour lancer sa réécoute isolée.
 */
export default function DictationScoreViewer({
  clef = 'treble',
  keySignature = 'C',
  timeSignature = '4/4',
  measures = [],
  activeMeasureIndex = null,
  onMeasureClick = null,
}) {
  const containerRef = useRef(null);
  const measureCount = measures.length;
  const numRows = Math.max(1, Math.ceil(measureCount / 2));
  const svgHeight = START_Y + numRows * ROW_HEIGHT + 14;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || measureCount === 0) return;

    container.innerHTML = '';

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(SVG_WIDTH, svgHeight);
    const context = renderer.getContext();

    const staveStroke = 'rgba(255, 255, 255, 0.45)';
    context.setFillStyle('#f4f4f5');
    context.setStrokeStyle(staveStroke);
    context.setLineWidth(1.3);

    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    // Couche de fond pour les surbrillances et numéros de mesure
    const bgLayer = createSvgElement('g', { class: 'vf-score-bg-layer' });
    const overlayLayer = createSvgElement('g', { class: 'vf-score-overlay-layer' });

    for (let m = 0; m < measureCount; m++) {
      const rowIndex = Math.floor(m / 2);
      const colIndex = m % 2;
      const y = START_Y + rowIndex * ROW_HEIGHT;

      // Colonne 0 : X=16, Largeur=374 (pour loger clé/armure/signature)
      // Colonne 1 : X=390, Largeur=354
      const x = colIndex === 0 ? 16 : 390;
      const width = colIndex === 0 ? 374 : 354;

      const stave = new Stave(x, y, width);

      if (m === 0) {
        stave.addClef(clef);
        if (keySignature && keySignature !== 'C') {
          stave.addKeySignature(keySignature);
        }
        if (timeSignature) {
          stave.addTimeSignature(timeSignature);
        }
      } else if (colIndex === 0) {
        // Début d'un nouveau système (ligne 2, 3...)
        stave.addClef(clef);
        if (keySignature && keySignature !== 'C') {
          stave.addKeySignature(keySignature);
        }
      }

      // Dernière mesure : double barre finale
      if (m === measureCount - 1) {
        stave.setEndBarType(BarlineType.END);
      }

      stave.setContext(context).draw();

      // Numéro de la mesure
      const numLabel = createSvgElement('text', {
        x: stave.getX() + 6,
        y: stave.getY() - 6,
        fill: 'rgba(255, 255, 255, 0.55)',
        'font-size': '11',
        'font-family': 'Inter, system-ui, sans-serif',
        'font-weight': '700',
        'letter-spacing': '0.04em',
      });
      numLabel.textContent = `m. ${m + 1}`;
      bgLayer.appendChild(numLabel);

      // Surbrillance si cette mesure est en cours d'écoute
      const isActive = activeMeasureIndex === m;
      if (isActive) {
        const highlight = createSvgElement('rect', {
          x: stave.getX() - 4,
          y: stave.getY() - 14,
          width: stave.getWidth() + 8,
          height: 124,
          rx: 10,
          fill: 'rgba(52, 211, 153, 0.1)',
          stroke: 'rgba(52, 211, 153, 0.65)',
          'stroke-width': 1.8,
        });
        bgLayer.appendChild(highlight);
      }

      // Zone interactive cliquable sur chaque mesure
      if (onMeasureClick) {
        const hitArea = createSvgElement('rect', {
          x: stave.getX(),
          y: stave.getY() - 10,
          width: stave.getWidth(),
          height: 115,
          fill: 'transparent',
          style: 'cursor: pointer;',
          class: 'hover:fill-white/[0.04]',
        });
        hitArea.addEventListener('click', () => {
          onMeasureClick(m);
        });
        overlayLayer.appendChild(hitArea);
      }

      // Placement des notes de la mesure m
      const mNotes = measures[m] || [];
      const noteAreaStartX = stave.getNoteStartX();
      const noteAreaEndX = stave.getNoteEndX() - 12;
      const usableWidth = Math.max(60, noteAreaEndX - noteAreaStartX);
      const slotCount = Math.max(1, mNotes.length);
      const slotStep = usableWidth / slotCount;

      const preparedNotes = mNotes.map((noteData, idx) => {
        const targetX = noteAreaStartX + (idx + 0.45) * slotStep;
        const vexDur = noteData.isRest ? `${noteData.duration}r` : noteData.duration;

        const staveNote = new StaveNote({
          clef,
          keys: [noteData.vexflowKey || 'g/4'],
          duration: vexDur,
          dots: noteData.dots || 0,
          auto_stem: !noteData.isRest,
        });

        if (!noteData.isRest && noteData.accidentalSymbol) {
          staveNote.addModifier(new Accidental(noteData.accidentalSymbol), 0);
        }

        if (noteData.dots && noteData.dots > 0) {
          Dot.buildAndAttach([staveNote], { all: true });
        }

        const noteColor = isActive ? '#34d399' : '#ffffff';
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

        return { noteData, staveNote, targetX };
      });

      // Ligatures (Beams)
      const beamGroups = new Map();
      preparedNotes.forEach((item) => {
        const bgId = item.noteData.beamGroupId;
        if (bgId && !item.noteData.isRest) {
          if (!beamGroups.has(bgId)) beamGroups.set(bgId, []);
          beamGroups.get(bgId).push(item);
        }
      });

      const beamsToDraw = [];
      for (const groupItems of beamGroups.values()) {
        if (groupItems.length >= 2) {
          try {
            const staveNotes = groupItems.map((g) => g.staveNote);
            const beam = new Beam(staveNotes, true);
            const beamColor = isActive ? '#34d399' : '#ffffff';
            beam.setStyle({ fillStyle: beamColor, strokeStyle: beamColor });
            beamsToDraw.push(beam);
          } catch {}
        }
      }

      // Dessin des notes et ligatures
      preparedNotes.forEach(({ staveNote, noteData }) => {
        context.openGroup('vf-score-note', noteData.id);
        staveNote.setContext(context).draw();
        context.closeGroup();
      });

      beamsToDraw.forEach((beam) => {
        beam.setContext(context).draw();
      });
    }

    svgEl.insertBefore(bgLayer, svgEl.firstChild);
    svgEl.appendChild(overlayLayer);
  }, [clef, keySignature, timeSignature, measures, measureCount, svgHeight, activeMeasureIndex, onMeasureClick]);

  return (
    <div className="w-full overflow-x-auto rounded-3xl bg-zinc-950/70 border border-white/10 p-3 sm:p-5 shadow-2xl backdrop-blur-xl">
      <div className="min-w-[700px] flex justify-center">
        <div ref={containerRef} style={{ width: SVG_WIDTH, height: svgHeight }} />
      </div>
      <div className="text-center text-[11px] text-zinc-400 mt-2">
        Astuce : Vous pouvez cliquer sur n’importe quelle mesure pour la réécouter isolément.
      </div>
    </div>
  );
}

