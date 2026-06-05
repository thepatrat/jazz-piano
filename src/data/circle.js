// ============================================================
//  CIRCLE OF FIFTHS data — clockwise from C at 12 o'clock.
//  Clockwise = up a fifth (C→G→D…); counter-clockwise = up a fourth.
//  pc = root pitch class (0=C). major/minor are display spellings.
// ============================================================
export const CIRCLE_FIFTHS = [
  { pc: 0,  major: 'C',  minor: 'Am',  accidentals: 'no sharps or flats' },
  { pc: 7,  major: 'G',  minor: 'Em',  accidentals: '1 sharp · F♯' },
  { pc: 2,  major: 'D',  minor: 'Bm',  accidentals: '2 sharps · F♯ C♯' },
  { pc: 9,  major: 'A',  minor: 'F♯m', accidentals: '3 sharps · F♯ C♯ G♯' },
  { pc: 4,  major: 'E',  minor: 'C♯m', accidentals: '4 sharps · F♯ C♯ G♯ D♯' },
  { pc: 11, major: 'B',  minor: 'G♯m', accidentals: '5 sharps' },
  { pc: 6,  major: 'G♭', minor: 'E♭m', accidentals: '6 flats / 6 sharps' },
  { pc: 1,  major: 'D♭', minor: 'B♭m', accidentals: '5 flats' },
  { pc: 8,  major: 'A♭', minor: 'Fm',  accidentals: '4 flats · B♭ E♭ A♭ D♭' },
  { pc: 3,  major: 'E♭', minor: 'Cm',  accidentals: '3 flats · B♭ E♭ A♭' },
  { pc: 10, major: 'B♭', minor: 'Gm',  accidentals: '2 flats · B♭ E♭' },
  { pc: 5,  major: 'F',  minor: 'Dm',  accidentals: '1 flat · B♭' },
];
