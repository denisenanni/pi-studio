import { useCallback, useEffect, useRef, useState } from 'react'
import type * as ToneNS from 'tone'
import type { buildEffect as _buildEffectImport } from '../hooks/useFxPlayer'
import type { StudioState } from './types'
import { getSonicInstance, initSuperSonic, ensureSynthDef, getNextNodeId } from '../hooks/useSuperSonic'

// ── Lazy Tone module cache ────────────────────────────────────────────────────
// Tone.js must NOT be imported statically. Its index.js has module-level exports
// such as `export const Transport = getContext().transport` that eagerly call
// getContext(), which creates an AudioContext outside any user gesture →
// browser "AudioContext was not allowed to start" warning.
// We load it dynamically on the first call to play() instead.

let _tone: typeof ToneNS | null = null
type BuildEffectFn = typeof _buildEffectImport
let _buildEffect: BuildEffectFn | null = null

// Single in-flight promise so concurrent callers (e.g. React Strict Mode
// double-invoke) share one load rather than racing to write _tone/_buildEffect.
let _loadPromise: Promise<void> | null = null

export async function ensureToneLoaded(): Promise<void> {
  if (_tone !== null) return
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    const [toneModule, fxModule] = await Promise.all([
      import('tone'),
      import('../hooks/useFxPlayer'),
    ])
    _tone = toneModule
    _buildEffect = fxModule.buildEffect
  })()
  return _loadPromise
}

export function getTone(): typeof ToneNS | null {
  return _tone
}

// ── Types ─────────────────────────────────────────────────

type FxNode =
  | ToneNS.Freeverb
  | ToneNS.FeedbackDelay
  | ToneNS.Distortion
  | ToneNS.BitCrusher
  | ToneNS.AutoFilter
  | ToneNS.Tremolo
  | ToneNS.AutoPanner
  | ToneNS.Chorus
  | ToneNS.PitchShift
  | ToneNS.Filter
  | ToneNS.Compressor
  | ToneNS.Limiter
  | ToneNS.Volume
  | ToneNS.Panner
  | ToneNS.EQ3

interface SampleEntry {
  player: ToneNS.Player
  fxNode: FxNode | null
  fxKey: string   // the fx value when fxNode was built — used to detect changes
}

// ── Step duration helper ──────────────────────────────────

function calcStepDuration(bpm: number, steps: number, beatsPerBar: number, bars: number): number {
  // duration of one step in seconds
  return (60 / bpm) / (steps / (beatsPerBar * bars))
}

// ── Hook ─────────────────────────────────────────────────

export interface PlaybackControls {
  play: () => Promise<void>
  stop: () => void
  isPlaying: boolean
  currentStep: number
  analyser: ToneNS.Analyser | null
}

