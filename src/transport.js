// ============================================================
//  transport.js — Web Audio lookahead-scheduler metronome.
//  Provides a steady click and beat callbacks. The same transport
//  will later drive Play mode's scrolling staves (Stage 5).
//
//  AudioContext is created lazily on the first start() call to
//  satisfy Chrome's autoplay policy (needs a user gesture).
//
//  API:
//    start(bpm)          — begin clicking
//    stop()              — silence and reset
//    setBpm(bpm)         — change tempo (takes effect next beat)
//    onBeat(callback)    — register a beat listener
//    nearestBeatTime(t)  — grid-snap an AudioContext timestamp
//    currentAudioTime()  — expose audioCtx.currentTime
// ============================================================

let audioCtx = null;
let running = false;
let bpm = 80;
let startTime = 0;
let currentBeat = 0;
let timerId = null;
let beatListeners = [];

const LOOKAHEAD = 0.1;     // schedule 100ms ahead
const TICK_MS = 25;         // pump interval

function ensureCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beatInterval() { return 60 / bpm; }

function scheduleClick(time, accent) {
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = accent ? 1000 : 800;
  gain.gain.setValueAtTime(accent ? 0.6 : 0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  osc.start(time);
  osc.stop(time + 0.03);
}

function pump() {
  if (!running) return;
  const ctx = audioCtx;
  const now = ctx.currentTime;
  while (true) {
    const nextTime = startTime + currentBeat * beatInterval();
    if (nextTime > now + LOOKAHEAD) break;
    const accent = currentBeat % 4 === 0;
    scheduleClick(nextTime, accent);
    const beat = currentBeat;
    // fire listeners asynchronously so they don't block the scheduler
    const listeners = beatListeners.slice();
    setTimeout(() => {
      listeners.forEach(cb => cb({ beat, time: nextTime, accent }));
    }, 0);
    currentBeat++;
  }
  timerId = setTimeout(pump, TICK_MS);
}

export function start(newBpm) {
  if (newBpm) bpm = newBpm;
  const ctx = ensureCtx();
  running = true;
  startTime = ctx.currentTime + 0.05; // tiny offset so the first beat isn't in the past
  currentBeat = 0;
  pump();
}

export function stop() {
  running = false;
  if (timerId) { clearTimeout(timerId); timerId = null; }
}

export function setBpm(newBpm) {
  bpm = Math.max(20, Math.min(300, newBpm));
}

export function getBpm() { return bpm; }
export function isRunning() { return running; }

export function onBeat(cb) {
  beatListeners.push(cb);
  return () => { beatListeners = beatListeners.filter(x => x !== cb); };
}

// snap an AudioContext time to the nearest beat gridline
export function nearestBeatTime(audioTime) {
  if (!running) return audioTime;
  const iv = beatInterval();
  const elapsed = audioTime - startTime;
  const beatNum = Math.round(elapsed / iv);
  return startTime + beatNum * iv;
}

export function currentAudioTime() {
  return audioCtx ? audioCtx.currentTime : 0;
}
