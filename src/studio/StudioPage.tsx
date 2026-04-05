import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import './studio.css'
import type { StudioState, StudioLoop, StudioNote, StudioSnapshot, LoopType, SyncMode, FxChainEntry } from './types'

// Default param values — used to merge with per-loop params for ParamsBar display
const PARAM_DEFAULTS: Record<string, number> = {
  // core
  cutoff:      80,
  res:         0.50,
  attack:      0.10,
  decay:       0,
  sustain:     1,
  release:     0.50,
  amp:         1.0,
  // modulation (synth-specific)
  mod_range:   5,
  mod_rate:    0.5,
  divisor:     2,
  depth:       1,
  detune:      0.1,
  wave:        0,
  punch:       0.5,
  pulse_width: 0.5,
  noise_amp:   1,
  phase:       0.25,
  // FX params
  room:        0.6,
  damp:        0.5,
  spread:      0.5,
  distort:     0.5,
  bits:        8,
  sample_rate: 10000,
  gain:        5,
  cutoff_min:  60,
  cutoff_max:  120,
  feedback:    0,
  pitch:       0,
  freq:        30,
  pan:         0,
}
import { usePlayback } from './usePlayback'
import { Transport } from './Transport'
import { WaveformStrip } from './WaveformStrip'
import { LoopsPanel } from './LoopsPanel'
import { DetailPanel } from './DetailPanel'
import { ParamsBar } from './ParamsBar'
import { CodeOutput } from './CodeOutput'
import { generateCode } from './codeGen'

// ── localStorage keys ─────────────────────────────────────

const LS_LOOPS_WIDTH   = 'studio-loops-width'
const LS_CODE_HEIGHT   = 'studio-code-height'
const LS_LOOPS_COLLAPSED = 'studio-loops-collapsed'
const LS_CODE_COLLAPSED  = 'studio-code-collapsed'
const LS_WAVE_COLLAPSED  = 'studio-wave-collapsed'

const DEFAULT_LOOPS_WIDTH = 220
const DEFAULT_CODE_HEIGHT = 120
const MIN_LOOPS_WIDTH = 180
const MAX_LOOPS_WIDTH = 340
const MIN_CODE_HEIGHT = 36
const MAX_CODE_HEIGHT = 280

function readInt(key: string, fallback: number): number {
  try {
    const v = parseInt(localStorage.getItem(key) ?? '', 10)
    return isNaN(v) ? fallback : v
  } catch { return fallback }
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === 'true'
  } catch { return fallback }
}

// ── Placeholder data ──────────────────────────────────────

function makeSteps(total: number, active: number[]): boolean[] {
  return Array.from({ length: total }, (_, i) => active.includes(i))
}

const PLACEHOLDER_NOTE = (id: string, step: number, midiNote: number, vel: number): StudioNote => ({
  id, step, duration: 1, note: midiNote, velocity: vel, params: {},
})

const PLACEHOLDER_LOOPS: StudioLoop[] = [
  {
    id: 'loop-melody',
    name: 'melody',
    type: 'synth',
    synth: 'prophet',
    sample: '',
    fxChain: [{ id: 'fx-melody-1', fxKey: 'reverb', params: {} }],
    steps: 16,
    activeSteps: makeSteps(16, [0, 2, 4, 6, 8, 10, 12, 14]),
    notes: [
      PLACEHOLDER_NOTE('n1', 0, 72, 0.9),  // C5
      PLACEHOLDER_NOTE('n2', 2, 67, 0.75), // G4
      PLACEHOLDER_NOTE('n3', 4, 71, 0.8),  // B4
      PLACEHOLDER_NOTE('n4', 6, 76, 0.85), // E5
    ],
    muted: false,
    bars: 1,
    params: {},
    syncMode: 'auto',
    syncTarget: null,
  },
  {
    id: 'loop-beat',
    name: 'beat',
    type: 'sample',
    synth: 'prophet',
    sample: 'bd_haus',
    fxChain: [],
    steps: 16,
    activeSteps: makeSteps(16, [0, 4, 8, 12]),
    notes: [],
    muted: false,
    bars: 1,
    params: {},
    syncMode: 'auto',
    syncTarget: null,
  },
  {
    id: 'loop-bass',
    name: 'bass',
    type: 'synth',
    synth: 'tb303',
    sample: '',
    fxChain: [],
    steps: 16,
    activeSteps: makeSteps(16, [0, 3, 6, 9, 12, 15]),
    notes: [],
    muted: false,
    bars: 1,
    params: {},
    syncMode: 'auto',
    syncTarget: null,
  },
]

