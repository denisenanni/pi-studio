# Sonic Pi Sample Browser — Task Registry

---

## Task 01 — Project Setup & Sample Data

### Plan

- [x] 1. Scaffold Vite + React + TypeScript project with yarn inside `/sonic-browser`
- [x] 2. Set `base: '/pi-studio/'` in `vite.config.ts` for GitHub Pages
- [x] 3. Install Tone.js (check for any equivalent audio library first — none found)
- [x] 4. Create `src/data/samples.ts` with all sample categories and names typed correctly (no `any`)
- [x] 5. Create `public/samples/README.txt` explaining where to place WAV files
- [x] 6. Create `.github/workflows/deploy.yml` for GitHub Pages deployment on push to `main`
- [x] 7. Clean up Vite boilerplate (remove default CSS, assets, placeholder content); leave `App.tsx` rendering `<h1>Sonic Pi Sample Browser</h1>`

---

## Review — Task 01

**Files created/modified:**

- `vite.config.ts` — added `base: '/pi-studio/'` so asset paths resolve correctly under the GitHub Pages subdirectory.
- `package.json` — renamed package to `pi-studio`, Tone.js added as a dependency.
- `src/data/samples.ts` — defines `SampleCategory` (union type), `Sample` (name + category), `SampleGroup` (category + samples array), plus `SAMPLE_GROUPS` (165 samples across 14 categories) and a flat `ALL_SAMPLES` export. No `any`.
- `public/samples/README.txt` — instructions for copying WAV files from the local Sonic Pi install.
- `.github/workflows/deploy.yml` — builds with `yarn` and publishes `./dist` to GitHub Pages via `peaceiris/actions-gh-pages@v4`.
- `src/App.tsx` — stripped to a single `<h1>` placeholder.
- `src/index.css` — replaced boilerplate with a minimal box-sizing reset.
- `src/App.css`, `src/assets/` — deleted (boilerplate).

**Build:** `yarn build` passes with no TypeScript errors.

---

## Task 02 — Core Playback & SampleCard Component

### Plan

- [x] 1. Create `src/hooks/useAudioPlayer.ts` — Tone.js playback hook (play, stop, isPlaying, error, cleanup)
- [x] 2. Create `src/components/SampleCard.tsx` — card with rate/amp sliders, play/stop toggle, code snippet + copy button, error display
- [x] 3. Update `App.tsx` — render 5 hardcoded `SampleCard` instances for end-to-end testing

---

## Review — Task 02

**Files created/modified:**

- `src/hooks/useAudioPlayer.ts` — `useEffect` creates a `Tone.Player` on every `sampleName` change and disposes it on cleanup. `onerror` catches missing WAV files and sets a string error. `play()` calls `toneStart()` to resume AudioContext (required after a user gesture), applies `playbackRate` and `volume` (converted from linear amp via `gainToDb`), then starts playback. `onstop` callback syncs `isPlaying` back to false when the buffer ends naturally. No `any`.
- `src/components/SampleCard.tsx` — owns `rate`/`amp` state, delegates all audio logic to `useAudioPlayer`. Renders name, play/stop button, two range sliders with live value display, Sonic Pi code snippet, copy button, and conditional error message.
- `src/App.tsx` — renders 5 test `SampleCard`s (`bd_haus`, `ambi_choir`, `loop_amen`, `elec_ping`, `perc_bell`).

**Build:** `yarn build` passes with no TypeScript errors.

---

## Task 03 — Fix Audio Playback & Reconcile Sample Data

### Plan

- [x] 1. Fix `.wav` → `.flac` in `useAudioPlayer.ts`
- [x] 2. Update `SampleCategory` union — add `arovane`, `hat`, `ride`, `tbd`
- [x] 3. Fix all renamed entries (glitch, loop, mehackit, perc — drop underscores before numbers)
- [x] 4. Add missing `bd_chip`, `bd_jazz` to the `bd` group
- [x] 5. Add new groups: `arovane` (5), `hat` (21), `ride` (2), `tbd` (11)
- [x] 6. Verify build passes