export function usePlayback(state: StudioState): PlaybackControls {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [analyser, setAnalyser] = useState<ToneNS.Analyser | null>(null)

  // Always-current state ref so the Tone.Transport callback never closes over stale values
  const stateRef = useRef<StudioState>(state)
  stateRef.current = state

  // Guard: no Tone.js code runs until the user presses Play for the first time
  const audioContextStartedRef = useRef(false)

  // Track the global tick counter (advances on every Transport repeat)
  const tickRef = useRef(0)

  // Sample player cache: loopId → { player, fxNode, fxKey }
  const sampleCacheRef = useRef<Map<string, SampleEntry>>(new Map())

  // Tone.Analyser for waveform strip (also stored in state for reactive prop passing)
  const analyserRef = useRef<ToneNS.Analyser | null>(null)

  // ── BPM sync while playing ────────────────────────────
  // Only runs after AudioContext has been started by user gesture

  useEffect(() => {
    if (audioContextStartedRef.current && isPlaying && _tone) {
      _tone.getTransport().bpm.value = state.bpm
    }
  }, [state.bpm, isPlaying])

  // ── Helpers ───────────────────────────────────────────
  // These are only ever called from the Transport callback (post-play) so
  // _tone and _buildEffect are guaranteed non-null.

  function getOrCreateSamplePlayer(loopId: string, sampleName: string, fxKey: string, fxEntryParams: Record<string, number>): ToneNS.Player {
    const Tone = _tone!
    const buildEffect = _buildEffect!

    const existing = sampleCacheRef.current.get(loopId)

    // Reuse if same sample + same fx
    if (existing && existing.fxKey === fxKey) {
      return existing.player
    }

    // Dispose old entry if present
    if (existing) {
      existing.player.stop()
      existing.player.dispose()
      existing.fxNode?.dispose()
    }

    const mix = fxEntryParams['mix'] ?? 0.4

    let fxNode: FxNode | null = null
    let player: ToneNS.Player

    if (fxKey !== 'none') {
      fxNode = buildEffect(fxKey, fxEntryParams, mix)
      fxNode.toDestination()
      player = new Tone.Player({
        url: `${import.meta.env.BASE_URL}samples/${sampleName}.flac`,
      }).connect(fxNode)
    } else {
      player = new Tone.Player({
        url: `${import.meta.env.BASE_URL}samples/${sampleName}.flac`,
      }).toDestination()
    }

    sampleCacheRef.current.set(loopId, { player, fxNode, fxKey })
    return player
  }

  function disposeSampleCache() {
    for (const entry of sampleCacheRef.current.values()) {
      try { entry.player.stop() } catch { /* already stopped */ }
      entry.player.dispose()
      entry.fxNode?.dispose()
    }
    sampleCacheRef.current.clear()
  }

  // ── stop() ───────────────────────────────────────────

  const stop = useCallback(() => {
    if (!audioContextStartedRef.current || !_tone) return
    const Tone = _tone
    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()

    // Stop all SuperSonic nodes
    const sonic = getSonicInstance()
    if (sonic) {
      sonic.send('/g_freeAll', 0)
    }

    disposeSampleCache()

    // Disconnect and dispose analyser
    if (analyserRef.current) {
      try { Tone.getDestination().disconnect(analyserRef.current) } catch { /* ok */ }
      analyserRef.current.dispose()
      analyserRef.current = null
      setAnalyser(null)
    }

    tickRef.current = 0
    setCurrentStep(0)
    setIsPlaying(false)
  }, [])

  // ── play() ───────────────────────────────────────────

  const play = useCallback(async (): Promise<void> => {
    // Lazy-load Tone.js on first play — must happen before any other Tone calls.
    // ensureToneLoaded() coalesces concurrent calls onto one promise so there
    // is no race between multiple play() invocations (e.g. Strict Mode).
    await ensureToneLoaded()
    const Tone = _tone!

    // Resume AudioContext inside user gesture — must happen before audio operations
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }
    audioContextStartedRef.current = true

    // Lazily init SuperSonic
    initSuperSonic()

    const transport = Tone.getTransport()

    // Ensure clean state
    transport.stop()
    transport.cancel()
    tickRef.current = 0

    const s = stateRef.current
    transport.bpm.value = s.bpm

    // Compute a common step duration using the first non-muted loop's steps,
    // falling back to 16. Each loop's per-step offset is handled inside the callback.
    const referenceLoop = s.loops.find((l) => !l.muted) ?? s.loops[0]
    const referenceSteps = referenceLoop?.steps ?? 16
    const referenceBeatsPerBar = s.timeSignature[0]
    const referenceBars = referenceLoop?.bars ?? 1
    const stepDurSec = calcStepDuration(s.bpm, referenceSteps, referenceBeatsPerBar, referenceBars)

    // Set up analyser
    const newAnalyser = new Tone.Analyser('waveform', 256)
    Tone.getDestination().connect(newAnalyser)
    analyserRef.current = newAnalyser
    setAnalyser(newAnalyser)

    // Pre-load synthdefs for all synth loops
    const synthLoops = s.loops.filter((l) => !l.muted && l.type === 'synth')
    await Promise.all(
      synthLoops.map((l) => ensureSynthDef(`sonic-pi-${l.synth}`))
    )

    transport.scheduleRepeat((time: number) => {
      const tick = tickRef.current
      const cur = stateRef.current

      for (const loop of cur.loops) {
        const effectivelyMuted = loop.muted || (cur.soloLoopId !== null && cur.soloLoopId !== loop.id)
        if (effectivelyMuted) continue

        const loopStep = tick % loop.steps

        if (loop.type === 'synth') {
          const notesOnStep = loop.notes.filter((n) => n.step === loopStep)
          const sonic = getSonicInstance()
          if (!sonic) continue

          const stepDur = calcStepDuration(cur.bpm, loop.steps, cur.timeSignature[0], loop.bars)

          for (const note of notesOnStep) {
            const synthName = `sonic-pi-${loop.synth}`
            // Fire and forget — synthdef should already be loaded from pre-load above.
            // If not loaded yet (e.g. loop added after play), skip gracefully.
            const nodeId = getNextNodeId()
            const releaseSec = note.duration * stepDur
            const effectiveAmp    = note.params['amp']    ?? loop.params['amp']    ?? 1.0
            const effectiveCutoff = note.params['cutoff'] ?? loop.params['cutoff'] ?? 80
            const effectiveAttack = note.params['attack'] ?? loop.params['attack'] ?? 0.1
            const effectiveDecay   = note.params['decay']   ?? loop.params['decay']   ?? 0
            const effectiveSustain = note.params['sustain'] ?? loop.params['sustain'] ?? 1
            sonic.send(
              '/s_new', synthName, nodeId, 0, 0,
              'note', note.note,
              'amp', note.velocity * effectiveAmp,
              'cutoff', effectiveCutoff,
              'attack', effectiveAttack,
              'decay', effectiveDecay,
              'sustain', effectiveSustain,
              'release', releaseSec,
            )
          }
        } else if (loop.type === 'sample') {
          if (!loop.activeSteps[loopStep]) continue

          const firstFx = loop.fxChain[0]
          const player = getOrCreateSamplePlayer(loop.id, loop.sample, firstFx?.fxKey ?? 'none', firstFx?.params ?? {})
          if (player.loaded) {
            try {
              if (player.state === 'started') player.stop(time)
              player.start(time)
            } catch { /* player may not be loaded yet */ }
          }
        }
      }

      tickRef.current += 1
      // Update React state for visual indicators (runs outside the audio thread callback)
      setCurrentStep(tick)
    }, stepDurSec)

    transport.start()
    setIsPlaying(true)
  }, [stop])

  // ── Cleanup on unmount ────────────────────────────────
  // Only touch Tone.js if it was ever started — avoids AudioContext warnings on unmount

  useEffect(() => {
    return () => {
      if (!audioContextStartedRef.current || !_tone) return
      const Tone = _tone
      Tone.getTransport().stop()
      Tone.getTransport().cancel()
      disposeSampleCache()
      if (analyserRef.current) {
        try { Tone.getDestination().disconnect(analyserRef.current) } catch { /* ok */ }
        analyserRef.current.dispose()
        analyserRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    play,
    stop,
    isPlaying,
    currentStep,
    analyser,
  }
}
