import { parseFile } from 'music-metadata'
import { readdirSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const samplesDir = resolve(__dirname, '../public/samples')

const files = readdirSync(samplesDir).filter(
  (f) => f.startsWith('loop_') && f.endsWith('.flac'),
)

const result = {}

for (const file of files.sort()) {
  const name = file.replace('.flac', '')
  const filePath = join(samplesDir, file)
  try {
    const meta = await parseFile(filePath)
    const duration = meta.format.duration ?? null
    const bpm = meta.common.bpm ?? null

    // Collect any text tags that might indicate tempo or description
    const tags = {}
    if (meta.common.comment?.length) tags.comment = meta.common.comment
    if (meta.common.description?.length) tags.description = meta.common.description
    if (meta.native) {
      for (const [, tagList] of Object.entries(meta.native)) {
        for (const tag of tagList) {
          if (['BPM', 'TBPM', 'TEMPO', 'COMMENT', 'DESCRIPTION'].includes(tag.id?.toUpperCase())) {
            tags[tag.id] = tag.value
          }
        }
      }
    }

    result[name] = { duration, bpm, tags }
  } catch (err) {
    result[name] = { duration: null, bpm: null, tags: {}, error: String(err) }
  }
}

console.log(JSON.stringify(result, null, 2))
