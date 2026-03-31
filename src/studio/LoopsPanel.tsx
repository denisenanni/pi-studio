import { useState, useRef, useCallback, useEffect, Fragment } from 'react'
import type { StudioLoop, LoopType } from './types'
import { Tooltip } from './Tooltip'

interface LoopsPanelProps {
  loops: StudioLoop[]
  selectedLoopId: string | null
  soloLoopId: string | null
  onSelectLoop: (id: string) => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
  onRenameLoop: (id: string, name: string) => void
  onAddLoop: () => void
  onDeleteLoop: (id: string) => void
  onSetLoopType: (loopId: string, type: LoopType) => void
  onReorderLoops: (fromIndex: number, toIndex: number) => void
  width: number
  collapsed: boolean
  onToggleCollapse: () => void
  onResizeStart: (e: React.MouseEvent) => void
  currentStep: number
  isPlaying: boolean
}

export function LoopsPanel({
  loops, selectedLoopId, soloLoopId,
  onSelectLoop, onToggleMute, onToggleSolo, onRenameLoop,
  onAddLoop, onDeleteLoop, onSetLoopType, onReorderLoops,
  width, collapsed,
  onToggleCollapse, onResizeStart,
  currentStep, isPlaying,
}: LoopsPanelProps) {
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [nameDraft, setNameDraft]           = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dragState, setDragState]           = useState<{ idx: number; dropIdx: number } | null>(null)

  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef         = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)

  // Clear confirm timer on unmount
  useEffect(() => () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
  }, [])

  const commitRename = useCallback((id: string) => {
    const trimmed = nameDraft.trim()
    if (trimmed) onRenameLoop(id, trimmed)
    setEditingId(null)
  }, [nameDraft, onRenameLoop])

  // ── Delete (2-click confirm) ─────────────────────────────

  const handleDeleteClick = useCallback((e: React.MouseEvent, loopId: string) => {
    e.stopPropagation()
    if (loops.length <= 1) return

    if (confirmDeleteId === loopId) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      setConfirmDeleteId(null)
      onDeleteLoop(loopId)
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      setConfirmDeleteId(loopId)
      confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 2000)
    }
  }, [loops.length, confirmDeleteId, onDeleteLoop])

  // ── Drag reorder ─────────────────────────────────────────

  const handleDragStart = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragState({ idx, dropIdx: idx })

    const onMove = (ev: MouseEvent) => {
      if (!listRef.current) return
      const strips = Array.from(listRef.current.querySelectorAll<HTMLElement>('.studio-loop-strip'))
      let dropIdx = strips.length
      for (let i = 0; i < strips.length; i++) {
        const rect = strips[i].getBoundingClientRect()
        if (ev.clientY < rect.top + rect.height / 2) { dropIdx = i; break }
      }
      setDragState((prev) => prev ? { ...prev, dropIdx } : null)
    }

    const onUp = () => {
      setDragState((prev) => {
        if (prev && prev.dropIdx !== prev.idx) {
          const to = prev.dropIdx > prev.idx ? prev.dropIdx - 1 : prev.dropIdx
          onReorderLoops(prev.idx, to)
        }
        return null
      })
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onReorderLoops])

  return (
    <div
      className={`studio-loops-panel${collapsed ? ' collapsed' : ''}`}
      style={{ width: collapsed ? undefined : width }}
    >
      {/* Header */}
      <div className="studio-loops-header">
        <span className="studio-loops-header-label">LOOPS</span>
        <button
          className="studio-loops-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand loops panel' : 'Collapse loops panel'}
        >
          {collapsed ? '›' : '‹'}
        </button>
        <button
          className="studio-loops-add"
          title={loops.length >= 8 ? 'Maximum 8 loops' : 'Add loop'}
          onClick={loops.length < 8 ? onAddLoop : undefined}
          style={{ opacity: loops.length >= 8 ? 0.3 : 1, cursor: loops.length >= 8 ? 'default' : 'pointer' }}
        >
          +
        </button>
      </div>

      {/* Collapsed vertical label */}
      <div className="studio-loops-collapsed-label">LOOPS</div>

      {/* Loop list */}
      <div className="studio-loops-list" ref={listRef}>
        {loops.map((loop, idx) => (
          <Fragment key={loop.id}>
            {dragState?.dropIdx === idx && <div className="studio-loop-drop-indicator" />}
            <div
              className={[
                'studio-loop-strip',
                selectedLoopId === loop.id ? 'selected' : '',
                loop.muted ? 'muted' : '',
                dragState?.idx === idx ? 'dragging' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectLoop(loop.id)}
            >
              {/* Drag handle */}
              <div
                className="studio-loop-drag-handle"
                onMouseDown={(e) => handleDragStart(e, idx)}
                title="Drag to reorder"
              >
                ≡
              </div>

              {/* Row 1: name + controls */}
              <div className="studio-loop-strip-row1">
                {editingId === loop.id ? (
                  <input
                    ref={inputRef}
                    className="studio-loop-name-input"
                    value={nameDraft}
                    autoFocus
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => commitRename(loop.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(loop.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="studio-loop-name"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingId(loop.id)
                      setNameDraft(loop.name)
                    }}
                    title="Double-click to rename"
                  >
                    :{loop.name}
                  </span>
                )}

                <div className="studio-loop-strip-btns">
                  <Tooltip text={soloLoopId === loop.id ? 'Unsolo' : 'Solo'}>
                    <button
                      className={`studio-loop-solo${soloLoopId === loop.id ? ' active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onToggleSolo(loop.id) }}
                    >
                      S
                    </button>
                  </Tooltip>
                  <Tooltip text={loop.muted ? 'Unmute' : 'Mute'}>
                    <button
                      className={`studio-loop-mute${loop.muted ? ' muted' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onToggleMute(loop.id) }}
                    >
                      M
                    </button>
                  </Tooltip>
                  <Tooltip text={confirmDeleteId === loop.id ? 'Confirm delete' : 'Delete loop'}>
                    <button
                      className={`studio-loop-delete${confirmDeleteId === loop.id ? ' confirm' : ''}${loops.length <= 1 ? ' disabled' : ''}`}
                      onClick={(e) => handleDeleteClick(e, loop.id)}
                    >
                      ×
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Row 2: type badge + step grid */}
              <div className="studio-loop-strip-row2">
                <button
                  className="studio-loop-type-badge"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSetLoopType(loop.id, loop.type === 'synth' ? 'sample' : 'synth')
                  }}
                  title={`Type: ${loop.type} — click to switch`}
                >
                  {loop.type}
                </button>

                <div className="studio-step-grid">
                  {loop.activeSteps.map((active, i) => {
                    const playingThis = isPlaying && (currentStep % loop.steps) === i
                    return (
                      <div
                        key={`step-${i}`}
                        className={`studio-step${active ? ' active' : ''}${playingThis ? ' playing' : ''}`}
                        title={`Step ${i + 1}`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </Fragment>
        ))}
        {dragState?.dropIdx === loops.length && <div className="studio-loop-drop-indicator" />}
      </div>

      {/* Drag handle */}
      {!collapsed && (
        <div
          className="studio-loops-resize-handle"
          onMouseDown={onResizeStart}
          onDoubleClick={() => { /* reset handled in parent */ }}
          title="Drag to resize · Double-click to reset"
        />
      )}
    </div>
  )
}
