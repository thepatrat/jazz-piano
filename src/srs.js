// ============================================================
//  srs.js — spaced-repetition scheduler (FSRS via ts-fsrs).
//  Type-agnostic: a SrsItem can be a chord, a voicing, or (later)
//  a scale — only the id scheme and `type` differ. The scheduler
//  treats them all identically (HANDOFF.md §5, Stage 2).
//
//  SrsItem shape stored in IndexedDB (db.srsItems):
//    { id, type, payload, card, due }
//      card  — the ts-fsrs Card (carries stability/difficulty/state/…)
//      due   — card.due mirrored as epoch-ms, for the Dexie `due` index
// ============================================================
import { fsrs, generatorParameters, createEmptyCard, Rating } from 'ts-fsrs';

// Fuzz off → deterministic intervals (easier to reason about / test).
// Flip enable_fuzz on later to spread reviews and avoid pile-ups.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

export { Rating };

// ---- stable id schemes (type is encoded in the prefix) ----
export function chordItemId(root, quality) {
  return `chord:${root}:${quality}`;
}
export function voicingItemId(root, quality, inversion) {
  return `voicing:${root}:${quality}:${inversion}`;
}
export function scaleItemId(root, scaleId) {
  return `scale:${root}:${scaleId}`;
}

// fresh item wrapping an empty FSRS card (due now)
export function newSrsItem(id, type, payload, now = new Date()) {
  const card = createEmptyCard(now);
  return { id, type, payload, card, due: card.due.getTime() };
}

// apply a grade (Rating.Again|Hard|Good|Easy); returns the updated item
export function gradeItem(item, rating, now = new Date()) {
  const { card, log } = scheduler.next(item.card, now, rating);
  return { item: { ...item, card, due: card.due.getTime() }, log };
}

// epoch-ms when each grade would next schedule the item (for UI hints)
export function previewDue(item, now = new Date()) {
  const r = scheduler.repeat(item.card, now);
  return {
    again: r[Rating.Again].card.due.getTime(),
    hard: r[Rating.Hard].card.due.getTime(),
    good: r[Rating.Good].card.due.getTime(),
    easy: r[Rating.Easy].card.due.getTime(),
  };
}

// "<1m" / "12m" / "3h" / "2d" / "1.4mo" — gap from `now` to a due time
export function humanizeUntil(dueMs, now = Date.now()) {
  const ms = Math.max(0, dueMs - now);
  const min = ms / 60000;
  if (min < 1) return '<1m';
  if (min < 60) return Math.round(min) + 'm';
  const hr = min / 60;
  if (hr < 24) return Math.round(hr) + 'h';
  const d = hr / 24;
  if (d < 30) return (d < 10 ? d.toFixed(d < 2 ? 1 : 0) : Math.round(d)) + 'd';
  const mo = d / 30;
  return mo.toFixed(1) + 'mo';
}
