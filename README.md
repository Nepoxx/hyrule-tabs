# Hyrule Tabs

Turn a MIDI file or a line of typed notes into button notation for the ocarina in *Ocarina of Time* (Switch 2 remake).

**Live:** https://nepoxx.github.io/hyrule-tabs/

```
do re mi  ->  ↓L L ↑L
```

## Notation

| Symbol | Meaning |
|---|---|
| `L R A Y X` | button, stick neutral (re, fa, la, si, high re) |
| `↓` `↑` | hold the stick down / up: shifts the note by a whole tone |
| `⇣` `⇡` | press D-pad down / up: shifts the note by a semitone |

The range is C4 to E5, and every semitone in it can be played. Notes outside it are shifted by octaves, with a warning.

When a note can be played more than one way, the converter picks the combination that moves the stick and thumb the least across the whole piece.

## Input

- **Text:** `A B C`, `do re mi`, `C#5`, `do'` (octave up). Notes without an octave take the one nearest the previous note. One line per bar.
- **MIDI:** pick a track. The highest note of each chord is kept, drums are skipped, and bars are assumed to be 4/4.

## Run it

No build step. Serve the folder (browsers block ES modules from `file://`):

```
python3 -m http.server
node test.mjs
```

## Caveat

The pitch shifts (stick = 2 semitones, D-pad = 1) were worked out by ear and from an example, not from official documentation. Corrections welcome.

Unofficial fan project, not affiliated with or endorsed by Nintendo.
