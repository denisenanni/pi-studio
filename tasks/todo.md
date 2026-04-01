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

---

## Task 13 — Landing Page

### Plan

- [x] 1. Check if `react-router-dom` already installed; install if not (`yarn add react-router-dom`)
- [x] 2. Add GitHub Pages SPA redirect: create `public/404.html` and add redirect handler to `index.html`
- [x] 3. Wire React Router in `main.tsx` with two routes: `/` → `LandingPage`, `/browser` → existing `App`
- [x] 4. Create `src/components/LandingPage.tsx` with all 5 sections: Hero, What is Sonic Pi, Browser Features, Studio Teaser, Footer
- [x] 5. Add landing page CSS to `src/index.css`
- [x] 6. Update `index.html` title to `Pi Studio`
- [x] 7. Verify build passes (`yarn build`)

### Review

**Files created/modified:**

- `package.json` — `react-router-dom@7` added as dependency
- `public/404.html` — GitHub Pages SPA redirect: captures the requested path, stores it in `sessionStorage`, and redirects to the base URL
- `index.html` — title updated to `Pi Studio`; redirect handler reads `sessionStorage` and restores the path via `history.replaceState` before React mounts
- `src/main.tsx` — wrapped in `<BrowserRouter basename="/pi-studio">` with two routes: `/` → `LandingPage`, `/browser` → existing `App`. The existing `App` is untouched.
- `src/components/LandingPage.tsx` — new component with 5 sections: Hero (animated dot-grid, π logo, CTAs), What is Sonic Pi (muted blurb + link), Browser Features (2×2 card grid), Studio Teaser (coming-soon badge + email waitlist with confirm-only UI, no backend), Footer (credits + 3 external links). Email waitlist stores nothing — pure UI feedback.
- `src/index.css` — `overflow: hidden` moved from `body` to `.app` so the landing page can scroll freely; ~290 lines of landing page styles appended (hero, cards, studio teaser, footer, mobile breakpoints). CSS animation on hero background respects `prefers-reduced-motion`.

**Build:** `yarn build` passes with zero TypeScript errors.

---

## Task 14 — Studio: Scaffold & Layout

### Plan

- [x] 1. Create `src/studio/types.ts` — all TypeScript types (StudioLoop, StudioNote, StudioState, StudioSnapshot, LoopType)
- [x] 2. Create `src/studio/studio.css` — all Studio styles (separate from index.css)
- [x] 3. Create `src/studio/Transport.tsx` — transport bar (BPM inline edit, tap tempo, time signature, play/stop, bar counter, undo/redo, export button)
- [x] 4. Create `src/studio/WaveformStrip.tsx` — 52px strip with static flat-line canvas + collapse toggle
- [x] 5. Create `src/studio/LoopsPanel.tsx` — 3 placeholder loops, each with name, mute, type badge, 16-step grid, VU meter; drag handle + collapse
- [x] 6. Create `src/studio/DetailPanel.tsx` — header bar (dropdowns, scale lock), piano roll with note labels + placeholder notes + grid, velocity lane
- [x] 7. Create `src/studio/ParamsBar.tsx` — horizontal row of 6 static param sliders
- [x] 8. Create `src/studio/CodeOutput.tsx` — syntax-highlighted static Ruby, copy button, collapse toggle, drag handle
- [x] 9. Create `src/studio/StudioPage.tsx` — root layout, panel resize (drag handles), collapse state, localStorage persistence
- [x] 10. Add `/studio` route in `main.tsx`
- [x] 11. Verify build passes (`yarn build`)

### Review

**Files created:**

- `src/studio/types.ts` — `LoopType`, `StudioNote`, `StudioLoop`, `StudioState`, `StudioSnapshot`. `StudioSnapshot` is defined explicitly (not `Omit`) to keep the type self-documenting. No `any`.
- `src/studio/studio.css` — ~500 lines, fully isolated. Uses `:root` CSS custom properties from `index.css` (`--accent`, `--accent-bg`, `--accent-border`). Mobile breakpoint at 768px stacks panels vertically and hides drag handles.
- `src/studio/Transport.tsx` — BPM click-to-edit (inline `<input>`, blur/Enter commits, Escape cancels). Tap tempo: accumulates tap timestamps in a ref, computes average interval after 3+ taps, resets after 2s of inactivity. Time signature: two constrained number inputs. Play/Stop, bar counter, waveform toggle (shown when wave is collapsed), undo/redo with disabled state, export button (placeholder blob download).
- `src/studio/WaveformStrip.tsx` — `useEffect` draws a static flat line on a `<canvas id="waveform-canvas">` after mount. Collapse hides via CSS height transition.
- `src/studio/LoopsPanel.tsx` — 3 placeholder loops, each with name (double-click to rename inline), mute button, type badge, 16-step grid, 8-bar VU meter (static levels). Collapse button. Drag handle triggers `onResizeStart` in parent.
- `src/studio/DetailPanel.tsx` — Header: loop name, synth/fx/steps selects, scale-lock toggle (CSS pill switch), scale name select. Piano roll: rows for MIDI 48–84 (octaves 3–6), note labels column (C/F shown, others show semitone name), beat-marker columns every 4 steps. `NoteBlock` positions notes absolutely by MIDI row and step. `VelocityLane` renders note velocity bars. Scroll centered on C4 on mount via ref callback.
- `src/studio/ParamsBar.tsx` — 6 params with local `useState`. Spacer before REVERB MIX to visually separate FX from synth params.
- `src/studio/CodeOutput.tsx` — Line-by-line tokeniser (`tokeniseLine`) classifies keywords/symbols/numbers/plain text. Renders each token as a `<span>` with a `tok-*` class. Copy uses `navigator.clipboard`. Height and collapsed state controlled by parent.
- `src/studio/StudioPage.tsx` — Root layout. Drag resize: `mousedown` on handle attaches `mousemove`/`mouseup` to `window`, computes clamped delta, updates state. All 5 layout values persist to `localStorage`. Undo/redo: `pushUndo` helper snapshots current state before any mutation; stack capped at 50 entries. Export: stub blob download. All audio/code-gen wired as no-ops for this task.

