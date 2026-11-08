// Game balancing values — all tunable constants in one place.
// Consumed by constants.js, building classes, state.js, and
// UI components.

import {BONUS_CONSTRUCTION_TIME, BONUS_DISEASE_IMPACT, BONUS_EARTHQUAKE_IMPACT, BONUS_EXPANSION_COST, BONUS_FAITH_PRODUCTION, BONUS_FLOOD_IMPACT, BONUS_FOOD_CONSUMPTION, BONUS_FOOD_PRODUCTION, BONUS_HABITATION, BONUS_KNOWLEDGE_PRODUCTION, BONUS_MINING_PRODUCTION, BONUS_STORAGE_CAPACITY, BONUS_UNIT_ATTACK, BONUS_UNIT_DEFENSE, BONUS_WARNING_TIME, BONUS_WOOD_CONSUMPTION, BONUS_WOOD_PRODUCTION, BONUS_WORKER_PRODUCTIVITY, BUILDING_ACADEMY, BUILDING_ALTAR, BUILDING_ARCHERY, BUILDING_BARRACKS, BUILDING_COPPER_MINE, BUILDING_FARM, BUILDING_GOLD_MINE, BUILDING_HEADQUARTERS, BUILDING_HOUSE, BUILDING_IRON_MINE, BUILDING_MARKET, BUILDING_MONUMENT, BUILDING_QUARRY, BUILDING_TEMPLE, BUILDING_STABLE, BUILDING_STOREHOUSE, BUILDING_TOWER, BUILDING_WALL, BUILDING_WOODCUTTER, HQ_TYPE_CAMP, HQ_TYPE_SETTLEMENT, HQ_TYPE_TOWN, HQ_TYPE_VILLAGE, RESEARCH_SUBCATEGORY_ATTACK, RESEARCH_SUBCATEGORY_CONSTRUCTION, RESEARCH_SUBCATEGORY_DEFENSE, RESEARCH_SUBCATEGORY_EARTHQUAKES, RESEARCH_SUBCATEGORY_EXPANSION, RESEARCH_SUBCATEGORY_FAITH, RESEARCH_SUBCATEGORY_FLOODS, RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION, RESEARCH_SUBCATEGORY_FOOD_PRODUCTION, RESEARCH_SUBCATEGORY_HABITATION, RESEARCH_SUBCATEGORY_HEALTH, RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION, RESEARCH_SUBCATEGORY_MINING, RESEARCH_SUBCATEGORY_STORAGE, RESEARCH_SUBCATEGORY_TRANSPORTATION, RESEARCH_SUBCATEGORY_WARNING, RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION, RESEARCH_SUBCATEGORY_WOOD_PRODUCTION, RESOURCE_COPPER, RESOURCE_FAITH, RESOURCE_FOOD, RESOURCE_GOLD, RESOURCE_IRON, RESOURCE_KNOWLEDGE, RESOURCE_STONE, RESOURCE_WOOD, UNIT_ARCHER, UNIT_CAVALRY, UNIT_INFANTRY} from '@/js/engine/enums.js'
import Cost from '@/js/models/cost.js'

// ── Build Time ──────────────────────────────────────────────────────
// Time weight per resource unit (seconds). Used by Cost.toSeconds to
// derive construction duration from resource costs.
// Formula: floor(weightedSum ^ RESOURCE_TIME_EXPONENT)
export const RESOURCE_TIME_WEIGHTS = {
  [RESOURCE_FOOD]: 0.1,
  [RESOURCE_WOOD]: 0.1,
  [RESOURCE_STONE]: 0.1,
  [RESOURCE_COPPER]: 0.1,
  [RESOURCE_IRON]: 0.1,
  [RESOURCE_GOLD]: 0.1,
  [RESOURCE_KNOWLEDGE]: 0.1,
  [RESOURCE_FAITH]: 0.1,
}
export const RESOURCE_TIME_EXPONENT = 0.7

// ── Building Upgrades ─────────────────────────────────────────────
// Per-building upgrade config: base cost and exponential cost multiplier.
// cost: base resource cost (used in levelUpCost formulas)
// multiplier: exponential scaling factor per level
export const BUILDING_UPGRADES = {
  [BUILDING_HEADQUARTERS]: {
    cost: new Cost({
      food: 50,
      wood: 50,
    }),
    multiplier: 1.6,
  },
  [BUILDING_HOUSE]: {
    cost: new Cost({
      wood: 20,
    }),
    multiplier: 1.4,
  },
  [BUILDING_ACADEMY]: {
    cost: new Cost({
      wood: 60,
      stone: 30,
    }),
    multiplier: 1.4,
  },
  [BUILDING_STOREHOUSE]: {
    cost: new Cost({
      wood: 100,
      stone: 80,
    }),
    multiplier: 1.22,
  },
  [BUILDING_MARKET]: {
    cost: new Cost({
      wood: 150,
      stone: 75,
    }),
    multiplier: 1.4,
  },
  [BUILDING_FARM]: {
    cost: new Cost({
      wood: 20,
    }),
    multiplier: 1.4,
  },
  [BUILDING_WOODCUTTER]: {
    cost: new Cost({
      wood: 20,
    }),
    multiplier: 1.4,
  },
  [BUILDING_QUARRY]: {
    cost: new Cost({
      wood: 45,
    }),
    multiplier: 1.4,
  },
  [BUILDING_COPPER_MINE]: {
    cost: new Cost({
      wood: 70,
      stone: 35,
    }),
    multiplier: 1.4,
  },
  [BUILDING_IRON_MINE]: {
    cost: new Cost({
      wood: 100,
      stone: 50,
    }),
    multiplier: 1.4,
  },
  [BUILDING_GOLD_MINE]: {
    cost: new Cost({
      wood: 140,
      stone: 70,
    }),
    multiplier: 1.4,
  },
  [BUILDING_ALTAR]: {
    cost: new Cost({
      wood: 50,
    }),
    multiplier: 1.2,
  },
  [BUILDING_TEMPLE]: {
    cost: new Cost({
      wood: 50,
      stone: 25,
    }),
    multiplier: 1.4,
  },
  [BUILDING_MONUMENT]: {
    cost: new Cost({
      wood: 120,
      stone: 60,
    }),
    multiplier: 1.4,
  },
  [BUILDING_BARRACKS]: {
    cost: new Cost({
      wood: 55,
      stone: 25,
    }),
    multiplier: 1.4,
  },
  [BUILDING_ARCHERY]: {
    cost: new Cost({
      wood: 75,
      stone: 40,
    }),
    multiplier: 1.4,
  },
  [BUILDING_STABLE]: {
    cost: new Cost({
      wood: 110,
      stone: 55,
    }),
    multiplier: 1.4,
  },
  [BUILDING_WALL]: {
    cost: new Cost({
      wood: 100,
      stone: 50,
    }),
    multiplier: 1.4,
  },
  [BUILDING_TOWER]: {
    cost: new Cost({
      wood: 150,
      stone: 75,
    }),
    multiplier: 1.4,
  },
}

