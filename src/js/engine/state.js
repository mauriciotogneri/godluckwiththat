// Central game state container — mutation handler, game loop, and player actions.

import {CHALLENGE_REFERENCE_STATS, MONUMENT_FAITH_PER_LEVEL, PRODUCTION_RATES, RAID_BONUS_PER_YEAR, RAID_GRACE_PERIOD, RAID_INTERVAL_BASE, RAID_INTERVAL_MIN, RAID_INTERVAL_PER_TERRITORY, RAID_UNITS_BASE, RAID_UNITS_PER_TERRITORY, RAID_UNITS_PER_YEAR, RAID_WARNING_TIME, RESEARCH_TIME_MULTIPLIER, SEASON_COLD_FOOD_MODIFIER, SEASON_COLD_WOOD_MODIFIER, SEASON_WARM_FOOD_MODIFIER, SEASON_WARM_WOOD_MODIFIER, SHORTAGE_MAX_PENALTY, TRIBUTE_DELAY_SECONDS, TRIBUTE_MAX_RESOURCES, TRIBUTE_MIN_RESOURCES, TRIBUTE_RESOURCE_VALUES, TRIBUTE_ROUNDING, TRIBUTE_VALUE_PER_UNIT, UNIT_STATS, WORKER_FOOD_CONSUMPTION, WORKER_RECRUIT_COST, WORKER_WOOD_CONSUMPTION} from '@/js/engine/balancing.js'
import analytics from '@/js/engine/analytics.js'
import {IMG_BUILDING_WALL, IMG_OTHER_TERRITORY, IMG_RESOURCE_FAITH, IMG_RESOURCE_KNOWLEDGE, IMG_SEASON_COLD, IMG_SEASON_WARM, IMG_UNIT_WORKER, SND_BUILDING_CREATED, SND_HEADQUARTERS_UPGRADED, SND_NOTIFICATION_ALERT, SND_NOTIFICATION_DISASTER, SND_NOTIFICATION_SEASON, SND_RESEARCH_COMPLETED, SND_TERRITORY_EXPANDED, SND_UNDER_ATTACK, SND_WORKER_ACADEMY, SND_WORKER_CREATED, SND_WORKER_FARM, SND_WORKER_MINE, SND_WORKER_TEMPLE, SND_WORKER_WOODCUTTER} from '@/js/engine/assets.js'
import audio from '@/js/engine/audio.js'
import {resolveBattle} from '@/js/engine/battle.js'
import {adjustChallenge, adjustDelay, healthScore} from '@/js/engine/challenge_scaling.js'
import {colonyStats} from '@/js/engine/colony_stats.js'
import {migrateSave} from '@/js/engine/save_migration.js'
import storage from '@/js/engine/storage.js'
import {BLESSING_PRODUCTIVITY_RESOURCES, BOUNDED_RESOURCES, BUILDING_CLASS_MAP, BUILDING_IMAGE_MAP, CHALLENGE_DEFINITIONS, DOWNGRADABLE_BUILDINGS, HQ_BUILDING_UNLOCKS, HQ_RESOURCE_UNLOCKS, HQ_TYPES, IMG_BUILDING_HEADQUARTERS_MAP, RESEARCH_COSTS, RESEARCH_PREREQUISITES, RESEARCH_TREE, RESOURCE_LIMIT_EVENT_CONFIG, RESOURCE_NEGATIVE_PRODUCTION_EVENT_CONFIG, TUTORIAL_STEPS, UNIT_BUILDINGS, UNIT_TYPES} from '@/js/engine/constants.js'
import Colony from '@/js/models/colony.js'
import Consumption from '@/js/models/consumption.js'
import Cost from '@/js/models/cost.js'
import Meta from '@/js/models/meta.js'
import Production from '@/js/models/production.js'
import Raid from '@/js/models/raid.js'
import RaidReport from '@/js/models/raid_report.js'
import {BLESSING_BLESSED_MARKETS, BLESSING_CELESTIAL_FORTIFICATION, BLESSING_FAVORABLE_WEATHER, BLESSING_GIFT_FROM_THE_HEAVENS, BLESSING_HOLY_EXPANSION, BLESSING_RAPID_CONSTRUCTION, BLESSING_TEMPORARY_PEACE, BONUS_CONSTRUCTION_TIME, BONUS_EXPANSION_COST, BONUS_FAITH_PRODUCTION, BONUS_FOOD_CONSUMPTION, BONUS_FOOD_PRODUCTION, BONUS_HABITATION, BONUS_KNOWLEDGE_PRODUCTION, BONUS_MINING_PRODUCTION, BONUS_STORAGE_CAPACITY, BONUS_UNIT_ATTACK, BONUS_UNIT_DEFENSE, BONUS_WARNING_TIME, BONUS_WOOD_CONSUMPTION, BONUS_WOOD_PRODUCTION, BONUS_WORKER_PRODUCTIVITY, BUILDING_ACADEMY, BUILDING_COPPER_MINE, BUILDING_FARM, BUILDING_GOLD_MINE, BUILDING_HEADQUARTERS, BUILDING_HOUSE, BUILDING_IRON_MINE, BUILDING_MARKET, BUILDING_MONUMENT, BUILDING_QUARRY, BUILDING_STOREHOUSE, BUILDING_TEMPLE, BUILDING_TOWER, BUILDING_WALL, BUILDING_WOODCUTTER, CHALLENGE_MODAL_FAILURE, CHALLENGE_MODAL_REWARD, CHALLENGE_MODAL_WIN, CHALLENGE_MOOD_MERCIFUL, CHALLENGE_STATUS_STARTED, EVENT_TYPE_BUILDING_UPGRADE, EVENT_TYPE_CHALLENGE_STARTED, EVENT_TYPE_POPULATION_LIMIT_REACHED, EVENT_TYPE_RAID_INCOMING, EVENT_TYPE_RAID_RESULT, EVENT_TYPE_RESEARCH_COMPLETE, EVENT_TYPE_RESOURCE_LIMIT_REACHED, EVENT_TYPE_RESOURCE_NEGATIVE_PRODUCTION, EVENT_TYPE_SEASON_CHANGED, EVENT_TYPE_IDLE_WORKERS, EVENT_TYPE_TERRITORY_LIMIT_REACHED, HQ_TYPE_CAMP, PUNISHMENT_CROP_FAILURE, PUNISHMENT_LANDSLIDE, PUNISHMENT_PLAGUE, PUNISHMENT_VOLCANO, PUNISHMENT_WILDFIRES, RAID_PHASE_INCOMING, RAID_PHASE_WAITING, RESOURCE_FOOD, RESOURCE_WOOD, TRIBUTE_CANCEL, TRIBUTE_DELAY, TUTORIAL_MODAL_SEASON_CHANGED, TUTORIAL_MODAL_NEGATIVE_PRODUCTION, TUTORIAL_MODAL_HQ_UPGRADE, TUTORIAL_MODAL_CHALLENGE_STARTED, TUTORIAL_MODAL_RAID_INCOMING} from '@/js/engine/enums.js'
import {t} from '@/js/i18n/localized.js'

/**
 * Central game state container.
 * Wraps Meta and Colony instances. Holds the core game loop
 * (production, seasons, construction) and all player action methods.
 *
 * @property {Meta} meta - Game metadata (version, timestamps, challenges)
 * @property {Colony} colony - Active colony instance
 */
class State {
  /**
   * @param {Meta} meta - Meta instance
   * @param {Colony} colony - Colony instance
   */
  constructor(meta, colony) {
    this.meta = meta // Game metadata (version, timestamps, challenges)
    this.colony = colony // Active colony instance

    // Track which bounded resources are currently at their storage cap
    // (initialized empty — storage cap is 0 before the first update tick)
    this._resourcesAtCap = new Set()

    // Track which bounded resources currently have negative net production
    // (initialized empty — production is 0 before the first update tick)
    this._resourcesNegativeProduction = new Set()

    // Track whether idle workers were present on the previous tick so the
    // idle-workers event fires only on the transition (not every tick)
    this._hadIdleWorkers = false

    // Seasonal multipliers for food production and wood consumption,
    // recalculated each tick in update(). Initialized to neutral defaults.
    this.seasonMultipliers = {
      food: 1,
      wood: 1,
    }

    // Per-second gross production rates (ephemeral, recalculated each tick)
    this.production = new Production({})

    // Per-second upkeep of workers and army (ephemeral, recalculated each tick)
    this.consumption = new Consumption({})

    // Army share of the per-second upkeep, kept for the header tooltips (ephemeral)
    this.armyConsumption = {
      food: 0,
      wood: 0,
    }

    // Productivity ratio 0–1, recalculated each tick in update().
    // Reduced by food/wood shortage.
    this.productivity = 1

    // Per-resource production multipliers (research + blessings + season),
    // recalculated each tick in update(). Initialized to neutral defaults.
    this.productionMultipliers = {
      food: 1,
      wood: 1,
      stone: 1,
      copper: 1,
      iron: 1,
      gold: 1,
      faith: 1,
      knowledge: 1,
    }

    // Per-resource consumption multipliers (research bonuses + season),
    // recalculated each tick in update(). Initialized to neutral defaults.
    this.consumptionMultipliers = {
      food: 1,
      wood: 1,
    }

    // Attack and Defense research bonuses (fractions) applied to units in battle,
    // recalculated each tick in update(). Used by the UI to show effective unit stats.
    this.unitBonuses = {
      attack: 0,
      defense: 0,
    }

    // Track which buildings are currently constructing so advanceConstruction()
    // only iterates the active subset instead of all 19 buildings every frame
    this._constructingKeys = new Set()
    for (const [
      key,
      building,
    ] of Object.entries(colony.buildings)) {
      if (building.isConstructing) {
        this._constructingKeys.add(key)
      }
    }

    // Track whether HQ type upgrade is in progress
    this._hqUpgrading = colony.buildings.headquarters.isUpgrading

    // Whether the game is paused (e.g. by a tutorial modal or challenge modal)
    this.paused = false

    // Which challenge modal is showing: null, CHALLENGE_MODAL_REWARD, CHALLENGE_MODAL_FAILURE, or CHALLENGE_MODAL_WIN
    this.challengeModal = null

    // Outcome of the last raid (RaidReport). Non-null while the raid result window shows, which keeps the game paused
    this.raidReport = null

    // Last countdown adjustment from adjustChallenge (scales and backstop flag), kept for the balance simulation (not saved)
    this.challengeScaling = null
  }

