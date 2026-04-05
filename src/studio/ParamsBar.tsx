import { useState } from "react";
import { SYNTHS } from "../data/synths";
import { SYNTH_FX_LIST } from "../data/synthFx";
import { Tooltip } from "./Tooltip";
import type { FxChainEntry, RrandRange } from "./types";

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

const BASE_KEYS   = new Set(["note", "amp", "attack", "release", "decay", "sustain"]);
const FILTER_KEYS = new Set(["cutoff", "res"]);

// Default values for FX params (used when no override is set)
const FX_PARAM_DEFAULTS: Record<string, number> = {
  mix: 0.4,
  room: 0.6, damp: 0.5, spread: 0.5,
  phase: 0.25, decay: 0.5,
  distort: 0.5,
  bits: 8, sample_rate: 10000,
  gain: 5, cutoff: 100,
  cutoff_min: 60, cutoff_max: 120, res: 0.8,
  feedback: 0, depth: 0.5, wave: 3,
  pitch: 0, pan: 0, freq: 30,
};

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
  fxChain: FxChainEntry[];
  selectedFxId: string | null;
  onParamChange: (key: string, value: number) => void;
  onFxParamChange: (fxId: string, key: string, value: number) => void;
  onSelectFx: (fxId: string | null) => void;
  onParamReset: (key: string) => void;
  rrandParams: Record<string, RrandRange>;
  onRrandChange: (key: string, range: RrandRange | null) => void;
}

