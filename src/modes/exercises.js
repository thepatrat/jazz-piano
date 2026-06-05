// ============================================================
//  modes/exercises.js — video + generated, musically-meaningful
//  sequences. Voicing steps use engine #2 (matchVoicing); plain
//  chord steps use engine #1 (detectChord).
//  Current step index per module persists to IndexedDB.
// ============================================================
import {
  INV_NAMES, SCALE_DEFS, chordLabel, pcName, matchVoicing, voicingPitchClasses, chordMatchesTarget,
} from '../theory.js';
import { exState, activeNotes } from '../state.js';
import { EXERCISE_MODULES } from '../data/modules.js';
import { saveExerciseProgress, loadExerciseProgress } from '../db.js';
import * as scaleEngine from '../scaleEngine.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';

export function renderExerciseList() {
  const list = document.getElementById('exList');
  list.innerHTML = '';
  EXERCISE_MODULES.forEach(m => {
    const card = document.createElement('div');
    card.className = 'ex-card';
    card.addEventListener('click', () => openExercise(m.id));
    const badge = m.level === 2
      ? '<span class="ex-badge lvl2">▶ generates drill</span>'
      : '<span class="ex-badge lvl0">link + notes</span>';
    card.innerHTML = `
      <div class="ex-top"><h3>${m.title}</h3>${badge}</div>
      <div class="ex-desc">${m.desc}</div>
      <div class="ex-src">↳ ${m.source.label}</div>`;
    list.appendChild(card);
  });
}

async function openExercise(id) {
  const m = EXERCISE_MODULES.find(x => x.id === id);
  exState.module = m;
  exState.seq = m.generate ? m.generate() : [];
  // resume where we left off, but restart if the module was completed
  let idx = await loadExerciseProgress(id);
  if (idx >= exState.seq.length) idx = 0;
  exState.idx = idx;

  document.getElementById('exListWrap').style.display = 'none';
  const r = document.getElementById('exRunner');
  r.style.display = 'block';

  let body = '';
  if (m.level === 2) {
    const hintBtn = m.voicingMode ? '<button id="exRevealBtn">Reveal hint 👁</button>' : '';
    body = `
      <div class="ex-run-body">
        <div class="ex-progress" id="exProg"></div>
        <div class="big" id="exTarget">—</div>
        <div class="prompt-target" id="exFeedback"></div>
        <div class="notes-played" id="exHint"></div>
        <div class="ex-seq" id="exSeq"></div>
        <div class="controls"><button id="exSkipBtn">Skip ⟳</button>${hintBtn}</div>
      </div>`;
  } else {
    body = `<div class="ex-run-body"><div class="ex-desc" style="text-align:center;color:var(--muted)">Watch the lesson above, then practice freely — switch to Detect to check your voicings. Encode this into a drill anytime.</div></div>`;
  }

  const videoHtml = m.videoId
    ? `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${m.videoId}" title="lesson" allowfullscreen></iframe></div>`
    : '';

  r.innerHTML = `
    <div class="runner-head">
      <button id="exBackBtn">← Back</button>
      <h3>${m.title}</h3>
    </div>
    ${videoHtml}
    ${body}`;

  document.getElementById('exBackBtn').addEventListener('click', closeExercise);
  if (m.level === 2) {
    document.getElementById('exSkipBtn').addEventListener('click', exSkip);
    const revealBtn = document.getElementById('exRevealBtn');
    if (revealBtn) revealBtn.addEventListener('click', exReveal);
    renderExStep();
  }
}

function closeExercise() {
  if (exState.module) saveExerciseProgress(exState.module.id, exState.idx);
  scaleEngine.reset();
  clearDemo();
  exState.module = null;
  document.getElementById('exRunner').style.display = 'none';
  document.getElementById('exRunner').innerHTML = ''; // stops the video
  document.getElementById('exListWrap').style.display = 'block';
}

function lightScaleGuide(rootPc, scaleId) {
  clearDemo();
  const def = SCALE_DEFS.find(d => d.id === scaleId);
  if (!def) return;
  for (let midi = 48; midi <= 84; midi++) {
    const pc = midi % 12;
    const ivIdx = def.iv.indexOf((pc - rootPc + 12) % 12);
    if (ivIdx >= 0) paintDemo(midi, true, ivIdx === 0);
  }
}

