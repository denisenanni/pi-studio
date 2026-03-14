import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { SYNTHS, NOTE_NAMES, noteToMidi } from '../data/synths'
import type { SynthDefinition, NoteName } from '../data/synths'
import { SYNTH_FX_LIST } from '../data/synthFx'
import type { SynthFxDefinition } from '../data/synthFx'
import type { SuperSonicState, FxChainEntry } from '../hooks/useSuperSonic'

// ── Types ──────────────────────────────────────────────────────

interface ChainItem {
  id: number                     // stable React key
  fxKey: string                  // selected FX key
  mix: number                    // 0–1 wet/dry
  params: Record<string, number> // per-FX param values
}

// ── Constants ──────────────────────────────────────────────────

const OCTAVES = [2, 3, 4, 5, 6] as const
const MAX_CHAIN = 3

// ── Helpers ────────────────────────────────────────────────────

function defaultFxParams(fxDef: SynthFxDefinition): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of fxDef.params) out[p.key] = p.default
  return out
}

function buildSynthLine(
  synth: SynthDefinition,
  note: number,
  params: Record<string, number>,
  indent: string,
): string {
  const nonDefault = synth.params
    .filter((p) => {
      if (p.key === 'note' || p.key === 'amp') return false
      const val = params[p.key] ?? p.default
      return Math.abs(val - p.default) >= p.step
    })
    .map((p) => {
      const val = params[p.key] ?? p.default
      return `${p.key}: ${p.step < 1 ? val.toFixed(2) : String(Math.round(val))}`
    })

  const amp = params['amp'] ?? 1
  const parts = [`note: ${note}`, `amp: ${amp.toFixed(2)}`, ...nonDefault]
  return `${indent}synth :${synth.name}, ${parts.join(', ')}`
}

function buildSnippet(
  synth: SynthDefinition | null,
  note: number,
  synthParams: Record<string, number>,
  chain: ChainItem[],
): string {
  if (!synth) return '# select a synth to generate code'

  const synthLine = buildSynthLine(synth, note, synthParams, '  '.repeat(chain.length))

  if (chain.length === 0) return synthLine

  const lines: string[] = []
  // chain[0] = outermost with_fx, chain[last] = innermost
  for (let i = 0; i < chain.length; i++) {
    const item = chain[i]
    const fxDef = SYNTH_FX_LIST.find((f) => f.key === item.fxKey)
    if (!fxDef) continue

    const nonDefault = fxDef.params
      .filter((p) => {
        const val = item.params[p.key] ?? p.default
        return Math.abs(val - p.default) >= p.step
      })
      .map((p) => {
        const val = item.params[p.key] ?? p.default
        return `${p.key}: ${p.step < 1 ? val.toFixed(2) : String(Math.round(val))}`
      })

    const mixStr = Math.abs(item.mix - 1.0) >= 0.01 ? `, mix: ${item.mix.toFixed(2)}` : ''
    const paramStr = nonDefault.length > 0 ? `, ${nonDefault.join(', ')}` : ''
    const indent = '  '.repeat(i)
    lines.push(`${indent}with_fx :${item.fxKey}${mixStr}${paramStr} do`)
  }

  lines.push(synthLine)

  for (let i = chain.length - 1; i >= 0; i--) {
    lines.push(`${'  '.repeat(i)}end`)
  }

  return lines.join('\n')
}

// ── Props ──────────────────────────────────────────────────────

interface SynthFxTabProps {
  engineState: SuperSonicState
  playWithFx: (
    synth: SynthDefinition,
    note: number,
    synthParams: Record<string, number>,
    fxChain: FxChainEntry[],
  ) => Promise<void>
  stopAll: () => void
}

// ── Component ──────────────────────────────────────────────────

