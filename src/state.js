// ============================================================
//  state.js — shared mutable app state.
//  Single source of truth for things multiple modes read/write.
//  Mutate the object properties; don't reassign the exports.
// ============================================================

// MIDI notes currently held down (MIDI note numbers)
export const activeNotes = new Set();

// app-wide UI state
export const app = {
  mode: 'detect',       // 'detect' | 'drill' | 'exercises'
  explainOpen: false,
};

// Drill mode state (session stats persisted to IndexedDB, see db.js).
// The chord to play now comes from the SRS due queue, not a random reroll.
export const drill = {
  target: null,        // { root, quality } — derived from currentItem.payload
  currentItem: null,   // the SrsItem being reviewed
  promptStart: 0,      // performance.now() when the prompt was shown (for grading)
  hadError: false,     // played a wrong complete chord before getting it right
  level: 'sevenths',
  correct: 0,
  streak: 0,
  total: 0,
  answered: false,
};

// Exercise runner state
export const exState = {
  module: null,
  seq: [],
  idx: 0,
  revealed: false,
};
