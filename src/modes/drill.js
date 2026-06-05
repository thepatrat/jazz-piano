// ============================================================
//  modes/drill.js — spaced-repetition chord drilling (engine #1).
//  The prompt now comes from the FSRS due queue (HANDOFF.md §5,
//  Stage 2): each (root × quality) is an SrsItem. On each answer we
//  derive a grade from performance and let FSRS reschedule it.
//
//   skip / gave up  → Again
//   correct, slow / after a wrong try → Hard
//   correct in time → Good
//   correct & fast  → Easy
//
//  Session stats (correct/streak/attempts/level) persist via kv;
//  per-item schedules persist in the srsItems store.
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

// All chord SrsItems for a level (used for seeding and for the id pool).
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
function levelIds(level) {
  return levelItems(level).map(i => i.id);
}

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

// derive an FSRS grade from how the user answered
function gradeFor(elapsedMs, hadError) {
  if (hadError) return Rating.Hard;
  if (elapsedMs < 2500) return Rating.Easy;
  if (elapsedMs <= 6000) return Rating.Good;
  return Rating.Hard;
}

// Pull the next due item for the current level and show it.
export async function nextDrill() {
  drill.level = document.getElementById('drillLevel').value;
  await seedSrsItems(levelItems(drill.level)); // ensure pool exists
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
}

export async function checkDrill() {
  if (drill.answered || !drill.currentItem) return;
  const notes = [...activeNotes];
  document.getElementById('drillNotes').textContent =
    notes.length ? notes.sort((a, b) => a - b).map(n => pcName(n % 12)).join(' ') : '';
  const t = drill.target;
  const tEl = document.getElementById('drillTarget');
  const fb = document.getElementById('drillFeedback');

  // judge by the target's notes, not the detector's name (handles ambiguous sets)
  if (chordMatchesTarget(notes, t)) {
    drill.answered = true;
    const elapsed = performance.now() - drill.promptStart;
    const rating = gradeFor(elapsed, drill.hadError);
    await reviewCurrent(rating);

    drill.correct++;
    drill.streak++;
    drill.total++;
    tEl.className = 'big flash-ok';
    const when = humanizeUntil(drill.currentItem.due);
    fb.textContent = `✓ ${chordLabel(t)} — next in ${when}`;
    updateStats();
    persist();
    await refreshDueCount();
    setTimeout(nextDrill, 900);
  } else {
    // a complete, valid *different* chord → "try again" and remember the slip
    const c = detectChord(notes);
    if (!c) return;
    drill.hadError = true;
    tEl.className = 'big flash-no';
    fb.textContent = 'that\'s ' + chordLabel(c) + ' — try again';
  }
}

// grade + persist the current item, and append to the review log
async function reviewCurrent(rating) {
  const { item, log } = gradeItem(drill.currentItem, rating);
  drill.currentItem = item;
  await putSrsItem(item);
  await logReview({
    itemId: item.id,
    ts: Date.now(),
    rating,
    state: log.state,
    stability: log.stability,
    difficulty: log.difficulty,
  });
}

// "Skip" = couldn't play it → grade Again, reset streak, move on.
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
}
