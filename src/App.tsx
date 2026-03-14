import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { SAMPLE_GROUPS, ALL_SAMPLES } from './data/samples'
import type { SampleCategory, Sample } from './data/samples'
import { SCALES } from './data/scales'
import type { Scale } from './data/scales'
import type { ActiveTab } from './types'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useScalePlayer } from './hooks/useScalePlayer'
import { useChordPlayer } from './hooks/useChordPlayer'
import type { ChordMode } from './hooks/useChordPlayer'
import { useFxPlayer } from './hooks/useFxPlayer'
import { useSuperSonic } from './hooks/useSuperSonic'
import { CHORDS } from './data/chords'
import type { Chord } from './data/chords'
import { FX_LIST, FX_PREVIEW_SAMPLES } from './data/fx'
import type { FxDefinition } from './data/fx'
import { SYNTHS, noteToMidi } from './data/synths'
import type { SynthDefinition, NoteName } from './data/synths'
import { Topbar } from './components/Topbar'
import { Sidebar } from './components/Sidebar'
import { SampleGrid } from './components/SampleGrid'
import { ScalesTab } from './components/ScalesTab'
import { ChordsTab } from './components/ChordsTab'
import { FxTab } from './components/FxTab'
import { SynthsTab } from './components/SynthsTab'
import { ToolsTab } from './components/ToolsTab'
import { BottomPanel } from './components/BottomPanel'

interface AppState {
  activeTab: ActiveTab
  // Samples tab
  selectedCategory: SampleCategory
  selectedSample: string | null
  rate: number
  amp: number
  search: string
  // Chords tab
  selectedChord: string | null
  chordAmp: number
  chordRootNote: string
  chordOctave: number
  chordNumOctaves: number
  chordMode: ChordMode
  chordsSearch: string
  // Scales tab
  selectedScale: string | null
  scaleAmp: number
  scaleRootNote: string
  scaleOctave: number
  scalesSearch: string
  // FX tab
  selectedFx: string | null
  fxSample: string
  fxParams: Record<string, number>
  fxMix: number
  fxAmp: number
  fxSearch: string
  // Synths tab
  selectedSynth: string | null
  synthParams: Record<string, number>
  synthRootNote: string
  synthOctave: number
  synthsSearch: string
}

const INITIAL_STATE: AppState = {
  activeTab: 'samples',
  selectedCategory: 'bd',
  selectedSample: null,
  rate: 1.0,
  amp: 1.0,
  search: '',
  selectedChord: null,
  chordAmp: 1.0,
  chordRootNote: 'C',
  chordOctave: 4,
  chordNumOctaves: 1,
  chordMode: 'block',
  chordsSearch: '',
  selectedScale: null,
  scaleAmp: 1.0,
  scaleRootNote: 'C',
  scaleOctave: 4,
  scalesSearch: '',
  selectedFx: null,
  fxSample: FX_PREVIEW_SAMPLES[0]?.value ?? 'loop_amen',
  fxParams: {},
  fxMix: 1.0,
  fxAmp: 1.0,
  fxSearch: '',
  selectedSynth: null,
  synthParams: {},
  synthRootNote: 'C',
  synthOctave: 4,
  synthsSearch: '',
}

const GRID_COL_ESTIMATE = 6

// Build default params for a given FX definition
function defaultFxParams(fxDef: FxDefinition): Record<string, number> {
  const result: Record<string, number> = {}
  for (const p of fxDef.params) {
    result[p.key] = p.default
  }
  return result
}

