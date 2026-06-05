// ============================================================
//  main.js — entry point / orchestrator.
//  Owns activeNotes, dispatches MIDI note changes to the active mode,
//  wires mode switching, and restores persisted UI state on load.
// ============================================================
import './styles.css';
import { app, activeNotes, drill } from './state.js';
import { saveMode, loadMode, kvGet, kvSet } from './db.js';
import { buildKeyboard, paintKey, clearDemo } from './ui/keyboard.js';
import { initMIDI } from './midi.js';
import { toggleExplain, refreshExplain } from './ui/explain.js';
import { renderDetect } from './modes/detect.js';
import { initDrill, nextDrill, checkDrill } from './modes/drill.js';
import { renderExerciseList, checkExercise } from './modes/exercises.js';
import { renderScales, scaleNoteOn, stopScales } from './modes/scales.js';
import { renderTheoryList } from './modes/theory.js';
import { renderCircle } from './modes/circle.js';
import { circleNoteChanged } from './modes/circleTrainer.js';

// ---- dispatch a note change to whichever mode is active ----
function onNotesChanged() {
  if (app.mode === 'detect') renderDetect();
  else if (app.mode === 'drill') checkDrill();
  else if (app.mode === 'exercises') checkExercise();
  else if (app.mode === 'circle') circleNoteChanged();
  refreshExplain();
}

// ---- mode switching ----
function setMode(mo) {
  app.mode = mo;
  clearDemo(); // drop any keyboard highlights (Theory/Circle) when switching
  stopScales(); // clean up sequential engine when leaving Scales
  document.getElementById('mDetect').classList.toggle('active', mo === 'detect');
  document.getElementById('mDrill').classList.toggle('active', mo === 'drill');
  document.getElementById('mExercises').classList.toggle('active', mo === 'exercises');
  document.getElementById('mScales').classList.toggle('active', mo === 'scales');
  document.getElementById('mTheory').classList.toggle('active', mo === 'theory');
  document.getElementById('mCircle').classList.toggle('active', mo === 'circle');
  document.getElementById('detectView').style.display = mo === 'detect' ? 'block' : 'none';
  document.getElementById('drillView').style.display = mo === 'drill' ? 'block' : 'none';
  document.getElementById('exercisesView').style.display = mo === 'exercises' ? 'block' : 'none';
  document.getElementById('scalesView').style.display = mo === 'scales' ? 'block' : 'none';
  document.getElementById('theoryView').style.display = mo === 'theory' ? 'block' : 'none';
  document.getElementById('circleView').style.display = mo === 'circle' ? 'block' : 'none';
  if (mo === 'drill' && !drill.target) nextDrill();
  if (mo === 'exercises') renderExerciseList();
  if (mo === 'scales') renderScales();
  if (mo === 'theory') renderTheoryList();
  if (mo === 'circle') renderCircle();
  // sync explainer panels to current open-state
  document.getElementById('explainPanel').classList.toggle('open', app.explainOpen && mo === 'detect');
  document.getElementById('explainPanelD').classList.toggle('open', app.explainOpen && mo === 'drill');
  refreshExplain();
  saveMode(mo);
}

// ---- wire static controls ----
function wireControls() {
  document.querySelectorAll('.modes button').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  document.getElementById('explainBtn').addEventListener('click', toggleExplain);
  document.getElementById('explainBtnD').addEventListener('click', toggleExplain);
}

// ---- startup ----
async function start() {
  buildKeyboard();
  wireControls();
  await initDrill(); // restore drill stats/level + wire its controls

  // browser-support banner (Safari/Firefox — no Web MIDI)
  if (!navigator.requestMIDIAccess) {
    const banner = document.getElementById('browserBanner');
    banner.style.display = 'flex';
    document.getElementById('bannerDismiss').addEventListener('click', () => { banner.style.display = 'none'; });
  }

  // first-visit onboarding hint
  const dismissed = await kvGet('onboarding:dismissed', false);
  if (!dismissed) {
    const hint = document.getElementById('onboardHint');
    hint.style.display = 'flex';
    document.getElementById('hintDismiss').addEventListener('click', () => {
      hint.style.display = 'none';
      kvSet('onboarding:dismissed', true);
    });
  }

  if (navigator.requestMIDIAccess) initMIDI({
    onNoteOn: (note) => {
      activeNotes.add(note);
      paintKey(note, true);
      // scales needs individual note-on events (sequential engine)
      if (app.mode === 'scales') scaleNoteOn(note);
      onNotesChanged();
    },
    onNoteOff: (note) => {
      activeNotes.delete(note);
      paintKey(note, false);
      // in drill/exercises we keep feedback on release; detect, circle & scales update live
      if (app.mode === 'detect' || app.mode === 'circle' || app.mode === 'scales') onNotesChanged();
    },
  });

  // restore last mode (defaults to 'detect')
  const savedMode = await loadMode();
  setMode(savedMode);

  // dev-only test hook (stripped from production builds): lets a harness
  // drive the real singletons — e.g. simulate held notes — without MIDI.
  if (import.meta.env.DEV) {
    window.__comp = {
      app, drill, activeNotes, setMode, onNotesChanged,
      // hold an exact set of MIDI notes, then notify the active mode
      simulateNotes(notes) {
        activeNotes.clear();
        notes.forEach(n => activeNotes.add(n));
        onNotesChanged();
      },
      // simulate a single note-on (for sequential engines like scales)
      simulateNoteOn(note) {
        activeNotes.add(note);
        paintKey(note, true);
        if (app.mode === 'scales') scaleNoteOn(note);
        onNotesChanged();
      },
    };
  }
}

start();
