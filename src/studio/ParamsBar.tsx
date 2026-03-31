import { useState, Fragment } from "react";

interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

const PARAMS: ParamDef[] = [
  { key: "cutoff",     label: "CUTOFF",     min: 0, max: 130,  step: 1    },
  { key: "res",        label: "RES",        min: 0, max: 0.99, step: 0.01 },
  { key: "attack",     label: "ATTACK",     min: 0, max: 4,    step: 0.01 },
  { key: "release",    label: "RELEASE",    min: 0, max: 8,    step: 0.01 },
  { key: "amp",        label: "AMP",        min: 0, max: 2,    step: 0.01 },
  { key: "reverb_mix", label: "REVERB MIX", min: 0, max: 1,    step: 0.01 },
];

// Synths that support filter resonance
const RES_SYNTHS = new Set(["prophet", "tb303", "hollow", "dark_ambience", "blade"]);

function formatValue(v: number, step: number): string {
  return step < 1 ? v.toFixed(2) : String(Math.round(v));
}

interface ParamsBarProps {
  params: Record<string, number>;
  defaults: Record<string, number>;
  mode: 'note' | 'loop';
  synth: string;
  onParamChange: (key: string, value: number) => void;
  onParamReset: (key: string) => void;
}

export function ParamsBar({ params, defaults, mode, synth, onParamChange, onParamReset }: ParamsBarProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editRaw, setEditRaw] = useState<string>("");

  const visibleParams = PARAMS.filter((p) => p.key !== "res" || RES_SYNTHS.has(synth));

  function startEdit(param: ParamDef) {
    setEditingKey(param.key);
    setEditRaw(formatValue(params[param.key] ?? 0, param.step));
  }

  function commitEdit(param: ParamDef) {
    const parsed = parseFloat(editRaw);
    if (!isNaN(parsed)) {
      const clamped = Math.min(param.max, Math.max(param.min, parsed));
      onParamChange(param.key, clamped);
    }
    setEditingKey(null);
  }

  function handleValueDoubleClick(param: ParamDef) {
    if (mode === 'note') {
      // Reset note override → remove key from note.params (revert to loop default)
      onParamReset(param.key);
    } else {
      startEdit(param);
    }
  }

  const modeLabel = mode === 'note' ? 'NOTE PARAMS' : 'LOOP DEFAULTS';
  const modeLabelColor = mode === 'note' ? '#7cfc7c' : '#555';

  return (
    <div className="studio-params-bar">
      <span className="studio-params-mode-label" style={{ color: modeLabelColor }}>
        {modeLabel}
      </span>
      {visibleParams.map((param) => {
        // Insert spacer before REVERB MIX
        const showSpacer = param.key === "reverb_mix";
        const value = params[param.key] ?? 0;
        const isOverridden = mode === 'note' && defaults[param.key] !== undefined && value !== defaults[param.key];
        return (
          <Fragment key={param.key}>
            {showSpacer && <div className="studio-params-spacer" />}
            <div className={`studio-param${isOverridden ? ' studio-param--overridden' : ''}`}>
              <div className="studio-param-header">
                <span className="studio-param-label">{param.label}</span>
                {editingKey === param.key ? (
                  <input
                    name="studio-param"
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
                      if (e.key === "Enter") { e.preventDefault(); commitEdit(param); }
                      if (e.key === "Escape") { e.preventDefault(); setEditingKey(null); }
                    }}
                    aria-label={`${param.label} value`}
                  />
                ) : (
                  <span
                    className="studio-param-value"
                    onDoubleClick={() => handleValueDoubleClick(param)}
                    onClick={mode === 'loop' ? undefined : undefined}
                    title={mode === 'note' ? 'Double-click to reset to loop default' : 'Double-click to edit'}
                  >
                    {formatValue(value, param.step)}
                  </span>
                )}
              </div>
              <input
                className="studio-param-slider"
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={value}
                onChange={(e) => onParamChange(param.key, parseFloat(e.target.value))}
                aria-label={param.label}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
