// Economy planning for the simulation bots: worker split, recruiting and the building wish list.
// Everything here reads the state and returns plans or wish items; the Bot runs the State actions.

import {MARKET_TRADE_AMOUNT, PRODUCTION_RATES, TRIBUTE_RESOURCE_VALUES, WORKER_RECRUIT_COST, WORKERS_PER_LEVEL} from '@/js/engine/balancing.js'
import {BOUNDED_RESOURCES, HEADER_RESOURCES, HQ_RESOURCE_UNLOCKS, HQ_TYPES, RESEARCH_COSTS, RESEARCH_MODAL_TREE, RESEARCH_PREREQUISITES, RESEARCH_TREE, TRADEABLE_RESOURCES} from '@/js/engine/constants.js'
import {BONUS_STORAGE_CAPACITY, BUILDING_ACADEMY, BUILDING_ALTAR, BUILDING_COPPER_MINE, BUILDING_FARM, BUILDING_GOLD_MINE, BUILDING_HOUSE, BUILDING_IRON_MINE, BUILDING_MARKET, BUILDING_QUARRY, BUILDING_STOREHOUSE, BUILDING_TEMPLE, BUILDING_WOODCUTTER, RESOURCE_FAITH, RESOURCE_FOOD, RESOURCE_GOLD, RESOURCE_KNOWLEDGE, RESOURCE_WOOD, TRADE_BUY, TRADE_SELL} from '@/js/engine/enums.js'
import {marketTradeQuote} from '@/js/engine/utils.js'
import {WORKER_SPLIT_BALANCED, WORKER_SPLIT_FIXED} from './bot_profiles.js'

// Worker-staffed producers, in tier order (the order also breaks ties)
export const PRODUCER_KEYS = [
  BUILDING_FARM,
  BUILDING_WOODCUTTER,
  BUILDING_QUARRY,
  BUILDING_COPPER_MINE,
  BUILDING_IRON_MINE,
  BUILDING_GOLD_MINE,
  BUILDING_TEMPLE,
  BUILDING_ACADEMY,
]

// Resource each producer makes
export const PRODUCER_RESOURCES = Object.fromEntries(PRODUCER_KEYS.map(key => [
  key,
  PRODUCTION_RATES[key].resource,
]))

const FIXED_FOOD_SHARE = 0.6 // Fixed split: share of the food/wood workers on the farm
const FULL_STOCK_SHARE = 0.98 // Stock share of the cap at which a producer gets no spare workers
const MIN_RATE_MULTIPLIER = 0.05 // Floor for a production multiplier lowered by punishments
const RECRUIT_FOOD_BUFFER_SECONDS = 20 // Seconds of food upkeep kept in stock when recruiting
const RECRUIT_BATCH = 5 // Recruits the bot saves food for at a time
const VALUE_FAITH = 2 // Worth of one faith when spare workers are placed by value
const VALUE_KNOWLEDGE = 2 // Worth of one knowledge when spare workers are placed by value
const ALTAR_LEVELS_MAX = 60 // Altar levels the bots never build past outside a challenge
const STOREHOUSE_AHEAD_FILL = 0.75 // Planning ahead: the next headquarters costs should fit in this share of the cap
const MARKET_SELL_FILL = 0.95 // Sells a resource at the market once its stock reaches this share of the cap
const CHALLENGE_WORKER_SHARE = 0.5 // Share of the workers a running challenge can pull into its producers
const GROWTH_SAVE_SECONDS = 240 // Saves for a house or producer level only when the income covers what is missing within this time

/**
 * Creates an amount per resource, all zero.
 * @returns {Object<string, number>} Zero amount for every resource
 */
export function emptyAmounts() {
  return Object.fromEntries(HEADER_RESOURCES.map(resource => [
    resource,
    0,
  ]))
}

/**
 * Adds a cost to an amount per resource, in place.
 * @param {Object<string, number>} amounts - Amounts to add to
 * @param {Cost|Object<string, number>} cost - Cost or amounts to add
 * @returns {Object<string, number>} The same amounts object
 */
export function addAmounts(amounts, cost) {
  for (const resource of HEADER_RESOURCES) {
    amounts[resource] += cost[resource] ?? 0
  }
  return amounts
}