  /**
   * Advances the colony simulation by the given time delta.
   * Recomputes production rates from assigned workers and passive building levels,
   * applies resource gains scaled by delta, and caps at storage limits.
   *
   * @param {number} delta - Seconds elapsed since last tick
   */
  update(delta) {
    const {
      resources, buildings,
    } = this.colony
    const {
      production, consumption,
    } = this

    // Refresh derived state before production: territory counts both completed
    // building levels and buildings under construction (each reserves one slot).
    // Research bonuses are aggregated from all completed researches in the tech
    // tree — these affect production multipliers, consumption reduction, and
    // population caps, so they must be resolved before rate calculations.
    resources.territory = buildings.totalLevels + buildings.pendingTerritory
    const bonuses = buildings.academy.completedBonuses(RESEARCH_TREE)
    const habitationBonus = bonuses[BONUS_HABITATION] ?? 0
    buildings.house.workersCap = buildings.house.populationCap(habitationBonus)
    const storageBonus = bonuses[BONUS_STORAGE_CAPACITY] ?? 0
    const storageCap = buildings.storehouse.storageCap(storageBonus)

    // BLESSED_MARKETS: override trade fee to 0% while active
    const blessings = this.meta.challenges.activeBlessings
    buildings.market.blessedMarkets = blessings.some(blessing => blessing.type === BLESSING_BLESSED_MARKETS)

    // Seasonal multipliers for food production and wood consumption
    this.seasonMultipliers = this._computeSeasonMultipliers(blessings)

    // Production rates from buildings, blessings, punishments, and season
    // (before productivity penalty — used for deficit calculation below)
    const punishments = this.meta.challenges.activePunishments
    const {
      rates: productionRates, multipliers: productionMultipliers,
    } = this._computeProductionRates(bonuses, blessings, punishments, this.seasonMultipliers)
    this.productionMultipliers = productionMultipliers

    // Upkeep: every worker (idle and assigned) and every unit consumes food and wood
    // each second. Research bonuses reduce the base consumption rates (−5%/tier).
    // Wood upkeep is additionally scaled by seasonal modifier (cold = more heating).
    // Consumption rates are per-second and also used by the UI (header tooltips)
    const {
      rates: consumptionRates, multipliers: consumptionMultipliers, armyRates,
    } = this._computeConsumptionRates(bonuses, this.seasonMultipliers, resources.workers, this.colony.military.units)
    this.consumptionMultipliers = consumptionMultipliers
    this.armyConsumption = armyRates
    this.unitBonuses = {
      attack: bonuses[BONUS_UNIT_ATTACK] ?? 0,
      defense: bonuses[BONUS_UNIT_DEFENSE] ?? 0,
    }

    // Productivity ratio based on current production vs consumption. Uses raw
    // production rates (not penalized) so reassigning workers takes effect
    // immediately instead of being locked by the previous tick's penalty
    const productivity = this._computeGeneralProductivity(resources.workers, productionRates, consumptionRates)
    this.productivity = productivity

    // Apply productivity penalty to production rates
    production.food = productionRates.food * productivity
    production.wood = productionRates.wood * productivity
    production.stone = productionRates.stone * productivity
    production.copper = productionRates.copper * productivity
    production.iron = productionRates.iron * productivity
    production.gold = productionRates.gold * productivity
    production.faith = productionRates.faith * productivity
    production.knowledge = productionRates.knowledge * productivity

    // Apply consumption rates from worker and army upkeep
    consumption.food = consumptionRates.food
    consumption.wood = consumptionRates.wood

    // Apply production gains to resources. Rates are per-second, so
    // multiplying by delta converts to the actual elapsed interval
    resources.food += production.food * delta
    resources.wood += production.wood * delta
    resources.stone += production.stone * delta
    resources.copper += production.copper * delta
    resources.iron += production.iron * delta
    resources.gold += production.gold * delta
    resources.faith += production.faith * delta
    resources.knowledge += production.knowledge * delta

    // Deduct upkeep from resources. Guarded by delta > 0 because update(0) is
    // used as a "recalculate-only" call by action methods (e.g. after assigning
    // a worker) — no resources should flow
    if (delta > 0) {
      resources.food = Math.max(0, resources.food - consumption.food * delta)
      resources.wood = Math.max(0, resources.wood - consumption.wood * delta)
    }

    // Cap all bounded resources at the storehouse storage limit.
    for (const resource of BOUNDED_RESOURCES) {
      resources[resource] = Math.min(resources[resource], storageCap)
    }

    // Edge-detection for resources hitting their storage cap. The _resourcesAtCap
    // Set tracks which resources were at cap on the previous tick, so events fire
    // only on the transition (not repeatedly every tick). When a resource drops
    // back below cap, the warning event is auto-dismissed
    for (const resource of BOUNDED_RESOURCES) {
      if (resources[resource] >= storageCap) {
        if (!this._resourcesAtCap.has(resource)) {
          this._resourcesAtCap.add(resource)
          const config = RESOURCE_LIMIT_EVENT_CONFIG[resource]
          this.colony.events.addPast({
            type: EVENT_TYPE_RESOURCE_LIMIT_REACHED,
            textKey: config.textKey,
            icon: config.icon,
          })
          audio.playSound(SND_NOTIFICATION_ALERT)
        }
      } else if (this._resourcesAtCap.has(resource)) {
        this._resourcesAtCap.delete(resource)
        const config = RESOURCE_LIMIT_EVENT_CONFIG[resource]
        this.colony.events.dismissPastByTextKey(config.textKey)
      }
    }

    // Floor all resources at zero — consumption or other deductions above
    // may have pushed values negative
    resources.food = Math.max(0, resources.food)
    resources.wood = Math.max(0, resources.wood)
    resources.stone = Math.max(0, resources.stone)
    resources.copper = Math.max(0, resources.copper)
    resources.iron = Math.max(0, resources.iron)
    resources.gold = Math.max(0, resources.gold)
    resources.faith = Math.max(0, resources.faith)
    resources.knowledge = Math.max(0, resources.knowledge)

    // Edge-detection for negative net production (same pattern as storage cap
    // events above). netProduction() = production − consumption, so this fires
    // when upkeep exceeds output. Warning auto-dismisses when production recovers
    for (const resource of BOUNDED_RESOURCES) {
      if (this.netProduction(resource) < 0) {
        if (!this._resourcesNegativeProduction.has(resource)) {
          this._resourcesNegativeProduction.add(resource)
          const config = RESOURCE_NEGATIVE_PRODUCTION_EVENT_CONFIG[resource]
          this.colony.events.addPast({
            type: EVENT_TYPE_RESOURCE_NEGATIVE_PRODUCTION,
            textKey: config.textKey,
            icon: config.icon,
          })
          audio.playSound(SND_NOTIFICATION_ALERT)
          if (resource === RESOURCE_FOOD || resource === RESOURCE_WOOD) {
            this._triggerTutorialModal(TUTORIAL_MODAL_NEGATIVE_PRODUCTION)
          }
        }
      } else if (this._resourcesNegativeProduction.has(resource)) {
        this._resourcesNegativeProduction.delete(resource)
        const config = RESOURCE_NEGATIVE_PRODUCTION_EVENT_CONFIG[resource]
        this.colony.events.dismissPastByTextKey(config.textKey)
      }
    }

    // Edge-detection for idle workers (same pattern as above).
    // Event appears when idle count rises above 0, auto-dismisses when it drops to 0
    const hasIdle = this.colony.idleWorkers > 0
    if (hasIdle && !this._hadIdleWorkers) {
      this._hadIdleWorkers = true
      this.colony.events.addPast({
        type: EVENT_TYPE_IDLE_WORKERS,
        textKey: 'event.idleWorkers',
        icon: IMG_UNIT_WORKER,
      })
      audio.playSound(SND_NOTIFICATION_ALERT)
    } else if (!hasIdle && this._hadIdleWorkers) {
      this._hadIdleWorkers = false
      this.colony.events.dismissPastByType(EVENT_TYPE_IDLE_WORKERS)
    }
  }

  /**
   * Returns the net production rate for a resource (gross minus consumption).
   * @param {string} resource - Resource key
   * @returns {number} Net production per second
   */
  netProduction(resource) {
    return this.production[resource] - (this.consumption[resource] ?? 0)
  }

  /**
   * Computes the general productivity ratio based on resource shortages.
   * Starts at 1 (100%) and is reduced when food or wood has negative net
   * production. The reduction is proportional to the deficit ratio (uncovered
   * consumption / total consumption), scaled by SHORTAGE_MAX_PENALTY.
   * Only the largest deficit applies. Uses current-tick raw production
   * (before productivity penalty) and current-tick consumption to avoid a
   * feedback loop where penalized production locks productivity at zero.
   * The _resourcesNegativeProduction guard introduces a one-tick delay:
   * the penalty only activates after a tick where negative net production
   * was detected.
   *
   * Examples (SHORTAGE_MAX_PENALTY = 1):
   *
   * | Scenario               | Workers | Food (prod/cons) | Wood (prod/cons) | Result |
   * |------------------------|---------|------------------|------------------|--------|
   * | No workers             | 0       | —                | —                | 0      |
   * | No shortage            | 5       | 10 / 8           | 6 / 4            | 1      |
   * | 50% food deficit       | 5       | 5 / 10           | 6 / 4            | 0.5    |
   * | Full food deficit      | 5       | 0 / 10           | 6 / 4            | 0      |
   * | 50% wood deficit       | 5       | 10 / 8           | 4 / 8            | 0.5    |
   * | Both, food worse       | 5       | 3 / 10           | 5 / 8            | 0.3    |
   *
   * @param {number} workers - Current worker count
   * @param {{ food: number, wood: number }} productionRates - Raw production rates (before productivity penalty)
   * @param {{ food: number, wood: number }} consumptionRates - Current-tick consumption rates
   * @returns {number} Productivity ratio between 0 and 1
   */
  _computeGeneralProductivity(workers, productionRates, consumptionRates) {
    let productivity = 1
    if (workers === 0) {
      productivity = 0
    }
    if (this._resourcesNegativeProduction.has(RESOURCE_FOOD) && consumptionRates.food > 0) {
      const deficit = Math.max(0, consumptionRates.food - productionRates.food)
      productivity = Math.min(productivity, 1 - (deficit / consumptionRates.food) * SHORTAGE_MAX_PENALTY)
    }
    if (this._resourcesNegativeProduction.has(RESOURCE_WOOD) && consumptionRates.wood > 0) {
      const deficit = Math.max(0, consumptionRates.wood - productionRates.wood)
      productivity = Math.min(productivity, 1 - (deficit / consumptionRates.wood) * SHORTAGE_MAX_PENALTY)
    }
    return productivity
  }