// Resource cost to upgrade HQ type (keyed by type)
export const HQ_UPGRADE_COSTS = {
  [HQ_TYPE_CAMP]: new Cost({
    wood: 300,
  }),
  [HQ_TYPE_SETTLEMENT]: new Cost({
    wood: 500,
    stone: 300,
  }),
  [HQ_TYPE_VILLAGE]: new Cost({
    stone: 1000,
    copper: 500,
  }),
  [HQ_TYPE_TOWN]: new Cost({
    copper: 2000,
    iron: 1000,
  }),
}

// ── Production ──────────────────────────────────────────────────────

// Base production rates per second (building key → resource + rate). Worker-based unless passive: true (per-level).
export const PRODUCTION_RATES = {
  [BUILDING_FARM]: {
    resource: RESOURCE_FOOD,
    rate: 1,
  },
  [BUILDING_WOODCUTTER]: {
    resource: RESOURCE_WOOD,
    rate: 0.5,
  },
  [BUILDING_QUARRY]: {
    resource: RESOURCE_STONE,
    rate: 0.3,
  },
  [BUILDING_COPPER_MINE]: {
    resource: RESOURCE_COPPER,
    rate: 0.2,
  },
  [BUILDING_IRON_MINE]: {
    resource: RESOURCE_IRON,
    rate: 0.1,
  },
  [BUILDING_GOLD_MINE]: {
    resource: RESOURCE_GOLD,
    rate: 0.05,
  },
  [BUILDING_ACADEMY]: {
    resource: RESOURCE_KNOWLEDGE,
    rate: 0.1,
  },
  [BUILDING_TEMPLE]: {
    resource: RESOURCE_FAITH,
    rate: 0.15,
  },
  [BUILDING_ALTAR]: {
    resource: RESOURCE_FAITH,
    rate: 0.1,
    passive: true,
  },
}

// ── Monument ────────────────────────────────────────────────────────
// One-time faith granted when a monument finishes construction: value × newLevel
export const MONUMENT_FAITH_PER_LEVEL = 100

// ── Population & Workers ────────────────────────────────────────────

// House population cap: level × perLevel
export const HOUSE_POPULATION_PER_LEVEL = 10

// Number of worker slots gained per building level
export const WORKERS_PER_LEVEL = 5
export const BULK_WORKER_AMOUNT = 10 // Max workers assigned/dismissed per ctrl+click

// Worker recruitment cost (always food)
export const WORKER_RECRUIT_COST = new Cost({
  food: 50,
})

// ── Worker Upkeep ─────────────────────────────────────────────────────

// Resource consumed per worker per second
export const WORKER_FOOD_CONSUMPTION = 0.1
export const WORKER_WOOD_CONSUMPTION = 0.1

// ── Stockpile ───────────────────────────────────────────────────────

// Storehouse resource capacity: base × capacityMultiplier ^ level
export const STOREHOUSE_BASE_CAPACITY = 500
export const STOREHOUSE_CAPACITY_MULTIPLIER = 1.2

// ── Territory ───────────────────────────────────────────────────────

// HQ territory capacity: level × perLevel
export const HQ_TERRITORY_PER_LEVEL = 10

// ── Seasons ─────────────────────────────────────────────────────────

// Duration of each season in seconds (warm / cold)
export const SEASON_DURATION = 300 // 5 minutes

// Fractional modifier applied to food production per season
export const SEASON_WARM_FOOD_MODIFIER = 0.2
export const SEASON_COLD_FOOD_MODIFIER = -0.2

// Fractional modifier applied to wood consumption per season
export const SEASON_WARM_WOOD_MODIFIER = -0.2
export const SEASON_COLD_WOOD_MODIFIER = 0.2

// Maximum fractional penalty applied to ALL production when food or wood has
// negative net production. Scales with deficit ratio (uncovered / total consumption).
// Worst-of: only the largest penalty applies when both are negative
export const SHORTAGE_MAX_PENALTY = 1

