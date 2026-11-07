// Challenge planning for the simulation bots: what a running countdown asks for, and which blessing to take.
// Bots only see a challenge once its countdown runs (as the player does); they never look ahead.

import {HQ_TERRITORY_PER_LEVEL, PRODUCTION_RATES} from '@/js/engine/balancing.js'
import {BLESSING_PRODUCTIVITY_RESOURCES, BOUNDED_RESOURCES, HQ_RESOURCE_UNLOCKS} from '@/js/engine/constants.js'
import {BLESSING_BLESSED_MARKETS, BLESSING_CELESTIAL_FORTIFICATION, BLESSING_FAVORABLE_WEATHER, BLESSING_GIFT_FROM_THE_HEAVENS, BLESSING_HOLY_EXPANSION, BLESSING_RAPID_CONSTRUCTION, BLESSING_TEMPORARY_PEACE, BUILDING_ALTAR, BUILDING_HOUSE, BUILDING_MONUMENT, BUILDING_STOREHOUSE, BUILDING_TEMPLE, CHALLENGE_STATUS_STARTED, HQ_TYPE_CAMP, RESOURCE_FAITH} from '@/js/engine/enums.js'
import {BLESSING_CHOICE_FIRST, BLESSING_CHOICE_WEAKEST_RESOURCE, HOLD_REACHABLE} from './bot_profiles.js'
import {buildingItem, emptyAmounts, expansionItem, freeTerritory, headquartersUpgradeItem, PRODUCER_KEYS, PRODUCER_RESOURCES, plannedLevel, resourceValue, storageCapOf} from './economy_planner.js'

const RATE_SAFETY = 1.15 // Production planned above the bare rate a gap needs, so the bot finishes with time to spare
const BLESSED_MARKETS_VALUE = 0 // No estimate for a fee-free market: the strong bot rarely trades enough for it to matter
const SLOT_VALUE_FACTOR = 2 // Holy Expansion: each slot is worth this many times its share of the next expansion
const CONSTRUCTION_VALUE_SHARE = 0.25 // Rapid Construction: share of the production value it is worth per second saved
const RAID_LOSS_SHARE = 0.3 // Temporary Peace / Celestial Fortification: share of the stock a lost raid costs

// Profile stand-in for headquarters upgrades a challenge needs: always save for them
const ALWAYS_SAVE = {
  hqUpgradeStockFactor: 1,
}

// Religious buildings a challenge can ask levels of
const RELIGIOUS_BUILDINGS = [
  BUILDING_ALTAR,
  BUILDING_TEMPLE,
  BUILDING_MONUMENT,
]

/**
 * The challenge the bot is working on: the active one once its countdown has run for the
 * profile's reaction delay.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @returns {{challenge: Challenge, requirements: Object, timeLeft: number, met: boolean}|null} Focus, or null when there is none
 */
export function challengeFocus(state, profile) {
  const challenge = state.meta.challenges.active
  if (!challenge || challenge.status !== CHALLENGE_STATUS_STARTED || challenge.timeoutElapsed < profile.reactionDelay) {
    return null
  }
  return {
    challenge: challenge,
    requirements: challenge.requirements,
    timeLeft: Math.max(1, challenge.timeout - challenge.timeoutElapsed),
    met: state.areChallengeRequirementsMet(),
  }
}

/**
 * Amounts the bot keeps in stock while working on a challenge: each faith or resource amount it asks
 * for, once met (hold it) and, with HOLD_REACHABLE, while the income can still reach it before the
 * countdown ends (pause other spending of it). An amount out of reach is not held, so a hopeless
 * attempt does not freeze the colony.
 * @param {State} state - Game state
 * @param {Object} focus - Result of challengeFocus
 * @param {string} hold - Profile's challenge hold (HOLD_MET or HOLD_REACHABLE)
 * @returns {Object<string, number>} Held amount by resource
 */
export function challengeReserve(state, focus, hold) {
  const reserve = emptyAmounts()
  const {
    requirements, timeLeft,
  } = focus
  const amounts = {
    ...requirements.resources,
  }
  if (requirements.faith !== null) {
    amounts[RESOURCE_FAITH] = requirements.faith
  }
  for (const [
    resource,
    amount,
  ] of Object.entries(amounts)) {
    const missing = amount - state.colony.resources[resource]
    const reachable = hold === HOLD_REACHABLE ? Math.max(0, state.netProduction(resource)) * timeLeft : 0
    if (missing <= reachable) {
      reserve[resource] = amount
    }
  }
  return reserve
}

