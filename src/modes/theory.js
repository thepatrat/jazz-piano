// ============================================================
//  modes/theory.js — read-to-understand explainers.
//  Each topic is written prose + optional interactive keyboard
//  examples (light up the notes) + optional YouTube embed/links.
//  Counterpart to Exercises (do-to-practice).
// ============================================================
import { THEORY_TOPICS } from '../data/theory.js';
import { paintDemo, clearDemo } from '../ui/keyboard.js';

let demoNotes = [];

// Clear any example notes currently lit on the keyboard.
export function clearTheoryDemo() {
  demoNotes.forEach(n => paintDemo(n, false));
  demoNotes = [];
  clearDemo(); // belt-and-braces: drop any stragglers
}

function highlightExample(notes) {
  clearTheoryDemo();
  demoNotes = notes.slice();
  notes.forEach(n => paintDemo(n, true));
}

export function renderTheoryList() {
  const list = document.getElementById('thList');
  list.innerHTML = '';
  THEORY_TOPICS.forEach(t => {
    const card = document.createElement('div');
    card.className = 'ex-card';
    card.addEventListener('click', () => openTopic(t.id));
    const badges = [];
    if (t.examples && t.examples.length) {
      badges.push(`<span class="ex-badge theory">🎹 ${t.examples.length} examples</span>`);
    }
    if (t.video) badges.push('<span class="ex-badge lvl2">▶ video</span>');
    card.innerHTML = `
      <div class="ex-top"><h3>${t.title}</h3>${badges.join(' ')}</div>
      <div class="ex-desc">${t.blurb}</div>
      <div class="ex-src">↳ ${t.tag}</div>`;
    list.appendChild(card);
  });
}

function openTopic(id) {
  const t = THEORY_TOPICS.find(x => x.id === id);
  clearTheoryDemo();
  document.getElementById('thListWrap').style.display = 'none';
  const r = document.getElementById('thReader');
  r.style.display = 'block';

  const video = t.video
    ? `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${t.video.id}" title="${t.video.label}" allowfullscreen></iframe></div>`
    : '';
  const examples = (t.examples && t.examples.length)
    ? `<div class="th-section-label">Try it on the keyboard ↓</div>
       <div class="th-examples">${t.examples.map((ex, i) => `<button class="th-ex-btn" data-ex="${i}">${ex.label}</button>`).join('')}</div>`
    : '';
  const links = (t.links && t.links.length)
    ? `<div class="th-section-label">Further watching</div>
       <div class="th-links">${t.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener">↗ ${l.label}</a>`).join('')}</div>`
    : '';

  r.innerHTML = `
    <div class="runner-head">
      <button id="thBackBtn">← Back</button>
      <h3>${t.title}</h3>
    </div>
    ${video}
    <div class="th-body">${t.body}</div>
    ${examples}
    ${links}`;

  document.getElementById('thBackBtn').addEventListener('click', closeTopic);
  r.querySelectorAll('.th-ex-btn').forEach(btn => {
    btn.addEventListener('click', () => highlightExample(t.examples[+btn.dataset.ex].notes));
  });
}

function closeTopic() {
  clearTheoryDemo();
  const r = document.getElementById('thReader');
  r.style.display = 'none';
  r.innerHTML = ''; // stops any embedded video
  document.getElementById('thListWrap').style.display = 'block';
}
