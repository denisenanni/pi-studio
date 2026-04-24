import type { StudioSnapshot, StudioLoop, StudioNote, RrandRange } from './types'

// ── Param defaults (used to decide what to include in output) ──────────────

const PARAM_DEFAULTS: Record<string, number> = {
  cutoff:  80,
  res:     0.50,
  attack:  0.10,
  decay:   0,
  sustain: 1,
  release: 0.50,
  amp:     1.0,
  pan:     0,
}

function getEffectiveParam(note: StudioNote, loop: StudioLoop, key: string): number {
  return note.params[key] ?? loop.params[key] ?? PARAM_DEFAULTS[key] ?? 0
}

// Returns either a fixed value string or "rrand(min, max)" if rrand is active
function resolveParam(
  key: string,
  note: StudioNote,
  loop: StudioLoop,
  fixedValue: number,
): string {
  const noteRange: RrandRange | undefined = note.rrandParams[key]
  if (noteRange) return `rrand(${formatBeat(noteRange[0])}, ${formatBeat(noteRange[1])})`
  const loopRange: RrandRange | undefined = loop.rrandParams[key]
  if (loopRange) return `rrand(${formatBeat(loopRange[0])}, ${formatBeat(loopRange[1])})`
  return String(fixedValue)
}

// Same but for step-level rrand (sample loops)
function resolveStepParam(
  key: string,
  stepParams: Record<string, number>,
  stepRrandParams: Record<string, RrandRange>,
): string | null {
  const range: RrandRange | undefined = stepRrandParams[key]
  if (range) return `rrand(${formatBeat(range[0])}, ${formatBeat(range[1])})`
  if (key in stepParams) return String(stepParams[key])
  return null  // use default — omit from output
}

// ── MIDI → Sonic Pi note name ──────────────────────────────

const NOTE_NAMES = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b'] as const

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const name = NOTE_NAMES[midi % 12]
  return `${name}${octave}`
}

// ── Step duration ──────────────────────────────────────────
// Returns the duration of one step in beats.
// e.g. 16 steps, 4/4, 1 bar → 0.25 beats per step

function stepDuration(loop: StudioLoop, timeSignature: [number, number]): number {
  const beatsPerBar = timeSignature[0]
  return (beatsPerBar / loop.steps) * loop.bars
}

// Synths that support filter resonance
const RES_SYNTHS = new Set(['prophet', 'tb303', 'hollow', 'dark_ambience', 'blade'])

// ── Synth loop body ────────────────────────────────────────

// Emit one synth call line for a note (no leading indent — caller adds it)
function buildNoteLines(note: StudioNote, loop: StudioLoop, stepDur: number): string {
  const noteName = midiToNoteName(note.note)
  const durBeats = formatBeat(note.duration * stepDur)
  const ampFixed = parseFloat((note.velocity * getEffectiveParam(note, loop, 'amp')).toFixed(2))
  const cutoffFixed  = getEffectiveParam(note, loop, 'cutoff')
  const resFixed     = getEffectiveParam(note, loop, 'res')
  const attackFixed  = getEffectiveParam(note, loop, 'attack')
  const decayFixed   = getEffectiveParam(note, loop, 'decay')
  const sustainFixed = getEffectiveParam(note, loop, 'sustain')
  const releaseFixed = getEffectiveParam(note, loop, 'release')
  const panFixed     = getEffectiveParam(note, loop, 'pan')

  const cutoffStr  = resolveParam('cutoff',  note, loop, cutoffFixed)
  const resStr     = resolveParam('res',     note, loop, resFixed)
  const attackStr  = resolveParam('attack',  note, loop, attackFixed)
  const decayStr   = resolveParam('decay',   note, loop, decayFixed)
  const sustainStr = resolveParam('sustain', note, loop, sustainFixed)
  const panStr     = resolveParam('pan',     note, loop, panFixed)

  const ampRrand = note.rrandParams['amp'] ?? loop.rrandParams['amp']
  const ampStr = ampRrand
    ? `rrand(${formatBeat(note.velocity * ampRrand[0])}, ${formatBeat(note.velocity * ampRrand[1])})`
    : String(ampFixed)

  const synthParams: string[] = [`note: :${noteName}`]
  synthParams.push(`amp: ${ampStr}`)

  const isRrandCutoff = 'cutoff' in note.rrandParams || 'cutoff' in loop.rrandParams
  if (isRrandCutoff || cutoffFixed !== PARAM_DEFAULTS['cutoff']) synthParams.push(`cutoff: ${cutoffStr}`)

  if (RES_SYNTHS.has(loop.synth)) {
    const isRrandRes = 'res' in note.rrandParams || 'res' in loop.rrandParams
    if (isRrandRes || resFixed !== PARAM_DEFAULTS['res']) synthParams.push(`res: ${resStr}`)
  }

  const isRrandAttack = 'attack' in note.rrandParams || 'attack' in loop.rrandParams
  if (isRrandAttack || attackFixed !== PARAM_DEFAULTS['attack']) synthParams.push(`attack: ${attackStr}`)

  const isRrandDecay = 'decay' in note.rrandParams || 'decay' in loop.rrandParams
  if (isRrandDecay || decayFixed !== PARAM_DEFAULTS['decay']) synthParams.push(`decay: ${decayStr}`)

  const isRrandSustain = 'sustain' in note.rrandParams || 'sustain' in loop.rrandParams
  if (isRrandSustain || sustainFixed !== PARAM_DEFAULTS['sustain']) synthParams.push(`sustain: ${sustainStr}`)

  const isRrandRelease = 'release' in note.rrandParams || 'release' in loop.rrandParams
  const releaseBeats = isRrandRelease
    ? resolveParam('release', note, loop, releaseFixed)
    : note.params['release'] !== undefined ? formatBeat(releaseFixed) : durBeats
  synthParams.push(`release: ${releaseBeats}`)

  const isRrandPan = 'pan' in note.rrandParams || 'pan' in loop.rrandParams
  if (isRrandPan || panFixed !== PARAM_DEFAULTS['pan']) synthParams.push(`pan: ${panStr}`)

  return `synth :${loop.synth}, ${synthParams.join(', ')}`
}

