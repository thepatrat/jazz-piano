// ============================================================
//  modes/circleTrainer.js — Circle of Fifths Trainer segment.
//   • Guided: follow a built-in progression; each chord is checked and
//     the path lights up as you advance.
//   • Live: free play; the last few chords you play are traced.
//  Minor chords sit on the INNER ring of their relative-major slot
//  (Am -> inside C); majors light the outer node. Roman numerals for
//  the selected progression are drawn outside the rim.
//  Chords commit on a short debounce after your last note change.
// ============================================================
import { activeNotes } from '../state.js';
import { detectChord, progressionChordMatches, chordLabel } from '../theory.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';
import {
  nodePos, radialPos, placementPoint, chordPlacement, edgePoint,
  NR_MAJ, NR_MIN, NUM_R, ringMarkup, nodesMarkup, arrowDefs,
} from '../ui/circleGeom.js';
import { CIRCLE_FIFTHS } from '../data/circle.js';
import { PROGRESSIONS, materialize, noteName } from '../data/progressions.js';

let active = false;
let mode = 'guided';        // 'guided' | 'live'
let progIndex = 0;
let tonicPc = 7;            // default G — matches the gospel lesson
let mat = [];              // materialized progression chords
let step = 0;              // guided: index of the chord to play next
let history = [];          // live: recent committed chords
let lastCommitted = null;  // live: dedupe consecutive identical chords
let timer = null;

const TRIAD = { maj: [0, 4, 7], m: [0, 3, 7] };

// ---- commit (debounced) ----
export function circleNoteChanged() {
  if (!active) return;
  clearTimeout(timer);
  timer = setTimeout(commit, 140);
}

function commit() {
  const notes = [...activeNotes];
  if (notes.length < 3) return;

  if (mode === 'guided') {
    if (step >= mat.length) return;
    if (progressionChordMatches(notes, mat[step])) {
      step++;
      drawPath();
      if (step >= mat.length) clearDemo();
      else lightTarget(mat[step]);
      updateStatus();
    }
    return;
  }

  // live trace
  const c = detectChord(notes);
  if (!c) return;
  if (lastCommitted && lastCommitted.root === c.root && lastCommitted.quality === c.quality) return;
  lastCommitted = { root: c.root, quality: c.quality };
  const place = chordPlacement(c.root, c.quality);
  history.push({ index: place.index, inner: place.inner, label: chordLabel(c) });
  if (history.length > 6) history.shift();
  drawTrace();
  updateStatus();
}

// ---- drawing ----
// arrow between two chord placements; skipped when they share a slot
function arrowChord(a, b, cls) {
  if (a.index === b.index && a.inner === b.inner) return '';
  const pa = placementPoint(a.index, a.inner);
  const pb = placementPoint(b.index, b.inner);
  const rA = a.inner ? NR_MIN + 3 : NR_MAJ + 3;
  const rB = b.inner ? NR_MIN + 6 : NR_MAJ + 6;
  const p1 = edgePoint(pa.x, pa.y, pb.x, pb.y, rA);
  const p2 = edgePoint(pb.x, pb.y, pa.x, pa.y, rB);
  return `<line class="${cls}" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" marker-end="url(#cfArrow)"></line>`;
}

// highlight nodes on the double ring for a set of chords
function renderMarks(chords, cur, doneOf) {
  const majSet = new Set(chords.filter(c => !c.inner).map(c => c.index));
  const minSet = new Set(chords.filter(c => c.inner).map(c => c.index));
  document.querySelectorAll('#cfSvgT .cf-node').forEach(n => {
    const j = +n.dataset.i;
    const type = n.dataset.type;
    const isMaj = type === 'maj';
    const inSet = isMaj ? majSet.has(j) : minSet.has(j);
    const isCur = !!cur && ((isMaj && !cur.inner && cur.index === j) || (!isMaj && cur.inner && cur.index === j));
    n.classList.toggle('on', inSet);
    n.classList.toggle('cur', isCur);
  });
  return ''; // no more separate minor dots — they're real nodes now
}

// roman numerals outside the rim (dedupe by slot+numeral, stack if a slot repeats)
function numeralMarkup() {
  let s = '';
  const placed = new Set();
  const bumpOf = {};
  mat.forEach(c => {
    const key = c.index + ':' + c.numeral;
    if (placed.has(key)) return;
    placed.add(key);
    const bump = bumpOf[c.index] || 0;
    bumpOf[c.index] = bump + 1;
    const p = radialPos(c.index, NUM_R + bump * 14);
    s += `<text class="cf-numeral" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}">${c.numeral}</text>`;
  });
  return s;
}

function drawPath() {
  document.getElementById('cfTrace').innerHTML = '';
  let arrows = '';
  for (let i = 0; i < mat.length - 1; i++) {
    const done = i + 1 < step;
    arrows += arrowChord(mat[i], mat[i + 1], `cf-arrow${done ? ' done' : ''}`);
  }
  document.getElementById('cfPath').innerHTML = arrows;
  const cur = step < mat.length ? mat[step] : null;
  document.getElementById('cfMarks').innerHTML =
    renderMarks(mat, cur, i => i < step) + numeralMarkup();
}