**Modified:**
- `src/main.tsx` — `/studio` route added.

**Build:** `yarn build` passes with zero TypeScript errors. Browser at `/browser` completely unaffected.

---

## Task 15 — ParamsBar: Inline Numeric Input on Double-Click

### Plan

- [x] 1. Add `editingKey: string | null` and `editRaw: string` state to `ParamsBar`
- [x] 2. On double-click on `studio-param-value` span → set `editingKey` + `editRaw`
- [x] 3. Render `<input type="number">` with `autoFocus`, correct `min`/`max`/`step` when editing
- [x] 4. On `Enter` or `blur` → parse, clamp to `[min, max]`, commit, exit edit mode
- [x] 5. On `Escape` → cancel without changing value
- [x] 6. Style inline input to match display (no spin buttons, accent color, underline border)

### Review

**Files modified:**

- `src/studio/ParamsBar.tsx` — added `editingKey`/`editRaw` state and `inputRef`. `startEdit` sets editing state. `commitEdit` parses the raw string, clamps to `[param.min, param.max]` via `Math.min/max`, updates values, clears `editingKey`. Value span swaps for `<input type="number">` when `editingKey === param.key`; `autoFocus` handles focus automatically. `onKeyDown` handles Enter (commit) and Escape (cancel). `onBlur` commits (covers click-away). No `any`.
- `src/studio/studio.css` — `.studio-param-value-input` matches existing value style (11 px, accent colour, transparent background, no outline). Bottom border signals edit mode. Spin buttons hidden via `-webkit-appearance` and `-moz-appearance`.

**Build:** `yarn build` passes with zero TypeScript errors.

---

## Task 16 — Fix useAudioPlayer: Tone.js AudioContext Only on User Gesture

### Plan

- [x] 1. Guard `useEffect` Player creation behind `audioContextStartedRef` so no Tone node is created at mount
- [x] 2. Create Player lazily inside `play()` on cold start (first user interaction)
- [x] 3. Remove `toneStart()` from `onload` callback — context is already running from the triggering user gesture
- [x] 4. Add `getContext().state !== 'running'` check before every `toneStart()` call
- [x] 5. Add `toneStart()` + `audioContextStartedRef = true` to `playOnLoad` (called from click handler)
- [x] 6. Update `AudioPlayerControls` interface: `playOnLoad: () => Promise<void>`
- [x] 7. Verify LandingPage and StudioPage have no Tone.js imports (confirmed)

### Review

**File modified:** `src/hooks/useAudioPlayer.ts`

- `audioContextStartedRef` — new ref, starts `false`. Blocks `useEffect` from creating a `Player` (and therefore a Tone.js `AudioContext`) before any user interaction.
- `useEffect` — guarded by `audioContextStartedRef.current`. Handles preloading on subsequent sample changes after the first interaction. `onload` no longer calls `toneStart()`.
- `play()` — always calls `toneStart()` (guarded by `getContext().state` check). Sets `audioContextStartedRef.current = true`. On cold start creates the `Player` lazily; subsequent calls reuse the preloaded player from `useEffect`.
- `playOnLoad()` — now `async`, calls `toneStart()` and sets `audioContextStartedRef.current = true` inside the user gesture before the caller changes `selectedSample`.

**Verified clean:** `LandingPage.tsx` and `StudioPage.tsx` have no Tone.js imports. `main.tsx` lazy-loads both routes.

---

## Task 17 — Piano Roll Note Editing

### Plan

- [x] 1. **`types.ts`** — add `selectedNoteId: string | null` to `StudioSnapshot` and `StudioState`
- [x] 2. **`StudioPage.tsx`** — update `makeInitialState` + `snapshot()`; add note action handlers (`addNote`, `deleteNote`, `moveNote`, `resizeNote`, `setVelocity`, `selectNote`) with `pushUndo`; pass new props to `DetailPanel`
- [x] 3. **`DetailPanel.tsx`** — update props interface; wire click-to-select / right-click-to-delete on existing notes; click-to-add on empty grid cells; `tabIndex` + keyboard handler (Delete, Escape, Arrow keys)
- [x] 4. **`DetailPanel.tsx`** — move drag: `mousedown` on note body → `window` mousemove/mouseup; ghost preview via separate `dragPreview` state; commit on mouseup
- [x] 5. **`DetailPanel.tsx`** — resize drag: `mousedown` on right 6 px of note → window mousemove/mouseup; `ew-resize` cursor on hover; commit on mouseup
- [x] 6. **`DetailPanel.tsx`** — velocity lane drag: `mousedown` on bar → mousemove updates height in real time via DOM ref; commit on mouseup; clicking bar selects its note
- [x] 7. **Scale lock** — compute in-scale MIDI set from `src/data/scales.ts`; dim non-scale rows; block add/snap vertical drag to nearest in-scale note; `scaleRoot` prop added
- [x] 8. **Step grid sync** — `deriveActiveSteps` called in `handleAddNote`, `handleDeleteNote`, `handleMoveNote`
- [x] 9. **`studio.css`** — note block states (default, selected, dragging); resize handle; scale lock row dimming; velocity bar selected state
- [x] 10. **Build check** — `yarn build` passes, no TypeScript `any`, Browser unaffected

