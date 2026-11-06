// Challenge scaling — fits a challenge's base values (challenges.json) to the colony: the delay when the
// challenge activates, and the requirements, timer, blessings and punishment when its countdown starts.
// Pure functions on colonyStats snapshots; every tuning number lives in balancing.js.

import {CHALLENGE_AMOUNT_ROUNDING, CHALLENGE_BLESSING_DURATION_RANGE, CHALLENGE_BLESSING_MAGNITUDE_RANGE, CHALLENGE_DELAY_ROUNDING, CHALLENGE_DELAY_SCALE_MAX, CHALLENGE_DELAY_SCALE_MIN, CHALLENGE_DURATION_ROUNDING, CHALLENGE_EFFECT_CAPS, CHALLENGE_FAILURE_DELAY_BONUS, CHALLENGE_FAILURE_EASE, CHALLENGE_FAILURE_TIMEOUT_BONUS, CHALLENGE_GIFT_ROUNDING, CHALLENGE_HEALTH_MIN_REFERENCE, CHALLENGE_HEALTH_RATIO_MAX, CHALLENGE_HEALTH_RATIO_MIN, CHALLENGE_HEALTH_WEIGHTS, CHALLENGE_MAX_HARDEN_SCALE, CHALLENGE_MAX_LEVEL_CUT, CHALLENGE_MAX_TIMEOUT_SCALE, CHALLENGE_MIN_AMOUNT_SCALE, CHALLENGE_MOOD_THRESHOLDS, CHALLENGE_PUNISHMENT_MAX_LEVEL_SHARE, CHALLENGE_PUNISHMENT_MAX_WORKER_SHARE, CHALLENGE_PUNISHMENT_SEVERITY_RANGE, CHALLENGE_TARGET_TIME_SHARE, CHALLENGE_TIMEOUT_ROUNDING, HOUSE_POPULATION_PER_LEVEL, HQ_TERRITORY_PER_LEVEL, HQ_UPGRADE_COSTS, MONUMENT_FAITH_PER_LEVEL, PRODUCTION_RATES, STOREHOUSE_CAPACITY_MULTIPLIER, WORKER_RECRUIT_COST, WORKERS_PER_LEVEL} from '@/js/engine/balancing.js'
import {BOUNDED_RESOURCES, BUILDING_CLASS_MAP, CHALLENGE_MOODS, HQ_BUILDING_UNLOCKS, HQ_TYPES} from '@/js/engine/constants.js'
import {BUILDING_ALTAR, BUILDING_HEADQUARTERS, BUILDING_HOUSE, BUILDING_MONUMENT, BUILDING_STOREHOUSE, BUILDING_TEMPLE, RESOURCE_FAITH} from '@/js/engine/enums.js'
import {floorWithTolerance} from '@/js/engine/utils.js'
import Blessing from '@/js/models/blessing.js'
import Punishment from '@/js/models/punishment.js'

// Building-level requirements (each requirement key is also the building key)
const LEVEL_REQUIREMENTS = [
  BUILDING_ALTAR,
  BUILDING_TEMPLE,
  BUILDING_MONUMENT,
]

// Halvings in each search for a scale (precision 1 / 4096)
const SEARCH_STEPS = 12

// Times the plan is redone with more storehouse levels (they can need an HQ upgrade, which can need storage)
const STOREHOUSE_PLAN_PASSES = 3

// Most levels of one building, or HQ expansions, a plan counts; a plan needing more is unreachable
// (only an edited save gets there, and counting them one by one would freeze the game)
const MAX_PLANNED_STEPS = 1000

// Prefix of a resource requirement's part name in the backstop (faith and levels use their own keys)
const RESOURCE_PART_PREFIX = 'resources.'

/**
 * Limits a value to a range.
 * @param {number} value - Value
 * @param {number} min - Lowest result
 * @param {number} max - Highest result
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Rounds to the nearest multiple of a step.
 * @param {number} value - Value
 * @param {number} step - Step
 * @returns {number} Rounded value
 */
function roundToStep(value, step) {
  return Math.round(value / step) * step
}

/**
 * Ceiling that treats a value a hair above a whole number as that whole number (mirror of floorWithTolerance).
 * @param {number} value - Value
 * @returns {number} Ceiling
 */
function ceilWithTolerance(value) {
  return -floorWithTolerance(-value)
}

/**
 * Mean of the values.
 * @param {number[]} values - Values
 * @returns {number|null} Mean, or null without values
 */
function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * New object with every value of the given one mapped.
 * @param {Object} object - Source object
 * @param {Function} map - Value → new value
 * @returns {Object} Mapped copy
 */
function mapValues(object, map) {
  return Object.fromEntries(Object.entries(object).map(([
    key,
    value,
  ]) => [
    key,
    map(value),
  ]))
}

