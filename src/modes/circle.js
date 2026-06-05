// ============================================================
//  modes/circle.js — Circle of Fifths. Two segments:
//   • Explore — double ring (outer major, inner minor). Click any
//     key to see its scale on the piano.
//   • Trainer — progression paths + live play-trace (circleTrainer.js).
// ============================================================
import { CIRCLE_FIFTHS } from '../data/circle.js';
import { SCALE_DEFS } from '../theory.js';
import { ringMarkup, nodesMarkup, nodePos, R_MAJ, R_MIN } from '../ui/circleGeom.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';
import { renderTrainer, stopTrainer } from './circleTrainer.js';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]; // natural minor
let segment = 'explore';
let selected = 0;
let selectedType = 'maj'; // 'maj' or 'min'

// ---- Explore segment ----
function lightKey(pc, scale) {
  clearDemo();
  const root = 60 + pc;
  scale.forEach((iv, i) => paintDemo(root + iv, true, i === 0));
}

function selectExplore(i, type) {
  selected = i;
  selectedType = type;
  const svg = document.getElementById('cfSvg');
  const next = (i + 1) % 12;
  const prev = (i + 11) % 12;

  svg.querySelectorAll('.cf-node').forEach(n => {
    const j = +n.dataset.i;
    const nType = n.dataset.type;
    const isSelected = j === i && nType === type;
    const isNeighbor = (j === next || j === prev) && nType === type;
    n.classList.toggle('sel', isSelected);
    n.classList.toggle('nbr', isNeighbor);
  });

  const k = CIRCLE_FIFTHS[i];
  const isMajor = type === 'maj';
  const pc = isMajor ? k.pc : (k.pc + 9) % 12; // minor root
  lightKey(pc, isMajor ? MAJOR_SCALE : MINOR_SCALE);

  const label = isMajor ? k.major : k.minor;
  const qualLabel = isMajor ? 'major' : 'minor';
  const relative = isMajor
    ? `relative minor — <b>${k.minor}</b>`
    : `relative major — <b>${k.major}</b>`;

  const info = document.getElementById('cfInfo');
  info.innerHTML = `
    <div class="cf-key">${label} <span style="font-size:20px;color:var(--muted)">${qualLabel}</span></div>
    <div class="cf-sub">${relative}</div>
    <div class="cf-sub">${k.accidentals}</div>
    <div class="cf-moves">
      <button class="cf-step" data-step="1">↻ up a fifth → ${isMajor ? CIRCLE_FIFTHS[next].major : CIRCLE_FIFTHS[next].minor}</button>
      <button class="cf-step" data-step="-1">↺ up a fourth → ${isMajor ? CIRCLE_FIFTHS[prev].major : CIRCLE_FIFTHS[prev].minor}</button>
    </div>
    <div class="cf-hint">
      <span class="sw o"></span> root &nbsp; <span class="sw g"></span> scale notes on the piano below.
      Click any <b>outer</b> node for major, <b>inner</b> for minor.
    </div>`;
  info.querySelectorAll('.cf-step').forEach(b => {
    b.addEventListener('click', () => selectExplore((i + (+b.dataset.step) + 12) % 12, type));
  });
}

function renderExplore() {
  const body = document.getElementById('cfSegBody');
  body.innerHTML = `
    <div class="label" style="margin-bottom:14px;">Circle of fifths — outer ring = major, inner ring = minor</div>
    <div class="cf-layout">
      <div class="cf-svg-col">
        <svg viewBox="0 0 360 360" id="cfSvg" role="img" aria-label="Circle of fifths">
          ${ringMarkup()}${nodesMarkup()}
        </svg>
      </div>
      <div class="cf-info" id="cfInfo"></div>
    </div>`;
  body.querySelectorAll('.cf-node').forEach(n => {
    n.addEventListener('click', () => selectExplore(+n.dataset.i, n.dataset.type));
  });
  selectExplore(selected, selectedType);
}

// ---- segment switching ----
function paintSeg() {
  document.querySelectorAll('#cfSeg button').forEach(b => b.classList.toggle('active', b.dataset.seg === segment));
  stopTrainer();
  clearDemo();
  if (segment === 'explore') renderExplore();
  else renderTrainer();
}

export function renderCircle() {
  const wrap = document.getElementById('cfWrap');
  wrap.innerHTML = `
    <div class="cf-seg" id="cfSeg">
      <button data-seg="explore">Explore</button>
      <button data-seg="trainer">Trainer</button>
    </div>
    <div id="cfSegBody"></div>`;
  wrap.querySelectorAll('#cfSeg button').forEach(b => {
    b.addEventListener('click', () => { segment = b.dataset.seg; paintSeg(); });
  });
  paintSeg();
}