function renderExStep() {
  const { seq, idx, module } = exState;
  exState.revealed = false;
  const isVoicing = module && module.voicingMode;
  const isScale = module && module.scaleMode;
  if (idx >= seq.length) {
    clearDemo();
    scaleEngine.reset();
    document.getElementById('exTarget').textContent = '✓ done';
    document.getElementById('exTarget').className = 'big flash-ok';
    document.getElementById('exFeedback').textContent = 'All steps complete — nice work.';
    document.getElementById('exProg').textContent = '';
    const h = document.getElementById('exHint');
    if (h) h.textContent = '';
    return;
  }
  const step = seq[idx];
  document.getElementById('exProg').textContent = `step ${idx + 1} / ${seq.length}`;
  const t = document.getElementById('exTarget');
  t.className = 'big';
  const fb = document.getElementById('exFeedback');

  if (isScale) {
    const def = SCALE_DEFS.find(d => d.id === step.scaleId);
    t.style.fontSize = '36px';
    t.textContent = `${pcName(step.root)} ${def?.name || step.scaleId}`;
    fb.textContent = `Play up then down — start on ${pcName(step.root)} (any octave)`;
    scaleEngine.start(step.root, step.scaleId);
    lightScaleGuide(step.root, step.scaleId);
  } else if (isVoicing) {
    t.style.fontSize = '40px';
    t.textContent = chordLabel({ root: step.root, quality: step.quality });
    fb.textContent = step.label.split(' — ')[1] || '';
  } else {
    t.style.fontSize = '';
    t.textContent = step.label ? '' : chordLabel(step);
    fb.textContent = step.tag ? '(' + step.tag + ' chord)' : '';
  }
  const h = document.getElementById('exHint');
  if (h) h.textContent = '';
  // sequence strip (group of 3 around current)
  const seqEl = document.getElementById('exSeq');
  seqEl.innerHTML = '';
  const groupSize = 3;
  const start = Math.floor(idx / groupSize) * groupSize;
  for (let i = start; i < Math.min(start + groupSize, seq.length); i++) {
    const s = document.createElement('span');
    if (seq[i].scaleId) {
      s.textContent = seq[i].tag || pcName(seq[i].root);
    } else if (seq[i].label) {
      s.textContent = INV_NAMES[seq[i].inversion].replace(' position', '').replace('inversion', 'inv');
    } else {
      s.textContent = chordLabel(seq[i]);
    }
    if (i < idx) s.className = 'done';
    else if (i === idx) s.className = 'cur';
    seqEl.appendChild(s);
  }
  if (step.tag) {
    document.getElementById('exProg').textContent += '  ·  ' + step.tag;
  }
}

function exReveal() {
  const step = exState.seq[exState.idx];
  if (!step || !step.voicing) return;
  exState.revealed = true;
  const pcs = voicingPitchClasses(step);
  document.getElementById('exHint').textContent =
    'bottom → top:  ' + pcs.map(pc => pcName(pc)).join('  ');
}

function exSkip() {
  if (exState.idx < exState.seq.length) {
    exState.idx++;
    if (exState.module) saveExerciseProgress(exState.module.id, exState.idx);
    renderExStep();
  }
}

// called per note-on for scale exercises (sequential engine)
export function exerciseNoteOn(midiNote) {
  if (!exState.module || !exState.module.scaleMode) return;
  if (exState.idx >= exState.seq.length) return;
  const result = scaleEngine.noteOn(midiNote);
  if (result.event === 'wrong-start') {
    const step = exState.seq[exState.idx];
    document.getElementById('exFeedback').textContent = `Start on ${pcName(step.root)} (any octave)`;
    return;
  }
  if (result.event === 'correct') {
    const prog = document.getElementById('exHint');
    const s = scaleEngine.state();
    if (prog) prog.textContent = `${s.cursor} / ${s.total} notes`;
    return;
  }
  if (result.event === 'wrong') {
    const fb = document.getElementById('exFeedback');
    fb.textContent = 'wrong note — keep going';
    fb.style.color = 'var(--wrong)';
    setTimeout(() => { if (fb) { fb.textContent = ''; fb.style.color = ''; } }, 600);
    return;
  }
  if (result.event === 'complete') {
    document.getElementById('exFeedback').textContent = '✓';
    document.getElementById('exTarget').className = 'big flash-ok';
    exState.idx++;
    saveExerciseProgress(exState.module.id, exState.idx);
    setTimeout(renderExStep, 600);
  }
}

export function checkExercise() {
  if (!exState.module || exState.module.level !== 2) return;
  if (exState.idx >= exState.seq.length) return;
  const step = exState.seq[exState.idx];
  const notes = [...activeNotes];

  if (exState.module.voicingMode) {
    // need: correct shape (octave-agnostic) AND correct pitch classes (right key)
    if (notes.length !== step.voicing.length) return;
    const shapeOK = matchVoicing(notes, step.voicing);
    const targetPCs = new Set(voicingPitchClasses(step));
    const playedPCs = new Set(notes.map(n => n % 12));
    const pcsOK = targetPCs.size === playedPCs.size && [...targetPCs].every(pc => playedPCs.has(pc));
    if (shapeOK && pcsOK) {
      document.getElementById('exFeedback').textContent = '✓ that\'s the Drop 2 shape';
      document.getElementById('exTarget').className = 'big flash-ok';
      exState.idx++;
      saveExerciseProgress(exState.module.id, exState.idx);
      setTimeout(renderExStep, 550);
    }
    return;
  }

  // plain chord step — judge by the target's notes (handles ambiguous sets)
  if (chordMatchesTarget(notes, step)) {
    document.getElementById('exFeedback').textContent = '✓';
    exState.idx++;
    saveExerciseProgress(exState.module.id, exState.idx);
    setTimeout(renderExStep, 450);
  }
}