### Review

**`src/studio/types.ts`** — `selectedNoteId: string | null` added to `StudioState` only (not `StudioSnapshot`, so undo/redo does not restore selection).

**`src/studio/StudioPage.tsx`** — `deriveActiveSteps` helper; 6 note handlers all going through `pushUndo`; `handleSelectNote` does NOT push undo (selection is ephemeral). `activeSteps` re-derived from notes on every add/delete/move. 9 new props passed to `DetailPanel`.

**`src/studio/DetailPanel.tsx`** — Full rewrite:
- `handleGridMouseDown` — event-delegated on the grid container; ignores clicks on `.studio-note-block`; computes step + MIDI from pixel position; blocks non-scale rows when scale lock on; creates note via `crypto.randomUUID()`.
- `handleNoteMouseDown` — `stopPropagation`; right-6px → resize, otherwise → move; sets `dragRef` with captured start values; `onMove`/`onUp` registered on `window`; `cancelDragRef` allows Escape to abort mid-drag.
- `onMove` — recomputes preview from delta, snaps to scale if lock on; calls `setDragPreview` for re-render.
- `onUp` — final position computed from mouse at release (consistent with preview), calls `onMoveNote`/`onResizeNote`, clears drag state.
- `handleVelMouseDown` — live DOM height update via `velBarRefs` map during drag; commits `onSetVelocity` on mouseup; Escape restores original height.
- `handleKeyDown` — Delete/Backspace, Escape, Arrow keys; ArrowUp/Down snap to scale when lock on.
- `NoteBlock` — renders at `dragPreview` position when dragging; `.selected`/`.dragging` class; resize handle div with `ew-resize` cursor.
- `VelocityLane` — ref callback registers each bar in `velBarRefs`; `.selected` class on selected note's bar.

**`src/studio/studio.css`** — pointer-events re-enabled on note blocks; `.selected`, `.dragging` states; `.studio-note-block-resize-handle`; `.studio-roll-row.non-scale`; `.studio-vel-bar.selected`; `:focus` outline suppressed.

**Build:** `yarn build` passes with zero TypeScript errors.

---

## Task 18 — Live Code Generation

### Plan

- [x] 1. Create `src/studio/codeGen.ts` — pure function `generateCode(state: StudioSnapshot): string`
  - MIDI → Sonic Pi note name helper: `NOTE_NAMES = ['c','cs','d','ds','e','f','fs','g','gs','a','as','b']`, octave = `Math.floor(midi/12) - 1`
  - `use_bpm <bpm>` header
  - One `live_loop` block per non-muted loop
  - Synth loops: for each note sorted by step, emit `synth :<synth>, note: :<noteName><octave>` with amp/cutoff/attack/release params, then `sleep <stepDur>`
  - Sample loops: for each active step, emit `sample :<sample>` + `sleep <stepDur>`
  - FX wrapping: if `loop.fx !== 'none'`, wrap body in `with_fx :<fx> do ... end`
  - Step duration = `(beatsPerBar / steps) * bars` beats
  - If no non-muted loops, emit minimal placeholder
- [x] 2. Update `CodeOutput.tsx` — accept `code: string` prop; drop `PLACEHOLDER_CODE` constant; compute `tokenisedLines` from prop via `useMemo`; copy prop value in `handleCopy`
- [x] 3. Update `StudioPage.tsx` — `const code = useMemo(() => generateCode(state), [state])`; pass `code` to `<CodeOutput>`; `handleExport` uses `generateCode(state)` for the real code
- [x] 4. Build check — `yarn build`, no TypeScript errors, no `any`

### Review

**Files created/modified:**

- `src/studio/codeGen.ts` — new pure module. `midiToNoteName` converts MIDI numbers to Sonic Pi note symbols (e.g. `72` → `c5`). `stepDuration` computes beat length per step. `buildSynthBody` sorts notes by step, emits `synth` + gap sleeps; emits a full rest if no notes. `buildSampleBody` iterates every step, emits `sample` on active steps plus `sleep` for every step. `wrapWithFx` indents body lines inside `with_fx :fx do ... end`. `generateCode` filters to non-muted loops, assembles `use_bpm` header + one block per loop. No side effects, no React imports, no `any`.
- `src/studio/CodeOutput.tsx` — `PLACEHOLDER_CODE` and `TOKENISED_LINES` constants removed. `code: string` added to props. `tokenisedLines` computed with `useMemo([code])`. `handleCopy` copies `code` prop (deps updated to `[code]`).
- `src/studio/StudioPage.tsx` — `useMemo` import added. `generateCode` import added. `const code = useMemo(() => generateCode(state), [state])` in derived section. `code` passed to `<CodeOutput>`. `handleExport` now uses `generateCode(state)` instead of hardcoded placeholder.