  /**
   * Computes seasonal multipliers for food production and wood consumption.
   * FAVORABLE_WEATHER blessing boosts food production and reduces wood consumption.
   *
   * Example output (warm/cold factor = 0.1):
   *   Scenario             | Food production | Wood consumption
   *   Warm, no blessing    |             1.2 |              0.8
   *   Warm, with blessing  |             1.3 |              0.7
   *   Cold, no blessing    |             0.8 |              1.2
   *   Cold, with blessing  |             0.9 |              1.1
   *
   * @param {Array} blessings - Active blessings from meta.challenges
   * @returns {{ food: number, wood: number }}
   */
  _computeSeasonMultipliers(blessings) {
    let foodModifier = this.colony.season.isWarm ? SEASON_WARM_FOOD_MODIFIER : SEASON_COLD_FOOD_MODIFIER
    let woodModifier = this.colony.season.isWarm ? SEASON_WARM_WOOD_MODIFIER : SEASON_COLD_WOOD_MODIFIER
    const favorableWeather = blessings.find(blessing => blessing.type === BLESSING_FAVORABLE_WEATHER)
    if (favorableWeather) {
      const seasonBonus = this.colony.season.isWarm ? favorableWeather.warm : favorableWeather.cold
      foodModifier += seasonBonus
      woodModifier -= seasonBonus
    }
    return {
      food: 1 + foodModifier,
      wood: 1 + woodModifier,
    }
  }

  /**
   * Computes per-second consumption rates for food and wood based on worker
   * count, research bonuses, and seasonal modifiers. Returns final rates
   * after all reductions are applied.
   *
   * Food formula:  workerCount × 0.1 × max(0, 1 − foodBonus)
   * Wood formula:  workerCount × 0.1 × max(0, 1 − woodBonus − (1 − seasonMultipliers.wood))
   *
   * Example outputs (base rate = 0.1/worker/sec, each research tier = 0.05):
   *
   *  Workers | Research | Season | Food/s | Wood/s
   *  --------|----------|--------|--------|-------
   *        0 |   0 tier |   warm |   0.00 |   0.00
   *       10 |   0 tier |   warm |   1.00 |   0.80
   *       10 |   0 tier |   cold |   1.00 |   1.20
   *       10 |  2 tiers |   warm |   0.90 |   0.70
   *       10 |  4 tiers |   warm |   0.80 |   0.60
   *       10 |  4 tiers |   cold |   0.80 |   1.00
   *       20 |   0 tier |   cold |   2.00 |   2.40
   *
   * Warm season reduces wood consumption by 20% (seasonMultipliers.wood = 0.8).
   * Cold season increases wood consumption by 20% (seasonMultipliers.wood = 1.2).
   * Food consumption is unaffected by season.
   *
   * Units add their own upkeep (UNIT_STATS[type].upkeep per unit) with the same
   * food and wood multipliers. Their share is also returned on its own (armyRates)
   * and is included in rates.
   *
   * @param {Object} bonuses - Research bonus map from academy.completedBonuses()
   * @param {{ food: number, wood: number }} seasonMultipliers - Seasonal multipliers from _computeSeasonMultipliers
   * @param {number} workerCount - Total worker count (idle + assigned)
   * @param {Object<string, number>} [units={}] - Army unit count per type
   * @returns {{ rates: { food: number, wood: number }, multipliers: { food: number, wood: number }, armyRates: { food: number, wood: number } }}
   */
  _computeConsumptionRates(bonuses, seasonMultipliers, workerCount, units = {}) {
    const foodMultiplier = Math.max(0, 1 - (bonuses[BONUS_FOOD_CONSUMPTION] ?? 0))
    // Stack bonus and season reductions additively
    const woodMultiplier = Math.max(0, 1
      - (bonuses[BONUS_WOOD_CONSUMPTION] ?? 0)
      - (1 - seasonMultipliers.wood))
    const multipliers = {
      food: foodMultiplier,
      wood: woodMultiplier,
    }
    const armyRates = {
      food: 0,
      wood: 0,
    }
    for (const type of UNIT_TYPES) {
      const count = units[type] ?? 0
      armyRates.food += count * UNIT_STATS[type].upkeep.food * foodMultiplier
      armyRates.wood += count * UNIT_STATS[type].upkeep.wood * woodMultiplier
    }
    // With no workers only the army consumes
    const workers = Math.max(0, workerCount)
    return {
      rates: {
        food: workers * WORKER_FOOD_CONSUMPTION * foodMultiplier + armyRates.food,
        wood: workers * WORKER_WOOD_CONSUMPTION * woodMultiplier + armyRates.wood,
      },
      multipliers: multipliers,
      armyRates: armyRates,
    }
  }

  /**
   * Computes per-second production rates from building state, research bonuses,
   * active blessings, active punishments, and seasonal modifiers. Returns raw
   * rates before the productivity penalty (applied externally in update()).
   *
   * Two stages:
   *   1. Base rates: workers × config.rate (or level × config.rate for passive buildings)
   *   2. Per-resource multipliers: research + worker productivity (bounded only) + blessings + punishments + season
   *
   * @param {Object} bonuses - Research bonus map from academy.completedBonuses()
   * @param {Array} blessings - Active blessings from meta.challenges
   * @param {Array} punishments - Active punishments from meta.challenges
   * @param {{ food: number, wood: number }} seasonMultipliers - Seasonal multipliers from _computeSeasonMultipliers
   * @returns {{ food: number, wood: number, stone: number, copper: number, iron: number, gold: number, faith: number, knowledge: number }}
   */
  _computeProductionRates(bonuses, blessings, punishments, seasonMultipliers) {
    const {
      buildings,
    } = this.colony
    // Stage 1: Base production rates (workers/level × config.rate, no multipliers)
    const baseRates = {
      food: 0,
      wood: 0,
      stone: 0,
      copper: 0,
      iron: 0,
      gold: 0,
      faith: 0,
      knowledge: 0,
    }

    for (const [
      buildingKey,
      config,
    ] of Object.entries(PRODUCTION_RATES)) {
      const building = buildings[buildingKey]
      if (building.level > 0) {
        if (config.passive) {
          baseRates[config.resource] += building.level * config.rate
        } else if (building.workers > 0) {
          baseRates[config.resource] += building.workers * config.rate
        }
      }
    }

    // Stage 2: Per-resource multipliers (additive accumulation)
    const workerProductivityBonus = bonuses[BONUS_WORKER_PRODUCTIVITY] ?? 0
    const multipliers = {
      food: 1 + (bonuses[BONUS_FOOD_PRODUCTION] ?? 0) + workerProductivityBonus,
      wood: 1 + (bonuses[BONUS_WOOD_PRODUCTION] ?? 0) + workerProductivityBonus,
      stone: 1 + (bonuses[BONUS_MINING_PRODUCTION] ?? 0) + workerProductivityBonus,
      copper: 1 + (bonuses[BONUS_MINING_PRODUCTION] ?? 0) + workerProductivityBonus,
      iron: 1 + (bonuses[BONUS_MINING_PRODUCTION] ?? 0) + workerProductivityBonus,
      gold: 1 + (bonuses[BONUS_MINING_PRODUCTION] ?? 0) + workerProductivityBonus,
      knowledge: 1 + (bonuses[BONUS_KNOWLEDGE_PRODUCTION] ?? 0),
      faith: 1 + (bonuses[BONUS_FAITH_PRODUCTION] ?? 0),
    }

    // Blessing productivity bonuses (additive)
    for (const blessing of blessings) {
      if (blessing.productivity) {
        for (const resource of BLESSING_PRODUCTIVITY_RESOURCES[blessing.type] ?? []) {
          multipliers[resource] += blessing.productivity
        }
      }
    }

    // Punishment productivity penalties (subtractive)
    for (const punishment of punishments) {
      if (punishment.type === PUNISHMENT_CROP_FAILURE && punishment.productivityFarm) {
        multipliers.food -= punishment.productivityFarm
      } else if (punishment.type === PUNISHMENT_WILDFIRES && punishment.productivityWoodcutter) {
        multipliers.wood -= punishment.productivityWoodcutter
      } else if (punishment.type === PUNISHMENT_LANDSLIDE && punishment.productivityMines) {
        multipliers.stone -= punishment.productivityMines
        multipliers.copper -= punishment.productivityMines
        multipliers.iron -= punishment.productivityMines
        multipliers.gold -= punishment.productivityMines
      } else if ((punishment.type === PUNISHMENT_PLAGUE || punishment.type === PUNISHMENT_VOLCANO) && punishment.productivityGeneral) {
        multipliers.food -= punishment.productivityGeneral
        multipliers.wood -= punishment.productivityGeneral
        multipliers.stone -= punishment.productivityGeneral
        multipliers.copper -= punishment.productivityGeneral
        multipliers.iron -= punishment.productivityGeneral
        multipliers.gold -= punishment.productivityGeneral
        multipliers.faith -= punishment.productivityGeneral
        multipliers.knowledge -= punishment.productivityGeneral
      }
    }

    // Season modifier on food production (additive)
    multipliers.food += seasonMultipliers.food - 1

    // Combine base rates with multipliers
    const rates = {}
    for (const resource of Object.keys(baseRates)) {
      rates[resource] = baseRates[resource] * multipliers[resource]
    }

    return {
      rates: rates,
      multipliers: multipliers,
    }
  }

  /**
   * Advances season, construction, research, challenge, event, and raid timers by one step.
   * Raids run last so they can correct the raid event after advanceEvents, and so a challenge
   * result and a raid result never land in the same step (a paused game skips the raid step).
   * @param {number} delta - Game seconds to advance
   */
  advanceProgress(delta) {
    this.advanceSeason(delta)
    this.advanceConstruction(delta)
    this.advanceResearch(delta)
    this.advanceChallenges(delta)
    this.advanceEvents(delta)
    this.advanceRaids(delta)
  }

