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

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSuperSonic(): {
  state: SuperSonicState
  initEngine: () => void
  playNote: (synth: SynthDefinition, params: Record<string, number>) => Promise<void>
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

  const stopAll = useCallback(() => {
    if (!sonicInstance) return
    sonicInstance.send('/g_freeAll', 0)
    lastNodeIdRef.current = null
  }, [])

  return { state, initEngine, playNote, stopAll }
}

// ── Node ID counter ───────────────────────────────────────────────────────────
let _nodeId = 1000
function nextNodeId(): number {
  const id = _nodeId
  _nodeId = _nodeId >= 30000 ? 1000 : _nodeId + 1
  return id
}
