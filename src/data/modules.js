// ============================================================
//  EXERCISE MODULES (built-in)
//  The same object shape covers every encoding level (HANDOFF.md §1):
//    level 0 = link + description only
//    level 2 = a `generate()` that expands into a drill sequence
//  Upgrading a module = filling in more fields. Nothing restructures.
//
//  NOTE (HANDOFF.md §6): source URLs / videoIds below are placeholders.
//  Swap in the real Keithson / Mangold links when available.
// ============================================================
import { CIRCLE_OF_FOURTHS, INV_NAMES, drop2Voicing } from '../theory.js';

export const EXERCISE_MODULES = [
  {
    id: 'keithson-drop2',
    title: 'Drop 2 voicings — major triads',
    level: 2,
    voicingMode: true,
    source: { label: 'Michael Keithson — My Favourite Piano Technique', url: 'https://www.youtube.com' },
    videoId: 'NB4MoWjW-Tw',
    desc: 'Take a closed triad and drop the second-from-top note down an octave — instantly richer, more pro sound. This drills Stages 1–3: C, F, G major in all three positions, then the same shapes in F major (F, Bb, C). Checks the actual voicing shape, not just the chord name.',
    generate() {
      const seq = [];
      const sets = [
        { label: 'Key of C', roots: [{ pc: 0, n: 'C' }, { pc: 5, n: 'F' }, { pc: 7, n: 'G' }] },
        { label: 'Key of F', roots: [{ pc: 5, n: 'F' }, { pc: 10, n: 'Bb' }, { pc: 0, n: 'C' }] },
      ];
      for (const set of sets) {
        for (const r of set.roots) {
          for (let inv = 0; inv < 3; inv++) {
            seq.push({
              root: r.pc,
              quality: 'maj',
              inversion: inv,
              voicing: drop2Voicing('maj', inv),
              label: `${r.n} major — Drop 2, ${INV_NAMES[inv]}`,
              tag: set.label,
            });
          }
        }
      }
      return seq;
    },
  },
  {
    id: 'mangold-251',
    title: 'ii–V–I in all 12 keys',
    level: 2,
    source: { label: 'Mangold Project — Jazz Piano', url: 'https://www.youtube.com/watch?v=NB4MoWjW-Tw' },
    videoId: 'NB4MoWjW-Tw',
    desc: 'The single most important jazz progression. Play Dm7 → G7 → Cmaj7, then move the whole thing through every key around the circle of fourths. This module generates the full sequence and drills you chord by chord.',
    generate() {
      const seq = [];
      for (const key of CIRCLE_OF_FOURTHS) {
        seq.push({ root: (key + 2) % 12, quality: 'm7',   tag: 'ii' });
        seq.push({ root: (key + 7) % 12, quality: '7',    tag: 'V' });
        seq.push({ root: key,            quality: 'maj7', tag: 'I' });
      }
      return seq;
    },
  },
  {
    id: 'example-link-only',
    title: 'Rootless voicings (watch + practice)',
    level: 0,
    source: { label: 'Example — link-only module', url: 'https://www.youtube.com/watch?v=NB4MoWjW-Tw' },
    videoId: 'NB4MoWjW-Tw',
    desc: 'A Level-0 module: just the embedded video plus a note on what to practice. No generated drill yet — but you could "upgrade" this later by encoding the voicing shapes. Watch, then try the left-hand 3-7-9 shells in a few keys.',
  },
];