**Build:** `yarn build` passes with zero TypeScript errors. No `any`.

**Security notes:** `generateCode` is a pure string builder. Loop names and synth/sample strings come from user-controlled state but are only ever rendered as text in the code panel or written to a `.rb` download file — never eval'd, injected into the DOM as HTML, or sent to a server. No sensitive data is exposed.

---

## Task 19 — Audio Playback Engine

### Plan

- [x] 1. **`src/studio/types.ts`** — add `StudioParams` type (`cutoff`, `res`, `attack`, `release`, `amp`, `reverb_mix`); add `params: StudioParams` to `StudioState` only (not `StudioSnapshot` — no undo)
- [x] 2. **`src/studio/ParamsBar.tsx`** — convert to controlled: accept `params: StudioParams` + `onParamChange: (key: keyof StudioParams, value: number) => void` props; remove internal state
- [x] 3. **`src/hooks/useSuperSonic.ts`** — export `initSuperSonic()`, `getSonicInstance()`, `ensureSynthDef(name)`, `getNextNodeId()` from module-level singletons so `usePlayback` can call SuperSonic without going through React state
- [x] 4. **`src/hooks/useFxPlayer.ts`** — export `buildEffect(fxKey, params, mix)` so `usePlayback` can create Tone.js FX nodes for sample loops
- [x] 5. **`src/studio/usePlayback.ts`** — create hook: Tone.Transport timing; stateRef for always-current state; SuperSonic synths; Tone.Player cache for samples; FX routing via buildEffect; Tone.Analyser for waveform; stop/cleanup
- [x] 6. **`src/studio/WaveformStrip.tsx`** — accept `analyser: Tone.Analyser | null` prop; rAF loop draws live waveform; falls back to flat line when null
- [x] 7. **`src/studio/LoopsPanel.tsx`** — accept `currentStep` + `isPlaying` props; `.playing` class on current step cell
- [x] 8. **`src/studio/DetailPanel.tsx`** — accept `currentStep` + `isPlaying` props; `.studio-roll-playhead` div positioned at `(currentStep % steps / steps) * gridWidth`
- [x] 9. **`src/studio/StudioPage.tsx`** — lift `params` into `StudioState`; `handleParamChange`; wire `usePlayback`; pass `currentStep`/`isPlaying`/`analyser` down
- [x] 10. **`src/studio/studio.css`** — `.studio-step.playing` white highlight; `.studio-roll-playhead` absolute vertical line
- [x] 11. **Build check** — `yarn build` passes, no TypeScript errors, no `any`

### Review

**`src/studio/types.ts`** — `StudioParams` type added; `params: StudioParams` in `StudioState` only (not snapshotted, no undo).

**`src/studio/ParamsBar.tsx`** — now controlled; `params` prop drives all display values and slider positions; internal `values` state removed; `editingKey`/`editRaw` for inline editing retained.

**`src/hooks/useSuperSonic.ts`** — four new exports: `initSuperSonic` (triggers CDN load + init without React state), `getSonicInstance` (returns singleton), `ensureSynthDef` (loads a synthdef once), `getNextNodeId` (re-exports existing counter).

**`src/hooks/useFxPlayer.ts`** — `buildEffect` changed from `function` to `export function`.

**`src/studio/usePlayback.ts`** (new) — `Tone.Transport.scheduleRepeat` fires on every step. `stateRef` always holds current state so the callback reads live values. Synth loops: `ensureSynthDef` pre-loaded before `Transport.start()`; each note fires `/s_new` with note/amp/cutoff/attack/release. Sample loops: `Tone.Player` cached per loopId (rebuilt when `loop.fx` changes); `player.start(time)` for sample-accurate triggering. FX: `buildEffect` node per loop, wired between Player and Destination. `Tone.Analyser` connected to `Tone.Destination` as a parallel tap. BPM sync via `useEffect([bpm, isPlaying])`. Full cleanup on `stop()` and unmount.

**`src/studio/WaveformStrip.tsx`** — when `analyser` is non-null and strip is visible, a `requestAnimationFrame` loop draws the waveform in green (`#00ff41`) using `analyser.getValue()`. Loop cancelled when `analyser` becomes null or component unmounts.

**`src/studio/LoopsPanel.tsx`** — step cell gets `.playing` class when `isPlaying && (currentStep % loop.steps) === stepIndex`.

**`src/studio/DetailPanel.tsx`** — `.studio-roll-playhead` div rendered when `isPlaying`; `left` = `(currentStep % steps / steps) * gridWidth` pixels.

**`src/studio/StudioPage.tsx`** — `DEFAULT_PARAMS` constant; `params` in `makeInitialState`; `handleParamChange` updates `state.params`; old `handlePlay`/`handleStop` setState removed; `usePlayback(state)` provides `play`, `stop`, `isPlaying` (`pbPlaying`), `currentStep` (`pbStep`), `analyser`.

**`src/studio/studio.css`** — `.studio-step.playing` + `.studio-step.active.playing` white highlight; `.studio-roll-playhead` absolute 2px white line, pointer-events none, z-index 10.

