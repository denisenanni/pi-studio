# Pi Studio

Explore, learn, and create with Sonic Pi — in your browser.

**Live site:** https://denisenanni.github.io/pi-studio/

---

## What is Pi Studio?

Pi Studio is two tools in one:

- **Browser** — an interactive reference for all Sonic Pi sounds, synths, FX, scales, chords, and utilities. Click anything to hear it, adjust parameters, and copy the generated Sonic Pi code snippet.
- **Studio** — a visual DAW-like composer. Build loops with a piano roll, chain FX, tweak per-note parameters, and export a ready-to-run `.rb` file directly into Sonic Pi.

---

## Browser

### Tabs

| Tab | Description |
|-----|-------------|
| Samples | All 196 built-in Sonic Pi samples organized by category. Click a cell to play; adjust Rate and Amp with sliders. |
| Chords | All Sonic Pi chords. Pick root note, octave, and number of octaves; play as a block or arpeggio. |
| Scales | ~130 Sonic Pi scales. Pick root note and octave; hear the scale played ascending. |
| FX | Pick a sample, select an FX from the grid, and hear it loop through that effect. Adjust Mix, Amp, and per-FX params live. |
| Synths | All Sonic Pi synths powered by SuperSonic (real scsynth in WebAssembly). Pick a synth, adjust params, play notes. |
| Synth+FX | Combine a synth with up to 3 chained FX. Live `with_fx` snippet reflects all settings. |
| Tools | BPM Calculator, Note Reference, Loop Sync helper. |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / stop |
| `← → ↑ ↓` | Navigate the grid |
| `C` | Copy current snippet to clipboard |

Shortcuts work on all tabs.

---

## Studio

The Studio lets you compose multi-loop Sonic Pi programs visually. Select notes on a piano roll, dial in synth and FX settings, and the code output panel updates in real time. When you're done, export a `.rb` file and run it directly in Sonic Pi.

Key features:

- Piano roll note editing per loop
- Multiple loops with sync modes: Auto, Sync To (another loop), Free
- Per-note parameters: cutoff, attack, decay, sustain, release, amp
- FX chain per loop — up to 3 FX, each with its own mix and parameter controls
- Live code generation — the output panel reflects every change instantly
- Export `.rb` — downloads a ready-to-run Sonic Pi file
- Undo / redo

---

## Architecture

```
src/
├── data/
│   ├── samples.ts        — 196 sample names grouped by category
│   ├── chords.ts         — 69 chord definitions (names + intervals)
│   ├── scales.ts         — ~130 scale definitions (names + semitone steps)
│   ├── fx.ts             — 34 FX definitions (params, min/max/step/default) + preview sample list
│   ├── synths.ts         — all Sonic Pi synth definitions with supported params
│   ├── synthFx.ts        — 15 curated FX definitions for the Synth+FX tab
│   └── loopDurations.ts  — loop duration options for the Studio
├── hooks/
│   ├── useAudioPlayer.ts — Tone.Player playback for samples (rate, amp, loop)
│   ├── useChordPlayer.ts — PolySynth (block) + Synth (arpeggio) chord playback
│   ├── useScalePlayer.ts — Synth-based scale sequencing
│   ├── useFxPlayer.ts    — Looped Tone.Player through a Tone.js FX chain; hot-swaps effect on FX change
│   └── useSuperSonic.ts  — SuperSonic (scsynth WASM) wrapper for synth and Synth+FX tabs
├── components/
│   ├── Topbar.tsx        — tab bar + search input
│   ├── Sidebar.tsx       — sample category list (Samples tab)
│   ├── SampleGrid.tsx    — grid of sample cells
│   ├── ChordsTab.tsx     — root/octave/mode controls + chord grid
│   ├── ScalesTab.tsx     — root/octave controls + scale grid
│   ├── FxTab.tsx         — sample dropdown, FX grid, per-FX sliders, snippet
│   ├── SynthsTab.tsx     — synth picker, params, note/octave controls
│   ├── SynthFxTab.tsx    — synth + up to 3 chained FX, live snippet
│   ├── ToolsTab.tsx      — BPM Calculator, Note Reference, Loop Sync
│   ├── BottomPanel.tsx   — sliders, keyboard hints, snippet + copy (Samples/Chords/Scales)
│   └── LandingPage.tsx   — landing/home screen
├── studio/
│   ├── StudioPage.tsx    — top-level Studio state and composition
│   ├── LoopsPanel.tsx    — loop list with type badges and sync indicators
│   ├── DetailPanel.tsx   — piano roll, note editor, FX chain, sync controls
│   ├── ParamsBar.tsx     — per-note param controls (ADSR, filter, modulation, FX, mixer)
│   ├── Transport.tsx     — BPM, time signature, play/stop, export
│   ├── CodeOutput.tsx    — live generated Sonic Pi code panel
│   ├── WaveformStrip.tsx — waveform visualization strip
│   ├── Tooltip.tsx       — shared tooltip component
│   ├── codeGen.ts        — Sonic Pi code generation from Studio state
│   ├── usePlayback.ts    — Studio playback engine (Tone.js + SuperSonic, lazy-loaded)
│   ├── types.ts          — Studio-specific types (StudioLoop, FxChainEntry, SyncMode, etc.)
│   └── studio.css        — Studio styles
├── utils/
│   └── midi.ts           — MIDI note utilities
├── types.ts              — shared types (ActiveTab union)
└── App.tsx               — global state, all players, routing, keyboard shortcuts
```