// ── Research ──────────────────────────────────────────────────────────
// Bonus per subcategory: { type: BONUS_* enum, value: modifier (additive per tier) }
// Each tier in a chain grants the same bonus; defined once per subcategory.
// Most bonuses are fractional (e.g. 0.05 = 5%) and must be whole percents, since the
// research modal prints value × 100 unrounded; flat bonuses add { flat: true }.
export const RESEARCH_SUBCATEGORY_BONUSES = {

  // General
  [RESEARCH_SUBCATEGORY_TRANSPORTATION]: {
    type: BONUS_WORKER_PRODUCTIVITY,
    value: 0.03,
  },
  [RESEARCH_SUBCATEGORY_CONSTRUCTION]: {
    type: BONUS_CONSTRUCTION_TIME,
    value: 0.10,
  },
  [RESEARCH_SUBCATEGORY_EXPANSION]: {
    type: BONUS_EXPANSION_COST,
    value: 0.08,
  },
  [RESEARCH_SUBCATEGORY_STORAGE]: {
    type: BONUS_STORAGE_CAPACITY,
    value: 0.10,
  },
  [RESEARCH_SUBCATEGORY_HABITATION]: {
    type: BONUS_HABITATION,
    value: 1,
    flat: true,
  },
  // Resources
  [RESEARCH_SUBCATEGORY_FOOD_PRODUCTION]: {
    type: BONUS_FOOD_PRODUCTION,
    value: 0.05,
  },
  [RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION]: {
    type: BONUS_FOOD_CONSUMPTION,
    value: 0.05,
  },
  [RESEARCH_SUBCATEGORY_WOOD_PRODUCTION]: {
    type: BONUS_WOOD_PRODUCTION,
    value: 0.05,
  },
  [RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION]: {
    type: BONUS_WOOD_CONSUMPTION,
    value: 0.05,
  },
  [RESEARCH_SUBCATEGORY_MINING]: {
    type: BONUS_MINING_PRODUCTION,
    value: 0.05,
  },
  [RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION]: {
    type: BONUS_KNOWLEDGE_PRODUCTION,
    value: 0.10,
  },

  // Disasters
  [RESEARCH_SUBCATEGORY_FLOODS]: {
    type: BONUS_FLOOD_IMPACT,
    value: 0.10,
  },
  [RESEARCH_SUBCATEGORY_HEALTH]: {
    type: BONUS_DISEASE_IMPACT,
    value: 0.10,
  },
  [RESEARCH_SUBCATEGORY_EARTHQUAKES]: {
    type: BONUS_EARTHQUAKE_IMPACT,
    value: 0.10,
  },

  // Religion
  [RESEARCH_SUBCATEGORY_FAITH]: {
    type: BONUS_FAITH_PRODUCTION,
    value: 0.05,
  },

  // Military
  [RESEARCH_SUBCATEGORY_DEFENSE]: {
    type: BONUS_UNIT_DEFENSE,
    value: 0.10,
  },
  [RESEARCH_SUBCATEGORY_ATTACK]: {
    type: BONUS_UNIT_ATTACK,
    value: 0.10,
  },
  [RESEARCH_SUBCATEGORY_WARNING]: {
    type: BONUS_WARNING_TIME,
    value: 0.10,
  },
}

// Research cost per tier (index 0 = T1) for a standard-price chain.
// Each tier pays knowledge plus the two resources of its HQ stage, climbing the
// resource ladder (T1 food + wood … T5 iron + gold). A chain's actual cost is
// this × its RESEARCH_SUBCATEGORY_COST_MULTIPLIERS entry (built in constants.js)
export const RESEARCH_TIER_COSTS = [
  new Cost({
    knowledge: 60,
    food: 40,
    wood: 30,
  }),
  new Cost({
    knowledge: 150,
    wood: 100,
    stone: 60,
  }),
  new Cost({
    knowledge: 360,
    stone: 200,
    copper: 80,
  }),
  new Cost({
    knowledge: 600,
    copper: 200,
    iron: 80,
  }),
  new Cost({
    knowledge: 1100,
    iron: 250,
    gold: 100,
  }),
]

// Price band per subcategory: multiplier applied to every tier of RESEARCH_TIER_COSTS
export const RESEARCH_SUBCATEGORY_COST_MULTIPLIERS = {

  // Cheap
  [RESEARCH_SUBCATEGORY_FOOD_PRODUCTION]: 0.75,
  [RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION]: 0.75,
  [RESEARCH_SUBCATEGORY_WOOD_PRODUCTION]: 0.75,
  [RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION]: 0.75,
  [RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION]: 0.75,
  [RESEARCH_SUBCATEGORY_STORAGE]: 0.75,

  // Standard
  [RESEARCH_SUBCATEGORY_MINING]: 1,
  [RESEARCH_SUBCATEGORY_FAITH]: 1,
  [RESEARCH_SUBCATEGORY_CONSTRUCTION]: 1,
  [RESEARCH_SUBCATEGORY_DEFENSE]: 1,
  [RESEARCH_SUBCATEGORY_ATTACK]: 1,
  [RESEARCH_SUBCATEGORY_WARNING]: 1,
  [RESEARCH_SUBCATEGORY_FLOODS]: 1,
  [RESEARCH_SUBCATEGORY_HEALTH]: 1,
  [RESEARCH_SUBCATEGORY_EARTHQUAKES]: 1,

  // Premium
  [RESEARCH_SUBCATEGORY_TRANSPORTATION]: 1.5,
  [RESEARCH_SUBCATEGORY_EXPANSION]: 1.5,
  [RESEARCH_SUBCATEGORY_HABITATION]: 1.5,
}

