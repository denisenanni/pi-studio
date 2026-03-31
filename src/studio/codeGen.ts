import type { StudioSnapshot, StudioLoop, StudioNote } from './types'

// ── Param defaults (used to decide what to include in output) ──────────────

const PARAM_DEFAULTS: Record<string, number> = {
  cutoff:     80,
  res:        0.50,
  attack:     0.10,
  release:    0.50,
  amp:        1.0,
  reverb_mix: 0.40,
}

function getParam(loop: StudioLoop, key: string): number {
  return loop.params[key] ?? PARAM_DEFAULTS[key] ?? 0
}

function getEffectiveParam(note: StudioNote, loop: StudioLoop, key: string): number {
  return note.params[key] ?? loop.params[key] ?? PARAM_DEFAULTS[key] ?? 0
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

function buildSynthBody(loop: StudioLoop, timeSignature: [number, number]): string[] {
  const lines: string[] = []
  const stepDur = stepDuration(loop, timeSignature)

  if (loop.notes.length === 0) {
    // Emit a rest for the full loop duration so it stays in sync
    const totalBeats = timeSignature[0] * loop.bars
    lines.push(`  sleep ${formatBeat(totalBeats)}`)
    return lines
  }

  // Sort notes by step, then emit each with a sleep to the next note (or loop end)
  const sorted = [...loop.notes].sort((a, b) => a.step - b.step)
  let cursor = 0

  for (let i = 0; i < sorted.length; i++) {
    const note = sorted[i]

    // Sleep to this note's start if there's a gap
    if (note.step > cursor) {
      lines.push(`  sleep ${formatBeat((note.step - cursor) * stepDur)}`)
    }

    const noteName = midiToNoteName(note.note)
    const durBeats = formatBeat(note.duration * stepDur)
    const ampVal = parseFloat((note.velocity * getEffectiveParam(note, loop, 'amp')).toFixed(2))
    const cutoff  = getEffectiveParam(note, loop, 'cutoff')
    const res     = getEffectiveParam(note, loop, 'res')
    const attack  = getEffectiveParam(note, loop, 'attack')
    const release = getEffectiveParam(note, loop, 'release')

    // Build param list — only include values that differ from their defaults
    const synthParams: string[] = [`note: :${noteName}`]
    // amp is always included (note velocity × amp param)
    synthParams.push(`amp: ${ampVal}`)
    if (cutoff !== PARAM_DEFAULTS['cutoff']) synthParams.push(`cutoff: ${cutoff}`)
    if (RES_SYNTHS.has(loop.synth) && res !== PARAM_DEFAULTS['res']) synthParams.push(`res: ${res}`)
    if (attack !== PARAM_DEFAULTS['attack']) synthParams.push(`attack: ${attack}`)
    // release: use note duration unless overridden per-note
    const releaseBeats = note.params['release'] !== undefined ? formatBeat(release) : durBeats
    synthParams.push(`release: ${releaseBeats}`)

    lines.push(`  synth :${loop.synth}, ${synthParams.join(', ')}`)

    cursor = note.step + 1
  }

  // Sleep to end of loop
  const totalSteps = loop.steps * loop.bars
  if (cursor < totalSteps) {
    lines.push(`  sleep ${formatBeat((totalSteps - cursor) * stepDur)}`)
  }

  return lines
}

// ── Sample loop body ───────────────────────────────────────

function buildSampleBody(loop: StudioLoop, timeSignature: [number, number]): string[] {
  const lines: string[] = []
  const stepDur = stepDuration(loop, timeSignature)
  const totalSteps = loop.steps * loop.bars

  let anyActive = false
  for (let i = 0; i < totalSteps; i++) {
    if (loop.activeSteps[i]) {
      anyActive = true
      lines.push(`  sample :${loop.sample}`)
    }
    lines.push(`  sleep ${formatBeat(stepDur)}`)
  }

  if (!anyActive) {
    // All steps silent — emit a single rest for the full loop
    lines.splice(0)
    lines.push(`  sleep ${formatBeat(totalSteps * stepDur)}`)
  }

  return lines
}

// ── FX wrapping ────────────────────────────────────────────

function wrapWithFx(fx: string, mix: number, bodyLines: string[]): string[] {
  const mixPart = mix !== PARAM_DEFAULTS['reverb_mix'] ? `, mix: ${mix}` : ''
  return [
    `  with_fx :${fx}${mixPart} do`,
    ...bodyLines.map((l) => `  ${l}`),
    `  end`,
  ]
}

// ── Loop block ─────────────────────────────────────────────

function buildLoopBlock(loop: StudioLoop, timeSignature: [number, number]): string {
  const bodyLines =
    loop.type === 'synth'
      ? buildSynthBody(loop, timeSignature)
      : buildSampleBody(loop, timeSignature)

  const wrappedLines =
    loop.fx !== 'none' ? wrapWithFx(loop.fx, getParam(loop, 'reverb_mix'), bodyLines) : bodyLines

  return [
    `live_loop :${loop.name} do`,
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
