// ============================================================
//  ui/circleGeom.js — shared circle-of-fifths geometry & markup,
//  used by both the Explore view and the Trainer so arrows and
//  traces line up exactly with the nodes.
// ============================================================
import { CIRCLE_FIFTHS } from '../data/circle.js';

export const CENTER = 180;
export const R = 142;   // node-ring radius
export const NR = 30;   // node radius

// position of node i (i = circle index, 0 = C at 12 o'clock, clockwise)
export function nodePos(i) {
  const ang = (-90 + i * 30) * Math.PI / 180;
  return { x: CENTER + R * Math.cos(ang), y: CENTER + R * Math.sin(ang) };
}

// pitch class -> circle index
export const PC_TO_INDEX = (() => {
  const m = {};
  CIRCLE_FIFTHS.forEach((k, i) => { m[k.pc] = i; });
  return m;
})();

export const INNER_R = 106;        // radius for the inner (relative-minor) ring
export const NUM_R = R + NR + 4;   // radius for roman numerals, just outside the rim

// point at an arbitrary radius along node i's spoke
export function radialPos(i, radius) {
  const ang = (-90 + i * 30) * Math.PI / 180;
  return { x: CENTER + radius * Math.cos(ang), y: CENTER + radius * Math.sin(ang) };
}

// where a chord sits on the wheel: a major chord on its own slot (outer node),
// a minor chord on the INNER ring of its relative-major slot (Am -> inside C).
export function chordPlacement(root, quality) {
  if (quality === 'm') return { index: PC_TO_INDEX[(root + 3) % 12], inner: true };
  return { index: PC_TO_INDEX[root], inner: false };
}

// pixel point for a placement (outer = node centre, inner = inner ring)
export function placementPoint(index, inner) {
  return inner ? radialPos(index, INNER_R) : nodePos(index);
}

// a point `dist` along the line from (ax,ay) toward (bx,by) — used to start/end
// arrows at the node rim instead of the centre
export function edgePoint(ax, ay, bx, by, dist) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return { x: ax + (dx / len) * dist, y: ay + (dy / len) * dist };
}

export function ringMarkup() {
  return `<circle cx="${CENTER}" cy="${CENTER}" r="${R}" class="cf-ring"></circle>`;
}

export function nodesMarkup() {
  return CIRCLE_FIFTHS.map((k, i) => {
    const { x, y } = nodePos(i);
    return `<g class="cf-node" data-i="${i}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
        <circle r="${NR}"></circle>
        <text class="cf-maj" dy="-1">${k.major}</text>
        <text class="cf-min" dy="14">${k.minor}</text>
      </g>`;
  }).join('');
}

// arrowhead marker whose colour follows each line's stroke (context-stroke)
export function arrowDefs() {
  return `<defs>
    <marker id="cfArrow" viewBox="0 0 10 10" refX="8.5" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="context-stroke"></path>
    </marker>
  </defs>`;
}