  /**
   * Advances the season elapsed timer and flips season when duration is reached.
   * Driven by requestAnimationFrame for smooth visual progress.
   * @param {number} delta - Seconds since last season tick
   */
  advanceSeason(delta) {
    const wasCold = this.colony.season.isCold
    const flips = this.colony.season.advance(delta)
    if (flips === 0) {
      return
    }
    // Count warm arrivals (each = new year). Starting cold: flips 1,3,5...
    // land on warm → ceil(flips/2). Starting warm: flips 2,4,6... → floor(flips/2).
    const yearIncrements = wasCold ? Math.ceil(flips / 2) : Math.floor(flips / 2)
    this.colony.year += yearIncrements
    const isWarm = this.colony.season.isWarm
    audio.playSound(SND_NOTIFICATION_SEASON)
    this.colony.events.dismissPastByType(EVENT_TYPE_SEASON_CHANGED)
    this.colony.events.addPast({
      type: EVENT_TYPE_SEASON_CHANGED,
      textKey: isWarm ? 'event.warmSeason' : 'event.coldSeason',
      icon: isWarm ? IMG_SEASON_WARM : IMG_SEASON_COLD,
    })
    this._triggerTutorialModal(TUTORIAL_MODAL_SEASON_CHANGED)
  }

  /**
   * Advances construction timers for all buildings and the HQ type upgrade.
   * When a timer reaches zero, applies the upgrade (level increment or type advance).
   * Driven by requestAnimationFrame for smooth visual progress.
   * @param {number} delta - Seconds since last progress tick
   */
  advanceConstruction(delta) {
    if (this._constructingKeys.size === 0 && !this._hqUpgrading) {
      return
    }
    const {
      buildings,
    } = this.colony
    const completed = []
    for (const key of this._constructingKeys) {
      const building = buildings[key]
      if (building.advance(delta)) {
        completed.push(key)
        if (key === BUILDING_HEADQUARTERS) {
          this.colony.events.convertToPast(key, {
            type: EVENT_TYPE_BUILDING_UPGRADE,
            textKey: 'event.territoryExpanded',
            icon: IMG_OTHER_TERRITORY,
            buildingKey: key,
          })
          audio.playSound(SND_TERRITORY_EXPANDED)
          this.colony.events.dismissPastByType(EVENT_TYPE_TERRITORY_LIMIT_REACHED)
        } else {
          audio.playSound(SND_BUILDING_CREATED)
          this.colony.events.dismissFutureByBuildingKey(key)
          if (key === BUILDING_STOREHOUSE) {
            this.colony.events.dismissPastByType(EVENT_TYPE_RESOURCE_LIMIT_REACHED)
            this._resourcesAtCap.clear()
          } else if (key === BUILDING_HOUSE) {
            this.colony.events.dismissPastByType(EVENT_TYPE_POPULATION_LIMIT_REACHED)
          } else if (key === BUILDING_MONUMENT) {
            this.colony.resources.faith += MONUMENT_FAITH_PER_LEVEL * building.level
          }
        }
      }
    }
    for (const key of completed) {
      this._constructingKeys.delete(key)
    }
    if (this._hqUpgrading) {
      if (buildings.headquarters.advanceUpgrade(delta)) {
        this._hqUpgrading = false
        this.colony.events.dismissFutureByBuildingKey(BUILDING_HEADQUARTERS)
        audio.playSound(SND_HEADQUARTERS_UPGRADED)
        this._triggerTutorialModal(TUTORIAL_MODAL_HQ_UPGRADE)
      }
    }
  }

  /**
   * Advances research timers and handles completion. Timers stand still while the
   * academy is at level 0 and resume with the same remaining time once it is rebuilt.
   * Driven by requestAnimationFrame for smooth visual progress.
   * @param {number} delta - Seconds since last tick
   */
  advanceResearch(delta) {
    const {
      academy,
    } = this.colony.buildings
    if (academy.active.size === 0 || academy.isResearchPaused) {
      return
    }
    const completed = []
    for (const [
      key,
      research,
    ] of academy.active) {
      if (research.advance(delta)) {
        completed.push(key)
      }
    }
    for (const key of completed) {
      academy.complete(key)
      this.colony.events.dismissFutureByResearchKey(key)
      audio.playSound(SND_RESEARCH_COMPLETED)
    }
    if (completed.length > 0) {
      this.update(0)
      // Habitation research raises the population cap, so the limit warning may no longer apply
      const {
        resources, buildings,
      } = this.colony
      if (resources.workers < buildings.house.workersCap) {
        this.colony.events.dismissPastByType(EVENT_TYPE_POPULATION_LIMIT_REACHED)
      }
    }
  }

  /**
   * Advances event countdown timers by the elapsed delta, then resets each research event
   * to its research's own timer, which stands still while the academy is at level 0.
   * Runs after advanceResearch, so research events see this step's research timers.
   * Driven by requestAnimationFrame for smooth visual progress.
   * @param {number} delta - Seconds elapsed since last tick
   */
  advanceEvents(delta) {
    const {
      events, buildings,
    } = this.colony
    if (events.future.length === 0) {
      return
    }
    events.advance(delta)
    // Research rows follow their research's own timer, which stands still while the academy is at level 0
    for (const [
      key,
      research,
    ] of buildings.academy.active) {
      events.setFutureRemainingByResearchKey(key, research.remainingSeconds)
    }
  }

  /**
   * Advances challenge timers. Activates pending challenges, transitions delay→started,
   * and resolves timeouts. Driven by requestAnimationFrame for smooth progress.
   * @param {number} delta - Seconds since last tick
   */
  advanceChallenges(delta) {
    if (this.challengeModal) {
      return
    }
    const challenges = this.meta.challenges

    // Decrement ongoing blessing/punishment timeouts (ticks even after all challenges completed)
    const blessingCount = challenges.activeBlessings.length
    this._advanceEffectTimeouts(challenges.activeBlessings, delta)
    this._advanceEffectTimeouts(challenges.activePunishments, delta)
    // Refresh derived state as soon as a blessing expires, so cached effects (e.g. the
    // Blessed Markets 0% fee) don't outlive it until the next tick
    if (challenges.activeBlessings.length < blessingCount) {
      this.update(0)
    }

    if (challenges.allCompleted) {
      return
    }

    // Activate first pending if no active challenge
    if (!challenges.active && challenges.pending.length > 0) {
      challenges.activate()
      this._decideChallengeDelay()
    }
    if (!challenges.active) {
      return
    }

    challenges.advance(delta)

    // Delay expired → decide the countdown values, transition to started, fire future event
    if (challenges.active.isDelayElapsed) {
      this._decideChallengeCountdown()
      challenges.start()
      this.colony.events.addFuture({
        type: EVENT_TYPE_CHALLENGE_STARTED,
        textKey: 'event.challengeStarted',
        icon: IMG_RESOURCE_FAITH,
        params: [
          challenges.active.index,
          challenges.totalCount,
          t('challenge.name.' + challenges.active.index),
        ],
        action: 'openChallengeModal',
        remainingSeconds: challenges.active.timeout,
      })
      audio.playSound(SND_NOTIFICATION_ALERT)
      this._triggerTutorialModal(TUTORIAL_MODAL_CHALLENGE_STARTED)
    }

    // Timeout expired → resolve
    if (challenges.active.isTimeoutElapsed) {
      this._resolveChallengeTimeout()
    }
  }

  /**
   * Checks whether challenge requirements are met and branches to complete or fail.
   */
  _resolveChallengeTimeout() {
    if (this.areChallengeRequirementsMet()) {
      this._completeChallenge()
    } else {
      this._failChallenge()
    }
  }

  /**
   * Checks whether all requirements for the active challenge are currently met.
   * @returns {boolean} True if all requirements are satisfied
   */
  areChallengeRequirementsMet() {
    const challenge = this.meta.challenges.active
    if (!challenge) {
      return false
    }
    const {
      requirements,
    } = challenge
    const {
      resources, buildings,
    } = this.colony

    if (requirements.faith !== null && resources.faith < requirements.faith) {
      return false
    }
    if (requirements.altar !== null && buildings.altar.level < requirements.altar) {
      return false
    }
    if (requirements.temple !== null && buildings.temple.level < requirements.temple) {
      return false
    }
    if (requirements.monument !== null && buildings.monument.level < requirements.monument) {
      return false
    }
    if (requirements.resources !== null) {
      for (const [
        resource,
        amount,
      ] of Object.entries(requirements.resources)) {
        if (resources[resource] < amount) {
          return false
        }
      }
    }
    if (requirements.workers !== null && resources.workers < requirements.workers) {
      return false
    }
    return true
  }

  /**
   * Deducts challenge requirements from the colony (faith, resources, workers).
   */
  _deductRequirements() {
    const challenge = this.meta.challenges.active
    if (!challenge) {
      return
    }
    const {
      requirements,
    } = challenge
    const {
      resources,
    } = this.colony

    if (requirements.faith !== null) {
      resources.faith = Math.max(0, resources.faith - requirements.faith)
    }
    if (requirements.resources !== null) {
      for (const [
        resource,
        amount,
      ] of Object.entries(requirements.resources)) {
        resources[resource] = Math.max(0, resources[resource] - amount)
      }
    }
    if (requirements.workers !== null) {
      this._sacrificeWorkers(requirements.workers)
    }
  }

  /**
   * Removes workers from the colony: first from idle pool, then randomly
   * unassigned from producer buildings that have workers.
   * @param {number} count - Number of workers to sacrifice
   * @returns {number} Workers actually removed (fewer when the colony runs out)
   */
  _sacrificeWorkers(count) {
    const {
      resources, buildings,
    } = this.colony
    let remaining = count

    // First from idle pool
    const idleToRemove = Math.min(remaining, this.colony.idleWorkers)
    resources.workers -= idleToRemove
    remaining -= idleToRemove

    // Then randomly from producer buildings with assigned workers
    while (remaining > 0) {
      const producerKeys = []
      for (const [
        key,
        building,
      ] of Object.entries(buildings)) {
        if ('workers' in building && building.workers > 0) {
          producerKeys.push(key)
        }
      }
      if (producerKeys.length === 0) {
        break
      }
      const randomKey = producerKeys[Math.floor(Math.random() * producerKeys.length)]
      buildings[randomKey].workers -= 1
      resources.workers -= 1
      remaining -= 1
    }

    if (resources.workers < buildings.house.workersCap) {
      this.colony.events.dismissPastByType(EVENT_TYPE_POPULATION_LIMIT_REACHED)
    }
    return count - remaining
  }

