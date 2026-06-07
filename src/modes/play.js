// ============================================================
//  modes/play.js — Play mode (Stage 5).
//  Play along to a song. VexFlow staves scroll under a fixed
//  playhead in time with the shared Web Audio transport; the
//  current bar is highlighted and chord/melody hints light up on
//  the keyboard. Flavor picks what to practise; difficulty
//  simplifies the chords; an optional count-in leads you in.
// ============================================================
import { SONGS, findSong, songBeats } from '../data/songs.js';
import { renderSong, beatToX, barIndexAt, highlightBar } from '../play/notation.js';
import * as transport from '../transport.js';
import { scoreOnset, bucketEmoji } from '../rhythmScore.js';
import {
  chordPitchClasses, progressionChordMatches, chordMatchesTarget, simplifyQuality, spellChord,
} from '../theory.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';
import { activeNotes } from '../state.js';

const PLAYHEAD_FRAC = 0.3; // playhead sits 30% from the left of the viewport

let song = null;
let layout = null;
let difficulty = 3;
let flavor = 'both';   // 'listen' | 'comp' | 'melody' | 'both'
let countIn = true;
let bpm = 0;

let playing = false;
let rafId = null;
let offBeat = null;
let t0 = null;         // audio time of transport beat 0
let countOffset = 0;   // beats of count-in before the song starts
let songPos = 0;       // current position in beats (0..totalBeats)
let curBarIdx = -1;
let lastOnsetEmoji = '';

// ---- helpers ----
function beatInterval() { return 60 / transport.getBpm(); }

// the chord sounding at a given song position (handles mid-bar changes)
function activeChord(pos) {
  const bpb = layout.beatsPerBar;
  const idx = Math.max(0, Math.min(Math.floor(pos / bpb), song.bars.length - 1));
  const bar = song.bars[idx];
  let acc = 0;
  for (const ch of bar.chords) {
    if (pos - idx * bpb < acc + ch.beats) return ch;
    acc += ch.beats;
  }
  return bar.chords[bar.chords.length - 1];
}

function curMelodyMidi(idx) {
  const bar = song.bars[idx];
  const ev = bar.melody && bar.melody.find(e => e.midi != null);
  return ev ? ev.midi : null;
}

// ---- keyboard hints, per flavor ----
function lightHints(idx) {
  clearDemo();
  if (flavor === 'listen') return;
  if (flavor === 'comp' || flavor === 'both') {
    const ch = song.bars[idx].chords[0];
    const q = simplifyQuality(ch.quality, difficulty);
    chordPitchClasses(ch.root, q).forEach(pc => paintDemo(60 + pc, true, pc === ch.root));
  }
  if (flavor === 'melody' || flavor === 'both') {
    const m = curMelodyMidi(idx);
    if (m != null) paintDemo(m, true, false);
  }
}

// ---- transform the strip so songPos sits under the playhead ----
function positionStrip(pos) {
  const wrap = document.getElementById('playStripWrap');
  const strip = document.getElementById('playStrip');
  if (!wrap || !strip || !layout) return;
  const playheadX = wrap.clientWidth * PLAYHEAD_FRAC;
  strip.style.transform = `translateX(${playheadX - beatToX(pos, layout)}px)`;
}

function setFeedback(html) {
  const el = document.getElementById('playFeedback');
  if (el) el.innerHTML = html;
}

// ---- the animation loop ----
function loop() {
  if (!playing) return;
  if (t0 == null) { rafId = requestAnimationFrame(loop); return; }
  const raw = (transport.currentAudioTime() - t0) / beatInterval();
  const rel = raw - countOffset;

  if (rel < 0) {
    // count-in
    const count = layout.beatsPerBar + Math.floor(rel) + 1;
    positionStrip(0);
    setFeedback(`<span class="pf-count">Count-in… ${Math.max(1, count)}</span>`);
  } else {
    songPos = rel % layout.totalBeats;
    positionStrip(songPos);
    const idx = barIndexAt(songPos, layout);
    if (idx !== curBarIdx) {
      curBarIdx = idx;
      highlightBar(idx, layout);
      lightHints(idx);
    }
  }
  rafId = requestAnimationFrame(loop);
}

// ---- play / stop ----
function startPlayback() {
  if (playing) return;
  bpm = parseInt(document.getElementById('playBpm').value, 10) || song.bpm;
  playing = true;
  t0 = null;
  countOffset = countIn ? layout.beatsPerBar : 0;
  curBarIdx = -1;
  songPos = 0;
  // Subscribe BEFORE start() so we don't miss beat 0 (start() pumps it
  // immediately). Back-compute beat-0 time from the first beat we see.
  offBeat = transport.onBeat(({ beat, time }) => {
    if (t0 == null) t0 = time - beat * beatInterval();
  });
  transport.start(bpm);
  updateToggleUI();
  rafId = requestAnimationFrame(loop);
}

