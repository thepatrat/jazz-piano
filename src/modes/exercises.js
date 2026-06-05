// ============================================================
//  modes/exercises.js — video + generated, musically-meaningful
//  sequences. Voicing steps use engine #2 (matchVoicing); plain
//  chord steps use engine #1 (detectChord).
//  Current step index per module persists to IndexedDB.
// ============================================================
import {
  INV_NAMES, chordLabel, pcName, matchVoicing, voicingPitchClasses, chordMatchesTarget,
} from '../theory.js';
import { exState, activeNotes } from '../state.js';
import { EXERCISE_MODULES } from '../data/modules.js';
import { saveExerciseProgress, loadExerciseProgress } from '../db.js';

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

  r.innerHTML = `
    <div class="runner-head">
      <button id="exBackBtn">← Back</button>
      <h3>${m.title}</h3>
    </div>
    <div class="video-embed">
      <iframe src="https://www.youtube-nocookie.com/embed/${m.videoId}" title="lesson" allowfullscreen></iframe>
    </div>
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
  exState.module = null;
  document.getElementById('exRunner').style.display = 'none';
  document.getElementById('exRunner').innerHTML = ''; // stops the video
  document.getElementById('exListWrap').style.display = 'block';
}

function renderExStep() {
  const { seq, idx, module } = exState;
  exState.revealed = false;
  const isVoicing = module && module.voicingMode;
  if (idx >= seq.length) {
    document.getElementById('exTarget').textContent = '✓ done';
    document.getElementById('exTarget').className = 'big flash-ok';
    document.getElementById('exFeedback').textContent = 'All shapes complete — nice work.';
    document.getElementById('exProg').textContent = '';
    const h = document.getElementById('exHint');
    if (h) h.textContent = '';
    return;
  }
  const step = seq[idx];
  document.getElementById('exProg').textContent = `step ${idx + 1} / ${seq.length}`;
  const t = document.getElementById('exTarget');
  t.textContent = step.label ? '' : chordLabel(step);
  t.className = 'big';
  const fb = document.getElementById('exFeedback');
  if (isVoicing) {
    // show the chord symbol big, the human label below (it's longer)
    t.style.fontSize = '40px';
    t.textContent = chordLabel({ root: step.root, quality: step.quality });
    fb.textContent = step.label.split(' — ')[1] || '';
  } else {
    t.style.fontSize = '';
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
    s.textContent = seq[i].label
      ? INV_NAMES[seq[i].inversion].replace(' position', '').replace('inversion', 'inv')
      : chordLabel(seq[i]);
    if (i < idx) s.className = 'done';
    else if (i === idx) s.className = 'cur';
    seqEl.appendChild(s);
  }
  if (step.tag && isVoicing) {
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
