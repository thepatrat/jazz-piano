// ============================================================
//  ROADMAP (built-in) — the "Plan" mode content.
//  A journey, NOT a rail: stops are clustered by level so you can
//  see the whole landscape at a glance and pick what to work on.
//  Each stop points at an activity that already exists elsewhere
//  in the app (a Theory topic, a Drill level, a Scales view, an
//  Exercise module, or the Circle) and carries a short "ready to
//  move on when…" cue drawn from how these skills are usually taught.
//
//  Stop shape:
//    { id, title, blurb, type, ref, moveOn }
//      type — 'theory' | 'drill' | 'exercise' | 'scales' | 'circle' | 'free'
//      ref  — what to launch (see modes/plan.js → buildLaunch):
//               theory  : topicId            (data/theory.js)
//               drill   : level key          ('triads'|'sevenths'|'all')
//               exercise: moduleId           (data/modules.js)
//               scales  : { root, scaleId }  (theory.js SCALE_DEFS)
//               circle  : null
//               free    : null  (no launch — a "go play" prompt)
// ============================================================

export const ROADMAP = [
  {
    id: 'foundations',
    title: 'Foundations',
    subtitle: 'The raw materials — intervals, triads, your first scales.',
    nodes: [
      {
        id: 'f-intervals', title: 'Hear the intervals', type: 'theory', ref: 'intervals',
        blurb: 'The distance between two notes is the atom of everything else. Learn the names and the sounds.',
        moveOn: "You're ready when you can name a 3rd / 5th / 7th by sight and roughly hear it before you play it.",
      },
      {
        id: 'f-triads-theory', title: 'How triads are built', type: 'theory', ref: 'triads',
        blurb: 'Major, minor, diminished, augmented — three notes, four flavours. Understand the stacked-thirds recipe.',
        moveOn: 'Move on once you can explain why a chord is minor vs. diminished from its intervals.',
      },
      {
        id: 'f-triads-drill', title: 'Play every triad', type: 'drill', ref: 'triads',
        blurb: 'Spaced-repetition drill on all 12 roots × 4 triad qualities. The app schedules your weak spots.',
        moveOn: 'A good gate: you can play any prompted triad cleanly within ~3 seconds, with the "due now" count near zero for a few sessions.',
      },
      {
        id: 'f-major-scales', title: 'Major scale, all keys', type: 'exercise', ref: 'scale-major-all-keys',
        blurb: 'The scale every other scale is measured against. Play it ascending and descending in all 12 keys.',
        moveOn: 'Ready when all 12 keys feel even-handed — no key makes you stop and think about the fingering.',
      },
      {
        id: 'f-circle', title: 'The circle of fifths', type: 'theory', ref: 'circle-of-fourths',
        blurb: 'The map of all 12 keys and how they relate. This is the compass for everything that follows.',
        moveOn: "Move on when you can say the next key a fifth up (or fourth up) without counting.",
      },
    ],
  },
  {
    id: 'jazz-core',
    title: 'The Jazz Core',
    subtitle: 'Seventh chords and the ii–V–I — the heartbeat of jazz harmony.',
    nodes: [
      {
        id: 'j-sevenths-theory', title: 'Seventh chords', type: 'theory', ref: 'sevenths',
        blurb: 'maj7, m7, dominant 7, m7♭5, dim7. Adding the 7th is what turns triads into jazz.',
        moveOn: 'Ready when you can hear the difference between a maj7 and a dominant 7 with your eyes closed.',
      },
      {
        id: 'j-sevenths-drill', title: 'Play every 7th chord', type: 'drill', ref: 'sevenths',
        blurb: 'The core drill of the whole app: all 12 roots × 5 seventh qualities, scheduled by spaced repetition.',
        moveOn: 'A solid gate before voicings: prompted 7th chords land in ~3s and the "due now" count stays low for several sessions.',
      },
      {
        id: 'j-251-theory', title: 'The ii–V–I', type: 'theory', ref: 'ii-v-i',
        blurb: 'The single most important progression in jazz. Understand why it pulls home so strongly.',
        moveOn: 'Move on once you can spell the ii, V and I of any major key on demand.',
      },
      {
        id: 'j-251-ex', title: 'ii–V–I in all 12 keys', type: 'exercise', ref: 'mangold-251',
        blurb: 'Dm7 → G7 → Cmaj7, then the same shape around the circle through every key. Generated chord by chord.',
        moveOn: 'Ready when you can run a ii–V–I in any key without hunting for the chords.',
      },
      {
        id: 'j-minor-scales', title: 'Minor & Dorian', type: 'exercise', ref: 'scale-dorian-all-keys',
        blurb: 'Dorian is the classic jazz-minor sound (the ii chord). Get it under your fingers in all keys.',
        moveOn: "Ready when Dorian feels as automatic as major did at the end of Foundations.",
      },
    ],
  },
  {
    id: 'voicings-color',
    title: 'Voicings & Colour',
    subtitle: 'Make it sound pro — richer voicings, extensions, and real comping.',
    nodes: [
      {
        id: 'v-inversions', title: 'Inversions & voicings', type: 'theory', ref: 'inversions-voicings',
        blurb: 'Same notes, different order — and a whole new sound. The gateway to playing like a pianist, not a chart.',
        moveOn: 'Move on when you can voice a chord three ways and explain what changed.',
      },
      {
        id: 'v-drop2', title: 'Drop 2 voicings', type: 'exercise', ref: 'keithson-drop2',
        blurb: 'Take a closed voicing and drop the second note from the top down an octave — instant pro sound.',
        moveOn: 'Ready when the Drop 2 shape is reflexive on C, F and G in all three positions.',
      },
      {
        id: 'v-all-drill', title: 'Everything drill', type: 'drill', ref: 'all',
        blurb: 'The full vocabulary: triads, 7ths, 6ths, sus and 9ths across all 12 roots. Keeps everything sharp.',
        moveOn: 'This one is maintenance — keep it in rotation rather than "finishing" it.',
      },
      {
        id: 'v-blues', title: 'The blues scale', type: 'exercise', ref: 'scale-blues-all-keys',
        blurb: 'Minor pentatonic plus the blue note. The soul of improvisation — and the most fun to noodle on.',
        moveOn: 'No gate here — this is where practice turns into play.',
      },
      {
        id: 'v-gospel', title: 'Comp through the circle', type: 'circle', ref: null,
        blurb: 'Use the Circle Trainer to comp gospel-style fourth-stacks and trace your own progressions live.',
        moveOn: 'Ready when you can follow a guided progression and then improvise your own path around the circle.',
      },
      {
        id: 'v-play', title: 'Play a tune you love', type: 'free', ref: null,
        blurb: 'Pick a song, put the metronome on, and just play. Everything above exists to serve this moment.',
        moveOn: 'There is no moving on from this one. This is the point.',
      },
    ],
  },
];

// Flat lookup by node id.
export function findNode(id) {
  for (const lvl of ROADMAP) {
    const n = lvl.nodes.find(x => x.id === id);
    if (n) return n;
  }
  return null;
}
