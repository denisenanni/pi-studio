export type LoopType = 'synth' | 'sample'

export type SyncMode = 'auto' | 'sync_to' | 'free'

export type RrandRange = [number, number]

export type FxChainEntry = {
  id: string
  fxKey: string                    // e.g. "reverb"
  params: Record<string, number>   // per-FX param overrides (includes mix)
}

export type StudioNote = {
  id: string
  step: number
  duration: number   // in steps
  note: number       // MIDI note number
  velocity: number   // 0–1
  params: Record<string, number>       // per-note param overrides; empty = inherit from loop
  rrandParams: Record<string, RrandRange> // per-note rrand overrides; key → [min, max]
}

export type RepeatGroup = {
  id: string
  startStep: number  // first step of the group (inclusive)
  endStep: number    // last step of the group (inclusive)
  count: number      // N in N.times, range 2–8
}

export type StudioLoop = {
  id: string
  name: string           // e.g. "melody"
  type: LoopType
  synth: string          // e.g. "prophet"
  sample: string         // e.g. "bd_haus" (used when type === 'sample')
  fxChain: FxChainEntry[]  // up to 3 FX; empty = no FX
  steps: number          // 4 | 8 | 16 | 32
  activeSteps: boolean[] // length === steps
  notes: StudioNote[]
  muted: boolean
  bars: number           // loop length in bars (default 1)
  params: Record<string, number>          // synth param overrides
  rrandParams: Record<string, RrandRange> // loop-level rrand; key → [min, max]
  stepParams: Record<number, Record<string, number>>           // sample: per-step param overrides
  stepRrandParams: Record<number, Record<string, RrandRange>>  // sample: per-step rrand
  repeatGroups: RepeatGroup[]  // synth loops only
  syncMode: SyncMode     // default: 'auto'
  syncTarget: string | null // loop name to sync to (only used when syncMode === 'sync_to')
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
  cutoff:  number  // 0–130
  res:     number  // 0–0.99
  attack:  number  // 0–4
  decay:   number  // 0–4
  sustain: number  // 0–1
  release: number  // 0–8
  amp:     number  // 0–2
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