/**
 * Shared storage cap of the bounded resources, with the Storage research bonus.
 * @param {State} state - Game state
 * @returns {number} Storage cap
 */
export function storageCapOf(state) {
  const {
    buildings,
  } = state.colony
  const bonuses = buildings.academy.completedBonuses(RESEARCH_TREE)
  return buildings.storehouse.storageCap(bonuses[BONUS_STORAGE_CAPACITY] ?? 0)
}

/**
 * Whether the colony can pay a cost and still keep the reserved amounts.
 * @param {State} state - Game state
 * @param {Cost} cost - Cost to pay
 * @param {Object<string, number>} reserve - Amounts that must stay in stock
 * @returns {boolean} True when every resource the cost uses stays at or above its reserve
 */
export function fitsReserve(state, cost, reserve) {
  const {
    resources,
  } = state.colony
  for (const resource of HEADER_RESOURCES) {
    const amount = cost[resource] ?? 0
    if (amount > 0 && resources[resource] - amount < (reserve[resource] ?? 0)) {
      return false
    }
  }
  return true
}

/**
 * Whether a cost asks for more of a bounded resource than storage can hold.
 * @param {Cost} cost - Cost to check
 * @param {number} cap - Storage cap
 * @returns {boolean} True when the cost can never be paid at this cap
 */
export function exceedsCap(cost, cap) {
  return BOUNDED_RESOURCES.some(resource => (cost[resource] ?? 0) > cap)
}

/**
 * Level of a building counting a construction in progress as done.
 * @param {Building} building - Building to read
 * @returns {number} Level once the running construction finishes
 */
export function plannedLevel(building) {
  return building.level + (building.isConstructing ? 1 : 0)
}

/**
 * Worker slots of the producers once their running constructions finish.
 * @param {State} state - Game state
 * @returns {number} Planned worker capacity
 */
export function producerCapacity(state) {
  const {
    buildings,
  } = state.colony
  let levels = 0
  for (const key of PRODUCER_KEYS) {
    levels += plannedLevel(buildings[key])
  }
  return levels * WORKERS_PER_LEVEL
}

/**
 * Free territory slots (slots under construction count as used).
 * @param {State} state - Game state
 * @returns {number} Free slots
 */
export function freeTerritory(state) {
  const {
    resources, buildings,
  } = state.colony
  return buildings.headquarters.territoryCap + resources.territoryBonus - resources.territory
}

/**
 * Wish item that levels up a building (or builds it at level 0). Respects the headquarters
 * unlocks the building grid enforces (levelUpBuilding itself does not check them).
 * @param {State} state - Game state
 * @param {string} key - Building key
 * @param {boolean} save - Whether the bot saves for it when it cannot pay yet
 * @param {string} reason - Short label (debugging)
 * @returns {Object|null} Wish item, or null when the building cannot be levelled now
 */
export function buildingItem(state, key, save, reason) {
  const building = state.colony.buildings[key]
  if (!state.unlockedBuildings.has(key) || building.isConstructing || freeTerritory(state) <= 0) {
    return null
  }
  return {
    label: reason + ':' + key,
    cost: building.levelUpCost,
    save: save,
    run: () => {
      state.levelUpBuilding(key)
      return building.isConstructing
    },
  }
}

/**
 * Wish item that expands the territory.
 * @param {State} state - Game state
 * @returns {Object|null} Wish item, or null while the headquarters is busy
 */
export function expansionItem(state) {
  const headquarters = state.colony.buildings.headquarters
  if (headquarters.isConstructing || headquarters.isUpgrading) {
    return null
  }
  return {
    label: 'expand',
    cost: state.expansionCost,
    save: true,
    run: () => {
      state.expandTerritory()
      return headquarters.isConstructing
    },
  }
}

/**
 * Wish item that upgrades the headquarters to the next tier.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @returns {Object|null} Wish item, or null at City, while the headquarters is busy, or while a cautious profile waits
 */
