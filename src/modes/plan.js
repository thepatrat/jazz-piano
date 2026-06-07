// ============================================================
//  modes/plan.js — the "Plan" mode: a visual roadmap.
//  Stops are clustered by level along a winding path. Each stop
//  shows its progress (untouched / in-progress / mastered) so the
//  whole journey is legible at a glance. Click a stop to see what
//  it is, when you're ready to move on, and to launch it in the
//  relevant mode. Not a rail — pick whatever you like.
// ============================================================
import { ROADMAP, findNode } from '../data/roadmap.js';
import { loadPlanProgress, savePlanProgress } from '../db.js';
import { navigate } from '../nav.js';

const TYPE_META = {
  theory:   { icon: '📖', label: 'Theory',   mode: 'theory' },
  drill:    { icon: '🎯', label: 'Drill',    mode: 'drill' },
  exercise: { icon: '🎹', label: 'Exercise', mode: 'exercises' },
  scales:   { icon: '🎼', label: 'Scales',   mode: 'scales' },
  circle:   { icon: '⟳',  label: 'Circle',   mode: 'circle' },
  free:     { icon: '🎶', label: 'Play',     mode: null },
};

// ---- SVG layout constants (viewBox units) ----
const VW = 1000;
const COLS = [200, 500, 800];
const PER_ROW = COLS.length;
const ROW_H = 150;
const HEADER_H = 84;
const TOP = 24;
const NODE_R = 36;

let progress = {};
let selectedId = null;

// translate a node into a (mode, opts) launch for nav.js
function buildLaunch(node) {
  const mode = TYPE_META[node.type]?.mode;
  if (!mode) return null;
  switch (node.type) {
    case 'theory':   return { mode, opts: { topicId: node.ref } };
    case 'drill':    return { mode, opts: { level: node.ref } };
    case 'exercise': return { mode, opts: { moduleId: node.ref } };
    case 'scales':   return { mode, opts: { root: node.ref?.root, scaleId: node.ref?.scaleId } };
    case 'circle':   return { mode, opts: {} };
    default:         return { mode, opts: {} };
  }
}

function nodeState(id) {
  const d = progress[id];
  if (d?.mastered) return 'mastered';
  if (d?.practiced) return 'progress';
  return 'new';
}

// compute (x,y) for every node + the level header bands
function layout() {
  const pos = {};
  const bands = [];
  const order = [];
  let y = TOP;
  for (const lvl of ROADMAP) {
    bands.push({ y, title: lvl.title, subtitle: lvl.subtitle });
    y += HEADER_H;
    lvl.nodes.forEach((node, i) => {
      const row = Math.floor(i / PER_ROW);
      const inRow = i % PER_ROW;
      // snake: even rows L→R, odd rows R→L, so the path flows continuously
      const col = row % 2 === 0 ? inRow : PER_ROW - 1 - inRow;
      pos[node.id] = { x: COLS[col], y: y + row * ROW_H + NODE_R + 6 };
      order.push(node.id);
    });
    const rows = Math.ceil(lvl.nodes.length / PER_ROW);
    y += rows * ROW_H + 16;
  }
  return { pos, bands, order, height: y + 8 };
}

