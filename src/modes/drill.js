// ============================================================
//  modes/drill.js — spaced-repetition chord drilling (engine #1).
//  The prompt comes from the FSRS due queue: each (root × quality)
//  is an SrsItem. On each answer we derive a grade and reschedule.
//
//  With "Play in time" toggled on, the metronome runs and the
//  rhythm of the correct answer feeds into the FSRS grade.
// ============================================================
import { ROOTS, LEVELS, detectChord, chordMatchesTarget, chordLabel, pcName } from '../theory.js';
import { drill, activeNotes } from '../state.js';
import {
  saveDrillState, loadDrillState,
  seedSrsItems, nextSrsItem, countDue, putSrsItem, logReview,
} from '../db.js';
import {
  Rating, chordItemId, newSrsItem, gradeItem, humanizeUntil,
} from '../srs.js';
import { refreshExplain } from '../ui/explain.js';
import * as transport from '../transport.js';
import { scoreOnset, bucketEmoji, bucketToRating } from '../rhythmScore.js';

let rhythmOn = false;
let lastOnsetTime = 0;

// All chord SrsItems for a level
function levelItems(level) {
  const items = [];
  for (const root of ROOTS) {
    for (const quality of LEVELS[level]) {
      const id = chordItemId(root, quality);
      items.push(newSrsItem(id, 'chord', { root, quality }));
    }
  }
  return items;
}
function levelIds(level) { return levelItems(level).map(i => i.id); }

function updateStats() {
  document.getElementById('sCorrect').textContent = drill.correct;
  document.getElementById('sStreak').textContent = drill.streak;
  document.getElementById('sTotal').textContent = drill.total;
}

async function refreshDueCount() {
  const n = await countDue(levelIds(drill.level));
  document.getElementById('sDue').textContent = n;
}

function persist() {
  saveDrillState({
    level: drill.level,
    correct: drill.correct,
    streak: drill.streak,
    total: drill.total,
  });
}

// derive an FSRS grade from how the user answered + optional rhythm
function gradeFor(elapsedMs, hadError, rhythmBucket) {
  let base;
  if (hadError) base = Rating.Hard;
  else if (elapsedMs < 2500) base = Rating.Easy;
  else if (elapsedMs <= 6000) base = Rating.Good;
  else base = Rating.Hard;

  if (!rhythmOn || rhythmBucket === 'none') return base;
  // rhythm modifies the grade: miss caps at Hard, perfect nudges toward Easy
  const rhythmRating = bucketToRating(rhythmBucket);
  return Math.min(base, rhythmRating); // take the worse of the two
}

// ---- transport controls ----
function startMetronome() {
  const bpmEl = document.getElementById('drillBpm');
  const bpm = bpmEl ? parseInt(bpmEl.value, 10) || 80 : 80;
  transport.start(bpm);
}

function stopMetronome() {
  transport.stop();
}

function toggleRhythm() {
  const cb = document.getElementById('drillRhythm');
  rhythmOn = cb?.checked || false;
  const bpmGroup = document.getElementById('drillBpmGroup');
  if (bpmGroup) bpmGroup.style.display = rhythmOn ? 'flex' : 'none';
  if (rhythmOn) startMetronome();
  else stopMetronome();
}

// ---- store the timestamp of the most recent note-on ----
export function drillNoteOnTimestamp(timestamp) {
  lastOnsetTime = timestamp;
}

// ---- core drill flow ----
export async function nextDrill() {
  drill.level = document.getElementById('drillLevel').value;
  await seedSrsItems(levelItems(drill.level));
  const item = await nextSrsItem(levelIds(drill.level));
  drill.currentItem = item;
  drill.target = item ? item.payload : null;
  drill.answered = false;
  drill.hadError = false;
  drill.promptStart = performance.now();

  const tEl = document.getElementById('drillTarget');
  tEl.textContent = drill.target ? chordLabel(drill.target) : '—';
  tEl.className = 'big';
  document.getElementById('drillFeedback').textContent = '';
  document.getElementById('drillNotes').textContent = '';
  persist();
  await refreshDueCount();
  refreshExplain();

  if (rhythmOn && !transport.isRunning()) startMetronome();
}

export async function checkDrill() {
  if (drill.answered || !drill.currentItem) return;
  const notes = [...activeNotes];
  document.getElementById('drillNotes').textContent =
    notes.length ? notes.sort((a, b) => a - b).map(n => pcName(n % 12)).join(' ') : '';
  const t = drill.target;
  const tEl = document.getElementById('drillTarget');
  const fb = document.getElementById('drillFeedback');

  if (chordMatchesTarget(notes, t)) {
    drill.answered = true;
    const elapsed = performance.now() - drill.promptStart;
    const rhythm = rhythmOn ? scoreOnset(lastOnsetTime) : { bucket: 'none' };
    const rating = gradeFor(elapsed, drill.hadError, rhythm.bucket);
    await reviewCurrent(rating);

    drill.correct++;
    drill.streak++;
    drill.total++;
    tEl.className = 'big flash-ok';
    const when = humanizeUntil(drill.currentItem.due);
    const rhythmTag = rhythmOn && rhythm.bucket !== 'none' ? ` ${bucketEmoji(rhythm.bucket)}` : '';
    fb.textContent = `✓ ${chordLabel(t)} — next in ${when}${rhythmTag}`;
    updateStats();
    persist();
    await refreshDueCount();
    setTimeout(nextDrill, 900);
  } else {
    const c = detectChord(notes);
    if (!c) return;
    drill.hadError = true;
    tEl.className = 'big flash-no';
    fb.textContent = 'that\'s ' + chordLabel(c) + ' — try again';
  }
}

async function reviewCurrent(rating) {
  const { item, log } = gradeItem(drill.currentItem, rating);
  drill.currentItem = item;
  await putSrsItem(item);
  await logReview({
    itemId: item.id, ts: Date.now(), rating,
    state: log.state, stability: log.stability, difficulty: log.difficulty,
  });
}

export async function skipDrill() {
  if (drill.currentItem && !drill.answered) {
    drill.answered = true;
    await reviewCurrent(Rating.Again);
    drill.streak = 0;
    drill.total++;
    updateStats();
    persist();
  }
  nextDrill();
}

// called when leaving Drill mode
export function stopDrill() {
  if (rhythmOn) stopMetronome();
}

// Restore persisted stats/level, wire controls, then load the first prompt.
export async function initDrill() {
  const saved = await loadDrillState();
  if (saved) {
    drill.level = saved.level || drill.level;
    drill.correct = saved.correct || 0;
    drill.streak = saved.streak || 0;
    drill.total = saved.total || 0;
  }
  const sel = document.getElementById('drillLevel');
  sel.value = drill.level;
  updateStats();

  sel.addEventListener('change', nextDrill);
  document.getElementById('drillSkip').addEventListener('click', skipDrill);
  document.getElementById('drillRhythm')?.addEventListener('change', toggleRhythm);
  document.getElementById('drillBpm')?.addEventListener('change', () => {
    if (rhythmOn && transport.isRunning()) {
      transport.setBpm(parseInt(document.getElementById('drillBpm').value, 10) || 80);
    }
  });
}
