import type { ActiveTab } from '../types'

interface TopbarProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
  search: string
  onSearchChange: (value: string) => void
  hideSearch?: boolean
}

export function Topbar({ activeTab, onTabChange, search, onSearchChange, hideSearch = false }: TopbarProps) {
  return (
    <div className="topbar">
      <span className="topbar-title">SONIC PI BROWSER</span>

      <div className="topbar-tabs">
        <button
          className={`tab${activeTab === 'samples' ? ' active' : ''}`}
          onClick={() => onTabChange('samples')}
        >
          Samples
        </button>
        <button
          className={`tab${activeTab === 'chords' ? ' active' : ''}`}
          onClick={() => onTabChange('chords')}
        >
          Chords
        </button>
        <button
          className={`tab${activeTab === 'scales' ? ' active' : ''}`}
          onClick={() => onTabChange('scales')}
        >
          Scales
        </button>
        <button
          className={`tab${activeTab === 'fx' ? ' active' : ''}`}
          onClick={() => onTabChange('fx')}
        >
          FX
        </button>
        <button
          className={`tab${activeTab === 'synths' ? ' active' : ''}`}
          onClick={() => onTabChange('synths')}
        >
          Synths
        </button>
        <button
          className={`tab${activeTab === 'tools' ? ' active' : ''}`}
          onClick={() => onTabChange('tools')}
        >
          Tools
        </button>
      </div>

      <div className="topbar-spacer" />

      {!hideSearch && (
        <input
          className="search-input"
          type="text"
          placeholder="search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      )}
    </div>
  )
}
