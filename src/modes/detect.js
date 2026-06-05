// ============================================================
//  modes/detect.js — live chord identification (engine #1).
// ============================================================
import { detectChord, chordLabel, pcName } from '../theory.js';
import { activeNotes } from '../state.js';

export function renderDetect() {
  const notes = [...activeNotes].sort((a, b) => a - b);
  const c = detectChord(notes);
  const big = document.getElementById('chordName');
  big.textContent = c ? chordLabel(c) : (notes.length >= 2 ? '?' : '—');
  document.getElementById('notesPlayed').textContent =
    notes.length ? notes.map(n => pcName(n % 12) + (Math.floor(n / 12) - 1)).join('  ') : 'play 3+ notes';
}