export function headquartersUpgradeItem(state, profile) {
  const headquarters = state.colony.buildings.headquarters
  const cost = headquarters.upgradeCost
  if (!cost || headquarters.isConstructing || headquarters.isUpgrading) {
    return null
  }
  // A cautious player waits until the stock covers the cost several times over (or storage is full)
  const cautious = profile.hqUpgradeStockFactor > 1
  const cap = storageCapOf(state)
  if (cautious && [...cost.entries].some(([
    resource,
    amount,
  ]) => state.colony.resources[resource] < Math.max(amount, Math.min(amount * profile.hqUpgradeStockFactor, cap)))) {
    return null
  }
  return {
    label: 'upgrade:' + headquarters.nextType,
    cost: cost,
    save: !cautious,
    urgent: true,
    run: () => {
      state.upgradeHeadquarters()
      return headquarters.isUpgrading
    },
  }
}

/**
 * Production per worker of each producer at the current multipliers.
 * @param {State} state - Game state
 * @returns {Object<string, number>} Rate per worker by building key
 */
export function ratesPerWorker(state) {
  const rates = {}
  for (const key of PRODUCER_KEYS) {
    const multiplier = Math.max(MIN_RATE_MULTIPLIER, state.productionMultipliers[PRODUCER_RESOURCES[key]])
    rates[key] = PRODUCTION_RATES[key].rate * multiplier
  }
  return rates
}

/**
 * Worth of one unit of a resource when spare workers are placed by value.
 * @param {string} resource - Resource key
 * @returns {number} Value per unit
 */
export function resourceValue(resource) {
  if (resource === RESOURCE_FAITH) {
    return VALUE_FAITH
  }
  if (resource === RESOURCE_KNOWLEDGE) {
    return VALUE_KNOWLEDGE
  }
  return TRIBUTE_RESOURCE_VALUES[resource]
}

/**
 * Splits the colony's workers between the producers.
 * Food and wood come first (upkeep plus the profile margin), then the rates a running challenge
 * asks for, then the spare workers by the profile's split: fixed (evenly over the other workplaces), balanced
 * (in proportion to what the bot is saving for) or marginal (bottleneck resource first).
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @param {Object<string, number>} challengeRates - Extra production per second a challenge needs, by resource
 * @param {Object<string, number>} shortfall - Amount still missing for the bot's goal, by resource
 * @returns {{targets: Object<string, number>, shortage: {food: number, wood: number}, preferred: string|null, bottleneckFull: boolean}}
 *   Planned workers per producer, food/wood workers that found no slot, the producer the bot wants more slots in,
 *   and whether that producer is full while its resource is still missing
 */
