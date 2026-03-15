export type LoopType = 'synth' | 'sample'

export type StudioNote = {
  id: string
  step: number
  duration: number   // in steps
  note: number       // MIDI note number
  velocity: number   // 0–1
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

export type StudioState = StudioSnapshot & {
  isPlaying: boolean
  currentBar: number
  currentStep: number
  undoStack: StudioSnapshot[]
  redoStack: StudioSnapshot[]
}