**Build:** `yarn build` passes with zero TypeScript errors. No `any`.

---

## Task 20 — Per-Note Params & Params Bar Fix

### Plan

- [x] 1. **`types.ts`** — add `params: Record<string, number>` to `StudioNote`
- [x] 2. **`StudioPage.tsx`** — update `PLACEHOLDER_NOTE` factory to include `params: {}`; add `handleSetNoteParam` and `handleSetLoopParam` handlers; refactor `handleParamChange` into per-note/per-loop dispatch; pass new props to `ParamsBar` (effective params, mode, onParamReset, synth)
- [x] 3. **`ParamsBar.tsx`** — make fully controlled (no local state for slider values); accept new props (`params`, `defaults`, `mode: 'note' | 'loop'`, `onParamChange`, `onParamReset`, `synth`); show mode label; double-click resets to loop default; hide `res` unless synth is in resonant synth list
- [x] 4. **`codeGen.ts`** — add `getEffectiveParam(note, loop, key)` helper; update `buildSynthBody` to use per-note effective params
- [x] 5. **`usePlayback.ts`** — update synth scheduling to use per-note effective params
- [x] 6. **`DetailPanel.tsx`** — show dot indicator on note blocks with non-empty `params`
- [x] 7. **`studio.css`** — style mode label and dot indicator
- [x] 8. **Build check** — `yarn build` passes, no TypeScript errors, no `any`

### Review

**`src/studio/types.ts`** — `params: Record<string, number>` added to `StudioNote`. Empty object (`{}`) means "inherit everything from loop".

**`src/studio/StudioPage.tsx`** — `PLACEHOLDER_NOTE` now includes `params: {}`. `handleParamChange` replaced by three handlers: `handleSetNoteParam` (updates one note's params), `handleSetLoopParam` (updates loop-level defaults), `handleResetNoteParam` (removes a key from the selected note's params, reverting to loop default). Derived section computes `loopParams` (PARAM_DEFAULTS merged with loop overrides) and `paramsBarParams` (loopParams merged with selected note overrides if a note is selected). `paramsBarMode` switches between `'note'` and `'loop'` based on selection.

**`src/studio/ParamsBar.tsx`** — Fully controlled: no internal state for slider values. New props: `params`, `defaults`, `mode`, `synth`, `onParamChange`, `onParamReset`. Mode label (`NOTE PARAMS` in green / `LOOP DEFAULTS` in grey) rendered at left. `res` slider hidden unless `synth` is in `RES_SYNTHS` set. Double-click in note mode calls `onParamReset` (removes override); in loop mode opens inline edit. Overridden params get `.studio-param--overridden` class (label slightly greener to indicate a note-level value).

**`src/studio/codeGen.ts`** — `getEffectiveParam(note, loop, key)` resolves note.params[key] ?? loop.params[key] ?? PARAM_DEFAULTS[key]. `buildSynthBody` now uses effective params per-note for amp, cutoff, attack. Release still uses note duration by default; if `note.params['release']` is explicitly set, that value is used instead.

**`src/studio/usePlayback.ts`** — Synth scheduling now reads `note.params['amp'] ?? loop.params['amp'] ?? default` for each note, ensuring per-note overrides are heard during playback.

**`src/studio/DetailPanel.tsx`** — New notes created with `params: {}`. `NoteBlock` renders a `.studio-note-param-dot` span when `Object.keys(note.params).length > 0`.

**`src/studio/studio.css`** — `.studio-params-mode-label` (8px, letter-spaced, color set inline from props). `.studio-param--overridden .studio-param-label` (slightly green tint). `.studio-note-param-dot` (4px white circle, top-right corner of note block).

**Build:** `yarn build` passes with zero TypeScript errors. No `any`.

---

## Task 21 — Undo/Redo Keyboard Shortcuts + Export Flash

### Plan

- [x] 1. **`StudioPage.tsx`** — add `useEffect` global `keydown` listener: `Cmd/Ctrl+Z` → `handleUndo`, `Cmd/Ctrl+Shift+Z` or `Ctrl+Y` → `handleRedo`; skip when `e.target` is `INPUT` or `TEXTAREA`
- [x] 2. **`Transport.tsx`** — add local `exported: boolean` state; after calling `onExport`, set `exported = true`, reset after 1.5 s; render `✓ Exported` / `EXPORT .rb` accordingly
- [x] 3. **Build check** — `yarn build` passes, no TypeScript errors, no `any`

### Review

**`src/studio/StudioPage.tsx`** — `useEffect` registers a `keydown` listener on `window`. Guards: skips if `e.target` is `INPUT` or `TEXTAREA`; requires `metaKey || ctrlKey`. `Ctrl/Cmd+Z` (no shift) → `handleUndo`. `Ctrl/Cmd+Shift+Z` or `Ctrl+Y` → `handleRedo`. Listener cleaned up on unmount. Dependencies: `[handleUndo, handleRedo]` — both are stable `useCallback`s.

**`src/studio/Transport.tsx`** — `exported` boolean state + `exportTimerRef` for cleanup. `handleExportClick` calls `onExport()`, sets `exported = true`, schedules reset after 1500 ms (clears any pending timer first). `useEffect` clears the timer on unmount. Button label renders `✓ Exported` when `exported` is true, `EXPORT .rb` otherwise.