---

## Audio

- **Tone.js** for Browser playback — samples, chords, scales, FX approximations.
- **SuperSonic** (Sam Aaron's scsynth WebAssembly port) for the Synths and Synth+FX tabs — real Sonic Pi synth sounds running in the browser via WASM. Loaded from CDN at runtime; not bundled.
- **Studio** uses Tone.js for sample loop playback and SuperSonic for synth loops.

FX in the Browser tab are Tone.js approximations (e.g. `Tone.Freeverb` for `:reverb`). The sonic character is close but not identical to Sonic Pi's SuperCollider backend.

---

## Adding Samples

Copy the FLAC files from your local Sonic Pi installation into `public/samples/`:

**macOS:**
```
/Applications/Sonic Pi.app/Contents/Resources/samples/
```

**Linux:**
```
/usr/lib/sonic-pi/samples/
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- Yarn

### Install & run

```bash
yarn install
yarn dev
```

### Build

```bash
yarn build
```

### Deploy

The app deploys automatically to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`. The base path is set in `vite.config.ts`.

## Roadmap

### Now — fixes and safety nets
- Autosave the Studio composition to localStorage and warn before leaving the page (today a refresh loses all work)
- Fix the 20 `yarn lint` errors and add a lint step to the deploy workflow so broken code can't ship
- Unit tests (Vitest) for `codeGen.ts`: sync modes, repeat groups, rrand params, FX chains, plus undo/redo
- Test and finish loop sync modes and the synth-aware parameter panels (implemented, not yet verified)
- Reconcile the README with `public/samples/`: either stop tracking the FLACs or document that they're committed

### Next — features
- Save and open projects as files (JSON import/export)
- Share a composition by link (state compressed into the URL hash, validated on load like an untrusted file)
- "Copy whole program" button for pasting straight into Sonic Pi
- Starter templates (basic beat, ambient pad, amen break), also reusable as `codeGen` test fixtures

### Refactoring
- Shared `useLatestRef` helper for the "mirror a prop into a ref" pattern in `useAudioPlayer`, `useChordPlayer`, `useScalePlayer` and `useFxPlayer` (also clears most lint errors)
- Move Studio state mutations in `StudioPage.tsx` (~40 `setState` calls) into a typed `useReducer`, which makes undo/redo testable
- Split `DetailPanel.tsx` (~1,400 lines): move `SampleLoopView`, `NoteBlock`, `RepeatGroupOverlay`, `VelocityLane` and the scale helpers into their own files
- Split `App.tsx`'s single `AppState` into per-tab state so each tab owns its own settings
- Rename one of the two unrelated `FxChainEntry` types (`studio/types.ts` vs `hooks/useSuperSonic.ts`)
- Consolidate the duplicated MIDI/note-name helpers (`utils/midi.ts`, `data/synths.ts`, `ToolsTab`, `DetailPanel`, `useFxPlayer`) into `utils/midi.ts`

### Later
- Browser tabs usable on mobile; Studio shows a "best on desktop" notice instead of a cramped piano roll

### Not planned
- Importing `.rb` files into Studio (would mean parsing arbitrary Ruby)
- Bundling or self-hosting SuperSonic (GPL-3.0; the pinned CDN load is fine)
- Accounts or a backend (share-by-link covers it for a static site)

---

## Attributions & Licensing

**This project** — MIT licensed.

**Sonic Pi** — chord names, scale names, scale intervals, FX parameter definitions, and all Sonic Pi syntax used for code generation are derived from the [Sonic Pi](https://sonic-pi.net/) source and documentation, © Sam Aaron, [MIT License](https://github.com/sonic-pi-net/sonic-pi/blob/dev/LICENSE.md).

**SuperSonic** — scsynth WebAssembly port by Sam Aaron, [GPL-3.0](https://github.com/sonic-pi-net/sonic-pi/blob/dev/LICENSE.md). Loaded from CDN at runtime; not bundled in this repository.

**Sample audio files** — not included in this repository. Must be copied from a local Sonic Pi installation (see *Adding Samples* above). All built-in Sonic Pi samples are CC0 (public domain). Full attribution is in [`public/samples/README.md`](public/samples/README.md).

Notable credits:
- `arovane_beat_*` — donated by Uwe Zahn (Arovane) under CC0
- `tbd_*` — donated by The Black Dog under CC0
- All other samples — sourced from [freesound.org](https://freesound.org) under CC0
