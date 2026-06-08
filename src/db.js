// ============================================================
//  db.js — IndexedDB persistence via Dexie.
//  Stage 1: state survives reloads (works only when run locally /
//  on a dev server — NOT in the sandboxed artifact viewer; see
//  HANDOFF.md §1).
//
//  Stores are declared now for the whole roadmap (HANDOFF.md §4),
//  even though Stage 1 only writes to `kv`. Later stages fill in
//  srsItems / reviewLog / plans / songs / modules.
// ============================================================
import Dexie from 'dexie';

export const db = new Dexie('comp-trainer');

db.version(1).stores({
  // roadmap stores (HANDOFF.md §4) — primary keys (and a few indexes) only
  songs: 'id',
  modules: 'id',
  plans: 'id',
  srsItems: 'id, due, type',
  reviewLog: '++id, itemId, ts',
  // generic key-value store for app state & prefs (drill stats, exercise
  // progress, last mode, etc.). Each row: { key, value }.
  kv: 'key',
});

// ---- generic key-value helpers ----
export async function kvGet(key, fallback = null) {
  try {
    const row = await db.kv.get(key);
    return row ? row.value : fallback;
  } catch (e) {
    console.warn('kvGet failed for', key, e);
    return fallback;
  }
}

export async function kvSet(key, value) {
  try {
    await db.kv.put({ key, value });
  } catch (e) {
    console.warn('kvSet failed for', key, e);
  }
}

// ---- typed convenience wrappers ----

const DRILL_KEY = 'drill';
const MODE_KEY = 'app:mode';
const exKey = (moduleId) => `exercise:${moduleId}`;

// Drill stats + chosen level. payload: {level, correct, streak, total}
export function saveDrillState({ level, correct, streak, total }) {
  return kvSet(DRILL_KEY, { level, correct, streak, total });
}
export function loadDrillState() {
  return kvGet(DRILL_KEY, null);
}

// Last selected mode, so reloads return where you left off.
export function saveMode(mode) {
  return kvSet(MODE_KEY, mode);
}
export function loadMode() {
  return kvGet(MODE_KEY, 'detect');
}

// Per-module exercise progress (current step index).
export function saveExerciseProgress(moduleId, idx) {
  return kvSet(exKey(moduleId), { idx });
}
export async function loadExerciseProgress(moduleId) {
  const row = await kvGet(exKey(moduleId), null);
  return row ? row.idx : 0;
}

// ---- SRS items + review log (Stage 2) ----

export function putSrsItem(item) {
  return db.srsItems.put(item);
}

// Insert any items whose id isn't already stored. Returns count created.
export async function seedSrsItems(items) {
  const existing = await db.srsItems.bulkGet(items.map(i => i.id));
  const missing = items.filter((_, i) => !existing[i]);
  if (missing.length) await db.srsItems.bulkAdd(missing);
  return missing.length;
}

// The next item to review from a given id pool: the most-overdue due item,
// or — if nothing is due — the soonest-due one, so practice never stalls.
export async function nextSrsItem(ids, now = Date.now()) {
  const rows = (await db.srsItems.bulkGet(ids)).filter(Boolean);
  if (!rows.length) return null;
  const due = rows.filter(r => r.due <= now).sort((a, b) => a.due - b.due);
  return (due.length ? due : rows.sort((a, b) => a.due - b.due))[0];
}

// How many of the given ids are due right now.
export async function countDue(ids, now = Date.now()) {
  const rows = (await db.srsItems.bulkGet(ids)).filter(Boolean);
  return rows.filter(r => r.due <= now).length;
}

export function logReview(entry) {
  return db.reviewLog.add(entry);
}

// ---- Plan / roadmap progress (Stage 4) ----
// One kv row keyed by node id: { [nodeId]: { practiced, lastTs, mastered } }.
const PLAN_PROGRESS_KEY = 'plan:progress';

export function loadPlanProgress() {
  return kvGet(PLAN_PROGRESS_KEY, {});
}
export function savePlanProgress(progress) {
  return kvSet(PLAN_PROGRESS_KEY, progress);
}

// ---- Find the Key: locally-curated answers (per browser) ----
// Map of YouTube videoId -> { keyPc, keyMode, preferFlat }. Layered over the
// shipped KEY_BY_VIDEO at runtime; Export turns it into source to share.
const FINDKEY_ANSWERS_KEY = 'findkey:answers';

export function loadFindKeyAnswers() {
  return kvGet(FINDKEY_ANSWERS_KEY, {});
}
export function saveFindKeyAnswers(map) {
  return kvSet(FINDKEY_ANSWERS_KEY, map);
}
