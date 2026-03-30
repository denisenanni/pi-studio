import { useCallback, useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FxPlayerControls {
  play: () => Promise<void>
  stop: () => void
  isPlaying: boolean
}

// Tone.js effects that extend Effect<> have a `wet` Signal.
// Tone.Filter / Compressor / Limiter / Volume / Panner / EQ3 are raw AudioNodes
// and do not have wet — they are used as 100%-wet inserts.
type EffectNode =
  | Tone.Freeverb
  | Tone.FeedbackDelay
  | Tone.Distortion
  | Tone.BitCrusher
  | Tone.AutoFilter
  | Tone.Tremolo
  | Tone.AutoPanner
  | Tone.Chorus
  | Tone.PitchShift

type InsertNode =
  | Tone.Filter
  | Tone.Compressor
  | Tone.Limiter
  | Tone.Volume
  | Tone.Panner
  | Tone.EQ3

type FxNode = EffectNode | InsertNode

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function midiToHz(midi: number): number {
  return Tone.Frequency(midi, 'midi').toFrequency()
}

// Sonic Pi res (0–1) → Tone.js Filter Q (0.1–30)
function resToQ(res: number): number {
  return 0.1 + res * 29.9
}

function isEffectNode(node: FxNode): node is EffectNode {
  return 'wet' in node
}

function setWet(node: FxNode, mix: number): void {
  if (isEffectNode(node)) {
    node.wet.value = mix
  }
  // InsertNodes have no wet — they pass 100% of the signal; mix is ignored for them.
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildEffect(fxKey: string, params: Record<string, number>, mix: number): FxNode {
  switch (fxKey) {
    case 'reverb': {
      // Tone.Freeverb has roomSize + dampening, which maps to Sonic Pi :reverb room/damp
      const node = new Tone.Freeverb({
        roomSize: params['room'] ?? 0.6,
        dampening: 3000 - (params['damp'] ?? 0.5) * 2800, // damp 0→3000Hz, damp 1→200Hz
        wet: mix,
      })
      return node
    }

    case 'gverb': {
      // Freeverb approximation of GVerb
      const node = new Tone.Freeverb({
        roomSize: Math.min((params['room'] ?? 10) / 300, 1.0),
        dampening: 1500,
        wet: mix,
      })
      return node
    }

    case 'echo':
      return new Tone.FeedbackDelay({
        delayTime: params['phase'] ?? 0.25,
        feedback: params['decay'] ?? 0.5,
        wet: mix,
      })

    case 'slicer': {
      const waveMap: Record<number, Tone.ToneOscillatorType> = {
        0: 'sawtooth', 1: 'square', 2: 'triangle', 3: 'sine',
      }
      const wave = waveMap[params['wave'] ?? 1] ?? 'square'
      return new Tone.Tremolo({
        frequency: 1 / (params['phase'] ?? 0.25),
        depth: params['pulse_width'] ?? 0.5,
        type: wave,
        wet: mix,
      }).start()
    }

    case 'wobble': {
      const waveMap: Record<number, Tone.ToneOscillatorType> = {
        0: 'sawtooth', 1: 'square', 2: 'triangle', 3: 'sine',
      }
      const wave = waveMap[params['wave'] ?? 0] ?? 'sawtooth'
      const baseHz = midiToHz(params['cutoff_min'] ?? 60)
      const maxHz = midiToHz(params['cutoff_max'] ?? 120)
      const octaves = Math.max(0.1, Math.log2(maxHz / Math.max(baseHz, 1)))
      return new Tone.AutoFilter({
        frequency: 1 / (params['phase'] ?? 0.5),
        type: wave,
        baseFrequency: baseHz,
        octaves,
        filter: { type: 'lowpass', rolloff: -12, Q: resToQ(params['res'] ?? 0.8) },
        wet: mix,
      }).start()
    }

    case 'ixi_techno': {
      const baseHz = midiToHz(params['cutoff_min'] ?? 60)
      const maxHz = midiToHz(params['cutoff_max'] ?? 120)
      const octaves = Math.max(0.1, Math.log2(maxHz / Math.max(baseHz, 1)))
      return new Tone.AutoFilter({
        frequency: 1 / (params['phase'] ?? 4.0),
        type: 'sine',
        baseFrequency: baseHz,
        octaves,
        filter: { type: 'bandpass', rolloff: -12, Q: resToQ(params['res'] ?? 0.8) },
        wet: mix,
      }).start()
    }

    case 'lpf':
    case 'nlpf':
      return new Tone.Filter({
        type: 'lowpass',
        frequency: midiToHz(params['cutoff'] ?? 110),
        rolloff: -12,
      })

    case 'hpf':
    case 'nhpf':
      return new Tone.Filter({
        type: 'highpass',
        frequency: midiToHz(params['cutoff'] ?? 110),
        rolloff: -12,
      })

    case 'rlpf':
    case 'nrlpf':
      return new Tone.Filter({
        type: 'lowpass',
        frequency: midiToHz(params['cutoff'] ?? 110),
        rolloff: -12,
        Q: resToQ(params['res'] ?? 0.5),
      })

    case 'rhpf':
    case 'nrhpf':
      return new Tone.Filter({
        type: 'highpass',
        frequency: midiToHz(params['cutoff'] ?? 110),
        rolloff: -12,
        Q: resToQ(params['res'] ?? 0.5),
      })

    case 'bpf':
    case 'nbpf':
    case 'rbpf':
    case 'nrbpf':
      return new Tone.Filter({
        type: 'bandpass',
        frequency: midiToHz(params['centre'] ?? 80),
        rolloff: -12,
        Q: resToQ(params['res'] ?? 0.6),
      })

    case 'band_eq':
      // EQ3 approximates a single peaking band via mid gain + high frequency as centre.
      return new Tone.EQ3({
        low: 0,
        mid: params['db'] ?? 0.6,
        high: 0,
        lowFrequency: 400,
        highFrequency: params['freq'] ?? 100,
      })

    case 'distortion':
      return new Tone.Distortion({ distortion: params['distort'] ?? 0.5, wet: mix })

    case 'bitcrusher': {
      const node = new Tone.BitCrusher(Math.round(params['bits'] ?? 8))
      node.wet.value = mix
      return node
    }

    case 'krush':
      // Distortion approximates Krush's wave-shaping
      return new Tone.Distortion({
        distortion: Math.min((params['gain'] ?? 5) / 1000, 1.0),
        wet: mix,
      })

    case 'compressor':
      return new Tone.Compressor({
        threshold: Tone.gainToDb(params['threshold'] ?? 0.2),
        attack: params['clamp_time'] ?? 0.01,
        release: params['relax_time'] ?? 0.01,
        ratio: 1 / Math.max(params['slope_above'] ?? 0.5, 0.01),
        knee: 3,
      })

    case 'vowel': {
      // Approximation: single bandpass at a vowel formant frequency.
      // Real Sonic Pi vowel uses multiple formant bands (SuperCollider).
      const formantHz = [800, 400, 300, 500, 350]
      const vi = Math.round(params['vowel_sound'] ?? 0)
      return new Tone.Filter({
        type: 'bandpass',
        frequency: formantHz[Math.max(0, Math.min(4, vi))] ?? 800,
        Q: 5,
        rolloff: -12,
      })
    }

    case 'pitch_shift':
      return new Tone.PitchShift({
        pitch: params['pitch'] ?? 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0,
        wet: mix,
      })

    case 'whammy':
      return new Tone.PitchShift({
        pitch: params['transpose'] ?? 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0,
        wet: mix,
      })

    case 'ring_mod':
      // Tremolo at carrier frequency approximates ring modulation (AM synthesis).
      // Real ring mod: signal × sine; Tremolo: amplitude × sine.
      return new Tone.Tremolo({
        frequency: params['freq'] ?? 30,
        depth: 1.0,
        type: 'sine',
        wet: mix,
      }).start()

    case 'octaver':
      // Approximate: pitch up +12 semitones weighted by super_amp.
      // Full octaver (sub / subsub blending) needs a parallel signal chain.
      return new Tone.PitchShift({
        pitch: 12,
        wet: (params['super_amp'] ?? 1.0) * mix,
      })

    case 'flanger':
      // Tone.Chorus is the closest available approximation — no native Flanger.
      return new Tone.Chorus({
        frequency: 1 / (params['phase'] ?? 4.0),
        delayTime: 3.5,
        depth: params['depth'] ?? 0.5,
        feedback: params['feedback'] ?? 0.0,
        type: 'sine',
        wet: mix,
      }).start()

    case 'normaliser':
      return new Tone.Limiter({
        threshold: Tone.gainToDb(params['level'] ?? 1.0),
      })

    case 'level':
      return new Tone.Volume({ volume: 0 })

    case 'pan':
      return new Tone.Panner({ pan: params['pan'] ?? 0.0 })

    case 'tanh':
      // Distortion wave-shaping approximates tanh soft-clipping.
      return new Tone.Distortion({
        distortion: Math.min((params['krunch'] ?? 5) / 1000, 1.0),
        oversample: '4x',
        wet: mix,
      })

    case 'panslicer':
      // AutoPanner alternates left/right — closest to pan slicer.
      return new Tone.AutoPanner({
        frequency: 1 / (params['phase'] ?? 0.25),
        depth: params['pulse_width'] ?? 0.5,
        type: 'square',
        wet: mix,
      }).start()

    default:
      return new Tone.Volume({ volume: 0 })
  }
}

// ---------------------------------------------------------------------------
// Update in-place (no rebuild)
// ---------------------------------------------------------------------------

function updateEffect(node: FxNode, fxKey: string, params: Record<string, number>, mix: number): void {
  setWet(node, mix)

  switch (fxKey) {
    case 'reverb':
      if (node instanceof Tone.Freeverb) {
        node.roomSize.value = params['room'] ?? 0.6
        node.dampening = 3000 - (params['damp'] ?? 0.5) * 2800
      }
      break

    case 'gverb':
      if (node instanceof Tone.Freeverb) {
        node.roomSize.value = Math.min((params['room'] ?? 10) / 300, 1.0)
      }
      break

    case 'echo':
      if (node instanceof Tone.FeedbackDelay) {
        node.delayTime.value = params['phase'] ?? 0.25
        node.feedback.value = params['decay'] ?? 0.5
      }
      break

    case 'slicer':
      if (node instanceof Tone.Tremolo) {
        node.frequency.value = 1 / (params['phase'] ?? 0.25)
        node.depth.value = params['pulse_width'] ?? 0.5
      }
      break

    case 'wobble':
      if (node instanceof Tone.AutoFilter) {
        node.frequency.value = 1 / (params['phase'] ?? 0.5)
        node.baseFrequency = midiToHz(params['cutoff_min'] ?? 60)
        node.octaves = Math.max(
          0.1,
          Math.log2(
            midiToHz(params['cutoff_max'] ?? 120) /
            Math.max(midiToHz(params['cutoff_min'] ?? 60), 1),
          ),
        )
      }
      break

    case 'ixi_techno':
      if (node instanceof Tone.AutoFilter) {
        node.frequency.value = 1 / (params['phase'] ?? 4.0)
        node.baseFrequency = midiToHz(params['cutoff_min'] ?? 60)
        node.octaves = Math.max(
          0.1,
          Math.log2(
            midiToHz(params['cutoff_max'] ?? 120) /
            Math.max(midiToHz(params['cutoff_min'] ?? 60), 1),
          ),
        )
      }
      break

    case 'lpf':
    case 'nlpf':
    case 'hpf':
    case 'nhpf':
      if (node instanceof Tone.Filter) {
        node.frequency.value = midiToHz(params['cutoff'] ?? 110)
      }
      break

    case 'rlpf':
    case 'nrlpf':
    case 'rhpf':
    case 'nrhpf':
      if (node instanceof Tone.Filter) {
        node.frequency.value = midiToHz(params['cutoff'] ?? 110)
        node.Q.value = resToQ(params['res'] ?? 0.5)
      }
      break

    case 'bpf':
    case 'nbpf':
    case 'rbpf':
    case 'nrbpf':
      if (node instanceof Tone.Filter) {
        node.frequency.value = midiToHz(params['centre'] ?? 80)
        node.Q.value = resToQ(params['res'] ?? 0.6)
      }
      break

    case 'band_eq':
      if (node instanceof Tone.EQ3) {
        node.mid.value = params['db'] ?? 0.6
        node.highFrequency.value = params['freq'] ?? 100
      }
      break

    case 'distortion':
      if (node instanceof Tone.Distortion) {
        node.distortion = params['distort'] ?? 0.5
      }
      break

    case 'bitcrusher':
      if (node instanceof Tone.BitCrusher) {
        node.bits.value = Math.round(params['bits'] ?? 8)
      }
      break

    case 'krush':
      if (node instanceof Tone.Distortion) {
        node.distortion = Math.min((params['gain'] ?? 5) / 1000, 1.0)
      }
      break

    case 'compressor':
      if (node instanceof Tone.Compressor) {
        node.threshold.value = Tone.gainToDb(params['threshold'] ?? 0.2)
        node.attack.value = params['clamp_time'] ?? 0.01
        node.release.value = params['relax_time'] ?? 0.01
        node.ratio.value = 1 / Math.max(params['slope_above'] ?? 0.5, 0.01)
      }
      break

    case 'vowel':
      if (node instanceof Tone.Filter) {
        const formantHz = [800, 400, 300, 500, 350]
        const vi = Math.round(params['vowel_sound'] ?? 0)
        node.frequency.value = formantHz[Math.max(0, Math.min(4, vi))] ?? 800
      }
      break

    case 'pitch_shift':
      if (node instanceof Tone.PitchShift) {
        node.pitch = params['pitch'] ?? 0
      }
      break

    case 'whammy':
      if (node instanceof Tone.PitchShift) {
        node.pitch = params['transpose'] ?? 0
      }
      break

    case 'ring_mod':
      if (node instanceof Tone.Tremolo) {
        node.frequency.value = params['freq'] ?? 30
      }
      break

    case 'octaver':
      if (node instanceof Tone.PitchShift) {
        node.wet.value = (params['super_amp'] ?? 1.0) * mix
      }
      break

    case 'flanger':
      if (node instanceof Tone.Chorus) {
        node.frequency.value = 1 / (params['phase'] ?? 4.0)
        node.depth = params['depth'] ?? 0.5
      }
      break

    case 'normaliser':
      if (node instanceof Tone.Limiter) {
        node.threshold.value = Tone.gainToDb(params['level'] ?? 1.0)
      }
      break

    case 'pan':
      if (node instanceof Tone.Panner) {
        node.pan.value = params['pan'] ?? 0.0
      }
      break

    case 'tanh':
      if (node instanceof Tone.Distortion) {
        node.distortion = Math.min((params['krunch'] ?? 5) / 1000, 1.0)
      }
      break

    case 'panslicer':
      if (node instanceof Tone.AutoPanner) {
        node.frequency.value = 1 / (params['phase'] ?? 0.25)
        node.depth.value = params['pulse_width'] ?? 0.5
      }
      break

    // level: no params to update beyond wet (handled above via setWet)
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFxPlayer(
  sampleName: string,
  fxKey: string,
  params: Record<string, number>,
  mix: number,
  amp: number,
): FxPlayerControls {
  const playerRef = useRef<Tone.Player | null>(null)
  const fxNodeRef = useRef<FxNode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Always-current refs — prevent stale closures in effects.
  const paramsRef = useRef(params)
  const mixRef = useRef(mix)
  const ampRef = useRef(amp)
  const fxKeyRef = useRef(fxKey)
  paramsRef.current = params
  mixRef.current = mix
  ampRef.current = amp
  fxKeyRef.current = fxKey

  // ── Rebuild effect when fxKey changes ───────────────────────────────────
  useEffect(() => {
    const oldNode = fxNodeRef.current

    const newNode = buildEffect(fxKey, paramsRef.current, mixRef.current)
    newNode.toDestination()
    fxNodeRef.current = newNode

    // Re-wire player → new effect node
    if (playerRef.current) {
      playerRef.current.disconnect()
      playerRef.current.connect(newNode)
    }

    if (oldNode) {
      oldNode.dispose()
    }

    return () => {
      newNode.dispose()
      fxNodeRef.current = null
    }
  }, [fxKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild player when sampleName changes ──────────────────────────────
  useEffect(() => {
    if (!sampleName) return

    const url = `${import.meta.env.BASE_URL}samples/${sampleName}.flac`

    const player = new Tone.Player({ url, loop: true, autostart: false })
    player.volume.value = ampRef.current === 0 ? -Infinity : Tone.gainToDb(ampRef.current)

    // Connect to existing effect node if present, else to destination.
    if (fxNodeRef.current) {
      player.connect(fxNodeRef.current)
    } else {
      player.toDestination()
    }

    playerRef.current = player

    return () => {
      player.stop()
      player.dispose()
      playerRef.current = null
      setIsPlaying(false)
    }
  }, [sampleName])

  // ── Live param / mix updates ─────────────────────────────────────────────
  useEffect(() => {
    if (fxNodeRef.current) {
      updateEffect(fxNodeRef.current, fxKey, params, mix)
    }
  }, [fxKey, params, mix])

  // ── Live amp updates ────────────────────────────────────────────────────
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume.value = amp === 0 ? -Infinity : Tone.gainToDb(amp)
    }
  }, [amp])

  // ── Controls ─────────────────────────────────────────────────────────────
  const play = useCallback(async (): Promise<void> => {
    const player = playerRef.current
    if (!player) return
    await Tone.start()
    if (player.state === 'stopped') {
      player.start()
      setIsPlaying(true)
    }
  }, [])

  const stop = useCallback((): void => {
    playerRef.current?.stop()
    setIsPlaying(false)
  }, [])

  // ── Full cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      playerRef.current?.stop()
      playerRef.current?.dispose()
      fxNodeRef.current?.dispose()
      playerRef.current = null
      fxNodeRef.current = null
    }
  }, [])

  return { play, stop, isPlaying }
}