export function planWorkers(state, profile, challengeRates, shortfall) {
  const {
    buildings, resources,
  } = state.colony
  const rates = ratesPerWorker(state)
  const targets = Object.fromEntries(PRODUCER_KEYS.map(key => [
    key,
    0,
  ]))
  let remaining = resources.workers
  const assign = (key, count) => {
    const amount = Math.max(0, Math.min(count, buildings[key].maxWorkers - targets[key], remaining))
    targets[key] += amount
    remaining -= amount
    return amount
  }
  const unassigned = () => remaining

  // Food and wood: cover worker and army upkeep plus the margin (and any challenge need)
  const foodNeed = state.consumption.food * (1 + profile.foodWoodMargin) + (challengeRates.food ?? 0)
  const woodNeed = state.consumption.wood * (1 + profile.foodWoodMargin) + (challengeRates.wood ?? 0)
  let farmWorkers = Math.ceil(foodNeed / rates[BUILDING_FARM])
  let woodWorkers = Math.ceil(woodNeed / rates[BUILDING_WOODCUTTER])
  if (profile.workerSplit === WORKER_SPLIT_FIXED) {
    const total = Math.max(Math.ceil(farmWorkers / FIXED_FOOD_SHARE), Math.ceil(woodWorkers / (1 - FIXED_FOOD_SHARE)))
    farmWorkers = Math.round(total * FIXED_FOOD_SHARE)
    woodWorkers = total - farmWorkers
  }
  const shortage = {
    food: farmWorkers - assign(BUILDING_FARM, farmWorkers),
    wood: woodWorkers - assign(BUILDING_WOODCUTTER, woodWorkers),
  }

  // A running challenge: staff the producers of the other missing resources next, up to a share of the workers
  let challengeWorkers = Math.floor(resources.workers * CHALLENGE_WORKER_SHARE)
  for (const key of PRODUCER_KEYS) {
    const rate = challengeRates[PRODUCER_RESOURCES[key]] ?? 0
    if (key !== BUILDING_FARM && key !== BUILDING_WOODCUTTER && rate > 0) {
      challengeWorkers -= assign(key, Math.min(challengeWorkers, Math.ceil(rate / rates[key])))
    }
  }

  // Spare workers
  const built = PRODUCER_KEYS.filter(key => buildings[key].level > 0)
  let preferred
  if (profile.workerSplit === WORKER_SPLIT_FIXED) {
    // Spread evenly over the other workplaces (farm and woodcutter only while there is nothing else)
    const others = built.filter(key => key !== BUILDING_ACADEMY && key !== BUILDING_FARM && key !== BUILDING_WOODCUTTER)
    const pool = others.length > 0 ? others : built
    preferred = pool.reduce((lowest, key) => (lowest === null || buildings[key].level < buildings[lowest].level ? key : lowest), null)
    roundRobin(pool, assign, unassigned)
    roundRobin(built, assign, unassigned)
  } else {
    // Fixed shares for faith and knowledge, which no building cost asks for
    const spare = remaining
    if (built.includes(BUILDING_TEMPLE)) {
      assign(BUILDING_TEMPLE, Math.round(spare * profile.faithShare))
    }
    if (built.includes(BUILDING_ACADEMY) && profile.research.length > 0) {
      assign(BUILDING_ACADEMY, Math.round(spare * profile.knowledgeShare))
    }
    const cap = storageCapOf(state)
    const pool = built.filter(key => key !== BUILDING_ACADEMY && key !== BUILDING_TEMPLE
      && resources[PRODUCER_RESOURCES[key]] < cap * FULL_STOCK_SHARE)
    if (profile.workerSplit === WORKER_SPLIT_BALANCED) {
      preferred = splitByNeed(pool, rates, shortfall, assign, unassigned)
    } else {
      preferred = splitByBottleneck(state, pool, rates, targets, shortfall, assign, unassigned)
    }
    // Whatever is left goes round robin, so nobody idles while a producer has room
    roundRobin(built, assign, unassigned)
  }
  // The producer the bot wants more of is full while its resource is still missing
  const bottleneckFull = Boolean(preferred) && profile.workerSplit !== WORKER_SPLIT_FIXED
    && targets[preferred] >= buildings[preferred].maxWorkers && (shortfall[PRODUCER_RESOURCES[preferred]] ?? 0) > 0
  return {
    targets: targets,
    shortage: shortage,
    preferred: preferred,
    bottleneckFull: bottleneckFull,
  }
}

/**
 * Assigns the remaining workers one at a time to the producers in turn, skipping full ones.
 * @param {string[]} pool - Producer keys
 * @param {function(string, number): number} assign - Assigns workers, returns how many fit
 * @param {function(): number} unassigned - Workers still unassigned
 */
function roundRobin(pool, assign, unassigned) {
  let progress = true
  while (unassigned() > 0 && progress) {
    progress = false
    for (const key of pool) {
      if (unassigned() > 0 && assign(key, 1) > 0) {
        progress = true
      }
    }
  }
}

/**
 * Balanced split: spare workers in proportion to the time each missing resource would take.
 * @param {string[]} pool - Producer keys that can take spare workers
 * @param {Object<string, number>} rates - Rate per worker by building key
 * @param {Object<string, number>} shortfall - Missing amount by resource
 * @param {function(string, number): number} assign - Assigns workers, returns how many fit
 * @param {function(): number} unassigned - Workers still unassigned
 * @returns {string|null} Producer the bot wants more slots in
 */
function splitByNeed(pool, rates, shortfall, assign, unassigned) {
  const weights = {}
  let total = 0
  for (const key of pool) {
    const missing = shortfall[PRODUCER_RESOURCES[key]] ?? 0
    if (missing > 0) {
      weights[key] = missing / rates[key]
      total += weights[key]
    }
  }
  const needed = Object.keys(weights)
  if (needed.length === 0) {
    return pool[pool.length - 1] ?? null
  }
  const spare = unassigned()
  for (const key of needed) {
    assign(key, Math.round(spare * weights[key] / total))
  }
  return needed.reduce((best, key) => (weights[key] > weights[best] ? key : best))
}

