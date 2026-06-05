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
import * as transport from './transport.js';
import { renderDetect } from './modes/detect.js';
import { initDrill, nextDrill, checkDrill, stopDrill, drillNoteOnTimestamp } from './modes/drill.js';
import { renderExerciseList, checkExercise, exerciseNoteOn } from './modes/exercises.js';
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
  stopDrill();  // stop metronome when leaving Drill
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

// ---- global metronome bar ----
let beatsPerBar = 4;

function buildDots() {
  const container = document.getElementById('metroBeats');
  container.innerHTML = '';
  for (let i = 0; i < beatsPerBar; i++) {
    const d = document.createElement('span');
    d.className = 'metro-dot';
    container.appendChild(d);
  }
}

function wireMetronome() {
  const toggle = document.getElementById('metroToggle');
  const bpmInput = document.getElementById('metroBpm');
  const numSel = document.getElementById('metroNum');
  const denomSel = document.getElementById('metroDenom');

  buildDots();

  function updateToggleUI() {
    const on = transport.isRunning();
    toggle.classList.toggle('on', on);
    document.getElementById('metroIcon').textContent = on ? '⏸' : '▶';
    if (!on) {
      document.querySelectorAll('#metroBeats .metro-dot')
        .forEach(d => d.classList.remove('lit', 'accent'));
    }
  }

  toggle.addEventListener('click', () => {
    if (transport.isRunning()) {
      transport.stop();
    } else {
      const bpm = parseInt(bpmInput.value, 10) || 80;
      transport.start(bpm);
    }
    updateToggleUI();
  });

  bpmInput.addEventListener('change', () => {
    const bpm = parseInt(bpmInput.value, 10) || 80;
    bpmInput.value = bpm;
    if (transport.isRunning()) transport.setBpm(bpm);
  });

  numSel.addEventListener('change', () => {
    beatsPerBar = parseInt(numSel.value, 10) || 4;
    buildDots();
  });

  // light the dots on each beat
  transport.onBeat(({ beat }) => {
    const dots = document.querySelectorAll('#metroBeats .metro-dot');
    const idx = beat % beatsPerBar;
    dots.forEach((d, i) => {
      d.classList.toggle('lit', i === idx);
      d.classList.toggle('accent', i === idx && idx === 0);
    });
  });
}

// ---- wire static controls ----
function wireControls() {
  document.querySelectorAll('.modes button').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  document.getElementById('explainBtn').addEventListener('click', toggleExplain);
  document.getElementById('explainBtnD').addEventListener('click', toggleExplain);
  wireMetronome();
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
    onNoteOn: (note, timestamp) => {
      activeNotes.add(note);
      paintKey(note, true);
      // sequential engines need individual note-on events
      if (app.mode === 'scales') scaleNoteOn(note, timestamp);
      if (app.mode === 'exercises') exerciseNoteOn(note);
      // drill stores the timestamp for rhythm scoring
      if (app.mode === 'drill') drillNoteOnTimestamp(timestamp);
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
