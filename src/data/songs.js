// ============================================================
//  BUILT-IN SONGS (Stage 5 — Play mode)
//  A song is melody + harmony as parallel timed streams so Play
//  can show/hide either (HANDOFF.md §3). All 4/4 for v1.
//
//  Song { id, title, composer?, keyPc, keyMode, preferFlat,
//         timeSig:[4,4], bpm, bars:[Bar] }
//  Bar  { chords:[{ root, quality, beats }],
//         melody:[{ midi|null, beats }] }   // midi null = rest
//
//  root/midi are 0..11 pitch classes / MIDI numbers (C4 = 60).
//  Empty melody bars render a whole rest (pure comping tunes).
// ============================================================

// pitch-class shorthand
const C = 0, Db = 1, D = 2, Eb = 3, E = 4, F = 5, Gb = 6, G = 7, Ab = 8, A = 9, Bb = 10, B = 11;

// quick chord helper: a full-bar chord
const bar = (root, quality, melody = []) => ({ chords: [{ root, quality, beats: 4 }], melody });
// two half-bar chords
const bar2 = (r1, q1, r2, q2, melody = []) => ({
  chords: [{ root: r1, quality: q1, beats: 2 }, { root: r2, quality: q2, beats: 2 }],
  melody,
});

export const SONGS = [
  {
    id: 'blues-f',
    title: 'Blues in F',
    composer: 'Trad. (jazz blues)',
    keyPc: F, keyMode: 'major', preferFlat: true,
    timeSig: [4, 4], bpm: 96,
    bars: [
      bar(F, '7'), bar(Bb, '7'), bar(F, '7'), bar(F, '7'),
      bar(Bb, '7'), bar(Bb, '7'), bar(F, '7'), bar(D, '7'),
      bar(G, 'm7'), bar(C, '7'), bar2(F, '7', D, '7'), bar2(G, 'm7', C, '7'),
    ],
  },
  {
    id: 'ii-v-i-workout',
    title: 'ii–V–I Workout',
    composer: 'Practice loop',
    keyPc: C, keyMode: 'major', preferFlat: false,
    timeSig: [4, 4], bpm: 88,
    bars: [
      // ii–V–I in C
      bar(D, 'm7'), bar(G, '7'), bar(C, 'maj7'), bar(C, 'maj7'),
      // ii–V–I in F
      bar(G, 'm7'), bar(C, '7'), bar(F, 'maj7'), bar(F, 'maj7'),
    ],
  },
  {
    id: 'autumn-guide-tones',
    title: 'Autumn Leaves (A) — guide tones',
    composer: 'Changes: trad. · melody: guide-tone line',
    keyPc: Bb, keyMode: 'major', preferFlat: true,
    timeSig: [4, 4], bpm: 80,
    // A descending guide-tone line (the 3rd/7th of each chord) over the
    // standard A-section changes — a melody to practise reading & playing.
    bars: [
      bar(C, 'm7', [{ midi: 63, beats: 4 }]),   // Eb4  (♭3 of Cm7)
      bar(F, '7', [{ midi: 63, beats: 4 }]),    // Eb4  (♭7 of F7)
      bar(Bb, 'maj7', [{ midi: 62, beats: 4 }]),// D4   (3 of Bbmaj7)
      bar(Eb, 'maj7', [{ midi: 62, beats: 4 }]),// D4   (7 of Ebmaj7)
      bar(A, 'm7b5', [{ midi: 60, beats: 4 }]), // C4   (♭3 of Am7♭5)
      bar(D, '7', [{ midi: 60, beats: 4 }]),    // C4   (♭7 of D7)
      bar(G, 'm7', [{ midi: 58, beats: 4 }]),   // Bb3  (♭3 of Gm7)
      bar(G, 'm7', [{ midi: 58, beats: 4 }]),   // Bb3
    ],
  },
];

export function findSong(id) {
  return SONGS.find(s => s.id === id) || null;
}

// total beats in a song (sum of bar lengths; assumes 4/4)
export function songBeats(song) {
  return song.bars.length * (song.timeSig[0]);
}
