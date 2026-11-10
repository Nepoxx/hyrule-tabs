import assert from 'node:assert/strict';
import { convert, parseText, finger } from './notation.js';
import { parseMidi, trackToLines } from './midi.js';

const out = (text) => convert(parseText(text)).lines;

// neutral notes: re fa la si re'
assert.deepEqual(out('re fa la si re5'), ['L R A Y X']);
// stick (whole tone) and D-pad (semitone) shifts
assert.deepEqual(finger([0, 1, 3, 16]), ['↓L', '⇣L', '⇡L', '↑X']);
// lines are kept; unmarked notes follow the previous note's octave (C after B goes up)
assert.deepEqual(out('la si do\nre'), ['A Y ↓X', 'X']);
// whole-melody optimisation: sol after do stays on the held stick (↓A), not ↑R
assert.equal(out('do4 sol4')[0], '↓L ↓A');
// the user's example: Y beats ↑A for si; last sol is a tie (↓A = ↑R, 1 move)
assert.equal(out('do4 sol4 si4 sol4')[0], '↓L ↓A Y ↑R');
// out-of-range melodies are moved by octaves
const high = convert(parseText('do6 re6'));
assert.deepEqual([high.lines[0], high.octaves], ['↓X X', -1]);
assert.throws(() => parseText('H'), /Unknown note/);

// MIDI: one track, C4 then E4+G4 chord (skyline keeps G4), drums ignored
const bytes = [
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96,
  0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 21,
  0, 0x90, 60, 64, 96, 0x80, 60, 0, // C4 for a beat
  0, 0x90, 64, 64, 0, 0x90, 67, 64, // E4+G4 chord
  0, 0x99, 36, 64, // drum hit on channel 10
];
bytes[21] = bytes.length - 22;
const m = parseMidi(new Uint8Array(bytes).buffer);
assert.deepEqual(trackToLines(m.tracks[0], m.division), [[0, 7]]);

console.log('ok');