// Multiplies Cost.toSeconds for research only (buildings apply their construction multiplier instead)
export const RESEARCH_TIME_MULTIPLIER = 4

// ── Market Trading ─────────────────────────────────────────────────

// Number of resource units exchanged per trade
export const MARKET_TRADE_AMOUNT = 100

// Base gold value per MARKET_TRADE_AMOUNT of each resource
export const MARKET_BASE_PRICES = {
  [RESOURCE_FOOD]: 100,
  [RESOURCE_WOOD]: 110,
  [RESOURCE_STONE]: 120,
  [RESOURCE_COPPER]: 130,
  [RESOURCE_IRON]: 140,
}

// Default trade fee (fraction, 0.30 = 30%)
export const MARKET_BASE_FEE = 0.30

// Minimum possible fee after all reductions
export const MARKET_MIN_FEE = 0.05

// Fee reduction per market building level (percentage points)
export const MARKET_FEE_REDUCTION_PER_LEVEL = 0.01

// Gold shift in current price per MARKET_TRADE_AMOUNT lot traded (both buy and sell)
export const MARKET_PRICE_SHIFT = 3

// Minimum current price (ensures sell floor of ~14 Gold at max fee)
export const MARKET_MIN_CURRENT_PRICE = 20

// Maximum current price (caps how expensive buying can get)
export const MARKET_MAX_CURRENT_PRICE = 9999

// ── Military ───────────────────────────────────────────────────────

// Units each military building level allows of its unit type (cap = level × perLevel)
export const MILITARY_UNITS_PER_LEVEL = 5

// Per-unit combat stats, purchase cost and upkeep per second.
// Tuned so every counter wins at equal numbers (infantry > cavalry > archer > infantry)
export const UNIT_STATS = {
  [UNIT_INFANTRY]: {
    attack: 10,
    health: 30,
    cost: new Cost({
      food: 40,
      wood: 20,
    }),
    upkeep: {
      food: 0.1,
      wood: 0.05,
    },
  },
  [UNIT_ARCHER]: {
    attack: 15,
    health: 20,
    cost: new Cost({
      wood: 40,
      copper: 20,
    }),
    upkeep: {
      food: 0.1,
      wood: 0.1,
    },
  },
  [UNIT_CAVALRY]: {
    attack: 12,
    health: 30,
    cost: new Cost({
      food: 60,
      iron: 25,
    }),
    upkeep: {
      food: 0.2,
      wood: 0.05,
    },
  },
}

// Attack multiplier against an army made entirely of the unit type this unit beats
export const UNIT_COUNTER_MULTIPLIER = 2

// Damage the wall absorbs per level before units take losses
export const WALL_HEALTH_PER_LEVEL = 100

// Archers the tower fights as per level (never die, no research bonus)
export const TOWER_ARCHERS_PER_LEVEL = 3

// Seconds before the first raid is announced, counted from reaching Settlement
export const RAID_GRACE_PERIOD = 300

// Seconds between raids: max(min, base − perTerritory × territoryCap)
export const RAID_INTERVAL_BASE = 600
export const RAID_INTERVAL_PER_TERRITORY = 4
export const RAID_INTERVAL_MIN = 240

// Seconds between a raid's announcement and its arrival (before Warning research)
export const RAID_WARNING_TIME = 120

// Raiders per raid: floor(base + perTerritory × territoryCap + perYear × (year − 1))
export const RAID_UNITS_BASE = 3
export const RAID_UNITS_PER_TERRITORY = 0.15
export const RAID_UNITS_PER_YEAR = 2

// Raiders' attack and health bonus per year after the first: perYear × (year − 1)
export const RAID_BONUS_PER_YEAR = 0.05

// Losses of a lost raid at full severity (no defense): share of each stored
// regular resource, share of workers, and building levels
export const RAID_DEFEAT_MAX_RESOURCES = 0.3
export const RAID_DEFEAT_MAX_WORKERS = 0.1
export const RAID_DEFEAT_MAX_LEVELS = 3

// Tribute value demanded per raider, split across a few random resources
export const TRIBUTE_VALUE_PER_UNIT = 25

// Value of one unit of each resource when converting tribute value into amounts
export const TRIBUTE_RESOURCE_VALUES = {
  [RESOURCE_FOOD]: 1,
  [RESOURCE_WOOD]: 1,
  [RESOURCE_STONE]: 1.5,
  [RESOURCE_COPPER]: 2,
  [RESOURCE_IRON]: 3,
  [RESOURCE_GOLD]: 5,
}

// Number of distinct resources a tribute demand asks for
export const TRIBUTE_MIN_RESOURCES = 2
export const TRIBUTE_MAX_RESOURCES = 3

// Delay price = base × growth ^ delaysPaid, offered while growth ^ delaysPaid ≤ cancel multiplier.
// Cancel price = base × cancel multiplier
export const TRIBUTE_DELAY_GROWTH = 1.5
export const TRIBUTE_CANCEL_MULTIPLIER = 3

// Seconds a paid delay adds to the raid countdown
export const TRIBUTE_DELAY_SECONDS = 120

// Tribute amounts are rounded up to a multiple of this
export const TRIBUTE_ROUNDING = 5

// ── Challenge Scaling ──────────────────────────────────────────────
// When a challenge starts, its base values (challenges.json) are scaled to the colony
// (challenge_scaling.js). First guesses, tuned with the balance simulation (docs/simulation.md).

