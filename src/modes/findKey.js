// ============================================================
//  modes/findKey.js — "Find the Key" ear-training game.
//  Embeds your curated YouTube playlist via the IFrame Player API.
//  Play along on the piano to feel out the root; your chords trace
//  LIVE on the circle of fifths. Click the key you think it's in and
//  Lock — the app lights that key's scale on the keyboard so you can
//  play it against the clip and confirm by ear.
//
//  The IFrame API lets us read which clip is playing, so if you've
//  curated its key in KEY_BY_VIDEO (data/keyChallenges.js) we score the
//  guess ✓/✗ automatically. Otherwise it stays a self-check.
// ============================================================
import { activeNotes } from '../state.js';
import { detectChord, chordLabel, SCALE_DEFS } from '../theory.js';
import {
  chordPlacement, placementPoint, edgePoint, NR_MAJ, NR_MIN,
  ringMarkup, nodesMarkup, arrowDefs, PC_TO_INDEX, MINOR_PC_TO_INDEX,
} from '../ui/circleGeom.js';
import { CIRCLE_FIFTHS } from '../data/circle.js';
import { PLAYLIST, keyFor, keyName } from '../data/keyChallenges.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';

let active = false;
let guess = null;          // { pc, mode:'major'|'minor', index, inner }
let locked = false;
let streak = 0;
let history = [];          // recent traced chords (placements + label)
let lastCommitted = null;
let timer = null;

// IFrame-API player state
let player = null;
let currentVideoId = null;
let currentAnswer = null;  // { keyPc, keyMode, preferFlat } for the playing clip, or null
let currentTitle = '';