/**
 * Largest value in [low, high] that fits, for a check that holds at low and gets harder as the value grows.
 * @param {number} low - Lowest value (assumed to fit)
 * @param {number} high - Highest value
 * @param {Function} fits - Value → whether it fits
 * @returns {number} Largest fitting value found
 */
function largestFitting(low, high, fits) {
  if (fits(high)) {
    return high
  }
  let fitting = low
  let failing = high
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
 * Smallest value in [low, high] that fits, for a check that holds at high and gets easier as the value grows.
 * @param {number} low - Lowest value
 * @param {number} high - Highest value (assumed to fit)
 * @param {Function} fits - Value → whether it fits
 * @returns {number} Smallest fitting value found
 */
function smallestFitting(low, high, fits) {
  if (fits(low)) {
    return low
  }
  let failing = low
  let fitting = high
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
 * Ratio of one colony stat to a typical colony's, clamped. HQ tier compares tier + 1 (Camp is tier 0);
 * a reference too small to compare counts as ratio 1.
 * @param {string} stat - colonyStats field
 * @param {number} value - Colony's value
 * @param {number|null|undefined} reference - Typical colony's value
 * @returns {number} Clamped ratio
 */
function statRatio(stat, value, reference) {
  let ratio = 1
  if (stat === 'hqTier') {
    ratio = (value + 1) / ((reference ?? value) + 1)
  } else if ((reference ?? 0) >= CHALLENGE_HEALTH_MIN_REFERENCE[stat]) {
    ratio = Math.max(0, value) / reference
  }
  return clamp(ratio, CHALLENGE_HEALTH_RATIO_MIN, CHALLENGE_HEALTH_RATIO_MAX)
}

/**
 * Colony health: weighted geometric mean of the colony's stats over a typical colony's at the same point
 * (CHALLENGE_HEALTH_WEIGHTS), each ratio clamped to CHALLENGE_HEALTH_RATIO_MIN–MAX.
 * @param {Object} stats - colonyStats snapshot
 * @param {Object|null} referenceSnapshot - Typical colony's stats (a CHALLENGE_REFERENCE_STATS snapshot), or null
 * @returns {number} 1 for a typical colony (or without a reference), above 1 thriving, below 1 struggling
 */
export function healthScore(stats, referenceSnapshot) {
  if (!referenceSnapshot) {
    return 1
  }
  let weightedLogs = 0
  let totalWeight = 0
  for (const [
    stat,
    weight,
  ] of Object.entries(CHALLENGE_HEALTH_WEIGHTS)) {
    weightedLogs += weight * Math.log(statRatio(stat, stats[stat], referenceSnapshot[stat]))
    totalWeight += weight
  }
  return Math.exp(weightedLogs / totalWeight)
}

/**
 * Cost of a building's next level at the given level, from a temporary building instance.
 * @param {string} buildingKey - Building key
 * @param {number} level - Level the building is at
 * @returns {Cost} Level-up cost
 */
function levelUpCost(buildingKey, level) {
  const BuildingClass = BUILDING_CLASS_MAP[buildingKey]
  return new BuildingClass({
    level: level,
  }).levelUpCost
}

/**
 * Construction seconds for a cost, as Building.levelUp computes them.
 * @param {Cost} cost - Level-up or upgrade cost
 * @param {number} constructionMult - Construction duration multiplier
 * @returns {number} Seconds
 */
function buildSeconds(cost, constructionMult) {
  return Math.max(1, Math.floor(cost.toSeconds * constructionMult))
}

/**
 * Index in HQ_TYPES of the headquarters type that unlocks a building.
 * @param {string} buildingKey - Building key
 * @returns {number} HQ tier
 */
function unlockTier(buildingKey) {
  return HQ_TYPES.findIndex(type => HQ_BUILDING_UNLOCKS[type].includes(buildingKey))
}

/**
 * Storehouse levels needed until one amount fits in storage. Stops one past MAX_PLANNED_STEPS, which
 * the plan counts as unreachable (also when there is no storage at all to grow).
 * @param {number} amount - Largest amount of one bounded resource needed at once
 * @param {number} storageCap - Current storage cap
 * @returns {number} Storehouse levels
 */
function storehouseLevelsFor(amount, storageCap) {
  let levels = 0
  let cap = storageCap
  while (cap < amount && levels <= MAX_PLANNED_STEPS) {
    cap *= STOREHOUSE_CAPACITY_MULTIPLIER
    levels += 1
  }
  return levels
}

/**
 * Adds an amount of a resource to a plan.
 * @param {Object} plan - Plan from planRequirements
 * @param {string} resource - Resource key
 * @param {number} total - Amount needed in all
 * @param {number} [single=total] - Largest part of it needed at once (must fit in storage when bounded)
 */
function addAmount(plan, resource, total, single = total) {
  plan.needed[resource] = (plan.needed[resource] ?? 0) + total
  if (BOUNDED_RESOURCES.includes(resource)) {
    plan.largestAmount = Math.max(plan.largestAmount, single)
  }
}

/**
 * Adds a cost to a plan, paid the given number of times.
 * @param {Object} plan - Plan from planRequirements
 * @param {Cost} cost - Cost
 * @param {number} [count=1] - Times it is paid
 */
function addCost(plan, cost, count = 1) {
  for (const [
    resource,
    amount,
  ] of cost.entries) {
    addAmount(plan, resource, amount * count, amount)
  }
}

/**
 * Everything the colony still needs to meet the requirements: resources spent or held, building
 * levels (each building one level after another, buildings in parallel), HQ tier upgrades for locked
 * buildings and HQ expansions when the new levels do not fit in the free territory (without the
 * expansion research discount), the houses extra workers need and the given storehouse levels.
 * Levels below 0 count as 0; a plan with more than MAX_PLANNED_STEPS levels of one building or
 * expansions is marked unreachable instead of counted.
 * @param {Object} requirements - Challenge requirements
 * @param {Object} stats - colonyStats snapshot
 * @param {number} storehouseLevels - Storehouse levels to plan
 * @returns {Object} Plan
 */
function planRequirements(requirements, stats, storehouseLevels) {
  const plan = {
    needed: {}, // Resource → amount spent or held
    largestAmount: 0, // Largest amount of one bounded resource needed at once
    storehouseLevels: storehouseLevels, // Storehouse levels planned
    buildChains: [], // Build seconds per building
    headquartersSeconds: 0, // HQ tier upgrades and expansions, one after another
    faithGained: 0, // One-time faith from new monument levels
    unreachable: false, // Whether the plan needs more than MAX_PLANNED_STEPS levels or expansions
  }

  // Levels to build: [building key, from level, to level]
  const builds = []
  for (const key of LEVEL_REQUIREMENTS) {
    const current = Math.max(0, stats[key])
    if (requirements[key] !== null && requirements[key] > current) {
      builds.push([
        key,
        current,
        requirements[key],
      ])
    }
  }
  if (requirements.workers !== null && requirements.workers > stats.workers) {
    addCost(plan, WORKER_RECRUIT_COST, requirements.workers - stats.workers)
    if (requirements.workers > stats.workersCap) {
      const house = Math.max(0, stats.house)
      const perLevel = house > 0 ? stats.workersCap / house : HOUSE_POPULATION_PER_LEVEL
      builds.push([
        BUILDING_HOUSE,
        house,
        house + Math.ceil((requirements.workers - stats.workersCap) / perLevel),
      ])
    }
  }
  if (storehouseLevels > 0) {
    const storehouse = Math.max(0, stats.storehouse)
    builds.push([
      BUILDING_STOREHOUSE,
      storehouse,
      storehouse + storehouseLevels,
    ])
  }

  // Amounts held until the countdown ends
  if (requirements.faith !== null) {
    addAmount(plan, RESOURCE_FAITH, requirements.faith)
  }
  for (const [
    resource,
    amount,
  ] of Object.entries(requirements.resources ?? {})) {
    addAmount(plan, resource, amount)
  }

  // HQ tier upgrades for locked buildings
  const requiredTier = Math.max(stats.hqTier, ...builds.map(([key]) => unlockTier(key)))
  for (let tier = Math.max(0, stats.hqTier); tier < requiredTier; tier++) {
    const cost = HQ_UPGRADE_COSTS[HQ_TYPES[tier]]
    addCost(plan, cost)
    plan.headquartersSeconds += buildSeconds(cost, stats.constructionMult)
  }

  // Building levels
  let newLevels = 0
  for (const [
    key,
    from,
    to,
  ] of builds) {
    if (to - from > MAX_PLANNED_STEPS) {
      plan.unreachable = true
      continue
    }
    let seconds = 0
    for (let level = from; level < to; level++) {
      const cost = levelUpCost(key, level)
      addCost(plan, cost)
      seconds += buildSeconds(cost, stats.constructionMult)
      if (key === BUILDING_MONUMENT) {
        plan.faithGained += MONUMENT_FAITH_PER_LEVEL * (level + 1)
      }
    }
    plan.buildChains.push(seconds)
    newLevels += to - from
  }

  // HQ expansions when the new levels do not fit in the free territory
  const missingTerritory = newLevels - stats.territoryFree
  if (missingTerritory > 0) {
    const expansions = Math.ceil(missingTerritory / HQ_TERRITORY_PER_LEVEL)
    if (expansions > MAX_PLANNED_STEPS) {
      plan.unreachable = true
    }
    for (let i = 0; i < expansions && !plan.unreachable; i++) {
      const cost = levelUpCost(BUILDING_HEADQUARTERS, stats.hqLevel + i)
      addCost(plan, cost)
      plan.headquartersSeconds += buildSeconds(cost, stats.constructionMult)
    }
  }
  return plan
}

/**
 * Faith per second the colony could make: its current rate plus the temple slots idle workers could fill.
 * @param {Object} stats - colonyStats snapshot
 * @returns {number} Faith per second
 */
function potentialFaithRate(stats) {
  const freeTempleSlots = Math.max(0, stats.temple * WORKERS_PER_LEVEL - stats.templeWorkers)
  return stats.faithRate + Math.min(stats.idleWorkers, freeTempleSlots) * PRODUCTION_RATES[BUILDING_TEMPLE].rate
}

/**
 * Seconds a plan takes: the larger of the time to gather every missing resource at its net rate
 * and the time to build (HQ work first, then the longest building chain).
 * @param {Object} plan - Plan from planRequirements
 * @param {Object} stats - colonyStats snapshot
 * @returns {number} Seconds, or Infinity when a missing resource is not being produced or the plan is unreachable
 */
function planSeconds(plan, stats) {
  if (plan.unreachable) {
    return Infinity
  }
  let gatherSeconds = 0
  for (const [
    resource,
    amount,
  ] of Object.entries(plan.needed)) {
    const isFaith = resource === RESOURCE_FAITH
    const missing = amount - stats.stock[resource] - (isFaith ? plan.faithGained : 0)
    if (missing <= 0) {
      continue
    }
    const rate = isFaith ? potentialFaithRate(stats) : stats.netRates[resource]
    if (!(rate > 0)) {
      return Infinity
    }
    gatherSeconds = Math.max(gatherSeconds, missing / rate)
  }
  const constructionSeconds = plan.headquartersSeconds + Math.max(0, ...plan.buildChains)
  return Math.max(gatherSeconds, constructionSeconds)
}

/**
 * Estimated seconds for the colony to meet the requirements from now, as a straight line from its
 * stock and current net rates (ignores growth, seasons, raids and other spending). Counts the held
 * amounts, building level costs, recruit food, HQ tier upgrades for locked buildings, HQ expansions
 * when territory is short, houses for extra workers and storehouse levels when one amount does not
 * fit in storage; faith also counts free temple slots idle workers could fill and the one-time faith
 * of new monument levels.
 * @param {Object} requirements - Challenge requirements
 * @param {Object} stats - colonyStats snapshot
 * @returns {number} Seconds, or Infinity when the colony cannot meet them
 */
export function estimateCompletionTime(requirements, stats) {
  let plan = planRequirements(requirements, stats, 0)
  for (let pass = 0; pass < STOREHOUSE_PLAN_PASSES; pass++) {
    const storehouseLevels = storehouseLevelsFor(plan.largestAmount, stats.storageCap)
    if (storehouseLevels <= plan.storehouseLevels) {
      break
    }
    plan = planRequirements(requirements, stats, storehouseLevels)
  }
  return planSeconds(plan, stats)
}

/**
 * Rounds a faith or resource amount to the step of its CHALLENGE_AMOUNT_ROUNDING band.
 * @param {number} amount - Amount
 * @returns {number} Rounded amount
 */
function roundAmount(amount) {
  const band = CHALLENGE_AMOUNT_ROUNDING.find(entry => amount < entry.below)
  return roundToStep(amount, band.step)
}

/**
 * Scales a faith or resource amount, rounded and at least the smallest rounding step.
 * @param {number|null} amount - Base amount
 * @param {number} scale - Scale
 * @returns {number|null} Scaled amount (null stays null)
 */
function scaleAmount(amount, scale) {
  if (amount === null) {
    return null
  }
  return Math.max(CHALLENGE_AMOUNT_ROUNDING[0].step, roundAmount(amount * scale))
}

/**
 * Scales a building-level or worker requirement: rounded down when raised (never past the scale),
 * up when cut (never more than the cut), and at least 1.
 * @param {number|null} count - Base level or workers
 * @param {number} scale - Scale
 * @returns {number|null} Scaled count (null stays null)
 */
function scaleCount(count, scale) {
  if (count === null) {
    return null
  }
  const scaled = scale >= 1 ? floorWithTolerance(count * scale) : ceilWithTolerance(count * scale)
  return Math.max(1, scaled)
}

/**
 * New requirements with the amounts and the levels and workers scaled.
 * @param {Object} requirements - Requirements to scale
 * @param {number} amountScale - Scale of faith and resource amounts
 * @param {number} levelScale - Scale of building levels and workers
 * @returns {Object} Scaled requirements
 */
function scaleRequirements(requirements, amountScale, levelScale) {
  return {
    faith: scaleAmount(requirements.faith, amountScale),
    altar: scaleCount(requirements.altar, levelScale),
    temple: scaleCount(requirements.temple, levelScale),
    monument: scaleCount(requirements.monument, levelScale),
    resources: requirements.resources === null ? null : mapValues(requirements.resources, amount => scaleAmount(amount, amountScale)),
    workers: scaleCount(requirements.workers, levelScale),
  }
}

/**
 * Requirements without the resources the colony has not unlocked (it cannot produce them).
 * @param {Object} requirements - Requirements
 * @param {Object} stats - colonyStats snapshot
 * @returns {{requirements: Object, dropped: boolean}} Reachable requirements and whether any resource was dropped
 */
function withoutLockedResources(requirements, stats) {
  if (requirements.resources === null) {
    return {
      requirements: requirements,
      dropped: false,
    }
  }
  const entries = Object.entries(requirements.resources)
  const kept = entries.filter(([resource]) => stats.unlockedResources.includes(resource))
  return {
    requirements: {
      ...requirements,
      resources: kept.length > 0 ? Object.fromEntries(kept) : null,
    },
    dropped: kept.length < entries.length,
  }
}

/**
 * Names of the requirement parts the backstop caps one by one.
 * @param {Object} requirements - Requirements
 * @returns {string[]} Part names (requirement keys, resources prefixed)
 */
function requirementParts(requirements) {
  const parts = [
    'faith',
    ...LEVEL_REQUIREMENTS,
    'workers',
  ].filter(key => requirements[key] !== null)
  for (const resource of Object.keys(requirements.resources ?? {})) {
    parts.push(RESOURCE_PART_PREFIX + resource)
  }
  return parts
}

/**
 * Requirements with each part at a share of the way from nothing to its value: amounts from 0, levels
 * and workers from what the colony has. A part left out of the shares is at 0; a part that reaches
 * nothing is dropped (null). Workers are sacrificed when the challenge is won, so a worker part that
 * cannot rise above the colony's workers is dropped too (asking for all of them would empty the colony).
 * @param {Object} requirements - Full requirements
 * @param {Object} stats - colonyStats snapshot
 * @param {Object<string, number>} shares - Part name → share (0 to 1)
 * @returns {Object} Partial requirements
 */
function partialRequirements(requirements, stats, shares) {
  const amount = (value, part) => {
    if (value === null) {
      return null
    }
    const rounded = roundAmount(value * (shares[part] ?? 0))
    return rounded > 0 ? rounded : null
  }
  const count = (value, current, part) => {
    if (value === null) {
      return null
    }
    const reached = value <= current ? value : current + floorWithTolerance((value - current) * (shares[part] ?? 0))
    return reached > 0 ? reached : null
  }
  let resources = null
  if (requirements.resources !== null) {
    const kept = Object.entries(requirements.resources)
      .map(([
        resource,
        value,
      ]) => [
        resource,
        amount(value, RESOURCE_PART_PREFIX + resource),
      ])
      .filter(entry => entry[1] !== null)
    resources = kept.length > 0 ? Object.fromEntries(kept) : null
  }
  const workers = count(requirements.workers, stats.workers, 'workers')
  return {
    faith: amount(requirements.faith, 'faith'),
    altar: count(requirements.altar, stats.altar, BUILDING_ALTAR),
    temple: count(requirements.temple, stats.temple, BUILDING_TEMPLE),
    monument: count(requirements.monument, stats.monument, BUILDING_MONUMENT),
    resources: resources,
    workers: requirements.workers > stats.workers && workers <= stats.workers ? null : workers,
  }
}

/**
 * Backstop: caps each requirement part at what the colony can reach on its own, then lowers them all
 * together until they fit. At share 0 everything is met, so the result always fits.
 * @param {Object} requirements - Requirements to cap (base amounts, largest level cut)
 * @param {Object} stats - colonyStats snapshot
 * @param {Function} fits - Requirements → whether they fit the timer
 * @returns {Object} Requirements that fit
 */
function backstopRequirements(requirements, stats, fits) {
  const shares = {}
  for (const part of requirementParts(requirements)) {
    shares[part] = largestFitting(0, 1, share => fits(partialRequirements(requirements, stats, {
      [part]: share,
    })))
  }
  const together = factor => mapValues(shares, share => share * factor)
  const factor = largestFitting(0, 1, value => fits(partialRequirements(requirements, stats, together(value))))
  return partialRequirements(requirements, stats, together(factor))
}

/**
 * Scales actually applied, compared with the base values: mean ratio of the faith and resource
 * amounts, mean ratio of the building levels and workers (a dropped part counts 0), and the timer.
 * @param {Object} definition - Challenge definition
 * @param {Object} requirements - Fitted requirements
 * @param {number} timeout - Fitted timer in seconds
 * @returns {{amounts: number|null, levels: number|null, timeout: number}} Scales (null without such requirements)
 */
function appliedScales(definition, requirements, timeout) {
  const base = definition.requirements
  const amountRatios = []
  if (base.faith !== null) {
    amountRatios.push((requirements.faith ?? 0) / base.faith)
  }
  for (const [
    resource,
    amount,
  ] of Object.entries(base.resources ?? {})) {
    amountRatios.push((requirements.resources?.[resource] ?? 0) / amount)
  }
  const levelRatios = [
    ...LEVEL_REQUIREMENTS,
    'workers',
  ]
    .filter(key => base[key] !== null)
    .map(key => (requirements[key] ?? 0) / base[key])
  return {
    amounts: mean(amountRatios),
    levels: mean(levelRatios),
    timeout: timeout / definition.timeout,
  }
}

/**
 * Failure count to scale by: a saved count that is not a whole number of 0 or more counts as 0.
 * @param {*} failures - Times the challenge has been failed (from the save)
 * @returns {number} Failures
 */
function failureCount(failures) {
  return Number.isInteger(failures) && failures > 0 ? failures : 0
}

/**
 * Fits a challenge's requirements and timer to the colony. The target is the timer ×
 * CHALLENGE_TARGET_TIME_SHARE, eased by CHALLENGE_FAILURE_EASE per failure (each failure also adds
 * CHALLENGE_FAILURE_TIMEOUT_BONUS to the timer). Resources the colony has not unlocked are dropped first.
 * - A (time to spare): every value is raised, up to CHALLENGE_MAX_HARDEN_SCALE
 * - B1 (too hard): faith and resource amounts shrink, down to CHALLENGE_MIN_AMOUNT_SCALE
 * - B2 (still too hard): the timer grows (up to CHALLENGE_MAX_TIMEOUT_SCALE) while building levels and
 *   workers are cut (up to CHALLENGE_MAX_LEVEL_CUT); then the amounts grow back as far as they still fit
 * - C (backstop): at the longest timer and the largest level cut, each value (amounts from their base)
 *   is capped at what the colony can reach
 * @param {Object} definition - Challenge definition (CHALLENGE_DEFINITIONS entry)
 * @param {Object} stats - colonyStats snapshot
 * @param {number} failures - Times this challenge has been failed
 * @returns {{requirements: Object, timeout: number, scales: Object, backstop: boolean}} Fitted values; backstop is
 *   true when a resource was dropped or stage C ran
 */
export function fitRequirements(definition, stats, failures) {
  const reachable = withoutLockedResources(definition.requirements, stats)
  const base = reachable.requirements
  const failed = failureCount(failures)
  const startTimeoutScale = Math.min(CHALLENGE_MAX_TIMEOUT_SCALE, 1 + CHALLENGE_FAILURE_TIMEOUT_BONUS * failed)
  const targetShare = CHALLENGE_TARGET_TIME_SHARE * Math.pow(1 - CHALLENGE_FAILURE_EASE, failed)
  // Timers round up to a step, but never past the longest timer
  const longestTimeout = floorWithTolerance(definition.timeout * CHALLENGE_MAX_TIMEOUT_SCALE / CHALLENGE_TIMEOUT_ROUNDING) * CHALLENGE_TIMEOUT_ROUNDING
  const timeoutFor = scale => Math.min(longestTimeout, ceilWithTolerance(definition.timeout * scale / CHALLENGE_TIMEOUT_ROUNDING) * CHALLENGE_TIMEOUT_ROUNDING)
  const fits = (requirements, timeoutScale) => estimateCompletionTime(requirements, stats) <= timeoutFor(timeoutScale) * targetShare

  // B2 moves the timer and the level cut together, from none (0) to the most (1)
  const timeoutAt = progress => startTimeoutScale + progress * (CHALLENGE_MAX_TIMEOUT_SCALE - startTimeoutScale)
  const levelsAt = progress => 1 - progress * CHALLENGE_MAX_LEVEL_CUT

  let requirements
  let timeoutScale = startTimeoutScale
  let backstop = reachable.dropped
  if (fits(scaleRequirements(base, 1, 1), startTimeoutScale)) {
    const scale = largestFitting(1, CHALLENGE_MAX_HARDEN_SCALE, value => fits(scaleRequirements(base, value, value), startTimeoutScale))
    requirements = scaleRequirements(base, scale, scale)
  } else if (fits(scaleRequirements(base, CHALLENGE_MIN_AMOUNT_SCALE, 1), startTimeoutScale)) {
    const amountScale = largestFitting(CHALLENGE_MIN_AMOUNT_SCALE, 1, value => fits(scaleRequirements(base, value, 1), startTimeoutScale))
    requirements = scaleRequirements(base, amountScale, 1)
  } else if (fits(scaleRequirements(base, CHALLENGE_MIN_AMOUNT_SCALE, levelsAt(1)), timeoutAt(1))) {
    const progress = smallestFitting(0, 1, value => fits(scaleRequirements(base, CHALLENGE_MIN_AMOUNT_SCALE, levelsAt(value)), timeoutAt(value)))
    timeoutScale = timeoutAt(progress)
    const amountScale = largestFitting(CHALLENGE_MIN_AMOUNT_SCALE, 1, value => fits(scaleRequirements(base, value, levelsAt(progress)), timeoutScale))
    requirements = scaleRequirements(base, amountScale, levelsAt(progress))
  } else {
    timeoutScale = timeoutAt(1)
    requirements = backstopRequirements(scaleRequirements(base, 1, levelsAt(1)), stats, value => fits(value, timeoutScale))
    backstop = true
  }
  const timeout = timeoutFor(timeoutScale)
  return {
    requirements: requirements,
    timeout: timeout,
    scales: appliedScales(definition, requirements, timeout),
    backstop: backstop,
  }
}

/**
 * How demanding the fitted challenge is compared with its base values: the mean of the amount and
 * level scales divided by the timer scale.
 * @param {{amounts: number|null, levels: number|null, timeout: number}} scales - Applied scales
 * @returns {number} Above 1 harder than the base values, below 1 easier
 */
export function challengeDifficulty(scales) {
  const applied = [
    scales.amounts,
    scales.levels,
  ].filter(scale => scale !== null)
  return (mean(applied) ?? 1) / scales.timeout
}

/**
 * Scales an effect fraction to whole percents, capped.
 * @param {number|null} value - Base fraction
 * @param {number} scale - Scale
 * @param {number} cap - Highest result
 * @returns {number|null} Scaled fraction (null stays null)
 */
function scaleFraction(value, scale, cap) {
  if (value === null) {
    return null
  }
  return Math.min(cap, Math.round(value * scale * 100) / 100)
}

/**
 * Scales an effect duration to whole minutes, at least one.
 * @param {number|null} seconds - Base duration
 * @param {number} scale - Scale
 * @returns {number|null} Scaled duration (null, an instant effect, stays null)
 */
function scaleDuration(seconds, scale) {
  if (seconds === null) {
    return null
  }
  return Math.max(CHALLENGE_DURATION_ROUNDING, roundToStep(seconds * scale, CHALLENGE_DURATION_ROUNDING))
}

/**
 * New blessing scaled by the challenge difficulty: strength within CHALLENGE_BLESSING_MAGNITUDE_RANGE
 * (fractions in whole percents, capped; gifted resources rounded to CHALLENGE_GIFT_ROUNDING; whole
 * territory slots) and duration within CHALLENGE_BLESSING_DURATION_RANGE.
 * @param {Object} blessing - Base blessing (definition entry or Blessing)
 * @param {number} difficulty - Challenge difficulty
 * @returns {Blessing} Adjusted blessing
 */
export function adjustBlessing(blessing, difficulty) {
  const base = new Blessing(blessing)
  const magnitude = clamp(difficulty, ...CHALLENGE_BLESSING_MAGNITUDE_RANGE)
  const cap = CHALLENGE_EFFECT_CAPS.blessing
  return new Blessing({
    type: base.type,
    timeout: scaleDuration(base.timeout, clamp(difficulty, ...CHALLENGE_BLESSING_DURATION_RANGE)),
    productivity: scaleFraction(base.productivity, magnitude, cap),
    resources: base.resources === null ? null : mapValues(base.resources, amount => Math.max(CHALLENGE_GIFT_ROUNDING, roundToStep(amount * magnitude, CHALLENGE_GIFT_ROUNDING))),
    territory: base.territory === null ? null : Math.max(1, Math.round(base.territory * magnitude)),
    construction: scaleFraction(base.construction, magnitude, cap),
    warm: scaleFraction(base.warm, magnitude, cap),
    cold: scaleFraction(base.cold, magnitude, cap),
  })
}

/**
 * Scales a worker or building-level loss. The base count is meant for the typical colony at this
 * challenge, so it follows the colony's size relative to that colony, times the severity, and is
 * capped at a share of what the colony has.
 * @param {number|null} count - Base loss
 * @param {number} current - Colony's workers or building levels
 * @param {number|null|undefined} reference - Typical colony's workers or building levels
 * @param {number} severity - Punishment severity
 * @param {number} maxShare - Largest share of the colony's that can be lost
 * @returns {number|null} Whole loss (null stays null)
 */
function scaleLoss(count, current, reference, severity, maxShare) {
  if (count === null) {
    return null
  }
  const sizeRatio = reference > 0 ? current / reference : 1
  return Math.min(Math.round(count * sizeRatio * severity), floorWithTolerance(current * maxShare))
}

/**
 * New punishment scaled by the colony health: a struggling colony gets a milder one. Strength and
 * duration follow the severity (health within CHALLENGE_PUNISHMENT_SEVERITY_RANGE); fractions in
 * whole percents, capped; worker and level losses scaled to the colony's size and capped.
 * @param {Object} punishment - Base punishment (definition entry or Punishment)
 * @param {number} health - Colony health
 * @param {Object} stats - colonyStats snapshot
 * @param {Object|null} referenceSnapshot - Typical colony's stats at this point, or null
 * @returns {Punishment} Adjusted punishment
 */
export function adjustPunishment(punishment, health, stats, referenceSnapshot) {
  const base = new Punishment(punishment)
  const severity = clamp(health, ...CHALLENGE_PUNISHMENT_SEVERITY_RANGE)
  const cap = CHALLENGE_EFFECT_CAPS.punishment
  return new Punishment({
    type: base.type,
    timeout: scaleDuration(base.timeout, severity),
    faith: scaleFraction(base.faith, severity, cap),
    productivityFarm: scaleFraction(base.productivityFarm, severity, cap),
    productivityWoodcutter: scaleFraction(base.productivityWoodcutter, severity, cap),
    productivityMines: scaleFraction(base.productivityMines, severity, cap),
    productivityGeneral: scaleFraction(base.productivityGeneral, severity, cap),
    resources: scaleFraction(base.resources, severity, cap),
    workers: scaleLoss(base.workers, stats.workers, referenceSnapshot?.workers, severity, CHALLENGE_PUNISHMENT_MAX_WORKER_SHARE),
    levels: scaleLoss(base.levels, stats.buildingLevels, referenceSnapshot?.buildingLevels, severity, CHALLENGE_PUNISHMENT_MAX_LEVEL_SHARE),
  })
}

/**
 * Delay before the countdown: longer for a struggling colony, shorter for a thriving one
 * (1 ÷ health within CHALLENGE_DELAY_SCALE_MIN–MAX), plus CHALLENGE_FAILURE_DELAY_BONUS per failure.
 * @param {number} baseDelay - Base delay in seconds
 * @param {number} health - Colony health
 * @param {number} failures - Times this challenge has been failed
 * @returns {number} Delay in seconds, rounded to CHALLENGE_DELAY_ROUNDING
 */
export function adjustDelay(baseDelay, health, failures) {
  const scale = clamp(1 / health, CHALLENGE_DELAY_SCALE_MIN, CHALLENGE_DELAY_SCALE_MAX)
  return roundToStep(baseDelay * scale + failureCount(failures) * CHALLENGE_FAILURE_DELAY_BONUS, CHALLENGE_DELAY_ROUNDING)
}

/**
 * Mood of the gods for a difficulty (CHALLENGE_MOOD_THRESHOLDS).
 * @param {number} difficulty - Challenge difficulty
 * @returns {string} CHALLENGE_MOOD_* value
 */
export function challengeMood(difficulty) {
  return CHALLENGE_MOODS[CHALLENGE_MOOD_THRESHOLDS.filter(threshold => difficulty >= threshold).length]
}

/**
 * Every value decided when a challenge's countdown starts. New objects; the definition is not changed.
 * @param {Object} definition - Challenge definition (CHALLENGE_DEFINITIONS entry)
 * @param {Object} stats - colonyStats snapshot
 * @param {Object|null} referenceRow - CHALLENGE_REFERENCE_STATS row for this challenge, or null
 * @param {number} failures - Times this challenge has been failed
 * @returns {{timeout: number, requirements: Object, blessings: Blessing[], punishment: Punishment, mood: string, scales: Object, backstop: boolean}}
 *   Adjusted values
 */
export function adjustChallenge(definition, stats, referenceRow, failures) {
  const fitted = fitRequirements(definition, stats, failures)
  const difficulty = challengeDifficulty(fitted.scales)
  const reference = referenceRow?.countdownStart ?? null
  return {
    timeout: fitted.timeout,
    requirements: fitted.requirements,
    blessings: definition.blessings.map(blessing => adjustBlessing(blessing, difficulty)),
    punishment: adjustPunishment(definition.punishment, healthScore(stats, reference), stats, reference),
    mood: challengeMood(difficulty),
    scales: fitted.scales,
    backstop: fitted.backstop,
  }
}
