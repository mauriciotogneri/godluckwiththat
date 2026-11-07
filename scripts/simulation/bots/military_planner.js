// Military planning for the simulation bots: an army sized to the expected raid, and the answer to an announced one.
// The bots read the same battle forecast the military window shows the player.

import {UNIT_STATS} from '@/js/engine/balancing.js'
import {resolveBattle} from '@/js/engine/battle.js'
import {UNIT_BUILDINGS, UNIT_TYPES} from '@/js/engine/constants.js'
import {HQ_TYPE_CAMP, RAID_PHASE_INCOMING, TRIBUTE_CANCEL, TRIBUTE_DELAY} from '@/js/engine/enums.js'
import {ARMY_COUNTER, ARMY_NONE} from './bot_profiles.js'
import {buildingItem, fitsReserve, resourceValue} from './economy_planner.js'

const DELAY_WHEN_SECONDS = 30 // Pays for a delay only once a losing raid is this close (buys time to train)
const MAX_UNITS_PER_RESPONSE = 50 // Units bought at most while answering one announced raid

/**
 * Raiders the next raid is expected to bring: the engine's raid size, split evenly over the unit
 * types the colony has unlocked (the real split is random).
 * @param {State} state - Game state
 * @returns {Object<string, number>} Expected raiders by unit type
 */
export function expectedRaid(state) {
  const count = state._raidSize
  const types = UNIT_TYPES.filter(type => state.unlockedBuildings.has(UNIT_BUILDINGS[type]))
  const enemy = {}
  UNIT_TYPES.forEach(type => {
    enemy[type] = 0
  })
  types.forEach((type, index) => {
    enemy[type] = Math.floor(count / types.length) + (index < count % types.length ? 1 : 0)
  })
  return enemy
}

/**
 * Forecast strength ratio against an enemy, optionally with one more unit of a type.
 * @param {State} state - Game state
 * @param {Object<string, number>} enemy - Raiders by unit type
 * @param {string|null} extraType - Unit type to add one of, or null
 * @returns {number} Colony strength over raider strength (above 1 wins)
 */
function forecastRatio(state, enemy, extraType) {
  const defender = state._raidDefender
  if (extraType) {
    defender.units[extraType] += 1
  }
  return resolveBattle(defender, {
    units: enemy,
  }).ratio
}

/**
 * Value of a unit's purchase cost.
 * @param {string} type - Unit type
 * @returns {number} Summed resource value of the cost
 */
function unitCostValue(type) {
  let total = 0
  for (const [
    resource,
    amount,
  ] of UNIT_STATS[type].cost.entries) {
    total += amount * resourceValue(resource)
  }
  return total
}

/**
 * The unit type that raises the forecast most for its cost (the forecast includes the counter bonus).
 * @param {State} state - Game state
 * @param {Object<string, number>} enemy - Raiders by unit type
 * @param {function(string): boolean} allowed - Whether a unit type can be bought now
 * @returns {string|null} Unit type, or null when none is allowed
 */
function bestUnitType(state, enemy, allowed) {
  const now = forecastRatio(state, enemy, null)
  let best = null
  let bestScore = -Infinity
  for (const type of UNIT_TYPES) {
    if (!allowed(type)) {
      continue
    }
    const score = (forecastRatio(state, enemy, type) - now) / unitCostValue(type)
    if (score > bestScore) {
      bestScore = score
      best = type
    }
  }
  return best
}

/**
 * Whether a unit type can be trained now: its building is built, below its cap.
 * @param {State} state - Game state
 * @param {string} type - Unit type
 * @returns {boolean} True when another unit fits
 */
function hasRoom(state, type) {
  const {
    buildings, military,
  } = state.colony
  return military.units[type] < buildings[UNIT_BUILDINGS[type]].unitCap
}

/**
 * Priority 8 — military: units (or military building levels for more room) until the expected raid's
 * forecast reaches the profile's ratio. No army at Camp, where no raids come.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @returns {Array<Object|null>} Wish items
 */
export function militaryItems(state, profile) {
  if (profile.army === ARMY_NONE || state.colony.buildings.headquarters.type === HQ_TYPE_CAMP) {
    return []
  }
  const enemy = expectedRaid(state)
  if (forecastRatio(state, enemy, null) >= profile.armyRatio) {
    return []
  }
  const type = bestUnitType(state, enemy, candidate => hasRoom(state, candidate))
  if (type) {
    return [
      {
        label: 'unit:' + type,
        cost: UNIT_STATS[type].cost,
        save: false,
        run: () => state.buyUnits(type, 1) > 0,
      },
    ]
  }
  const buildingType = bestUnitType(state, enemy, candidate => state.unlockedBuildings.has(UNIT_BUILDINGS[candidate]))
  return buildingType ? [buildingItem(state, UNIT_BUILDINGS[buildingType], false, 'military')] : []
}

/**
 * Answers an announced raid the forecast says is lost (or below the profile's ratio): trains the
 * units that help most, then (close to arrival) pays to delay it, or to call it off; otherwise the
 * loss is accepted. A bot without an army only calls the raid off when that is cheap.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @param {Object<string, number>} reserve - Amounts that must stay in stock
 */
export function respondToRaid(state, profile, reserve) {
  const raid = state.colony.military.raid
  if (raid?.phase !== RAID_PHASE_INCOMING) {
    return
  }
  let forecast = state._raidForecast
  if (profile.army === ARMY_NONE) {
    const cost = raid.cancelCost
    const cheap = [...cost.entries].every(([
      resource,
      amount,
    ]) => amount <= state.colony.resources[resource] * profile.cheapTributeShare)
    if (!forecast.victory && cheap) {
      state.payTribute(TRIBUTE_CANCEL)
    }
    return
  }
  let bought = 0
  while ((!forecast.victory || forecast.ratio < profile.armyRatio) && bought < MAX_UNITS_PER_RESPONSE) {
    const type = bestUnitType(state, raid.enemy, candidate => hasRoom(state, candidate) && fitsReserve(state, UNIT_STATS[candidate].cost, reserve))
    if (!type || state.buyUnits(type, 1) === 0) {
      break
    }
    bought += 1
    forecast = state._raidForecast
  }
  if (forecast.victory) {
    return
  }
  // No room to train: add a military building level for the most useful unit type
  if (!UNIT_TYPES.some(type => hasRoom(state, type))) {
    const type = bestUnitType(state, raid.enemy, candidate => state.unlockedBuildings.has(UNIT_BUILDINGS[candidate]))
    const item = type ? buildingItem(state, UNIT_BUILDINGS[type], false, 'raid') : null
    if (item && fitsReserve(state, item.cost, reserve)) {
      item.run()
    }
  }
  if (raid.remainingSeconds > DELAY_WHEN_SECONDS) {
    return
  }
  if (raid.canDelay && fitsReserve(state, raid.delayCost, reserve)) {
    state.payTribute(TRIBUTE_DELAY)
  } else if (profile.army === ARMY_COUNTER && fitsReserve(state, raid.cancelCost, reserve)) {
    state.payTribute(TRIBUTE_CANCEL)
  }
}
