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
export const CHALLENGE_TARGET_TIME_SHARE = 0.65

// Smallest share of the base faith and resource amounts a struggling colony is asked for
export const CHALLENGE_MIN_AMOUNT_SCALE = 0.15

// Largest scale of the base requirements for a thriving colony
export const CHALLENGE_MAX_HARDEN_SCALE = 1.3

// Largest share cut from the building-level and worker requirements
export const CHALLENGE_MAX_LEVEL_CUT = 0.2

// Longest timer, as a multiple of the base timer
export const CHALLENGE_MAX_TIMEOUT_SCALE = 1.75

// Each failure lowers the target time share by this fraction (compounding)
export const CHALLENGE_FAILURE_EASE = 0.15

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
// starts, generated by the balance simulation (reference snippet in its report). Placeholder until
// tuned: without stats every colony counts as typical (health 1)
export const CHALLENGE_REFERENCE_STATS = Array.from({
  length: 10,
}, (_, i) => ({
  index: i + 1,
  runs: 0,
  activation: null,
  countdownStart: null,
}))