function deriveActiveSteps(notes: StudioNote[], totalSteps: number): boolean[] {
  const active: boolean[] = Array.from({ length: totalSteps }).map(() => false)
  for (const n of notes) {
    if (n.step >= 0 && n.step < totalSteps) active[n.step] = true
  }
  return active
}

function makeInitialState(): StudioState {
  return {
    bpm: 120,
    timeSignature: [4, 4],
    loops: PLACEHOLDER_LOOPS,
    selectedLoopId: 'loop-melody',
    isPlaying: false,
    currentBar: 1,
    currentStep: 1,
    selectedNoteId: null,
    soloLoopId: null,
    scaleLock: false,
    scaleRoot: 'C',
    scaleName: 'minor',
    undoStack: [],
    redoStack: [],
  }
}

function sanitizeLoopName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
}

// ── Snapshot (for undo/redo) ──────────────────────────────

function snapshot(state: StudioState): StudioSnapshot {
  return {
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    loops: state.loops,
    selectedLoopId: state.selectedLoopId,
    scaleLock: state.scaleLock,
    scaleRoot: state.scaleRoot,
    scaleName: state.scaleName,
  }
}

function applySnapshot(state: StudioState, snap: StudioSnapshot): StudioState {
  return { ...state, ...snap }
}

// ── StudioPage ────────────────────────────────────────────

