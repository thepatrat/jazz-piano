// ============================================================
//  theory.js — pure music theory. No DOM, no state.
//  Two matching engines live here (see HANDOFF.md §1):
//   1. detectChord()  — pitch-class set matching ("what chord is this?")
//   2. matchVoicing() — octave-agnostic shape matching ("did you play THIS voicing?")
//  Keep both; do not unify.
// ============================================================

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLATS = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

// ---- chord dictionary: interval set (semitones from root) -> quality ----
export const CHORD_DEFS = [
  // sevenths / extensions first (more specific), checked by exact set match
  { q: 'maj7',  iv: [0, 4, 7, 11] },
  { q: '7',     iv: [0, 4, 7, 10] },
  { q: 'm7',    iv: [0, 3, 7, 10] },
  { q: 'm7b5',  iv: [0, 3, 6, 10] },
  { q: 'dim7',  iv: [0, 3, 6, 9] },
  { q: 'mMaj7', iv: [0, 3, 7, 11] },
  { q: '6',     iv: [0, 4, 7, 9] },
  { q: 'm6',    iv: [0, 3, 7, 9] },
  { q: 'add9',  iv: [0, 2, 4, 7] },
  { q: '9',     iv: [0, 2, 4, 7, 10] },
  { q: 'maj',   iv: [0, 4, 7] },
  { q: 'm',     iv: [0, 3, 7] },
  { q: 'dim',   iv: [0, 3, 6] },
  { q: 'aug',   iv: [0, 4, 8] },
  { q: 'sus4',  iv: [0, 5, 7] },
  { q: 'sus2',  iv: [0, 2, 7] },
  { q: '5',     iv: [0, 7] },
];

// interval semitone -> [degree label, role text]
export const IV_NAMES = {
  0: ['1', 'root'], 2: ['9', 'ninth'], 3: ['♭3', 'minor third'], 4: ['3', 'major third'],
  5: ['11', 'perfect fourth'], 6: ['♭5', 'flat fifth'], 7: ['5', 'perfect fifth'],
  8: ['♯5', 'sharp fifth'], 9: ['6', 'major sixth'], 10: ['♭7', 'minor seventh'], 11: ['7', 'major seventh'],
};

// human description per quality
export const CHORD_INFO = {
  'maj':   { name: 'Major triad',          desc: 'Bright, stable, "happy". The bedrock chord — a major third stacked with a minor third on top.' },
  'm':     { name: 'Minor triad',          desc: 'Darker, "sad" colour. Flip the thirds: minor third on the bottom, major third on top.' },
  'dim':   { name: 'Diminished triad',     desc: 'Tense and unstable. Two minor thirds stacked — wants to resolve.' },
  'aug':   { name: 'Augmented triad',      desc: 'Dreamy, suspended-in-air. Two major thirds stacked, splitting the octave evenly.' },
  'maj7':  { name: 'Major 7th',            desc: 'Lush, warm, the signature "jazzy" sound. A major triad with a major 7th on top. Your I chord (e.g. Cmaj7).' },
  '7':     { name: 'Dominant 7th',         desc: 'The engine of jazz. Major triad + a ♭7. Restless — it pulls toward the chord a fifth below. The V in a ii–V–I.' },
  'm7':    { name: 'Minor 7th',            desc: 'Smooth and mellow. Minor triad + ♭7. The ii chord in a ii–V–I (e.g. Dm7).' },
  'm7b5':  { name: 'Half-diminished (m7♭5)', desc: 'Moody. A diminished triad with a ♭7. The ii chord in a minor key ii–V–i.' },
  'dim7':  { name: 'Diminished 7th',       desc: 'Maximally tense — four notes evenly spaced a minor third apart. A common passing/leading chord.' },
  'mMaj7': { name: 'Minor-major 7th',      desc: 'Eerie, cinematic. Minor triad with a major 7th — that one clashing top note does the work.' },
  '6':     { name: 'Major 6th',            desc: 'Sweet, vintage. Major triad with an added 6th instead of a 7th. Common as a I chord ending.' },
  'm6':    { name: 'Minor 6th',            desc: 'Bittersweet. Minor triad with a natural 6th on top.' },
  'add9':  { name: 'Add 9',                desc: 'Open and modern. A plain triad with the 9th added, no 7th in between.' },
  '9':     { name: 'Dominant 9th',         desc: 'A dominant 7th with the 9th stacked on — fuller, funkier extension of the V chord.' },
  'sus4':  { name: 'Suspended 4th',        desc: 'The third is replaced by the 4th — neither major nor minor, hanging, wants to resolve down to the 3rd.' },
  'sus2':  { name: 'Suspended 2nd',        desc: 'Third replaced by the 2nd — open and airy.' },
  '5':     { name: 'Power chord (5)',      desc: 'Just root + fifth, no third. Hollow and neutral.' },
};

export const INV_NAMES = ['root position', '1st inversion', '2nd inversion'];

