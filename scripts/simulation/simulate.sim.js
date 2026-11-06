// Balance simulation entry (npm run simulate): every bot plays every seed headlessly, then the report is
// printed and saved as JSON in scripts/simulation/reports/.
//
// Options (environment variables):
//   SIM_BOTS       comma list of bot names (default: all — weak, average, strong)
//   SIM_RUNS       seeds per bot (default 20)
//   SIM_SEED       base seed; run i uses SIM_SEED + i, the same seeds for every bot (default 1)
//   SIM_MAX_HOURS  game hours before a run ends unfinished (default 5)
//   SIM_STEP       game seconds per simulation step (default 1)
//   SIM_ASSERT     1 or true: fail when a done criterion (report.js DONE_CRITERIA) is unmet
//   SIM_SCALING    0 or false: challenges keep the fixed values of challenges.json (default: scaled)
//   SIM_CALIBRATE  1 or true: add what the average bot's colony could meet of each challenge (calibration.js)

import {mkdirSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it, vi} from 'vitest'
import storage from '@/js/engine/storage.js'
import {BOT_PROFILES} from './bots/bot_profiles.js'
import {runGame} from './harness.js'
import {buildReport, formatReport, unmetCriteria} from './report.js'

// Same engine stand-ins as the state tests: no analytics, audio or localStorage, and raw text keys
vi.mock('@/js/engine/analytics.js', () => ({
  default: {
    logTutorialComplete: vi.fn(),
  },
}))

vi.mock('@/js/engine/audio.js', () => ({
  default: {
    playSound: vi.fn(),
  },
}))

vi.mock('@/js/engine/storage.js', () => ({
  default: {
    tutorialCompleted: false,
  },
}))

vi.mock('@/js/i18n/localized.js', () => ({
  t: (key) => key,
}))

const DEFAULT_RUNS = 20 // Seeds per bot
const DEFAULT_SEED = 1 // Base seed
const DEFAULT_MAX_HOURS = 5 // Game hours before a run ends unfinished
const DEFAULT_STEP = 1 // Game seconds per simulation step
const SECONDS_PER_HOUR = 3600
const REPORTS_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'reports')

/**
 * Reads a positive number from the environment.
 * @param {string} name - Variable name
 * @param {number} fallback - Value when the variable is not set
 * @param {boolean} integer - Whether only whole numbers are allowed
 * @returns {number} Parsed value
 */
function readNumber(name, fallback, integer) {
  const text = process.env[name]
  if (text === undefined || text === '') {
    return fallback
  }
  const value = Number(text)
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be a positive ${integer ? 'whole ' : ''}number, got "${text}"`)
  }
  return value
}

/**
 * Reads the simulation options from the environment.
 * @returns {{profiles: Object[], runs: number, seed: number, maxHours: number, step: number, assert: boolean, scaling: boolean, calibrate: boolean}} Options
 */
function readOptions() {
  const names = (process.env.SIM_BOTS ?? '').split(',').map(name => name.trim()).filter(Boolean)
  const profiles = names.length === 0 ? BOT_PROFILES : names.map(name => {
    const profile = BOT_PROFILES.find(entry => entry.name === name)
    if (!profile) {
      throw new Error(`Unknown bot "${name}" in SIM_BOTS (known: ${BOT_PROFILES.map(entry => entry.name).join(', ')})`)
    }
    return profile
  })
  return {
    profiles: profiles,
    runs: readNumber('SIM_RUNS', DEFAULT_RUNS, true),
    seed: readNumber('SIM_SEED', DEFAULT_SEED, true),
    maxHours: readNumber('SIM_MAX_HOURS', DEFAULT_MAX_HOURS, false),
    step: readNumber('SIM_STEP', DEFAULT_STEP, false),
    assert: [
      '1',
      'true',
    ].includes(process.env.SIM_ASSERT ?? ''),
    scaling: ![
      '0',
      'false',
    ].includes(process.env.SIM_SCALING ?? ''),
    calibrate: [
      '1',
      'true',
    ].includes(process.env.SIM_CALIBRATE ?? ''),
  }
}

describe('simulation', () => {
  it('plays every bot on every seed and reports the results', () => {
    const options = readOptions()
    const started = performance.now()
    const runsByBot = {}
    for (const profile of options.profiles) {
      runsByBot[profile.name] = []
      for (let run = 0; run < options.runs; run++) {
        const seed = options.seed + run
        // A finished tutorial is remembered on the (mocked) device; every run starts as a first game
        storage.tutorialCompleted = false
        runsByBot[profile.name].push({
          seed: seed,
          ...runGame({
            profile: profile,
            seed: seed,
            maxSeconds: options.maxHours * SECONDS_PER_HOUR,
            step: options.step,
            scaling: options.scaling,
          }),
        })
      }
    }
    const reportOptions = {
      bots: options.profiles.map(profile => profile.name),
      runs: options.runs,
      seed: options.seed,
      maxHours: options.maxHours,
      step: options.step,
      scaling: options.scaling,
      calibrate: options.calibrate,
    }
    const report = buildReport(runsByBot, reportOptions)
    console.log('\n' + formatReport(report))

    mkdirSync(REPORTS_DIRECTORY, {
      recursive: true,
    })
    const scalingSuffix = options.scaling ? '' : '_noscaling'
    const file = join(REPORTS_DIRECTORY, `report_${reportOptions.bots.join('-')}_seed${options.seed}_runs${options.runs}${scalingSuffix}.json`)
    writeFileSync(file, JSON.stringify({
      report: report,
      runs: runsByBot,
    }, null, 2) + '\n')
    console.log(`\nSaved ${file}`)
    console.log(`Simulated in ${((performance.now() - started) / 1000).toFixed(1)} s`)

    if (options.assert) {
      expect(unmetCriteria(report)).toEqual([])
    }
  })
})