/**
 * Marginal split: each spare worker goes to the resource that would take longest to reach its goal;
 * once nothing is missing, to the producer whose output is worth most.
 * @param {State} state - Game state
 * @param {string[]} pool - Producer keys that can take spare workers
 * @param {Object<string, number>} rates - Rate per worker by building key
 * @param {Object<string, number>} targets - Workers planned per producer so far
 * @param {Object<string, number>} shortfall - Missing amount by resource
 * @param {function(string, number): number} assign - Assigns workers, returns how many fit
 * @param {function(): number} unassigned - Workers still unassigned
 * @returns {string|null} Producer the bot wants more slots in
 */
function splitByBottleneck(state, pool, rates, targets, shortfall, assign, unassigned) {
  const plannedRate = {}
  for (const key of PRODUCER_KEYS) {
    const resource = PRODUCER_RESOURCES[key]
    plannedRate[resource] = (plannedRate[resource] ?? 0) + targets[key] * rates[key]
  }
  plannedRate.food -= state.consumption.food
  plannedRate.wood -= state.consumption.wood
  const score = key => {
    const resource = PRODUCER_RESOURCES[key]
    const missing = shortfall[resource] ?? 0
    if (missing > 0) {
      return missing / Math.max(plannedRate[resource], 1e-6)
    }
    return -1 / (rates[key] * resourceValue(resource))
  }
  const best = candidates => candidates.reduce((top, key) => (top === null || score(key) > score(top) ? key : top), null)
  const preferred = best(pool)
  const {
    buildings,
  } = state.colony
  while (unassigned() > 0) {
    const key = best(pool.filter(candidate => targets[candidate] < buildings[candidate].maxWorkers))
    if (key === null) {
      break
    }
    assign(key, 1)
    plannedRate[PRODUCER_RESOURCES[key]] += rates[key]
  }
  return preferred
}

/**
 * Moves workers to match the planned split: frees workers first, then assigns idle ones
 * (never recruiting through an assignment).
 * @param {State} state - Game state
 * @param {Object<string, number>} targets - Planned workers per producer
 */
export function applyWorkerTargets(state, targets) {
  const {
    buildings,
  } = state.colony
  for (const key of PRODUCER_KEYS) {
    if (buildings[key].workers > targets[key]) {
      state.unassignWorkers(key, buildings[key].workers - targets[key])
    }
  }
  for (const key of PRODUCER_KEYS) {
    const count = Math.min(targets[key] - buildings[key].workers, state.colony.idleWorkers)
    if (count > 0) {
      state.assignWorkers(key, count)
    }
  }
}

/**
 * Recruits workers up to the wanted population, keeping the reserved food plus a buffer of upkeep.
 * @param {State} state - Game state
 * @param {Object<string, number>} reserve - Amounts that must stay in stock
 * @param {number} wanted - Population the bot wants
 * @returns {number} Workers recruited
 */
export function recruitWorkers(state, reserve, wanted) {
  const {
    resources, buildings,
  } = state.colony
  const buffer = state.consumption.food * RECRUIT_FOOD_BUFFER_SECONDS
  let recruited = 0
  while (resources.workers < Math.min(wanted, buildings.house.workersCap)
    && resources.food - WORKER_RECRUIT_COST.food >= (reserve.food ?? 0) + buffer) {
    const before = resources.workers
    state.recruitWorker()
    if (resources.workers === before) {
      break
    }
    recruited += 1
  }
  return recruited
}

/**
 * Food the bot wants for its next recruits while beds and jobs are free: a few workers' worth
 * plus the upkeep buffer recruiting keeps.
 * @param {State} state - Game state
 * @returns {number} Food wanted for recruiting
 */
export function recruitFoodNeed(state) {
  const {
    resources, buildings,
  } = state.colony
  const openings = Math.min(RECRUIT_BATCH, Math.min(buildings.house.workersCap, producerCapacity(state)) - resources.workers)
  return openings > 0 ? openings * WORKER_RECRUIT_COST.food + state.consumption.food * RECRUIT_FOOD_BUFFER_SECONDS : 0
}