---

## Review — Task 03

**Files modified:**

- `src/hooks/useAudioPlayer.ts` — changed `.wav` to `.flac` in the URL construction.
- `src/data/samples.ts` — corrected 18 renamed entries (underscore-before-number removed in glitch/loop/mehackit/perc); added `bd_chip` and `bd_jazz`; added 4 new categories (`arovane`, `hat`, `ride`, `tbd`) totalling 39 new samples. Total is now 196 samples across 18 categories. Every name matches an actual file in `public/samples/`.

**Build:** `yarn build` passes with no TypeScript errors.

---

## Task 04 — Console UI

### Plan

- [x] 1. Update `useAudioPlayer.ts` — add `playOnLoad()` for click-to-new-sample autoplay, rate/amp refs for onload closure
- [x] 2. Replace `src/index.css` with dark console theme (color vars, layout, topbar, sidebar, grid, bottom panel)
- [x] 3. Create `src/components/Topbar.tsx`
- [x] 4. Create `src/components/Sidebar.tsx`
- [x] 5. Create `src/components/SampleGrid.tsx` (replaces SampleCard)
- [x] 6. Create `src/components/BottomPanel.tsx`
- [x] 7. Rewrite `App.tsx` — AppState, single useAudioPlayer, keyboard shortcuts, composition
- [x] 8. Delete `src/components/SampleCard.tsx`
- [x] 9. Verify build + smoke test

---

## Review — Task 04

**Files modified/created:**

- `src/hooks/useAudioPlayer.ts` — added `playOnLoad()` which sets `pendingPlayRef`; `onload` callback checks the flag and auto-plays with current rate/amp (read from always-current refs). This solves the async gap between selecting a new sample and its buffer loading.
- `src/index.css` — full dark console theme: CSS custom properties for all colors, layout for app shell, topbar, sidebar, grid, cells, and bottom panel.
- `src/components/Topbar.tsx` — title, Samples/Synths tabs (Synths disabled), search input.
- `src/components/Sidebar.tsx` — category list driven by `SAMPLE_GROUPS`, active highlight.
- `src/components/SampleGrid.tsx` — auto-fill CSS grid of sample cells; selected/playing states via class names.
- `src/components/BottomPanel.tsx` — rate/amp sliders, keyboard shortcut hints, live code snippet, copy button.
- `src/App.tsx` — `AppState` (tab, category, sample, rate, amp, search), single `useAudioPlayer` at app level, `filteredSamples` memo, `document`-level keyboard handler (Space/arrows/C), all composed together.
- `src/components/SampleCard.tsx` — deleted.

**Build:** `yarn build` passes with no TypeScript errors.

---

## Task 05 — Scales Tab

### Plan

- [x] 1. Create `src/data/scales.ts` — Scale type + all ~130 scales with rounded semitone steps
- [x] 2. Create `src/hooks/useScalePlayer.ts` — Synth-based scale playback (setTimeout sequencing, stop/cleanup)
- [x] 3. Update `src/components/Topbar.tsx` — add Scales tab (3 tabs: Samples, Scales, Synths)
- [x] 4. Create `src/components/ScalesTab.tsx` — root note/octave pills + scales grid
- [x] 5. Update `src/components/BottomPanel.tsx` — accept `snippet`/`hasSelection` props; hide Rate on Scales tab
- [x] 6. Update `src/App.tsx` — expand AppState, wire useScalePlayer, keyboard handler, conditional rendering

---

## Review — Task 05

**Files created/modified:**

