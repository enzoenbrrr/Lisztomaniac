import React, { useLayoutEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Accidental,
  StaveConnector,
  TickContext,
  ModifierContext,
  Beam,
  Dot,
} from 'vexflow';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Dimensions du repère vectoriel SVG
const SVG_WIDTH = 560;
const STAVE_X = 16;
const STAVE_WIDTH = 528;

// Position X fixe de la barre de lecture (Playhead) et espacement horizontal par temps
export const PLAYHEAD_X = 142;
const PX_PER_BEAT = 64;

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * Convertit un temps global `globalBeat` en coordonnée X dans le ruban défilant.
 * À currentGlobalBeat === globalBeat, la note se trouve exactement sur playheadX.
 */
function beatToTrackX(globalBeat, playheadX = PLAYHEAD_X) {
  return playheadX + globalBeat * PX_PER_BEAT;
}

/**
 * Colorie dynamiquement un groupe SVG de note VexFlow lorsqu'elle est validée ou ratée.
 */
function applyColorToNoteGroup(groupEl, color) {
  if (!groupEl) return;
  const elements = groupEl.querySelectorAll('path, rect, line, circle, polygon');
  elements.forEach((el) => {
    const fill = el.getAttribute('fill');
    const stroke = el.getAttribute('stroke');
    if (fill && fill !== 'none') {
      el.setAttribute('fill', color);
    }
    if (stroke && stroke !== 'none') {
      el.setAttribute('stroke', color);
    }
    el.style.fill = fill === 'none' ? 'none' : color;
    el.style.stroke = color;
  });
}

/**
 * Rendu VexFlow à défilement horizontal continu :
 * - La barre de lecture (CIBLE) reste 100% FIXE à gauche (PLAYHEAD_X).
 * - Toutes les mesures (Mesure 0 vide de calibration + Mesures 1 à N), barres de mesure
 *   et repères de temps glissent de droite à gauche de façon continue à 60fps.
 */
