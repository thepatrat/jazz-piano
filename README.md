# Comp — Jazz Chord Trainer

A jazz chord trainer for an e-piano over the **Web MIDI API**. Connect a keyboard via
USB, open the app in Chrome / Edge / Opera, allow MIDI access, and play.

Built through **Stage 2** of [HANDOFF.md](HANDOFF.md). The original single-file prototype
(now at [`reference/chord-trainer.html`](reference/chord-trainer.html)) was ported into a
Vite + vanilla-JS project with **Dexie/IndexedDB persistence** (Stage 1), and **Drill now
runs on a real FSRS spaced-repetition schedule** (Stage 2): each chord is an SRS item
pulled by due date, graded by how you played it, and rescheduled by [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs).
Stats, level, exercise progress, last mode, and every item's schedule survive reloads.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173 — Web MIDI + IndexedDB both work on localhost
```

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build
```

> Persistence (`localStorage` / IndexedDB) does **not** work in the sandboxed artifact
> viewer — that's why the project must run locally or on a dev server.

**Hosting:** it's a static site — see [DEPLOY.md](DEPLOY.md) to publish it free on Cloudflare
Pages with a custom domain. Web MIDI needs HTTPS, which the host provides automatically.

## Layout

```
index.html            app shell + markup
src/
  main.js             entry / orchestrator: owns activeNotes, mode switching, MIDI wiring
  theory.js           music theory — CHORD_DEFS, detectChord (engine #1), voicing engine (#2)
  midi.js             Web MIDI input (callback-based)
  db.js               Dexie schema + persistence helpers
  srs.js              FSRS scheduler (ts-fsrs) — type-agnostic chord/voicing/scale items
  state.js            shared mutable app state
  styles.css          all styling
  ui/
    keyboard.js       on-screen keyboard (C2..C6)
    explain.js        "how is this chord built?" panel (shared by Detect + Drill)
  modes/
    detect.js         live chord identification
    drill.js          FSRS-driven chord repetition: due queue + grading (persisted)
    exercises.js      video + generated sequences (progress persisted)
    theory.js         read-to-understand explainers with interactive keyboard examples
    circle.js         Circle of Fifths — Explore + Trainer segments
    circleTrainer.js  progression follow-along + live play-trace on the circle
  data/
    modules.js        built-in exercise modules (Keithson Drop 2, ii–V–I, …)
    theory.js         built-in theory topics (intervals, triads, ii–V–I, tonic/numerals, …)
    circle.js         circle-of-fifths key data (roots, relative minors, accidentals)
    progressions.js   built-in tonic-relative progressions (gospel "stacking fourths")
  ui/
    circleGeom.js     shared circle geometry/markup (node positions, arrows)
reference/
  chord-trainer.html  the original single-file prototype, kept for reference
```

### Theory mode (added beyond HANDOFF's five modes)

A read-to-understand library, the counterpart to Exercises' do-to-practice. Built-in topics
live in [`src/data/theory.js`](src/data/theory.js) — each is written prose plus optional
**interactive keyboard examples** (click to light the notes in green, distinct from the
orange of live-played notes) and/or an embedded YouTube video. Add or edit topics by editing
that file (a self-contained data object per topic).

### Circle of Fifths mode (added beyond HANDOFF's five modes)

Two segments:
- **Explore** — click any key (or step ↻ a fifth / ↺ a fourth); it lights that key's major
  scale on the piano (**root orange, scale tones green**) with the neighbouring keys ringed.
- **Trainer** — pick a built-in progression and a starting key (tonic), then either:
  - **Guided follow-along** — the progression's root-motion path is drawn with arrows; play
    each chord and it's checked (tolerant of rich voicings) and the path lights up as you go.
  - **Live trace** — free play; your recent chords leave a fading arrowed *track* on the
    circle. Chords are committed on a short debounce after your last note change.

Progressions are stored **tonic-relative** (roman-numeral steps) in `data/progressions.js`, so
they transpose to any key. Following a printed circle-of-fifths chart, **minor chords sit on
the inner ring of their relative-major slot** (Am inside C, Em inside G) shown as a green dot,
**majors light the outer node**, and the progression's **roman numerals are drawn outside the
rim**. So in the Trainer the I→vi move stays within the tonic's slot (outer → inner).

### Chord detection (bass-aware)

`detectChord` ([src/theory.js](src/theory.js)) prefers the **bass note** as the root, so a
chord is named the way it's played (root-position A-C-E-G reads "Am7", not "C6"). Drill and
Exercises judge a played chord with `chordMatchesTarget` (pitch-class-set equality against the
*target*), which sidesteps ambiguous-set mis-naming — previously some targets (Am7, sus, dim7)
were impossible to satisfy.

### Two matching engines (keep both — HANDOFF.md §1)

1. `detectChord()` — pitch-class set matching ("what chord is this?"). Detect, Drill, ii–V–I.
2. `matchVoicing()` — octave-agnostic shape matching ("did you play *this* voicing?"). Drop 2.

## Persistence

Dexie database `comp-trainer`. Stores for the whole roadmap are declared up front
(`songs`, `modules`, `plans`, `srsItems`, `reviewLog`).

- `kv` (generic key-value): `drill` → `{ level, correct, streak, total }`,
  `app:mode` → last active mode, `exercise:<moduleId>` → `{ idx }`.
- `srsItems` (Stage 2): one row per item `{ id, type, payload, card, due }`, where `card`
  is the ts-fsrs card and `due` (epoch-ms) is indexed for the due-queue query. Item ids:
  `chord:<root>:<quality>` (voicing/scale schemes reserved for later).
- `reviewLog` (Stage 2): an append-only log of every graded review.

### Drill grading (Stage 2)

Drill pulls the most-overdue item for the selected level (seeding the pool on first use),
then derives an FSRS grade from how you answered — no manual Again/Hard/Good/Easy buttons:

| Outcome | Grade |
|---|---|
| Skip / couldn't play it | Again |
| Correct, but slow or after a wrong try | Hard |
| Correct in time | Good |
| Correct & fast | Easy |

The "due now" stat shows how many items in the current level are ready to review.

## Next stages

See [HANDOFF.md](HANDOFF.md) §5. Next up is **Stage 3** (exercise editor + persistence),
or the **Scales / Rhythm** workstreams sketched for the Plan pillars — scales add a third,
*sequential* matching engine; rhythm adds a shared Web Audio transport. All three plug into
the FSRS scheduler, which is already type-agnostic.