- `src/data/scales.ts` — `Scale` interface + 130 entries. Western scales use exact integer steps from the source; Turkish makam scales have koma-based intervals rounded to nearest semitone (tanini→2, bakiyye→1, kucuk_mucenneb→1, buyuk_mucenneb→2, artik_ikili→3).
- `src/hooks/useScalePlayer.ts` — creates one `Tone.Synth` on mount (triangle wave, piano-like envelope), kept for the session. `play()` cancels pending timeouts, builds the note array from steps+root+octave, then fires one `setTimeout` per note at 200ms intervals. `stop()` clears all timeouts and calls `triggerRelease()`.
- `src/components/Topbar.tsx` — expanded to `'samples' | 'scales' | 'synths'` ActiveTab type; Scales tab is now enabled.
- `src/components/ScalesTab.tsx` — root note pills (12 notes), octave pills (3,4,5), same CSS grid as samples, each cell shows `:scale_name` + note count.
- `src/components/BottomPanel.tsx` — refactored to accept `snippet`/`hasSelection`/`showRate` props; Rate slider hidden on Scales tab.
- `src/App.tsx` — `AppState` expanded with scales fields; `useScalePlayer` called at app level; keyboard handler branches on `activeTab`; Sidebar hidden on Scales tab; `filteredScales` memo for search.
- `src/index.css` — added `.scales-controls`, `.pill`, `.sample-name-col`, `.scale-note-count` styles.

**Build:** `yarn build` passes with no TypeScript errors.

---

## Task 06 — Chords Tab

### Plan

- [x] 1. Create `src/data/chords.ts` — `Chord` type + all chords parsed from Sonic Pi source (including aliases)
- [x] 2. Create `src/hooks/useChordPlayer.ts` — PolySynth (block) + Synth (arpeggio), play/stop/isPlaying, cleanup
- [x] 3. Update `src/types.ts` — add `'chords'` to `ActiveTab`
- [x] 4. Update `src/components/Topbar.tsx` — add Chords tab between Samples and Scales
- [x] 5. Create `src/components/ChordsTab.tsx` — root/octave/numOctaves/mode controls + chord grid
- [x] 6. Update `src/App.tsx` — expand `AppState`, wire `useChordPlayer`, keyboard shortcuts, conditional rendering

### Review

**Files created/modified:**

- `src/data/chords.ts` — `Chord` type + 69 entries covering every chord name and alias from Sonic Pi's `chord.rb` (including string-keyed entries like `"7"`, `"+5"`, `"m7b5"` and symbol aliases like `maj`/`M`/`major`).
- `src/hooks/useChordPlayer.ts` — creates one `PolySynth` and one `Synth` on mount. Block mode calls `poly.triggerAttack(notes)` on all notes simultaneously, then `releaseAll()` after 1500ms. Arpeggio mode fires one `setTimeout` per note at 120ms intervals. `stop()` clears all timeouts and releases both synths. `playOnLoad()` queues play until `chordName` changes. `useLatestRef` used for all mutable values. No `any`.
- `src/types.ts` — `ActiveTab` now includes `'chords'`.
- `src/components/Topbar.tsx` — Chords tab button added between Samples and Scales.
- `src/components/ChordsTab.tsx` — root note pills, octave pills (3/4/5), num octaves pills (1/2/3), Block/Arpeggio mode pills, chord grid. Reuses all existing CSS classes (`.scales-controls`, `.pill`, `.sample-cell`, etc.). No new styles needed.
- `src/App.tsx` — `AppState` expanded with 6 chord fields; `useChordPlayer` wired; `filteredChords` memo; `handleChordClick` and 4 chord control handlers added; keyboard handler extended for chords tab; `handleSearchChange`, `handleAmpChange`, `handleCopy` updated for 3-tab branching; JSX updated with ternary for three content areas.

**Build:** `yarn build` passes with no TypeScript errors.

---

## Task 07 — FX Tab

### Plan

