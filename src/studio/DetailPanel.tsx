import { useRef, useState, useCallback, useMemo, useEffect, memo } from 'react'
import type { StudioLoop, StudioNote } from './types'
import { SCALES } from '../data/scales'
import { SYNTHS } from '../data/synths'
import { SYNTH_FX_LIST } from '../data/synthFx'
import { SAMPLE_GROUPS } from '../data/samples'

// ── Constants ────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const BLACK_KEYS = new Set([1, 3, 6, 8, 10])

const ROLL_MIDI_TOP    = 84   // C6
const ROLL_MIDI_BOTTOM = 48   // C3
const ROLL_NOTE_COUNT  = ROLL_MIDI_TOP - ROLL_MIDI_BOTTOM + 1
const STEP_WIDTH       = 32   // px per step
const SAMPLE_BTN_SIZE  = 32   // px per sample step button
const CELL_HEIGHT      = 16   // px per MIDI row
const VEL_MAX_H        = 40   // px when velocity = 1
const RESIZE_HANDLE_W  = 6    // px — right-edge resize zone

const STEPS_OPTIONS  = [4, 8, 16, 32] as const
const SCALE_OPTIONS  = ['major', 'minor', 'dorian', 'pentatonic', 'chromatic'] as const

// ── Helpers ──────────────────────────────────────────────────────────────────

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[midi % 12]}${octave}`
}

function isBlackKey(midi: number): boolean {
  return BLACK_KEYS.has(midi % 12)
}

function rootToIndex(root: string): number {
  const idx = NOTE_NAMES.indexOf(root as typeof NOTE_NAMES[number])
  return idx >= 0 ? idx : 0
}

function getScalePitchClasses(scaleName: string): Set<number> {
  const scale = SCALES.find((s) => s.name === scaleName)
  if (!scale) return new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  const classes = new Set<number>([0])
  let cur = 0
  for (const step of scale.steps) {
    cur = (cur + step) % 12
    classes.add(cur)
  }
  return classes
}

function midiInScale(midi: number, rootIdx: number, classes: Set<number>): boolean {
  return classes.has(((midi - rootIdx) % 12 + 12) % 12)
}

function snapToScale(midi: number, rootIdx: number, classes: Set<number>): number {
  if (midiInScale(midi, rootIdx, classes)) return midi
  for (let d = 1; d <= 6; d++) {
    if (midi + d <= ROLL_MIDI_TOP && midiInScale(midi + d, rootIdx, classes)) return midi + d
    if (midi - d >= ROLL_MIDI_BOTTOM && midiInScale(midi - d, rootIdx, classes)) return midi - d
  }
  return midi
}

// ── Types ────────────────────────────────────────────────────────────────────

type DragMode =
  | { type: 'none' }
  | {
      type: 'move'
      noteId: string
      loopId: string
      startStep: number
      startMidi: number
      startDuration: number
      loopSteps: number
      mouseStartX: number
      mouseStartY: number
    }
  | {
      type: 'resize'
      noteId: string
      loopId: string
      noteStep: number
      noteMidi: number
      startDuration: number
      loopSteps: number
      mouseStartX: number
    }
  | {
      type: 'velocity'
      noteId: string
      loopId: string
      mouseStartY: number
      startVelocity: number
      currentVelocity: number
    }

type DragPreview = {
  noteId: string
  step: number
  midi: number
  duration: number
}

interface DetailPanelProps {
  loop: StudioLoop | null
  scaleLock: boolean
  scaleName: string
  scaleRoot: string
  selectedNoteId: string | null
  currentStep: number
  isPlaying: boolean
  onScaleLockToggle: () => void
  onScaleNameChange: (name: string) => void
  onSynthChange: (synth: string) => void
  onFxChange: (fx: string) => void
  onStepsChange: (steps: number) => void
  onToggleStep: (loopId: string, step: number) => void
  onSetLoopSample: (loopId: string, sample: string) => void
  onAddNote: (loopId: string, note: StudioNote) => void
  onDeleteNote: (loopId: string, noteId: string) => void
  onMoveNote: (loopId: string, noteId: string, step: number, midiNote: number) => void
  onResizeNote: (loopId: string, noteId: string, duration: number) => void
  onSetVelocity: (loopId: string, noteId: string, velocity: number) => void
  onSelectNote: (noteId: string | null) => void
}

// ── DetailPanel ──────────────────────────────────────────────────────────────

export function DetailPanel({
  loop, scaleLock, scaleName, scaleRoot, selectedNoteId, currentStep, isPlaying,
  onScaleLockToggle, onScaleNameChange,
  onSynthChange, onFxChange, onStepsChange, onToggleStep, onSetLoopSample,
  onAddNote, onDeleteNote, onMoveNote, onResizeNote, onSetVelocity, onSelectNote,
}: DetailPanelProps) {
  const scrollRef       = useRef<HTMLDivElement | null>(null)
  const dragRef         = useRef<DragMode>({ type: 'none' })
  const cancelDragRef   = useRef<(() => void) | null>(null)
  const velBarRefs      = useRef<Map<string, HTMLDivElement>>(new Map())
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)

  const steps     = loop?.steps ?? 16
  const notes     = loop?.notes ?? []
  const gridWidth = steps * STEP_WIDTH
  const rootIdx   = rootToIndex(scaleRoot)

  const scaleClasses = useMemo(
    () => scaleLock ? getScalePitchClasses(scaleName) : new Set<number>(),
    [scaleLock, scaleName],
  )

  // Remove dangling window listeners if component unmounts mid-drag
  useEffect(() => () => { cancelDragRef.current?.() }, [])

  // ── Scroll to C4 on mount ────────────────────────────────
  // Stable callback (empty deps) so React only calls it when the element
  // mounts/unmounts — not on every re-render.
  const handleRollRef = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el
    if (el) {
      const c4Row = ROLL_MIDI_TOP - 60
      el.scrollTop = c4Row * CELL_HEIGHT - el.clientHeight / 2
    }
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (dragRef.current.type !== 'none') {
        cancelDragRef.current?.()
      } else {
        onSelectNote(null)
      }
      return
    }
    if (!loop || !selectedNoteId) return
    const note = notes.find((n) => n.id === selectedNoteId)
    if (!note) return

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onDeleteNote(loop.id, note.id)
      onSelectNote(null)
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const s = Math.max(0, note.step - 1)
      if (s !== note.step) onMoveNote(loop.id, note.id, s, note.note)
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const s = Math.min(steps - 1, note.step + 1)
      if (s !== note.step) onMoveNote(loop.id, note.id, s, note.note)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      let m = Math.min(ROLL_MIDI_TOP, note.note + 1)
      if (scaleLock) m = snapToScale(m, rootIdx, scaleClasses)
      if (m !== note.note) onMoveNote(loop.id, note.id, note.step, m)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      let m = Math.max(ROLL_MIDI_BOTTOM, note.note - 1)
      if (scaleLock) m = snapToScale(m, rootIdx, scaleClasses)
      if (m !== note.note) onMoveNote(loop.id, note.id, note.step, m)
      return
    }
  }, [loop, selectedNoteId, notes, steps, scaleLock, rootIdx, scaleClasses,
      onDeleteNote, onMoveNote, onSelectNote])

  // ── Grid: click empty cell to add note ───────────────────
  const handleGridMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('.studio-note-block')) return
    if (!loop) return

    const rect  = e.currentTarget.getBoundingClientRect()
    const step  = Math.floor((e.clientX - rect.left)  / STEP_WIDTH)
    const row   = Math.floor((e.clientY - rect.top)   / CELL_HEIGHT)
    const midi  = ROLL_MIDI_TOP - row

    if (step < 0 || step >= steps || midi < ROLL_MIDI_BOTTOM || midi > ROLL_MIDI_TOP) return
    if (scaleLock && !midiInScale(midi, rootIdx, scaleClasses)) return

    const note: StudioNote = {
      id: crypto.randomUUID(),
      step,
      duration: 1,
      note: midi,
      velocity: 0.8,
      params: {},
    }
    onAddNote(loop.id, note)
    onSelectNote(note.id)
  }, [loop, steps, scaleLock, rootIdx, scaleClasses, onAddNote, onSelectNote])

  // ── Note: right-click deletes ─────────────────────────────
  const handleNoteContextMenu = useCallback((e: React.MouseEvent, note: StudioNote) => {
    e.preventDefault()
    e.stopPropagation()
    if (!loop) return
    onDeleteNote(loop.id, note.id)
    if (selectedNoteId === note.id) onSelectNote(null)
  }, [loop, selectedNoteId, onDeleteNote, onSelectNote])

  // ── Note: mousedown → select + start move/resize drag ────
  const handleNoteMouseDown = useCallback((e: React.MouseEvent, note: StudioNote) => {
    e.stopPropagation()
    if (e.button !== 0) return
    if (!loop) return

    onSelectNote(note.id)

    const noteRect = e.currentTarget.getBoundingClientRect()
    const xInNote  = e.clientX - noteRect.left
    const isResize = xInNote >= noteRect.width - RESIZE_HANDLE_W

    // Capture loop-level values for the drag closure
    const loopId    = loop.id
    const loopSteps = loop.steps

    if (isResize) {
      dragRef.current = {
        type: 'resize',
        noteId:        note.id,
        loopId,
        noteStep:      note.step,
        noteMidi:      note.note,
        startDuration: note.duration,
        loopSteps,
        mouseStartX:   e.clientX,
      }
    } else {
      dragRef.current = {
        type: 'move',
        noteId:        note.id,
        loopId,
        startStep:     note.step,
        startMidi:     note.note,
        startDuration: note.duration,
        loopSteps,
        mouseStartX:   e.clientX,
        mouseStartY:   e.clientY,
      }
    }

    setDragPreview({ noteId: note.id, step: note.step, midi: note.note, duration: note.duration })

    // Capture scale state for the drag closure (snapping values are stable for the drag duration)
    const snapLock    = scaleLock
    const snapRootIdx = rootIdx
    const snapClasses = scaleClasses

    function onMove(ev: MouseEvent) {
      const drag = dragRef.current
      if (drag.type === 'move') {
        const dStep = Math.round((ev.clientX - drag.mouseStartX) / STEP_WIDTH)
        const dMidi = -Math.round((ev.clientY - drag.mouseStartY) / CELL_HEIGHT)
        let newStep = Math.max(0, Math.min(drag.loopSteps - 1, drag.startStep + dStep))
        let newMidi = Math.max(ROLL_MIDI_BOTTOM, Math.min(ROLL_MIDI_TOP, drag.startMidi + dMidi))
        if (snapLock && dMidi !== 0) newMidi = snapToScale(newMidi, snapRootIdx, snapClasses)
        setDragPreview({ noteId: drag.noteId, step: newStep, midi: newMidi, duration: drag.startDuration })
      } else if (drag.type === 'resize') {
        const dStep  = Math.round((ev.clientX - drag.mouseStartX) / STEP_WIDTH)
        const maxDur = drag.loopSteps - drag.noteStep
        const newDur = Math.max(1, Math.min(maxDur, drag.startDuration + dStep))
        setDragPreview({ noteId: drag.noteId, step: drag.noteStep, midi: drag.noteMidi, duration: newDur })
      }
    }

    function onUp(ev: MouseEvent) {
      cleanup()
      const drag = dragRef.current
      if (drag.type === 'move') {
        const dStep = Math.round((ev.clientX - drag.mouseStartX) / STEP_WIDTH)
        const dMidi = -Math.round((ev.clientY - drag.mouseStartY) / CELL_HEIGHT)
        let newStep = Math.max(0, Math.min(drag.loopSteps - 1, drag.startStep + dStep))
        let newMidi = Math.max(ROLL_MIDI_BOTTOM, Math.min(ROLL_MIDI_TOP, drag.startMidi + dMidi))
        if (snapLock && dMidi !== 0) newMidi = snapToScale(newMidi, snapRootIdx, snapClasses)
        onMoveNote(loopId, drag.noteId, newStep, newMidi)
      } else if (drag.type === 'resize') {
        const dStep  = Math.round((ev.clientX - drag.mouseStartX) / STEP_WIDTH)
        const maxDur = drag.loopSteps - drag.noteStep
        const newDur = Math.max(1, Math.min(maxDur, drag.startDuration + dStep))
        onResizeNote(loopId, drag.noteId, newDur)
      }
      dragRef.current = { type: 'none' }
      setDragPreview(null)
    }

    function cleanup() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      cancelDragRef.current = null
    }

    cancelDragRef.current = () => {
      cleanup()
      dragRef.current = { type: 'none' }
      setDragPreview(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [loop, scaleLock, rootIdx, scaleClasses, onMoveNote, onResizeNote, onSelectNote])

  // ── Velocity: mousedown → drag (live DOM updates, commit on mouseup) ───────
  const handleVelMouseDown = useCallback((e: React.MouseEvent, note: StudioNote) => {
    e.stopPropagation()
    if (e.button !== 0) return
    if (!loop) return

    onSelectNote(note.id)

    const loopId       = loop.id
    const noteId       = note.id
    const origVelocity = note.velocity

    dragRef.current = {
      type:          'velocity',
      noteId,
      loopId,
      mouseStartY:   e.clientY,
      startVelocity: origVelocity,
      currentVelocity: origVelocity,
    }

    function onMove(ev: MouseEvent) {
      const drag = dragRef.current
      if (drag.type !== 'velocity') return
      const delta  = drag.mouseStartY - ev.clientY
      const newVel = Math.max(0, Math.min(1, drag.startVelocity + delta / VEL_MAX_H))
      // Mutate ref directly — no React re-render needed for live DOM update
      dragRef.current = { ...drag, currentVelocity: newVel }
      const barEl = velBarRefs.current.get(noteId)
      if (barEl) barEl.style.height = `${Math.round(newVel * VEL_MAX_H)}px`
    }

    function onUp() {
      const drag = dragRef.current
      cleanup()
      if (drag.type === 'velocity') onSetVelocity(drag.loopId, drag.noteId, drag.currentVelocity)
      dragRef.current = { type: 'none' }
    }

    function cleanup() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      cancelDragRef.current = null
    }

    cancelDragRef.current = () => {
      cleanup()
      dragRef.current = { type: 'none' }
      // Restore bar height to original value
      const barEl = velBarRefs.current.get(noteId)
      if (barEl) barEl.style.height = `${Math.round(origVelocity * VEL_MAX_H)}px`
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [loop, onSelectNote, onSetVelocity])

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="studio-detail-panel">

      {/* Header */}
      <div className="studio-detail-header">
        <span className="studio-detail-loop-name">
          {loop ? `:${loop.name}` : '—'}
        </span>

        <span className="studio-detail-divider">|</span>

        {(!loop || loop.type === 'synth') && (<>
          <span className="studio-detail-label">SYNTH</span>
          <select
            className="studio-detail-select"
            value={loop?.synth ?? 'beep'}
            onChange={(e) => onSynthChange(e.target.value)}
            disabled={!loop}
          >
            {SYNTHS.map((s) => <option key={s.name} value={s.name}>{s.label}</option>)}
          </select>

          <span className="studio-detail-label">FX</span>
          <select
            className="studio-detail-select"
            value={loop?.fx ?? 'none'}
            onChange={(e) => onFxChange(e.target.value)}
            disabled={!loop}
          >
            <option value="none">none</option>
            {SYNTH_FX_LIST.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </>)}

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

        <span className="studio-detail-hint">click · right-click to delete · drag to move</span>
      </div>

      {/* Sample loop view */}
      {loop?.type === 'sample' && (
        <SampleLoopView
          loop={loop}
          currentStep={currentStep}
          isPlaying={isPlaying}
          onToggleStep={onToggleStep}
          onSetLoopSample={onSetLoopSample}
        />
      )}

      {/* Piano roll + velocity lane (synth loops only) */}
      {(!loop || loop.type === 'synth') && <>
      <div
        className="studio-piano-roll"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Note labels */}
        <div className="studio-note-labels">
          {Array.from({ length: ROLL_NOTE_COUNT }, (_, i) => {
            const midi  = ROLL_MIDI_TOP - i
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

        {/* Scrollable grid */}
        <div className="studio-roll-grid-wrapper" ref={handleRollRef}>
          <div
            className="studio-roll-grid"
            style={{ width: gridWidth, minHeight: ROLL_NOTE_COUNT * CELL_HEIGHT }}
            onMouseDown={handleGridMouseDown}
          >
            {/* Row backgrounds */}
            {Array.from({ length: ROLL_NOTE_COUNT }, (_, i) => {
              const midi     = ROLL_MIDI_TOP - i
              const black    = isBlackKey(midi)
              const nonScale = scaleLock && !midiInScale(midi, rootIdx, scaleClasses)
              return (
                <div
                  key={midi}
                  className={
                    `studio-roll-row${black ? ' black-key' : ''}${nonScale ? ' non-scale' : ''}`
                  }
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
              <NoteBlock
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                dragPreview={dragPreview?.noteId === note.id ? dragPreview : null}
                onMouseDown={handleNoteMouseDown}
                onContextMenu={handleNoteContextMenu}
              />
            ))}

            {/* Playhead */}
            {isPlaying && (
              <div
                className="studio-roll-playhead"
                style={{ left: ((currentStep % steps) / steps) * gridWidth }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Velocity lane */}
      <VelocityLane
        notes={notes}
        steps={steps}
        selectedNoteId={selectedNoteId}
        velBarRefs={velBarRefs}
        onVelMouseDown={handleVelMouseDown}
      />
      </>}
    </div>
  )
}

// ── SampleLoopView ───────────────────────────────────────────────────────────

interface SampleLoopViewProps {
  loop: StudioLoop
  currentStep: number
  isPlaying: boolean
  onToggleStep: (loopId: string, step: number) => void
  onSetLoopSample: (loopId: string, sample: string) => void
}

function SampleLoopView({ loop, currentStep, isPlaying, onToggleStep, onSetLoopSample }: SampleLoopViewProps) {
  const playerRef   = useRef<{ dispose: () => void } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => () => { playerRef.current?.dispose() }, [])

  // Stop old preview when sample changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.dispose()
      playerRef.current = null
      setPreviewing(false)
    }
  }, [loop.sample])

  const handlePreview = useCallback(async () => {
    // Lazy-load Tone inside the user-gesture handler so the AudioContext is
    // only created here (not at module-import time).
    const Tone = await import('tone')
    if (Tone.getContext().state !== 'running') await Tone.start()
    if (playerRef.current) {
      playerRef.current.dispose()
      playerRef.current = null
      setPreviewing(false)
      return
    }
    const player = new Tone.Player({
      url: `${import.meta.env.BASE_URL}samples/${loop.sample}.flac`,
    }).toDestination()
    playerRef.current = player
    player.autostart = true
    player.onstop = () => setPreviewing(false)
    setPreviewing(true)
  }, [loop.sample])

  const steps     = loop.steps
  const gridWidth = steps * SAMPLE_BTN_SIZE

  return (
    <div className="studio-sample-view">
      <div className="studio-sample-step-grid" style={{ width: gridWidth }}>
        {Array.from({ length: steps }, (_, i) => {
          const active  = loop.activeSteps[i]
          const playing = isPlaying && (currentStep % steps) === i
          return (
            <button
              key={i}
              className={`studio-sample-step-btn${active ? ' active' : ''}${playing ? ' playing' : ''}`}
              onClick={() => onToggleStep(loop.id, i)}
              title={`Step ${i + 1}`}
            />
          )
        })}
      </div>

      <div className="studio-sample-controls">
        <select
          className="studio-detail-select"
          value={loop.sample}
          onChange={(e) => onSetLoopSample(loop.id, e.target.value)}
        >
          {SAMPLE_GROUPS.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.samples.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          className={`studio-sample-preview-btn${previewing ? ' active' : ''}`}
          onClick={() => { void handlePreview() }}
          title={previewing ? 'Stop preview' : 'Preview sample'}
        >
          {previewing ? '■' : '▶'}
        </button>
      </div>
    </div>
  )
}

// ── NoteBlock ────────────────────────────────────────────────────────────────

interface NoteBlockProps {
  note: StudioNote
  isSelected: boolean
  dragPreview: DragPreview | null
  onMouseDown: (e: React.MouseEvent, note: StudioNote) => void
  onContextMenu: (e: React.MouseEvent, note: StudioNote) => void
}

const NoteBlock = memo(function NoteBlock({ note, isSelected, dragPreview, onMouseDown, onContextMenu }: NoteBlockProps) {
  const step     = dragPreview ? dragPreview.step     : note.step
  const midi     = dragPreview ? dragPreview.midi     : note.note
  const duration = dragPreview ? dragPreview.duration : note.duration

  const rowIndex = ROLL_MIDI_TOP - midi
  if (rowIndex < 0 || rowIndex >= ROLL_NOTE_COUNT) return null

  const top   = rowIndex * CELL_HEIGHT + 1
  const left  = step * STEP_WIDTH
  const width = duration * STEP_WIDTH - 2

  const className =
    `studio-note-block${isSelected ? ' selected' : ''}${dragPreview ? ' dragging' : ''}`

  return (
    <div
      className={className}
      style={{ top, left, width }}
      title={`${midiToName(note.note)} step ${note.step + 1}`}
      onMouseDown={(e) => onMouseDown(e, note)}
      onContextMenu={(e) => onContextMenu(e, note)}
    >
      {width >= 24 ? midiToName(midi) : ''}
      {Object.keys(note.params).length > 0 && <span className="studio-note-param-dot" />}
      <div className="studio-note-block-resize-handle" />
    </div>
  )
})

// ── VelocityLane ─────────────────────────────────────────────────────────────

interface VelocityLaneProps {
  notes: StudioNote[]
  steps: number
  selectedNoteId: string | null
  velBarRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  onVelMouseDown: (e: React.MouseEvent, note: StudioNote) => void
}

const VelocityLane = memo(function VelocityLane({ notes, steps, selectedNoteId, velBarRefs, onVelMouseDown }: VelocityLaneProps) {
  const laneWidth = steps * STEP_WIDTH
  return (
    <div className="studio-velocity-lane" style={{ position: 'relative', width: laneWidth + 40 }}>
      <span className="studio-vel-label">VEL</span>
      {notes.map((note) => (
        <div
          key={note.id}
          className="studio-vel-bar-wrap"
          style={{ position: 'absolute', left: 40 + note.step * STEP_WIDTH, width: STEP_WIDTH }}
          onMouseDown={(e) => onVelMouseDown(e, note)}
        >
          <div
            ref={(el) => {
              if (el) velBarRefs.current.set(note.id, el)
              else velBarRefs.current.delete(note.id)
            }}
            className={`studio-vel-bar${note.id === selectedNoteId ? ' selected' : ''}`}
            style={{ width: Math.max(4, STEP_WIDTH - 2), height: Math.round(note.velocity * VEL_MAX_H) }}
            title={`Velocity ${Math.round(note.velocity * 127)}`}
          />
        </div>
      ))}
    </div>
  )
})
