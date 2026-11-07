/**
 * Scans public/img/, public/audio/sound/, and public/audio/music/ and generates
 * src/js/engine/assets.js with named constants for every image, sound, and music file.
 * Run via: npm run generate-assets
 */

import {existsSync, readdirSync, statSync, writeFileSync} from 'node:fs'
import {basename, dirname, extname, join, relative, sep} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMG_DIR = join(ROOT, 'public', 'img')
const SND_DIR = join(ROOT, 'public', 'audio', 'sound')
const MUS_DIR = join(ROOT, 'public', 'audio', 'music')
const OUTPUT = join(ROOT, 'src', 'js', 'engine', 'assets.js')

// Group display names keyed by directory path relative to img/
const GROUP_LABELS = {
  resources: 'Resources',
  'buildings/misc': 'Buildings — misc',
  'buildings/religious': 'Buildings — religious',
  'buildings/resources': 'Buildings — resources',
  'buildings/military': 'Buildings — military',
  units: 'Units',
  ico: 'Icons',
  other: 'Other',
  punishments: 'Punishments',
  blessings: 'Blessings',
  seasons: 'Seasons',
}

/**
 * Recursively collects all files under a directory.
 * Returns paths relative to the base directory, with '/' separators on every platform.
 */
function collectFiles(dir, base = dir) {
  const entries = readdirSync(dir).sort()
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, base))
    } else {
      // Always use '/' so group lookups and emitted paths match on Windows too
      files.push(relative(base, full).split(sep).join('/'))
    }
  }
  return files
}

/**
 * Derives a constant name from a path relative to img/.
 * e.g. "resources/food.png" → "IMG_RESOURCE_FOOD"
 *      "buildings/misc/academy.jpg" → "IMG_BUILDING_ACADEMY"
 */
function toConstantName(relPath) {
  const withoutExt = relPath.replace(extname(relPath), '')
  const parts = withoutExt.split('/')

  // For buildings/subfolder/name, drop the subfolder
  if (parts[0] === 'buildings' && parts.length === 3) {
    parts.splice(1, 1)
  }

  // Singularize first segment (remove trailing 's')
  if (parts[0].endsWith('s')) {
    parts[0] = parts[0].slice(0, -1)
  }

  return 'IMG_' + parts.join('_').toUpperCase()
}

/**
 * Returns the group key for a file path (directory relative to img/).
 * e.g. "resources/food.png" → "resources"
 *      "buildings/misc/academy.jpg" → "buildings/misc"
 */
function groupKey(relPath) {
  const parts = relPath.split('/')
  // For buildings, group by subfolder
  if (parts[0] === 'buildings' && parts.length === 3) {
    return parts[0] + '/' + parts[1]
  }
  return parts[0]
}

// Collect and group files
const allFiles = collectFiles(IMG_DIR)
const groups = new Map()

for (const file of allFiles) {
  const key = groupKey(file)
  if (!groups.has(key)) {
    groups.set(key, [])
  }
  groups.get(key).push(file)
}

// Collect audio files
const soundFiles = existsSync(SND_DIR) ? collectFiles(SND_DIR) : []
const musicFiles = existsSync(MUS_DIR) ? collectFiles(MUS_DIR) : []

// Build output
const lines = ['// Asset path constants — centralized references to all public image, sound, and music files.']
const resourceEntries = []
const punishmentEntries = []
const blessingEntries = []

for (const [
  dirKey,
  label,
] of Object.entries(GROUP_LABELS)) {
  const files = groups.get(dirKey)
  if (!files || files.length === 0) {
    continue
  }

  lines.push('')
  lines.push(`// ${label}`)
  for (const file of files) {
    const name = toConstantName(file)
    const imgPath = '/img/' + file
    lines.push(`export const ${name} = '${imgPath}'`)

    if (dirKey === 'resources') {
      const key = basename(file, extname(file))
      resourceEntries.push({
        key: key,
        name: name,
      })
    }

    if (dirKey === 'punishments') {
      const key = basename(file, extname(file)).replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      punishmentEntries.push({
        key: key,
        name: name,
      })
    }

    if (dirKey === 'blessings') {
      const key = basename(file, extname(file)).replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      blessingEntries.push({
        key: key,
        name: name,
      })
    }
  }
}

// Resource map
if (resourceEntries.length > 0) {
  lines.push('')
  lines.push('// Resource image lookup by key (for dynamic :src bindings)')
  lines.push('export const IMG_RESOURCE_MAP = {')
  for (const {
    key,
    name,
  } of resourceEntries) {
    lines.push(`  ${key}: ${name},`)
  }
  lines.push('}')
}

// Punishment image lookup by key (for dynamic :src bindings)
if (punishmentEntries.length > 0) {
  lines.push('')
  lines.push('// Punishment image lookup by key (for dynamic :src bindings)')
  lines.push('export const IMG_PUNISHMENT_MAP = {')
  for (const {
    key,
    name,
  } of punishmentEntries) {
    lines.push(`  ${key}: ${name},`)
  }
  lines.push('}')
}

// Blessing image lookup by key (for dynamic :src bindings)
if (blessingEntries.length > 0) {
  lines.push('')
  lines.push('// Blessing image lookup by key (for dynamic :src bindings)')
  lines.push('export const IMG_BLESSING_MAP = {')
  for (const {
    key,
    name,
  } of blessingEntries) {
    lines.push(`  ${key}: ${name},`)
  }
  lines.push('}')
}

// Sounds
if (soundFiles.length > 0) {
  lines.push('')
  lines.push('// Sounds')
  for (const file of soundFiles) {
    const withoutExt = basename(file, extname(file))
    const name = 'SND_' + withoutExt.toUpperCase()
    const sndPath = '/audio/sound/' + file
    lines.push(`export const ${name} = '${sndPath}'`)
  }
}

// Music
if (musicFiles.length > 0) {
  lines.push('')
  lines.push('// Music')
  for (const file of musicFiles) {
    const withoutExt = basename(file, extname(file))
    const name = 'MUS_' + withoutExt.toUpperCase()
    const musPath = '/audio/music/' + file
    lines.push(`export const ${name} = '${musPath}'`)
  }
}

lines.push('')

const totalAssets = allFiles.length + soundFiles.length + musicFiles.length
writeFileSync(OUTPUT, lines.join('\n'))
console.log(`Generated ${OUTPUT} (${totalAssets} assets)`)