function trackPath(order, pos) {
  return order.map((id, i) => {
    const p = pos[id];
    return (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`;
  }).join(' ');
}

function buildSvg() {
  const { pos, bands, order, height } = layout();
  const track = `<path class="rm-track" d="${trackPath(order, pos)}" />`;

  const bandSvg = bands.map(b => `
    <text class="rm-band-title" x="40" y="${b.y + 30}">${b.title}</text>
    <text class="rm-band-sub" x="40" y="${b.y + 54}">${b.subtitle}</text>
    <line class="rm-band-rule" x1="40" y1="${b.y + 66}" x2="${VW - 40}" y2="${b.y + 66}" />
  `).join('');

  const nodeSvg = order.map(id => {
    const node = findNode(id);
    const p = pos[id];
    const meta = TYPE_META[node.type];
    const state = nodeState(id);
    const sel = id === selectedId ? ' selected' : '';
    const badge = state === 'mastered'
      ? `<text class="rm-check" x="${p.x + NODE_R - 6}" y="${p.y - NODE_R + 12}">✓</text>`
      : '';
    return `
      <g class="rm-node ${state}${sel}" data-id="${id}" tabindex="0" role="button">
        <circle class="rm-disc" cx="${p.x}" cy="${p.y}" r="${NODE_R}" />
        <text class="rm-icon" x="${p.x}" y="${p.y}">${meta.icon}</text>
        ${badge}
        <text class="rm-label" x="${p.x}" y="${p.y + NODE_R + 22}">${node.title}</text>
      </g>`;
  }).join('');

  return `<svg class="rm-svg" viewBox="0 0 ${VW} ${height}" role="img" aria-label="Practice roadmap">
    ${bandSvg}${track}${nodeSvg}
  </svg>`;
}

function timeSince(ts) {
  const d = Math.max(0, Date.now() - ts);
  const min = d / 60000;
  if (min < 1) return 'just now';
  if (min < 60) return Math.round(min) + 'm ago';
  const hr = min / 60;
  if (hr < 24) return Math.round(hr) + 'h ago';
  const day = hr / 24;
  if (day < 30) return Math.round(day) + 'd ago';
  return Math.round(day / 30) + 'mo ago';
}

function detailHtml() {
  const node = selectedId ? findNode(selectedId) : null;
  if (!node) {
    return `<div class="rm-detail-empty">Tap a stop on the path to see what it is, when you're ready to move on, and to start practising.</div>`;
  }
  const meta = TYPE_META[node.type];
  const d = progress[node.id] || {};
  const launch = buildLaunch(node);

  const stats = [];
  if (d.practiced) stats.push(`${d.practiced}× practised`);
  if (d.lastTs) stats.push(`last ${timeSince(d.lastTs)}`);
  if (d.mastered) stats.push('✓ mastered');
  const statsLine = stats.length
    ? `<div class="rm-d-stats">${stats.join(' · ')}</div>`
    : `<div class="rm-d-stats rm-d-muted">not started yet</div>`;

  const practiceBtn = launch
    ? `<button class="rm-practice" id="rmPractice">${meta.icon} Practise ${meta.label} →</button>`
    : '';
  const masterBtn = `<button class="rm-master${d.mastered ? ' on' : ''}" id="rmMaster">${d.mastered ? '✓ Mastered' : 'Mark mastered'}</button>`;

  return `
    <div class="rm-d-top">
      <span class="rm-d-badge ${node.type}">${meta.icon} ${meta.label}</span>
      <h3>${node.title}</h3>
    </div>
    <p class="rm-d-blurb">${node.blurb}</p>
    <div class="rm-d-moveon"><b>Ready to move on?</b> ${node.moveOn}</div>
    ${statsLine}
    <div class="rm-d-actions">${practiceBtn}${masterBtn}</div>`;
}

function wireDetail() {
  const practice = document.getElementById('rmPractice');
  if (practice) {
    practice.addEventListener('click', async () => {
      const node = findNode(selectedId);
      const launch = buildLaunch(node);
      if (!launch) return;
      const d = progress[node.id] || {};
      progress[node.id] = { ...d, practiced: (d.practiced || 0) + 1, lastTs: Date.now() };
      await savePlanProgress(progress);
      navigate(launch.mode, launch.opts);
    });
  }
  const master = document.getElementById('rmMaster');
  if (master) {
    master.addEventListener('click', async () => {
      const d = progress[selectedId] || {};
      progress[selectedId] = { ...d, mastered: !d.mastered };
      await savePlanProgress(progress);
      render(); // refresh node state + button
    });
  }
}

function selectNode(id) {
  selectedId = id;
  render();
}

function render() {
  const view = document.getElementById('planView');
  view.innerHTML = `
    <div class="rm-intro">Your roadmap — a landscape, not a rail. Work whatever stop calls to you; the path just shows how the skills build.</div>
    <div class="rm-map">${buildSvg()}</div>
    <div class="rm-detail" id="planDetail">${detailHtml()}</div>`;

  view.querySelectorAll('.rm-node').forEach(g => {
    const fire = () => selectNode(g.dataset.id);
    g.addEventListener('click', fire);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
  });
  wireDetail();
}

export async function renderPlan() {
  progress = await loadPlanProgress();
  render();
}
