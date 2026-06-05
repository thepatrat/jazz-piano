// ============================================================
//  scaleEngine.js — ENGINE #3: sequential scale matcher.
//  Unlike detectChord/matchVoicing (snapshots), this is STATEFUL:
//  it anchors on the first note you play, then expects each
//  subsequent note-on to be the next scale degree in order
//  (ascending one octave, then descending back down).
//
//  API:
//    start(rootPc, scaleId)  — begin a new run
//    noteOn(midiNote)        — process a played note; returns status object
//    state()                 — current cursor / errors / completion
//    reset()                 — stop
//
//  The engine is owned by the Scales mode (modes/scales.js).
// ============================================================
import { SCALE_DEFS } from './theory.js';

let _active = false;
let _sequence = [];     // the exact MIDI notes expected, in order
let _cursor = 0;        // how far the player has advanced
let _errors = 0;        // wrong notes in this run
let _rootPc = 0;
let _scaleId = '';
let _done = false;

// build the up-then-down sequence of MIDI notes starting from the
// player's first note. We anchor on the first note-on so the player
// picks their octave.
function buildSequence(anchorMidi, ivs) {
  const up = ivs.map(iv => anchorMidi + iv);
  up.push(anchorMidi + 12); // top octave
  const down = [...up].reverse().slice(1); // descend, skipping the repeated top
  return [...up, ...down];
}

export function start(rootPc, scaleId) {
  _rootPc = rootPc;
  _scaleId = scaleId;
  _cursor = 0;
  _errors = 0;
  _done = false;
  _sequence = []; // built on the first note-on (we don't know the octave yet)
  _active = true;
}

export function noteOn(midiNote) {
  if (!_active || _done) return state();

  // first note: anchor the sequence
  if (_sequence.length === 0) {
    const pc = midiNote % 12;
    if (pc !== _rootPc) {
      // wrong starting note — signal but don't anchor
      return { ...state(), event: 'wrong-start', expected: _rootPc, played: pc };
    }
    const def = SCALE_DEFS.find(d => d.id === _scaleId);
    if (!def) return state();
    _sequence = buildSequence(midiNote, def.iv);
  }

  const expected = _sequence[_cursor];
  if (midiNote === expected) {
    _cursor++;
    if (_cursor >= _sequence.length) {
      _done = true;
      return { ...state(), event: 'complete' };
    }
    return { ...state(), event: 'correct' };
  } else {
    _errors++;
    return { ...state(), event: 'wrong', expected, played: midiNote };
  }
}

export function state() {
  return {
    active: _active,
    done: _done,
    cursor: _cursor,
    total: _sequence.length,
    errors: _errors,
    sequence: _sequence,
    rootPc: _rootPc,
    scaleId: _scaleId,
  };
}

export function reset() {
  _active = false;
  _sequence = [];
  _cursor = 0;
  _errors = 0;
  _done = false;
}