- [x] 1. Create `src/data/fx.ts` — `FxParam`, `FxDefinition`, `FX_LIST` (all 35 FX), `FX_PREVIEW_SAMPLES` (12–15 curated samples)
- [x] 2. Create `src/hooks/useFxPlayer.ts` — looped sample through Tone.js FX chain; `play()`, `stop()`, `isPlaying`; live param updates; FX/sample hot-swap without stopping; cleanup on unmount; no `any`
- [x] 3. Create `src/components/FxTab.tsx` — top controls row (sample dropdown + play/stop), FX grid, bottom panel with Mix/Amp sliders + per-FX param sliders + live code snippet + copy button; search filter
- [x] 4. Update `src/types.ts` — add `'fx'` to `ActiveTab`
- [x] 5. Update `src/components/Topbar.tsx` — add FX tab (order: Samples | Chords | Scales | FX)
- [x] 6. Update `src/App.tsx` — add FX state fields, wire `useFxPlayer`, keyboard shortcuts, stop playback on tab switch, conditional rendering; extend `handleSearchChange`, `handleAmpChange`, `handleCopy`
- [x] 7. Verify build passes with no TypeScript errors

### Review

**Files created/modified:**

- `src/data/fx.ts` — `FxParam`, `FxDefinition`, `FX_LIST` (34 FX covering all entries in the mapping table), `FX_PREVIEW_SAMPLES` (14 curated samples across drums, bass, melodic, texture). No `any`.
- `src/hooks/useFxPlayer.ts` — `useFxPlayer` hook; builds a Tone.js FX node per `fxKey` via `buildEffect()`; hot-swaps effect on `fxKey` change (dispose old, wire new) without stopping the player; updates params in-place via `updateEffect()` on every param/mix change; separate `useEffect` for amp updates; full cleanup on unmount. Uses `Tone.Freeverb` (has `roomSize`) for reverb/gverb; `Tone.FeedbackDelay` for echo; `Tone.BitCrusher` with `wet` set post-construction; `Tone.Filter` for all filter types (insert, no wet blend); `Tone.Tremolo`/`AutoFilter`/`AutoPanner`/`Chorus`/`PitchShift`/`Distortion`/`Compressor`/`Limiter`/`Volume`/`Panner`/`EQ3` for all others. No `any`.
- `src/components/FxTab.tsx` — self-contained tab: sample dropdown + play/stop row, FX grid (same `.sample-cell` CSS), bottom panel with Mix/Amp + dynamic per-FX sliders + live code snippet + copy button. Receives `filteredFx` and all handlers from App.
- `src/index.css` — added `.fx-tab`, `.fx-top-controls`, `.fx-sample-row`, `.fx-sample-select`, `.fx-play-btn`, `.fx-grid-container`, `.fx-cell`, `.fx-bottom-panel`, `.fx-controls` styles.
- `src/types.ts` — `ActiveTab` now includes `'fx'`.
- `src/components/Topbar.tsx` — FX tab button added (Samples | Chords | Scales | FX | Synths).
- `src/App.tsx` — `AppState` extended with `selectedFx`, `fxSample`, `fxParams`, `fxMix`, `fxAmp`, `fxSearch`; `useFxPlayer` wired; tab-switch effect stops FX playback; `filteredFx` memo; `handleFxClick` resets params to defaults on FX change; keyboard shortcuts extended for FX tab; `handleSearchChange`/`handleAmpChange`/`handleCopy` updated for 4-tab branching; `BottomPanel` hidden on FX tab (FxTab has its own). All other tabs unaffected.

**Build:** `yarn build` passes with no TypeScript errors.

---

## Task 08 — Synths Tab (powered by SuperSonic / scsynth)

### Plan

- [x] 1. Create `src/data/synths.ts` — `SynthParam`, `SynthDefinition`, `SYNTHS` array (35 synths with 4–6 params each)
- [x] 2. Create `src/hooks/useSuperSonic.ts` — singleton engine lifecycle hook; dynamic CDN load; `playNote`, `stopAll`; no `any`
- [x] 3. Create `src/components/SynthsTab.tsx` — engine status banner, note/octave controls, synth grid, bottom panel with param sliders + code snippet
- [x] 4. Update `src/components/Topbar.tsx` — enable Synths tab (remove `disabled`)
- [x] 5. Update `src/App.tsx` — add synths state fields, wire useSuperSonic, stop-on-tab-switch, keyboard shortcuts, conditional rendering; extend `handleSearchChange`, `handleAmpChange`, `handleCopy`
- [x] 6. Add Synths tab CSS to `src/index.css`
- [x] 7. Verify build passes with no TypeScript errors

