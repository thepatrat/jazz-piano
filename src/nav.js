// ============================================================
//  nav.js — tiny navigation registry.
//  Lets feature modules (e.g. Plan) switch the active mode and
//  preconfigure it, without importing main.js (avoids a circular
//  import). main.js registers the real handler at startup.
// ============================================================

let handler = null;

// main.js calls this once with its setMode(mode, opts) function.
export function setNavigator(fn) {
  handler = fn;
}

// Switch to `mode`, optionally passing launch options (see main.js setMode).
export function navigate(mode, opts = {}) {
  if (handler) handler(mode, opts);
}
