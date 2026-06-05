// ============================================================
//  modes/scales.js — Scale practice mode.
//  Uses engine #3 (scaleEngine): play a scale ascending one octave
//  then descending, starting on any octave. The next expected key
//  glows on the keyboard; correct → advance, wrong → flash.
//  Each (root × scaleId) is an SRS item (type:'scale').
// ============================================================
import { SCALE_DEFS, ROOTS, NOTE_NAMES, pcName } from '../theory.js';
import { activeNotes } from '../state.js';
import * as engine from '../scaleEngine.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';
import {
  scaleItemId, newSrsItem, gradeItem, Rating, humanizeUntil,
} from '../srs.js';
import { seedSrsItems, nextSrsItem, countDue, putSrsItem, logReview } from '../db.js';

let promptStart = 0;
let hadError = false;
let currentItem = null;
let target = null;        // { rootPc, scaleId }
let selectedScale = 'major';

// ---- SRS pool ----
function poolItems() {
  const items = [];
  for (const root of ROOTS) {
    const id = scaleItemId(root, selectedScale);
    items.push(newSrsItem(id, 'scale', { root, scaleId: selectedScale }));
  }
  return items;
}
function poolIds() { return poolItems().map(i => i.id); }

// ---- keyboard highlight ----
function highlightNext() {
  clearDemo();
  const s = engine.state();
  if (!s.active || s.done || s.cursor >= s.sequence.length) return;
  const next = s.sequence[s.cursor];
  paintDemo(next, true, false);
  // also show where we are in the sequence: light completed notes dimly
  // (reuse .demo for the next note — it's green, which reads as "play this")
}

// ---- note dispatch (called from main.js on every note-on) ----
export function scaleNoteOn(midiNote) {
  const s = engine.state();
  if (!s.active || s.done) return;
  const result = engine.noteOn(midiNote);
  if (result.event === 'wrong-start') {
    // flash feedback
    document.getElementById('scFeedback').textContent = `Start on ${pcName(target.rootPc)} (any octave)`;
    return;
  }
  if (result.event === 'correct') {
    highlightNext();
    updateProgress();
    return;
  }
  if (result.event === 'wrong') {
    hadError = true;
    document.getElementById('scFeedback').textContent = 'wrong note — keep going';
    document.getElementById('scFeedback').style.color = 'var(--wrong)';
    setTimeout(() => {
      const fb = document.getElementById('scFeedback');
      if (fb) { fb.textContent = ''; fb.style.color = ''; }
    }, 600);
    return;
  }
  if (result.event === 'complete') {
    clearDemo();
    finishRun();
  }
}

// ---- grading + SRS ----
async function finishRun() {
  const elapsed = performance.now() - promptStart;
  const s = engine.state();
  const rating = s.errors > 3 ? Rating.Again
    : s.errors > 0 || hadError ? Rating.Hard
    : elapsed < 8000 ? Rating.Easy
    : Rating.Good;
  const { item, log } = gradeItem(currentItem, rating);
  currentItem = item;
  await putSrsItem(item);
  await logReview({ itemId: item.id, ts: Date.now(), rating, state: log.state, stability: log.stability, difficulty: log.difficulty });

  const when = humanizeUntil(item.due);
  const fb = document.getElementById('scFeedback');
  fb.textContent = `✓ ${s.errors === 0 ? 'Clean run!' : s.errors + ' error' + (s.errors > 1 ? 's' : '')} — next in ${when}`;
  fb.style.color = 'var(--accent2)';
  updateDueCount();
  setTimeout(nextScale, 1200);
}

// ---- advance to next due scale ----
export async function nextScale() {
  await seedSrsItems(poolItems());
  const item = await nextSrsItem(poolIds());
  currentItem = item;
  target = item ? item.payload : null;
  hadError = false;
  promptStart = performance.now();

  if (target) engine.start(target.root, target.scaleId);

  const el = document.getElementById('scTarget');
  el.textContent = target ? `${pcName(target.root)} ${SCALE_DEFS.find(d => d.id === target.scaleId)?.name || target.scaleId}` : '—';
  el.className = 'big';
  el.style.fontSize = '42px';
  document.getElementById('scFeedback').textContent = target ? `Play ascending then descending — start on ${pcName(target.root)}` : '';
  document.getElementById('scFeedback').style.color = '';
  highlightNext();
  updateProgress();
  updateDueCount();
}

function skipScale() {
  if (currentItem && !engine.state().done) {
    const { item, log } = gradeItem(currentItem, Rating.Again);
    currentItem = item;
    putSrsItem(item);
    logReview({ itemId: item.id, ts: Date.now(), rating: Rating.Again, state: log.state, stability: log.stability, difficulty: log.difficulty });
  }
  nextScale();
}

// ---- progress + due ----
function updateProgress() {
  const s = engine.state();
  const el = document.getElementById('scProgress');
  if (!el) return;
  if (s.total === 0) { el.textContent = ''; return; }
  const pct = Math.round((s.cursor / s.total) * 100);
  el.textContent = `${s.cursor} / ${s.total} notes · ${pct}%`;
}
async function updateDueCount() {
  const n = await countDue(poolIds());
  const el = document.getElementById('scDue');
  if (el) el.textContent = n;
}

// ---- render ----
export async function renderScales() {
  const view = document.getElementById('scalesView');
  const scaleOpts = SCALE_DEFS.map(d =>
    `<option value="${d.id}" ${d.id === selectedScale ? 'selected' : ''}>${d.name}</option>`).join('');
  view.innerHTML = `
    <div class="label">Play the scale — up one octave, then down</div>
    <div class="big" id="scTarget" style="font-size:42px">—</div>
    <div class="prompt-target" id="scFeedback"></div>
    <div class="notes-played" id="scProgress"></div>
    <div class="drill-stats">
      <div><b id="scDue">0</b>due now</div>
    </div>
    <div class="controls">
      <select id="scScaleSelect">${scaleOpts}</select>
      <button id="scSkip">Skip ⟳</button>
    </div>`;

  document.getElementById('scScaleSelect').addEventListener('change', e => {
    selectedScale = e.target.value;
    nextScale();
  });
  document.getElementById('scSkip').addEventListener('click', skipScale);

  await nextScale();
}

export function stopScales() {
  engine.reset();
  clearDemo();
}