### Review

**Files created/modified:**

- `src/data/synths.ts` — `SynthParam`, `SynthDefinition` types + `SYNTHS` array (35 Sonic Pi synths). Each synth has `name`, `supersonicName` (`sonic-pi-{name}`), `label`, `doc`, and 4–6 typed params. Filter synths (prophet, tb303, hollow, dark_ambience, blade) get `cutoff`/`res`; FM synths get `divisor`/`depth`; modulation synths get `mod_range`/`mod_rate`. No `any`.
- `src/hooks/useSuperSonic.ts` — Minimal typed interface for SuperSonic (`SuperSonicInstance`). Module-level singleton (`sonicInstance`, `initPromise`, `loadedSynthdefs`) persists across tab switches. `loadSuperSonicScript()` injects a `<script type="module">` tag from unpkg — no bundled import (GPL isolation). `useSuperSonic()` exposes `state` (isReady/isLoading/error), `initEngine()`, `playNote()`, `stopAll()`. `playNote()` stops the previous node, loads the synthdef if not cached, then calls `send('/s_new', ...)` with flat key-value params. Local node ID counter (1000–30000) tracks active nodes for `/n_free`.
- `src/components/SynthsTab.tsx` — Engine status banner (pulsing dot while loading, red text on error). Note/octave pill controls (12 notes × 5 octaves). Synth grid reusing `.sample-cell`/`.fx-cell` CSS classes; per-card spinner while synthdef loads. Bottom panel: all params except `note` rendered as sliders; live code snippet (`synth :name, note: N, ...`); copy button with flash confirmation.
- `src/components/Topbar.tsx` — Synths tab enabled (was `disabled`).
- `src/App.tsx` — `AppState` + `INITIAL_STATE` extended with `selectedSynth`, `synthParams`, `synthRootNote`, `synthOctave`, `synthsSearch`. `useSuperSonic` wired; engine init deferred until first Synths tab visit. Tab-switch effect stops FX on leaving FX tab and calls `stopAll()` on leaving Synths tab. `filteredSynths` memo. `handleSynthClick` builds play params with current note/octave, calls `playNote()` async. Keyboard shortcuts (Space/arrows/C) extended for synths tab. `handleSearchChange`/`handleCopy` updated. BottomPanel hidden on both FX and Synths tabs.
- `src/index.css` — Added `.synths-tab`, `.synth-cell`, `.synths-banner` (loading/error variants), `.synths-banner-dot` (pulse animation), `.synth-spinner` (spin animation) styles.

**Build:** `yarn build` + `tsc --noEmit` pass with zero TypeScript errors.

---

## Task 09 — Tools Tab (BPM Calculator + Note Reference)

### Plan

- [x] 1. Update `src/types.ts` — add `'tools'` to `ActiveTab`
- [x] 2. Update `src/components/Topbar.tsx` — add Tools tab after Synths; hide search input on Tools tab (pass `hideSearch` prop)
- [x] 3. Create `src/components/ToolsTab.tsx` — self-contained tab with:
  - Sub-tab pill switcher: `BPM Calculator | Note Reference` (state lives inside this component)
  - **BPM Calculator section:**
    - Mode toggle pill: `BPM → Sleep` (default) / `Sleep → Duration`
    - Mode A inputs: BPM number input + Duration pill buttons (1/16, 1/8, 1/4, 1/3, 1/2, 2/3, 3/4, 1, 2, 3, 4) + custom numeric input
    - Mode A outputs: sleep value (large), duration in seconds, code snippet, copy button
    - Mode B inputs: BPM + Sleep value number input
    - Mode B outputs: seconds, nearest rhythmic value label, code snippet, copy button
    - Reference table at the bottom: all durations × current BPM, updates live
  - **Note Reference section:**
    - Search bar (note name, MIDI number, or frequency)
    - Octave selector pills (0–8)
    - Note table (MIDI 0–127): Note | Alias | MIDI | Frequency | Code | Copy
    - Default view: octave 4 (MIDI 48–71)
    - Note names generated programmatically to match Sonic Pi naming exactly