// Requirements are fitted so their estimated time to meet is this share of the timer
export const CHALLENGE_TARGET_TIME_SHARE = 0.85

// A bounded resource the colony makes at under this share of its fully staffed rate counts at that rate in the
// estimate: its producers stand idle, and workers can be moved there once a challenge asks for it
export const CHALLENGE_UNSTAFFED_RATE_SHARE = 0.1

// Smallest share of the base faith and resource amounts a struggling colony is asked for
export const CHALLENGE_MIN_AMOUNT_SCALE = 0.15

// Largest scale of the base requirements for a thriving colony
export const CHALLENGE_MAX_HARDEN_SCALE = 1.3

// Largest share cut from the building-level and worker requirements
export const CHALLENGE_MAX_LEVEL_CUT = 0.2

// Largest worker requirement, as a share of the colony's workers when the countdown starts (winning
// sacrifices them); a challenge asks for no workers when that share is under one worker
export const CHALLENGE_MAX_WORKER_REQUIREMENT_SHARE = 0.5

// Longest timer, as a multiple of the base timer
export const CHALLENGE_MAX_TIMEOUT_SCALE = 1.75

// Each failure lowers the target time share by this fraction (compounding)
export const CHALLENGE_FAILURE_EASE = 0.4

// Each failure lengthens the timer by this share of the base timer (up to the longest timer)
export const CHALLENGE_FAILURE_TIMEOUT_BONUS = 0.1

// Seconds of extra delay per failure, to recover before the retry
export const CHALLENGE_FAILURE_DELAY_BONUS = 60

// Delay scale range: 1 ÷ health, so a thriving colony waits less and a struggling one more
export const CHALLENGE_DELAY_SCALE_MIN = 0.75
export const CHALLENGE_DELAY_SCALE_MAX = 1.5

// Weight per colony stat in the health score: equal per area (economy, faith, military,
// research, population), the economy split between production and HQ tier
export const CHALLENGE_HEALTH_WEIGHTS = {
  productionValue: 0.5,
  hqTier: 0.5,
  faithRate: 1,
  armyUnits: 1,
  researchCount: 1,
  workers: 1,
}

// A reference value below this counts as ratio 1: the stat says nothing yet at that challenge
// (HQ tier needs none, it compares tier + 1)
export const CHALLENGE_HEALTH_MIN_REFERENCE = {
  productionValue: 1,
  faithRate: 0.1,
  armyUnits: 1,
  researchCount: 1,
  workers: 1,
}

// Clamp on each stat ratio in the health score
export const CHALLENGE_HEALTH_RATIO_MIN = 0.25
export const CHALLENGE_HEALTH_RATIO_MAX = 4

// Blessing strength and duration scale ranges [min, max], following the challenge difficulty
export const CHALLENGE_BLESSING_MAGNITUDE_RANGE = [
  0.75,
  1.3,
]
export const CHALLENGE_BLESSING_DURATION_RANGE = [
  0.9,
  1.15,
]

// Punishment severity range [min, max], following the colony health (strength and duration)
export const CHALLENGE_PUNISHMENT_SEVERITY_RANGE = [
  0.5,
  1.15,
]

// Most workers and building levels a punishment can take, as a share of the colony's
export const CHALLENGE_PUNISHMENT_MAX_WORKER_SHARE = 0.25
export const CHALLENGE_PUNISHMENT_MAX_LEVEL_SHARE = 0.1

// Upper limits on scaled effect fractions: blessing productivity, construction and season
// improvements; punishment productivity decreases and faith and resource losses
export const CHALLENGE_EFFECT_CAPS = {
  blessing: 0.6,
  punishment: 0.6,
}

// Lowest difficulty of each mood after the mildest (lenient, watchful, stern, demanding), symmetric around 1
export const CHALLENGE_MOOD_THRESHOLDS = [
  0.75,
  0.9,
  1.1,
  1.25,
]

// Rounding steps for faith and resource requirements: the step of the first band the amount is below
export const CHALLENGE_AMOUNT_ROUNDING = [
  {
    below: 200,
    step: 10,
  },
  {
    below: 1000,
    step: 50,
  },
  {
    below: 5000,
    step: 100,
  },
  {
    below: Infinity,
    step: 500,
  },
]

// Rounding steps in seconds: timers round up, effect durations (shown in whole minutes) and delays to the nearest
export const CHALLENGE_TIMEOUT_ROUNDING = 30
export const CHALLENGE_DURATION_ROUNDING = 60
export const CHALLENGE_DELAY_ROUNDING = 10

// Gifted resources round to a multiple of this
export const CHALLENGE_GIFT_ROUNDING = 50

