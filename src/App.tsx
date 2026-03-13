import { useState, useMemo, useEffect, useCallback } from 'react'
import { SAMPLE_GROUPS, ALL_SAMPLES } from './data/samples'
import type { SampleCategory, Sample } from './data/samples'
import { SCALES } from './data/scales'
import type { Scale } from './data/scales'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useScalePlayer } from './hooks/useScalePlayer'
import { Topbar } from './components/Topbar'
import { Sidebar } from './components/Sidebar'
import { SampleGrid } from './components/SampleGrid'
import { ScalesTab } from './components/ScalesTab'
import { BottomPanel } from './components/BottomPanel'

type ActiveTab = 'samples' | 'scales' | 'synths'

interface AppState {
  activeTab: ActiveTab
  // Samples tab
  selectedCategory: SampleCategory
  selectedSample: string | null
  rate: number
  amp: number
  search: string
  // Scales tab
  selectedScale: string | null
  scaleAmp: number
  scaleRootNote: string
  scaleOctave: number
  scalesSearch: string
}

const INITIAL_STATE: AppState = {
  activeTab: 'samples',
  selectedCategory: 'bd',
  selectedSample: null,
  rate: 1.0,
  amp: 1.0,
  search: '',
  selectedScale: null,
  scaleAmp: 1.0,
  scaleRootNote: 'C',
  scaleOctave: 4,
  scalesSearch: '',
}

const GRID_COL_ESTIMATE = 6

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

  // ── Snippets ────────────────────────────────────────────
  const samplesSnippet = state.selectedSample
    ? `sample :${state.selectedSample}, rate: ${state.rate.toFixed(2)}, amp: ${state.amp.toFixed(2)}`
    : 'no sample selected'

  const scalesSnippet = state.selectedScale
    ? `scale :${state.scaleRootNote}, :${state.selectedScale}`
    : 'no scale selected'

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

  const handleCopy = useCallback(() => {
    if (state.activeTab === 'samples' && state.selectedSample) {
      navigator.clipboard.writeText(samplesSnippet)
    } else if (state.activeTab === 'scales' && state.selectedScale) {
      navigator.clipboard.writeText(scalesSnippet)
    }
  }, [state.activeTab, state.selectedSample, state.selectedScale, samplesSnippet, scalesSnippet])

  // ── Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

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
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    state.activeTab,
    state.selectedSample, state.selectedScale,
    filteredSamples, filteredScales,
    samplePlaying, scalePlaying,
    samplePlay, sampleStop, scalePlay, scaleStop,
    handleCopy,
  ])

  const isSamplesTab = state.activeTab === 'samples'

  return (
    <div className="app">
      <Topbar
        activeTab={state.activeTab}
        onTabChange={(tab) => setState((s) => ({ ...s, activeTab: tab }))}
        search={isSamplesTab ? state.search : state.scalesSearch}
        onSearchChange={(v) =>
          isSamplesTab
            ? setState((s) => ({ ...s, search: v }))
            : setState((s) => ({ ...s, scalesSearch: v }))
        }
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
        ) : (
          <ScalesTab
            scales={filteredScales}
            selectedScale={state.selectedScale}
            isPlaying={scalePlaying}
            rootNote={state.scaleRootNote}
            octave={state.scaleOctave}
            onScaleClick={handleScaleClick}
            onRootNoteChange={(note) => setState((s) => ({ ...s, scaleRootNote: note }))}
            onOctaveChange={(oct) => setState((s) => ({ ...s, scaleOctave: oct }))}
          />
        )}
      </div>

      <BottomPanel
        showRate={isSamplesTab}
        rate={state.rate}
        onRateChange={(rate) => setState((s) => ({ ...s, rate }))}
        amp={isSamplesTab ? state.amp : state.scaleAmp}
        onAmpChange={(amp) =>
          isSamplesTab
            ? setState((s) => ({ ...s, amp }))
            : setState((s) => ({ ...s, scaleAmp: amp }))
        }
        snippet={isSamplesTab ? samplesSnippet : scalesSnippet}
        hasSelection={isSamplesTab ? !!state.selectedSample : !!state.selectedScale}
        onCopy={handleCopy}
      />
    </div>
  )
}

export default App
