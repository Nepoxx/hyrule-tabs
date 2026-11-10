import { convert, parseText } from './notation.js';
import { parseMidi, trackToLines } from './midi.js';

const $ = (id) => document.getElementById(id);
let midi = null;

function render(getLines) {
  try {
    const r = convert(getLines());
    $('out').textContent = r.lines.join('\n');
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
