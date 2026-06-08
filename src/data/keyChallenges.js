// ============================================================
//  FIND THE KEY — playlist + answer config.
//  The app can't read a YouTube clip's audio (cross-origin), so it
//  can't detect the key on its own. Find-the-Key embeds your curated
//  playlist; you play along, watch your chords trace on the circle,
//  and lock in a guess — then the app lights that key's scale on the
//  keyboard so you can confirm it by ear.
//
//  Optional ✓/✗ scoring: fill KEY_BY_VIDEO with { videoId: {key} } and
//  the mode will check your guess against it (see findKey.js).
// ============================================================

// Your curated playlist (the part after &list= in the URL).
export const PLAYLIST = {
  id: 'PLUdrCfw2Z2WbzHnDzR3Hi-gSDywnLoeLV',
  firstVideo: 's4xIiBFuFHM',
  title: 'Find-the-Key playlist',
};

// Optional answer key, keyed by YouTube video id. Leave empty for pure
// self-check; add entries to enable ✓/✗ scoring. One line per clip, e.g.:
//   's4xIiBFuFHM': { keyPc: 7, keyMode: 'major', preferFlat: false },  // G major
export const KEY_BY_VIDEO = {
};

// Stored answer for a given video id, or null if none curated yet.
export function keyFor(videoId) {
  return (videoId && KEY_BY_VIDEO[videoId]) || null;
}

export function keyName({ keyPc, keyMode, preferFlat }) {
  const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  return `${(preferFlat ? FLAT : SHARP)[keyPc]} ${keyMode}`;
}
