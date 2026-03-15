import { useState, useRef, useCallback } from 'react'
import type { StudioLoop } from './types'

interface LoopsPanelProps {
  loops: StudioLoop[]
  selectedLoopId: string | null
  onSelectLoop: (id: string) => void
  onToggleMute: (id: string) => void
  onRenameLoop: (id: string, name: string) => void
  width: number
  collapsed: boolean
  onToggleCollapse: () => void
  onResizeStart: (e: React.MouseEvent) => void
}

const VU_HEIGHTS = [3, 5, 7, 6, 4, 8, 5, 3] // static placeholder levels (out of 8)

export function LoopsPanel({
  loops, selectedLoopId,
  onSelectLoop, onToggleMute, onRenameLoop,
  width, collapsed,
  onToggleCollapse, onResizeStart,
}: LoopsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')

  const commitRename = useCallback((id: string) => {
    const trimmed = nameDraft.trim()
    if (trimmed) onRenameLoop(id, trimmed)
    setEditingId(null)
  }, [nameDraft, onRenameLoop])

  const inputRef = useRef<HTMLInputElement>(null)

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
        <button className="studio-loops-add" title="Add loop">+</button>
      </div>

      {/* Collapsed vertical label */}
      <div className="studio-loops-collapsed-label">LOOPS</div>

      {/* Loop list */}
      <div className="studio-loops-list">
        {loops.map((loop) => (
          <div
            key={loop.id}
            className={`studio-loop-strip${selectedLoopId === loop.id ? ' selected' : ''}`}
            onClick={() => onSelectLoop(loop.id)}
          >
            {/* Row 1: name + mute + type badge */}
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
              <button
                className={`studio-loop-mute${loop.muted ? ' muted' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleMute(loop.id) }}
                title={loop.muted ? 'Unmute' : 'Mute'}
              >
                M
              </button>
              <span className="studio-loop-type-badge">{loop.type}</span>
            </div>

            {/* Step grid */}
            <div className="studio-step-grid">
              {loop.activeSteps.map((active, i) => (
                <div
                  key={`step-${i}`}
                  className={`studio-step${active ? ' active' : ''}`}
                  title={`Step ${i + 1}`}
                />
              ))}
            </div>

            {/* VU meter */}
            <div className="studio-vu">
              {VU_HEIGHTS.map((h, i) => (
                <div
                  key={`vu-${i}`}
                  className={`studio-vu-bar${loop.muted ? '' : ' lit'}`}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        ))}
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