export function SynthFxTab({ engineState, playWithFx, stopAll }: SynthFxTabProps) {
  const defaultSynth = SYNTHS[0]

  const [selectedSynthName, setSelectedSynthName] = useState<string>(defaultSynth?.name ?? '')
  const [rootNote, setRootNote] = useState<NoteName>('C')
  const [octave, setOctave] = useState(4)
  const [synthParams, setSynthParams] = useState<Record<string, number>>(() => {
    if (!defaultSynth) return {}
    const out: Record<string, number> = {}
    for (const p of defaultSynth.params) out[p.key] = p.default
    return out
  })
  const [chain, setChain] = useState<ChainItem[]>([])
  const idCounterRef = useRef(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      if (playingTimerRef.current !== null) clearTimeout(playingTimerRef.current)
    }
  }, [])

  const selectedSynth = useMemo(
    () => SYNTHS.find((s) => s.name === selectedSynthName) ?? null,
    [selectedSynthName],
  )

  const midiNote = useMemo(() => noteToMidi(rootNote, octave), [rootNote, octave])

  const snippet = useMemo(
    () => buildSnippet(selectedSynth, midiNote, synthParams, chain),
    [selectedSynth, midiNote, synthParams, chain],
  )

  // When synth changes, reset params to the new synth's defaults
  const handleSynthChange = useCallback((name: string) => {
    const synth = SYNTHS.find((s) => s.name === name)
    if (!synth) return
    const out: Record<string, number> = {}
    for (const p of synth.params) out[p.key] = p.default
    setSelectedSynthName(name)
    setSynthParams(out)
  }, [])

  const handleSynthParamChange = useCallback((key: string, value: number) => {
    setSynthParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleAddFx = useCallback(() => {
    const firstFx = SYNTH_FX_LIST[0]
    if (!firstFx) return
    setChain((prev) => {
      if (prev.length >= MAX_CHAIN) return prev
      // Use a ref so the id is always current — avoids stale closure in the updater
      const newId = idCounterRef.current++
      return [
        ...prev,
        { id: newId, fxKey: firstFx.key, mix: 1.0, params: defaultFxParams(firstFx) },
      ]
    })
  }, [])

  const handleRemoveFx = useCallback((id: number) => {
    setChain((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const handleFxKeyChange = useCallback((id: number, newKey: string) => {
    const fxDef = SYNTH_FX_LIST.find((f) => f.key === newKey)
    if (!fxDef) return
    setChain((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, fxKey: newKey, params: defaultFxParams(fxDef) }
          : item,
      ),
    )
  }, [])

  const handleFxMixChange = useCallback((id: number, mix: number) => {
    setChain((prev) => prev.map((item) => (item.id === id ? { ...item, mix } : item)))
  }, [])

  const handleFxParamChange = useCallback((id: number, key: string, value: number) => {
    setChain((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, params: { ...item.params, [key]: value } } : item,
      ),
    )
  }, [])

  const handlePlay = useCallback(() => {
    if (!selectedSynth || !engineState.isReady) return
    if (isPlaying) {
      stopAll()
      setIsPlaying(false)
      if (playingTimerRef.current !== null) {
        clearTimeout(playingTimerRef.current)
        playingTimerRef.current = null
      }
      return
    }

    const fxChainEntries: FxChainEntry[] = chain.map((item) => ({
      supersonicName: SYNTH_FX_LIST.find((f) => f.key === item.fxKey)?.supersonicName ?? '',
      params: item.params,
      mix: item.mix,
    })).filter((e) => e.supersonicName !== '')

    // Capture timing before the async call so values don't drift
    const attack = synthParams['attack'] ?? 0
    const release = synthParams['release'] ?? 1
    const durationMs = (attack + release) * 1000 + 200

    setIsPlaying(true)
    void playWithFx(selectedSynth, midiNote, synthParams, fxChainEntries).then(() => {
      // Only set the auto-stop timer after the engine has confirmed the nodes fired
      if (playingTimerRef.current !== null) clearTimeout(playingTimerRef.current)
      playingTimerRef.current = setTimeout(() => setIsPlaying(false), durationMs)
    }).catch(() => {
      setIsPlaying(false)
    })
  }, [selectedSynth, engineState.isReady, isPlaying, chain, midiNote, synthParams, playWithFx, stopAll])

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1200)
    })
  }, [snippet])

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="synth-fx-tab">
      {/* Engine status banner — same as SynthsTab */}
      {engineState.isLoading && (
        <div className="synths-banner synths-banner--loading">
          <span className="synths-banner-dot" />
          Loading audio engine…
        </div>
      )}
      {engineState.error && (
        <div className="synths-banner synths-banner--error">
          {engineState.error}
        </div>
      )}
      {!engineState.isReady && !engineState.isLoading && !engineState.error && (
        <div className="synths-banner synths-banner--loading">
          <span className="synths-banner-dot" />
          Initialising audio engine…
        </div>
      )}

      <div className="synth-fx-body">
        {/* ── Left column: Synth ── */}
        <div className="synth-fx-left">
          <div className="synth-fx-section-title">Synth</div>

          {/* Synth dropdown */}
          <div className="synth-fx-field">
            <label className="synth-fx-label">Synth</label>
            <select
              className="synth-fx-select"
              value={selectedSynthName}
              onChange={(e) => handleSynthChange(e.target.value)}
            >
              {SYNTHS.map((s) => (
                <option key={s.name} value={s.name}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Note selector */}
          <div className="synth-fx-field">
            <label className="synth-fx-label">Note</label>
            <div className="synth-fx-pills">
              {NOTE_NAMES.map((n) => (
                <button
                  key={n}
                  className={`synth-fx-pill${rootNote === n ? ' active' : ''}`}
                  onClick={() => setRootNote(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Octave selector */}
          <div className="synth-fx-field">
            <label className="synth-fx-label">Octave</label>
            <div className="synth-fx-pills">
              {OCTAVES.map((o) => (
                <button
                  key={o}
                  className={`synth-fx-pill${octave === o ? ' active' : ''}`}
                  onClick={() => setOctave(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Synth param sliders */}
          {selectedSynth && (
            <div className="synth-fx-params">
              {selectedSynth.params
                .filter((p) => p.key !== 'note')
                .map((p) => {
                  const val = synthParams[p.key] ?? p.default
                  return (
                    <div key={p.key} className="synth-fx-slider-row">
                      <span className="synth-fx-param-label">{p.label}</span>
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        value={val}
                        onChange={(e) => handleSynthParamChange(p.key, parseFloat(e.target.value))}
                        className="synth-fx-slider"
                      />
                      <span className="synth-fx-param-val">
                        {p.step < 1 ? val.toFixed(2) : String(Math.round(val))}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Play / Stop button */}
          <button
            className={`synth-fx-play-btn${isPlaying ? ' active' : ''}`}
            disabled={!engineState.isReady || !selectedSynth}
            onClick={handlePlay}
          >
            {isPlaying ? '■ Stop' : '▶ Play'}
          </button>
        </div>

        {/* ── Right column: FX Chain ── */}
        <div className="synth-fx-right">
          <div className="synth-fx-right-header">
            <span className="synth-fx-section-title">FX Chain</span>
            <button
              className="synth-fx-add-btn"
              disabled={chain.length >= MAX_CHAIN}
              onClick={handleAddFx}
            >
              + Add FX
            </button>
          </div>

          {chain.length === 0 ? (
            <div className="synth-fx-empty">
              No FX added. Click <strong>+ Add FX</strong> to build a chain.
            </div>
          ) : (
            <div className="synth-fx-chain">
              {chain.map((item, index) => {
                const fxDef = SYNTH_FX_LIST.find((f) => f.key === item.fxKey)
                return (
                  <div key={item.id} className="synth-fx-card">
                    <div className="synth-fx-card-header">
                      <span className="synth-fx-card-index">{index + 1}</span>
                      <select
                        className="synth-fx-select synth-fx-card-select"
                        value={item.fxKey}
                        onChange={(e) => handleFxKeyChange(item.id, e.target.value)}
                      >
                        {SYNTH_FX_LIST.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                      <button
                        className="synth-fx-remove-btn"
                        onClick={() => handleRemoveFx(item.id)}
                        title="Remove FX"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Mix slider */}
                    <div className="synth-fx-slider-row">
                      <span className="synth-fx-param-label">Mix</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={item.mix}
                        onChange={(e) => handleFxMixChange(item.id, parseFloat(e.target.value))}
                        className="synth-fx-slider"
                      />
                      <span className="synth-fx-param-val">{item.mix.toFixed(2)}</span>
                    </div>

                    {/* Per-FX param sliders */}
                    {fxDef?.params.map((p) => {
                      const val = item.params[p.key] ?? p.default
                      return (
                        <div key={p.key} className="synth-fx-slider-row">
                          <span className="synth-fx-param-label">{p.label}</span>
                          <input
                            type="range"
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            value={val}
                            onChange={(e) =>
                              handleFxParamChange(item.id, p.key, parseFloat(e.target.value))
                            }
                            className="synth-fx-slider"
                          />
                          <span className="synth-fx-param-val">
                            {p.step < 1 ? val.toFixed(2) : String(Math.round(val))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom panel: snippet + copy ── */}
      <div className="synth-fx-bottom">
        <pre className="synth-fx-snippet">{snippet}</pre>
        <button className="synth-fx-copy-btn" onClick={handleCopy}>
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
    </div>
  )
}
