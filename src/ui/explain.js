// ============================================================
//  ui/explain.js — the "How is this chord built?" breakdown panel.
//  Shared by Detect and Drill modes.
// ============================================================
import { CHORD_INFO, CHORD_DEFS, IV_NAMES, pcName, detectChord } from '../theory.js';
import { app, drill, activeNotes } from '../state.js';

export function buildExplainHTML(chord) {
  if (!chord) {
    return '<h4>Play a chord</h4><div class="desc">Hold down the notes of a chord and this panel breaks down how it\'s built — note by note.</div>';
  }
  const info = CHORD_INFO[chord.quality] || { name: chord.quality, desc: '' };
  const def = CHORD_DEFS.find(d => d.q === chord.quality);
  const ivs = def ? def.iv : [0];
  const rootName = pcName(chord.root);
  let rows = '';
  ivs.forEach(iv => {
    const pc = (chord.root + iv) % 12;
    const [deg, role] = IV_NAMES[iv] || ['?', ''];
    rows += `<div class="frow ${iv === 0 ? 'root' : ''}">
      <span class="iv">${deg === '' ? '' : 'degree ' + deg}</span>
      <span class="nt">${pcName(pc)}</span>
      <span class="rl">${iv === 0 ? 'root note' : '+' + iv + ' semitones · ' + role}</span>
    </div>`;
  });
  return `<h4>${rootName} ${info.name}</h4>
    <div class="desc">${info.desc}</div>
    <div class="formula">${rows}</div>
    <div class="tip">Stack from the bottom: start on <b>${rootName}</b>, then add each note above it. Octave and order don't change the chord's name.</div>`;
}

export function refreshExplain() {
  if (!app.explainOpen) return;
  if (app.mode === 'exercises' || app.mode === 'scales' || app.mode === 'theory' || app.mode === 'circle') return;
  let chord = null;
  if (app.mode === 'detect') chord = detectChord([...activeNotes]);
  else chord = drill.target;
  const inner = app.mode === 'detect' ? 'explainInner' : 'explainInnerD';
  document.getElementById(inner).innerHTML = buildExplainHTML(chord);
}

export function toggleExplain() {
  app.explainOpen = !app.explainOpen;
  refreshExplain();
  const p = app.mode === 'detect' ? 'explainPanel' : 'explainPanelD';
  const b = app.mode === 'detect' ? 'explainBtn' : 'explainBtnD';
  document.getElementById(p).classList.toggle('open', app.explainOpen);
  const btn = document.getElementById(b);
  if (btn) btn.textContent = (app.mode === 'detect' ? 'How is this chord built? ' : 'Hint / explain ') + (app.explainOpen ? '▴' : '▾');
}
