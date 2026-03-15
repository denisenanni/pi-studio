import { useRef } from 'react'
import type { StudioLoop, StudioNote } from './types'

interface DetailPanelProps {
  loop: StudioLoop | null
  scaleLock: boolean
  scaleName: string
  onScaleLockToggle: () => void
  onScaleNameChange: (name: string) => void
  onSynthChange: (synth: string) => void
  onFxChange: (fx: string) => void
  onStepsChange: (steps: number) => void
}

// MIDI note → display name + key type
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]) // semitone indices

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}${octave}`
}

function isBlackKey(midi: number): boolean {
  return BLACK_KEYS.has(midi % 12)
}

// Piano roll: show octaves 3–6, top to bottom (high → low)
const ROLL_MIDI_TOP = 84  // C6
const ROLL_MIDI_BOTTOM = 48 // C3
const ROLL_NOTE_COUNT = ROLL_MIDI_TOP - ROLL_MIDI_BOTTOM + 1
const STEP_WIDTH = 32  // px per step

const SYNTH_OPTIONS = ['prophet', 'tb303', 'dsaw', 'blade', 'beep']
const FX_OPTIONS = ['none', 'reverb', 'echo', 'distortion']
const STEPS_OPTIONS = [4, 8, 16, 32] as const
const SCALE_OPTIONS = ['major', 'minor', 'dorian', 'pentatonic', 'chromatic']

export function DetailPanel({
  loop, scaleLock, scaleName,
  onScaleLockToggle, onScaleNameChange,
  onSynthChange, onFxChange, onStepsChange,
}: DetailPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const steps = loop?.steps ?? 16
  const notes = loop?.notes ?? []
  const gridWidth = steps * STEP_WIDTH

  // Scroll piano roll to center on octave 4 on mount
  const handleRollRef = (el: HTMLDivElement | null) => {
    scrollRef.current = el
    if (el && el.scrollTop === 0) {
      // C4 = midi 60 → row index from top = ROLL_MIDI_TOP - 60 = 24
      const c4Row = ROLL_MIDI_TOP - 60
      el.scrollTop = c4Row * 16 - el.clientHeight / 2
    }
  }

  return (
    <div className="studio-detail-panel">
      {/* Header */}
      <div className="studio-detail-header">
        <span className="studio-detail-loop-name">
          {loop ? `:${loop.name}` : '—'}
        </span>

        <span className="studio-detail-divider">|</span>

        <span className="studio-detail-label">SYNTH</span>
        <select
          className="studio-detail-select"
          value={loop?.synth ?? 'prophet'}
          onChange={(e) => onSynthChange(e.target.value)}
          disabled={!loop || loop.type === 'sample'}
        >
          {SYNTH_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <span className="studio-detail-label">FX</span>
        <select
          className="studio-detail-select"
          value={loop?.fx ?? 'none'}
          onChange={(e) => onFxChange(e.target.value)}
          disabled={!loop}
        >
          {FX_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        <span className="studio-detail-label">STEPS</span>
        <select
          className="studio-detail-select"
          value={loop?.steps ?? 16}
          onChange={(e) => onStepsChange(Number(e.target.value))}
          disabled={!loop}
        >
          {STEPS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        <span className="studio-detail-divider">|</span>

        {/* Scale lock */}
        <div className="studio-scale-lock">
          <span className="studio-detail-label">SCALE LOCK</span>
          <button
            className={`studio-scale-lock-toggle${scaleLock ? ' on' : ''}`}
            onClick={onScaleLockToggle}
            title={scaleLock ? 'Disable scale lock' : 'Enable scale lock'}
            aria-pressed={scaleLock}
          />
          {scaleLock && (
            <select
              className="studio-detail-select"
              value={scaleName}
              onChange={(e) => onScaleNameChange(e.target.value)}
            >
              {SCALE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        <span className="studio-detail-hint">click to add note</span>
      </div>

      {/* Piano roll */}
      <div className="studio-piano-roll">
        {/* Note labels */}
        <div className="studio-note-labels">
          {Array.from({ length: ROLL_NOTE_COUNT }, (_, i) => {
            const midi = ROLL_MIDI_TOP - i
            const black = isBlackKey(midi)
            return (
              <div
                key={midi}
                className={`studio-note-row-label${black ? ' black-key' : ' white-key'}`}
              >
                {NOTE_NAMES[midi % 12] === 'C' || NOTE_NAMES[midi % 12] === 'F'
                  ? midiToName(midi)
                  : NOTE_NAMES[midi % 12]}
              </div>
            )
          })}
        </div>

        {/* Grid */}
        <div className="studio-roll-grid-wrapper" ref={handleRollRef}>
          <div className="studio-roll-grid" style={{ width: gridWidth, minHeight: ROLL_NOTE_COUNT * 16 }}>
            {Array.from({ length: ROLL_NOTE_COUNT }, (_, i) => {
              const midi = ROLL_MIDI_TOP - i
              const black = isBlackKey(midi)
              return (
                <div
                  key={midi}
                  className={`studio-roll-row${black ? ' black-key' : ''}`}
                  style={{ width: gridWidth }}
                >
                  {Array.from({ length: steps }, (_, s) => (
                    <div
                      key={s}
                      className={`studio-roll-cell${s % 4 === 0 ? ' beat-marker' : ''}`}
                      style={{ width: STEP_WIDTH }}
                    />
                  ))}
                </div>
              )
            })}

            {/* Note blocks */}
            {notes.map((note) => (
              <NoteBlock key={note.id} note={note} />
            ))}
          </div>
        </div>
      </div>

      {/* Velocity lane */}
      <VelocityLane notes={notes} steps={steps} />
    </div>
  )
}

// ── Note block ──────────────────────────────────────────────

interface NoteBlockProps {
  note: StudioNote
}

function NoteBlock({ note }: NoteBlockProps) {
  const rowIndex = ROLL_MIDI_TOP - note.note
  if (rowIndex < 0 || rowIndex >= ROLL_NOTE_COUNT) return null

  const top = rowIndex * 16
  const left = note.step * STEP_WIDTH
  const width = note.duration * STEP_WIDTH - 2

  return (
    <div
      className="studio-note-block"
      style={{ top, left, width }}
      title={`${midiToName(note.note)} step ${note.step + 1}`}
    >
      {width >= 24 ? midiToName(note.note) : ''}
    </div>
  )
}

// ── Velocity lane ───────────────────────────────────────────

interface VelocityLaneProps {
  notes: StudioNote[]
  steps: number
}

function VelocityLane({ notes, steps }: VelocityLaneProps) {
  const maxH = 36 // px for velocity = 1
  const laneWidth = steps * STEP_WIDTH
  return (
    <div className="studio-velocity-lane" style={{ position: 'relative', width: laneWidth + 40 }}>
      <span className="studio-vel-label">VEL</span>
      {notes.map((note) => (
        <div
          key={note.id}
          className="studio-vel-bar-wrap"
          style={{ position: 'absolute', left: 40 + note.step * STEP_WIDTH, width: STEP_WIDTH }}
        >
          <div
            className="studio-vel-bar"
            style={{ width: STEP_WIDTH - 4, height: Math.round(note.velocity * maxH) }}
            title={`Velocity ${Math.round(note.velocity * 127)}`}
          />
        </div>
      ))}
    </div>
  )
}