export function StudioPage() {
  const [state, setState] = useState<StudioState>(makeInitialState)

  // Panel layout state (not part of undo history)
  const [loopsWidth, setLoopsWidth]       = useState(() => readInt(LS_LOOPS_WIDTH, DEFAULT_LOOPS_WIDTH))
  const [codeHeight, setCodeHeight]       = useState(() => readInt(LS_CODE_HEIGHT, DEFAULT_CODE_HEIGHT))
  const [loopsCollapsed, setLoopsCollapsed] = useState(() => readBool(LS_LOOPS_COLLAPSED, false))
  const [selectedFxId, setSelectedFxId] = useState<string | null>(null)
  const [codeCollapsed, setCodeCollapsed]   = useState(() => readBool(LS_CODE_COLLAPSED, false))
  const [waveCollapsed, setWaveCollapsed]   = useState(() => readBool(LS_WAVE_COLLAPSED, false))

  // Persist layout to localStorage
  useEffect(() => { localStorage.setItem(LS_LOOPS_WIDTH, String(loopsWidth)) }, [loopsWidth])
  useEffect(() => { localStorage.setItem(LS_CODE_HEIGHT, String(codeHeight)) }, [codeHeight])
  useEffect(() => { localStorage.setItem(LS_LOOPS_COLLAPSED, String(loopsCollapsed)) }, [loopsCollapsed])
  useEffect(() => { localStorage.setItem(LS_CODE_COLLAPSED, String(codeCollapsed)) }, [codeCollapsed])
  useEffect(() => { localStorage.setItem(LS_WAVE_COLLAPSED, String(waveCollapsed)) }, [waveCollapsed])

  // ── Drag resize: loops width ──────────────────────────

  const loopsDragRef  = useRef<{ startX: number; startWidth: number } | null>(null)
  const loopsWidthRef = useRef(loopsWidth)
  useEffect(() => { loopsWidthRef.current = loopsWidth })

  const handleLoopsResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    loopsDragRef.current = { startX: e.clientX, startWidth: loopsWidthRef.current }

    const onMove = (ev: MouseEvent) => {
      if (!loopsDragRef.current) return
      const delta = ev.clientX - loopsDragRef.current.startX
      const next = Math.min(MAX_LOOPS_WIDTH, Math.max(MIN_LOOPS_WIDTH, loopsDragRef.current.startWidth + delta))
      setLoopsWidth(next)
    }
    const onUp = () => {
      loopsDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const handleLoopsResizeReset = useCallback(() => {
    setLoopsWidth(DEFAULT_LOOPS_WIDTH)
  }, [])

  // ── Drag resize: code height ──────────────────────────

  const codeDragRef   = useRef<{ startY: number; startHeight: number } | null>(null)
  const codeHeightRef = useRef(codeHeight)
  useEffect(() => { codeHeightRef.current = codeHeight })

  const handleCodeResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    codeDragRef.current = { startY: e.clientY, startHeight: codeHeightRef.current }

    const onMove = (ev: MouseEvent) => {
      if (!codeDragRef.current) return
      const delta = codeDragRef.current.startY - ev.clientY  // drag up = increase height
      const next = Math.min(MAX_CODE_HEIGHT, Math.max(MIN_CODE_HEIGHT, codeDragRef.current.startHeight + delta))
      setCodeHeight(next)
    }
    const onUp = () => {
      codeDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // ── State mutations (with undo) ───────────────────────

  const pushUndo = useCallback((prev: StudioState): StudioState => ({
    ...prev,
    undoStack: [...prev.undoStack.slice(-49), snapshot(prev)],
    redoStack: [],
  }), [])

  const handleBpmChange = useCallback((bpm: number) => {
    setState((s) => ({ ...pushUndo(s), bpm }))
  }, [pushUndo])

  const handleTimeSigChange = useCallback((ts: [number, number]) => {
    setState((s) => ({ ...pushUndo(s), timeSignature: ts }))
  }, [pushUndo])

  const handleSetNoteParam = useCallback((loopId: string, noteId: string, key: string, value: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) =>
        l.id === loopId
          ? { ...l, notes: l.notes.map((n) => n.id === noteId ? { ...n, params: { ...n.params, [key]: value } } : n) }
          : l
      ),
    }))
  }, [pushUndo])

  const handleSetLoopParam = useCallback((key: string, value: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) =>
        l.id === s.selectedLoopId
          ? { ...l, params: { ...l.params, [key]: value } }
          : l
      ),
    }))
  }, [pushUndo])

  const handleResetNoteParam = useCallback((key: string) => {
    setState((s) => {
      const noteId = s.selectedNoteId
      if (!noteId) return s
      return {
        ...pushUndo(s),
        loops: s.loops.map((l) =>
          l.id === s.selectedLoopId
            ? { ...l, notes: l.notes.map((n) => {
                if (n.id !== noteId) return n
                const rest = Object.fromEntries(Object.entries(n.params).filter(([k]) => k !== key))
                return { ...n, params: rest }
              }) }
            : l
        ),
      }
    })
  }, [pushUndo])

  const handleUndo = useCallback(() => {
    setState((s) => {
      if (s.undoStack.length === 0) return s
      const snap = s.undoStack[s.undoStack.length - 1]
      return {
        ...applySnapshot(s, snap),
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, snapshot(s)],
      }
    })
  }, [])

  const handleRedo = useCallback(() => {
    setState((s) => {
      if (s.redoStack.length === 0) return s
      const snap = s.redoStack[s.redoStack.length - 1]
      return {
        ...applySnapshot(s, snap),
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, snapshot(s)],
      }
    })
  }, [])

  const handleExport = useCallback(() => {
    const blob = new Blob([generateCode(state)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pi-studio-export.rb'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }, [state])

  const handleSelectLoop = useCallback((id: string) => {
    setState((s) => ({ ...s, selectedLoopId: id }))
  }, [])

  const handleToggleMute = useCallback((id: string) => {
    // Mute is a performance control — no undo
    setState((s) => ({
      ...s,
      loops: s.loops.map((l) => l.id === id ? { ...l, muted: !l.muted } : l),
    }))
  }, [])

  const handleToggleSolo = useCallback((id: string) => {
    setState((s) => ({ ...s, soloLoopId: s.soloLoopId === id ? null : id }))
  }, [])

  const handleRenameLoop = useCallback((id: string, name: string) => {
    setState((s) => {
      const clean = sanitizeLoopName(name)
      if (!clean) return s
      const others = s.loops.filter((l) => l.id !== id).map((l) => l.name)
      let final = clean
      if (others.includes(final)) {
        let n = 2
        while (others.includes(`${clean}_${n}`)) n++
        final = `${clean}_${n}`
      }
      return { ...pushUndo(s), loops: s.loops.map((l) => l.id === id ? { ...l, name: final } : l) }
    })
  }, [pushUndo])

  const handleAddLoop = useCallback(() => {
    setState((s) => {
      if (s.loops.length >= 8) return s
      const newLoop: StudioLoop = {
        id: crypto.randomUUID(),
        name: `loop${s.loops.length + 1}`,
        type: 'synth',
        synth: 'beep',
        sample: 'bd_haus',
        fxChain: [],
        steps: 16,
        activeSteps: new Array(16).fill(false) as boolean[],
        notes: [],
        muted: false,
        bars: 1,
        params: {},
        syncMode: 'auto',
        syncTarget: null,
      }
      return { ...pushUndo(s), loops: [...s.loops, newLoop], selectedLoopId: newLoop.id }
    })
  }, [pushUndo])

  const handleDeleteLoop = useCallback((loopId: string) => {
    setState((s) => {
      if (s.loops.length <= 1) return s
      const idx = s.loops.findIndex((l) => l.id === loopId)
      const deletedName = s.loops.find((l) => l.id === loopId)?.name
      const newLoops = s.loops
        .filter((l) => l.id !== loopId)
        .map((l) =>
          l.syncMode === 'sync_to' && l.syncTarget === deletedName
            ? { ...l, syncMode: 'auto' as SyncMode, syncTarget: null }
            : l
        )
      const newSelected = s.selectedLoopId === loopId
        ? (newLoops[idx] ?? newLoops[idx - 1])?.id ?? null
        : s.selectedLoopId
      return { ...pushUndo(s), loops: newLoops, selectedLoopId: newSelected }
    })
  }, [pushUndo])

  const handleSetLoopType = useCallback((loopId: string, loopType: LoopType) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== loopId) return l
        return { ...l, type: loopType, notes: [], activeSteps: new Array(l.steps).fill(false) as boolean[] }
      }),
    }))
  }, [pushUndo])

  const handleSetLoopSample = useCallback((loopId: string, sample: string) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => l.id === loopId ? { ...l, sample } : l),
    }))
  }, [pushUndo])

  const handleToggleStep = useCallback((loopId: string, step: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== loopId) return l
        const newActive = [...l.activeSteps]
        newActive[step] = !newActive[step]
        return { ...l, activeSteps: newActive }
      }),
    }))
  }, [pushUndo])

  const handleReorderLoops = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    setState((s) => {
      const newLoops = [...s.loops]
      const [moved] = newLoops.splice(fromIndex, 1)
      newLoops.splice(toIndex, 0, moved)
      return { ...pushUndo(s), loops: newLoops }
    })
  }, [pushUndo])

  const handleSynthChange = useCallback((synth: string) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => l.id === s.selectedLoopId ? { ...l, synth } : l),
    }))
  }, [pushUndo])

  const handleAddFx = useCallback((fxKey: string) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== s.selectedLoopId || l.fxChain.length >= 3) return l
        const entry: FxChainEntry = { id: crypto.randomUUID(), fxKey, params: {} }
        return { ...l, fxChain: [...l.fxChain, entry] }
      }),
    }))
  }, [pushUndo])

  const handleRemoveFx = useCallback((loopId: string, fxId: string) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) =>
        l.id === loopId ? { ...l, fxChain: l.fxChain.filter((e) => e.id !== fxId) } : l
      ),
    }))
  }, [pushUndo])

  const handleSetFxKey = useCallback((loopId: string, fxId: string, fxKey: string) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) =>
        l.id === loopId
          ? { ...l, fxChain: l.fxChain.map((e) => e.id === fxId ? { ...e, fxKey, params: {} } : e) }
          : l
      ),
    }))
  }, [pushUndo])

  const handleSetFxParam = useCallback((loopId: string, fxId: string, key: string, value: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) =>
        l.id === loopId
          ? { ...l, fxChain: l.fxChain.map((e) => e.id === fxId ? { ...e, params: { ...e.params, [key]: value } } : e) }
          : l
      ),
    }))
  }, [pushUndo])

  const handleSetSyncMode = useCallback((loopId: string, syncMode: SyncMode, syncTarget: string | null) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => l.id === loopId ? { ...l, syncMode, syncTarget } : l),
    }))
  }, [pushUndo])

  const handleStepsChange = useCallback((steps: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== s.selectedLoopId) return l
        const newActive = Array.from({ length: steps }, (_, i) => l.activeSteps[i] ?? false)
        return { ...l, steps, activeSteps: newActive }
      }),
    }))
  }, [pushUndo])

  const handleScaleLockToggle = useCallback(() => {
    setState((s) => ({ ...pushUndo(s), scaleLock: !s.scaleLock }))
  }, [pushUndo])

  const handleScaleNameChange = useCallback((name: string) => {
    setState((s) => ({ ...pushUndo(s), scaleName: name }))
  }, [pushUndo])

  // ── Note actions ───────────────────────────────────────

  const handleAddNote = useCallback((loopId: string, note: StudioNote) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== loopId) return l
        const notes = [...l.notes, note]
        return { ...l, notes, activeSteps: deriveActiveSteps(notes, l.steps) }
      }),
    }))
  }, [pushUndo])

  const handleDeleteNote = useCallback((loopId: string, noteId: string) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== loopId) return l
        const notes = l.notes.filter((n) => n.id !== noteId)
        return { ...l, notes, activeSteps: deriveActiveSteps(notes, l.steps) }
      }),
    }))
  }, [pushUndo])

  const handleMoveNote = useCallback((loopId: string, noteId: string, step: number, midiNote: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== loopId) return l
        const notes = l.notes.map((n) => n.id === noteId ? { ...n, step, note: midiNote } : n)
        return { ...l, notes, activeSteps: deriveActiveSteps(notes, l.steps) }
      }),
    }))
  }, [pushUndo])

  const handleResizeNote = useCallback((loopId: string, noteId: string, duration: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== loopId) return l
        return { ...l, notes: l.notes.map((n) => n.id === noteId ? { ...n, duration } : n) }
      }),
    }))
  }, [pushUndo])

  const handleSetVelocity = useCallback((loopId: string, noteId: string, velocity: number) => {
    setState((s) => ({
      ...pushUndo(s),
      loops: s.loops.map((l) => {
        if (l.id !== loopId) return l
        return { ...l, notes: l.notes.map((n) => n.id === noteId ? { ...n, velocity } : n) }
      }),
    }))
  }, [pushUndo])

  const handleSelectNote = useCallback((noteId: string | null) => {
    setState((s) => ({ ...s, selectedNoteId: noteId }))
  }, [])

  const handleToggleWave = useCallback(() => setWaveCollapsed((v) => !v), [])
  const handleToggleCodeCollapse = useCallback(() => setCodeCollapsed((v) => !v), [])
  const handleToggleLoopsCollapse = useCallback(() => {
    setLoopsCollapsed((v) => {
      if (v) handleLoopsResizeReset()
      return !v
    })
  }, [handleLoopsResizeReset])

  // ── Keyboard shortcuts ─────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.key === 'z' && e.shiftKey) || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  // ── Playback engine ────────────────────────────────────

  const { play: playbackPlay, stop: playbackStop, isPlaying: pbPlaying,
          isLoading: pbLoading, currentStep: pbStep, analyser } = usePlayback(state)

  const handlePlay  = useCallback(() => { void playbackPlay() }, [playbackPlay])
  const handleStop  = useCallback(() => { playbackStop() }, [playbackStop])

  // ── Derived ────────────────────────────────────────────

  const selectedLoop = state.loops.find((l) => l.id === state.selectedLoopId) ?? null
  const selectedNote = selectedLoop?.notes.find((n) => n.id === state.selectedNoteId) ?? null
  const code = useMemo(() => generateCode(state), [state])

  // Reset selectedFxId to first entry when loop changes
  useEffect(() => {
    setSelectedFxId(selectedLoop?.fxChain[0]?.id ?? null)
  }, [state.selectedLoopId])

  // Effective params for ParamsBar: note overrides → loop defaults → global defaults
  const loopParams: Record<string, number> = { ...PARAM_DEFAULTS, ...selectedLoop?.params }
  const paramsBarParams: Record<string, number> = selectedNote
    ? { ...loopParams, ...selectedNote.params }
    : loopParams
  const paramsBarMode: 'note' | 'loop' = selectedNote ? 'note' : 'loop'

  return (
    <div className="studio-page">
      <Transport
        bpm={state.bpm}
        onBpmChange={handleBpmChange}
        timeSignature={state.timeSignature}
        onTimeSignatureChange={handleTimeSigChange}
        isPlaying={pbPlaying}
        isLoading={pbLoading}
        onPlay={handlePlay}
        onStop={handleStop}
        currentBar={Math.floor(pbStep / (state.loops.find((l) => !l.muted)?.steps ?? 16)) + 1}
        currentStep={pbStep}
        canUndo={state.undoStack.length > 0}
        canRedo={state.redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        waveCollapsed={waveCollapsed}
        onToggleWave={handleToggleWave}
      />

      <WaveformStrip
        collapsed={waveCollapsed}
        onToggle={handleToggleWave}
        analyser={analyser}
      />

      <div className="studio-body">
        <LoopsPanel
          loops={state.loops}
          selectedLoopId={state.selectedLoopId}
          soloLoopId={state.soloLoopId}
          onSelectLoop={handleSelectLoop}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onRenameLoop={handleRenameLoop}
          onAddLoop={handleAddLoop}
          onDeleteLoop={handleDeleteLoop}
          onSetLoopType={handleSetLoopType}
          onReorderLoops={handleReorderLoops}
          width={loopsWidth}
          collapsed={loopsCollapsed}
          onToggleCollapse={handleToggleLoopsCollapse}
          onResizeStart={handleLoopsResizeStart}
          currentStep={pbStep}
          isPlaying={pbPlaying}
        />

        <div className="studio-center">
          <DetailPanel
            loop={selectedLoop}
            loops={state.loops}
            scaleLock={state.scaleLock}
            scaleName={state.scaleName}
            scaleRoot={state.scaleRoot}
            selectedNoteId={state.selectedNoteId}
            currentStep={pbStep}
            isPlaying={pbPlaying}
            onScaleLockToggle={handleScaleLockToggle}
            onScaleNameChange={handleScaleNameChange}
            onSynthChange={handleSynthChange}
            onAddFx={handleAddFx}
            onRemoveFx={handleRemoveFx}
            onSetFxKey={handleSetFxKey}
            selectedFxId={selectedFxId}
            onSelectFx={setSelectedFxId}
            onStepsChange={handleStepsChange}
            onToggleStep={handleToggleStep}
            onSetLoopSample={handleSetLoopSample}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onMoveNote={handleMoveNote}
            onResizeNote={handleResizeNote}
            onSetVelocity={handleSetVelocity}
            onSelectNote={handleSelectNote}
            onSetSyncMode={handleSetSyncMode}
          />

          <ParamsBar
            params={paramsBarParams}
            defaults={loopParams}
            mode={paramsBarMode}
            synth={selectedLoop?.synth ?? ''}
            fxChain={selectedLoop?.fxChain ?? []}
            selectedFxId={selectedFxId}
            onParamChange={(key, value) => {
              if (selectedNote && selectedLoop) {
                handleSetNoteParam(selectedLoop.id, selectedNote.id, key, value)
              } else {
                handleSetLoopParam(key, value)
              }
            }}
            onFxParamChange={(fxId: string, key: string, value: number) => {
              if (selectedLoop) handleSetFxParam(selectedLoop.id, fxId, key, value)
            }}
            onSelectFx={setSelectedFxId}
            onParamReset={handleResetNoteParam}
          />

          <CodeOutput
            code={code}
            height={codeHeight}
            collapsed={codeCollapsed}
            onToggleCollapse={handleToggleCodeCollapse}
            onResizeStart={handleCodeResizeStart}
          />
        </div>
      </div>
    </div>
  )
}