function stopPlayback() {
  playing = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (offBeat) { offBeat(); offBeat = null; }
  transport.stop();
  t0 = null;
  curBarIdx = -1;
  clearDemo();
  positionStrip(0);
  updateToggleUI();
  setFeedback('');
}

function updateToggleUI() {
  const btn = document.getElementById('playToggle');
  if (btn) btn.innerHTML = playing ? '⏸ Stop' : '▶ Play';
}

// ---- render a song into the strip ----
function loadSong(id) {
  song = findSong(id) || SONGS[0];
  const strip = document.getElementById('playStrip');
  layout = renderSong(strip, song, { difficulty });
  document.getElementById('playBpm').value = song.bpm;
  positionStrip(0);
}

// re-render (e.g. difficulty changed) without losing play state
function rerenderSong() {
  const wasPlaying = playing;
  if (wasPlaying) { stopPlayback(); }
  loadSong(song.id);
  if (wasPlaying) startPlayback();
}

// ---- public: render the whole mode ----
export function renderPlay() {
  const view = document.getElementById('playView');
  const songOpts = SONGS.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
  view.innerHTML = `
    <div class="play-controls">
      <select id="playSong">${songOpts}</select>
      <button id="playToggle">▶ Play</button>
      <label class="play-bpm">BPM <input type="number" id="playBpm" min="40" max="240" step="2" value="80"></label>
      <select id="playFlavor" title="What to practise">
        <option value="listen">👂 Listen</option>
        <option value="comp">🎹 Comp</option>
        <option value="melody">🎵 Melody</option>
        <option value="both" selected>🎼 Both</option>
      </select>
      <label class="play-diff">Difficulty <input type="range" id="playDiff" min="1" max="3" step="1" value="3"><span id="playDiffLbl">Full</span></label>
      <label class="play-countin"><input type="checkbox" id="playCountIn" checked> Count-in</label>
    </div>
    <div class="play-stage">
      <div class="play-playhead" style="left:${PLAYHEAD_FRAC * 100}%"></div>
      <div class="play-strip-wrap" id="playStripWrap"><div class="play-strip" id="playStrip"></div></div>
    </div>
    <div class="play-feedback" id="playFeedback"></div>
    <div class="play-hint">Connect your e-piano and play along. <span class="sw o"></span> chord root <span class="sw g"></span> chord tones / melody. Slow the BPM down to practise.</div>`;

  loadSong(SONGS[0].id);

  document.getElementById('playSong').addEventListener('change', e => { stopPlayback(); loadSong(e.target.value); });
  document.getElementById('playToggle').addEventListener('click', () => { playing ? stopPlayback() : startPlayback(); });
  document.getElementById('playBpm').addEventListener('change', () => { if (playing) { stopPlayback(); startPlayback(); } });
  document.getElementById('playFlavor').addEventListener('change', e => { flavor = e.target.value; if (playing) lightHints(curBarIdx); else clearDemo(); });
  document.getElementById('playCountIn').addEventListener('change', e => { countIn = e.target.checked; });
  const diffEl = document.getElementById('playDiff');
  diffEl.addEventListener('input', e => {
    difficulty = parseInt(e.target.value, 10);
    document.getElementById('playDiffLbl').textContent = ['', 'Triads', 'Sevenths', 'Full'][difficulty];
    rerenderSong();
  });
}

// ---- live note dispatch (wired in main.js) ----
export function playNoteOn(midi, timestamp) {
  if (!playing) return;
  if (typeof timestamp === 'number' && transport.isRunning()) {
    const { bucket } = scoreOnset(timestamp);
    lastOnsetEmoji = bucket !== 'none' ? bucketEmoji(bucket) : '';
  }
}

export function checkPlay() {
  if (!playing || flavor === 'listen') return;
  const notes = [...activeNotes];
  if (notes.length < 1) return;
  const ch = activeChord(songPos);
  const q = simplifyQuality(ch.quality, difficulty);
  let ok = false;
  if (flavor === 'comp' || flavor === 'both') {
    ok = chordMatchesTarget(notes, { root: ch.root, quality: q })
      || progressionChordMatches(notes, { root: ch.root, quality: q });
  }
  if (!ok && (flavor === 'melody' || flavor === 'both')) {
    const m = curMelodyMidi(curBarIdx);
    if (m != null) ok = notes.some(n => n % 12 === m % 12);
  }
  if (ok) {
    setFeedback(`<span class="pf-ok">✓ ${spellChord({ root: ch.root, quality: q }, song.preferFlat)} ${lastOnsetEmoji}</span>`);
  }
}

export function stopPlay() {
  stopPlayback();
}
