import React, { useLayoutEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Accidental,
  StaveConnector,
  TickContext,
} from 'vexflow';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Coordonnées dans un repère SVG compact (410px) laissant la place à l'armure à la clé (jusqu'à 7♯/7♭)
const SVG_WIDTH = 410;
const STAVE_X = 14;
const STAVE_WIDTH = 382;

// Coordonnées X du centre exact des 3 notes :
// 1. Note Cible (168) | 2. Prochaine note +1 (236) | 3. Prochaine note +2 (304)
export const HITBOX_SVG_X = 168;
export const NEXT_NOTE_1_SVG_X = 236;
export const NEXT_NOTE_2_SVG_X = 304;
const SLIDE_DELTA_X = NEXT_NOTE_1_SVG_X - HITBOX_SVG_X; // 68 unités SVG entre chaque note

/**
 * Crée un élément SVG natif avec ses attributs.
 */
function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * Dessine les zones repères "CIBLE" (1 note) et "SUIVANTES" (2 notes d'avance)
 * directement dans le repère vectoriel du SVG avec un style neutre et stable.
 */
function drawSvgZones(svgEl, svgHeight) {
  const bgLayer = createSvgElement('g', { class: 'vf-zones-layer' });

  const hitboxCenterX = HITBOX_SVG_X;
  const singleSlotWidth = 46;
  const boxTop = 18;
  const boxHeight = svgHeight - 28;

  // --- 1. Zone CIBLE (Hitbox : 1 note) ---
  const hitboxRect = createSvgElement('rect', {
    class: 'vf-hitbox-rect',
    x: hitboxCenterX - singleSlotWidth / 2,
    y: boxTop,
    width: singleSlotWidth,
    height: boxHeight,
    rx: 8,
    fill: 'rgba(255, 255, 255, 0.04)',
    stroke: 'rgba(255, 255, 255, 0.22)',
    'stroke-width': 1,
  });

  const hitboxBadgeBg = createSvgElement('rect', {
    class: 'vf-hitbox-badge',
    x: hitboxCenterX - 18,
    y: 2,
    width: 36,
    height: 12,
    rx: 6,
    fill: 'rgba(255, 255, 255, 0.04)',
    stroke: 'rgba(255, 255, 255, 0.22)',
    'stroke-width': 0.8,
  });

  const hitboxLabel = createSvgElement('text', {
    x: hitboxCenterX,
    y: 10.5,
    'text-anchor': 'middle',
    fill: '#ffffff',
    'font-size': '6.5',
    'font-family': 'Inter, system-ui, sans-serif',
    'font-weight': '700',
    'letter-spacing': '0.08em',
  });
  hitboxLabel.textContent = 'CIBLE';

  // --- 2. Zone SUIVANTES (Anticipation : contient les 2 notes d'avance) ---
  const nextBoxLeft = NEXT_NOTE_1_SVG_X - singleSlotWidth / 2;
  const nextBoxRight = NEXT_NOTE_2_SVG_X + singleSlotWidth / 2;
  const nextBoxWidth = nextBoxRight - nextBoxLeft;
  const nextBoxCenterX = (NEXT_NOTE_1_SVG_X + NEXT_NOTE_2_SVG_X) / 2;

  const nextRect = createSvgElement('rect', {
    x: nextBoxLeft,
    y: boxTop,
    width: nextBoxWidth,
    height: boxHeight,
    rx: 8,
    fill: 'rgba(255, 255, 255, 0.015)',
    stroke: 'rgba(255, 255, 255, 0.12)',
    'stroke-width': 0.9,
    'stroke-dasharray': '3 3',
  });

  // Séparateur vertical subtil entre la 1re et la 2e note d'avance
  const nextDivider = createSvgElement('line', {
    x1: nextBoxCenterX,
    y1: boxTop + 6,
    x2: nextBoxCenterX,
    y2: boxTop + boxHeight - 6,
    stroke: 'rgba(255, 255, 255, 0.07)',
    'stroke-width': 0.8,
    'stroke-dasharray': '2 3',
  });

  const nextBadgeBg = createSvgElement('rect', {
    x: nextBoxCenterX - 24,
    y: 2,
    width: 48,
    height: 12,
    rx: 6,
    fill: 'rgba(255, 255, 255, 0.04)',
    stroke: 'rgba(255, 255, 255, 0.12)',
    'stroke-width': 0.8,
  });

  const nextLabel = createSvgElement('text', {
    x: nextBoxCenterX,
    y: 10.5,
    'text-anchor': 'middle',
    fill: '#a1a1aa',
    'font-size': '6',
    'font-family': 'Inter, system-ui, sans-serif',
    'font-weight': '600',
    'letter-spacing': '0.06em',
  });
  nextLabel.textContent = 'SUIVANTES';

  bgLayer.appendChild(hitboxRect);
  bgLayer.appendChild(hitboxBadgeBg);
  bgLayer.appendChild(hitboxLabel);
  bgLayer.appendChild(nextRect);
  bgLayer.appendChild(nextDivider);
  bgLayer.appendChild(nextBadgeBg);
  bgLayer.appendChild(nextLabel);

  svgEl.insertBefore(bgLayer, svgEl.firstChild);
}

/**
 * Crée et dessine une StaveNote VexFlow centrée géométriquement sur targetX.
 */
function drawNoteAtPosition({
  context,
  stave,
  noteData,
  targetX,
  color,
  groupClass,
}) {
  if (!noteData || !stave) return null;

  const staveNote = new StaveNote({
    clef: noteData.clef,
    keys: [noteData.vexflowKey],
    duration: 'q',
    auto_stem: true,
  });

  if (noteData.accidentalSymbol) {
    staveNote.addModifier(new Accidental(noteData.accidentalSymbol), 0);
  }

  staveNote.setStyle({
    fillStyle: color,
    strokeStyle: color,
  });

  staveNote.setLedgerLineStyle({
    fillStyle: color,
    strokeStyle: color,
    lineWidth: 2,
  });

  staveNote.setStave(stave);
  staveNote.setContext(context);

  const tickContext = new TickContext();
  tickContext.addTickable(staveNote).preFormat().setX(0);

  // Calcul du centre géométrique exact de la tête de note (indépendamment des altérations #/b)
  const headBeginX = staveNote.getNoteHeadBeginX();
  const headEndX = staveNote.getNoteHeadEndX();
  const initialHeadCenterX = (headBeginX + headEndX) / 2;

  // Aligne le centre de la tête de note exactement sur targetX
  const exactXOffset = targetX - initialHeadCenterX;
  tickContext.setX(exactXOffset);

  const group = context.openGroup(groupClass, noteData.id);
  staveNote.draw();
  context.closeGroup();

  return group;
}

/**
 * Composant de rendu de la portée musicale avec VexFlow (SVG) — 3 notes affichées (Cible + 2 notes d'avance).
 */
export default function StaffRenderer({
  clefMode = 'treble',
  keySignature = 'C',
  currentNote,
  nextNote,
  thirdNote,
  exitingNote,
  feedbackState, // 'idle' | 'success' | 'error'
  transitionKey,
  isCountingDown = false,
}) {
  const containerRef = useRef(null);
  const lastAnimatedKeyRef = useRef(transitionKey);

  const isGrandStaff = clefMode === 'grand';
  const svgHeight = isGrandStaff ? 235 : 145;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(SVG_WIDTH, svgHeight);
    const context = renderer.getContext();

    const staveStroke = 'rgba(255, 255, 255, 0.42)';
    context.setFillStyle('#f4f4f5');
    context.setStrokeStyle(staveStroke);
    context.setLineWidth(1.3);

    let trebleStave = null;
    let bassStave = null;

    if (isGrandStaff) {
      trebleStave = new Stave(STAVE_X, 12, STAVE_WIDTH);
      trebleStave.addClef('treble');
      if (keySignature && keySignature !== 'C') {
        trebleStave.addKeySignature(keySignature);
      }
      trebleStave.setContext(context).draw();

      bassStave = new Stave(STAVE_X, 115, STAVE_WIDTH);
      bassStave.addClef('bass');
      if (keySignature && keySignature !== 'C') {
        bassStave.addKeySignature(keySignature);
      }
      bassStave.setContext(context).draw();

      const brace = new StaveConnector(trebleStave, bassStave);
      brace.setType(StaveConnector.type.BRACE);
      brace.setContext(context).draw();

      const leftLine = new StaveConnector(trebleStave, bassStave);
      leftLine.setType(StaveConnector.type.SINGLE_LEFT);
      leftLine.setContext(context).draw();

      const rightLine = new StaveConnector(trebleStave, bassStave);
      rightLine.setType(StaveConnector.type.SINGLE_RIGHT);
      rightLine.setContext(context).draw();
    } else {
      const singleStave = new Stave(STAVE_X, 25, STAVE_WIDTH);
      singleStave.addClef(clefMode);
      if (keySignature && keySignature !== 'C') {
        singleStave.addKeySignature(keySignature);
      }
      singleStave.setContext(context).draw();

      if (clefMode === 'treble') {
        trebleStave = singleStave;
      } else {
        bassStave = singleStave;
      }
    }

    const resolveStaveForNote = (note) => {
      if (!note) return trebleStave || bassStave;
      if (isGrandStaff) {
        return note.clef === 'bass' ? bassStave : trebleStave;
      }
      return trebleStave || bassStave;
    };

    // 0. Note précédente qui disparaît (vert émeraude si trouvée, rouge corail si ratée)
    let exitingGroup = null;
    if (exitingNote && lastAnimatedKeyRef.current !== transitionKey) {
      const exitingColor = feedbackState === 'error' ? '#fb7185' : '#34d399';
      exitingGroup = drawNoteAtPosition({
        context,
        stave: resolveStaveForNote(exitingNote),
        noteData: exitingNote,
        targetX: HITBOX_SVG_X,
        color: exitingColor,
        groupClass: 'vf-exiting-note',
      });
    }

    // 1. Note active dans la zone CIBLE (blanc pur)
    const currentGroup = drawNoteAtPosition({
      context,
      stave: resolveStaveForNote(currentNote),
      noteData: currentNote,
      targetX: HITBOX_SVG_X,
      color: '#ffffff',
      groupClass: 'vf-current-note',
    });

    // 2. Première note d'avance dans la zone SUIVANTES (gris clair)
    const nextGroup = drawNoteAtPosition({
      context,
      stave: resolveStaveForNote(nextNote),
      noteData: nextNote,
      targetX: NEXT_NOTE_1_SVG_X,
      color: '#d4d4d8',
      groupClass: 'vf-next-note-1',
    });

    if (nextGroup) {
      nextGroup.style.opacity = '0.82';
    }

    // 3. Deuxième note d'avance dans la zone SUIVANTES (gris argenté plus doux)
    const thirdGroup = drawNoteAtPosition({
      context,
      stave: resolveStaveForNote(thirdNote),
      noteData: thirdNote,
      targetX: NEXT_NOTE_2_SVG_X,
      color: '#a1a1aa',
      groupClass: 'vf-next-note-2',
    });

    if (thirdGroup) {
      thirdGroup.style.opacity = '0.58';
    }

    // Adaptation responsive du SVG via viewBox + dessin vectoriel des zones Cible/Suivantes
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      drawSvgZones(svgEl, svgHeight);
      svgEl.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${svgHeight}`);
      svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');
      svgEl.style.width = '100%';
      svgEl.style.height = '100%';
      svgEl.style.display = 'block';
      svgEl.style.overflow = 'visible';
    }

    // Animations fluides synchronisées des 3 notes
    if (lastAnimatedKeyRef.current !== transitionKey) {
      lastAnimatedKeyRef.current = transitionKey;

      // Disparition de la note jouée
      if (exitingGroup && typeof exitingGroup.animate === 'function') {
        exitingGroup.style.transformBox = 'fill-box';
        exitingGroup.style.transformOrigin = 'center';
        exitingGroup.animate(
          [
            { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
            { transform: 'translate(-20px, -14px) scale(1.25)', opacity: 0 },
          ],
          {
            duration: 240,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          }
        );
      }

      // Glissement de la 1re note d'avance -> CIBLE
      if (currentGroup && typeof currentGroup.animate === 'function') {
        currentGroup.animate(
          [
            { transform: `translateX(${SLIDE_DELTA_X}px)`, opacity: 0.82 },
            { transform: 'translateX(0px)', opacity: 1 },
          ],
          {
            duration: 240,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          }
        );
      }

      // Glissement de la 2e note d'avance -> 1re place de SUIVANTES
      if (nextGroup && typeof nextGroup.animate === 'function') {
        nextGroup.animate(
          [
            { transform: `translateX(${SLIDE_DELTA_X}px)`, opacity: 0.58 },
            { transform: 'translateX(0px)', opacity: 0.82 },
          ],
          {
            duration: 240,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          }
        );
      }

      // Apparition de la nouvelle 3e note dans la 2e place de SUIVANTES
      if (thirdGroup && typeof thirdGroup.animate === 'function') {
        thirdGroup.animate(
          [
            { transform: 'translateX(50px)', opacity: 0 },
            { transform: 'translateX(0px)', opacity: 0.58 },
          ],
          {
            duration: 240,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards',
          }
        );
      }
    }
  }, [
    clefMode,
    keySignature,
    isGrandStaff,
    svgHeight,
    currentNote,
    nextNote,
    thirdNote,
    exitingNote,
    transitionKey,
  ]);

  return (
    <div
      className={`glass-panel rounded-2xl sm:rounded-3xl p-2 sm:p-4 relative overflow-hidden transition-[border-color,box-shadow] duration-500 ease-out ${
        feedbackState === 'error'
          ? 'border-rose-500/55 shadow-[0_0_50px_-6px_rgba(244,63,94,0.38)]'
          : feedbackState === 'success'
          ? 'border-emerald-400/55 shadow-[0_0_50px_-6px_rgba(16,185,129,0.34)]'
          : ''
      }`}
    >
      {/* Hauteur responsive maîtrisée, intérieur 100% sobre sans flash interne */}
      <div
        ref={containerRef}
        className={`vf-staff-container relative z-10 w-full flex items-center justify-center select-none ${
          isCountingDown ? 'is-counting-down' : ''
        } ${
          isGrandStaff
            ? 'h-[230px] sm:h-[290px] lg:h-[330px]'
            : 'h-[175px] sm:h-[220px] lg:h-[250px]'
        }`}
      />
    </div>
  );
}