- [x] 4. Update `src/App.tsx` — add `'tools'` to conditional rendering; hide BottomPanel on tools tab; extend `handleSearchChange` (no-op for tools); extend `handleTabChange` (no stop needed — no audio)
- [x] 5. Add Tools tab CSS to `src/index.css`
- [x] 6. Verify build passes with no TypeScript errors (`yarn build`)

### Review

**Files created/modified:**

- `src/types.ts` — `ActiveTab` now includes `'tools'`.
- `src/components/Topbar.tsx` — Tools tab button added after Synths. Added optional `hideSearch` prop; when true the search input is not rendered (Tools tab has its own search in Note Reference).
- `src/components/ToolsTab.tsx` — New self-contained component (no props from App). All state is local. Three internal components:
  - `ToolsTab` — manages `subTab` (bpm|notes) and shared `bpm` state; renders sub-tab pill bar.
  - `BpmCalculator` — owns mode, selected duration, custom beats, and sleep-input state. Mode A computes `sleep = (beats × 60) / BPM` and the seconds equivalent; Mode B inverts it and finds the nearest rhythmic value by minimum absolute beat-distance. Reference table iterates all 11 rhythmic values and updates live. Both modes produce a copyable code snippet.
  - `NoteReference` — builds `ALL_NOTES` (MIDI 0–127) once at module load. Octave pills filter to 12 rows; search filters by name, alias, MIDI number, or frequency string. Clicking a row highlights it and shows a bottom info bar. Each row has an independent copy button.
  - Note naming matches Sonic Pi exactly: sharps use `cs/ds/fs/gs/as`, flats are shown as aliases (`db/eb/gb/ab/bb`), MIDI 60 = `:c4`.
- `src/App.tsx` — Added `isToolsTab` flag; `<ToolsTab />` added to the render chain; `BottomPanel` hidden on tools tab; `Topbar` receives `hideSearch={isToolsTab}`.
- `src/index.css` — ~220 lines of new Tools tab styles added before the mobile breakpoint block.

**Build:** `yarn build` passes with zero TypeScript errors.

---

## Task 10 — Synth + FX Combined Tab

### Plan

- [x] 1. Create `src/data/synthFx.ts` — `SynthFxDefinition` type (importing `FxParam` from `fx.ts`); curated list of confirmed CDN synthdefs: reverb, gverb, echo, distortion, bitcrusher, lpf, hpf, rlpf, rhpf, wobble, flanger, pitch_shift, pan, tremolo, krush
- [x] 2. Update `src/hooks/useSuperSonic.ts` — add `playWithFx(synth, note, synthParams, fxChain)` to the hook return; loads all synthdefs concurrently, fires `/s_new` for synth then each FX in sequence; tracks all node IDs in a ref; `stopAll` handles cleanup via `/g_freeAll 0`
- [x] 3. Create `src/components/SynthFxTab.tsx` — self-contained tab receiving `engineState`, `playWithFx`, `stopAll` from App:
  - Left column: synth dropdown, note/octave pills (same as SynthsTab), synth param sliders (excl. `note`), amp slider, Play/Stop button
  - Right column: "Add FX" button (disabled at 3), FX cards (FX dropdown + mix slider + per-FX param sliders + remove button), empty placeholder when chain is empty
  - Bottom panel: live nested code snippet + copy button
  - FX chain state: `Array<{ id: number; fxKey: string; mix: number; params: Record<string, number> }>` (max 3)
  - Code snippet: outermost FX first, innermost FX wraps synth; only non-default params shown