// ---- YouTube IFrame API loader (singleton) ----
let ytReady = null;
function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytReady) return ytReady;
  ytReady = new Promise(resolve => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytReady;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ---- player lifecycle ----
async function createPlayer() {
  if (!PLAYLIST.id) return;
  try {
    const YT = await loadYT();
    if (!active || !document.getElementById('fkPlayer')) return;
    player = new YT.Player('fkPlayer', {
      host: 'https://www.youtube-nocookie.com',
      playerVars: { list: PLAYLIST.id, listType: 'playlist', rel: 0, origin: location.origin },
      events: {
        onReady: () => { if (!active) { destroyPlayer(); return; } syncVideo(); },
        onStateChange: () => syncVideo(),
      },
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn('YT IFrame API unavailable — self-check only', e);
  }
}

function destroyPlayer() {
  try { if (player && player.destroy) player.destroy(); } catch (e) { /* ignore */ }
  player = null;
  currentVideoId = null;
  currentAnswer = null;
  currentTitle = '';
}

// read the currently-playing clip; on a new clip, load its answer + reset the round
function syncVideo() {
  if (!player || !player.getVideoData) return;
  const data = player.getVideoData();
  const vid = data && data.video_id;
  if (!vid || vid === currentVideoId) return;
  currentVideoId = vid;
  currentTitle = data.title || '';
  currentAnswer = keyFor(vid);
  const np = document.getElementById('fkNowPlaying');
  if (np) {
    np.dataset.vid = vid; // current clip id (handy for curating its key later)
    np.innerHTML = currentTitle
      ? `▸ Now playing: <b>${escapeHtml(currentTitle)}</b>${currentAnswer ? '' : ' <span class="fk-dim">— no stored key (self-check)</span>'}`
      : '';
  }
  reset();
}

// ---- live trace (adapted from circleTrainer) ----
export function findKeyNoteChanged() {
  if (!active) return;
  clearTimeout(timer);
  timer = setTimeout(commitTrace, 140);
}

function commitTrace() {
  const notes = [...activeNotes];
  if (notes.length < 3) return;
  const c = detectChord(notes);
  if (!c) return;
  if (lastCommitted && lastCommitted.root === c.root && lastCommitted.quality === c.quality) return;
  lastCommitted = { root: c.root, quality: c.quality };
  const place = chordPlacement(c.root, c.quality);
  history.push({ index: place.index, inner: place.inner, label: chordLabel(c) });
  if (history.length > 6) history.shift();
  drawTrace();
  const el = document.getElementById('fkLast');
  if (el) el.innerHTML = history.length ? `Tracing your chords — last: <b>${history[history.length - 1].label}</b>` : '';
}

function arrowChord(a, b) {
  if (a.index === b.index && a.inner === b.inner) return '';
  const pa = placementPoint(a.index, a.inner);
  const pb = placementPoint(b.index, b.inner);
  const rA = a.inner ? NR_MIN + 3 : NR_MAJ + 3;
  const rB = b.inner ? NR_MIN + 6 : NR_MAJ + 6;
  const p1 = edgePoint(pa.x, pa.y, pb.x, pb.y, rA);
  const p2 = edgePoint(pb.x, pb.y, pa.x, pa.y, rB);
  return `<line class="cf-trace-line" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" marker-end="url(#cfArrow)"></line>`;
}

function drawTrace() {
  let s = '';
  for (let i = 1; i < history.length; i++) {
    const op = (0.3 + 0.7 * (i / (history.length - 1))).toFixed(2);
    const seg = arrowChord(history[i - 1], history[i]);
    if (seg) s += seg.replace('<line ', `<line style="opacity:${op}" `);
  }
  document.getElementById('fkTrace').innerHTML = s;
  const hist = new Set(history.map(h => `${h.inner ? 'min' : 'maj'}:${h.index}`));
  document.querySelectorAll('#fkSvg .cf-node').forEach(n => {
    const tag = `${n.dataset.type === 'min' ? 'min' : 'maj'}:${n.dataset.i}`;
    n.classList.toggle('on', hist.has(tag));
  });
}

// ---- guessing ----
function setGuess(g) {
  if (locked) return;
  const i = +g.dataset.i;
  const isMaj = g.dataset.type === 'maj';
  const pc = isMaj ? CIRCLE_FIFTHS[i].pc : (CIRCLE_FIFTHS[i].pc + 9) % 12;
  guess = { pc, mode: isMaj ? 'major' : 'minor', index: i, inner: !isMaj };
  document.querySelectorAll('#fkSvg .cf-node').forEach(n => n.classList.remove('guess'));
  g.classList.add('guess');
  document.getElementById('fkLock').disabled = false;
  setStatus(`You picked <b>${keyName({ keyPc: pc, keyMode: guess.mode, preferFlat: false })}</b>. Lock it in.`);
}

function nodeFor(pc, mode) {
  const index = mode === 'major' ? PC_TO_INDEX[pc] : MINOR_PC_TO_INDEX[pc];
  const type = mode === 'major' ? 'maj' : 'min';
  return document.querySelector(`#fkSvg .cf-node[data-i="${index}"][data-type="${type}"]`);
}

// light a key's scale on the keyboard so the player can test it by ear
function lightKeyScale(pc, mode) {
  clearDemo();
  const def = SCALE_DEFS.find(d => d.id === (mode === 'minor' ? 'natural-minor' : 'major'));
  if (!def) return;
  for (let m = 48; m <= 84; m++) {
    const rel = ((m - pc) % 12 + 12) % 12;
    if (def.iv.includes(rel)) paintDemo(m, true, rel === 0);
  }
}

function lock() {
  if (!guess || locked) return;
  locked = true;
  document.getElementById('fkLock').disabled = true;

  if (currentAnswer) {
    // scored: we know the playing clip's key
    const ok = guess.pc === currentAnswer.keyPc && guess.mode === currentAnswer.keyMode;
    streak = ok ? streak + 1 : 0;
    nodeFor(currentAnswer.keyPc, currentAnswer.keyMode)?.classList.add('correct');
    if (!ok) document.querySelector('#fkSvg .cf-node.guess')?.classList.add('wrong');
    lightKeyScale(currentAnswer.keyPc, currentAnswer.keyMode); // hear the real key
    const name = keyName(currentAnswer);
    setStatus(ok
      ? `<span class="fk-ok">✓ Yes — ${name}. Streak ${streak}.</span> Its scale is lit — play along to hear it.`
      : `<span class="fk-no">✗ It's ${name}.</span> Its scale is lit — play along to hear it.`);
  } else {
    // self-check: no stored key for this clip
    lightKeyScale(guess.pc, guess.mode);
    const name = keyName({ keyPc: guess.pc, keyMode: guess.mode, preferFlat: false });
    setStatus(`<span class="fk-reveal">Playing in <b>${name}</b>?</span> Its scale is lit on the keyboard — play along with the clip and listen for clashes. Tweak and re-lock if it doesn't sit right.`);
  }
}

function reset() {
  guess = null;
  locked = false;
  history = [];
  lastCommitted = null;
  clearDemo();
  document.querySelectorAll('#fkSvg .cf-node').forEach(n => n.classList.remove('on', 'guess', 'correct', 'wrong'));
  const tr = document.getElementById('fkTrace');
  if (tr) tr.innerHTML = '';
  const last = document.getElementById('fkLast');
  if (last) last.innerHTML = '';
  const lk = document.getElementById('fkLock');
  if (lk) lk.disabled = true;
  setStatus(currentAnswer
    ? 'Play along to find the root, then click the key on the circle and Lock to check.'
    : 'Pick a clip in the player, play along to find the root, then click the key on the circle.');
}

// ---- rendering ----
function setStatus(html) {
  const el = document.getElementById('fkStatus');
  if (el) el.innerHTML = html;
}

function videoHtml() {
  if (!PLAYLIST.id) {
    return `<div class="fk-novideo">No playlist set. Add one in <code>src/data/keyChallenges.js</code>.</div>`;
  }
  // the IFrame API replaces #fkPlayer with the player iframe
  return `<div class="video-embed"><div id="fkPlayer"></div></div>`;
}

export function renderFindKey() {
  active = true;
  guess = null; locked = false; history = []; lastCommitted = null;
  const view = document.getElementById('findKeyView');
  view.innerHTML = `
    <div class="fk-head">
      <div class="label" style="margin:0;">Find the Key — ear training</div>
      <div class="fk-nav"><span>Use the player to move through the playlist ▸</span></div>
    </div>
    <div id="fkVideo" class="fk-video">${videoHtml()}</div>
    <div id="fkNowPlaying" class="fk-nowplaying"></div>
    <div class="fk-layout">
      <div class="cf-svg-col">
        <svg viewBox="-18 -18 396 396" id="fkSvg" role="img" aria-label="Circle of fifths — guess the key">
          ${arrowDefs()}${ringMarkup()}
          <g id="fkTrace"></g>
          ${nodesMarkup()}
        </svg>
      </div>
      <div class="cf-info">
        <div id="fkStatus" class="cf-status"></div>
        <div id="fkLast" class="fk-last"></div>
        <div class="fk-actions">
          <button id="fkLock" disabled>Lock guess</button>
          <button id="fkReset">↻ Reset</button>
        </div>
        <div class="cf-hint" style="margin-top:14px;">
          Click a <b>major</b> key on the rim or a <b>minor</b> key on the inner ring.
          <span class="sw o"></span> majors <span class="sw g"></span> minors. Your played chords trace live.
        </div>
      </div>
    </div>`;

  view.querySelectorAll('#fkSvg .cf-node').forEach(n =>
    n.addEventListener('click', () => setGuess(n)));
  document.getElementById('fkLock').addEventListener('click', lock);
  document.getElementById('fkReset').addEventListener('click', reset);

  reset();
  createPlayer();
}

export function stopFindKey() {
  active = false;
  clearTimeout(timer);
  clearDemo();
  destroyPlayer();
  const v = document.getElementById('fkVideo');
  if (v) v.innerHTML = '';
}
