// ============================================================
//  play/notation.js — VexFlow rendering for Play mode.
//  Draws a song as one horizontal strip of measures (treble clef,
//  melody notes or whole rests, chord symbols above each chord).
//  Returns a layout so the mode can map a fractional beat → x-pixel
//  and slide the strip under a fixed playhead.
// ============================================================
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot } from 'vexflow';
import { beatsToDuration, midiToVexKey, spellChord, simplifyQuality } from '../theory.js';

const INK = '#f4ede1';        // light staff colour for the dark theme
const ACCENT = '#e8a33d';
const STRIP_H = 150;
const STAVE_TOP = 44;          // headroom for chord symbols
const FIRST_W = 260;           // first measure: clef + time signature
const BAR_W = 190;
const PAD_L = 10;

function applyDots(note, dots) {
  for (let i = 0; i < dots; i++) Dot.buildAndAttach([note]);
}

// melody StaveNotes for one bar (or a single whole rest if no melody)
function buildMelodyNotes(b, preferFlat) {
  if (!b.melody || b.melody.length === 0) {
    return [new StaveNote({ keys: ['b/4'], duration: 'wr' })];
  }
  return b.melody.map(ev => {
    const { duration, dots } = beatsToDuration(ev.beats);
    if (ev.midi == null) {
      const rest = new StaveNote({ keys: ['b/4'], duration: duration + 'r' });
      applyDots(rest, dots);
      return rest;
    }
    const { key, accidental } = midiToVexKey(ev.midi, preferFlat);
    const note = new StaveNote({ keys: [key], duration });
    if (accidental) note.addModifier(new Accidental(accidental), 0);
    applyDots(note, dots);
    return note;
  });
}

function drawChordText(ctx, text, x, y) {
  ctx.save();
  ctx.setFont('Spline Sans Mono, monospace', 13, 'bold');
  ctx.setFillStyle(ACCENT);
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Render the whole song. Returns { svg, totalWidth, height, barXs, beatsPerBar, totalBeats, highlight }.
export function renderSong(container, song, { difficulty = 3 } = {}) {
  container.innerHTML = '';
  const beatsPerBar = song.timeSig[0];
  const beatValue = song.timeSig[1];
  const preferFlat = !!song.preferFlat;

  const totalWidth = PAD_L * 2 + FIRST_W + (song.bars.length - 1) * BAR_W;
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(totalWidth, STRIP_H);
  const ctx = renderer.getContext();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);

  const barXs = [];
  let x = PAD_L;
  song.bars.forEach((b, i) => {
    const w = i === 0 ? FIRST_W : BAR_W;
    const stave = new Stave(x, STAVE_TOP, w);
    if (i === 0) stave.addClef('treble').addTimeSignature(`${beatsPerBar}/${beatValue}`);
    stave.setContext(ctx).draw();

    const notes = buildMelodyNotes(b, preferFlat);
    const voice = new Voice({ num_beats: beatsPerBar, beat_value: beatValue })
      .setStrict(false).addTickables(notes);
    const formatW = w - (i === 0 ? 95 : 28);
    new Formatter().joinVoices([voice]).format([voice], formatW);
    voice.draw(ctx, stave);

    const ns = stave.getNoteStartX();
    const ne = stave.getX() + stave.getWidth();
    // chord symbols, positioned by each chord's start beat within the bar
    let beatAcc = 0;
    for (const ch of b.chords) {
      const cx = ns + (beatAcc / beatsPerBar) * (ne - ns);
      drawChordText(ctx, spellChord({ root: ch.root, quality: simplifyQuality(ch.quality, difficulty) }, preferFlat), cx, STAVE_TOP - 14);
      beatAcc += ch.beats;
    }

    barXs.push({ x: ns, endX: ne, startBeat: i * beatsPerBar });
    x += w;
  });

  const svg = container.querySelector('svg');
  svg.style.display = 'block';

  // a highlight rect that sits behind the notes and marks the current bar
  const NS = 'http://www.w3.org/2000/svg';
  const highlight = document.createElementNS(NS, 'rect');
  highlight.setAttribute('y', String(STAVE_TOP - 6));
  highlight.setAttribute('height', '92');
  highlight.setAttribute('rx', '5');
  highlight.setAttribute('fill', 'rgba(232,163,61,0.13)');
  highlight.setAttribute('x', '0');
  highlight.setAttribute('width', '0');
  svg.insertBefore(highlight, svg.firstChild); // behind everything

  return {
    svg, totalWidth, height: STRIP_H, barXs, beatsPerBar,
    totalBeats: song.bars.length * beatsPerBar, highlight,
  };
}

// fractional beat → x-pixel within the strip
export function beatToX(pos, layout) {
  const { barXs, beatsPerBar, totalBeats } = layout;
  const p = Math.max(0, Math.min(pos, totalBeats));
  let idx = Math.floor(p / beatsPerBar);
  if (idx >= barXs.length) idx = barXs.length - 1;
  const bar = barXs[idx];
  const frac = (p - idx * beatsPerBar) / beatsPerBar;
  return bar.x + frac * (bar.endX - bar.x);
}

// which bar index a fractional beat falls in
export function barIndexAt(pos, layout) {
  const idx = Math.floor(Math.max(0, pos) / layout.beatsPerBar);
  return Math.max(0, Math.min(idx, layout.barXs.length - 1));
}

// move the highlight rect to cover a given bar
export function highlightBar(idx, layout) {
  const bar = layout.barXs[idx];
  if (!bar || !layout.highlight) return;
  // cover from this bar's note-start to the next bar's note-start (or strip end)
  const next = layout.barXs[idx + 1];
  const left = bar.x - 6;
  const right = next ? next.x - 6 : bar.endX + 6;
  layout.highlight.setAttribute('x', String(left));
  layout.highlight.setAttribute('width', String(Math.max(0, right - left)));
}