- [x] 4. Update `src/types.ts` — add `'synth-fx'` to `ActiveTab`
- [x] 5. Update `src/components/Topbar.tsx` — add `Synth+FX` tab after Synths (before Tools); tab order: Samples | Chords | Scales | FX | Synths | Synth+FX | Tools
- [x] 6. Update `src/App.tsx` — expose `playWithFx` from `useSuperSonic`; add `isSynthFxTab` flag; stop all on leaving tab; pass engine props to `SynthFxTab`; hide `BottomPanel` and search on synth-fx tab; extend `handleSearchChange`
- [x] 7. Add Synth+FX CSS to `src/index.css`
- [x] 8. Verify build passes (`yarn build`)

### Review

**Files created/modified:**

- `src/data/synthFx.ts` — `SynthFxDefinition` type (reuses `FxParam` from `fx.ts`). 15 curated FX all confirmed against CDN index: reverb, gverb, echo, distortion, bitcrusher, krush, lpf, hpf, rlpf, wobble, flanger, pitch_shift, tremolo, pan, ring_mod.
- `src/hooks/useSuperSonic.ts` — Added `FxChainEntry` type export and `playWithFx` method. Stops previous nodes via `/g_freeAll 0` before playing. Loads all required synthdefs in parallel via `Promise.all`. Fires synth with `/s_new` addToHead (action 0), then waits 50ms so scsynth registers the synth output before FX nodes start, then fires each FX node with `/s_new` addToTail (action 1) so they execute after the synth in server order.
- `src/components/SynthFxTab.tsx` — Self-contained two-column tab. Left: synth dropdown, note/octave pills, per-synth param sliders, Play/Stop. Right: "Add FX" button (disabled at 3), FX cards each with dropdown/mix/params/remove. Bottom: live `with_fx` snippet + copy. Snippet nests FX outermost-first; only non-default params shown. Engine status banner reuses existing `.synths-banner` CSS.
- `src/types.ts` — `ActiveTab` now includes `'synth-fx'`.
- `src/components/Topbar.tsx` — Synth+FX tab button added between Synths and Tools.
- `src/App.tsx` — Destructures `playWithFx` from `useSuperSonic`; `isSynthFxTab` flag; tab-switch stops all nodes when leaving either synths or synth-fx tab to the other; engine lazily inits on first visit to either tab; `SynthFxTab` wired into render; BottomPanel and search bar hidden on synth-fx tab.
- `src/index.css` — ~230 lines of Synth+FX tab styles.

**Build:** `yarn build` passes with zero TypeScript errors.

**Key constraints:**
- SuperSonic shared singleton — engine already initialised by Synths tab, or lazily init on first Synth+FX visit (same logic as Synths tab)
- Bus routing: sequential `/s_new` approximation (FX nodes fire after synth into global output bus) — acknowledged limitation for a preview tool
- No `any` types
- All other tabs unaffected

---

## Task 11 — Loop Sync (Tools Tab, Third Section)

### Plan

- [x] 1. Create `src/data/loopDurations.ts` — `LoopInfo` type + `LOOP_DURATIONS` record. Durations measured with `afinfo` from the actual FLAC files in `public/samples/`. Beats per loop estimated from duration and known BPM where possible. All 17 loops present: loop_3d_printer, loop_amen, loop_amen_full, loop_breakbeat, loop_compus, loop_drone_g_97, loop_electric, loop_garzul, loop_industrial, loop_mehackit1, loop_mehackit2, loop_mika, loop_perc1, loop_perc2, loop_safari, loop_tabla, loop_weirdo.
- [x] 2. Update `src/components/ToolsTab.tsx`
- [x] 3. Add Loop Sync CSS to `src/index.css`
- [x] 4. Verify build passes (`yarn build`)

### Review

**Files created/modified:**

- `src/data/loopDurations.ts` — `LoopInfo` type (`name`, `duration`, `beats`) + `LOOP_DURATIONS` record + `ALL_LOOPS` array. 17 entries, durations measured with `afinfo`. Beats estimated from known BPM or round-number matching. `originalBpm` not stored — computed live as `(beats × 60) / duration` so the UI beats override always takes effect.
- `src/components/ToolsTab.tsx` — Added `'loops'` to `ToolsSubTab`. Added `LoopSync` component: BPM input (40–300), beats-per-loop pill selector (2/4/8/16), loop table (Sample / Duration / Est. BPM / Rate / Sleep / Copy), selected-row detail panel with full `live_loop` snippet + copy, collapsible formula reference. All values recomputed live. Copy timer uses ref-based cleanup. Third pill "Loop Sync" added to sub-tab bar.
- `src/index.css` — Loop Sync table styles + formula toggle/body styles added.