export default function RhythmStaffRenderer({
  clefMode = 'grand',
  keySignature = 'C',
  timeSignature = '4/4',
  beatsPerMeasure = 4,
  measures = [],
  flatNotes = [],
  totalMeasures = 8,
  currentGlobalBeat = -4,
  feedbackState = 'idle',
  isInfinite = false,
}) {
  const containerRef = useRef(null);
  const scrollingTrackRef = useRef(null);
  const noteGroupsMapRef = useRef(new Map());

  const isGrandStaff = clefMode === 'grand';
  const svgHeight = isGrandStaff ? 235 : 150;

  // Identifiant structurel de la partition (ne redessine VexFlow que si la partition change)
  const scoreSignature =
    flatNotes.length > 0
      ? `${clefMode}-${keySignature}-${timeSignature}-${totalMeasures}-${flatNotes[0].id}-${
          flatNotes[flatNotes.length - 1].id
        }`
      : `${clefMode}-${keySignature}-${timeSignature}-${totalMeasures}-empty`;

  // 1. Construction initiale de la portée fixe et du ruban défilant complet de toutes les mesures
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    noteGroupsMapRef.current.clear();

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(SVG_WIDTH, svgHeight);
    const context = renderer.getContext();

    const staveStroke = 'rgba(255, 255, 255, 0.42)';
    context.setFillStyle('#f4f4f5');
    context.setStrokeStyle(staveStroke);
    context.setLineWidth(1.25);

    // --- A. Portée de fond fixe (Clés + Signature Temporelle + Lignes horizontales) ---
    let fixedTrebleStave = null;
    let fixedBassStave = null;

    if (isGrandStaff) {
      fixedTrebleStave = new Stave(STAVE_X, 18, STAVE_WIDTH);
      fixedTrebleStave.addClef('treble');
      if (keySignature && keySignature !== 'C') {
        fixedTrebleStave.addKeySignature(keySignature);
      }
      fixedTrebleStave.addTimeSignature(timeSignature);
      fixedTrebleStave.setContext(context).draw();

      fixedBassStave = new Stave(STAVE_X, 120, STAVE_WIDTH);
      fixedBassStave.addClef('bass');
      if (keySignature && keySignature !== 'C') {
        fixedBassStave.addKeySignature(keySignature);
      }
      fixedBassStave.addTimeSignature(timeSignature);
      fixedBassStave.setContext(context).draw();

      const brace = new StaveConnector(fixedTrebleStave, fixedBassStave);
      brace.setType(StaveConnector.type.BRACE);
      brace.setContext(context).draw();

      const leftConn = new StaveConnector(fixedTrebleStave, fixedBassStave);
      leftConn.setType(StaveConnector.type.SINGLE_LEFT);
      leftConn.setContext(context).draw();

      const rightConn = new StaveConnector(fixedTrebleStave, fixedBassStave);
      rightConn.setType(StaveConnector.type.SINGLE_RIGHT);
      rightConn.setContext(context).draw();
    } else {
      const singleStave = new Stave(STAVE_X, 28, STAVE_WIDTH);
      singleStave.addClef(clefMode);
      if (keySignature && keySignature !== 'C') {
        singleStave.addKeySignature(keySignature);
      }
      singleStave.addTimeSignature(timeSignature);
      singleStave.setContext(context).draw();

      if (clefMode === 'treble') fixedTrebleStave = singleStave;
      else fixedBassStave = singleStave;
    }

    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    // Zone de masquage (clipPath) pour que les notes qui défilent à gauche disparaissent
    // proprement avant de chevaucher la clé, l'armure et la signature temporelle
    const clipStartX = isGrandStaff
      ? Math.max(fixedTrebleStave.getNoteStartX(), fixedBassStave.getNoteStartX()) + 4
      : (fixedTrebleStave || fixedBassStave).getNoteStartX() + 4;
    const clipEndX = STAVE_X + STAVE_WIDTH - 2;
    const playheadX = Math.max(PLAYHEAD_X, Math.round(clipStartX + 34));

    const defs = createSvgElement('defs');
    const clipPath = createSvgElement('clipPath', { id: 'vf-rhythm-scroll-clip' });
    const clipRect = createSvgElement('rect', {
      x: clipStartX,
      y: 0,
      width: Math.max(10, clipEndX - clipStartX),
      height: svgHeight,
    });
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);
    svgEl.insertBefore(defs, svgEl.firstChild);

    // --- B. Barre de lecture FIXE (Playhead "CIBLE") à playheadX ---
    const playheadLayer = createSvgElement('g', { class: 'vf-fixed-playhead' });

    const hitboxZone = createSvgElement('rect', {
      x: playheadX - 18,
      y: 22,
      width: 36,
      height: svgHeight - 36,
      rx: 7,
      fill: 'rgba(255, 255, 255, 0.04)',
      stroke: 'rgba(255, 255, 255, 0.18)',
      'stroke-width': 0.9,
    });

    const playheadLine = createSvgElement('line', {
      x1: playheadX,
      y1: 18,
      x2: playheadX,
      y2: svgHeight - 14,
      stroke: 'rgba(255, 255, 255, 0.85)',
      'stroke-width': 1.5,
    });

    const playheadBadge = createSvgElement('rect', {
      x: playheadX - 18,
      y: 3,
      width: 36,
      height: 12,
      rx: 6,
      fill: 'rgba(255, 255, 255, 0.1)',
      stroke: 'rgba(255, 255, 255, 0.3)',
      'stroke-width': 0.8,
    });

    const playheadText = createSvgElement('text', {
      x: playheadX,
      y: 11.2,
      'text-anchor': 'middle',
      fill: '#ffffff',
      'font-size': '6.2',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-weight': '700',
      'letter-spacing': '0.08em',
    });
    playheadText.textContent = 'CIBLE';

    playheadLayer.appendChild(hitboxZone);
    playheadLayer.appendChild(playheadLine);
    playheadLayer.appendChild(playheadBadge);
    playheadLayer.appendChild(playheadText);
    svgEl.appendChild(playheadLayer);

    // --- C. Conteneur masqué + Groupe défilant (Measures 0..N + Notes VexFlow) ---
    const clippedWrapper = createSvgElement('g', {
      'clip-path': 'url(#vf-rhythm-scroll-clip)',
    });
    svgEl.appendChild(clippedWrapper);

    // Portées virtuelles extra-larges pour que VexFlow dessine les lignes supplémentaires sur toute la longueur
    const maxTrackX = beatToTrackX((totalMeasures + 4) * beatsPerMeasure, playheadX) + 800;
    const virtualTrebleStave = isGrandStaff
      ? new Stave(0, 18, maxTrackX).setContext(context)
      : clefMode === 'treble'
      ? new Stave(0, 28, maxTrackX).setContext(context)
      : null;
    const virtualBassStave = isGrandStaff
      ? new Stave(0, 120, maxTrackX).setContext(context)
      : clefMode === 'bass'
      ? new Stave(0, 28, maxTrackX).setContext(context)
      : null;

    // On ouvre le groupe défilant dans le contexte VexFlow
    const scrollingGroup = context.openGroup('vf-scrolling-track');
    scrollingTrackRef.current = scrollingGroup;

    // Haut et bas des barres de mesure verticales
    const topLineY = isGrandStaff
      ? fixedTrebleStave.getYForLine(0)
      : (fixedTrebleStave || fixedBassStave).getYForLine(0);
    const bottomLineY = isGrandStaff
      ? fixedBassStave.getYForLine(4)
      : (fixedTrebleStave || fixedBassStave).getYForLine(4);

    // 1. Dessin des barres de mesure, numéros de mesures et repères de temps (Mesure 0 à totalMeasures)
    for (let m = -1; m < totalMeasures; m++) {
      const measureStartBeat = m * beatsPerMeasure;
      // La barre de mesure précède le 1er temps de la mesure de 0.42 temps
      const barlineX = beatToTrackX(measureStartBeat - 0.42, playheadX);

      if (m >= 0) {
        const barline = createSvgElement('line', {
          x1: barlineX,
          y1: topLineY,
          x2: barlineX,
          y2: bottomLineY,
          stroke: 'rgba(255, 255, 255, 0.55)',
          'stroke-width': 1.3,
        });
        scrollingGroup.appendChild(barline);
      }

      // Étiquette de la mesure (Mesure 0 Calibration, puis Mesure 1, 2...)
      const measureLabel = createSvgElement('text', {
        x: barlineX + 6,
        y: topLineY - 12,
        fill: m === -1 ? '#a1a1aa' : 'rgba(255, 255, 255, 0.55)',
        'font-size': '6.5',
        'font-family': 'Inter, system-ui, sans-serif',
        'font-weight': '700',
        'letter-spacing': '0.05em',
      });
      measureLabel.textContent =
        m === -1 ? 'MESURE 0 (CALIBRATION)' : `MESURE ${m + 1}`;
      scrollingGroup.appendChild(measureLabel);

      // Repères de temps (1, 2, 3...) sous la portée et lignes pointillées verticales
      for (let b = 0; b < beatsPerMeasure; b++) {
        const globalB = measureStartBeat + b;
        const bx = beatToTrackX(globalB, playheadX);

        const beatTickLine = createSvgElement('line', {
          x1: bx,
          y1: topLineY,
          x2: bx,
          y2: bottomLineY,
          stroke:
            m === -1
              ? 'rgba(255, 255, 255, 0.16)'
              : 'rgba(255, 255, 255, 0.06)',
          'stroke-width': 0.8,
          'stroke-dasharray': '2 3',
        });

        const beatNumText = createSvgElement('text', {
          x: bx,
          y: svgHeight - 4,
          'text-anchor': 'middle',
          fill:
            m === -1
              ? 'rgba(255, 255, 255, 0.75)'
              : 'rgba(255, 255, 255, 0.35)',
          'font-size': '6.8',
          'font-family': 'Inter, system-ui, sans-serif',
          'font-weight': '700',
        });
        beatNumText.textContent = String(b + 1);

        scrollingGroup.appendChild(beatTickLine);
        scrollingGroup.appendChild(beatNumText);
      }
    }

    // Double barre de fin après la dernière mesure (uniquement si le mode n'est pas infini)
    if (!isInfinite) {
      const endBarX = beatToTrackX(totalMeasures * beatsPerMeasure - 0.35, playheadX);
      const endLineThin = createSvgElement('line', {
        x1: endBarX - 3.5,
        y1: topLineY,
        x2: endBarX - 3.5,
        y2: bottomLineY,
        stroke: 'rgba(255, 255, 255, 0.65)',
        'stroke-width': 1.2,
      });
      const endLineThick = createSvgElement('line', {
        x1: endBarX,
        y1: topLineY,
        x2: endBarX,
        y2: bottomLineY,
        stroke: 'rgba(255, 255, 255, 0.85)',
        'stroke-width': 3,
      });
      scrollingGroup.appendChild(endLineThin);
      scrollingGroup.appendChild(endLineThick);
    }

    // 2. Préparation et dessin de toutes les notes de toutes les mesures
    const preparedNotes = flatNotes.map((noteData) => {
      const targetStave = isGrandStaff
        ? noteData.clef === 'bass'
          ? virtualBassStave
          : virtualTrebleStave
        : virtualTrebleStave || virtualBassStave;

      const targetX = beatToTrackX(noteData.globalBeat, playheadX);
      const color = '#ffffff';

      const staveNote = new StaveNote({
        clef: noteData.clef,
        keys: [noteData.vexflowKey],
        duration: noteData.duration,
        dots: noteData.dots || 0,
        auto_stem: true,
      });

      if (noteData.accidentalSymbol) {
        staveNote.addModifier(new Accidental(noteData.accidentalSymbol), 0);
      }

      if (noteData.dots && noteData.dots > 0) {
        Dot.buildAndAttach([staveNote], { all: true });
      }

      staveNote.setStyle({ fillStyle: color, strokeStyle: color });
      staveNote.setLedgerLineStyle({
        fillStyle: color,
        strokeStyle: color,
        lineWidth: 1.8,
      });

      staveNote.setStave(targetStave);
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

      return { noteData, staveNote };
    });

    // Création des ligatures (Beams) pour les croches et doubles-croches
    const beamGroups = new Map();
    preparedNotes.forEach((item) => {
      const bgId = item.noteData.beamGroupId;
      if (bgId) {
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
          beam.setStyle({ fillStyle: '#ffffff', strokeStyle: '#ffffff' });
          beamsToDraw.push(beam);
        } catch {
          // Fallback avec crochets individuels
        }
      }
    }

    // Dessin de chaque note dans son sous-groupe dédié pour pouvoir la colorier à la volée
    preparedNotes.forEach(({ noteData, staveNote }) => {
      const noteGroup = context.openGroup('vf-rhythm-note', String(noteData.id));
      staveNote.setContext(context).draw();
      context.closeGroup();
      noteGroupsMapRef.current.set(noteData.id, noteGroup);
    });

    beamsToDraw.forEach((beam) => {
      beam.setContext(context).draw();
    });

    // Immédiatement appliquer les couleurs déjà existantes pour les notes validées / ratées
    flatNotes.forEach((note) => {
      if (note.status === 'pending') return;
      const groupEl = noteGroupsMapRef.current.get(note.id);
      if (groupEl) {
        const color =
          note.status === 'perfect' || note.status === 'good'
            ? '#34d399'
            : '#fb7185';
        applyColorToNoteGroup(groupEl, color);
      }
    });

    // Translation immédiate du ruban au temps courant pour éviter tout saut visuel
    const initialTranslateX = -currentGlobalBeat * PX_PER_BEAT;
    scrollingGroup.setAttribute(
      'transform',
      `translate(${initialTranslateX.toFixed(2)}, 0)`
    );

    context.closeGroup(); // ferme scrollingGroup

    // Déplace scrollingGroup à l'intérieur du wrapper masqué (clip-path)
    clippedWrapper.appendChild(scrollingGroup);

    svgEl.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${svgHeight}`);
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.display = 'block';
    svgEl.style.overflow = 'visible';
  }, [scoreSignature, clefMode, keySignature, isGrandStaff, svgHeight, timeSignature, beatsPerMeasure, totalMeasures, isInfinite]);


  // 2. Mise à jour des couleurs des notes (vert si réussie, rouge si ratée) sans recréer le SVG
  useLayoutEffect(() => {
    flatNotes.forEach((note) => {
      if (note.status === 'pending') return;
      const groupEl = noteGroupsMapRef.current.get(note.id);
      if (groupEl) {
        const color =
          note.status === 'perfect' || note.status === 'good'
            ? '#34d399'
            : '#fb7185';
        applyColorToNoteGroup(groupEl, color);
      }
    });
  }, [flatNotes]);

  // 3. Défilement continu à 60fps du ruban de mesures vers la barre fixe PLAYHEAD_X
  useLayoutEffect(() => {
    if (scrollingTrackRef.current) {
      const translateX = -currentGlobalBeat * PX_PER_BEAT;
      scrollingTrackRef.current.setAttribute(
        'transform',
        `translate(${translateX.toFixed(2)}, 0)`
      );
    }
  }, [currentGlobalBeat]);

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
      <div
        ref={containerRef}
        className={`vf-staff-container relative z-10 w-full flex items-center justify-center select-none ${
          isGrandStaff
            ? 'h-[230px] sm:h-[290px] lg:h-[330px]'
            : 'h-[175px] sm:h-[220px] lg:h-[250px]'
        }`}
      />
    </div>
  );
}