/**
 * Priority 1 — food and wood, worker side: dismisses the idle workers (who have no job left, e.g. after
 * lost levels) while food or wood still runs at a loss after the workers were moved.
 * @param {State} state - Game state
 * @returns {number} Workers dismissed
 */
export function dismissIdleWhenShort(state) {
  const idle = state.colony.idleWorkers
  if (idle <= 0 || (state.netProduction(RESOURCE_FOOD) >= 0 && state.netProduction(RESOURCE_WOOD) >= 0)) {
    return 0
  }
  state.dismissWorkers(idle)
  return idle
}

/**
 * Priority 1 — food and wood: farm or woodcutter levels when their workers cannot cover the upkeep.
 * @param {State} state - Game state
 * @param {Object} workerPlan - Result of planWorkers
 * @returns {Array<Object|null>} Wish items
 */
export function foodWoodItems(state, workerPlan) {
  const items = []
  if (workerPlan.shortage.food > 0) {
    items.push(buildingItem(state, BUILDING_FARM, true, 'food'))
  }
  if (workerPlan.shortage.wood > 0) {
    items.push(buildingItem(state, BUILDING_WOODCUTTER, true, 'wood'))
  }
  return items
}

/**
 * Priority 2 — population: a house level when beds run short while the producers have room for more
 * workers, and a producer level (where the bot wants workers most) when the beds outnumber the jobs
 * or that producer is full while its resource is missing.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @param {Object} workerPlan - Result of planWorkers
 * @returns {Array<Object|null>} Wish items
 */
export function populationItems(state, profile, workerPlan) {
  const {
    resources, buildings,
  } = state.colony
  const items = []
  const beds = buildings.house.workersCap - resources.workers
  const jobs = producerCapacity(state)
  if (beds <= profile.houseLead && jobs > buildings.house.workersCap - profile.houseLead) {
    items.push(growthItem(state, BUILDING_HOUSE, 'population'))
  }
  if (workerPlan.preferred && (jobs <= buildings.house.workersCap || workerPlan.bottleneckFull)) {
    items.push(growthItem(state, workerPlan.preferred, 'jobs'))
  }
  return items
}

/**
 * Wish item for a growth level (house or producer): saved for only while the income covers what is
 * missing soon, so ever pricier levels never hold back the rest of the list.
 * @param {State} state - Game state
 * @param {string} key - Building key
 * @param {string} reason - Short label (debugging)
 * @returns {Object|null} Wish item, or null when the building cannot be levelled now
 */
function growthItem(state, key, reason) {
  const item = buildingItem(state, key, true, reason)
  if (item) {
    item.save = [...item.cost.entries].every(([
      resource,
      amount,
    ]) => amount - state.colony.resources[resource] <= Math.max(0, state.netProduction(resource)) * GROWTH_SAVE_SECONDS)
  }
  return item
}

/**
 * Priority 4 — storage: a storehouse level when an unlocked resource nears the cap, or (planning ahead)
 * when the next headquarters costs no longer fit comfortably.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @returns {Array<Object|null>} Wish items
 */
export function storehouseItems(state, profile) {
  const {
    resources, buildings,
  } = state.colony
  const cap = storageCapOf(state)
  const unlockedResources = state._unlockedByHeadquarters(HQ_RESOURCE_UNLOCKS)
  let wanted = BOUNDED_RESOURCES.some(resource => unlockedResources.includes(resource) && resources[resource] >= cap * profile.storehouseFill)
  if (!wanted && profile.storehouseAhead) {
    const upcoming = [
      state.expansionCost,
      buildings.headquarters.upgradeCost,
    ].filter(Boolean)
    wanted = upcoming.some(cost => exceedsCap(cost, cap * STOREHOUSE_AHEAD_FILL))
  }
  return wanted ? [buildingItem(state, BUILDING_STOREHOUSE, true, 'storage')] : []
}

/**
 * Priority 5 — territory: expand when few slots are free, and upgrade the headquarters tier.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @returns {Array<Object|null>} Wish items
 */