// ============================================================
//  SCALE DEFINITIONS — interval sets (semitones from root)
//  Used by the Scales mode (engine #3: sequential matcher) and
//  by the Circle of Fifths to highlight a key's notes on the piano.
// ============================================================
export const SCALE_DEFS = [
  { id: 'major',         name: 'Major (Ionian)',      iv: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'natural-minor', name: 'Natural minor (Aeolian)', iv: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'dorian',        name: 'Dorian',              iv: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'mixolydian',    name: 'Mixolydian',           iv: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'pentatonic-maj', name: 'Major pentatonic',    iv: [0, 2, 4, 7, 9] },
  { id: 'pentatonic-min', name: 'Minor pentatonic',    iv: [0, 3, 5, 7, 10] },
  { id: 'blues',         name: 'Blues',                iv: [0, 3, 5, 6, 7, 10] },
  { id: 'harmonic-minor', name: 'Harmonic minor',      iv: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic-minor', name: 'Melodic minor (asc)',  iv: [0, 2, 3, 5, 7, 9, 11] },
];

export const CIRCLE_OF_FOURTHS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7]; // C F Bb Eb Ab Db Gb B E A D G

// drill roots, chromatic but starting from the white keys
export const ROOTS = [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10];

export const LEVELS = {
  triads: ['maj', 'm', 'dim', 'aug'],
  sevenths: ['maj7', 'm7', '7', 'm7b5', 'dim7'],
  all: ['maj', 'm', 'dim', 'aug', 'maj7', 'm7', '7', 'm7b5', 'dim7', '6', 'm6', 'sus4', 'sus2', 'add9'],
};

// ============================================================
//  VOICING ENGINE (octave-aware, unlike detectChord)
//  A voicing = an ordered list of absolute semitone offsets from
//  its lowest note. We match the SHAPE: the played notes, reduced
//  to offsets-from-bottom, must equal the target offsets.
// ============================================================

// closed-position triad pitch-classes (intervals from root) per inversion
export function closedTriad(quality, inversion) {
  const def = CHORD_DEFS.find(d => d.q === quality);
  const base = def.iv.slice();           // e.g. maj = [0,4,7]
  const n = base.length;
  const voiced = [];
  for (let i = 0; i < n; i++) {
    let semi = base[(inversion + i) % n];
    if ((inversion + i) >= n) semi += 12; // each wrap past the top adds 12
    voiced.push(semi);
  }
  const lo = Math.min(...voiced);
  return voiced.map(v => v - lo).sort((a, b) => a - b);
}

// Drop 2: take 2nd-from-top note, drop an octave, renormalise
export function drop2(closed) {
  const sorted = [...closed].sort((a, b) => a - b);
  if (sorted.length < 3) return sorted;
  const secondFromTop = sorted[sorted.length - 2];
  const dropped = sorted.map(v => v === secondFromTop ? v - 12 : v);
  const lo = Math.min(...dropped);
  return dropped.map(v => v - lo).sort((a, b) => a - b);
}

// produce the target voicing offsets for a Drop2 step
export function drop2Voicing(quality, inversion) {
  return drop2(closedTriad(quality, inversion));
}

// octave-agnostic shape match: played notes -> offsets from lowest
export function matchVoicing(midiNotes, targetOffsets) {
  if (midiNotes.length !== targetOffsets.length) return false;
  const sorted = [...midiNotes].sort((a, b) => a - b);
  const lo = sorted[0];
  const offs = sorted.map(n => n - lo);
  return offs.every((v, i) => v === targetOffsets[i]);
}

// reconstruct the ordered pitch classes of a Drop2 voicing for display
export function voicingPitchClasses(step) {
  const def = CHORD_DEFS.find(d => d.q === step.quality);
  const n = def.iv.length;
  let voiced = [];
  for (let i = 0; i < n; i++) {
    let semi = def.iv[(step.inversion + i) % n];
    if ((step.inversion + i) >= n) semi += 12;
    voiced.push(semi);
  }
  // drop 2nd from top
  voiced.sort((a, b) => a - b);
  const secondFromTop = voiced[voiced.length - 2];
  voiced = voiced.map(v => v === secondFromTop ? v - 12 : v).sort((a, b) => a - b);
  return voiced.map(semi => (step.root + semi + 120) % 12);
}

// ---- detection: match pitch-class set, preferring the BASS note as root ----
// Many sets have two valid readings (e.g. A-C-E-G is both Am7 and C6). We try
// the played bass note as the root first so a root-position chord is named the
// way it's played, then fall back to scanning the rest in ascending order.
export function detectChord(midiNotes) {
  if (midiNotes.length < 2) return null;
  const pcs = [...new Set(midiNotes.map(n => n % 12))].sort((a, b) => a - b);
  const bassPc = Math.min(...midiNotes) % 12;
  const roots = [bassPc, ...pcs.filter(pc => pc !== bassPc)];
  for (const root of roots) {
    const intervals = pcs.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);
    for (const def of CHORD_DEFS) {
      if (intervals.length === def.iv.length && def.iv.every((v, i) => v === intervals[i])) {
        return { root, quality: def.q };
      }
    }
  }
  return null;
}

