// Pitches are semitones above C4 (do = 0).
// Neutral note of each button (fixed-do: L=re, R=fa, A=la, Y=si, X=re').
export const BUTTONS = { L: 2, R: 5, A: 9, Y: 11, X: 14 };
export const MIN = 0;
export const MAX = 16; // C4..E5: lowest button -2 to highest button +2

// shift = semitones added to the button: stick moves 2, D-pad moves 1.
const SYMBOL = { '-2': '↓', '-1': '⇣', 0: '', 1: '⇡', 2: '↑' };

const NAMES = { do: 0, c: 0, re: 2, d: 2, mi: 4, e: 4, fa: 5, f: 5, sol: 7, g: 7, la: 9, a: 9, si: 11, ti: 11, b: 11 };
const TOKEN = /^(do|re|mi|fa|sol|la|si|ti|[a-g])([#b]?)(\d?)('*)$/i;

// Thumb effort between two shifts (the shift also identifies the control used).
// stick neutral<->tilt = 1, tilt<->opposite tilt = 2, any D-pad use = 1, D-pad up<->down = .5
function moveCost(a, b) {
  if (a === b) return 0;
  const dpadA = Math.abs(a) === 1, dpadB = Math.abs(b) === 1;
  if (dpadA && dpadB) return 0.5;
  if (dpadA || dpadB) return 1;
  return Math.abs(a - b) / 2;
}

// Tie-break so equal-effort routes prefer neutral, then stick, then D-pad.
const habit = (shift) => (shift === 0 ? 0 : Math.abs(shift) === 2 ? 0.001 : 0.002);

function fingerings(pitch) {
  const out = [];
  for (const [button, base] of Object.entries(BUTTONS)) {
    const shift = pitch - base;
    if (shift >= -2 && shift <= 2) out.push({ button, shift });
  }
  return out;
}

// Viterbi over the whole melody: minimises total thumb movement, not per-note effort.
export function finger(pitches) {
  let prev = [{ shift: 0, cost: 0 }]; // thumb starts neutral
  const layers = [];
  for (const pitch of pitches) {
    const layer = fingerings(pitch).map((f) => {
      let best = null;
      for (const p of prev) {
        const cost = p.cost + moveCost(p.shift, f.shift) + habit(f.shift);
        if (!best || cost < best.cost) best = { cost, back: p };
      }
      return { ...f, ...best };
    });
    if (!layer.length) throw new Error(`Pitch ${pitch} is out of range`);
    layers.push(layer);
    prev = layer;
  }
  const path = [];
  let node = prev.length && prev.reduce((a, b) => (b.cost < a.cost ? b : a));
  for (let i = layers.length - 1; i >= 0; i--, node = node.back) path.unshift(node);
  return path.map((n) => SYMBOL[n.shift] + n.button);
}

// Moves the melody by whole octaves to fit the range, then folds stragglers.
export function fitRange(lines) {
  const all = lines.flat();
  let octaves = 0, bestCount = -1;
  for (const k of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]) {
    const count = all.filter((p) => p + 12 * k >= MIN && p + 12 * k <= MAX).length;
    if (count > bestCount) [octaves, bestCount] = [k, count];
  }
  const folded = all.length - bestCount;
  const fix = (p) => {
    p += 12 * octaves;
    while (p < MIN) p += 12;
    while (p > MAX) p -= 12; // range is wider than an octave, so this always lands
    return p;
  };
  return { lines: lines.map((l) => l.map(fix)), octaves, folded };
}

// "A B C" / "do re mi" / "C#5" / "do'" -> pitch lines. Unmarked notes take the octave nearest the previous note.
export function parseText(text) {
  let prev = 5.5;
  return text.split('\n').map((line) =>
    line.trim().split(/\s+/).filter(Boolean).map((tok) => {
      const m = TOKEN.exec(tok);
      if (!m) throw new Error(`Unknown note "${tok}"`);
      const [, name, acc, oct, ticks] = m;
      let base = NAMES[name.toLowerCase()] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
      if (oct) base += (Number(oct) - 4) * 12;
      else if (ticks) base += 12 * ticks.length;
      else base += 12 * Math.round((prev - base) / 12);
      prev = base;
      return base;
    }),
  );
}

export function convert(lines) {
  const fit = fitRange(lines);
  const keys = finger(fit.lines.flat());
  let i = 0;
  return {
    lines: fit.lines.map((l) => keys.slice(i, (i += l.length)).join(' ')),
    octaves: fit.octaves,
    folded: fit.folded,
  };
}