  /**
   * Removes a fraction of each stored bounded resource (faith and knowledge are untouched).
   * @param {number} fraction - Share of each resource to remove (e.g. 0.3 = 30%)
   * @returns {Object<string, number>} Amount removed per bounded resource
   */
  _removeResourceShare(fraction) {
    const {
      resources,
    } = this.colony
    const removed = {}
    for (const resource of BOUNDED_RESOURCES) {
      const before = resources[resource]
      resources[resource] = Math.floor(before * (1 - fraction))
      removed[resource] = before - resources[resource]
    }
    return removed
  }

  /**
   * Downgrades random buildings from the downgradable list, one level at a time.
   * A building is eligible if its level is > 1, or it is at level 1 and under construction
   * (the construction is cancelled and the building is destroyed). Excess workers are
   * returned to idle.
   * @param {number} count - Number of levels to remove
   * @returns {string[]} Building key of each level removed (fewer when nothing is eligible)
   */
  _downgradeRandomBuildings(count) {
    const {
      buildings,
    } = this.colony
    const downgraded = []
    for (let i = 0; i < count; i++) {
      const eligibleKeys = []
      for (const key of DOWNGRADABLE_BUILDINGS) {
        const building = buildings[key]
        if (building.level > 1 || (building.level === 1 && building.isConstructing)) {
          eligibleKeys.push(key)
        }
      }
      if (eligibleKeys.length === 0) {
        break
      }

      const randomKey = eligibleKeys[Math.floor(Math.random() * eligibleKeys.length)]
      const building = buildings[randomKey]

      if (building.level === 1 && building.isConstructing) {
        building.constructionRemaining = 0
        building.constructionDuration = 0
        if ('workers' in building) {
          building.workers = 0
        }
        building.level = 0
        this._constructingKeys.delete(randomKey)
        this.colony.events.dismissFutureByBuildingKey(randomKey)
      } else {
        building.level -= 1
        if ('workers' in building && building.workers > building.maxWorkers) {
          building.workers = building.maxWorkers
        }
      }
      downgraded.push(randomKey)

      // Each lost level frees a territory slot
      this.colony.events.dismissPastByType(EVENT_TYPE_TERRITORY_LIMIT_REACHED)
    }
    return downgraded
  }

  /**
   * Handles a successful challenge: deducts requirements, pauses game,
   * and signals the UI to show the reward modal.
   */
  _completeChallenge() {
    this._deductRequirements()
    this.paused = true
    this.challengeModal = CHALLENGE_MODAL_REWARD
  }

  /**
   * Handles a failed challenge: pauses game and signals the UI
   * to show the failure modal.
   */
  _failChallenge() {
    this.paused = true
    this.challengeModal = CHALLENGE_MODAL_FAILURE
  }

  /**
   * Player action: selects a blessing reward after completing a challenge.
   * Moves the challenge to completed, dismisses the event, and activates
   * the next challenge or triggers the win state.
   * @param {number} blessingIndex - Index into the active challenge's blessings array
   */
  selectBlessing(blessingIndex) {
    const challenge = this.meta.challenges.active
    if (!challenge || this.challengeModal !== CHALLENGE_MODAL_REWARD) {
      return
    }

    const blessing = challenge.blessings[blessingIndex]

    this.meta.challenges.complete(blessing)
    this._applyBlessing(blessing)

    this.colony.events.dismissFutureByType(EVENT_TYPE_CHALLENGE_STARTED)

    if (this.meta.challenges.allCompleted) {
      this.challengeModal = CHALLENGE_MODAL_WIN
    } else {
      this.challengeModal = null
      this.paused = false
    }

    this.update(0)
  }

  /**
   * Player action: acknowledges a challenge failure punishment.
   * Resets the challenge timers and unpauses the game.
   */
  acknowledgePunishment() {
    if (!this.meta.challenges.active || this.challengeModal !== CHALLENGE_MODAL_FAILURE) {
      return
    }

    const challenge = this.meta.challenges.active

    this.colony.events.dismissFutureByType(EVENT_TYPE_CHALLENGE_STARTED)

    this.meta.challenges.fail(challenge.punishment)
    this._applyPunishment(challenge.punishment)
    this.challengeModal = null
    this.paused = false
    this.update(0)
    this._decideChallengeDelay()
  }

  /**
   * Reference row of a typical colony for a challenge.
   * @param {number} index - Challenge index
   * @returns {Object|null} CHALLENGE_REFERENCE_STATS row, or null
   */
  _challengeReference(index) {
    return CHALLENGE_REFERENCE_STATS.find(row => row.index === index) ?? null
  }

  /**
   * Decides the active challenge's delay from the colony's health, on activation and after each
   * failure (a struggling colony gets longer, every failure adds recovery time). Challenges built
   * without a definition keep their delay.
   */
  _decideChallengeDelay() {
    const challenge = this.meta.challenges.active
    if (!challenge?.base) {
      return
    }
    const reference = this._challengeReference(challenge.index)?.activation ?? null
    const health = healthScore(colonyStats(this), reference)
    challenge.delay = adjustDelay(challenge.base.delay, health, challenge.failures)
  }

  /**
   * Decides the active challenge's timer, requirements, blessings, punishment and mood from the colony,
   * as its countdown starts; they stay fixed until it ends. A retry never asks for more than the failed
   * attempt. Assigns new objects (the definition is never changed). Challenges built without a definition
   * keep their values.
   */
  _decideChallengeCountdown() {
    const challenge = this.meta.challenges.active
    this.challengeScaling = null
    if (!challenge?.base) {
      return
    }
    // A retry is capped at the failed attempt's requirements, still in effect until now
    const previousRequirements = challenge.failures > 0 ? challenge.requirements : null
    const adjusted = adjustChallenge(challenge.base, colonyStats(this), this._challengeReference(challenge.index), challenge.failures, previousRequirements)
    challenge.timeout = adjusted.timeout
    challenge.requirements = adjusted.requirements
    challenge.blessings = adjusted.blessings
    challenge.punishment = adjusted.punishment
    challenge.mood = adjusted.mood
    this.challengeScaling = adjusted
  }

  /**
   * Decrements timeout on each effect in the array by delta. Removes entries whose timeout reaches 0.
   * Entries with null timeout (instant effects) are skipped.
   * @param {Array} effects - Array of Blessing or Punishment instances
   * @param {number} delta - Seconds since last tick
   */
  _advanceEffectTimeouts(effects, delta) {
    for (let i = effects.length - 1; i >= 0; i--) {
      if (effects[i].timeout === null) {
        continue
      }
      effects[i].timeout = Math.max(0, effects[i].timeout - delta)
      if (effects[i].timeout === 0) {
        effects.splice(i, 1)
      }
    }
  }

  /**
   * Applies instant blessing effects after the player selects a reward.
   * @param {Blessing} blessing - The chosen blessing
   */
  _applyBlessing(blessing) {
    const {
      resources, buildings,
    } = this.colony
    if (blessing.type === BLESSING_GIFT_FROM_THE_HEAVENS && blessing.resources) {
      const bonuses = buildings.academy.completedBonuses(RESEARCH_TREE)
      const storageBonus = bonuses[BONUS_STORAGE_CAPACITY] ?? 0
      const storageCap = buildings.storehouse.storageCap(storageBonus)
      for (const [
        resource,
        amount,
      ] of Object.entries(blessing.resources)) {
        resources[resource] = Math.min(resources[resource] + amount, storageCap)
      }
    } else if (blessing.type === BLESSING_HOLY_EXPANSION && blessing.territory) {
      resources.territoryBonus += blessing.territory
      this.colony.events.dismissPastByType(EVENT_TYPE_TERRITORY_LIMIT_REACHED)
    }
  }

  /**
   * Applies instant punishment effects after the player acknowledges a failure.
   * @param {Punishment} punishment - The punishment to apply
   */
  _applyPunishment(punishment) {
    const {
      resources,
    } = this.colony

    // Lose a fraction of stored faith
    if (punishment.faith !== null) {
      resources.faith = Math.floor(resources.faith * (1 - punishment.faith))
    }

    // Lose a fraction of each bounded resource
    if (punishment.resources !== null) {
      this._removeResourceShare(punishment.resources)
    }

    // Sacrifice workers (clamped to available)
    if (punishment.workers !== null) {
      const count = Math.min(punishment.workers, resources.workers)
      this._sacrificeWorkers(count)
    }

    // Downgrade random building levels
    if (punishment.levels !== null) {
      this._downgradeRandomBuildings(punishment.levels)
    }
  }

  /**
   * Player action: continues playing after winning (all challenges completed).
   */
  continueAfterWin() {
    if (this.challengeModal !== CHALLENGE_MODAL_WIN) {
      return
    }
    this.challengeModal = null
    this.paused = false
  }

  /**
   * Advances the raid timers. From Settlement on there is always one raid: it waits on a
   * hidden timer, is announced (incoming) and counts down, then arrives and is resolved.
   * Temporary Peace freezes both phases; a challenge truce (_raidTruce) freezes only the hidden
   * wait. Runs after advanceEvents, so it can correct the raid event, whose countdown follows
   * the raid's own timer (it can freeze or jump).
   * Driven by requestAnimationFrame for smooth visual progress.
   * @param {number} delta - Seconds since last tick
   */
  advanceRaids(delta) {
    if (this.paused) {
      return
    }
    const {
      military, buildings, events,
    } = this.colony
    if (buildings.headquarters.type === HQ_TYPE_CAMP) {
      return
    }
    if (!military.raid) {
      military.raid = new Raid({
        phase: RAID_PHASE_WAITING,
        remainingSeconds: military.raidCount === 0 ? RAID_GRACE_PERIOD : this._raidInterval,
      })
    }
    const raid = military.raid
    const peace = this.meta.challenges.activeBlessings.some(blessing => blessing.type === BLESSING_TEMPORARY_PEACE)
    const truce = raid.phase === RAID_PHASE_WAITING && this._raidTruce
    if (!peace && !truce && raid.advance(delta)) {
      if (raid.phase === RAID_PHASE_WAITING) {
        this._announceRaid()
      } else {
        this._resolveRaid()
        return
      }
    }
    if (raid.phase === RAID_PHASE_INCOMING) {
      events.setFutureRemaining(EVENT_TYPE_RAID_INCOMING, raid.remainingSeconds)
    }
  }