// pitch-class set of a chord {root, quality}
export function chordPitchClasses(root, quality) {
  const def = CHORD_DEFS.find(d => d.q === quality);
  return def ? new Set(def.iv.map(iv => (root + iv) % 12)) : new Set();
}

// exact match: played pitch classes === target's, any inversion/octave.
// Used by Drill/Exercises so the hinted chord always registers regardless of
// the detector's preferred name for an ambiguous set.
export function chordMatchesTarget(midiNotes, target) {
  if (!target) return false;
  const want = chordPitchClasses(target.root, target.quality);
  const have = new Set(midiNotes.map(n => n % 12));
  if (want.size !== have.size) return false;
  for (const pc of want) if (!have.has(pc)) return false;
  return true;
}

// tolerant match for progression training: the target triad is a subset of what
// you played AND the bass note is the chord's root. Lets rich 7th/9th voicings
// over a simple root count as that chord.
export function progressionChordMatches(midiNotes, { root, quality }) {
  if (midiNotes.length < 3) return false;
  if (Math.min(...midiNotes) % 12 !== root) return false;
  const def = CHORD_DEFS.find(d => d.q === quality);
  if (!def) return false;
  const triad = def.iv.slice(0, 3).map(iv => (root + iv) % 12);
  const have = new Set(midiNotes.map(n => n % 12));
  return triad.every(pc => have.has(pc));
}

export function pcName(pc, preferFlat = false) {
  const sharp = NOTE_NAMES[pc];
  return preferFlat && FLATS[sharp] ? FLATS[sharp] : sharp;
}

export function chordLabel(c) {
  if (!c) return null;
  const name = pcName(c.root);
  const suffix = c.quality === 'maj' ? '' : c.quality;
  return name + suffix;
}

// ============================================================
//  NOTATION HELPERS (Stage 5 — Play mode)
//  Pure conversions: MIDI/quality → VexFlow tokens + chord text,
//  plus a difficulty-driven chord simplifier (also reusable by the
//  roadmap later). No DOM, no VexFlow import — just strings.
// ============================================================

// Beats (in quarter-note units, 4/4) → { duration, dots } for VexFlow.
export function beatsToDuration(beats) {
  const table = [
    [4, 'w', 0], [3, 'h', 1], [2, 'h', 0], [1.5, 'q', 1],
    [1, 'q', 0], [0.75, '8', 1], [0.5, '8', 0], [0.25, '16', 0],
  ];
  let best = table[4]; // default quarter
  let bestErr = Infinity;
  for (const row of table) {
    const err = Math.abs(row[0] - beats);
    if (err < bestErr) { bestErr = err; best = row; }
  }
  return { duration: best[1], dots: best[2] };
}

// MIDI note → { key:'c#/4', accidental:'#'|'b'|null } for VexFlow (C4 = middle C = MIDI 60).
export function midiToVexKey(midi, preferFlat = false) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = pcName(pc, preferFlat);        // 'C', 'C#', or 'Db'
  const letter = name[0].toLowerCase();
  const accidental = name[1] ? (name[1] === '#' ? '#' : 'b') : null;
  return { key: `${letter}${accidental || ''}/${octave}`, accidental };
}

// Pretty chord-symbol suffix per quality (used for staff chord symbols).
const CHORD_SUFFIX = {
  maj: '', m: 'm', dim: '°', aug: '+', maj7: 'maj7', m7: 'm7', '7': '7',
  m7b5: 'm7♭5', dim7: '°7', mMaj7: 'mMaj7', '6': '6', m6: 'm6', '9': '9',
  add9: 'add9', sus4: 'sus4', sus2: 'sus2', '5': '5',
};

// Chord symbol text, key-aware spelling (prefer flats in flat keys).
export function spellChord({ root, quality }, preferFlat = false) {
  const name = pcName(root, preferFlat);
  const suffix = CHORD_SUFFIX[quality] ?? quality;
  return name + suffix;
}

// Difficulty: 1 = triads, 2 = sevenths, 3 = as authored.
const TRIAD_OF = {
  maj: 'maj', m: 'm', dim: 'dim', aug: 'aug', sus4: 'sus4', sus2: 'sus2', '5': '5',
  maj7: 'maj', '6': 'maj', add9: 'maj', '9': 'maj', '7': 'maj',
  m7: 'm', m6: 'm', mMaj7: 'm', m7b5: 'dim', dim7: 'dim',
};
const SEVENTH_OF = { '9': '7', add9: 'maj', '6': 'maj', m6: 'm' };

export function simplifyQuality(quality, level = 3) {
  if (level <= 1) return TRIAD_OF[quality] || quality;
  if (level === 2) return SEVENTH_OF[quality] || quality;
  return quality;
}
