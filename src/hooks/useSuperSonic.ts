import { useState, useCallback, useEffect, useRef } from 'react'
import type { SynthDefinition } from '../data/synths'

// ── Minimal TypeScript interface for the SuperSonic instance ──────────────────
// SuperSonic is loaded from CDN at runtime; we only type what we use.
interface SuperSonicInstance {
  init(): Promise<void>
  loadSynthDef(name: string): Promise<void>
  send(command: '/s_new', synthName: string, nodeId: number, addAction: number, groupId: number, ...args: (string | number)[]): void
  send(command: '/n_free', nodeId: number): void
  send(command: '/g_freeAll', groupId: number): void
}

interface SuperSonicConstructorOptions {
  baseURL: string
  coreBaseURL: string
  synthdefBaseURL: string
  sampleBaseURL: string
}

interface SuperSonicConstructor {
  new (options: SuperSonicConstructorOptions): SuperSonicInstance
}

// ── CDN URLs (pinned to avoid version mismatches) ─────────────────────────────
const SS_VERSION         = '0.63.0'
const SUPERSONIC_CDN_URL = `https://unpkg.com/supersonic-scsynth@${SS_VERSION}/dist/supersonic.js`
const BASE_URL           = `https://unpkg.com/supersonic-scsynth@${SS_VERSION}/dist/`
const CORE_BASE_URL      = `https://unpkg.com/supersonic-scsynth-core@${SS_VERSION}/`
const SYNTHDEF_BASE_URL  = `https://unpkg.com/supersonic-scsynth-synthdefs@${SS_VERSION}/synthdefs/`
const SAMPLE_BASE_URL    = `https://unpkg.com/supersonic-scsynth-samples@${SS_VERSION}/samples/`

// ── Module-level singleton ────────────────────────────────────────────────────
// Engine persists across tab switches and re-renders.
let sonicInstance: SuperSonicInstance | null = null
let initPromise: Promise<void> | null = null
let loadedSynthdefs: Set<string> = new Set()

// ── State exposed to consumers ────────────────────────────────────────────────
export type SuperSonicState = {
  isReady: boolean
  isLoading: boolean
  error: string | null
}

