// ============================================================
//  midi.js — Web MIDI input. Unchanged behaviour from the prototype,
//  just decoupled via callbacks. Works in Chrome / Edge / Opera.
// ============================================================

function setStatus(txt, on) {
  document.getElementById('statusTxt').textContent = txt;
  document.getElementById('dot').classList.toggle('on', !!on);
}

// handlers: { onNoteOn(note), onNoteOff(note) }
export function initMIDI(handlers) {
  const handleMIDI = (msg) => {
    const [status, note, vel] = msg.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && vel > 0) {
      handlers.onNoteOn(note);
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
      if (count === 0) setStatus('Waiting for MIDI device…', false);
    };
    attach();
    access.onstatechange = attach;
  }).catch(() => setStatus('MIDI access denied', false));
}
