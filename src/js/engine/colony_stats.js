// Colony statistics — one plain snapshot of how far a colony has progressed (used by the balance simulation).

import {SEASON_DURATION, TRIBUTE_RESOURCE_VALUES} from '@/js/engine/balancing.js'
import {BOUNDED_RESOURCES, HEADER_RESOURCES, HQ_RESOURCE_UNLOCKS, HQ_TYPES, RESEARCH_TREE} from '@/js/engine/constants.js'
import {BONUS_STORAGE_CAPACITY, RESOURCE_FAITH} from '@/js/engine/enums.js'

/**
 * Reads a colony's progress into a plain object. This is the only place that reads the State
 * for statistics; everything else works on the returned snapshot.
 *
 * - elapsed: game seconds since the start, from the year and season
 * - hqTier / hqLevel: headquarters type index in HQ_TYPES and its territory level
 * - workers / workersCap / idleWorkers: population
 * - stock / netRates: amount and net per-second rate of every resource
 * - storageCap: shared cap of the bounded resources, with the Storage research bonus
 * - productionValue: net production of the bounded resources weighted by TRIBUTE_RESOURCE_VALUES;
 *   output into full storage is lost, so a resource at the cap adds no gain (a loss still counts)
 * - faithRate: net faith per second
 * - armyUnits: trained units plus the archers the tower fights as
 * - researchCount: completed researches
 * - buildingLevels: summed levels of every building except the headquarters
 * - altar / temple / monument: religious building levels
 * - templeWorkers: workers assigned to the temple
 * - house / storehouse: house and storehouse levels
 * - territoryFree: territory slots not used or reserved by a construction
 * - constructionMult: construction duration multiplier (research and Rapid Construction)
 * - unlockedResources / unlockedBuildings: keys unlocked by the headquarters type
 *
 * @param {State} state - Game state to read
 * @returns {Object} Colony statistics snapshot
 */
export function colonyStats(state) {
  const {
    colony,
  } = state
  const {
    year, season, resources, buildings, military,
  } = colony
  const headquarters = buildings.headquarters
  const bonuses = buildings.academy.completedBonuses(RESEARCH_TREE)

  const stock = {}
  const netRates = {}
  for (const resource of HEADER_RESOURCES) {
    stock[resource] = resources[resource]
    netRates[resource] = state.netProduction(resource)
  }

  const storageCap = buildings.storehouse.storageCap(bonuses[BONUS_STORAGE_CAPACITY] ?? 0)
  let productionValue = 0
  for (const resource of BOUNDED_RESOURCES) {
    if (netRates[resource] > 0 && stock[resource] >= storageCap) {
      continue
    }
    productionValue += netRates[resource] * TRIBUTE_RESOURCE_VALUES[resource]
  }

  // Each year is one warm season followed by one cold season
  const seasonsPassed = (year - 1) * 2 + (season.isCold ? 1 : 0)

  return {
    elapsed: seasonsPassed * SEASON_DURATION + season.seasonElapsed,
    hqTier: HQ_TYPES.indexOf(headquarters.type),
    hqLevel: headquarters.level,
    workers: resources.workers,
    workersCap: buildings.house.workersCap,
    idleWorkers: colony.idleWorkers,
    stock: stock,
    netRates: netRates,
    storageCap: storageCap,
    productionValue: productionValue,
    faithRate: netRates[RESOURCE_FAITH],
    armyUnits: military.totalUnits + buildings.tower.archers,
    researchCount: buildings.academy.completed.size,
    buildingLevels: buildings.totalLevels,
    altar: buildings.altar.level,
    temple: buildings.temple.level,
    monument: buildings.monument.level,
    templeWorkers: buildings.temple.workers,
    house: buildings.house.level,
    storehouse: buildings.storehouse.level,
    territoryFree: headquarters.territoryCap + resources.territoryBonus - resources.territory,
    constructionMult: state._constructionDurationMult,
    unlockedResources: state._unlockedByHeadquarters(HQ_RESOURCE_UNLOCKS),
    unlockedBuildings: [...state.unlockedBuildings],
  }
}