// Median colony stats of a typical colony when each challenge first activates and when its countdown
// starts: the average bot of the balance simulation (docs/simulation.md), pasted from its report
export const CHALLENGE_REFERENCE_STATS = [
  {
    index: 1,
    runs: 60,
    activation: {
      elapsed: 1,
      hqTier: 0,
      hqLevel: 1,
      workers: 0,
      workersCap: 0,
      storageCap: 500,
      productionValue: 0,
      faithRate: 0,
      armyUnits: 0,
      researchCount: 0,
      buildingLevels: 2,
      altar: 0,
      temple: 0,
      monument: 0,
      territoryFree: 8,
      constructionMult: 1,
      stock: {
        food: 250,
        wood: 60,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 0,
      },
      netRates: {
        food: 0,
        wood: 0,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 0,
      },
    },
    countdownStart: {
      elapsed: 240,
      hqTier: 0,
      hqLevel: 2,
      workers: 13,
      workersCap: 20,
      storageCap: 500,
      productionValue: 6.96,
      faithRate: 0.4,
      armyUnits: 0,
      researchCount: 0,
      buildingLevels: 11,
      altar: 4,
      temple: 0,
      monument: 0,
      territoryFree: 9,
      constructionMult: 1,
      stock: {
        food: 69.5,
        wood: 93.7,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 35.7,
      },
      netRates: {
        food: 3.5,
        wood: 3.46,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 0.4,
      },
    },
  },
  {
    index: 2,
    runs: 60,
    activation: {
      elapsed: 541,
      hqTier: 0,
      hqLevel: 3,
      workers: 36,
      workersCap: 40,
      storageCap: 500,
      productionValue: 18.48,
      faithRate: 0.9,
      armyUnits: 0,
      researchCount: 0,
      buildingLevels: 23,
      altar: 9,
      temple: 0,
      monument: 0,
      territoryFree: 7,
      constructionMult: 1,
      stock: {
        food: 84.9,
        wood: 216.68,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 267,
      },
      netRates: {
        food: 12.4,
        wood: 6.08,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 0.9,
      },
    },
    countdownStart: {
      elapsed: 660,
      hqTier: 0,
      hqLevel: 4,
      workers: 75,
      workersCap: 80,
      storageCap: 500,
      productionValue: 54.5,
      faithRate: 0.9,
      armyUnits: 0,
      researchCount: 0,
      buildingLevels: 32,
      altar: 9,
      temple: 0,
      monument: 0,
      territoryFree: 8,
      constructionMult: 1,
      stock: {
        food: 422.5,
        wood: 343,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 374.1,
      },
      netRates: {
        food: 34.5,
        wood: 20,
        stone: 0,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 0.9,
      },
    },
  },
  {
    index: 3,
    runs: 60,
    activation: {
      elapsed: 1021,
      hqTier: 2,
      hqLevel: 6,
      workers: 120,
      workersCap: 130,
      storageCap: 1244,
      productionValue: 26.85,
      faithRate: 0.9,
      armyUnits: 0,
      researchCount: 0,
      buildingLevels: 52,
      altar: 9,
      temple: 0,
      monument: 0,
      territoryFree: 7,
      constructionMult: 1,
      stock: {
        food: 1244,
        wood: 90.85,
        stone: 1134.5,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 99,
      },
      netRates: {
        food: 16,
        wood: 15.6,
        stone: 7.5,
        copper: 0,
        iron: 0,
        gold: 0,
        knowledge: 0,
        faith: 0.9,
      },
    },
    countdownStart: {
      elapsed: 1140,
      hqTier: 2,
      hqLevel: 6,
      workers: 130,
      workersCap: 130,
      storageCap: 1791,
      productionValue: 24.6,
      faithRate: 1.65,
      armyUnits: 5,
      researchCount: 0,
      buildingLevels: 60,
      altar: 9,
      temple: 1,
      monument: 0,
      territoryFree: 0,
      constructionMult: 1,
      stock: {
        food: 1791,
        wood: 473.75,
        stone: 1073.5,
        copper: 62,
        iron: 0,
        gold: 0,
        knowledge: 20,
        faith: 243.6,
      },
      netRates: {
        food: 14.5,
        wood: 11.3,
        stone: 4.5,
        copper: 3,
        iron: 0,
        gold: 0,
        knowledge: 0.5,
        faith: 1.65,
      },
    },
  },
  {
    index: 4,
    runs: 60,
    activation: {
      elapsed: 1561,
      hqTier: 2,
      hqLevel: 8,
      workers: 130,
      workersCap: 130,
      storageCap: 1970,
      productionValue: 29.15,
      faithRate: 4.49,
      armyUnits: 16,
      researchCount: 4,
      buildingLevels: 74,
      altar: 12,
      temple: 10,
      monument: 0,
      territoryFree: 5,
      constructionMult: 0.9,
      stock: {
        food: 1970,
        wood: 210.85,
        stone: 398.14,
        copper: 602.48,
        iron: 0,
        gold: 0,
        knowledge: 20.55,
        faith: 1848.95,
      },
      netRates: {
        food: 9.15,
        wood: 17.99,
        stone: 3.29,
        copper: 1.53,
        iron: 0,
        gold: 0,
        knowledge: 0.55,
        faith: 4.49,
      },
    },
    countdownStart: {
      elapsed: 1630,
      hqTier: 2,
      hqLevel: 8,
      workers: 130,
      workersCap: 130,
      storageCap: 2364,
      productionValue: 34.56,
      faithRate: 4.6,
      armyUnits: 17,
      researchCount: 4,
      buildingLevels: 76,
      altar: 12,
      temple: 10,
      monument: 0,
      territoryFree: 3.5,
      constructionMult: 0.9,
      stock: {
        food: 1970,
        wood: 478.42,
        stone: 481.57,
        copper: 658.28,
        iron: 0,
        gold: 0,
        knowledge: 54,
        faith: 2118.92,
      },
      netRates: {
        food: 9.15,
        wood: 17.03,
        stone: 3.84,
        copper: 1.74,
        iron: 0,
        gold: 0,
        knowledge: 0.55,
        faith: 4.6,
      },
    },
  },
  {
    index: 5,
    runs: 60,
    activation: {
      elapsed: 2111,
      hqTier: 3,
      hqLevel: 9,
      workers: 154,
      workersCap: 154,
      storageCap: 2837,
      productionValue: 34.63,
      faithRate: 5.25,
      armyUnits: 14,
      researchCount: 7,
      buildingLevels: 88,
      altar: 17,
      temple: 10,
      monument: 0,
      territoryFree: 1,
      constructionMult: 0.46,
      stock: {
        food: 2808.4,
        wood: 298.71,
        stone: 391.94,
        copper: 947.13,
        iron: 284.86,
        gold: 0,
        knowledge: 55.1,
        faith: 1193.05,
      },
      netRates: {
        food: 10.65,
        wood: 11.65,
        stone: 3.15,
        copper: 2.21,
        iron: 1.05,
        gold: 0,
        knowledge: 0.5,
        faith: 5.25,
      },
    },
    countdownStart: {
      elapsed: 2170,
      hqTier: 3,
      hqLevel: 9,
      workers: 165,
      workersCap: 165,
      storageCap: 3405,
      productionValue: 34.88,
      faithRate: 5.25,
      armyUnits: 24,
      researchCount: 7,
      buildingLevels: 89,
      altar: 17,
      temple: 10,
      monument: 0,
      territoryFree: 1,
      constructionMult: 0.45,
      stock: {
        food: 2844,
        wood: 423.56,
        stone: 400.76,
        copper: 977.99,
        iron: 388.87,
        gold: 0,
        knowledge: 84.8,
        faith: 1534.71,
      },
      netRates: {
        food: 9.8,
        wood: 10.39,
        stone: 3.15,
        copper: 2.73,
        iron: 1.37,
        gold: 0,
        knowledge: 0.5,
        faith: 5.25,
      },
    },
  },
  {
    index: 6,
    runs: 60,
    activation: {
      elapsed: 2741,
      hqTier: 4,
      hqLevel: 10,
      workers: 165,
      workersCap: 165,
      storageCap: 4458,
      productionValue: 29.16,
      faithRate: 5.57,
      armyUnits: 28,
      researchCount: 9,
      buildingLevels: 100,
      altar: 17,
      temple: 10,
      monument: 7,
      territoryFree: 0,
      constructionMult: 0.8,
      stock: {
        food: 4139,
        wood: 690.99,
        stone: 362.05,
        copper: 316.26,
        iron: 246.58,
        gold: 12.07,
        knowledge: 98.65,
        faith: 7680.52,
      },
      netRates: {
        food: 12,
        wood: 9.94,
        stone: 3.55,
        copper: 2.1,
        iron: 1.05,
        gold: 0.26,
        knowledge: 0.65,
        faith: 5.57,
      },
    },
    countdownStart: {
      elapsed: 2800,
      hqTier: 4,
      hqLevel: 10,
      workers: 165,
      workersCap: 165,
      storageCap: 4458,
      productionValue: 23.8,
      faithRate: 5.67,
      armyUnits: 28,
      researchCount: 9,
      buildingLevels: 100,
      altar: 17,
      temple: 10,
      monument: 7,
      territoryFree: 0,
      constructionMult: 0.8,
      stock: {
        food: 4458,
        wood: 1111.68,
        stone: 530.99,
        copper: 371.64,
        iron: 304.96,
        gold: 26.91,
        knowledge: 131,
        faith: 8008.85,
      },
      netRates: {
        food: 12.2,
        wood: 9.94,
        stone: 3.46,
        copper: 2.1,
        iron: 1.05,
        gold: 0.26,
        knowledge: 0.65,
        faith: 5.67,
      },
    },
  },
  {
    index: 7,
    runs: 60,
    activation: {
      elapsed: 3401,
      hqTier: 4,
      hqLevel: 11,
      workers: 165,
      workersCap: 165,
      storageCap: 6419,
      productionValue: 42.42,
      faithRate: 6.13,
      armyUnits: 32,
      researchCount: 11,
      buildingLevels: 104,
      altar: 18.5,
      temple: 10,
      monument: 7,
      territoryFree: 6,
      constructionMult: 0.8,
      stock: {
        food: 5970.79,
        wood: 650.26,
        stone: 1048.62,
        copper: 1219.13,
        iron: 926.31,
        gold: 186.01,
        knowledge: 99.4,
        faith: 1474.34,
      },
      netRates: {
        food: 17.04,
        wood: 9.76,
        stone: 4.62,
        copper: 2.42,
        iron: 1.21,
        gold: 0.28,
        knowledge: 0.5,
        faith: 6.13,
      },
    },
    countdownStart: {
      elapsed: 3460,
      hqTier: 4,
      hqLevel: 11,
      workers: 165,
      workersCap: 168,
      storageCap: 6419,
      productionValue: 35.2,
      faithRate: 6.38,
      armyUnits: 32,
      researchCount: 12,
      buildingLevels: 104,
      altar: 19,
      temple: 10,
      monument: 7,
      territoryFree: 5,
      constructionMult: 0.8,
      stock: {
        food: 6419,
        wood: 636.77,
        stone: 1214.92,
        copper: 1296.98,
        iron: 991.54,
        gold: 202.26,
        knowledge: 84.8,
        faith: 1853.74,
      },
      netRates: {
        food: 17.8,
        wood: 9.52,
        stone: 4.46,
        copper: 2.52,
        iron: 1.21,
        gold: 0.28,
        knowledge: 0.5,
        faith: 6.38,
      },
    },
  },
  {
    index: 8,
    runs: 60,
    activation: {
      elapsed: 4121,
      hqTier: 4,
      hqLevel: 11,
      workers: 180,
      workersCap: 180,
      storageCap: 7703,
      productionValue: 41.05,
      faithRate: 6.6,
      armyUnits: 34,
      researchCount: 13,
      buildingLevels: 108,
      altar: 19,
      temple: 10,
      monument: 7,
      territoryFree: 1,
      constructionMult: 0.8,
      stock: {
        food: 2277.93,
        wood: 1121.65,
        stone: 1165.47,
        copper: 2370.84,
        iron: 1736.9,
        gold: 377.59,
        knowledge: 97.5,
        faith: 6196.31,
      },
      netRates: {
        food: 11.85,
        wood: 10.22,
        stone: 4.62,
        copper: 2.64,
        iron: 1.32,
        gold: 0.28,
        knowledge: 0.5,
        faith: 6.6,
      },
    },
    countdownStart: {
      elapsed: 4180,
      hqTier: 4,
      hqLevel: 11,
      workers: 180,
      workersCap: 180,
      storageCap: 7703,
      productionValue: 39.6,
      faithRate: 6.79,
      armyUnits: 34,
      researchCount: 13,
      buildingLevels: 109,
      altar: 19.5,
      temple: 10,
      monument: 7,
      territoryFree: 1,
      constructionMult: 0.8,
      stock: {
        food: 3332.8,
        wood: 1095.53,
        stone: 1428.44,
        copper: 2507.85,
        iron: 1815.1,
        gold: 393.82,
        knowledge: 127,
        faith: 6616.13,
      },
      netRates: {
        food: 11.85,
        wood: 10.38,
        stone: 4.29,
        copper: 2.86,
        iron: 1.32,
        gold: 0.28,
        knowledge: 0.5,
        faith: 6.79,
      },
    },
  },
  {
    index: 9,
    runs: 60,
    activation: {
      elapsed: 4901,
      hqTier: 4,
      hqLevel: 11,
      workers: 180,
      workersCap: 180,
      storageCap: 8345,
      productionValue: 64.85,
      faithRate: 7.15,
      armyUnits: 35,
      researchCount: 14,
      buildingLevels: 110,
      altar: 20,
      temple: 11,
      monument: 7,
      territoryFree: 0,
      constructionMult: 0.8,
      stock: {
        food: 2968.32,
        wood: 4434.97,
        stone: 2094.1,
        copper: 2212.16,
        iron: 2754.07,
        gold: 577.15,
        knowledge: 217.1,
        faith: 6135.22,
      },
      netRates: {
        food: 25.45,
        wood: 18.36,
        stone: 5.18,
        copper: 3.46,
        iron: 1.58,
        gold: 0.36,
        knowledge: 0.5,
        faith: 7.15,
      },
    },
    countdownStart: {
      elapsed: 4960,
      hqTier: 4,
      hqLevel: 11,
      workers: 180,
      workersCap: 180,
      storageCap: 8345,
      productionValue: 62.98,
      faithRate: 7.87,
      armyUnits: 35,
      researchCount: 14,
      buildingLevels: 110,
      altar: 20,
      temple: 11,
      monument: 7,
      territoryFree: 0,
      constructionMult: 0.8,
      stock: {
        food: 4390,
        wood: 4931.19,
        stone: 2370.78,
        copper: 2441.56,
        iron: 2846.83,
        gold: 596.92,
        knowledge: 242,
        faith: 6575.93,
      },
      netRates: {
        food: 25.4,
        wood: 10.86,
        stone: 6.77,
        copper: 4.13,
        iron: 2.15,
        gold: 0.36,
        knowledge: 0.5,
        faith: 7.87,
      },
    },
  },
  {
    index: 10,
    runs: 60,
    activation: {
      elapsed: 5771,
      hqTier: 4,
      hqLevel: 12,
      workers: 180,
      workersCap: 180,
      storageCap: 10014,
      productionValue: 43.3,
      faithRate: 6.66,
      armyUnits: 43,
      researchCount: 15,
      buildingLevels: 114,
      altar: 20,
      temple: 11,
      monument: 9,
      territoryFree: 5,
      constructionMult: 0.41,
      stock: {
        food: 447.9,
        wood: 792.65,
        stone: 1726.34,
        copper: 2015.64,
        iron: 2245.19,
        gold: 691.46,
        knowledge: 233,
        faith: 8321.8,
      },
      netRates: {
        food: 10.95,
        wood: 15.21,
        stone: 5.18,
        copper: 2.85,
        iron: 1.44,
        gold: 0.36,
        knowledge: 0.5,
        faith: 6.66,
      },
    },
    countdownStart: {
      elapsed: 5835,
      hqTier: 4,
      hqLevel: 12,
      workers: 180,
      workersCap: 180,
      storageCap: 10014,
      productionValue: 40.82,
      faithRate: 6.77,
      armyUnits: 43,
      researchCount: 15,
      buildingLevels: 115,
      altar: 20.5,
      temple: 11,
      monument: 9,
      territoryFree: 5,
      constructionMult: 0.41,
      stock: {
        food: 1096.1,
        wood: 943.98,
        stone: 1958.22,
        copper: 2156.72,
        iron: 2338.26,
        gold: 712.55,
        knowledge: 231,
        faith: 8716.7,
      },
      netRates: {
        food: 12.55,
        wood: 13.02,
        stone: 4.29,
        copper: 2.86,
        iron: 1.43,
        gold: 0.29,
        knowledge: 0.5,
        faith: 6.77,
      },
    },
  },
]