// Emit notes within [startStep, endStep] with cursor tracking; indent each line with `indent`
function emitNoteRange(
  notes: StudioNote[],
  loop: StudioLoop,
  stepDur: number,
  startStep: number,
  endStep: number,
  indent: string,
): string[] {
  const lines: string[] = []
  const inRange = notes.filter((n) => n.step >= startStep && n.step <= endStep)
  let cursor = startStep

  for (const note of inRange) {
    if (note.step > cursor) {
      lines.push(`${indent}sleep ${formatBeat((note.step - cursor) * stepDur)}`)
    }
    lines.push(`${indent}${buildNoteLines(note, loop, stepDur)}`)
    cursor = note.step + 1
  }

  // Sleep to end of range
  if (cursor <= endStep) {
    lines.push(`${indent}sleep ${formatBeat((endStep - cursor + 1) * stepDur)}`)
  }

  return lines
}

function buildSynthBody(loop: StudioLoop, timeSignature: [number, number]): string[] {
  const lines: string[] = []
  const stepDur = stepDuration(loop, timeSignature)
  const totalSteps = loop.steps * loop.bars

  if (loop.notes.length === 0 && loop.repeatGroups.length === 0) {
    const totalBeats = timeSignature[0] * loop.bars
    lines.push(`  sleep ${formatBeat(totalBeats)}`)
    return lines
  }

  const sorted = [...loop.notes].sort((a, b) => a.step - b.step)
  const groups = [...loop.repeatGroups].sort((a, b) => a.startStep - b.startStep)

  let cursor = 0

  for (const group of groups) {
    // Emit normal notes before this group
    const beforeNotes = sorted.filter(
      (n) => n.step >= cursor && n.step < group.startStep
    )
    for (const note of beforeNotes) {
      if (note.step > cursor) {
        lines.push(`  sleep ${formatBeat((note.step - cursor) * stepDur)}`)
      }
      lines.push(`  ${buildNoteLines(note, loop, stepDur)}`)
      cursor = note.step + 1
    }

    // Sleep gap between last note and group start
    if (cursor < group.startStep) {
      lines.push(`  sleep ${formatBeat((group.startStep - cursor) * stepDur)}`)
    }

    // Emit the repeat block
    lines.push(`  ${group.count}.times do`)
    const innerNotes = sorted.filter(
      (n) => n.step >= group.startStep && n.step <= group.endStep
    )
    const innerLines = emitNoteRange(innerNotes, loop, stepDur, group.startStep, group.endStep, '    ')
    lines.push(...innerLines)
    lines.push(`  end`)

    cursor = group.endStep + 1
  }

  // Emit remaining notes after last group
  const afterNotes = sorted.filter((n) => n.step >= cursor)
  for (const note of afterNotes) {
    if (note.step > cursor) {
      lines.push(`  sleep ${formatBeat((note.step - cursor) * stepDur)}`)
    }
    lines.push(`  ${buildNoteLines(note, loop, stepDur)}`)
    cursor = note.step + 1
  }

  // Sleep to end of loop
  if (cursor < totalSteps) {
    lines.push(`  sleep ${formatBeat((totalSteps - cursor) * stepDur)}`)
  }

  return lines
}

// ── Sample loop body ───────────────────────────────────────