/**
 * Extra production per second the workers must add to close the challenge's resource and faith gaps
 * before the countdown ends (the altar's passive faith is already counted).
 * @param {State} state - Game state
 * @param {Object} focus - Result of challengeFocus
 * @returns {Object<string, number>} Extra rate by resource
 */
export function challengeRates(state, focus) {
  const {
    resources, buildings,
  } = state.colony
  const {
    requirements, timeLeft,
  } = focus
  const rates = {}
  if (requirements.faith !== null && resources.faith < requirements.faith) {
    const altarRate = buildings.altar.level * PRODUCTION_RATES[BUILDING_ALTAR].rate * state.productionMultipliers[RESOURCE_FAITH]
    rates[RESOURCE_FAITH] = Math.max(0, (requirements.faith - resources.faith) / timeLeft * RATE_SAFETY - altarRate)
  }
  for (const [
    resource,
    amount,
  ] of Object.entries(requirements.resources ?? {})) {
    if (resources[resource] < amount) {
      rates[resource] = (amount - resources[resource]) / timeLeft * RATE_SAFETY
    }
  }
  return rates
}

/**
 * Priority 2 — challenge: wish items that close the running challenge's gaps. Religious levels
 * (upgrading the headquarters when the building is still locked, expanding when territory is full),
 * temple and altar levels when faith comes too slowly, producers and storehouse levels for
 * resources, houses for workers. All are urgent (the countdown cannot wait for the bot's other
 * savings) and marked as challenge items (the bot saves for the first one it cannot pay for yet).
 * The religious levels, the storehouse levels an amount needs to fit and the territory for them are
 * kept for good and the challenge cannot be met without them, so they may use the amounts the
 * challenge holds (as long as the income can earn them back in time, see Bot._spend); the other
 * items leave them alone, since spending them would undo the challenge's own stock.
 * @param {State} state - Game state
 * @param {Object} focus - Result of challengeFocus
 * @param {Object<string, number>} rates - Result of challengeRates
 * @returns {Object[]} Wish items
 */
export function challengeItems(state, focus, rates) {
  const {
    resources, buildings,
  } = state.colony
  const {
    requirements,
  } = focus
  const items = []
  const add = (item, usesHeld) => {
    if (item) {
      item.urgent = true
      item.challenge = true
      item.ignoresHold = usesHeld
      items.push(item)
    }
  }
  const missingLevels = RELIGIOUS_BUILDINGS.filter(key => requirements[key] !== null && plannedLevel(buildings[key]) < requirements[key])
  const cap = storageCapOf(state)
  const needsStorage = Object.values(requirements.resources ?? {}).some(amount => amount > cap)
  if (freeTerritory(state) <= 0) {
    add(expansionItem(state), missingLevels.length > 0 || needsStorage)
  }
  for (const key of missingLevels) {
    add(state.unlockedBuildings.has(key) ? buildingItem(state, key, true, 'challenge') : headquartersUpgradeItem(state, ALWAYS_SAVE), true)
  }
  if ((rates[RESOURCE_FAITH] ?? 0) > 0) {
    const temple = buildings.temple
    if (temple.workers >= temple.maxWorkers) {
      add(buildingItem(state, BUILDING_TEMPLE, true, 'challenge'), false)
    }
    add(buildingItem(state, BUILDING_ALTAR, true, 'challenge'), false)
    // Workers can only make faith in the temple, which needs the next headquarters tier at Camp
    if (!state.unlockedBuildings.has(BUILDING_TEMPLE)) {
      add(headquartersUpgradeItem(state, ALWAYS_SAVE), false)
    }
  }
  for (const [
    resource,
    amount,
  ] of Object.entries(requirements.resources ?? {})) {
    if (amount > cap) {
      add(buildingItem(state, BUILDING_STOREHOUSE, true, 'challenge'), true)
    }
    const producer = PRODUCER_KEYS.find(key => PRODUCER_RESOURCES[key] === resource)
    if (rates[resource] > 0 && producer && buildings[producer].workers >= buildings[producer].maxWorkers) {
      add(buildingItem(state, producer, true, 'challenge'), false)
    }
  }
  if (requirements.workers !== null && buildings.house.workersCap < requirements.workers && resources.workers < requirements.workers) {
    add(buildingItem(state, BUILDING_HOUSE, true, 'challenge'), false)
  }
  return items
}

