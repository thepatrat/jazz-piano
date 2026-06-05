# Comp — Jazz Chord Trainer · Build Handoff

This document is context for continuing the project in Claude Code. It captures the
working prototype's architecture, the data models that matter, and a dependency-ordered
roadmap to the full five-mode app. Paste it in as a starting brief.

---

## 1. What exists today (the prototype)

A single self-contained `chord-trainer.html` (~770 lines: inline CSS + vanilla JS, no
build step, no dependencies). It connects to an e-piano over the **Web MIDI API** in
Chrome/Edge/Opera and currently has three working modes: Detect, Drill, Exercises.

**Crucial constraint discovered:** browser storage (`localStorage`/`IndexedDB`) does NOT
work in the sandboxed artifact viewer. The app must be run **locally** (open from disk or
a dev server) for any persistence to function. This is the main reason to graduate to a
real project now.

### Two matching engines (the most important architectural fact)

The app deliberately has **two different ways to recognize what's played**, because
different exercises care about different things:

1. **`detectChord(midiNotes)`** — *pitch-class set* matching. Throws away octave and
   inversion. Answers "what chord is this?" Used by Detect, Drill, and the ii–V–I exercise.
   Returns `{root, quality}` or `null`.

2. **`matchVoicing(midiNotes, targetOffsets)`** — *octave-agnostic shape* matching.
   Reduces played notes to semitone offsets from the lowest note and compares the ordered
   stack. Answers "did you play this *specific voicing*?" Used by the Drop 2 exercise.
   Pairs with a pitch-class check to confirm the right key.

Every voicing-based lesson (rootless, shells, quartal, Drop 2/3) reuses engine #2. Every
"name the chord" task uses engine #1. Keep both; do not try to unify them.

### Key data structures

```
CHORD_DEFS    // [{q:'maj7', iv:[0,4,7,11]}, ...]  interval sets per quality
CHORD_INFO    // {maj7:{name, desc}, ...}          human explainer text
EXERCISE_MODULES  // see schema below
```

### The exercise-module schema (the scalability key)

Every YouTube lesson becomes one object. The SAME shape covers all encoding levels —
"upgrading" a lesson just means filling in more fields, never restructuring:

```js
{
  id: 'keithson-drop2',
  title: 'Drop 2 voicings — major triads',
  level: 2,                 // 0 = link+notes only, 2 = generates a drill
  voicingMode: true,        // if true, runner uses matchVoicing (engine #2)
  source: { label, url },
  videoId: 'NB4MoWjW-Tw',   // for the embed
  desc: '...',
  generate() { return [ /* ordered step objects */ ]; }  // omit for level 0
}
```

