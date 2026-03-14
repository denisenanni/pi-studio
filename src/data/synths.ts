export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export function noteToMidi(note: NoteName, octave: number): number {
  return (octave + 1) * 12 + NOTE_NAMES.indexOf(note);
}

export type SynthParam = {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
};

export type SynthDefinition = {
  name: string; // Sonic Pi name e.g. "prophet"
  supersonicName: string; // e.g. "sonic-pi-prophet"
  label: string; // Display name e.g. "Prophet"
  doc: string; // One-line description
  params: SynthParam[]; // Interactive params only
};

const baseParams: SynthParam[] = [
  { key: "note", label: "Note", default: 60, min: 0, max: 127, step: 1 },
  { key: "amp", label: "Amp", default: 1, min: 0, max: 2, step: 0.01 },
  { key: "attack", label: "Attack", default: 0, min: 0, max: 4, step: 0.01 },
  { key: "release", label: "Release", default: 1, min: 0, max: 8, step: 0.01 },
];

const filterParams: SynthParam[] = [
  { key: "cutoff", label: "Cutoff", default: 100, min: 0, max: 130, step: 1 },
  { key: "res", label: "Res", default: 0.5, min: 0, max: 0.99, step: 0.01 },
];

function sp(name: string): string {
  return `sonic-pi-${name}`;
}

