// ============================================================
//  ui/keyboard.js — the on-screen keyboard (C2..C6, MIDI 48..84).
// ============================================================

const WHITE_PATTERN = [0, 2, 4, 5, 7, 9, 11];

export function buildKeyboard() {
  const kb = document.getElementById('kb');
  kb.innerHTML = '';
  const lo = 48, hi = 84;
  for (let m = lo; m <= hi; m++) {
    if (WHITE_PATTERN.includes(m % 12)) {
      const wk = document.createElement('div');
      wk.className = 'wk';
      wk.id = 'k' + m;
      const nm = document.createElement('div');
      nm.className = 'nm';
      if (m % 12 === 0) nm.textContent = 'C' + (Math.floor(m / 12) - 1);
      wk.appendChild(nm);
      kb.appendChild(wk);
      const bpc = m % 12;
      if ([0, 2, 5, 7, 9].includes(bpc) && m + 1 <= hi) { // has black key to its right
        const bk = document.createElement('div');
        bk.className = 'bk';
        bk.id = 'k' + (m + 1);
        wk.appendChild(bk);
      }
    }
  }
}

export function paintKey(m, on) {
  const e = document.getElementById('k' + m);
  if (e) e.classList.toggle('act', on);
}

// "demo" highlight (distinct colour) — used by Theory examples and the
// Circle of Fifths so it doesn't clash with the orange of live-played notes.
// Pass root=true to mark a note as the root (its own accent colour).
export function paintDemo(m, on, root = false) {
  const e = document.getElementById('k' + m);
  if (e) e.classList.toggle(root ? 'demo-root' : 'demo', on);
}

export function clearDemo() {
  document.querySelectorAll('.kb .demo, .kb .demo-root')
    .forEach(e => e.classList.remove('demo', 'demo-root'));
}
