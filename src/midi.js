// ============================================================
//  midi.js — Web MIDI input. Unchanged behaviour from the prototype,
//  just decoupled via callbacks. Works in Chrome / Edge / Opera.
// ============================================================

function setStatus(txt, on, waiting = false) {
  document.getElementById('statusTxt').textContent = txt;
  const dot = document.getElementById('dot');
  dot.classList.toggle('on', !!on);
  dot.classList.toggle('waiting', !!waiting);
}

import { currentAudioTime } from './transport.js';

// handlers: { onNoteOn(note, timestamp), onNoteOff(note) }
// timestamp is the AudioContext time at the moment of note-on (for rhythm scoring).
export function initMIDI(handlers) {

  const handleMIDI = (msg) => {
    const [status, note, vel] = msg.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && vel > 0) {
      handlers.onNoteOn(note, currentAudioTime());
    } else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
      handlers.onNoteOff(note);
    }
  };

  if (!navigator.requestMIDIAccess) {
    setStatus('Web MIDI not supported — use Chrome', false);
    return;
  }
  navigator.requestMIDIAccess().then((access) => {
    const attach = () => {
      let count = 0;
      access.inputs.forEach((inp) => {
        inp.onmidimessage = handleMIDI;
        count++;
        setStatus('Connected: ' + inp.name, true);
      });
      if (count === 0) setStatus('Waiting for MIDI device…', false, true);
    };
    attach();
    access.onstatechange = attach;
  }).catch(() => setStatus('MIDI access denied', false));
}
