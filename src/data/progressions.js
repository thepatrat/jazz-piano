// ============================================================
//  CIRCLE-OF-FIFTHS PROGRESSIONS (built-in)
//  Stored TONIC-RELATIVE so they transpose to any starting key:
//  each step = semitones above the tonic + chord quality + roman numeral.
//  materialize(prog, tonicPc) turns it into concrete chords on the circle.
//
//  Source: gospel "stacking fourths" lesson — start on I, drop to the vi,
//  then walk back home by fourths (a cascade of plagal moves).
// ============================================================
import { chordPlacement } from '../ui/circleGeom.js';

const I    = { semitone: 0,  quality: 'maj', numeral: 'I' };
const vi   = { semitone: 9,  quality: 'm',   numeral: 'vi' };
const IV   = { semitone: 5,  quality: 'maj', numeral: 'IV' };
const bVII = { semitone: 10, quality: 'maj', numeral: '♭VII' };
const bIII = { semitone: 3,  quality: 'maj', numeral: '♭III' };
const bVI  = { semitone: 8,  quality: 'maj', numeral: '♭VI' };

export const PROGRESSIONS = [
  { id: 'stack-1', title: 'Stacking 1 — I · vi · IV · I',                    steps: [I, vi, IV, I] },
  { id: 'stack-2', title: 'Stacking 2 — I · vi · ♭VII · IV · I',             steps: [I, vi, bVII, IV, I] },
  { id: 'stack-3', title: 'Stacking 3 — I · vi · ♭III · ♭VII · IV · I',      steps: [I, vi, bIII, bVII, IV, I] },
  { id: 'stack-4', title: 'Stacking 4 — I · vi · ♭VI · ♭III · ♭VII · IV · I', steps: [I, vi, bVI, bIII, bVII, IV, I] },
];

// flat-friendly note names (gospel keys lean flat)
const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
export function noteName(pc) { return NAMES[((pc % 12) + 12) % 12]; }

// turn a tonic-relative progression into concrete chords on the circle
export function materialize(prog, tonicPc) {
  return prog.steps.map(s => {
    const root = (tonicPc + s.semitone) % 12;
    const place = chordPlacement(root, s.quality);
    return {
      root,
      quality: s.quality,
      numeral: s.numeral,
      index: place.index,
      inner: place.inner,
      label: noteName(root) + (s.quality === 'm' ? 'm' : ''),
    };
  });
}
