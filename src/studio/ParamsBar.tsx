import { useState } from "react";
import { SYNTHS } from "../data/synths";
import { SYNTH_FX_LIST } from "../data/synthFx";
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

// Params that live in other boxes — not shown in the dynamic mod/filter boxes
const BASE_KEYS   = new Set(["note", "amp", "attack", "release", "decay", "sustain"]);
const FILTER_KEYS = new Set(["cutoff", "res"]);

function formatValue(v: number, step: number): string {
  return step < 1 ? v.toFixed(2) : String(Math.round(v));
}

function gridCols(count: number): number {
  if (count <= 2) return count;
  if (count === 3) return 3;
  return 2;
}

interface ParamsBarProps {
  params: Record<string, number>;
  defaults: Record<string, number>;
  mode: 'note' | 'loop';
  synth: string;
  fx: string;
  onParamChange: (key: string, value: number) => void;
  onParamReset: (key: string) => void;
}

export function ParamsBar({ params, defaults, mode, synth, fx, onParamChange, onParamReset }: ParamsBarProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editRaw, setEditRaw] = useState<string>("");

  // ── Synth param sets ────────────────────────────────────────
  const synthDef = SYNTHS.find((s) => s.name === synth);
  const synthParamKeys = new Set(synthDef?.params.map((p) => p.key) ?? []);

  const filterParams: ParamDef[] = (synthDef?.params ?? [])
    .filter((p) => FILTER_KEYS.has(p.key))
    .map(({ key, label, min, max, step }) => ({ key, label, min, max, step }));

  const modParams: ParamDef[] = (synthDef?.params ?? [])
    .filter((p) => !BASE_KEYS.has(p.key) && !FILTER_KEYS.has(p.key))
    .map(({ key, label, min, max, step }) => ({ key, label, min, max, step }));

  // ── FX param sets ───────────────────────────────────────────
  const fxDef = fx !== 'none' ? SYNTH_FX_LIST.find((f) => f.key === fx) : undefined;
  const fxParams: ParamDef[] = (fxDef?.params ?? [])
    .map(({ key, label, min, max, step }) => ({ key, label, min, max, step }));

  const mixerParams: ParamDef[] = [
    { key: "amp",        label: "AMP",    min: 0, max: 2, step: 0.01 },
    { key: "reverb_mix", label: "FX MIX", min: 0, max: 1, step: 0.01 },
  ];

  // ── Edit handlers ───────────────────────────────────────────
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

  // ── Single param renderer ───────────────────────────────────
  function renderParam(param: ParamDef, disabled = false, disabledTooltip = '') {
    const value = params[param.key] ?? 0;
    const isOverridden = mode === 'note' && defaults[param.key] !== undefined && value !== defaults[param.key];

    const classes = [
      'studio-param',
      isOverridden ? 'studio-param--overridden' : '',
      disabled ? 'studio-param--disabled' : '',
    ].filter(Boolean).join(' ');

    const inner = (
      <div className={classes}>
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

    if (disabled && disabledTooltip) {
      return (
        <Tooltip key={param.key} text={disabledTooltip}>
          {inner}
        </Tooltip>
      );
    }
    return <div key={param.key}>{inner}</div>;
  }

  // ── Box renderer ────────────────────────────────────────────
  function renderBox(title: string, boxParams: ParamDef[], options?: { disabledKeys?: Set<string>; disabledTooltip?: string }) {
    if (boxParams.length === 0) return null;
    const cols = gridCols(boxParams.length);
    const disabledKeys = options?.disabledKeys ?? new Set<string>();
    const disabledTooltip = options?.disabledTooltip ?? '';
    return (
      <div className="studio-adsr-box">
        <span className="studio-adsr-title">{title}</span>
        <div
          className="studio-param-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {boxParams.map((p) => renderParam(p, disabledKeys.has(p.key), disabledTooltip))}
        </div>
      </div>
    );
  }

  // ── ADSR box (fixed 2×2 layout) ─────────────────────────────
  const [attackParam, releaseParam, decayParam, sustainParam] = ADSR_PARAMS;

  // ── Mixer: mix disabled when no FX ─────────────────────────
  const mixerDisabled = fx === 'none' ? new Set(['reverb_mix']) : new Set<string>();

  // ── Mode label ──────────────────────────────────────────────
  const modeLabel = mode === 'note' ? 'NOTE PARAMS' : 'LOOP DEFAULTS';
  const modeLabelColor = mode === 'note' ? '#7cfc7c' : '#555';

  return (
    <div className="studio-params-bar">
      <span className="studio-params-mode-label" style={{ color: modeLabelColor }}>
        {modeLabel}
      </span>

      {/* ADSR Envelope */}
      <div className="studio-adsr-box">
        <span className="studio-adsr-title">ADSR ENVELOPE</span>
        <div className="studio-adsr-grid">
          {renderParam(attackParam)}
          {renderParam(releaseParam)}
          {renderParam(decayParam)}
          {renderParam(sustainParam)}
        </div>
      </div>

      {/* Filter — hidden when synth has no filter */}
      {filterParams.length > 0 && renderBox('FILTER', filterParams, {
        disabledKeys: new Set(filterParams.filter(p => !synthParamKeys.has(p.key)).map(p => p.key)),
        disabledTooltip: `Not supported by :${synth}`,
      })}

      {/* Modulation — hidden when synth has no mod params */}
      {renderBox('MODULATION', modParams)}

      {/* FX Params — hidden when no FX selected */}
      {renderBox('FX PARAMS', fxParams)}

      {/* Mixer — always visible */}
      {renderBox('MIXER', mixerParams, {
        disabledKeys: mixerDisabled,
        disabledTooltip: 'No FX selected',
      })}
    </div>
  );
}
