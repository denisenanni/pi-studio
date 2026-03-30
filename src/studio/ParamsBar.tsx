import { useState, Fragment } from 'react'

interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
}

const PARAMS: ParamDef[] = [
  { key: 'cutoff',     label: 'CUTOFF',     min: 0,   max: 130, step: 1,    defaultValue: 80   },
  { key: 'res',        label: 'RES',        min: 0,   max: 0.99, step: 0.01, defaultValue: 0.50 },
  { key: 'attack',     label: 'ATTACK',     min: 0,   max: 4,   step: 0.01, defaultValue: 0.10 },
  { key: 'release',    label: 'RELEASE',    min: 0,   max: 8,   step: 0.01, defaultValue: 0.50 },
  { key: 'amp',        label: 'AMP',        min: 0,   max: 2,   step: 0.01, defaultValue: 1.0  },
  { key: 'reverb_mix', label: 'REVERB MIX', min: 0,   max: 1,   step: 0.01, defaultValue: 0.40 },
]

function formatValue(v: number, step: number): string {
  return step < 1 ? v.toFixed(2) : String(Math.round(v))
}

export function ParamsBar() {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(PARAMS.map((p) => [p.key, p.defaultValue]))
  )
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editRaw, setEditRaw] = useState<string>('')

  function startEdit(param: ParamDef) {
    setEditingKey(param.key)
    setEditRaw(formatValue(values[param.key] ?? param.defaultValue, param.step))
    // focus happens via autoFocus on the rendered input
  }

  function commitEdit(param: ParamDef) {
    const parsed = parseFloat(editRaw)
    if (!isNaN(parsed)) {
      const clamped = Math.min(param.max, Math.max(param.min, parsed))
      setValues((prev) => ({ ...prev, [param.key]: clamped }))
    }
    setEditingKey(null)
  }

  return (
    <div className="studio-params-bar">
      {PARAMS.map((param, i) => (
        <Fragment key={param.key}>
          {i === PARAMS.length - 1 && <div className="studio-params-spacer" />}
          <div className="studio-param">
            <div className="studio-param-header">
              <span className="studio-param-label">{param.label}</span>
              {editingKey === param.key ? (
                <input
                  className="studio-param-value-input"
                  type="number"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={editRaw}
                  autoFocus
                  onChange={(e) => setEditRaw(e.target.value)}
                  onBlur={() => commitEdit(param)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(param) }
                    if (e.key === 'Escape') { e.preventDefault(); setEditingKey(null) }
                  }}
                  aria-label={`${param.label} value`}
                />
              ) : (
                <span
                  className="studio-param-value"
                  onDoubleClick={() => startEdit(param)}
                  title="Double-click to edit"
                >
                  {formatValue(values[param.key] ?? param.defaultValue, param.step)}
                </span>
              )}
            </div>
            <input
              className="studio-param-slider"
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={values[param.key] ?? param.defaultValue}
              onChange={(e) => setValues((prev) => ({ ...prev, [param.key]: parseFloat(e.target.value) }))}
              aria-label={param.label}
            />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