**Build:** `yarn build` passes with zero TypeScript errors.

**Key formulas (no `any`, all derived live):**
- `original_bpm = (beats * 60) / duration`
- `rate = target_bpm / original_bpm` (3 decimal places)
- `sleep_beats = beats` (always equal to the beat count — `sample_duration` handles timing in Sonic Pi)

**Actual measured durations (from `afinfo`):**
- loop_amen: 1.753s | loop_amen_full: 6.857s | loop_breakbeat: 1.905s
- loop_compus: 6.486s | loop_drone_g_97: 4.948s | loop_electric: 2.474s
- loop_garzul: 8.000s | loop_industrial: 0.884s | loop_mehackit1: 2.474s
- loop_mehackit2: 2.474s | loop_mika: 8.000s | loop_perc1: 2.474s
- loop_perc2: 2.474s | loop_safari: 8.005s | loop_tabla: 10.674s
- loop_weirdo: 4.948s | loop_3d_printer: 7.959s

---

## Task 12 — Fix Loop Durations Using Audio Metadata

### Plan

- [x] 1. Write `scripts/read-loop-metadata.mjs` — Node.js script to read FLAC metadata from all loop_ files in `public/samples/`
- [x] 2. Install `music-metadata` as dev dependency (check for existing equivalent first)
- [x] 3. Run the script and capture output
- [x] 4. Analyse results: determine `beats`, `originalBpm`, `isAmbient` for each loop
- [x] 5. Update `src/data/loopDurations.ts` — add `originalBpm` and `isAmbient` to `LoopInfo` type; update all 17 loop entries with correct values
- [x] 6. Update `src/components/ToolsTab.tsx`:
  - Remove global "Beats / loop" pill selector
  - Use per-loop `originalBpm` and `beats` (from data) for rate calculation
  - Add "Beats" column to loop table
  - Show `~` for ambient loops (Est. BPM, Rate, Sleep columns) with tooltip
  - For ambient loops: rate = 1, sleep = duration in beats at target BPM
- [x] 7. Verify build passes (`yarn build`)

### Review

**Files created/modified:**

- `scripts/read-loop-metadata.mjs` — Node script using `music-metadata` to read every `loop_*.flac` in `public/samples/` and print duration, BPM, and tags as JSON. No BPM metadata was embedded in any file.
- `src/data/loopDurations.ts` — `LoopInfo` type extended with `originalBpm: number` and `isAmbient: boolean`. All 17 loops updated: 4 ambient loops (drone_g_97, garzul, mika, safari) have `beats: 0 / originalBpm: 0 / isAmbient: true`; remaining 13 have per-loop beat counts (2–16) and calculated BPM values (60–140). `originalBpm` stored directly (not derived live) so the data is self-documenting and the UI is simpler.
- `src/components/ToolsTab.tsx` — Removed global "Beats / loop" pill selector and `BeatsOption` type. `calcRate` and `buildLoopSnippet` now take only `loop` and `targetBpm`; `originalBpm` read from `loop.originalBpm`. Loop table gains a "Beats" column. Ambient loops render `~` with a tooltip ("Ambient loop — no fixed tempo") in the Beats/Est. BPM/Rate/Sleep columns. Selected loop detail panel shows the ambient note instead of rate/beats. All references to the removed `beats` state cleaned up.

**Build:** `yarn build` passes with zero TypeScript errors.

**Key changes:**
- Rate = `targetBpm / loop.originalBpm` (per-loop, not derived from global override)
- Ambient loops: rate = 1, snippet omits the `rate:` param
- No `any` types
