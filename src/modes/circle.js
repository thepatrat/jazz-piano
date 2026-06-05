// ============================================================
//  modes/circle.js — Circle of Fifths. Two segments:
//   • Explore — click a key, see its major scale on the piano.
//   • Trainer — progression paths + live play-trace (circleTrainer.js).
// ============================================================
import { CIRCLE_FIFTHS } from '../data/circle.js';
import { ringMarkup, nodesMarkup } from '../ui/circleGeom.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';
import { renderTrainer, stopTrainer } from './circleTrainer.js';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
let segment = 'explore';
let selected = 0;

// ---- Explore segment ----
function lightKey(pc) {
  clearDemo();
  const root = 60 + pc;
  MAJOR_SCALE.forEach((iv, i) => paintDemo(root + iv, true, i === 0));
}

function selectExplore(i) {
  selected = i;
  const svg = document.getElementById('cfSvg');
  const next = (i + 1) % 12;
  const prev = (i + 11) % 12;
  svg.querySelectorAll('.cf-node').forEach(n => {
    const j = +n.dataset.i;
    n.classList.toggle('sel', j === i);
    n.classList.toggle('nbr', j === next || j === prev);
  });

  const k = CIRCLE_FIFTHS[i];
  lightKey(k.pc);

  const info = document.getElementById('cfInfo');
  info.innerHTML = `
    <div class="cf-key">${k.major} <span style="font-size:20px;color:var(--muted)">major</span></div>
    <div class="cf-sub">relative minor — <b>${k.minor}</b></div>
    <div class="cf-sub">${k.accidentals}</div>
    <div class="cf-moves">
      <button class="cf-step" data-step="1">↻ up a fifth → ${CIRCLE_FIFTHS[next].major}</button>
      <button class="cf-step" data-step="-1">↺ up a fourth → ${CIRCLE_FIFTHS[prev].major}</button>
    </div>
    <div class="cf-hint">
      <span class="sw o"></span> root &nbsp; <span class="sw g"></span> major scale — on the piano below.
      Step around and watch the root jump by a fifth.
    </div>`;
  info.querySelectorAll('.cf-step').forEach(b => {
    b.addEventListener('click', () => selectExplore((i + (+b.dataset.step) + 12) % 12));
  });
}

function renderExplore() {
  const body = document.getElementById('cfSegBody');
  body.innerHTML = `
    <div class="label" style="margin-bottom:14px;">Circle of fifths — click a key, see it on the piano</div>
    <div class="cf-layout">
      <div class="cf-svg-col">
        <svg viewBox="0 0 360 360" id="cfSvg" role="img" aria-label="Circle of fifths">
          ${ringMarkup()}${nodesMarkup()}
        </svg>
      </div>
      <div class="cf-info" id="cfInfo"></div>
    </div>`;
  body.querySelectorAll('.cf-node').forEach(n => {
    n.addEventListener('click', () => selectExplore(+n.dataset.i));
  });
  selectExplore(selected);
}

// ---- segment switching ----
function paintSeg() {
  document.querySelectorAll('#cfSeg button').forEach(b => b.classList.toggle('active', b.dataset.seg === segment));
  stopTrainer();   // clears trainer timer/highlights
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