/**
 * Picks the blessing after a completed challenge, by the profile's policy.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @param {Challenge} challenge - Completed challenge (still active while the reward window shows)
 * @returns {number} Index into challenge.blessings
 */
export function chooseBlessing(state, profile, challenge) {
  const {
    blessings,
  } = challenge
  if (profile.blessingChoice === BLESSING_CHOICE_FIRST) {
    return 0
  }
  if (profile.blessingChoice === BLESSING_CHOICE_WEAKEST_RESOURCE) {
    return weakestResourceBlessing(state, blessings)
  }
  const values = blessings.map(blessing => blessingValue(state, blessing))
  return values.indexOf(Math.max(...values))
}

/**
 * The productivity blessing that raises the colony's weakest unlocked resource (by value-weighted
 * net rate); the first option when neither raises an unlocked resource.
 * @param {State} state - Game state
 * @param {Blessing[]} blessings - Blessing choices
 * @returns {number} Chosen index
 */
function weakestResourceBlessing(state, blessings) {
  const unlocked = state._unlockedByHeadquarters(HQ_RESOURCE_UNLOCKS)
  let bestIndex = 0
  let bestRate = Infinity
  blessings.forEach((blessing, index) => {
    const raised = (BLESSING_PRODUCTIVITY_RESOURCES[blessing.type] ?? []).filter(resource => unlocked.includes(resource))
    for (const resource of raised) {
      const rate = state.netProduction(resource) * resourceValue(resource)
      if (rate < bestRate) {
        bestRate = rate
        bestIndex = index
      }
    }
  })
  return bestIndex
}

/**
 * Rough worth of a blessing in resource value, for the strong bot's choice.
 * @param {State} state - Game state
 * @param {Blessing} blessing - Blessing to estimate
 * @returns {number} Estimated value
 */
function blessingValue(state, blessing) {
  const {
    resources, buildings,
  } = state.colony
  const productionValue = BOUNDED_RESOURCES.reduce((sum, resource) => sum + state.production[resource] * resourceValue(resource), 0)
  const stockValue = BOUNDED_RESOURCES.reduce((sum, resource) => sum + resources[resource] * resourceValue(resource), 0)
  const raidsActive = buildings.headquarters.type !== HQ_TYPE_CAMP
  const raised = BLESSING_PRODUCTIVITY_RESOURCES[blessing.type]
  if (raised) {
    return raised.reduce((sum, resource) => sum + state.production[resource] * resourceValue(resource), 0) * blessing.productivity * blessing.timeout
  }
  switch (blessing.type) {
    case BLESSING_GIFT_FROM_THE_HEAVENS: {
      const cap = storageCapOf(state)
      return Object.entries(blessing.resources).reduce((sum, [
        resource,
        amount,
      ]) => sum + Math.min(amount, Math.max(0, cap - resources[resource])) * resourceValue(resource), 0)
    }
    case BLESSING_HOLY_EXPANSION: {
      const expansionValue = state.expansionCost.food + state.expansionCost.wood
      return blessing.territory * expansionValue / HQ_TERRITORY_PER_LEVEL * SLOT_VALUE_FACTOR
    }
    case BLESSING_RAPID_CONSTRUCTION:
      return productionValue * blessing.construction * blessing.timeout * CONSTRUCTION_VALUE_SHARE
    case BLESSING_FAVORABLE_WEATHER: {
      const bonus = state.colony.season.isWarm ? blessing.warm : blessing.cold
      return (state.production.food + state.consumption.wood) * bonus * blessing.timeout
    }
    case BLESSING_BLESSED_MARKETS:
      return BLESSED_MARKETS_VALUE
    case BLESSING_TEMPORARY_PEACE:
      return raidsActive ? stockValue * RAID_LOSS_SHARE : 0
    case BLESSING_CELESTIAL_FORTIFICATION:
      return raidsActive ? stockValue * RAID_LOSS_SHARE / 2 : 0
    default:
      return 0
  }
}