export const SYNTHS: SynthDefinition[] = [
  {
    name: "beep",
    supersonicName: sp("beep"),
    label: "Beep",
    doc: "Pure sine wave tone.",
    params: baseParams,
  },
  {
    name: "blade",
    supersonicName: sp("blade"),
    label: "Blade",
    doc: "Blade-like synth with resonant filter.",
    params: [...baseParams, ...filterParams],
  },
  {
    name: "bnoise",
    supersonicName: sp("bnoise"),
    label: "BNoise",
    doc: "Brown noise generator.",
    params: baseParams,
  },
  {
    name: "bass",
    supersonicName: sp("bass_foundation"),
    label: "Bass Foundation",
    doc: "Deep sub-bass synth.",
    params: baseParams,
  },
  {
    name: "chipbass",
    supersonicName: sp("chipbass"),
    label: "Chip Bass",
    doc: "8-bit chiptune bass.",
    params: [
      ...baseParams,
      { key: "wave", label: "Wave", default: 0, min: 0, max: 2, step: 1 },
    ],
  },
  {
    name: "chiplead",
    supersonicName: sp("chiplead"),
    label: "Chip Lead",
    doc: "8-bit chiptune lead.",
    params: [
      ...baseParams,
      { key: "wave", label: "Wave", default: 0, min: 0, max: 2, step: 1 },
    ],
  },
  {
    name: "dark_ambience",
    supersonicName: sp("dark_ambience"),
    label: "Dark Ambience",
    doc: "Dark, atmospheric pad.",
    params: [...baseParams, ...filterParams],
  },
  {
    name: "dpulse",
    supersonicName: sp("dpulse"),
    label: "DPulse",
    doc: "Detuned pulse wave synth.",
    params: [
      ...baseParams,
      {
        key: "detune",
        label: "Detune",
        default: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "dsaw",
    supersonicName: sp("dsaw"),
    label: "DSaw",
    doc: "Detuned sawtooth synth.",
    params: [
      ...baseParams,
      {
        key: "detune",
        label: "Detune",
        default: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "dtri",
    supersonicName: sp("dtri"),
    label: "DTri",
    doc: "Detuned triangle wave synth.",
    params: [
      ...baseParams,
      {
        key: "detune",
        label: "Detune",
        default: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "fm",
    supersonicName: sp("fm"),
    label: "FM",
    doc: "Classic FM synthesis.",
    params: [
      ...baseParams,
      {
        key: "divisor",
        label: "Divisor",
        default: 2,
        min: 0.01,
        max: 20,
        step: 0.01,
      },
      { key: "depth", label: "Depth", default: 1, min: 0, max: 10, step: 0.01 },
    ],
  },
  {
    name: "gabberkick",
    supersonicName: sp("gabberkick"),
    label: "Gabber Kick",
    doc: "Hard gabber kick drum synth.",
    params: [
      ...baseParams,
      {
        key: "punch",
        label: "Punch",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "hollow",
    supersonicName: sp("hollow"),
    label: "Hollow",
    doc: "Hollow, breathy pad synth.",
    params: [...baseParams, ...filterParams],
  },
  {
    name: "mod_dsaw",
    supersonicName: sp("mod_dsaw"),
    label: "Mod DSaw",
    doc: "Detuned saw with modulation.",
    params: [
      ...baseParams,
      {
        key: "mod_range",
        label: "Mod Range",
        default: 5,
        min: 0,
        max: 24,
        step: 1,
      },
      {
        key: "mod_rate",
        label: "Mod Rate",
        default: 0.5,
        min: 0,
        max: 4,
        step: 0.01,
      },
    ],
  },
  {
    name: "mod_fm",
    supersonicName: sp("mod_fm"),
    label: "Mod FM",
    doc: "FM synthesis with modulation.",
    params: [
      ...baseParams,
      {
        key: "divisor",
        label: "Divisor",
        default: 2,
        min: 0.01,
        max: 20,
        step: 0.01,
      },
      {
        key: "mod_rate",
        label: "Mod Rate",
        default: 0.5,
        min: 0,
        max: 4,
        step: 0.01,
      },
    ],
  },
  {
    name: "mod_pulse",
    supersonicName: sp("mod_pulse"),
    label: "Mod Pulse",
    doc: "Pulse wave with modulation.",
    params: [
      ...baseParams,
      {
        key: "mod_range",
        label: "Mod Range",
        default: 5,
        min: 0,
        max: 24,
        step: 1,
      },
      {
        key: "mod_rate",
        label: "Mod Rate",
        default: 0.5,
        min: 0,
        max: 4,
        step: 0.01,
      },
    ],
  },
  {
    name: "mod_saw",
    supersonicName: sp("mod_saw"),
    label: "Mod Saw",
    doc: "Sawtooth wave with modulation.",
    params: [
      ...baseParams,
      {
        key: "mod_range",
        label: "Mod Range",
        default: 5,
        min: 0,
        max: 24,
        step: 1,
      },
      {
        key: "mod_rate",
        label: "Mod Rate",
        default: 0.5,
        min: 0,
        max: 4,
        step: 0.01,
      },
    ],
  },
  {
    name: "mod_sine",
    supersonicName: sp("mod_sine"),
    label: "Mod Sine",
    doc: "Sine wave with modulation.",
    params: [
      ...baseParams,
      {
        key: "mod_range",
        label: "Mod Range",
        default: 5,
        min: 0,
        max: 24,
        step: 1,
      },
      {
        key: "mod_rate",
        label: "Mod Rate",
        default: 0.5,
        min: 0,
        max: 4,
        step: 0.01,
      },
    ],
  },
  {
    name: "mod_tri",
    supersonicName: sp("mod_tri"),
    label: "Mod Tri",
    doc: "Triangle wave with modulation.",
    params: [
      ...baseParams,
      {
        key: "mod_range",
        label: "Mod Range",
        default: 5,
        min: 0,
        max: 24,
        step: 1,
      },
      {
        key: "mod_rate",
        label: "Mod Rate",
        default: 0.5,
        min: 0,
        max: 4,
        step: 0.01,
      },
    ],
  },
  {
    name: "noise",
    supersonicName: sp("noise"),
    label: "Noise",
    doc: "White noise generator.",
    params: baseParams,
  },
  {
    name: "organ_tonewheel",
    supersonicName: sp("organ_tonewheel"),
    label: "Organ Tonewheel",
    doc: "Hammond-style tonewheel organ.",
    params: baseParams,
  },
  {
    name: "pluck",
    supersonicName: sp("pluck"),
    label: "Pluck",
    doc: "Karplus-Strong plucked string.",
    params: [
      ...baseParams,
      {
        key: "noise_amp",
        label: "Noise Amp",
        default: 1,
        min: 0,
        max: 2,
        step: 0.01,
      },
    ],
  },
  {
    name: "pretty_bell",
    supersonicName: sp("pretty_bell"),
    label: "Pretty Bell",
    doc: "Delicate bell tone.",
    params: baseParams,
  },
  {
    name: "prophet",
    supersonicName: sp("prophet"),
    label: "Prophet",
    doc: "Sequential Prophet-style subtractive synth.",
    params: [...baseParams, ...filterParams],
  },
  {
    name: "pulse",
    supersonicName: sp("pulse"),
    label: "Pulse",
    doc: "Pulse wave with variable width.",
    params: [
      ...baseParams,
      {
        key: "pulse_width",
        label: "Pulse Width",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "rhodey",
    supersonicName: sp("rhodey"),
    label: "Rhodey",
    doc: "Rhodes electric piano.",
    params: baseParams,
  },
  {
    name: "rodeo",
    supersonicName: sp("rodeo"),
    label: "Rodeo",
    doc: "Bright, twangy synth.",
    params: baseParams,
  },
  {
    name: "saw",
    supersonicName: sp("saw"),
    label: "Saw",
    doc: "Classic sawtooth wave.",
    params: baseParams,
  },
  {
    name: "square",
    supersonicName: sp("square"),
    label: "Square",
    doc: "Classic square wave.",
    params: baseParams,
  },
  {
    name: "subpulse",
    supersonicName: sp("subpulse"),
    label: "Subpulse",
    doc: "Pulse wave with sub oscillator.",
    params: [
      ...baseParams,
      {
        key: "pulse_width",
        label: "Pulse Width",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "supersaw",
    supersonicName: sp("supersaw"),
    label: "Supersaw",
    doc: "Multiple detuned sawtooth waves.",
    params: [
      ...baseParams,
      {
        key: "detune",
        label: "Detune",
        default: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "tb303",
    supersonicName: sp("tb303"),
    label: "TB-303",
    doc: "Roland TB-303 acid bass emulation.",
    params: [...baseParams, ...filterParams],
  },
  {
    name: "tech_saws",
    supersonicName: sp("tech_saws"),
    label: "Tech Saws",
    doc: "Stacked sawtooth techno synth.",
    params: [
      ...baseParams,
      {
        key: "detune",
        label: "Detune",
        default: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "tri",
    supersonicName: sp("tri"),
    label: "Tri",
    doc: "Classic triangle wave.",
    params: baseParams,
  },
  {
    name: "zawa",
    supersonicName: sp("zawa"),
    label: "Zawa",
    doc: "Modulated sawtooth with wobble.",
    params: [
      ...baseParams,
      { key: "phase", label: "Phase", default: 1, min: 0, max: 2, step: 0.01 },
      {
        key: "depth",
        label: "Depth",
        default: 1.5,
        min: 0,
        max: 5,
        step: 0.01,
      },
    ],
  },
];
