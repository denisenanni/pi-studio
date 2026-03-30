import type { StudioSnapshot, StudioLoop } from './types'

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
    const amp = note.velocity.toFixed(2)
    lines.push(`  synth :${loop.synth}, note: :${noteName}, amp: ${amp}, cutoff: 80, attack: 0.1, release: ${durBeats}`)

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

function wrapWithFx(fx: string, bodyLines: string[]): string[] {
  return [
    `  with_fx :${fx} do`,
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
    loop.fx !== 'none' ? wrapWithFx(loop.fx, bodyLines) : bodyLines

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
