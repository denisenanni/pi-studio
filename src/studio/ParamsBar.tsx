import { useState, Fragment } from "react";
import { SYNTHS } from "../data/synths";
import { Tooltip } from "./Tooltip";

interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

const ADSR_PARAMS: ParamDef[] = [
  { key: "attack",  label: "ATTACK",  min: 0, max: 4,   step: 0.01 },
  { key: "release", label: "RELEASE", min: 0, max: 8,   step: 0.01 },
  { key: "decay",   label: "DECAY",   min: 0, max: 4,   step: 0.01 },
  { key: "sustain", label: "SUSTAIN", min: 0, max: 1,   step: 0.01 },
];

const OTHER_PARAMS: ParamDef[] = [
  { key: "cutoff",     label: "CUTOFF",     min: 0, max: 130,  step: 1    },
  { key: "res",        label: "RES",        min: 0, max: 0.99, step: 0.01 },
  { key: "amp",        label: "AMP",        min: 0, max: 2,    step: 0.01 },
  { key: "reverb_mix", label: "REVERB MIX", min: 0, max: 1,    step: 0.01 },
];

// Params that are always interactive regardless of synth
const ALWAYS_ENABLED = new Set(["attack", "release", "decay", "sustain", "amp", "reverb_mix"]);

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

  const synthDef = SYNTHS.find((s) => s.name === synth);
  const supportedKeys = new Set(synthDef?.params.map((p) => p.key) ?? []);

  function isDisabled(key: string): boolean {
    return !ALWAYS_ENABLED.has(key) && !supportedKeys.has(key);
  }

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
      onParamReset(param.key);
    } else {
      startEdit(param);
    }
  }

  function renderParam(param: ParamDef) {
    const disabled = isDisabled(param.key);
    const value = params[param.key] ?? 0;
    const isOverridden = mode === 'note' && defaults[param.key] !== undefined && value !== defaults[param.key];

    const classes = [
      'studio-param',
      isOverridden ? 'studio-param--overridden' : '',
      disabled ? 'studio-param--disabled' : '',
    ].filter(Boolean).join(' ');

    const inner = (
      <div key={param.key} className={classes}>
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
    );

    if (disabled) {
      return (
        <Tooltip key={param.key} text={`Not supported by :${synth}`}>
          {inner}
        </Tooltip>
      );
    }
    return inner;
  }

  const modeLabel = mode === 'note' ? 'NOTE PARAMS' : 'LOOP DEFAULTS';
  const modeLabelColor = mode === 'note' ? '#7cfc7c' : '#555';

  // ADSR grid: [attack, release] top row, [decay, sustain] bottom row
  const [attackParam, releaseParam, decayParam, sustainParam] = ADSR_PARAMS;

  return (
    <div className="studio-params-bar">
      <span className="studio-params-mode-label" style={{ color: modeLabelColor }}>
        {modeLabel}
      </span>

      {/* ADSR Envelope Box */}
      <div className="studio-adsr-box">
        <span className="studio-adsr-title">ADSR ENVELOPE</span>
        <div className="studio-adsr-grid">
          {renderParam(attackParam)}
          {renderParam(releaseParam)}
          {renderParam(decayParam)}
          {renderParam(sustainParam)}
        </div>
      </div>

      <div className="studio-params-spacer" />

      {/* Remaining params */}
      {OTHER_PARAMS.map((param, i) => (
        <Fragment key={param.key}>
          {i > 0 && param.key === "reverb_mix" && <div className="studio-params-spacer" />}
          {renderParam(param)}
        </Fragment>
      ))}
    </div>
  );
}