// One entry in the FX chain passed to playWithFx
export type FxChainEntry = {
  supersonicName: string         // e.g. "sonic-pi-fx_reverb"
  params: Record<string, number> // per-FX param values
  mix: number                    // 0–1 wet/dry
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSuperSonic(): {
  state: SuperSonicState
  initEngine: () => void
  playNote: (synth: SynthDefinition, params: Record<string, number>) => Promise<void>
  playWithFx: (synth: SynthDefinition, note: number, synthParams: Record<string, number>, fxChain: FxChainEntry[]) => Promise<void>
  stopAll: () => void
} {
  const [state, setState] = useState<SuperSonicState>({
    isReady: sonicInstance !== null,
    isLoading: initPromise !== null && sonicInstance === null,
    error: null,
  })

  const lastNodeIdRef = useRef<number | null>(null)
  const loadingSynthdefsRef = useRef<Set<string>>(new Set())

  const initEngine = useCallback(() => {
    // Already ready or already loading
    if (sonicInstance !== null || initPromise !== null) return

    setState({ isReady: false, isLoading: true, error: null })

    initPromise = (async () => {
      try {
        const mod = await import(/* @vite-ignore */ SUPERSONIC_CDN_URL) as { SuperSonic: SuperSonicConstructor }
        const { SuperSonic: SuperSonicCtor } = mod

        const instance = new SuperSonicCtor({
          baseURL: BASE_URL,
          coreBaseURL: CORE_BASE_URL,
          synthdefBaseURL: SYNTHDEF_BASE_URL,
          sampleBaseURL: SAMPLE_BASE_URL,
        })

        await instance.init()
        sonicInstance = instance
        setState({ isReady: true, isLoading: false, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        initPromise = null // allow retry
        setState({ isReady: false, isLoading: false, error: `Failed to load audio engine: ${message}` })
      }
    })()
  }, [])

  // Sync state if engine was already initialised before this hook instance mounted.
  // Empty dep array: this is a mount-only reconciliation — nothing to re-check on re-renders.
  useEffect(() => {
    if (sonicInstance !== null) {
      setState({ isReady: true, isLoading: false, error: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playNote = useCallback(
    async (synth: SynthDefinition, params: Record<string, number>) => {
      if (!sonicInstance) return

      // Stop previous node
      if (lastNodeIdRef.current !== null) {
        sonicInstance.send('/n_free', lastNodeIdRef.current)
        lastNodeIdRef.current = null
      }

      // Load synthdef if not already loaded
      if (!loadedSynthdefs.has(synth.supersonicName) && !loadingSynthdefsRef.current.has(synth.supersonicName)) {
        loadingSynthdefsRef.current.add(synth.supersonicName)
        try {
          await sonicInstance.loadSynthDef(synth.supersonicName)
          loadedSynthdefs.add(synth.supersonicName)
        } finally {
          loadingSynthdefsRef.current.delete(synth.supersonicName)
        }
      }

      // If a concurrent load is already in progress for this synthdef, wait for it to finish
      if (loadingSynthdefsRef.current.has(synth.supersonicName)) {
        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            if (!loadingSynthdefsRef.current.has(synth.supersonicName)) {
              clearInterval(interval)
              resolve()
            }
          }, 50)
        })
      }

      if (!loadedSynthdefs.has(synth.supersonicName)) return

      // Build flat key-value args list from params
      const kvArgs: (string | number)[] = []
      for (const [key, value] of Object.entries(params)) {
        kvArgs.push(key, value)
      }

      // Node IDs: scsynth auto-assigns starting from 1000; we use -1 to let it pick.
      // Track the node by reading from a counter — scsynth increments node IDs sequentially.
      // Since we can't get the assigned ID back from SuperSonic's fire-and-forget send(),
      // we manage a simple local counter starting at 1000 and wrap at 30000.
      const nodeId = nextNodeId()
      lastNodeIdRef.current = nodeId

      sonicInstance.send('/s_new', synth.supersonicName, nodeId, 0, 0, ...kvArgs)
    },
    [],
  )

  const playWithFx = useCallback(
    async (
      synth: SynthDefinition,
      note: number,
      synthParams: Record<string, number>,
      fxChain: FxChainEntry[],
    ) => {
      if (!sonicInstance) return

      // Stop any previously playing nodes and invalidate any pending 50ms delay
      _playGeneration++
      sonicInstance.send('/g_freeAll', 0)
      lastNodeIdRef.current = null

      // Collect all synthdef names that need to be loaded
      const toLoad: string[] = []
      if (!loadedSynthdefs.has(synth.supersonicName)) toLoad.push(synth.supersonicName)
      for (const entry of fxChain) {
        if (!loadedSynthdefs.has(entry.supersonicName)) toLoad.push(entry.supersonicName)
      }

      // Load all missing synthdefs in parallel
      if (toLoad.length > 0) {
        await Promise.all(
          toLoad.map(async (name) => {
            if (!loadedSynthdefs.has(name) && !loadingSynthdefsRef.current.has(name)) {
              loadingSynthdefsRef.current.add(name)
              try {
                await sonicInstance!.loadSynthDef(name)
                loadedSynthdefs.add(name)
              } finally {
                loadingSynthdefsRef.current.delete(name)
              }
            }
          }),
        )
      }

      if (!sonicInstance) return

      // Fire the synth node (addToHead of group 0)
      const synthKvArgs: (string | number)[] = ['note', note]
      for (const [key, value] of Object.entries(synthParams)) {
        if (key !== 'note') synthKvArgs.push(key, value)
      }
      const synthNodeId = nextNodeId()
      lastNodeIdRef.current = synthNodeId
      sonicInstance.send('/s_new', synth.supersonicName, synthNodeId, 0, 0, ...synthKvArgs)

      // Delay 50ms so scsynth registers the synth output before FX nodes start.
      // Capture generation before the delay — if stopAll/playWithFx fires during
      // the wait the generation will have changed and we abort instead of sending
      // orphan FX nodes into a cleared group.
      if (fxChain.length > 0) {
        const generation = _playGeneration
        await new Promise<void>((resolve) => setTimeout(resolve, 50))
        if (!sonicInstance || _playGeneration !== generation) return

        // Fire each FX node in chain order (addToTail of group 0 — runs after synth)
        for (const entry of fxChain) {
          if (!loadedSynthdefs.has(entry.supersonicName)) continue
          const fxKvArgs: (string | number)[] = ['mix', entry.mix]
          for (const [key, value] of Object.entries(entry.params)) {
            fxKvArgs.push(key, value)
          }
          sonicInstance.send('/s_new', entry.supersonicName, nextNodeId(), 1, 0, ...fxKvArgs)
        }
      }
    },
    [],
  )

  const stopAll = useCallback(() => {
    if (!sonicInstance) return
    _playGeneration++
    sonicInstance.send('/g_freeAll', 0)
    lastNodeIdRef.current = null
  }, [])

  return { state, initEngine, playNote, playWithFx, stopAll }
}

// ── Node ID counter ───────────────────────────────────────────────────────────
let _nodeId = 1000
function nextNodeId(): number {
  const id = _nodeId
  _nodeId = _nodeId >= 30000 ? 1000 : _nodeId + 1
  return id
}

// ── Module-level exports for use outside the React hook (e.g. usePlayback) ───

/** Returns the SuperSonic instance if already initialised, otherwise null. */
export function getSonicInstance(): SuperSonicInstance | null {
  return sonicInstance
}

/** Initialises the engine if needed and resolves when it is ready (or has failed). */
export async function initSuperSonic(): Promise<void> {
  if (sonicInstance !== null) return

  if (initPromise === null) {
    initPromise = (async () => {
      try {
        const mod = await import(/* @vite-ignore */ SUPERSONIC_CDN_URL) as { SuperSonic: SuperSonicConstructor }
        const { SuperSonic: SuperSonicCtor } = mod
        const instance = new SuperSonicCtor({
          baseURL: BASE_URL,
          coreBaseURL: CORE_BASE_URL,
          synthdefBaseURL: SYNTHDEF_BASE_URL,
          sampleBaseURL: SAMPLE_BASE_URL,
        })
        await instance.init()
        sonicInstance = instance
      } catch {
        initPromise = null
      }
    })()
  }

  await initPromise
}

/** Loads a synthdef by name if not already loaded. No-op if engine is not ready. */
export async function ensureSynthDef(name: string): Promise<void> {
  if (!sonicInstance) return
  if (loadedSynthdefs.has(name)) return
  await sonicInstance.loadSynthDef(name)
  loadedSynthdefs.add(name)
}

/** Returns the next available node ID. */
export { nextNodeId as getNextNodeId }

// ── Play generation counter ───────────────────────────────────────────────────
// Incremented on every g_freeAll call. playWithFx captures the generation before
// its 50ms delay and aborts if it has changed — prevents orphan FX nodes firing
// into a cleared group after stopAll() or a rapid second playWithFx call.
let _playGeneration = 0