  /**
   * Announces the waiting raid: generates the raiders and the tribute demand, starts the
   * warning countdown, adds the clickable raid event, plays the alarm and shows the tutorial popup.
   */
  _announceRaid() {
    const raid = this.colony.military.raid
    raid.phase = RAID_PHASE_INCOMING
    raid.enemy = this._generateRaidArmy()
    raid.demand = this._generateTributeDemand(raid.enemyCount)
    raid.delaysPaid = 0
    raid.remainingSeconds = this._raidWarningTime
    this.colony.events.addFuture({
      type: EVENT_TYPE_RAID_INCOMING,
      textKey: 'event.raidIncoming',
      icon: IMG_BUILDING_WALL,
      params: [raid.enemyCount],
      action: 'openMilitaryModal',
      remainingSeconds: raid.remainingSeconds,
    })
    audio.playSound(SND_UNDER_ATTACK)
    this._triggerTutorialModal(TUTORIAL_MODAL_RAID_INCOMING)
  }

  /**
   * Resolves the arriving raid: fights the battle, applies the losses at once, stores the
   * report and pauses the game for the result window. Clears the raid so the next one is scheduled.
   */
  _resolveRaid() {
    const {
      military, events,
    } = this.colony
    const raid = military.raid
    const result = this._raidForecast
    const army = {
      ...military.units,
    }

    for (const type of UNIT_TYPES) {
      military.units[type] -= result.unitsLost[type]
    }
    let resourcesLost = {}
    let workersLost = 0
    let buildingsLost = []
    if (!result.victory) {
      resourcesLost = this._removeResourceShare(result.resourceShare)
      workersLost = this._sacrificeWorkers(result.workersLost)
      buildingsLost = this._downgradeRandomBuildings(result.levelsLost)
    }
    buildingsLost.push(...this._downgradeDefenses(result.wallLevelsLost, result.towerLevelsLost))

    this.raidReport = new RaidReport({
      victory: result.victory,
      army: army,
      enemy: raid.enemy,
      unitsLost: result.unitsLost,
      resourcesLost: resourcesLost,
      workersLost: workersLost,
      buildingsLost: buildingsLost,
    })
    events.dismissFutureByType(EVENT_TYPE_RAID_INCOMING)
    events.addPast({
      type: EVENT_TYPE_RAID_RESULT,
      textKey: result.victory ? 'event.raidRepelled' : 'event.raidLost',
      icon: IMG_BUILDING_WALL,
    })
    audio.playSound(result.victory ? SND_NOTIFICATION_ALERT : SND_NOTIFICATION_DISASTER)

    military.raidCount += 1
    military.raid = null
    this.paused = true
    this.update(0)
  }

  /**
   * Removes levels from the wall and the tower after a raid (they can drop to level 0). A level
   * under construction keeps building.
   * @param {number} wallLevels - Levels the wall loses (capped at its level)
   * @param {number} towerLevels - Levels the tower loses (capped at its level)
   * @returns {string[]} Building key of each level removed
   */
  _downgradeDefenses(wallLevels, towerLevels) {
    const {
      buildings,
    } = this.colony
    const downgraded = []
    for (const [
      key,
      levels,
    ] of [
        [
          BUILDING_WALL,
          wallLevels,
        ],
        [
          BUILDING_TOWER,
          towerLevels,
        ],
      ]) {
      const lost = Math.min(levels, buildings[key].level)
      buildings[key].level -= lost
      for (let i = 0; i < lost; i++) {
        downgraded.push(key)
      }
    }
    if (downgraded.length > 0) {
      // Each lost level frees a territory slot
      this.colony.events.dismissPastByType(EVENT_TYPE_TERRITORY_LIMIT_REACHED)
    }
    return downgraded
  }

  /**
   * Generates the raiders: _raidSize of them, split at random among the unit types the colony can
   * already train (the remainder goes to one random type).
   * @returns {Object<string, number>} Raider count per unit type
   */
  _generateRaidArmy() {
    const count = this._raidSize
    const unlockedBuildings = this._unlockedByHeadquarters(HQ_BUILDING_UNLOCKS)
    const allowedTypes = UNIT_TYPES.filter(type => unlockedBuildings.includes(UNIT_BUILDINGS[type]))

    const enemy = {}
    for (const type of UNIT_TYPES) {
      enemy[type] = 0
    }
    const weights = allowedTypes.map(() => Math.random())
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let assigned = 0
    allowedTypes.forEach((type, index) => {
      enemy[type] = totalWeight > 0 ? Math.floor(count * weights[index] / totalWeight) : 0
      assigned += enemy[type]
    })
    const remainderType = allowedTypes[Math.floor(Math.random() * allowedTypes.length)]
    enemy[remainderType] += count - assigned
    return enemy
  }

  /**
   * Generates the base tribute demand: a value per raider split evenly across a few random
   * resources the colony has unlocked, each amount rounded up to a multiple of TRIBUTE_ROUNDING.
   * @param {number} enemyCount - Number of raiders
   * @returns {Cost} Base demand (delay and cancel prices are multiples of it)
   */
  _generateTributeDemand(enemyCount) {
    const unlockedResources = this._unlockedByHeadquarters(HQ_RESOURCE_UNLOCKS)
    const pool = BOUNDED_RESOURCES.filter(resource => unlockedResources.includes(resource))
    const resourceCount = Math.min(pool.length, TRIBUTE_MIN_RESOURCES + Math.floor(Math.random() * (TRIBUTE_MAX_RESOURCES - TRIBUTE_MIN_RESOURCES + 1)))
    const picked = []
    for (let i = 0; i < resourceCount; i++) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }

    const share = TRIBUTE_VALUE_PER_UNIT * enemyCount / picked.length
    const amounts = {}
    for (const resource of picked) {
      const amount = Math.ceil(share / TRIBUTE_RESOURCE_VALUES[resource])
      amounts[resource] = Math.ceil(amount / TRIBUTE_ROUNDING) * TRIBUTE_ROUNDING
    }
    return new Cost(amounts)
  }

  /**
   * Keys unlocked by the headquarters types up to the current one.
   * @param {Object<string, string[]>} unlocks - HQ type → keys it unlocks (HQ_BUILDING_UNLOCKS or HQ_RESOURCE_UNLOCKS)
   * @returns {string[]} Unlocked keys
   */
  _unlockedByHeadquarters(unlocks) {
    const typeIndex = HQ_TYPES.indexOf(this.colony.buildings.headquarters.type)
    return HQ_TYPES.slice(0, typeIndex + 1).flatMap(type => unlocks[type])
  }

  /**
   * Buildings the player can build: the headquarters plus every building unlocked by the
   * headquarters types up to the current one. The building grid locks the others;
   * levelUpBuilding does not check this.
   * @returns {Set<string>} Unlocked building keys
   */
  get unlockedBuildings() {
    return new Set([
      BUILDING_HEADQUARTERS,
      ...this._unlockedByHeadquarters(HQ_BUILDING_UNLOCKS),
    ])
  }

  /**
   * Hidden wait before the next raid is announced; shorter as the territory cap grows.
   * @returns {number} Seconds
   */
  get _raidInterval() {
    const {
      resources, buildings,
    } = this.colony
    const territoryCap = buildings.headquarters.territoryCap + resources.territoryBonus
    return Math.max(RAID_INTERVAL_MIN, RAID_INTERVAL_BASE - RAID_INTERVAL_PER_TERRITORY * territoryCap)
  }

  /**
   * Raiders the next raid brings; more as the territory cap and the years grow.
   * @returns {number} Raider count
   */
  get _raidSize() {
    const {
      resources, buildings,
    } = this.colony
    const territoryCap = buildings.headquarters.territoryCap + resources.territoryBonus
    return Math.floor(RAID_UNITS_BASE + RAID_UNITS_PER_TERRITORY * territoryCap + RAID_UNITS_PER_YEAR * (this.colony.year - 1))
  }

  /**
   * Attack and health bonus of the raiders, growing with the year (0 in the first year).
   * @returns {number} Fractional bonus
   */
  get _raidBonus() {
    return RAID_BONUS_PER_YEAR * (this.colony.year - 1)
  }

  /**
   * Whether the gods hold back the next raid: a challenge countdown is running and it is a retry
   * or its mood is merciful (a struggling colony). No raid is announced meanwhile; an announced
   * raid still arrives.
   * @returns {boolean}
   */
  get _raidTruce() {
    const challenge = this.meta.challenges.active
    return challenge?.status === CHALLENGE_STATUS_STARTED
      && (challenge.failures > 0 || challenge.mood === CHALLENGE_MOOD_MERCIFUL)
  }

  /**
   * Countdown between a raid's announcement and its arrival, lengthened by Warning research.
   * @returns {number} Seconds
   */
  get _raidWarningTime() {
    const bonuses = this.colony.buildings.academy.completedBonuses(RESEARCH_TREE)
    return RAID_WARNING_TIME * (1 + (bonuses[BONUS_WARNING_TIME] ?? 0))
  }

  /**
   * The colony's side of a battle: army, wall, tower, Attack and Defense research, and workers.
   * @returns {Object} Defender input for resolveBattle
   */
  get _raidDefender() {
    const {
      resources, buildings, military,
    } = this.colony
    const bonuses = buildings.academy.completedBonuses(RESEARCH_TREE)
    return {
      units: {
        ...military.units,
      },
      wallLevel: buildings.wall.level,
      towerLevel: buildings.tower.level,
      attackBonus: bonuses[BONUS_UNIT_ATTACK] ?? 0,
      defenseBonus: bonuses[BONUS_UNIT_DEFENSE] ?? 0,
      workers: resources.workers,
    }
  }

  /**
   * Outcome the incoming raid would have if it arrived now. The real battle uses the same
   * result, so the forecast shown in the military window always matches it.
   * Celestial Fortification spares building levels, the wall's and the tower's included, on a lost raid.
   * @returns {Object|null} resolveBattle result, or null when no raid is announced
   */
  get _raidForecast() {
    const raid = this.colony.military.raid
    if (raid?.phase !== RAID_PHASE_INCOMING) {
      return null
    }
    const result = resolveBattle(this._raidDefender, {
      units: raid.enemy,
      attackBonus: this._raidBonus,
      defenseBonus: this._raidBonus,
    })
    if (this.meta.challenges.activeBlessings.some(blessing => blessing.type === BLESSING_CELESTIAL_FORTIFICATION)) {
      result.levelsLost = 0
      if (!result.victory) {
        result.wallLevelsLost = 0
        result.towerLevelsLost = 0
      }
    }
    return result
  }

  /**
   * Player action: closes the raid result window and resumes the game unless another
   * blocking window (tutorial or challenge) is still open.
   */
  acknowledgeRaid() {
    if (!this.raidReport) {
      return
    }
    this.raidReport = null
    this.paused = Boolean(this.meta.tutorial.activeModal || this.challengeModal)
    this.update(0)
  }

  /**
   * Starts construction of a non-HQ building: deducts cost, reserves territory, begins build timer.
   * @param {string} buildingKey - Key in colony.buildings
   */
  levelUpBuilding(buildingKey) {
    const {
      resources, buildings,
    } = this.colony
    const building = buildings[buildingKey]
    const cost = building.levelUpCost

    if (building.isConstructing || !resources.canAfford(cost) || resources.territory >= buildings.headquarters.territoryCap + resources.territoryBonus) {
      return
    }

    resources.deduct(cost)
    const duration = building.levelUp(cost, this._constructionDurationMult)
    this._constructingKeys.add(buildingKey)

    this.colony.events.dismissPastByType(EVENT_TYPE_BUILDING_UPGRADE)
    this.colony.events.addFuture({
      type: EVENT_TYPE_BUILDING_UPGRADE,
      textKey: building.isUnbuilt ? 'event.buildingBuilding' : 'event.buildingUpgrading',
      icon: BUILDING_IMAGE_MAP[buildingKey],
      params: [this._buildingName(buildingKey).toLowerCase()],
      buildingKey: buildingKey,
      remainingSeconds: duration,
    })

    this.update(0)

    // Fire territory event after update recalculates territory with pending
    if (resources.territory >= buildings.headquarters.territoryCap + resources.territoryBonus) {
      this.colony.events.addPast({
        type: EVENT_TYPE_TERRITORY_LIMIT_REACHED,
        textKey: 'event.territoryLimitReached',
        icon: IMG_OTHER_TERRITORY,
      })
      audio.playSound(SND_NOTIFICATION_ALERT)
    }
  }

  /**
   * Downgrades a producer building by one level, freeing a territory slot.
   * Excess workers above the new capacity are returned to the idle pool.
   * Only allowed when territory is full.
   * @param {string} buildingKey - Key in colony.buildings
   */
  downgradeBuilding(buildingKey) {
    const {
      resources, buildings,
    } = this.colony
    const building = buildings[buildingKey]

    if (!DOWNGRADABLE_BUILDINGS.has(buildingKey)
      || building.level <= 0
      || building.isConstructing
      || resources.territory < buildings.headquarters.territoryCap + resources.territoryBonus) {
      return
    }

    building.level -= 1
    if ('workers' in building && building.workers > building.maxWorkers) {
      building.workers = building.maxWorkers
    }

    this.colony.events.dismissPastByType(EVENT_TYPE_TERRITORY_LIMIT_REACHED)
    this.update(0)
  }

  /**
   * Starts HQ territory expansion: deducts cost, begins construction timer.
   */
  expandTerritory() {
    const {
      resources, buildings,
    } = this.colony
    const hq = buildings.headquarters
    const cost = this.expansionCost

    if (hq.isConstructing || hq.isUpgrading || !resources.canAfford(cost)) {
      return
    }

    resources.deduct(cost)
    const duration = hq.levelUp(cost, this._constructionDurationMult)
    this._constructingKeys.add(BUILDING_HEADQUARTERS)

    this.colony.events.dismissPastByType(EVENT_TYPE_BUILDING_UPGRADE)
    this.colony.events.addFuture({
      type: EVENT_TYPE_BUILDING_UPGRADE,
      textKey: 'event.territoryExpanding',
      icon: IMG_OTHER_TERRITORY,
      buildingKey: BUILDING_HEADQUARTERS,
      remainingSeconds: duration,
    })

    this.update(0)
  }

  /**
   * Starts a headquarters type upgrade: deducts cost, begins upgrade timer.
   */
  upgradeHeadquarters() {
    const {
      resources, buildings,
    } = this.colony
    const hq = buildings.headquarters
    const cost = hq.upgradeCost

    if (hq.isConstructing || hq.isUpgrading || !cost || !resources.canAfford(cost)) {
      return
    }

    resources.deduct(cost)
    const duration = hq.upgradeType(cost, this._constructionDurationMult)
    this._hqUpgrading = true

    this.colony.events.dismissPastByType(EVENT_TYPE_BUILDING_UPGRADE)
    this.colony.events.addFuture({
      type: EVENT_TYPE_BUILDING_UPGRADE,
      textKey: 'event.buildingUpgrading',
      icon: IMG_BUILDING_HEADQUARTERS_MAP[hq.nextType],
      params: [this._buildingName(BUILDING_HEADQUARTERS).toLowerCase()],
      buildingKey: BUILDING_HEADQUARTERS,
      remainingSeconds: duration,
    })

    this.update(0)
  }

  /**
   * Recruits a new worker: deducts food cost, increments worker count.
   */
  recruitWorker() {
    if (!this._recruit()) {
      return
    }
    this.update(0)
  }

  /**
   * Dismisses up to `count` idle workers from the colony permanently.
   * @param {number} count - Maximum workers to dismiss
   */
  dismissWorkers(count) {
    const {
      resources, buildings,
    } = this.colony
    const actual = Math.min(count, this.colony.idleWorkers)
    if (actual <= 0) {
      return
    }
    resources.workers -= actual
    if (resources.workers < buildings.house.workersCap) {
      this.colony.events.dismissPastByType(EVENT_TYPE_POPULATION_LIMIT_REACHED)
    }
    this.update(0)
  }

  /**
   * Assigns up to `count` workers to a building (recruiting as needed).
   * Plays sound and updates state only once at the end.
   * @param {string} buildingKey - Key in colony.buildings
   * @param {number} count - Maximum workers to assign
   */
  assignWorkers(buildingKey, count) {
    const building = this.colony.buildings[buildingKey]
    let assigned = 0
    for (let i = 0; i < count; i++) {
      if (building.isFull) {
        break
      }
      if (this.colony.idleWorkers <= 0 && !this._recruit()) {
        break
      }
      building.workers += 1
      assigned += 1
    }
    if (assigned > 0) {
      this._playAssignSound(buildingKey)
      this.update(0)
    }
  }

  /**
   * Unassigns up to `count` workers from a building back to idle.
   * Updates state only once at the end.
   * @param {string} buildingKey - Key in colony.buildings
   * @param {number} count - Maximum workers to unassign
   */
  unassignWorkers(buildingKey, count) {
    const building = this.colony.buildings[buildingKey]
    const actual = Math.min(count, building.workers)
    if (actual <= 0) {
      return
    }
    building.workers -= actual
    this.update(0)
  }

  /**
   * Starts a research: validates preconditions, deducts cost, begins timer, creates future event.
   * @param {string} key - Research key from enums
   */
  startResearch(key) {
    const {
      resources, buildings,
    } = this.colony
    const {
      academy,
    } = buildings
    const cost = RESEARCH_COSTS[key]

    if (!academy.canResearch(key, RESEARCH_PREREQUISITES) || !cost || !resources.canAfford(cost)) {
      return
    }

    const duration = Math.max(1, Math.floor(cost.toSeconds * RESEARCH_TIME_MULTIPLIER))
    resources.deduct(cost)
    academy.start(key, duration)

    this.colony.events.addFuture({
      type: EVENT_TYPE_RESEARCH_COMPLETE,
      textKey: 'event.researchInProgress',
      icon: IMG_RESOURCE_KNOWLEDGE,
      params: [t('research.' + key).toLowerCase()],
      researchKey: key,
      remainingSeconds: duration,
    })

    this.update(0)
  }

  /**
   * Executes a market trade: buy or sell a resource for gold.
   * @param {string} resource - Resource key (food, wood, stone, copper, iron)
   * @param {'buy'|'sell'} direction - Trade direction
   * @param {number} [amount] - Number of resource units to trade
   */
  executeTrade(resource, direction, amount) {
    const {
      resources, buildings,
    } = this.colony
    const market = buildings[BUILDING_MARKET]

    const bonuses = buildings.academy.completedBonuses(RESEARCH_TREE)
    const storageBonus = bonuses[BONUS_STORAGE_CAPACITY] ?? 0
    if (market.executeTrade(resource, direction, resources, buildings.storehouse.storageCap(storageBonus), amount)) {
      this.update(0)
    }
  }

  /**
   * Buys up to `count` units of a type, one at a time, while below the cap set by
   * its building's level and while the colony can afford the cost.
   * @param {string} type - Unit type (UNIT_*)
   * @param {number} count - Maximum units to buy
   * @returns {number} Units bought
   */
  buyUnits(type, count) {
    const {
      resources, buildings, military,
    } = this.colony
    const cap = buildings[UNIT_BUILDINGS[type]].unitCap
    const cost = UNIT_STATS[type].cost
    let bought = 0
    while (bought < count && military.units[type] < cap && resources.canAfford(cost)) {
      resources.deduct(cost)
      military.units[type] += 1
      bought += 1
    }
    if (bought > 0) {
      this.update(0)
    }
    return bought
  }

  /**
   * Dismisses up to `count` units of a type. Nothing is refunded.
   * @param {string} type - Unit type (UNIT_*)
   * @param {number} count - Maximum units to dismiss
   */
  dismissUnits(type, count) {
    const {
      military,
    } = this.colony
    const actual = Math.min(count, military.units[type])
    if (actual <= 0) {
      return
    }
    military.units[type] -= actual
    this.update(0)
  }

  /**
   * Pays tribute to the incoming raid, in full. A delay adds TRIBUTE_DELAY_SECONDS to the
   * countdown at a price that rises with each delay; cancelling calls the raid off.
   * @param {string} kind - TRIBUTE_DELAY or TRIBUTE_CANCEL
   */
  payTribute(kind) {
    const {
      resources, military, events,
    } = this.colony
    const raid = military.raid
    if (raid?.phase !== RAID_PHASE_INCOMING) {
      return
    }

    if (kind === TRIBUTE_DELAY) {
      const cost = raid.delayCost
      if (!cost || !raid.canDelay || !resources.canAfford(cost)) {
        return
      }
      resources.deduct(cost)
      raid.remainingSeconds += TRIBUTE_DELAY_SECONDS
      raid.delaysPaid += 1
      events.setFutureRemaining(EVENT_TYPE_RAID_INCOMING, raid.remainingSeconds)
    } else if (kind === TRIBUTE_CANCEL) {
      const cost = raid.cancelCost
      if (!cost || !resources.canAfford(cost)) {
        return
      }
      resources.deduct(cost)
      military.raid = null
      military.raidCount += 1
      events.dismissFutureByType(EVENT_TYPE_RAID_INCOMING)
      events.addPast({
        type: EVENT_TYPE_RAID_RESULT,
        textKey: 'event.raidCancelled',
        icon: IMG_BUILDING_WALL,
      })
    } else {
      return
    }

    this.update(0)
  }

  /**
   * Discounted territory expansion cost after applying expansion-cost research bonuses.
   * @returns {Cost} The discounted cost for the next territory level
   */
  get expansionCost() {
    const baseCost = this.colony.buildings.headquarters.levelUpCost
    const bonuses = this.colony.buildings.academy.completedBonuses(RESEARCH_TREE)
    const multiplier = 1 - (bonuses[BONUS_EXPANSION_COST] ?? 0)
    return baseCost.multiplyFloor(multiplier)
  }

  /**
   * Duration multiplier from completed construction-time research bonuses and the
   * Rapid Construction blessing. The two stack multiplicatively so that their combined
   * reduction never reaches 100% (e.g. 50% research + 50% blessing = 25% of the base duration).
   * @returns {number} Multiplier in (0, 1] — lower means faster construction
   */
  get _constructionDurationMult() {
    const bonuses = this.colony.buildings.academy.completedBonuses(RESEARCH_TREE)
    let multiplier = 1 - (bonuses[BONUS_CONSTRUCTION_TIME] ?? 0)
    const rapidConstruction = this.meta.challenges.activeBlessings.find(blessing => blessing.type === BLESSING_RAPID_CONSTRUCTION)
    if (rapidConstruction) {
      multiplier *= 1 - rapidConstruction.construction
    }
    return Math.max(0, multiplier)
  }

  /**
   * Checks sequential tutorial progress and auto-advances past completed steps.
   * Called every gameTick (1s interval).
   */
  checkTutorial() {
    const tutorial = this.meta.tutorial
    if (!tutorial.isActive) {
      return
    }
    // Older saves may have lost this popup while another was open; recover it.
    if (this.colony.buildings.headquarters.type !== HQ_TYPE_CAMP) {
      this._triggerTutorialModal(TUTORIAL_MODAL_HQ_UPGRADE)
    }
    if (tutorial.allStepsCompleted) {
      // Steps done, but defer completion until all modals are dismissed
      // so players see every explanation before the tutorial ends
      if (tutorial.allModalsDismissed) {
        tutorial.completed = true
        // Loading an older save can replay completion; report only the first one on this device
        if (!storage.tutorialCompleted) {
          analytics.logTutorialComplete()
        }
        storage.tutorialCompleted = true
      }
      return
    }
    // Auto-advance past steps whose conditions are already satisfied
    // (e.g. player built the required building before the tutorial caught up)
    let step = TUTORIAL_STEPS[tutorial.currentStep]
    while (step?.check(this.colony.buildings)) {
      tutorial.currentStep++
      if (tutorial.allStepsCompleted) {
        // Steps finished during auto-advance; check modals here too,
        // otherwise completion is deferred until the next checkTutorial call
        if (tutorial.allModalsDismissed) {
          tutorial.completed = true
          // Loading an older save can replay completion; report only the first one on this device
          if (!storage.tutorialCompleted) {
            analytics.logTutorialComplete()
          }
          storage.tutorialCompleted = true
        }
        return
      }
      step = TUTORIAL_STEPS[tutorial.currentStep]
    }
  }

  /**
   * Triggers a reactive tutorial modal if not already dismissed.
   * @param {string} key - Tutorial modal key from enums
   */
  _triggerTutorialModal(key) {
    if (storage.tutorialCompleted) {
      return
    }
    const tutorial = this.meta.tutorial
    if (tutorial.dismissedModals.has(key) || tutorial.activeModal === key || tutorial.pendingModals.includes(key)) {
      return
    }
    if (tutorial.activeModal) {
      tutorial.pendingModals.push(key)
    } else {
      tutorial.activeModal = key
      this.paused = true
    }
  }

  /**
   * Dismisses the active tutorial modal and shows the next queued explanation.
   */
  dismissTutorialModal() {
    const tutorial = this.meta.tutorial
    if (!tutorial.activeModal) {
      return
    }
    tutorial.dismissedModals.add(tutorial.activeModal)
    tutorial.activeModal = tutorial.pendingModals.shift() ?? null
    this.paused = Boolean(tutorial.activeModal || this.challengeModal || this.raidReport)
  }

  /**
   * Shared recruit logic: deducts cost, increments worker count, plays sound, fires event.
   * @returns {boolean} true if recruitment succeeded
   */
  _recruit() {
    const {
      resources, buildings,
    } = this.colony
    if (!resources.canAfford(WORKER_RECRUIT_COST) || resources.workers >= buildings.house.workersCap) {
      return false
    }
    resources.deduct(WORKER_RECRUIT_COST)
    resources.workers += 1
    audio.playSound(SND_WORKER_CREATED)
    if (resources.workers >= buildings.house.workersCap
      && !this.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)) {
      this.colony.events.addPast({
        type: EVENT_TYPE_POPULATION_LIMIT_REACHED,
        textKey: 'event.populationLimitReached',
        icon: IMG_UNIT_WORKER,
      })
      audio.playSound(SND_NOTIFICATION_ALERT)
    }
    return true
  }

  /**
   * Plays the building-specific worker assignment sound.
   * @param {string} buildingKey - Key in colony.buildings
   */
  _playAssignSound(buildingKey) {
    if (buildingKey === BUILDING_FARM) {
      audio.playSound(SND_WORKER_FARM)
    } else if (buildingKey === BUILDING_WOODCUTTER) {
      audio.playSound(SND_WORKER_WOODCUTTER)
    } else if (buildingKey === BUILDING_ACADEMY) {
      audio.playSound(SND_WORKER_ACADEMY)
    } else if (buildingKey === BUILDING_TEMPLE) {
      audio.playSound(SND_WORKER_TEMPLE)
    } else if ([
      BUILDING_QUARRY,
      BUILDING_COPPER_MINE,
      BUILDING_IRON_MINE,
      BUILDING_GOLD_MINE,
    ].includes(buildingKey)) {
      audio.playSound(SND_WORKER_MINE)
    }
  }

  /**
   * Returns the localized display name for a building.
   * @param {string} buildingKey - Key in colony.buildings
   * @returns {string} Localized building display name
   */
  _buildingName(buildingKey) {
    if (buildingKey === BUILDING_HEADQUARTERS) {
      return t('building.headquarters.' + this.colony.buildings.headquarters.type)
    } else {
      return t('building.' + buildingKey)
    }
  }

  /**
   * Rebuilds the translated names in upcoming events in the current language.
   * Event parameters are saved already translated, so a save loaded under another
   * browser language would otherwise show mixed languages (e.g. "Upgrading granja").
   */
  _relocalizeFutureEvents() {
    for (const event of this.colony.events.future) {
      if (!Array.isArray(event.params) || event.params.length === 0) {
        continue
      }
      // A name with no translation (edited save, or a key renamed since) keeps its saved text instead of failing the load
      if (event.type === EVENT_TYPE_CHALLENGE_STARTED) {
        const name = t('challenge.name.' + event.params[0])
        if (name) {
          event.params[2] = name
        }
      } else if (event.researchKey) {
        const name = t('research.' + event.researchKey)
        if (name) {
          event.params = [name.toLowerCase()]
        }
      } else if (event.buildingKey) {
        const name = this._buildingName(event.buildingKey)
        if (name) {
          event.params = [name.toLowerCase()]
        }
      }
    }
  }

  /**
   * Reconstructs a State instance from serialized data.
   * Older saves are upgraded first (migrateSave); challenges are rebuilt from CHALLENGE_DEFINITIONS.
   * Returns null if data is corrupted, invalid or from a newer version of the game.
   * @param {Object} data - Serialized state data
   * @returns {State|null} Restored State instance, or null on failure
   */
  static fromJSON(data) {
    try {
      const saveData = migrateSave(data)
      const meta = Meta.fromJSON(saveData.meta, CHALLENGE_DEFINITIONS)
      // A tutorial completed on this device stays complete when an older save is loaded.
      // Clear its saved modal so it cannot leave the restored game paused.
      if (storage.tutorialCompleted) {
        meta.tutorial.completed = true
        meta.tutorial.activeModal = null
        meta.tutorial.pendingModals = []
      }
      const colony = Colony.fromJSON(saveData.colony, BUILDING_CLASS_MAP)
      const state = new State(meta, colony)

      // Restore edge-detection tracking state so update(0) doesn't
      // re-fire events that are already in the loaded past list
      state._resourcesAtCap = new Set(saveData.resourcesAtCap ?? [])
      state._resourcesNegativeProduction = new Set(saveData.resourcesNegativeProduction ?? [])
      state._hadIdleWorkers = saveData.hadIdleWorkers ?? false
      state.challengeModal = saveData.challengeModal ?? null
      state.raidReport = saveData.raidReport ? RaidReport.fromJSON(saveData.raidReport) : null
      // A challenge, raid result or tutorial modal open at save time keeps the game paused until dismissed
      if (state.challengeModal || state.raidReport || meta.tutorial.activeModal) {
        state.paused = true
      }
      state._relocalizeFutureEvents()

      state.update(0)
      return state
    } catch {
      return null
    }
  }

  /**
   * Serializable snapshot for save/load.
   * @returns {Object} Plain object snapshot for serialization
   */
  toJSON() {
    return {
      meta: this.meta.toJSON(),
      colony: this.colony.toJSON(),
      resourcesAtCap: [...this._resourcesAtCap],
      resourcesNegativeProduction: [...this._resourcesNegativeProduction],
      hadIdleWorkers: this._hadIdleWorkers,
      challengeModal: this.challengeModal,
      raidReport: this.raidReport ? this.raidReport.toJSON() : null,
    }
  }
}

export default State
