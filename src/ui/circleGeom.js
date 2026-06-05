// ============================================================
//  ui/circleGeom.js — shared circle-of-fifths geometry & markup.
//  DOUBLE RING: outer = 12 major keys, inner = 12 relative minors.
//  Both are always visible and labeled. A minor key sits directly
//  inside its relative major (Am inside C, Em inside G, etc.).
// ============================================================
import { CIRCLE_FIFTHS } from '../data/circle.js';

export const CENTER = 180;
export const R_MAJ = 142;      // outer ring radius (major keys)
export const R_MIN = 92;       // inner ring radius (minor keys)
export const NR_MAJ = 28;      // major node radius
export const NR_MIN = 22;      // minor node radius (smaller)
export const NUM_R = R_MAJ + NR_MAJ + 4;  // roman numerals outside the rim

// position of node i on a given ring
export function nodePos(i, radius = R_MAJ) {
  const ang = (-90 + i * 30) * Math.PI / 180;
  return { x: CENTER + radius * Math.cos(ang), y: CENTER + radius * Math.sin(ang) };
}

// point at an arbitrary radius along node i's spoke
export function radialPos(i, radius) {
  return nodePos(i, radius);
}

// pitch class -> circle index
export const PC_TO_INDEX = (() => {
  const m = {};
  CIRCLE_FIFTHS.forEach((k, i) => { m[k.pc] = i; });
  return m;
})();

// minor pc -> circle index (minor sits at its relative major's slot)
export const MINOR_PC_TO_INDEX = (() => {
  const m = {};
  CIRCLE_FIFTHS.forEach((k, i) => { m[(k.pc + 9) % 12] = i; }); // Am=9 -> C slot=0, etc.
  return m;
})();

// where a chord sits: major = outer ring node, minor = inner ring node
export function chordPlacement(root, quality) {
  if (quality === 'm') return { index: MINOR_PC_TO_INDEX[root], inner: true };
  return { index: PC_TO_INDEX[root], inner: false };
}

// pixel point for a placement
export function placementPoint(index, inner) {
  return inner ? nodePos(index, R_MIN) : nodePos(index, R_MAJ);
}

// edge point: start/end arrows at the node rim
export function edgePoint(ax, ay, bx, by, dist) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return { x: ax + (dx / len) * dist, y: ay + (dy / len) * dist };
}

// ---- markup helpers ----

export function ringMarkup() {
  return `
    <circle cx="${CENTER}" cy="${CENTER}" r="${R_MAJ}" class="cf-ring"></circle>
    <circle cx="${CENTER}" cy="${CENTER}" r="${R_MIN}" class="cf-ring cf-ring-inner"></circle>`;
}

export function nodesMarkup() {
  let s = '';
  CIRCLE_FIFTHS.forEach((k, i) => {
    // outer major node
    const mp = nodePos(i, R_MAJ);
    s += `<g class="cf-node cf-node-maj" data-i="${i}" data-type="maj" transform="translate(${mp.x.toFixed(1)},${mp.y.toFixed(1)})">
        <circle r="${NR_MAJ}"></circle>
        <text class="cf-maj" dy="1">${k.major}</text>
      </g>`;
    // inner minor node
    const ip = nodePos(i, R_MIN);
    s += `<g class="cf-node cf-node-min" data-i="${i}" data-type="min" transform="translate(${ip.x.toFixed(1)},${ip.y.toFixed(1)})">
        <circle r="${NR_MIN}"></circle>
        <text class="cf-min-label" dy="1">${k.minor}</text>
      </g>`;
  });
  return s;
}

// arrowhead marker
export function arrowDefs() {
  return `<defs>
    <marker id="cfArrow" viewBox="0 0 10 10" refX="8.5" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="context-stroke"></path>
    </marker>
  </defs>`;
}

// backward compat aliases
export const NR = NR_MAJ;
export const INNER_R = R_MIN;
