// Durations measured from the actual FLAC files using music-metadata (scripts/read-loop-metadata.mjs).
// originalBpm is derived from (beats * 60) / duration for rhythmic loops, 0 for ambient.
// isAmbient = true for drone/pad loops with no clear rhythmic pulse.

export type LoopInfo = {
  name: string        // Repeated from the record key — preserved for ALL_LOOPS iteration
  duration: number    // Original duration in seconds (measured)
  originalBpm: number // 0 if ambient/unknown
  beats: number       // 0 if ambient/unknown
  isAmbient: boolean  // true for drone/pad loops with no clear rhythm
}

export const LOOP_DURATIONS: Record<string, LoopInfo> = {
  loop_amen:        { name: 'loop_amen',        duration: 1.753, originalBpm: 137, beats: 4,  isAmbient: false }, // Classic Amen break
  loop_amen_full:   { name: 'loop_amen_full',   duration: 6.857, originalBpm: 140, beats: 16, isAmbient: false }, // Extended Amen
  loop_breakbeat:   { name: 'loop_breakbeat',   duration: 1.905, originalBpm: 126, beats: 4,  isAmbient: false },
  loop_compus:      { name: 'loop_compus',      duration: 6.486, originalBpm: 74,  beats: 8,  isAmbient: false },
  loop_drone_g_97:  { name: 'loop_drone_g_97',  duration: 4.948, originalBpm: 0,   beats: 0,  isAmbient: true  },
  loop_electric:    { name: 'loop_electric',    duration: 2.474, originalBpm: 97,  beats: 4,  isAmbient: false },
  loop_garzul:      { name: 'loop_garzul',      duration: 8.000, originalBpm: 0,   beats: 0,  isAmbient: true  },
  loop_industrial:  { name: 'loop_industrial',  duration: 0.884, originalBpm: 136, beats: 2,  isAmbient: false },
  loop_mehackit1:   { name: 'loop_mehackit1',   duration: 2.474, originalBpm: 97,  beats: 4,  isAmbient: false },
  loop_mehackit2:   { name: 'loop_mehackit2',   duration: 2.474, originalBpm: 97,  beats: 4,  isAmbient: false },
  loop_mika:        { name: 'loop_mika',        duration: 8.000, originalBpm: 0,   beats: 0,  isAmbient: true  },
  loop_perc1:       { name: 'loop_perc1',       duration: 2.474, originalBpm: 97,  beats: 4,  isAmbient: false },
  loop_perc2:       { name: 'loop_perc2',       duration: 2.474, originalBpm: 97,  beats: 4,  isAmbient: false },
  loop_safari:      { name: 'loop_safari',      duration: 8.005, originalBpm: 0,   beats: 0,  isAmbient: true  },
  loop_tabla:       { name: 'loop_tabla',       duration: 10.674, originalBpm: 90, beats: 16, isAmbient: false },
  loop_weirdo:      { name: 'loop_weirdo',      duration: 4.948, originalBpm: 97,  beats: 8,  isAmbient: false },
  loop_3d_printer:  { name: 'loop_3d_printer',  duration: 7.959, originalBpm: 60,  beats: 8,  isAmbient: false },
}

export const ALL_LOOPS: LoopInfo[] = Object.values(LOOP_DURATIONS)