function drawTrace() {
  document.getElementById('cfPath').innerHTML = '';
  let s = '';
  for (let i = 1; i < history.length; i++) {
    const op = (0.3 + 0.7 * (i / (history.length - 1))).toFixed(2);
    const seg = arrowChord(history[i - 1], history[i], 'cf-trace-line');
    if (seg) s += seg.replace('<line ', `<line style="opacity:${op}" `);
  }
  document.getElementById('cfTrace').innerHTML = s;
  const cur = history[history.length - 1] || null;
  document.getElementById('cfMarks').innerHTML = renderMarks(history, cur, null);
}

function lightTarget(ch) {
  clearDemo();
  TRIAD[ch.quality].forEach((iv, i) => paintDemo(60 + ch.root + iv, true, i === 0));
}

// ---- status / controls ----
function updateStatus() {
  const el = document.getElementById('cfTStatus');
  if (!el) return;
  if (mode === 'guided') {
    const chips = mat.map((c, i) =>
      `<span class="cf-chip ${i < step ? 'done' : i === step ? 'cur' : ''}">${c.label}<span class="num">${c.numeral}</span></span>`
    ).join('');
    const head = step < mat.length
      ? `Step ${step + 1}/${mat.length} — play <b>${mat[step].label}</b> <span style="color:var(--muted)">(${mat[step].numeral})</span>`
      : `✓ Home again — you walked back to <b>${mat[0].label}</b>.`;
    el.innerHTML = `<div class="cf-status">${head}</div><div class="cf-steps">${chips}</div>
      <button class="cf-step" id="cfRestart">↺ Restart</button>`;
    document.getElementById('cfRestart').addEventListener('click', restart);
  } else {
    const last = history[history.length - 1];
    el.innerHTML = `<div class="cf-status">Free play — your recent chords are traced.${last ? ` Last: <b>${last.label}</b>` : ''}</div>
      <button class="cf-step" id="cfClear">Clear trace</button>
      <div class="cf-hint" style="margin-top:14px;"><span class="sw o"></span> majors on the rim, <span class="sw g"></span> minors on the inner ring (a minor sits inside its relative major).</div>`;
    document.getElementById('cfClear').addEventListener('click', () => { history = []; lastCommitted = null; drawTrace(); updateStatus(); });
  }
}

function rebuild() {
  mat = materialize(PROGRESSIONS[progIndex], tonicPc);
  step = 0;
  history = [];
  lastCommitted = null;
  clearDemo();
  if (mode === 'guided') { drawPath(); lightTarget(mat[step]); }
  else { drawTrace(); }
  updateStatus();
}

function restart() {
  step = 0;
  drawPath();
  lightTarget(mat[step]);
  updateStatus();
}

// ---- render ----
export function renderTrainer() {
  active = true;
  const body = document.getElementById('cfSegBody');
  const progOpts = PROGRESSIONS.map((p, i) => `<option value="${i}" ${i === progIndex ? 'selected' : ''}>${p.title}</option>`).join('');
  const tonicOpts = Array.from({ length: 12 }, (_, pc) =>
    `<option value="${pc}" ${pc === tonicPc ? 'selected' : ''}>${noteName(pc)}</option>`).join('');

  body.innerHTML = `
    <div class="cf-mode-toggle" id="cfModeToggle">
      <button data-m="guided">Guided follow-along</button>
      <button data-m="live">Live trace</button>
    </div>
    <div class="cf-controls" id="cfControls">
      <label>Progression
        <select id="cfProg">${progOpts}</select>
      </label>
      <label>Starting key (tonic)
        <select id="cfTonic">${tonicOpts}</select>
      </label>
    </div>
    <div class="cf-layout">
      <div class="cf-svg-col">
        <svg viewBox="-18 -18 396 396" id="cfSvgT" role="img" aria-label="Circle of fifths trainer">
          ${arrowDefs()}${ringMarkup()}
          <g id="cfPath"></g>
          <g id="cfTrace"></g>
          ${nodesMarkup()}
          <g id="cfMarks"></g>
        </svg>
      </div>
      <div class="cf-info" id="cfTStatus"></div>
    </div>`;

  body.querySelectorAll('#cfModeToggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.m === mode);
    b.addEventListener('click', () => {
      mode = b.dataset.m;
      body.querySelectorAll('#cfModeToggle button').forEach(x => x.classList.toggle('active', x.dataset.m === mode));
      document.getElementById('cfControls').style.display = mode === 'guided' ? 'flex' : 'none';
      rebuild();
    });
  });
  document.getElementById('cfControls').style.display = mode === 'guided' ? 'flex' : 'none';
  document.getElementById('cfProg').addEventListener('change', e => { progIndex = +e.target.value; rebuild(); });
  document.getElementById('cfTonic').addEventListener('change', e => { tonicPc = +e.target.value; rebuild(); });
  // clicking a circle node sets the tonic (starting key)
  body.querySelectorAll('#cfSvgT .cf-node').forEach(n => {
    n.addEventListener('click', () => {
      tonicPc = CIRCLE_FIFTHS[+n.dataset.i].pc;
      document.getElementById('cfTonic').value = tonicPc;
      rebuild();
    });
  });

  rebuild();
}

// called by circle.js when leaving the Trainer segment / mode
export function stopTrainer() {
  active = false;
  clearTimeout(timer);
  clearDemo();
}
