// Minimal Standard MIDI File reader: one melody line (highest note of each chord) per track, split into bars.
export function parseMidi(buffer) {
  const d = new DataView(buffer);
  let p = 0;
  const str = (n) => String.fromCharCode(...new Uint8Array(buffer, (p += n) - n, n));
  if (str(4) !== 'MThd') throw new Error('Not a MIDI file');
  const hlen = d.getUint32(p);
  const count = d.getUint16(p + 6);
  const division = d.getUint16(p + 8);
  if (division & 0x8000) throw new Error('SMPTE timing is not supported');
  p = 8 + hlen;

  const vlq = () => {
    let v = 0, b;
    do { b = d.getUint8(p++); v = v * 128 + (b & 127); } while (b & 128);
    return v;
  };

  const tracks = [];
  for (let t = 0; t < count; t++) {
    if (str(4) !== 'MTrk') throw new Error('Corrupt MIDI file');
    const end = p + 4 + d.getUint32(p);
    p += 4;
    let tick = 0, status = 0, name = '';
    const notes = [];
    while (p < end) {
      tick += vlq();
      if (d.getUint8(p) & 0x80) status = d.getUint8(p++);
      if (status === 0xff) {
        const type = d.getUint8(p++), len = vlq();
        if (type === 3) name = str(len); else p += len;
      } else if (status === 0xf0 || status === 0xf7) {
        p += vlq();
      } else {
        const hi = status >> 4, a = d.getUint8(p), b = hi === 0xc || hi === 0xd ? 1 : d.getUint8(p + 1);
        p += hi === 0xc || hi === 0xd ? 1 : 2;
        // channel 10 (index 9) is drums, not a melody
        if (hi === 9 && b > 0 && (status & 15) !== 9) notes.push({ tick, midi: a });
      }
    }
    p = end;
    if (notes.length) tracks.push({ name: name || `Track ${t + 1}`, notes });
  }
  return { division, tracks };
}

// shortcut: assumes 4/4 bars, upgrade by reading the time-signature meta event.
export function trackToLines(track, division) {
  const top = new Map(); // tick -> highest midi note
  for (const n of track.notes) top.set(n.tick, Math.max(top.get(n.tick) ?? 0, n.midi));
  const bars = new Map();
  for (const [tick, midi] of [...top].sort((a, b) => a[0] - b[0])) {
    const bar = Math.floor(tick / (division * 4));
    if (!bars.has(bar)) bars.set(bar, []);
    bars.get(bar).push(midi - 60); // C4 = 60
  }
  return [...bars.values()];
}
