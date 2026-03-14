import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { SYNTHS, NOTE_NAMES, noteToMidi } from "../data/synths";
import type { SynthDefinition, SynthParam, NoteName } from "../data/synths";
import type { SuperSonicState } from "../hooks/useSuperSonic";

const OCTAVES = [2, 3, 4, 5, 6] as const;

function buildSynthSnippet(
  synth: SynthDefinition | null,
  note: number,
  params: Record<string, number>
): string {
  if (!synth) return "no synth selected";
  const nonDefault = synth.params
    .filter((p) => {
      if (p.key === "note" || p.key === "amp") return false;
      const val = params[p.key] ?? p.default;
      return Math.abs(val - p.default) >= p.step;
    })
    .map((p) => {
      const val = params[p.key] ?? p.default;
      const formatted =
        p.step < 1 ? val.toFixed(2) : String(Math.round(val));
      return `${p.key}: ${formatted}`;
    });

  const amp = params["amp"] ?? 1;
  const parts = [`note: ${note}`, `amp: ${amp.toFixed(2)}`, ...nonDefault];
  return `synth :${synth.name}, ${parts.join(", ")}`;
}

interface SynthsTabProps {
  filteredSynths: SynthDefinition[];
  selectedSynth: string | null;
  engineState: SuperSonicState;
  loadingSynthdef: string | null;
  isPlaying: boolean;
  params: Record<string, number>;
  rootNote: string;
  octave: number;
  onSynthClick: (name: string) => void;
  onParamChange: (key: string, value: number) => void;
  onRootNoteChange: (note: string) => void;
  onOctaveChange: (octave: number) => void;
  onCopy: () => void;
}

export const SynthsTab = memo(function SynthsTab({
  filteredSynths,
  selectedSynth,
  engineState,
  loadingSynthdef,
  isPlaying,
  params,
  rootNote,
  octave,
  onSynthClick,
  onParamChange,
  onRootNoteChange,
  onOctaveChange,
  onCopy,
}: SynthsTabProps) {
  const [copiedFlash, setCopiedFlash] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear copy timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const activeSynth = useMemo(
    () => SYNTHS.find((s) => s.name === selectedSynth) ?? null,
    [selectedSynth]
  );

  const midiNote = useMemo(
    () => noteToMidi(rootNote as NoteName, octave),
    [rootNote, octave]
  );

  const snippet = useMemo(
    () => buildSynthSnippet(activeSynth, midiNote, params),
    [activeSynth, midiNote, params]
  );

  // Params for the bottom panel — exclude note (handled by note/octave controls)
  const bottomParams = useMemo<SynthParam[]>(
    () => (activeSynth ? activeSynth.params.filter((p) => p.key !== "note") : []),
    [activeSynth]
  );

  const handleCopy = useCallback(() => {
    onCopy();
    setCopiedFlash(true);
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedFlash(false), 800);
  }, [onCopy]);

  return (
    <div className="fx-tab synths-tab">
      {/* ── Engine status banner ────────────────────────────────── */}
      {engineState.isLoading && (
        <div className="synths-banner synths-banner--loading">
          <span className="synths-banner-dot" />
          Initialising scsynth engine...
        </div>
      )}
      {engineState.error && (
        <div className="synths-banner synths-banner--error">
          {engineState.error}. Check your connection and reload.
        </div>
      )}

      {/* ── Top controls ───────────────────────────────────────── */}
      <div className="fx-top-controls">
        <div className="scales-controls" style={{ marginBottom: 0 }}>
          {/* Root note */}
          <div className="scales-control-group">
            <span className="scales-control-label">Note</span>
            {NOTE_NAMES.map((n) => (
              <button
                key={n}
                className={`pill${rootNote === n ? " active" : ""}`}
                onClick={() => onRootNoteChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
          {/* Octave */}
          <div className="scales-control-group">
            <span className="scales-control-label">Octave</span>
            {OCTAVES.map((o) => (
              <button
                key={o}
                className={`pill${octave === o ? " active" : ""}`}
                onClick={() => onOctaveChange(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Synth grid ─────────────────────────────────────────── */}
      <div className="grid-container fx-grid-container">
        <div className="sample-grid">
          {filteredSynths.map((synth) => {
            const isSelected = synth.name === selectedSynth;
            const isLoadingThis = loadingSynthdef === synth.name;
            return (
              <div
                key={synth.name}
                className={`sample-cell fx-cell synth-cell${isSelected ? " selected" : ""}${isSelected && isPlaying ? " playing" : ""}`}
                onClick={() => onSynthClick(synth.name)}
                title={synth.doc}
              >
                <div className="sample-name-col">
                  <span className="sample-name">{synth.label}</span>
                  <span className="scale-note-count">:{synth.name}</span>
                </div>
                {isLoadingThis && <span className="synth-spinner" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom panel ───────────────────────────────────────── */}
      <div className="bottom-panel fx-bottom-panel">
        <div className="controls fx-controls">
          {bottomParams.map((p) => (
            <div key={p.key} className="control-group">
              <span>{p.label}</span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.key] ?? p.default}
                onChange={(e) => onParamChange(p.key, parseFloat(e.target.value))}
              />
              <span className="control-value">
                {(params[p.key] ?? p.default).toFixed(p.step < 1 ? 2 : 0)}
              </span>
            </div>
          ))}
        </div>

        <div className="shortcuts">
          <span className="shortcut">
            <kbd>Space</kbd> play/stop
          </span>
          <span className="shortcut">
            <kbd>↑↓←→</kbd> navigate
          </span>
          <span className="shortcut">
            <kbd>C</kbd> copy
          </span>
        </div>

        <div className="snippet-area">
          <code className={`snippet-code${selectedSynth ? " has-sample" : ""}`}>
            {snippet}
          </code>
          <button
            className="copy-btn"
            onClick={handleCopy}
            disabled={!selectedSynth}
          >
            {copiedFlash ? "copied!" : "copy"}
          </button>
        </div>
      </div>
    </div>
  );
});
