export type LoopType = 'synth' | 'sample'

export type StudioNote = {
  id: string
  step: number
  duration: number   // in steps
  note: number       // MIDI note number
  velocity: number   // 0–1
  params: Record<string, number>  // per-note param overrides; empty = inherit from loop
}

export type StudioLoop = {
  id: string
  name: string           // e.g. "melody"
  type: LoopType
  synth: string          // e.g. "prophet"
  sample: string         // e.g. "bd_haus" (used when type === 'sample')
  fx: string             // e.g. "reverb" or "none"
  steps: number          // 4 | 8 | 16 | 32
  activeSteps: boolean[] // length === steps
  notes: StudioNote[]
  muted: boolean
  bars: number           // loop length in bars (default 1)
  params: Record<string, number> // synth param overrides (only non-default values need to be set)
}

export type StudioSnapshot = {
  bpm: number
  timeSignature: [number, number]
  loops: StudioLoop[]
  selectedLoopId: string | null
  scaleLock: boolean
  scaleRoot: string
  scaleName: string
}

export type StudioParams = {
  cutoff: number     // 0–130
  res: number        // 0–0.99
  attack: number     // 0–4
  release: number    // 0–8
  amp: number        // 0–2
  reverb_mix: number // 0–1
}

export type StudioState = StudioSnapshot & {
  isPlaying: boolean
  currentBar: number
  currentStep: number
  selectedNoteId: string | null   // ephemeral UI selection — not stored in undo snapshot
  soloLoopId: string | null       // ephemeral performance control — not stored in undo snapshot
  undoStack: StudioSnapshot[]
  redoStack: StudioSnapshot[]
}