A **step** is `{root, quality, ...}`. Voicing steps additionally carry
`{inversion, voicing: [offsets], label, tag}`. The generator expands a *rule* (e.g. "for
each key in the circle of fourths, emit ii–V–I") into the concrete step list.

### Verified math

The Drop 2 generator was checked against textbook definitions: root-position C major
Drop 2 = E(low)–C–G spanning a tenth; all three inversions correct. The transform is:
take a closed triad in a given inversion, drop the 2nd-from-top note an octave,
renormalize so the lowest note = 0.

---

## 2. Target architecture: five modes

The app should grow to five modes, with **Plan** as the orchestrating layer on top.

### Plan (NEW — the orchestrator)
- Holds an overarching **learning goal** broken into **phases**.
- Each phase points at which sub-exercises/drills to run and in what order.
- Surfaces "what should I do today" rather than making the user choose.
- The two source documents map directly here:
  - **Piano With Jonny 1-Year Plan** is literally a Plan: 5 pillars × 3 levels × 12 keys,
    one key per month, with BPM targets. This is the flagship built-in plan.
  - **Keithson Drop 2** is a multi-stage technique that becomes a sequence of exercises
    within a phase.
- Data model sketch:
  ```js
  Plan { id, title, phases: [Phase] }
  Phase { id, title, monthOrOrder, goalBPM?, items: [ {type:'exercise'|'drill', ref, targetCriteria} ] }
  ```
- Progress through a phase is gated by criteria (e.g. "drill accuracy > 90% at 100 BPM").

### Detect (EXISTS — keep)
- Live chord identification + the "how is this chord built?" explainer panel.
- Reference/sandbox tool. Minimal changes needed.

### Drill (EXISTS — add SRS)
- Pure repetition: prompt a chord, play it, advance. No video, no story.
- **This is where spaced repetition lives.** Each (chord quality × root) — and eventually
  each voicing shape — is an SRS item with its own schedule.
- Use **FSRS** (preferred, modern) or SM-2. On each answer, record grade (correct/slow/
  failed → again/hard/good/easy) and update the item's due date.
- The drill queue = items due now, ordered by urgency. This is the engine the Plan and
  the transpose feature both feed into.

### Exercises (EXISTS — expand)
- The "fun, brain-activating" mode: video + generated, musically-meaningful sequences
  (ii–V–I round the circle, Drop 2 through positions, etc.).
- Distinct from Drill: exercises are *contextual and sequential*; drills are *atomized and
  scheduled*. An exercise can FEED drills (its component chords/voicings become SRS items).
- Needs: a module editor + persistence so the user can add their own YouTube lessons
  (capture at level 0 in seconds, upgrade to level 2 later).

### Play (NEW — the play-along)
- Two scrolling staves: **melody** (bottom) with **chord symbols above** (e.g. `C7`, `Dm7`).
- **Flavor selector**: choose what to practice (melody only / comp only / both; left-hand
  shells vs rootless; etc.).
- **Difficulty slider**: ramps melody complexity AND chord complexity together —
  simple melody + triads → complex melody + extended/altered voicings.
- Playback timing via **Web Audio** (a clock/transport); notes/chords scroll in time.
- Song model (see §3) drives it. The **transpose-to-weak-chords** feature lives here:
  rewrite a song into the keys/qualities the SRS says are weakest.

---

## 3. New data models needed

### Song / lead-sheet model
```js
Song {
  id, title, key, timeSignature, bpm,
  bars: [ Bar ]
}
Bar { chords: [ {symbol, root, quality, beats} ], melody: [ {pitch, beats} | rest ] }
```
- Keep melody and harmony as parallel timed streams so Play can show/hide either.
- Source formats to consider importing later: MusicXML, iReal Pro, or a simple custom JSON.
  Start with hand-entered JSON.

### SRS item
```js
SrsItem {
  id,                 // e.g. 'chord:Dm7' or 'voicing:Cmaj-drop2-inv1'
  type,               // 'chord' | 'voicing'
  payload,            // {root, quality} or {root, quality, inversion, voicing}
  stability, difficulty, due, lastReview, reps, lapses  // FSRS fields
}
```

### Transpose-to-weak-chords (the novel feature)
- Input: a Song + the SRS state.
- Find the user's weakest items (lowest stability / most overdue).
- Transpose the whole song by the interval that maximizes how many of its chords land on
  weak items. Pure math on the chord list + re-spelling. Lives between Play and Drill.

---

## 4. Recommended tech & project shape

- **Stay browser-native.** None of the five modes require a backend. Python is only
  warranted later for (a) cross-device sync or (b) audio→chord auto-extraction (hard,
  research-grade, out of scope for now).
- Split the single file into a small **Vite** project (vanilla or light framework — the
  current code is plain JS and ports directly). Live reload makes iterating against the
  hardware pleasant.
- **Persistence: IndexedDB via Dexie.** Stores: `songs`, `modules`, `plans`, `srsItems`,
  `reviewLog`. Handles thousands of records easily.
- Music notation rendering for Play: **VexFlow** (or abc.js) for the scrolling staves.
- Audio/transport for Play: **Web Audio API** (or Tone.js, which the user has used before).
- Keep Web MIDI exactly as-is; it already works.

### Suggested file layout
```
/src
  midi.js          // Web MIDI in/out (lift from prototype)
  theory.js        // CHORD_DEFS, detectChord, voicing engine, transpose math
  srs.js           // FSRS scheduler
  db.js            // Dexie schema + helpers
  modes/
    detect.js  drill.js  exercises.js  play.js  plan.js
  data/
    plans/jonny-1year.js     // the Piano With Jonny curriculum encoded
    modules/                  // built-in exercise modules incl. drop2, ii-V-I
    songs/                    // seed lead sheets
  ui/  ...
index.html
```

---

## 5. Dependency-ordered roadmap

Build in this order — each stage unblocks the next.

**Stage 1 — Project + persistence.** Port the prototype into Vite. Add Dexie. Move the
in-memory drill/exercise state into IndexedDB. (Nothing user-visible changes much, but now
state survives reloads and storage works.)

**Stage 2 — SRS engine in Drill.** Implement FSRS in `srs.js`. Turn every chord (and Drop 2
voicing) into an `SrsItem`. Drill pulls the due queue and writes back grades. This is the
backbone everything else leans on.

**Stage 3 — Exercise editor + persistence.** Form to add/edit modules (level 0 capture →
level 2 upgrade). Persist to the `modules` store. Wire exercise completion so component
chords/voicings seed SRS items.

**Stage 4 — Plan mode.** Encode the Piano With Jonny 1-Year Plan as the first built-in
Plan. Build the phase/criteria gating and the "what to do today" surface that dispatches
into Drill and Exercises.

**Stage 5 — Play mode.** Song model + VexFlow scrolling staves + Web Audio transport +
flavor selector + difficulty slider.

**Stage 6 — Transpose-to-weak-chords.** Connect Play's song model to SRS state; transpose
to maximize weak-chord coverage.

**Later / optional — backend.** Only if cross-device sync or audio auto-extraction is
wanted. Separate Python service; does not block anything above.

---

## 6. Open decisions to make in Claude Code

- **Enharmonic spelling.** The prototype names everything with sharps (shows `D#`, not
  `Eb`). Correct key-aware spelling needs key context; decide when this matters enough to
  build (Play mode's chord symbols are where it'll show most).
- **Difficulty slider mapping.** Define the concrete ladder: which melody features and
  which chord qualities unlock at each notch.
- **Flavor taxonomy for Play.** Enumerate the practice flavors (melody-only, comp-only,
  shells, rootless, two-hand, walking bass, etc.).
- **Phase gating criteria.** How strict is "mastered" before a Plan advances a phase?
- **Real source URLs/videoIds.** The Keithson and Jonny modules use placeholder links;
  swap in the real ones.

---

## 7. Source material to encode

Two lesson summaries the user wants built in (full text was provided separately):

1. **Keithson — Drop 2 voicings.** 6 steps: basics (C/F/G major, 3 positions) → combinations
   → transpose + minor/dim → ornament "flicks" (9→3, 4→5) → 4/5-note voicings (add 9th,
   swap root for 7th, two-hand split) → implementation (rolling, rocking, accompaniment).
   Stages 1–3 are drillable (voicing engine); 4 is watch-and-imitate; 5 is more voicing
   targets. The prototype encodes Stages 1–3 for major triads.

2. **Piano With Jonny — 1-Year Plan.** 5 pillars (Scales, Chords, Voicings, Lead Sheets,
   Improvisation) × 3 levels (Beginner/Intermediate/Advanced), one key per month, explicit
   BPM goals per pillar/level. This is the flagship Plan for Stage 4.
```