function buildSampleBody(loop: StudioLoop, timeSignature: [number, number]): string[] {
  const lines: string[] = []
  const stepDur    = stepDuration(loop, timeSignature)
  const totalSteps = loop.steps * loop.bars
  const loopPan    = loop.params['pan'] ?? 0

  let anyActive    = false
  let pendingSleep = 0

  for (let i = 0; i < totalSteps; i++) {
    if (loop.activeSteps[i]) {
      anyActive = true
      if (pendingSleep > 0) {
        lines.push(`  sleep ${formatBeat(pendingSleep)}`)
        pendingSleep = 0
      }

      // Build per-step args: merge loop-level pan with step overrides
      const stepParams   = loop.stepParams[i] ?? {}
      const stepRrand    = loop.stepRrandParams[i] ?? {}
      const argParts: string[] = []

      // Non-pan params: emit when step has an override or rrand
      for (const key of ['amp', 'rate', 'lpf', 'hpf']) {
        const resolved = resolveStepParam(key, stepParams, stepRrand)
        if (resolved !== null) argParts.push(`${key}: ${resolved}`)
      }

      // pan: step rrand/override takes priority; fall back to loop-level pan
      const stepPan = resolveStepParam('pan', stepParams, stepRrand)
      if (stepPan !== null) {
        argParts.push(`pan: ${stepPan}`)
      } else if (loopPan !== 0) {
        argParts.push(`pan: ${loopPan}`)
      }

      const sampleArgs = argParts.length > 0 ? `, ${argParts.join(', ')}` : ''
      lines.push(`  sample :${loop.sample}${sampleArgs}`)
      pendingSleep = stepDur
    } else {
      pendingSleep += stepDur
    }
  }

  if (pendingSleep > 0) lines.push(`  sleep ${formatBeat(pendingSleep)}`)

  if (!anyActive) {
    return [`  sleep ${formatBeat(totalSteps * stepDur)}`]
  }

  return lines
}

// ── FX wrapping ────────────────────────────────────────────

const FX_MIX_DEFAULT = 0.4

function wrapWithFxEntry(fxKey: string, fxParams: Record<string, number>, bodyLines: string[]): string[] {
  const mix = fxParams['mix'] ?? FX_MIX_DEFAULT
  const mixPart = mix !== FX_MIX_DEFAULT ? `, mix: ${mix}` : ''

  // Emit additional FX-specific params that differ from defaults
  const FX_DEFAULTS: Record<string, number> = {
    room: 0.6, damp: 0.5, spread: 0.5, phase: 0.25, decay: 0.5,
    distort: 0.5, bits: 8, sample_rate: 10000, gain: 5,
    cutoff_min: 60, cutoff_max: 120, res: 0.8, feedback: 0,
    depth: 0.5, wave: 3, pitch: 0, pan: 0, freq: 30, cutoff: 100,
  }
  const extraParts: string[] = []
  for (const [key, val] of Object.entries(fxParams)) {
    if (key === 'mix') continue
    if (FX_DEFAULTS[key] !== undefined && val !== FX_DEFAULTS[key]) {
      extraParts.push(`${key}: ${val}`)
    }
  }

  const allParts = [mixPart, ...extraParts].filter(Boolean).join(', ')
  const header = allParts ? `  with_fx :${fxKey}, ${allParts} do` : `  with_fx :${fxKey} do`

  return [
    header,
    ...bodyLines.map((l) => `  ${l}`),
    `  end`,
  ]
}

// ── Loop block ─────────────────────────────────────────────

function buildLoopHeader(loop: StudioLoop): string {
  if (loop.syncMode === 'sync_to' && loop.syncTarget) {
    return `live_loop :${loop.name}, sync: :${loop.syncTarget} do`
  }
  if (loop.syncMode === 'free') {
    return `live_loop :${loop.name}, delay: 0 do`
  }
  return `live_loop :${loop.name} do`
}

function buildLoopBlock(loop: StudioLoop, timeSignature: [number, number]): string {
  const bodyLines =
    loop.type === 'synth'
      ? buildSynthBody(loop, timeSignature)
      : buildSampleBody(loop, timeSignature)

  // Wrap from innermost (last) to outermost (first)
  let wrappedLines = bodyLines
  for (let i = loop.fxChain.length - 1; i >= 0; i--) {
    const entry = loop.fxChain[i]
    wrappedLines = wrapWithFxEntry(entry.fxKey, entry.params, wrappedLines)
  }

  return [
    buildLoopHeader(loop),
    ...wrappedLines,
    `end`,
  ].join('\n')
}

// ── Helpers ────────────────────────────────────────────────

function formatBeat(beats: number): string {
  // Avoid floating-point noise: round to 4 decimal places, strip trailing zeros
  const rounded = parseFloat(beats.toFixed(4))
  return String(rounded)
}

// ── Public API ─────────────────────────────────────────────

export function generateCode(state: StudioSnapshot): string {
  const activeLops = state.loops.filter((l) => !l.muted)

  if (activeLops.length === 0) {
    return `use_bpm ${state.bpm}\n\n# No active loops`
  }

  const parts: string[] = [`use_bpm ${state.bpm}`]

  for (const loop of activeLops) {
    parts.push(buildLoopBlock(loop, state.timeSignature))
  }

  return parts.join('\n\n')
}
