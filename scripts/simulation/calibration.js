// Calibration for the balance simulation (SIM_CALIBRATE): what a colony could meet in the target share
// of a challenge's base timer, from its stats when the countdown starts. Each requirement part alone
// first (the most the colony could reach), then every part together at the same share of those maxima.

import {CHALLENGE_MAX_WORKER_REQUIREMENT_SHARE, CHALLENGE_TARGET_TIME_SHARE} from '@/js/engine/balancing.js'
import {estimateCompletionTime} from '@/js/engine/challenge_scaling.js'
import {BUILDING_ALTAR, BUILDING_MONUMENT, BUILDING_TEMPLE} from '@/js/engine/enums.js'

// Building-level requirements (each requirement key is also the building key)
const LEVEL_PARTS = [
  BUILDING_ALTAR,
  BUILDING_TEMPLE,
  BUILDING_MONUMENT,
]

const RESOURCE_PART_PREFIX = 'resources.' // Prefix of a resource requirement's part name
const WORKERS_PART = 'workers' // Part name of the worker requirement
const FIRST_AMOUNT_GUESS = 100 // First upper bound tried for an amount (doubled until it no longer fits)
const MAX_AMOUNT = 10000000 // Largest amount searched
const MAX_LEVELS_ABOVE = 200 // Most levels above the current one searched
const SEARCH_STEPS = 30 // Halvings in each search

/**
 * Names of the parts a challenge's base requirements have.
 * @param {Object} requirements - Base requirements (CHALLENGE_DEFINITIONS entry)
 * @returns {string[]} Part names (requirement keys, resources prefixed)
 */
function partsOf(requirements) {
  const parts = [
    'faith',
    ...LEVEL_PARTS,
    WORKERS_PART,
  ].filter(key => requirements[key] !== null)
  for (const resource of Object.keys(requirements.resources ?? {})) {
    parts.push(RESOURCE_PART_PREFIX + resource)
  }
  return parts
}

/**
 * Base value of a requirement part.
 * @param {Object} requirements - Base requirements
 * @param {string} part - Part name
 * @returns {number} Base value
 */
function baseValue(requirements, part) {
  return part.startsWith(RESOURCE_PART_PREFIX) ? requirements.resources[part.slice(RESOURCE_PART_PREFIX.length)] : requirements[part]
}

/**
 * Requirements holding only the given parts.
 * @param {Object<string, number>} values - Part name → value
 * @returns {Object} Requirements (absent parts null)
 */
function requirementsFrom(values) {
  const requirements = {
    faith: null,
    altar: null,
    temple: null,
    monument: null,
    resources: null,
    workers: null,
  }
  for (const [
    part,
    value,
  ] of Object.entries(values)) {
    if (part.startsWith(RESOURCE_PART_PREFIX)) {
      requirements.resources = {
        ...requirements.resources,
        [part.slice(RESOURCE_PART_PREFIX.length)]: value,
      }
    } else {
      requirements[part] = value
    }
  }
  return requirements
}

/**
 * Largest amount of one part that fits, searched up from 0 (which always fits).
 * @param {Function} fits - Amount → whether it fits
 * @returns {number} Largest fitting amount (whole)
 */
function largestAmount(fits) {
  let fitting = 0
  let failing = FIRST_AMOUNT_GUESS
  while (fits(failing)) {
    if (failing >= MAX_AMOUNT) {
      return MAX_AMOUNT
    }
    fitting = failing
    failing *= 2
  }
  for (let i = 0; i < SEARCH_STEPS && failing - fitting > 1; i++) {
    const middle = Math.floor((fitting + failing) / 2)
    if (fits(middle)) {
      fitting = middle
    } else {
      failing = middle
    }
  }
  return fitting
}

/**
 * Largest share in [0, 1] that fits, for a check that holds at 0 and gets harder as the share grows.
 * @param {Function} fits - Share → whether it fits
 * @returns {number} Largest fitting share found
 */
function largestShare(fits) {
  if (fits(1)) {
    return 1
  }
  let fitting = 0
  let failing = 1
  for (let i = 0; i < SEARCH_STEPS; i++) {
    const middle = (fitting + failing) / 2
    if (fits(middle)) {
      fitting = middle
    } else {
      failing = middle
    }
  }
  return fitting
}

/**
 * What a colony could meet of a challenge in the target share of its base timer. Amounts count from 0,
 * building levels from the colony's current level; the worker part is the most a challenge may ask
 * for (CHALLENGE_MAX_WORKER_REQUIREMENT_SHARE of the colony's workers, already present).
 * @param {Object} definition - Challenge definition (CHALLENGE_DEFINITIONS entry)
 * @param {Object} stats - colonyStats snapshot at the countdown start
 * @returns {{share: number, parts: Object[]}} Share of the alone values reached together, and per part
 *   its name, base value, value alone and value together
 */
export function calibrateChallenge(definition, stats) {
  const targetSeconds = definition.timeout * CHALLENGE_TARGET_TIME_SHARE
  const fits = values => estimateCompletionTime(requirementsFrom(values), stats) <= targetSeconds
  const workerCap = Math.floor(Math.max(0, stats.workers) * CHALLENGE_MAX_WORKER_REQUIREMENT_SHARE)
  const parts = partsOf(definition.requirements)

  // Each part alone
  const alone = {}
  for (const part of parts) {
    if (part === WORKERS_PART) {
      alone[part] = workerCap
    } else if (LEVEL_PARTS.includes(part)) {
      const current = Math.max(0, stats[part])
      let level = current
      while (level < current + MAX_LEVELS_ABOVE && fits({
        [part]: level + 1,
      })) {
        level += 1
      }
      alone[part] = level
    } else {
      alone[part] = largestAmount(amount => fits({
        [part]: amount,
      }))
    }
  }

  // Every part together, at the same share of its alone value (levels from the current level)
  const valuesAt = share => Object.fromEntries(parts.map(part => {
    let value = alone[part]
    if (LEVEL_PARTS.includes(part)) {
      const current = Math.max(0, stats[part])
      value = current + Math.floor((alone[part] - current) * share)
    } else if (part !== WORKERS_PART) {
      value = Math.floor(alone[part] * share)
    }
    return [
      part,
      value,
    ]
  }))
  const share = largestShare(value => fits(valuesAt(value)))
  const together = valuesAt(share)
  return {
    share: share,
    parts: parts.map(part => ({
      part: part,
      base: baseValue(definition.requirements, part),
      alone: alone[part],
      together: together[part],
    })),
  }
}