export function territoryItems(state, profile) {
  const items = []
  if (freeTerritory(state) <= profile.territoryReserve) {
    items.push(expansionItem(state))
  }
  items.push(headquartersUpgradeItem(state, profile))
  return items
}

/**
 * Priority 6 — economy: build every unlocked producer once, keep altars at the tier's target,
 * and build the market when the profile trades.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @returns {Array<Object|null>} Wish items
 */
export function growthItems(state, profile) {
  const {
    buildings,
  } = state.colony
  const items = []
  for (const key of PRODUCER_KEYS) {
    if (key === BUILDING_ACADEMY && profile.research.length === 0) {
      continue
    }
    if (plannedLevel(buildings[key]) === 0) {
      items.push(buildingItem(state, key, true, 'unlock'))
    }
  }
  const hqTier = HQ_TYPES.indexOf(buildings.headquarters.type)
  if (plannedLevel(buildings.altar) < Math.min(ALTAR_LEVELS_MAX, (hqTier + 1) * profile.altarsPerTier)) {
    items.push(buildingItem(state, BUILDING_ALTAR, false, 'faith'))
  }
  if (profile.usesMarket && plannedLevel(buildings.market) === 0) {
    items.push(buildingItem(state, BUILDING_MARKET, false, 'market'))
  }
  return items
}

/**
 * Priority 7 — research: the next tier of the profile's chains. With one research at a time the
 * chains are tried in list order; with several, the quickest available tiers first. Only chains
 * shown in the research window count (it hides the Disasters category).
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @returns {Object[]} Wish items
 */
export function researchItems(state, profile) {
  const {
    academy,
  } = state.colony.buildings
  if (academy.level < 1 || academy.active.size >= profile.maxActiveResearch) {
    return []
  }
  const chains = RESEARCH_MODAL_TREE.flatMap(entry => entry.subcategories)
  const available = []
  for (const subcategory of profile.research) {
    const chain = chains.find(entry => entry.key === subcategory)
    const key = chain?.researches.find(research => !academy.isCompleted(research))
    if (key && academy.canResearch(key, RESEARCH_PREREQUISITES)) {
      available.push(key)
    }
  }
  if (profile.maxActiveResearch > 1) {
    available.sort((first, second) => RESEARCH_COSTS[first].toSeconds - RESEARCH_COSTS[second].toSeconds)
  }
  return available.map(key => ({
    label: 'research:' + key,
    cost: RESEARCH_COSTS[key],
    save: false,
    run: () => {
      state.startResearch(key)
      return academy.isActive(key)
    },
  }))
}

/**
 * Market trades for the profiles that use it: buys one lot of each resource the bot is missing with
 * spare gold (never paying into the gold it must keep), and sells one lot of each resource sitting at
 * the cap that it does not need.
 * @param {State} state - Game state
 * @param {Object} profile - Bot profile
 * @param {Object<string, number>} shortfall - Missing amount by resource
 * @param {Object<string, number>} reserve - Amounts that must stay in stock
 */
export function tradeAtMarket(state, profile, shortfall, reserve) {
  const {
    resources, buildings,
  } = state.colony
  if (!profile.usesMarket || buildings.market.level < 1) {
    return
  }
  const cap = storageCapOf(state)
  const market = buildings.market
  for (const resource of TRADEABLE_RESOURCES) {
    const price = marketTradeQuote(market[resource], TRADE_BUY, 1, market.effectiveTradeFee).gold
    if ((shortfall[resource] ?? 0) > 0 && resources[RESOURCE_GOLD] - price >= (reserve[RESOURCE_GOLD] ?? 0) + (shortfall[RESOURCE_GOLD] ?? 0)) {
      state.executeTrade(resource, TRADE_BUY, MARKET_TRADE_AMOUNT)
    } else if ((shortfall[resource] ?? 0) <= 0 && resources[resource] >= cap * MARKET_SELL_FILL
      && resources[resource] - MARKET_TRADE_AMOUNT >= (reserve[resource] ?? 0)) {
      state.executeTrade(resource, TRADE_SELL, MARKET_TRADE_AMOUNT)
    }
  }
}