// Build code snippet for the FX tab — only non-default params included
function buildFxSnippet(
  fxKey: string | null,
  sampleName: string,
  params: Record<string, number>,
): string {
  if (!fxKey) return 'no fx selected'
  const fxDef = FX_LIST.find((f) => f.key === fxKey)
  if (!fxDef) return 'no fx selected'

  const nonDefault = fxDef.params
    .filter((p) => {
      const val = params[p.key] ?? p.default
      return Math.abs(val - p.default) >= p.step
    })
    .map((p) => {
      const val = params[p.key] ?? p.default
      const formatted = p.step < 1 ? val.toFixed(2) : String(Math.round(val))
      return `${p.key}: ${formatted}`
    })

  const paramStr = nonDefault.length > 0 ? `, ${nonDefault.join(', ')}` : ''
  return `with_fx :${fxKey}${paramStr} do\n  sample :${sampleName}\nend`
}

function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)

  // ── Samples player ──────────────────────────────────────
  const { play: samplePlay, playOnLoad, stop: sampleStop, isPlaying: samplePlaying } =
    useAudioPlayer(state.selectedSample ?? '', state.rate, state.amp)

  // ── Scales player ───────────────────────────────────────
  const selectedScaleSteps = useMemo<number[]>(() => {
    return SCALES.find((s) => s.name === state.selectedScale)?.steps ?? []
  }, [state.selectedScale])

  const { play: scalePlay, playOnLoad: scalePlayOnLoad, stop: scaleStop, isPlaying: scalePlaying } =
    useScalePlayer(selectedScaleSteps, state.scaleRootNote, state.scaleOctave, state.scaleAmp)

  // ── Chords player ────────────────────────────────────────
  const { play: chordPlay, playOnLoad: chordPlayOnLoad, stop: chordStop, isPlaying: chordPlaying } =
    useChordPlayer(
      state.selectedChord ?? '',
      state.chordRootNote,
      state.chordOctave,
      state.chordNumOctaves,
      state.chordMode,
      state.chordAmp,
    )

  // ── FX player ────────────────────────────────────────────
  const fxPlayer = useFxPlayer(
    state.fxSample,
    state.selectedFx ?? 'reverb',
    state.fxParams,
    state.fxMix,
    state.fxAmp,
  )

  // ── Synths player ─────────────────────────────────────────
  const { state: synthEngineState, initEngine: initSynthEngine, playNote, stopAll } =
    useSuperSonic()

  const [loadingSynthdef, setLoadingSynthdef] = useState<string | null>(null)
  const [synthIsPlaying, setSynthIsPlaying] = useState(false)
  const synthPlayingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stop FX playback and synths when switching away from those tabs
  const prevTabRef = useRef(state.activeTab)
  useEffect(() => {
    const prev = prevTabRef.current
    const next = state.activeTab
    if (prev === 'fx' && next !== 'fx') {
      fxPlayer.stop()
    }
    if (prev === 'synths' && next !== 'synths') {
      stopAll()
      if (synthPlayingTimerRef.current !== null) {
        clearTimeout(synthPlayingTimerRef.current)
        synthPlayingTimerRef.current = null
      }
    }
    // Init engine lazily when entering Synths tab for the first time
    if (next === 'synths' && !synthEngineState.isReady && !synthEngineState.isLoading && !synthEngineState.error) {
      initSynthEngine()
    }
    prevTabRef.current = next
  }, [state.activeTab, fxPlayer, stopAll, initSynthEngine, synthEngineState])

  // ── Derived data ────────────────────────────────────────
  const filteredSamples = useMemo<Sample[]>(() => {
    const q = state.search.trim().toLowerCase()
    if (q) return ALL_SAMPLES.filter((s) => s.name.includes(q))
    return SAMPLE_GROUPS.find((g) => g.category === state.selectedCategory)?.samples ?? []
  }, [state.search, state.selectedCategory])

  const filteredScales = useMemo<Scale[]>(() => {
    const q = state.scalesSearch.trim().toLowerCase()
    if (q) return SCALES.filter((s) => s.name.includes(q))
    return SCALES
  }, [state.scalesSearch])

  const filteredChords = useMemo<Chord[]>(() => {
    const q = state.chordsSearch.trim().toLowerCase()
    if (q) return CHORDS.filter((c) => c.name.includes(q))
    return CHORDS
  }, [state.chordsSearch])

  const filteredFx = useMemo<FxDefinition[]>(() => {
    const q = state.fxSearch.trim().toLowerCase()
    if (q) return FX_LIST.filter((f) => f.name.toLowerCase().includes(q) || f.key.includes(q))
    return FX_LIST
  }, [state.fxSearch])

  const filteredSynths = useMemo<SynthDefinition[]>(() => {
    const q = state.synthsSearch.trim().toLowerCase()
    if (q) return SYNTHS.filter((s) => s.label.toLowerCase().includes(q) || s.name.includes(q))
    return SYNTHS
  }, [state.synthsSearch])

  // ── Snippets ────────────────────────────────────────────
  const samplesSnippet = state.selectedSample
    ? `sample :${state.selectedSample}, rate: ${state.rate.toFixed(2)}, amp: ${state.amp.toFixed(2)}`
    : 'no sample selected'

  const scalesSnippet = state.selectedScale
    ? `scale :${state.scaleRootNote}, :${state.selectedScale}`
    : 'no scale selected'

  const chordsSnippet = state.selectedChord
    ? `chord :${state.chordRootNote}, :${state.selectedChord}`
    : 'no chord selected'

  const fxSnippet = buildFxSnippet(state.selectedFx, state.fxSample, state.fxParams)

  const synthMidiNote = useMemo(
    () => noteToMidi(state.synthRootNote as NoteName, state.synthOctave),
    [state.synthRootNote, state.synthOctave],
  )

  const synthSnippet = useMemo(() => {
    const synth = SYNTHS.find((s) => s.name === state.selectedSynth)
    if (!synth) return 'no synth selected'
    const nonDefault = synth.params
      .filter((p) => {
        if (p.key === 'note' || p.key === 'amp') return false
        const val = state.synthParams[p.key] ?? p.default
        return Math.abs(val - p.default) >= p.step
      })
      .map((p) => {
        const val = state.synthParams[p.key] ?? p.default
        return `${p.key}: ${p.step < 1 ? val.toFixed(2) : String(Math.round(val))}`
      })
    const amp = state.synthParams['amp'] ?? 1
    const parts = [`note: ${synthMidiNote}`, `amp: ${amp.toFixed(2)}`, ...nonDefault]
    return `synth :${synth.name}, ${parts.join(', ')}`
  }, [state.selectedSynth, state.synthParams, synthMidiNote])

  // ── Handlers ────────────────────────────────────────────
  const handleSampleClick = useCallback(
    (name: string) => {
      if (name === state.selectedSample) {
        if (samplePlaying) sampleStop()
        else samplePlay()
      } else {
        playOnLoad()
        setState((s) => ({ ...s, selectedSample: name }))
      }
    },
    [state.selectedSample, samplePlaying, samplePlay, playOnLoad, sampleStop],
  )

  const handleScaleClick = useCallback(
    (name: string) => {
      if (name === state.selectedScale) {
        if (scalePlaying) scaleStop()
        else scalePlay()
      } else {
        scalePlayOnLoad()
        setState((s) => ({ ...s, selectedScale: name }))
      }
    },
    [state.selectedScale, scalePlaying, scalePlay, scalePlayOnLoad, scaleStop],
  )

  const handleCategoryChange = useCallback((category: SampleCategory) => {
    const first = SAMPLE_GROUPS.find((g) => g.category === category)?.samples[0]?.name ?? null
    setState((s) => ({ ...s, selectedCategory: category, selectedSample: first, search: '' }))
  }, [])

  const handleTabChange = useCallback((tab: ActiveTab) => {
    if (tab !== 'synths') {
      setSynthIsPlaying(false)
    }
    setState((s) => ({ ...s, activeTab: tab }))
  }, [])

  const handleSearchChange = useCallback((v: string) => {
    setState((s) => {
      if (s.activeTab === 'samples') return { ...s, search: v }
      if (s.activeTab === 'chords') return { ...s, chordsSearch: v }
      if (s.activeTab === 'fx') return { ...s, fxSearch: v }
      if (s.activeTab === 'synths') return { ...s, synthsSearch: v }
      return { ...s, scalesSearch: v }
    })
  }, [])

  const handleRootNoteChange = useCallback((note: string) => {
    setState((s) => ({ ...s, scaleRootNote: note }))
  }, [])

  const handleOctaveChange = useCallback((oct: number) => {
    setState((s) => ({ ...s, scaleOctave: oct }))
  }, [])

  const handleChordClick = useCallback(
    (name: string) => {
      if (name === state.selectedChord) {
        if (chordPlaying) chordStop()
        else void chordPlay()
      } else {
        chordPlayOnLoad()
        setState((s) => ({ ...s, selectedChord: name }))
      }
    },
    [state.selectedChord, chordPlaying, chordPlay, chordPlayOnLoad, chordStop],
  )

  const handleChordRootNoteChange = useCallback((note: string) => {
    setState((s) => ({ ...s, chordRootNote: note }))
  }, [])

  const handleChordOctaveChange = useCallback((oct: number) => {
    setState((s) => ({ ...s, chordOctave: oct }))
  }, [])

  const handleChordNumOctavesChange = useCallback((n: number) => {
    setState((s) => ({ ...s, chordNumOctaves: n }))
  }, [])

  const handleChordModeChange = useCallback((mode: ChordMode) => {
    setState((s) => ({ ...s, chordMode: mode }))
  }, [])

  const handleRateChange = useCallback((rate: number) => {
    setState((s) => ({ ...s, rate }))
  }, [])

  const handleAmpChange = useCallback((amp: number) => {
    setState((s) => {
      if (s.activeTab === 'samples') return { ...s, amp }
      if (s.activeTab === 'chords') return { ...s, chordAmp: amp }
      if (s.activeTab === 'fx') return { ...s, fxAmp: amp }
      return { ...s, scaleAmp: amp }
    })
  }, [])

  const handleCopy = useCallback(() => {
    const hasSelection =
      state.activeTab === 'samples'
        ? !!state.selectedSample
        : state.activeTab === 'chords'
          ? !!state.selectedChord
          : state.activeTab === 'fx'
            ? !!state.selectedFx
            : state.activeTab === 'synths'
              ? !!state.selectedSynth
              : !!state.selectedScale
    if (hasSelection) {
      const snippet =
        state.activeTab === 'samples'
          ? samplesSnippet
          : state.activeTab === 'chords'
            ? chordsSnippet
            : state.activeTab === 'fx'
              ? fxSnippet
              : state.activeTab === 'synths'
                ? synthSnippet
                : scalesSnippet
      void navigator.clipboard.writeText(snippet)
    }
  }, [state.activeTab, state.selectedSample, state.selectedChord, state.selectedScale, state.selectedFx, state.selectedSynth, samplesSnippet, chordsSnippet, scalesSnippet, fxSnippet, synthSnippet])

  // ── FX-specific handlers ─────────────────────────────────
  const handleFxClick = useCallback((key: string) => {
    setState((s) => {
      if (s.selectedFx === key) return s
      const fxDef = FX_LIST.find((f) => f.key === key)
      const newParams = fxDef ? defaultFxParams(fxDef) : {}
      return { ...s, selectedFx: key, fxParams: newParams }
    })
  }, [])

  const handleFxSampleChange = useCallback((value: string) => {
    setState((s) => ({ ...s, fxSample: value }))
  }, [])

  const handleFxParamChange = useCallback((key: string, value: number) => {
    setState((s) => ({ ...s, fxParams: { ...s.fxParams, [key]: value } }))
  }, [])

  const handleFxMixChange = useCallback((value: number) => {
    setState((s) => ({ ...s, fxMix: value }))
  }, [])

  const handleFxAmpChange = useCallback((value: number) => {
    setState((s) => ({ ...s, fxAmp: value }))
  }, [])

  // ── Synths handlers ──────────────────────────────────────
  const handleSynthClick = useCallback(
    (name: string) => {
      if (!synthEngineState.isReady) return
      const synth = SYNTHS.find((s) => s.name === name)
      if (!synth) return

      // Build play params from current state (state is in deps — always current)
      const midiNote = noteToMidi(state.synthRootNote as NoteName, state.synthOctave)
      const playParams: Record<string, number> = { note: midiNote }
      for (const p of synth.params) {
        if (p.key !== 'note') playParams[p.key] = state.synthParams[p.key] ?? p.default
      }

      // Update React state atomically
      setState((s) => {
        const note = noteToMidi(s.synthRootNote as NoteName, s.synthOctave)
        const newParams: Record<string, number> = {}
        for (const p of synth.params) {
          newParams[p.key] = s.synthParams[p.key] ?? p.default
        }
        newParams['note'] = note
        return { ...s, selectedSynth: name, synthParams: newParams }
      })

      setLoadingSynthdef(name)
      if (synthPlayingTimerRef.current !== null) {
        clearTimeout(synthPlayingTimerRef.current)
        synthPlayingTimerRef.current = null
      }

      void playNote(synth, playParams).then(() => {
        setLoadingSynthdef(null)
        setSynthIsPlaying(true)
        // Auto-reset playing indicator after attack + release duration
        const attack = playParams['attack'] ?? 0
        const release = playParams['release'] ?? 1
        synthPlayingTimerRef.current = setTimeout(
          () => setSynthIsPlaying(false),
          (attack + release) * 1000 + 200,
        )
      }).catch(() => {
        setLoadingSynthdef(null)
      })
    },
    [synthEngineState.isReady, playNote, state],
  )

  const handleSynthParamChange = useCallback((key: string, value: number) => {
    setState((s) => ({ ...s, synthParams: { ...s.synthParams, [key]: value } }))
  }, [])

  const handleSynthRootNoteChange = useCallback((note: string) => {
    setState((s) => ({ ...s, synthRootNote: note }))
  }, [])

  const handleSynthOctaveChange = useCallback((oct: number) => {
    setState((s) => ({ ...s, synthOctave: oct }))
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      if (state.activeTab === 'samples') {
        const idx = state.selectedSample
          ? filteredSamples.findIndex((s) => s.name === state.selectedSample)
          : -1
        const navigate = (delta: number) => {
          const next = filteredSamples[idx + delta]
          if (next) setState((s) => ({ ...s, selectedSample: next.name }))
        }
        switch (e.key) {
          case ' ':
            e.preventDefault()
            if (state.selectedSample) {
              if (samplePlaying) sampleStop(); else samplePlay()
            }
            break
          case 'ArrowRight': e.preventDefault(); navigate(1); break
          case 'ArrowLeft':  e.preventDefault(); navigate(-1); break
          case 'ArrowDown':  e.preventDefault(); navigate(GRID_COL_ESTIMATE); break
          case 'ArrowUp':    e.preventDefault(); navigate(-GRID_COL_ESTIMATE); break
          case 'c': case 'C': handleCopy(); break
        }
      } else if (state.activeTab === 'chords') {
        const idx = state.selectedChord
          ? filteredChords.findIndex((c) => c.name === state.selectedChord)
          : -1
        const navigate = (delta: number) => {
          const next = filteredChords[idx + delta]
          if (next) setState((s) => ({ ...s, selectedChord: next.name }))
        }
        switch (e.key) {
          case ' ':
            e.preventDefault()
            if (state.selectedChord) {
              if (chordPlaying) chordStop(); else void chordPlay()
            }
            break
          case 'ArrowRight': e.preventDefault(); navigate(1); break
          case 'ArrowLeft':  e.preventDefault(); navigate(-1); break
          case 'ArrowDown':  e.preventDefault(); navigate(GRID_COL_ESTIMATE); break
          case 'ArrowUp':    e.preventDefault(); navigate(-GRID_COL_ESTIMATE); break
          case 'c': case 'C': handleCopy(); break
        }
      } else if (state.activeTab === 'scales') {
        const idx = state.selectedScale
          ? filteredScales.findIndex((s) => s.name === state.selectedScale)
          : -1
        const navigate = (delta: number) => {
          const next = filteredScales[idx + delta]
          if (next) setState((s) => ({ ...s, selectedScale: next.name }))
        }
        switch (e.key) {
          case ' ':
            e.preventDefault()
            if (state.selectedScale) {
              if (scalePlaying) scaleStop(); else scalePlay()
            }
            break
          case 'ArrowRight': e.preventDefault(); navigate(1); break
          case 'ArrowLeft':  e.preventDefault(); navigate(-1); break
          case 'ArrowDown':  e.preventDefault(); navigate(GRID_COL_ESTIMATE); break
          case 'ArrowUp':    e.preventDefault(); navigate(-GRID_COL_ESTIMATE); break
          case 'c': case 'C': handleCopy(); break
        }
      } else if (state.activeTab === 'fx') {
        const idx = state.selectedFx
          ? filteredFx.findIndex((f) => f.key === state.selectedFx)
          : -1
        const navigate = (delta: number) => {
          const next = filteredFx[idx + delta]
          if (next) handleFxClick(next.key)
        }
        switch (e.key) {
          case ' ':
            e.preventDefault()
            if (state.selectedFx) {
              if (fxPlayer.isPlaying) fxPlayer.stop(); else void fxPlayer.play()
            }
            break
          case 'ArrowRight': e.preventDefault(); navigate(1); break
          case 'ArrowLeft':  e.preventDefault(); navigate(-1); break
          case 'ArrowDown':  e.preventDefault(); navigate(GRID_COL_ESTIMATE); break
          case 'ArrowUp':    e.preventDefault(); navigate(-GRID_COL_ESTIMATE); break
          case 'c': case 'C': handleCopy(); break
        }
      } else if (state.activeTab === 'synths') {
        const idx = state.selectedSynth
          ? filteredSynths.findIndex((s) => s.name === state.selectedSynth)
          : -1
        const navigate = (delta: number) => {
          const next = filteredSynths[idx + delta]
          if (next) handleSynthClick(next.name)
        }
        switch (e.key) {
          case ' ':
            e.preventDefault()
            if (state.selectedSynth) {
              if (synthIsPlaying) { stopAll(); setSynthIsPlaying(false) }
              else handleSynthClick(state.selectedSynth)
            }
            break
          case 'ArrowRight': e.preventDefault(); navigate(1); break
          case 'ArrowLeft':  e.preventDefault(); navigate(-1); break
          case 'ArrowDown':  e.preventDefault(); navigate(GRID_COL_ESTIMATE); break
          case 'ArrowUp':    e.preventDefault(); navigate(-GRID_COL_ESTIMATE); break
          case 'c': case 'C': handleCopy(); break
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    state.activeTab,
    state.selectedSample, state.selectedChord, state.selectedScale, state.selectedFx, state.selectedSynth,
    filteredSamples, filteredChords, filteredScales, filteredFx, filteredSynths,
    samplePlaying, chordPlaying, scalePlaying, fxPlayer, synthIsPlaying,
    samplePlay, sampleStop, chordPlay, chordStop, scalePlay, scaleStop, stopAll,
    handleCopy, handleFxClick, handleSynthClick,
  ])

  const isSamplesTab = state.activeTab === 'samples'
  const isChordsTab = state.activeTab === 'chords'
  const isFxTab = state.activeTab === 'fx'
  const isSynthsTab = state.activeTab === 'synths'
  const isToolsTab = state.activeTab === 'tools'

  const activeSearch = isSamplesTab
    ? state.search
    : isChordsTab
      ? state.chordsSearch
      : isFxTab
        ? state.fxSearch
        : isSynthsTab
          ? state.synthsSearch
          : state.scalesSearch

  const activeSnippet = isSamplesTab
    ? samplesSnippet
    : isChordsTab
      ? chordsSnippet
      : isFxTab
        ? fxSnippet
        : isSynthsTab
          ? synthSnippet
          : scalesSnippet

  const activeHasSelection = isSamplesTab
    ? !!state.selectedSample
    : isChordsTab
      ? !!state.selectedChord
      : isFxTab
        ? !!state.selectedFx
        : isSynthsTab
          ? !!state.selectedSynth
          : !!state.selectedScale

  const activeAmp = isSamplesTab
    ? state.amp
    : isChordsTab
      ? state.chordAmp
      : isFxTab
        ? state.fxAmp
        : state.scaleAmp

  return (
    <div className="app">
      <Topbar
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
        search={activeSearch}
        onSearchChange={handleSearchChange}
        hideSearch={isToolsTab}
      />

      <div className="main">
        {isSamplesTab && (
          <Sidebar
            selectedCategory={state.selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        )}

        {isSamplesTab ? (
          <SampleGrid
            samples={filteredSamples}
            selectedSample={state.selectedSample}
            isPlaying={samplePlaying}
            onSampleClick={handleSampleClick}
          />
        ) : isChordsTab ? (
          <ChordsTab
            chords={filteredChords}
            selectedChord={state.selectedChord}
            isPlaying={chordPlaying}
            rootNote={state.chordRootNote}
            octave={state.chordOctave}
            numOctaves={state.chordNumOctaves}
            mode={state.chordMode}
            onChordClick={handleChordClick}
            onRootNoteChange={handleChordRootNoteChange}
            onOctaveChange={handleChordOctaveChange}
            onNumOctavesChange={handleChordNumOctavesChange}
            onModeChange={handleChordModeChange}
          />
        ) : isFxTab ? (
          <FxTab
            filteredFx={filteredFx}
            selectedFx={state.selectedFx}
            selectedSample={state.fxSample}
            params={state.fxParams}
            mix={state.fxMix}
            amp={state.fxAmp}
            isPlaying={fxPlayer.isPlaying}
            player={fxPlayer}
            snippet={fxSnippet}
            onFxClick={handleFxClick}
            onSampleChange={handleFxSampleChange}
            onParamChange={handleFxParamChange}
            onMixChange={handleFxMixChange}
            onAmpChange={handleFxAmpChange}
            onCopy={handleCopy}
          />
        ) : isSynthsTab ? (
          <SynthsTab
            filteredSynths={filteredSynths}
            selectedSynth={state.selectedSynth}
            engineState={synthEngineState}
            loadingSynthdef={loadingSynthdef}
            isPlaying={synthIsPlaying}
            params={state.synthParams}
            rootNote={state.synthRootNote}
            octave={state.synthOctave}
            onSynthClick={handleSynthClick}
            onParamChange={handleSynthParamChange}
            onRootNoteChange={handleSynthRootNoteChange}
            onOctaveChange={handleSynthOctaveChange}
            onCopy={handleCopy}
          />
        ) : isToolsTab ? (
          <ToolsTab />
        ) : (
          <ScalesTab
            scales={filteredScales}
            selectedScale={state.selectedScale}
            isPlaying={scalePlaying}
            rootNote={state.scaleRootNote}
            octave={state.scaleOctave}
            onScaleClick={handleScaleClick}
            onRootNoteChange={handleRootNoteChange}
            onOctaveChange={handleOctaveChange}
          />
        )}
      </div>

      {!isFxTab && !isSynthsTab && !isToolsTab && (
        <BottomPanel
          showRate={isSamplesTab}
          rate={state.rate}
          onRateChange={handleRateChange}
          amp={activeAmp}
          onAmpChange={handleAmpChange}
          snippet={activeSnippet}
          hasSelection={activeHasSelection}
          onCopy={handleCopy}
        />
      )}
    </div>
  )
}

export default App
