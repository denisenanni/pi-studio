import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface TransportProps {
  bpm: number
  onBpmChange: (bpm: number) => void
  timeSignature: [number, number]
  onTimeSignatureChange: (ts: [number, number]) => void
  isPlaying: boolean
  onPlay: () => void
  onStop: () => void
  currentBar: number
  currentStep: number
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  waveCollapsed: boolean
  onToggleWave: () => void
}

const TAP_RESET_MS = 2000
const MIN_TAPS = 3

export function Transport({
  bpm, onBpmChange,
  timeSignature, onTimeSignatureChange,
  isPlaying, onPlay, onStop,
  currentBar, currentStep,
  canUndo, canRedo, onUndo, onRedo,
  onExport,
  waveCollapsed, onToggleWave,
}: TransportProps) {
  const [editingBpm, setEditingBpm] = useState(false)
  const [bpmDraft, setBpmDraft] = useState(String(bpm))
  const tapTimesRef = useRef<number[]>([])
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tapActive, setTapActive] = useState(false)

  // Clean up tap reset timer on unmount
  useEffect(() => {
    return () => {
      if (tapResetTimerRef.current !== null) clearTimeout(tapResetTimerRef.current)
    }
  }, [])

  const commitBpm = useCallback(() => {
    const v = parseInt(bpmDraft, 10)
    if (!isNaN(v) && v >= 20 && v <= 300) onBpmChange(v)
    else setBpmDraft(String(bpm))
    setEditingBpm(false)
  }, [bpmDraft, bpm, onBpmChange])

  const handleTap = useCallback(() => {
    const now = Date.now()
    tapTimesRef.current.push(now)

    // Reset timer
    if (tapResetTimerRef.current !== null) clearTimeout(tapResetTimerRef.current)
    tapResetTimerRef.current = setTimeout(() => {
      tapTimesRef.current = []
      setTapActive(false)
    }, TAP_RESET_MS)

    if (tapTimesRef.current.length < MIN_TAPS) {
      setTapActive(true)
      return
    }

    // Compute average interval from last N taps
    const times = tapTimesRef.current
    const intervals: number[] = []
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1])
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const newBpm = Math.round(60000 / avg)
    if (newBpm >= 20 && newBpm <= 300) {
      onBpmChange(newBpm)
      setBpmDraft(String(newBpm))
    }
    setTapActive(true)
  }, [onBpmChange])

  return (
    <div className="studio-transport">
      <Link className="studio-transport-logo" to="/" title="Pi Studio home">π</Link>
      <span className="studio-transport-label">STUDIO</span>
      <span className="studio-transport-divider">|</span>

      {/* BPM */}
      <div className="studio-transport-bpm-group">
        <span className="studio-transport-bpm-label">BPM</span>
        {editingBpm ? (
          <input
            className="studio-transport-bpm-input"
            type="number"
            value={bpmDraft}
            min={20}
            max={300}
            autoFocus
            onChange={(e) => setBpmDraft(e.target.value)}
            onBlur={commitBpm}
            onKeyDown={(e) => { if (e.key === 'Enter') commitBpm(); if (e.key === 'Escape') setEditingBpm(false) }}
          />
        ) : (
          <span
            className="studio-transport-bpm-value"
            role="button"
            tabIndex={0}
            onClick={() => { setEditingBpm(true); setBpmDraft(String(bpm)) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setEditingBpm(true)
                setBpmDraft(String(bpm))
              }
            }}
            title="Click to edit BPM"
          >
            {bpm}
          </span>
        )}
      </div>

      {/* Tap tempo */}
      <button
        className={`studio-transport-tap${tapActive ? ' active' : ''}`}
        onClick={handleTap}
        title="Tap to set BPM"
      >
        TAP
      </button>

      <span className="studio-transport-divider">|</span>

      {/* Time signature */}
      <div className="studio-timesig">
        <input
          className="studio-timesig-input"
          type="number"
          min={2}
          max={12}
          value={timeSignature[0]}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 2 && v <= 12) onTimeSignatureChange([v, timeSignature[1]])
          }}
        />
        <span>/</span>
        <input
          className="studio-timesig-input"
          type="number"
          min={2}
          max={16}
          value={timeSignature[1]}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v) && v >= 2 && v <= 16) onTimeSignatureChange([timeSignature[0], v])
          }}
        />
      </div>

      <span className="studio-transport-divider">|</span>

      {/* Play / Stop */}
      <button className="studio-transport-play" onClick={isPlaying ? onStop : onPlay}>
        {isPlaying ? '■ Stop' : '▶ Play'}
      </button>
      <button className="studio-transport-stop" onClick={onStop} disabled={!isPlaying}>
        ■
      </button>

      {/* Bar counter */}
      <span className="studio-bar-counter">
        bar {currentBar} · beat {currentStep}
      </span>

      <div className="studio-spacer" />

      {/* Waveform toggle (shown when waveform is collapsed) */}
      {waveCollapsed && (
        <button className="studio-wave-toggle-transport" onClick={onToggleWave} title="Show waveform">
          ∿
        </button>
      )}

      {/* Undo / Redo */}
      <button
        className="studio-transport-icon-btn"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
      >
        ↩
      </button>
      <button
        className="studio-transport-icon-btn"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
      >
        ↪
      </button>

      {/* Export */}
      <button className="studio-transport-export" onClick={onExport} title="Export .rb file">
        EXPORT .rb
      </button>
    </div>
  )
}