export function ParamsBar({
  params, defaults, mode, synth,
  fxChain, selectedFxId,
  onParamChange, onFxParamChange, onParamReset,
  rrandParams, onRrandChange,
}: ParamsBarProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editRaw, setEditRaw] = useState<string>("");

  // ── Synth param sets ──────────────────────────────────────────
  const synthDef = SYNTHS.find((s) => s.name === synth);
  const synthParamKeys = new Set(synthDef?.params.map((p) => p.key) ?? []);

  const filterParams: ParamDef[] = (synthDef?.params ?? [])
    .filter((p) => FILTER_KEYS.has(p.key))
    .map(({ key, label, min, max, step }) => ({ key, label, min, max, step }));

  const modParams: ParamDef[] = (synthDef?.params ?? [])
    .filter((p) => !BASE_KEYS.has(p.key) && !FILTER_KEYS.has(p.key))
    .map(({ key, label, min, max, step }) => ({ key, label, min, max, step }));

  // ── Selected FX entry ─────────────────────────────────────────
  const selectedFxEntry = fxChain.find((e) => e.id === selectedFxId) ?? fxChain[0] ?? null;
  const fxDef = selectedFxEntry ? SYNTH_FX_LIST.find((f) => f.key === selectedFxEntry.fxKey) : undefined;

  const fxParams: ParamDef[] = (fxDef?.params ?? [])
    .map(({ key, label, min, max, step }) => ({ key, label, min, max, step }));

  // FX PARAMS title includes the active FX name
  const fxParamsTitle = selectedFxEntry ? `FX PARAMS — ${selectedFxEntry.fxKey}` : 'FX PARAMS';

  // MIX param for MIXER box (per-FX mix stored in fxEntry.params.mix)
  const mixParam: ParamDef = { key: "mix", label: "FX MIX", min: 0,  max: 1, step: 0.01 };
  const ampParam: ParamDef = { key: "amp", label: "AMP",    min: 0,  max: 2, step: 0.01 };
  const panParam: ParamDef = { key: "pan", label: "PAN",    min: -1, max: 1, step: 0.01 };

  // ── Param value helpers ───────────────────────────────────────
  function getLoopParamValue(key: string): number {
    return params[key] ?? 0;
  }

  function getFxParamValue(key: string): number {
    return selectedFxEntry?.params[key] ?? FX_PARAM_DEFAULTS[key] ?? 0;
  }

  // ── Edit handlers ─────────────────────────────────────────────
  function startEditLoop(param: ParamDef) {
    setEditingKey(param.key);
    setEditRaw(formatValue(getLoopParamValue(param.key), param.step));
  }

  function startEditFx(param: ParamDef) {
    setEditingKey(`fx:${param.key}`);
    setEditRaw(formatValue(getFxParamValue(param.key), param.step));
  }

  function commitEditLoop(param: ParamDef) {
    const parsed = parseFloat(editRaw);
    if (!isNaN(parsed)) {
      onParamChange(param.key, Math.min(param.max, Math.max(param.min, parsed)));
    }
    setEditingKey(null);
  }

  function commitEditFx(param: ParamDef) {
    if (!selectedFxEntry) { setEditingKey(null); return; }
    const parsed = parseFloat(editRaw);
    if (!isNaN(parsed)) {
      onFxParamChange(selectedFxEntry.id, param.key, Math.min(param.max, Math.max(param.min, parsed)));
    }
    setEditingKey(null);
  }

  // ── Render a loop-level param ─────────────────────────────────
  function renderLoopParam(param: ParamDef, disabled = false, disabledTooltip = '') {
    const value = getLoopParamValue(param.key);
    const isOverridden = mode === 'note' && defaults[param.key] !== undefined && value !== defaults[param.key];
    const editKey = param.key;
    const isRrand = param.key in rrandParams;
    const rrandRange = rrandParams[param.key];

    const classes = ['studio-param', isOverridden ? 'studio-param--overridden' : '', disabled ? 'studio-param--disabled' : '']
      .filter(Boolean).join(' ');

    const handleRrandToggle = () => {
      if (isRrand) {
        onRrandChange(param.key, null);
      } else {
        // Default range: [min, current value] clamped
        const lo = Math.max(param.min, value - (param.max - param.min) * 0.2);
        const hi = Math.min(param.max, value);
        onRrandChange(param.key, [lo, hi]);
      }
    };

    const inner = (
      <div className={classes}>
        <div className="studio-param-header">
          <span className="studio-param-label">{param.label}</span>
          {!isRrand && editingKey === editKey ? (
            <input name="studio-param" className="studio-param-value-input" type="number"
              min={param.min} max={param.max} step={param.step} value={editRaw} autoFocus
              onChange={(e) => setEditRaw(e.target.value)}
              onBlur={() => commitEditLoop(param)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitEditLoop(param); }
                if (e.key === "Escape") { e.preventDefault(); setEditingKey(null); }
              }}
              aria-label={`${param.label} value`}
            />
          ) : (
            <span className="studio-param-value"
              onDoubleClick={() => !isRrand && (mode === 'note' ? onParamReset(param.key) : startEditLoop(param))}
              title={isRrand ? `~${formatValue(rrandRange[0], param.step)}–${formatValue(rrandRange[1], param.step)}` : mode === 'note' ? 'Double-click to reset to loop default' : 'Double-click to edit'}
            >{isRrand ? `~${formatValue(rrandRange[0], param.step)}–${formatValue(rrandRange[1], param.step)}` : formatValue(value, param.step)}</span>
          )}
          <Tooltip text={isRrand ? 'Disable randomisation' : 'Randomise on each note (rrand)'}>
            <button
              className={`studio-param-rrand-toggle${isRrand ? ' active' : ''}`}
              onClick={handleRrandToggle}
              aria-label="Toggle rrand"
            >~</button>
          </Tooltip>
        </div>
        {isRrand ? (
          <div className="studio-param-rrand-range">
            <div className="studio-param-rrand-row">
              <span className="studio-param-rrand-label">MIN</span>
              <input className="studio-param-slider" type="range"
                min={param.min} max={rrandRange[1]} step={param.step} value={rrandRange[0]}
                onChange={(e) => onRrandChange(param.key, [parseFloat(e.target.value), rrandRange[1]])}
                aria-label={`${param.label} min`}
              />
            </div>
            <div className="studio-param-rrand-row">
              <span className="studio-param-rrand-label">MAX</span>
              <input className="studio-param-slider" type="range"
                min={rrandRange[0]} max={param.max} step={param.step} value={rrandRange[1]}
                onChange={(e) => onRrandChange(param.key, [rrandRange[0], parseFloat(e.target.value)])}
                aria-label={`${param.label} max`}
              />
            </div>
          </div>
        ) : (
          <input className="studio-param-slider" type="range"
            min={param.min} max={param.max} step={param.step} value={value}
            onChange={(e) => onParamChange(param.key, parseFloat(e.target.value))}
            aria-label={param.label}
          />
        )}
      </div>
    );

    if (disabled && disabledTooltip) {
      return <Tooltip key={param.key} text={disabledTooltip}>{inner}</Tooltip>;
    }
    return <div key={param.key}>{inner}</div>;
  }

  // ── Render an FX-level param ──────────────────────────────────
  function renderFxParam(param: ParamDef, disabled = false, disabledTooltip = '') {
    const value = getFxParamValue(param.key);
    const editKey = `fx:${param.key}`;

    const classes = ['studio-param', disabled ? 'studio-param--disabled' : ''].filter(Boolean).join(' ');

    const inner = (
      <div className={classes}>
        <div className="studio-param-header">
          <span className="studio-param-label">{param.label}</span>
          {editingKey === editKey ? (
            <input name="studio-param" className="studio-param-value-input" type="number"
              min={param.min} max={param.max} step={param.step} value={editRaw} autoFocus
              onChange={(e) => setEditRaw(e.target.value)}
              onBlur={() => commitEditFx(param)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitEditFx(param); }
                if (e.key === "Escape") { e.preventDefault(); setEditingKey(null); }
              }}
              aria-label={`${param.label} value`}
            />
          ) : (
            <span className="studio-param-value"
              onDoubleClick={() => startEditFx(param)}
              title="Double-click to edit"
            >{formatValue(value, param.step)}</span>
          )}
        </div>
        <input className="studio-param-slider" type="range"
          min={param.min} max={param.max} step={param.step} value={value}
          onChange={(e) => selectedFxEntry && onFxParamChange(selectedFxEntry.id, param.key, parseFloat(e.target.value))}
          aria-label={param.label}
        />
      </div>
    );

    if (disabled && disabledTooltip) {
      return <Tooltip key={param.key} text={disabledTooltip}>{inner}</Tooltip>;
    }
    return <div key={param.key}>{inner}</div>;
  }

  // ── Generic box renderer (loop params) ───────────────────────
  function renderBox(title: string, boxParams: ParamDef[], options?: { disabledKeys?: Set<string>; disabledTooltip?: string }) {
    if (boxParams.length === 0) return null;
    const cols = gridCols(boxParams.length);
    const disabledKeys = options?.disabledKeys ?? new Set<string>();
    const disabledTooltip = options?.disabledTooltip ?? '';
    return (
      <div className="studio-adsr-box">
        <span className="studio-adsr-title">{title}</span>
        <div className="studio-param-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {boxParams.map((p) => renderLoopParam(p, disabledKeys.has(p.key), disabledTooltip))}
        </div>
      </div>
    );
  }

  // ── ADSR box ──────────────────────────────────────────────────
  const [attackParam, releaseParam, decayParam, sustainParam] = ADSR_PARAMS;

  // ── Mode label ────────────────────────────────────────────────
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
          {renderLoopParam(attackParam)}
          {renderLoopParam(releaseParam)}
          {renderLoopParam(decayParam)}
          {renderLoopParam(sustainParam)}
        </div>
      </div>

      {/* Filter — hidden when synth has no filter */}
      {filterParams.length > 0 && renderBox('FILTER', filterParams, {
        disabledKeys: new Set(filterParams.filter(p => !synthParamKeys.has(p.key)).map(p => p.key)),
        disabledTooltip: `Not supported by :${synth}`,
      })}

      {/* Modulation — hidden when synth has no mod params */}
      {renderBox('MODULATION', modParams)}

      {/* FX Params — hidden when no FX in chain */}
      {fxParams.length > 0 && (
        <div className="studio-adsr-box">
          <span className="studio-adsr-title">{fxParamsTitle}</span>
          <div className="studio-param-grid" style={{ gridTemplateColumns: `repeat(${gridCols(fxParams.length)}, 1fr)` }}>
            {fxParams.map((p) => renderFxParam(p))}
          </div>
        </div>
      )}

      {/* Mixer — always visible */}
      <div className="studio-adsr-box">
        <span className="studio-adsr-title">MIXER</span>
        <div className="studio-param-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {renderLoopParam(ampParam)}
          {renderLoopParam(panParam)}
          {fxChain.length > 0
            ? renderFxParam(mixParam)
            : renderLoopParam({ ...mixParam }, true, 'No FX selected')}
        </div>
      </div>
    </div>
  );
}