**Build:** `yarn build` passes with zero TypeScript errors. No `any`.

---

## Task 22 — Loop Management

### Plan

- [x] 1. **`types.ts`** — add `soloLoopId: string | null` to `StudioState` (not snapshot — solo is ephemeral/performance, not undoable)
- [x] 2. **`StudioPage.tsx`** — add `handleAddLoop` (max 8, auto-select), `handleDeleteLoop` (select adjacent, min 1), `handleSetLoopType` (clear notes when → sample), `handleSetLoopSample`, `handleToggleStep`, `handleReorderLoops`, `handleToggleSolo`; update `handleRenameLoop` with sanitisation (lowercase, spaces→`_`, strip special chars, max 20, dedup suffix, no empty); add `soloLoopId: null` to `makeInitialState`; pass all new props to `LoopsPanel` and `DetailPanel`
- [x] 3. **`LoopsPanel.tsx`** — wire `+` button with `onAddLoop` (disabled at 8); add `S` solo button per strip; add `×` delete button (hover-reveal, 2-click confirm within 2 s, disabled at 1 loop); drag reorder via `≡` handle (mousedown → mousemove placeholder → mouseup dispatch)
- [x] 4. **`DetailPanel.tsx`** — when `loop.type === 'sample'`: render step grid (N square buttons, toggle via `onToggleStep`, playhead highlight) + sample selector dropdown (`SAMPLE_GROUPS`) + preview button (Tone.Player); populate SYNTH dropdown from `SYNTHS` in synths.ts; populate FX dropdown from `SYNTH_FX_LIST` in synthFx.ts (hide both for sample loops); show sample controls instead of piano roll for sample loops
- [x] 5. **`codeGen.ts`** — fix `buildSampleBody`: collapse consecutive inactive steps into a single `sleep` rather than one per step; only emit `sample :xxx` on active steps
- [x] 6. **`usePlayback.ts`** — respect `soloLoopId`: when set, only play that loop (treat all others as muted for playback purposes, but don't alter `loop.muted`)
- [x] 7. **`studio.css`** — styles for solo button, delete button (hover reveal + confirm-red state), drag placeholder, sample step grid, sample selector
- [x] 8. **Build check** — `yarn build` passes, no TypeScript errors, no `any`

### Review

**`src/studio/types.ts`** — `soloLoopId: string | null` in `StudioState` only (not snapshotted).

**`src/studio/StudioPage.tsx`** — `sanitizeLoopName` helper. `handleRenameLoop` sanitises + deduplicates. New handlers: `handleAddLoop` (max 8, pushUndo), `handleDeleteLoop` (min 1, selects adjacent, pushUndo), `handleSetLoopType` (clears notes + activeSteps on switch, pushUndo), `handleSetLoopSample`, `handleToggleStep`, `handleReorderLoops` (splice/insert, pushUndo), `handleToggleSolo` (toggles soloLoopId, no undo). `handleToggleMute` no longer pushes undo (performance control).

**`src/studio/LoopsPanel.tsx`** — Full rewrite. `+` greys out at 8 loops. `≡` drag handle: binds window mousemove/mouseup; queries `.studio-loop-strip` children for drop position; renders `.studio-loop-drop-indicator` line at drop index. `S` solo button (green when active). `×` delete: hidden by default (opacity 0, hover reveals); first click arms a 2 s confirm timer; second click dispatches delete; invisible when only 1 loop. Type badge is a `<button>` toggling synth↔sample. Muted strip dims via `.muted` class (opacity 0.5).

**`src/studio/DetailPanel.tsx`** — SYNTH/FX dropdowns from real data (`SYNTHS`, `SYNTH_FX_LIST`), hidden for sample loops. Sample loops render `SampleLoopView`: 32 px step buttons (active=green, playing=white), `SAMPLE_GROUPS` optgroup selector, preview button (Tone.Player created on demand, disposed on stop/unmount/sample change).

**`src/studio/codeGen.ts`** — `buildSampleBody` accumulates `pendingSleep`, emits one collapsed `sleep` before each active step and one after; no active steps → single rest for full loop.

**`src/studio/usePlayback.ts`** — `effectivelyMuted = loop.muted || (soloLoopId !== null && soloLoopId !== loop.id)`.

**`src/studio/studio.css`** — drag handle, drop indicator, dragging/muted strip states, solo/delete button styles, sample step grid + preview button.

**Build:** `yarn build` passes with zero TypeScript errors. No `any`.

---

## Task 23 — Tooltip Component for Loop Buttons

### Plan

- [x] 1. **`src/studio/Tooltip.tsx`** — reusable `<Tooltip text children>` component: `position: relative` wrapper span, absolutely-positioned `tooltip-content` span above center; CSS opacity transition with 300 ms delay
- [x] 2. **`studio.css`** — `.tooltip-wrapper` / `.tooltip-content` styles: `#1a1a1a` bg, `1px solid #2a2a2a` border, `#888888` 10 px monospace text, `3px 8px` padding, square corners, fade-in with 300 ms delay
- [x] 3. **`LoopsPanel.tsx`** — wrap `S`, `M`, `×` buttons in `<Tooltip>` with correct dynamic text
- [x] 4. **Build check**

### Review

**`src/studio/Tooltip.tsx`** (new) — `<span className="tooltip-wrapper">` wraps children + a `<span className="tooltip-content">` with the text. Pure CSS approach: no JS, no refs, no state.

**`src/studio/studio.css`** — `.tooltip-wrapper` is `display: inline-block; position: relative`. `.tooltip-content` is `position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%)` — always centered above the trigger. `opacity: 0` by default; `transition: opacity 0.1s 0.3s` (instant fade-in after 300 ms delay, instant fade-out). `z-index: 100` so it layers over adjacent strips.

**`src/studio/LoopsPanel.tsx`** — `title` attrs removed from S/M/× (replaced by Tooltip). Dynamic text: S → `'Solo'`/`'Unsolo'`; M → `'Mute'`/`'Unmute'`; × → `'Delete loop'`/`'Confirm delete'`.

**Build:** `yarn build` passes with zero TypeScript errors. No `any`.

---

## Task 24 — Fix AudioContext Autoplay Warning

### Plan

- [x] 1. **Root-cause analysis** — Tone.js v15 `index.js` has module-level constants (`Transport`, `Destination`, `Listener`, `Draw`) that call `getContext()` immediately on `import * as Tone from 'tone'`, creating an `AudioContext` before any user gesture → browser "AudioContext was not allowed to start" warning.
- [x] 2. **`usePlayback.ts`** — replace static `import * as Tone` with `import type * as ToneNS`; add module-level `let _tone` / `let _buildEffect` cache; lazy-load both inside `play()` via `await import('tone')` and `await import('../hooks/useFxPlayer')` (first call only); update all Tone references to use `_tone!` / local `Tone = _tone` aliases; remove static `import { buildEffect }`.
- [x] 3. **`WaveformStrip.tsx`** — change to `import type * as Tone from 'tone'`; only used as a type annotation for the `analyser` prop, never at runtime.
- [x] 4. **`DetailPanel.tsx`** — remove `import * as Tone from 'tone'`; in `SampleLoopView.handlePreview` add `const Tone = await import('tone')` at start; change `playerRef` type to `{ dispose: () => void } | null`.
- [x] 5. **Build check** — `yarn tsc --noEmit` and `yarn build` pass, zero errors.

### Review

**Root cause:** Tone.js v15's `index.js` runs `export const Transport = getContext().transport` (and Destination, Listener, Draw) at module evaluation time. `getContext()` creates a real `AudioContext` (replacing the internal `DummyContext`) on first call — so any `import * as Tone` evaluates these exports and creates an AudioContext immediately, outside a user gesture.

**`src/studio/usePlayback.ts`** — Module-level `let _tone: typeof ToneNS | null = null` and `let _buildEffect`. In `play()`: `if (!_tone) { _tone = await import('tone'); _buildEffect = ... }`. All sync functions (`stop()`, BPM effect, cleanup, helpers) access `_tone!` (safe: guarded by `audioContextStartedRef.current` which is only set after `play()` loads and starts Tone). `import type * as ToneNS from 'tone'` provides compile-time types without runtime module evaluation.

**`src/studio/WaveformStrip.tsx`** — `import type` — TypeScript erases this at compile time; Tone.js runtime module never loaded by this file.

**`src/studio/DetailPanel.tsx`** — `await import('tone')` inside `handlePreview` (a click handler = user gesture). Dynamic import resolves from cache if `usePlayback.play()` already ran; the AudioContext creation from Tone's module-level code happens within the user gesture activation window. `playerRef` typed as `{ dispose: () => void } | null` — only needs `dispose()` at cleanup sites.

**Build:** `yarn build` passes. Zero TypeScript errors. No `any`.

---

## Task 25 — Loop Sync Modes

### Plan

- [ ] 1. **`types.ts`** — add `export type SyncMode = 'auto' | 'sync_to' | 'free'`; add `syncMode: SyncMode` and `syncTarget: string | null` to `StudioLoop`; `StudioSnapshot` includes `StudioLoop[]` so these fields are automatically snapshotted (part of undo history)
- [ ] 2. **`StudioPage.tsx`** — add `syncMode: 'auto', syncTarget: null` to every place a loop is created (`PLACEHOLDER_LOOPS`, `handleAddLoop`, `handleSetLoopType` no-op since fields are preserved); add `handleSetSyncMode(loopId, syncMode, syncTarget)` with `pushUndo`; update `handleDeleteLoop` to revert any loop that `syncTarget === deleted loop's name` back to `{ syncMode: 'auto', syncTarget: null }`; pass `onSetSyncMode` and `loops` to `DetailPanel`
- [ ] 3. **`DetailPanel.tsx`** — add `loops: StudioLoop[]`, `onSetSyncMode` props; add sync control in the detail header after SCALE LOCK: label `SYNC`, `<select>` with options auto/sync_to/free; when `sync_to` show second `<select>` listing all other loop names (exclude self); pass `loop.syncMode` and `loop.syncTarget` as controlled values
- [ ] 4. **`LoopsPanel.tsx`** — add sync indicator below the type badge in each strip: nothing for `auto`, `→ :name` for `sync_to`, `free` for `free`; style inline with `#555` color, `10px` font
- [ ] 5. **`codeGen.ts`** — replace hardcoded `live_loop :${loop.name} do` with `buildLoopHeader(loop, allLoopNames)`; header returns `live_loop :${loop.name} do` (auto), `live_loop :${loop.name}, sync: :${loop.syncTarget} do` (sync_to, with fallback to auto if target missing), `live_loop :${loop.name}, delay: 0 do` (free); pass `allLoopNames: Set<string>` for target validation
- [ ] 6. **`studio.css`** — `.studio-sync-indicator`: 10px monospace, `#555`, no margin-top needed (row 2 already has the type badge); `.studio-sync-control`: flex row, gap, align-items center
- [ ] 7. **Build check** — `yarn build` passes, no TypeScript errors, no `any`


---

## Task 26 — ADSR Envelope Box in ParamsBar

### Plan

- [x] 1. **`types.ts`** — add `decay: number` and `sustain: number` to `StudioParams`
- [x] 2. **`StudioPage.tsx`** — add `decay: 0` and `sustain: 1` to `PARAM_DEFAULTS`
- [x] 3. **`codeGen.ts`** — add `decay: 0` and `sustain: 1` to `PARAM_DEFAULTS`
- [x] 4. **`ParamsBar.tsx`** — split PARAMS into `ADSR_PARAMS` (attack, decay, sustain, release) and `OTHER_PARAMS` (cutoff, res, amp, reverb_mix); render ADSR group as a bordered box with title overlapping border; render remaining params to the right as before
- [x] 5. **`studio.css`** — add `.studio-adsr-box`, `.studio-adsr-title`, `.studio-adsr-grid` styles; increase `.studio-params-bar` height to accommodate the taller ADSR box

---

## Task 27 — Synth-Aware Params Bar

### Plan

- [ ] 1. **`ParamsBar.tsx`** — import `SYNTHS`; compute `supportedKeys` from `synth` prop; define `ALWAYS_ENABLED`; wrap disabled params in `<Tooltip>`; remove old `RES_SYNTHS`
- [ ] 2. **`studio.css`** — add `.studio-param--disabled` rule (`opacity: 0.3`, `pointer-events: none`, label/value `color: #333`)
- [ ] 3. **`codeGen.ts`** — emit `decay` when `!= 0` and `sustain` when `!= 1` in synth line
- [ ] 4. **`usePlayback.ts`** — add `decay` and `sustain` to `sonic.send` call

---

## Task 28 — Params Bar Grouped Sections

### Plan

- [ ] 1. **`StudioPage.tsx`** — change `PARAM_DEFAULTS` to `Record<string, number>`; add mod + FX param defaults; pass `fx` prop to `<ParamsBar>`
- [ ] 2. **`ParamsBar.tsx`** — add `fx` prop; import `SYNTH_FX_LIST`; compute filter/mod/fx param lists dynamically; replace flat OTHER_PARAMS with FILTER, MODULATION, FX PARAMS, MIXER boxes via `renderBox` helper
- [ ] 3. **`studio.css`** — add `.studio-param-grid` generic grid class

---

## Task 29 — Style BPM Input in Transport Bar

### Plan

- [ ] 1. **`studio.css`** — replace `.studio-transport-bpm-input` with spinner-free style matching time signature inputs; add focus and spin-button rules

---

## Task 30 — Multiple FX Chain Per Loop

### Plan

- [ ] 1. **`types.ts`** — add `FxChainEntry` type (`id`, `fxKey`, `params`); replace `fx: string` with `fxChain: FxChainEntry[]` on `StudioLoop`
- [ ] 2. **`StudioPage.tsx`** — update `PLACEHOLDER_LOOPS` and `handleAddLoop` to use `fxChain`; add `selectedFxId: string | null` useState; replace `handleFxChange` with `handleAddFx`, `handleRemoveFx`, `handleSetFxKey`, `handleSetFxParam`; add `handleSelectFx`; reset `selectedFxId` when selected loop changes; remove `reverb_mix` from `PARAM_DEFAULTS` (mix now lives in `FxChainEntry.params`); update props to `DetailPanel` and `ParamsBar`
- [ ] 3. **`DetailPanel.tsx`** — replace `onFxChange` with `onAddFx`, `onRemoveFx`, `onSetFxKey`, `onSelectFx` + `fxChain`/`selectedFxId` props; replace FX `<select>` with pill list + `+` add button with dropdown; `×` removes entry; clicking pill calls `onSelectFx`
- [ ] 4. **`ParamsBar.tsx`** — replace `fx: string` with `fxChain`, `selectedFxId`, `onFxParamChange`, `onSelectFx` props; FX PARAMS reads from `selectedFxEntry.params`; MIXER mix reads from `selectedFxEntry.params.mix`; add `valueSource`/`onChange` overrides to `renderParam` so FX params route to `onFxParamChange`
- [ ] 5. **`codeGen.ts`** — replace single `wrapWithFx` call with loop over `fxChain` (index 0 = outermost); read mix from `fxEntry.params.mix`; remove `reverb_mix` from `PARAM_DEFAULTS`
- [ ] 6. **`usePlayback.ts`** — update sample player to use `loop.fxChain[0]` instead of `loop.fx`; adapt `getOrCreateSamplePlayer` signature
- [ ] 7. **`studio.css`** — add `.studio-fx-chain`, `.studio-fx-pill`, `.studio-fx-pill--active`, `.studio-fx-add-btn`, `.studio-fx-dropdown` styles
