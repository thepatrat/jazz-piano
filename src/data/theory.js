// ============================================================
//  THEORY TOPICS (built-in)
//  Short explainers — read-to-understand, the counterpart to the
//  do-to-practice Exercises. Each topic is written prose plus optional
//  interactive keyboard examples and/or YouTube links.
//
//  Topic shape:
//    {
//      id, title, tag, blurb,
//      body,                       // HTML string (styled by .th-body)
//      examples: [{ label, notes }],  // notes = MIDI numbers to light up
//      video?: { id, label },      // embedded YouTube (optional)
//      links?: [{ label, url }],   // "further watching/reading" (optional)
//    }
//
//  Note reference: middle C = MIDI 60. The on-screen keyboard spans 48..84.
//  video/links are optional and currently use placeholders — swap real ones
//  (same TODO as the exercise modules, HANDOFF.md §6).
// ============================================================

export const THEORY_TOPICS = [
  {
    id: 'intervals',
    title: 'Intervals — the building blocks',
    tag: 'fundamentals',
    blurb: 'The distance between two notes, measured in semitones. Every chord and scale is just stacked intervals.',
    body: `
      <p>An <b>interval</b> is the gap between two notes. Measure it in <b>semitones</b> — one
      semitone is the step from any key to the very next key (white or black).</p>
      <p>The intervals that matter most for chords:</p>
      <ul>
        <li><b>Minor 3rd</b> — 3 semitones. The "sad" third.</li>
        <li><b>Major 3rd</b> — 4 semitones. The "bright" third.</li>
        <li><b>Perfect 5th</b> — 7 semitones. Hollow and stable; the skeleton of most chords.</li>
        <li><b>Octave</b> — 12 semitones. The same note, higher up.</li>
      </ul>
      <p>Stack a major 3rd then a minor 3rd and you've built a major triad. That's the whole game.</p>`,
    examples: [
      { label: 'Minor 3rd · C–E♭', notes: [60, 63] },
      { label: 'Major 3rd · C–E', notes: [60, 64] },
      { label: 'Perfect 5th · C–G', notes: [60, 67] },
      { label: 'Octave · C–C', notes: [60, 72] },
    ],
  },
  {
    id: 'triads',
    title: 'Triads — major, minor, diminished, augmented',
    tag: 'fundamentals',
    blurb: 'Three-note chords built by stacking two thirds. The four flavours come from which thirds you stack.',
    body: `
      <p>A <b>triad</b> is three notes: a root, a third, and a fifth. Which <em>kind</em> of
      thirds you stack decides the flavour:</p>
      <ul>
        <li><b>Major</b> — major 3rd then minor 3rd. Bright, stable.</li>
        <li><b>Minor</b> — minor 3rd then major 3rd. Darker.</li>
        <li><b>Diminished</b> — two minor 3rds. Tense, wants to resolve.</li>
        <li><b>Augmented</b> — two major 3rds. Dreamy, splits the octave evenly.</li>
      </ul>
      <p>Play each below and watch how only the inner notes move while the root stays put.</p>`,
    examples: [
      { label: 'C major', notes: [60, 64, 67] },
      { label: 'C minor', notes: [60, 63, 67] },
      { label: 'C diminished', notes: [60, 63, 66] },
      { label: 'C augmented', notes: [60, 64, 68] },
    ],
  },
  {
    id: 'sevenths',
    title: 'Seventh chords — the jazz palette',
    tag: 'harmony',
    blurb: 'Add a fourth note a seventh above the root and a triad turns into the lush, restless colours jazz lives on.',
    body: `
      <p>Stack one more third on a triad and you get a <b>seventh chord</b> — four notes, far
      richer than a plain triad. The core five:</p>
      <ul>
        <li><b>Major 7th</b> (maj7) — lush and warm. The home/I chord.</li>
        <li><b>Dominant 7th</b> (7) — restless; pulls toward the chord a fifth below. The V chord.</li>
        <li><b>Minor 7th</b> (m7) — smooth and mellow. The ii chord.</li>
        <li><b>Half-diminished</b> (m7♭5) — moody; the ii of a minor key.</li>
        <li><b>Diminished 7th</b> (dim7) — maximally tense, evenly spaced.</li>
      </ul>
      <p>These five are exactly what the <b>Drill</b> mode schedules for you.</p>`,
    examples: [
      { label: 'Cmaj7', notes: [60, 64, 67, 71] },
      { label: 'C7', notes: [60, 64, 67, 70] },
      { label: 'Cm7', notes: [60, 63, 67, 70] },
      { label: 'Cm7♭5', notes: [60, 63, 66, 70] },
      { label: 'Cdim7', notes: [60, 63, 66, 69] },
    ],
  },
  {
    id: 'ii-v-i',
    title: 'The ii–V–I — jazz’s home progression',
    tag: 'harmony',
    blurb: 'Three chords that create tension and release. The single most important move in jazz harmony.',
    body: `
      <p>The <b>ii–V–I</b> is the gravity of jazz. In C major:</p>
      <ul>
        <li><b>ii</b> = Dm7 — sets off, gentle.</li>
        <li><b>V</b> = G7 — builds tension (that restless dominant 7th).</li>
        <li><b>I</b> = Cmaj7 — release, you’re home.</li>
      </ul>
      <p>The roots fall by fifths (D → G → C), and the inner voices move by tiny steps —
      that smooth voice-leading is what makes it sound inevitable. Learn it in one key, then
      move it through all twelve (that’s the ii–V–I exercise in <b>Exercises</b>).</p>`,
    examples: [
      { label: 'ii · Dm7', notes: [62, 65, 69, 72] },
      { label: 'V · G7', notes: [67, 71, 74, 77] },
      { label: 'I · Cmaj7', notes: [60, 64, 67, 71] },
    ],
    // TODO: swap in a real explainer video id (HANDOFF.md §6).
    video: { id: 'NB4MoWjW-Tw', label: 'Watch: the ii–V–I explained' },
  },
  {
    id: 'inversions-voicings',
    title: 'Inversions & voicings',
    tag: 'voicings',
    blurb: 'Same chord, notes rearranged. The order and spacing you choose is the difference between stiff and pro.',
    body: `
      <p>A chord’s <b>name</b> doesn’t care about order or octave — Detect names it by its
      pitch-class set. But which note is on the bottom (the <b>inversion</b>) and how the notes
      are spaced (the <b>voicing</b>) change everything about how it sounds.</p>
      <ul>
        <li><b>Root position</b> — root on the bottom.</li>
        <li><b>1st inversion</b> — third on the bottom.</li>
        <li><b>2nd inversion</b> — fifth on the bottom.</li>
      </ul>
      <p>A <b>Drop 2</b> voicing takes a close chord and drops the second-from-top note an
      octave — instantly opening it up into that pro, spread sound. That’s engine #2
      (shape matching), drilled in the Drop 2 exercise.</p>`,
    examples: [
      { label: 'C major · root', notes: [60, 64, 67] },
      { label: 'C major · 1st inv', notes: [64, 67, 72] },
      { label: 'C major · 2nd inv', notes: [67, 72, 76] },
      { label: 'C major · Drop 2 (E–C–G)', notes: [64, 72, 79] },
    ],
  },
  {
    id: 'circle-of-fourths',
    title: 'The circle of fourths',
    tag: 'fundamentals',
    blurb: 'Why jazz practice moves C → F → B♭ → E♭ … and not chromatically. Roots that fall by a fourth.',
    body: `
      <p>Jazz roots love to move <b>up a fourth</b> (which is the same as down a fifth) — it’s
      the strongest-sounding root motion, the V→I pull. Chain it and you visit all twelve keys:</p>
      <p style="letter-spacing:1px;color:var(--accent2)">C → F → B♭ → E♭ → A♭ → D♭ → G♭ → B → E → A → D → G → (C)</p>
      <p>That’s why exercises cycle in this order instead of chromatically: you’re rehearsing
      the actual motion tunes use. Play C, then F a fourth above it, and you can hear the pull.</p>`,
    examples: [
      { label: 'Up a fourth · C → F', notes: [60, 65] },
      { label: 'Next link · F → B♭', notes: [65, 70] },
    ],
  },
  {
    id: 'tonic-degrees',
    title: 'The tonic, scale degrees & roman numerals',
    tag: 'fundamentals',
    blurb: 'What "I", "IV", "vi" and "the tonic" actually mean — and why progressions are named with roman numerals instead of letters.',
    body: `
      <p>The <b>tonic</b> is your home key — the note (and chord) everything resolves to. In
      C major the tonic is C; in G major it's G. It's the <b>1</b>, the centre of gravity.</p>
      <p>Number the seven notes of the scale 1–7 — those are the <b>scale degrees</b>. Build a
      chord on each and you get the <b>roman numerals</b>:</p>
      <ul>
        <li><b>I, IV, V</b> — built on degrees 1, 4, 5 are <em>major</em> (uppercase).</li>
        <li><b>ii, iii, vi</b> — built on 2, 3, 6 are <em>minor</em> (lowercase).</li>
        <li><b>vii°</b> — built on 7 is diminished.</li>
      </ul>
      <p>The beauty: numerals are <b>key-independent</b>. "I → vi → IV → I" is the same move in
      every key — only the letters change when you pick a different tonic (your "starting key").
      That's exactly how the Circle Trainer's progressions transpose.</p>
      <h4>The vi and "plagal" motion</h4>
      <p>The <b>vi</b> is the relative minor (Am in C major) — same notes as the key, darker
      home. And <b>IV → I</b> is the <b>plagal</b> or "Amen" cadence: moving down a fifth / up a
      fourth lands you home gently. Chain those fourths and you walk right around the circle.</p>`,
    examples: [
      { label: 'I · C major (tonic)', notes: [60, 64, 67] },
      { label: 'IV · F major', notes: [65, 69, 72] },
      { label: 'V · G major', notes: [67, 71, 74] },
      { label: 'vi · A minor', notes: [69, 72, 76] },
    ],
  },
];
