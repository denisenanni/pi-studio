import { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { Player, start as toneStart } from 'tone'
import { ALL_LOOPS } from '../data/loopDurations'
import type { LoopInfo } from '../data/loopDurations'

// ── Types ──────────────────────────────────────────────────────

type ToolsSubTab = 'bpm' | 'notes' | 'loops'
type BpmMode = 'bpm-to-sleep' | 'sleep-to-duration'

interface RhythmicValue {
  label: string
  beats: number
}

interface NoteRow {
  midi: number
  name: string   // e.g. ":c4"
  alias: string  // e.g. ":db4" (flat alias for sharps, empty otherwise)
  freq: number
}

// ── Constants ──────────────────────────────────────────────────

const RHYTHMIC_VALUES: RhythmicValue[] = [
  { label: '1/16', beats: 0.25 },
  { label: '1/8',  beats: 0.5 },
  { label: '1/4',  beats: 1 },
  { label: '1/3',  beats: 4 / 3 },
  { label: '1/2',  beats: 2 },
  { label: '2/3',  beats: 8 / 3 },
  { label: '3/4',  beats: 3 },
  { label: '1',    beats: 4 },
  { label: '2',    beats: 8 },
  { label: '3',    beats: 12 },
  { label: '4',    beats: 16 },
]

// Sonic Pi note names (sharps form, index = semitone within octave)
const NOTE_NAMES = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']
// Flat aliases for sharps: cs→db, ds→eb, fs→gb, gs→ab, as→bb
const FLAT_ALIASES: Record<string, string> = {
  cs: 'db', ds: 'eb', fs: 'gb', gs: 'ab', as: 'bb',
}

// ── Utilities ──────────────────────────────────────────────────

function calcSleep(bpm: number, beats: number): number {
  return (beats * 60) / bpm
}

function calcSeconds(bpm: number, sleepVal: number): number {
  return (sleepVal * 60) / bpm
}

function nearestRhythmic(bpm: number, sleepVal: number): RhythmicValue {
  const targetBeats = (sleepVal * bpm) / 60
  let best = RHYTHMIC_VALUES[0]
  let bestDiff = Math.abs(best.beats - targetBeats)
  for (const rv of RHYTHMIC_VALUES) {
    const diff = Math.abs(rv.beats - targetBeats)
    if (diff < bestDiff) { best = rv; bestDiff = diff }
  }
  return best
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function buildNoteTable(): NoteRow[] {
  const rows: NoteRow[] = []
  for (let midi = 0; midi <= 127; midi++) {
    const semitone = midi % 12
    const octave = Math.floor(midi / 12) - 1
    const noteName = NOTE_NAMES[semitone]
    const alias = FLAT_ALIASES[noteName] ? `:${FLAT_ALIASES[noteName]}${octave}` : ''
    rows.push({
      midi,
      name: `:${noteName}${octave}`,
      alias,
      freq: midiToFreq(midi),
    })
  }
  return rows
}

const ALL_NOTES: NoteRow[] = buildNoteTable()
const OCTAVES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

function formatSleep(n: number): string {
  // Up to 4 decimal places, trimming trailing zeros
  return parseFloat(n.toFixed(4)).toString()
}

function formatFreq(f: number): string {
  return f.toFixed(2)
}

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

// ── BPM Calculator ─────────────────────────────────────────────

interface BpmCalculatorProps {
  bpm: number
  onBpmChange: (v: number) => void
}

function BpmCalculator({ bpm, onBpmChange }: BpmCalculatorProps) {
  const [mode, setMode] = useState<BpmMode>('bpm-to-sleep')
  const [selectedDuration, setSelectedDuration] = useState<string>('1/4')
  const [customBeats, setCustomBeats] = useState<string>('')
  const [sleepInput, setSleepInput] = useState<string>('0.5')
  const [copiedA, setCopiedA] = useState(false)
  const [copiedB, setCopiedB] = useState(false)
  const copyTimerARef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerBRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerARef.current !== null) clearTimeout(copyTimerARef.current)
      if (copyTimerBRef.current !== null) clearTimeout(copyTimerBRef.current)
    }
  }, [])

  // Mode A derived values
  const modeABeats = useMemo<number>(() => {
    if (customBeats !== '') {
      const parsed = parseFloat(customBeats)
      return isNaN(parsed) || parsed <= 0 ? 1 : parsed
    }
    return RHYTHMIC_VALUES.find((r) => r.label === selectedDuration)?.beats ?? 1
  }, [selectedDuration, customBeats])

  const modeASleep = useMemo(() => calcSleep(bpm, modeABeats), [bpm, modeABeats])
  // calcSleep already returns wall-clock seconds — no second BPM division needed
  const modeASeconds = modeASleep
  const modeASnippet = `use_bpm ${bpm}\nsleep ${formatSleep(modeASleep)}`

  // Mode B derived values
  const modeBSleepVal = useMemo(() => {
    const v = parseFloat(sleepInput)
    return isNaN(v) || v < 0 ? 0 : v
  }, [sleepInput])
  const modeBSeconds = useMemo(() => calcSeconds(bpm, modeBSleepVal), [bpm, modeBSleepVal])
  const modeBNearest = useMemo(() => nearestRhythmic(bpm, modeBSleepVal), [bpm, modeBSleepVal])
  const modeBSnippet = `use_bpm ${bpm}\nsleep ${formatSleep(modeBSleepVal)}  # ≈ ${modeBNearest.label} note (${modeBSeconds.toFixed(3)}s)`

  const handleCopyA = useCallback(() => {
    void copyToClipboard(modeASnippet).then(() => {
      setCopiedA(true)
      if (copyTimerARef.current !== null) clearTimeout(copyTimerARef.current)
      copyTimerARef.current = setTimeout(() => setCopiedA(false), 1200)
    })
  }, [modeASnippet])

  const handleCopyB = useCallback(() => {
    void copyToClipboard(modeBSnippet).then(() => {
      setCopiedB(true)
      if (copyTimerBRef.current !== null) clearTimeout(copyTimerBRef.current)
      copyTimerBRef.current = setTimeout(() => setCopiedB(false), 1200)
    })
  }, [modeBSnippet])

  return (
    <div className="tools-section">
      {/* Mode toggle */}
      <div className="tools-mode-toggle">
        <button
          className={`tools-pill${mode === 'bpm-to-sleep' ? ' active' : ''}`}
          onClick={() => setMode('bpm-to-sleep')}
        >
          BPM → Sleep
        </button>
        <button
          className={`tools-pill${mode === 'sleep-to-duration' ? ' active' : ''}`}
          onClick={() => setMode('sleep-to-duration')}
        >
          Sleep → Duration
        </button>
      </div>

      {/* BPM input (shared) */}
      <div className="tools-field-row">
        <label className="tools-label">BPM</label>
        <input
          className="tools-number-input"
          type="number"
          min={1}
          max={300}
          step={1}
          value={bpm}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 1 && v <= 300) onBpmChange(v)
          }}
        />
      </div>

      {mode === 'bpm-to-sleep' ? (
        <>
          {/* Duration pills */}
          <div className="tools-field-row tools-field-wrap">
            <label className="tools-label">Duration</label>
            <div className="tools-pill-group">
              {RHYTHMIC_VALUES.map((rv) => (
                <button
                  key={rv.label}
                  className={`tools-pill${selectedDuration === rv.label && customBeats === '' ? ' active' : ''}`}
                  onClick={() => { setSelectedDuration(rv.label); setCustomBeats('') }}
                >
                  {rv.label}
                </button>
              ))}
              <input
                className="tools-number-input tools-custom-beats"
                type="number"
                min={0.001}
                step={0.001}
                placeholder="custom"
                value={customBeats}
                onChange={(e) => setCustomBeats(e.target.value)}
                onFocus={() => setSelectedDuration('')}
              />
            </div>
          </div>

          {/* Mode A output */}
          <div className="tools-output-block">
            <div className="tools-output-row">
              <span className="tools-output-label">sleep value</span>
              <span className="tools-output-big">{formatSleep(modeASleep)}</span>
            </div>
            <div className="tools-output-row">
              <span className="tools-output-label">seconds</span>
              <span className="tools-output-val">{modeASeconds.toFixed(3)}s</span>
            </div>
            <div className="tools-snippet-block">
              <pre className="tools-snippet">{modeASnippet}</pre>
              <button className="tools-copy-btn" onClick={handleCopyA}>
                {copiedA ? 'copied!' : 'copy'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Sleep input */}
          <div className="tools-field-row">
            <label className="tools-label">Sleep value</label>
            <input
              className="tools-number-input"
              type="number"
              min={0}
              step={0.001}
              value={sleepInput}
              onChange={(e) => setSleepInput(e.target.value)}
            />
          </div>

          {/* Mode B output */}
          <div className="tools-output-block">
            <div className="tools-output-row">
              <span className="tools-output-label">seconds</span>
              <span className="tools-output-big">{modeBSeconds.toFixed(3)}s</span>
            </div>
            <div className="tools-output-row">
              <span className="tools-output-label">nearest value</span>
              <span className="tools-output-val">≈ {modeBNearest.label} note at {bpm} BPM</span>
            </div>
            <div className="tools-snippet-block">
              <pre className="tools-snippet">{modeBSnippet}</pre>
              <button className="tools-copy-btn" onClick={handleCopyB}>
                {copiedB ? 'copied!' : 'copy'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Reference table */}
      <div className="tools-ref-table-wrapper">
        <div className="tools-ref-title">Reference table at {bpm} BPM</div>
        <table className="tools-ref-table">
          <thead>
            <tr>
              <th>Duration</th>
              <th>Beats</th>
              <th>Sleep</th>
              <th>Seconds</th>
            </tr>
          </thead>
          <tbody>
            {RHYTHMIC_VALUES.map((rv) => {
              const sl = calcSleep(bpm, rv.beats)
              const secs = sl
              return (
                <tr key={rv.label}>
                  <td>{rv.label} note</td>
                  <td>{parseFloat(rv.beats.toFixed(4))}</td>
                  <td>{formatSleep(sl)}</td>
                  <td>{secs.toFixed(3)}s</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Note Reference ─────────────────────────────────────────────

function NoteReference() {
  const [octave, setOctave] = useState(4)
  const [search, setSearch] = useState('')
  const [highlightedMidi, setHighlightedMidi] = useState<number | null>(null)
  const [copiedMidi, setCopiedMidi] = useState<number | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current) }
  }, [])

  const displayedNotes = useMemo<NoteRow[]>(() => {
    const q = search.trim().toLowerCase().replace(/^:/, '')
    if (q === '') {
      // Show selected octave — MIDI for octave N: semitones 0..11 starting at (N+1)*12
      const base = (octave + 1) * 12
      return ALL_NOTES.filter((n) => n.midi >= base && n.midi < base + 12)
    }
    // Filter by name (without colon), alias (without colon), MIDI, or frequency
    return ALL_NOTES.filter((n) => {
      const nameNoColon = n.name.slice(1)
      if (nameNoColon.includes(q)) return true
      if (n.alias && n.alias.slice(1).includes(q)) return true
      if (String(n.midi).includes(q)) return true
      if (formatFreq(n.freq).includes(q)) return true
      return false
    })
  }, [search, octave])

  const highlighted = useMemo(
    () => highlightedMidi !== null ? ALL_NOTES.find((n) => n.midi === highlightedMidi) ?? null : null,
    [highlightedMidi],
  )

  const handleCopyRow = useCallback((row: NoteRow) => {
    const snippet = `play ${row.name}`
    void copyToClipboard(snippet).then(() => {
      setCopiedMidi(row.midi)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedMidi(null), 1200)
    })
  }, [])

  return (
    <div className="tools-section">
      {/* Search + octave */}
      <div className="tools-note-controls">
        <input
          className="tools-note-search"
          type="text"
          placeholder="search note, MIDI, or freq…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tools-pill-group">
          {OCTAVES.map((o) => (
            <button
              key={o}
              className={`tools-pill${octave === o && search === '' ? ' active' : ''}`}
              onClick={() => { setOctave(o); setSearch('') }}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Note table */}
      <div className="tools-note-table-wrapper">
        <table className="tools-note-table">
          <thead>
            <tr>
              <th>Note</th>
              <th>Alias</th>
              <th>MIDI</th>
              <th>Frequency</th>
              <th>Code</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {displayedNotes.map((row) => (
              <tr
                key={row.midi}
                className={highlightedMidi === row.midi ? 'tools-note-row highlighted' : 'tools-note-row'}
                onClick={() => setHighlightedMidi(row.midi === highlightedMidi ? null : row.midi)}
              >
                <td className="tools-note-name">{row.name}</td>
                <td className="tools-note-alias">{row.alias}</td>
                <td>{row.midi}</td>
                <td>{formatFreq(row.freq)} Hz</td>
                <td><code>play {row.name}</code></td>
                <td>
                  <button
                    className="tools-copy-btn tools-copy-row"
                    onClick={(e) => { e.stopPropagation(); handleCopyRow(row) }}
                  >
                    {copiedMidi === row.midi ? 'copied!' : 'copy'}
                  </button>
                </td>
              </tr>
            ))}
            {displayedNotes.length === 0 && (
              <tr>
                <td colSpan={6} className="tools-note-empty">no notes match</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Highlighted note info */}
      {highlighted && (
        <div className="tools-note-info">
          <span className="tools-output-big">{highlighted.name}</span>
          {highlighted.alias && <span className="tools-note-alias-inline"> / {highlighted.alias}</span>}
          <span className="tools-note-detail"> MIDI {highlighted.midi} · {formatFreq(highlighted.freq)} Hz</span>
        </div>
      )}
    </div>
  )
}

// ── Loop Sync ──────────────────────────────────────────────────

function calcRate(loop: LoopInfo, targetBpm: number): number {
  if (loop.isAmbient) return 1
  return targetBpm / loop.originalBpm
}

function buildLoopSnippet(loop: LoopInfo, targetBpm: number): string {
  if (loop.isAmbient) {
    return `use_bpm ${targetBpm}\nlive_loop :beat do\n  sample :${loop.name}\n  sleep sample_duration(:${loop.name})\nend`
  }
  const rate = calcRate(loop, targetBpm)
  const rateStr = rate.toFixed(3)
  return `use_bpm ${targetBpm}\nlive_loop :beat do\n  sample :${loop.name}, rate: ${rateStr}\n  sleep sample_duration(:${loop.name}, rate: ${rateStr})\nend`
}

const AMBIENT_TITLE = 'Ambient loop — no fixed tempo'

function LoopSync() {
  const [targetBpm, setTargetBpm] = useState(120)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [copiedName, setCopiedName] = useState<string | null>(null)
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [playingName, setPlayingName] = useState<string | null>(null)

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playerRef = useRef<Player | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)
  // Always-current ref so onload closures read the BPM at playback start, not at click time
  const targetBpmRef = useRef(targetBpm)
  useLayoutEffect(() => { targetBpmRef.current = targetBpm })

  // Dispose the player and clear state
  const stopPreview = useCallback(() => {
    cancelRef.current?.()
    cancelRef.current = null
    if (playerRef.current) {
      playerRef.current.stop()
      playerRef.current.dispose()
      playerRef.current = null
    }
    setPlayingName(null)
  }, [])

  // Update playback rate live when BPM changes while a loop is playing
  useEffect(() => {
    if (playingName === null || playerRef.current === null) return
    const loop = ALL_LOOPS.find((l) => l.name === playingName)
    if (!loop) return
    playerRef.current.playbackRate = calcRate(loop, targetBpm)
  }, [targetBpm, playingName])

  // Pre-compute rates for all rows so the map doesn't recompute on every render
  const loopRates = useMemo(
    () => Object.fromEntries(ALL_LOOPS.map((l) => [l.name, calcRate(l, targetBpm)])),
    [targetBpm],
  )

  // Clean up player and timers on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      cancelRef.current?.()
      if (playerRef.current) { playerRef.current.stop(); playerRef.current.dispose() }
    }
  }, [])

  const handlePreview = useCallback((loop: LoopInfo, e: React.MouseEvent) => {
    e.stopPropagation()

    // Unlock AudioContext synchronously while inside the user gesture
    void toneStart()

    // stopPreview unconditionally cancels any in-flight load and disposes current player
    stopPreview()

    // Toggle off if same row was playing
    if (playingName === loop.name) return

    let cancelled = false
    cancelRef.current = () => { cancelled = true }

    const url = `${import.meta.env.BASE_URL}samples/${loop.name}.flac`
    const player = new Player({
      url,
      loop: true,
      onload: () => {
        if (cancelled) return
        // Read targetBpmRef so we get the BPM current at load time, not at click time
        player.playbackRate = calcRate(loop, targetBpmRef.current)
        player.start()
      },
    }).toDestination()

    playerRef.current = player
    setPlayingName(loop.name)
  }, [playingName, stopPreview])

  const selectedLoop = useMemo(
    () => selectedName !== null ? ALL_LOOPS.find((l) => l.name === selectedName) ?? null : null,
    [selectedName],
  )

  const selectedSnippet = useMemo(
    () => selectedLoop ? buildLoopSnippet(selectedLoop, targetBpm) : null,
    [selectedLoop, targetBpm],
  )

  const handleCopyRow = useCallback((loop: LoopInfo, e: React.MouseEvent) => {
    e.stopPropagation()
    const snippet = buildLoopSnippet(loop, targetBpm)
    void copyToClipboard(snippet).then(() => {
      setCopiedName(loop.name)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedName(null), 1200)
    })
  }, [targetBpm])

  const handleCopySelected = useCallback(() => {
    if (!selectedSnippet) return
    void copyToClipboard(selectedSnippet).then(() => {
      if (selectedLoop) setCopiedName(selectedLoop.name)
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopiedName(null), 1200)
    })
  }, [selectedSnippet, selectedLoop])

  return (
    <div className="tools-section">
      {/* Controls */}
      <div className="tools-field-row">
        <label className="tools-label">Target BPM</label>
        <input
          className="tools-number-input"
          type="number"
          min={40}
          max={300}
          step={1}
          value={targetBpm}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 40 && v <= 300) setTargetBpm(v)
          }}
        />
      </div>

      {/* Loop table */}
      <div className="tools-note-table-wrapper">
        <table className="tools-loop-table">
          <thead>
            <tr>
              <th>Sample</th>
              <th>Duration</th>
              <th>Beats</th>
              <th>Est. BPM</th>
              <th>Rate</th>
              <th>Sleep</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ALL_LOOPS.map((loop) => {
              const rate = loopRates[loop.name]
              return (
                <tr
                  key={loop.name}
                  className={`tools-note-row${selectedName === loop.name ? ' highlighted' : ''}`}
                  onClick={() => setSelectedName(loop.name === selectedName ? null : loop.name)}
                >
                  <td className="tools-note-name">:{loop.name}</td>
                  <td>{loop.duration.toFixed(3)}s</td>
                  {loop.isAmbient ? (
                    <>
                      <td title={AMBIENT_TITLE}>~</td>
                      <td title={AMBIENT_TITLE}>~</td>
                      <td title={AMBIENT_TITLE}>~</td>
                      <td title={AMBIENT_TITLE}>~</td>
                    </>
                  ) : (
                    <>
                      <td>{loop.beats}</td>
                      <td>{loop.originalBpm} BPM</td>
                      <td className="tools-loop-rate">{rate.toFixed(3)}</td>
                      <td>{loop.beats}</td>
                    </>
                  )}
                  <td>
                    <button
                      className="tools-copy-btn tools-copy-row"
                      aria-label={copiedName === loop.name ? 'Copied' : `Copy snippet for ${loop.name}`}
                      onClick={(e) => handleCopyRow(loop, e)}
                    >
                      {copiedName === loop.name ? 'copied!' : 'copy'}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`tools-preview-btn${playingName === loop.name ? ' active' : ''}`}
                      onClick={(e) => handlePreview(loop, e)}
                      title={playingName === loop.name ? 'Stop preview' : 'Play preview'}
                      aria-label={playingName === loop.name ? `Stop preview of ${loop.name}` : `Play preview of ${loop.name}`}
                    >
                      {playingName === loop.name ? '■' : '▶'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Selected loop detail */}
      {selectedSnippet && selectedLoop && (
        <div className="tools-output-block">
          <div className="tools-output-row">
            <span className="tools-output-label">:{selectedLoop.name}</span>
            <span className="tools-output-val">
              {selectedLoop.isAmbient
                ? 'Ambient loop — no fixed tempo'
                : `rate ${calcRate(selectedLoop, targetBpm).toFixed(3)} · ${selectedLoop.beats} beats`
              }
            </span>
          </div>
          <div className="tools-snippet-block">
            <pre className="tools-snippet">{selectedSnippet}</pre>
            <button className="tools-copy-btn" onClick={handleCopySelected}>
              {copiedName === selectedLoop.name ? 'copied!' : 'copy'}
            </button>
          </div>
        </div>
      )}

      {/* Formula reference */}
      <div className="tools-formula-block">
        <button
          className="tools-formula-toggle"
          onClick={() => setFormulaOpen((o) => !o)}
        >
          {formulaOpen ? '▾' : '▸'} Formula reference
        </button>
        {formulaOpen && (
          <div className="tools-formula-body">
            <pre className="tools-snippet">{`rate  = target_bpm / original_bpm
      = target_bpm / ((beats × 60) / duration)

sleep = sample_duration(:name, rate: rate)
        ← Sonic Pi computes this automatically`}</pre>
            <p className="tools-formula-note">
              Use the snippet as-is. Sonic Pi's <code>sample_duration</code> accounts for the
              rate so the loop plays in perfect sync with <code>use_bpm</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ToolsTab (root) ────────────────────────────────────────────

export function ToolsTab() {
  const [subTab, setSubTab] = useState<ToolsSubTab>('bpm')
  const [bpm, setBpm] = useState(120)

  return (
    <div className="tools-tab">
      {/* Sub-tab switcher */}
      <div className="tools-subtab-bar">
        <button
          className={`tools-subtab-pill${subTab === 'bpm' ? ' active' : ''}`}
          onClick={() => setSubTab('bpm')}
        >
          BPM Calculator
        </button>
        <button
          className={`tools-subtab-pill${subTab === 'notes' ? ' active' : ''}`}
          onClick={() => setSubTab('notes')}
        >
          Note Reference
        </button>
        <button
          className={`tools-subtab-pill${subTab === 'loops' ? ' active' : ''}`}
          onClick={() => setSubTab('loops')}
        >
          Loop Sync
        </button>
      </div>

      <div className="tools-content">
        {subTab === 'bpm'
          ? <BpmCalculator bpm={bpm} onBpmChange={setBpm} />
          : subTab === 'notes'
            ? <NoteReference />
            : <LoopSync />
        }
      </div>
    </div>
  )
}
