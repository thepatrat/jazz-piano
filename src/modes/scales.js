// ============================================================
//  modes/scales.js — Scale REFERENCE view.
//  Pick a root + scale type → see ALL the notes lit on the keyboard
//  (root in orange, scale tones in green) with note names listed and
//  a short explainer. This is the "learn" side; the "practice" side
//  lives in Exercises as scale drill modules.
// ============================================================
import { SCALE_DEFS, NOTE_NAMES, pcName } from '../theory.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';

let selectedRoot = 0;    // pitch class
let selectedScale = 'major';

const SCALE_INFO = {
  'major':          'The bright, "happy" default. All other scales are measured against this one.',
  'natural-minor':  'The "sad" scale — flats the 3rd, 6th, and 7th compared to major. The relative minor of the major scale two keys up.',
  'dorian':         'Minor with a raised 6th — jazzy, mellow, slightly optimistic. The classic minor sound in jazz (think ii chord).',
  'mixolydian':     'Major with a flat 7th — bluesy, dominant. The sound of the V7 chord. Great for blues and funk.',
  'pentatonic-maj': 'Major minus the 4th and 7th — five notes, no tension. Universally melodic; hard to play a wrong note.',
  'pentatonic-min': 'Minor minus the 2nd and 6th — the backbone of blues and rock soloing.',
  'blues':          'Minor pentatonic plus the "blue note" (♯4/♭5). The soul of blues expression.',
  'harmonic-minor': 'Natural minor with a raised 7th — dramatic, Middle-Eastern colour. Creates the V7→i pull in minor keys.',
  'melodic-minor':  'Natural minor with raised 6th and 7th going up — smooth jazz minor. The basis for altered and lydian dominant scales.',
};

function getScaleNotes(rootPc, scaleId) {
  const def = SCALE_DEFS.find(d => d.id === scaleId);
  if (!def) return [];
  return def.iv.map(iv => (rootPc + iv) % 12);
}

function lightScale(rootPc, scaleId) {
  clearDemo();
  const def = SCALE_DEFS.find(d => d.id === scaleId);
  if (!def) return;
  // light two octaves on the keyboard so the pattern is visible
  for (let octave = 48; octave <= 84; octave++) {
    const pc = octave % 12;
    const ivIdx = def.iv.indexOf((pc - rootPc + 12) % 12);
    if (ivIdx >= 0) {
      paintDemo(octave, true, ivIdx === 0); // root = orange, others = green
    }
  }
}

function intervalLabel(iv) {
  const names = { 0:'R', 1:'♭2', 2:'2', 3:'♭3', 4:'3', 5:'4', 6:'♭5', 7:'5', 8:'♭6', 9:'6', 10:'♭7', 11:'7' };
  return names[iv] || iv;
}

function render() {
  const view = document.getElementById('scalesView');
  const def = SCALE_DEFS.find(d => d.id === selectedScale);
  const pcs = getScaleNotes(selectedRoot, selectedScale);
  const noteList = pcs.map((pc, i) => {
    const iv = def.iv[i];
    const isRoot = iv === 0;
    return `<span class="sc-note ${isRoot ? 'root' : ''}">${pcName(pc)}<span class="sc-deg">${intervalLabel(iv)}</span></span>`;
  }).join('');

  const rootOpts = Array.from({ length: 12 }, (_, pc) =>
    `<option value="${pc}" ${pc === selectedRoot ? 'selected' : ''}>${NOTE_NAMES[pc]}</option>`).join('');
  const scaleOpts = SCALE_DEFS.map(d =>
    `<option value="${d.id}" ${d.id === selectedScale ? 'selected' : ''}>${d.name}</option>`).join('');
  const info = SCALE_INFO[selectedScale] || '';

  view.innerHTML = `
    <div class="sc-controls">
      <select id="scRoot">${rootOpts}</select>
      <select id="scType">${scaleOpts}</select>
    </div>
    <div class="sc-title">${pcName(selectedRoot)} ${def?.name || selectedScale}</div>
    <div class="sc-desc">${info}</div>
    <div class="sc-notes">${noteList}</div>
    <div class="sc-formula">${def.iv.map(intervalLabel).join(' — ')}</div>
    <div class="sc-hint">Scale notes are highlighted on the keyboard below. <span class="sw o"></span> root <span class="sw g"></span> scale tones. Practice this scale in the <b>Exercises</b> tab.</div>`;

  document.getElementById('scRoot').addEventListener('change', e => {
    selectedRoot = +e.target.value;
    lightScale(selectedRoot, selectedScale);
    render();
  });
  document.getElementById('scType').addEventListener('change', e => {
    selectedScale = e.target.value;
    lightScale(selectedRoot, selectedScale);
    render();
  });

  lightScale(selectedRoot, selectedScale);
}

export function renderScales() {
  render();
}

export function stopScales() {
  clearDemo();
}

// keep these exports so main.js doesn't break (they're now no-ops)
export function scaleNoteOn() {}
