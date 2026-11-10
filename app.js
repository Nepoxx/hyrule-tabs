import { convert, parseText } from './notation.js';
import { parseMidi, trackToLines } from './midi.js';

const $ = (id) => document.getElementById(id);
let midi = null;

// shortcut: every note lasts the same time, upgrade by keeping MIDI durations and rests.
const NOTE = 0.4;
let ctx = null, pitches = [], spans = []; // spans[i] is the notation for pitches[i]

function show(lines) {
  spans = [];
  const nodes = [];
  for (const line of lines) {
    for (const tok of line.split(' ').filter(Boolean)) {
      const s = document.createElement('span');
      s.textContent = tok;
      spans.push(s);
      nodes.push(s, ' ');
    }
    nodes.push('\n');
  }
  $('out').replaceChildren(...nodes);
}

function mark(i) {
  spans.forEach((s, j) => s.classList.toggle('on', j === i));
  spans[i]?.scrollIntoView({ block: 'nearest' });
}

function stop() {
  ctx?.close();
  ctx = null;
  mark(-1);
}

function play() {
  stop();
  const mine = (ctx = new AudioContext());
  const start = mine.currentTime + 0.05;
  const tick = () => {
    if (ctx !== mine) return; // stopped or restarted
    const i = Math.floor((mine.currentTime - start) / NOTE);
    mark(i < pitches.length ? i : -1);
    if (i < pitches.length) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  pitches.forEach((p, i) => {
    const t = start + i * NOTE;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = 261.6256 * 2 ** (p / 12); // C4 = pitch 0
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
    gain.gain.setValueAtTime(0.3, t + NOTE - 0.1);
    gain.gain.linearRampToValueAtTime(0, t + NOTE - 0.02);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + NOTE);
  });
}

$('play').addEventListener('click', play);
$('stop').addEventListener('click', stop);

function render(getLines) {
  stop();
  pitches = [];
  spans = [];
  try {
    const r = convert(getLines());
    pitches = r.pitches;
    show(r.lines);
    const notes = [];
    if (r.octaves) notes.push(`Moved ${Math.abs(r.octaves)} octave(s) ${r.octaves > 0 ? 'up' : 'down'} to fit.`);
    if (r.folded) notes.push(`${r.folded} note(s) still out of range were folded into it.`);
    $('msg').textContent = notes.join(' ');
  } catch (e) {
    $('out').textContent = '';
    $('msg').textContent = e.message;
  }
}

const fromText = () => render(() => parseText($('text').value));
const fromTrack = () => render(() => trackToLines(midi.tracks[$('track').value], midi.division));

$('text').addEventListener('input', () => { midi = null; $('track').hidden = true; fromText(); });
$('track').addEventListener('change', fromTrack);
$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    midi = parseMidi(await file.arrayBuffer());
  } catch (err) {
    $('msg').textContent = err.message;
    return;
  }
  $('track').replaceChildren(...midi.tracks.map((t, i) => new Option(`${t.name} (${t.notes.length} notes)`, i)));
  $('track').hidden = false;
  fromTrack();
});
