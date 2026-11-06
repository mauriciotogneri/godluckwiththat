// Bot profiles for the balance simulation: three player skill levels driving the same heuristic Bot.
// None of the profiles looks at upcoming challenge requirements; each only reacts to a running countdown.

import {RESEARCH_SUBCATEGORY_ATTACK, RESEARCH_SUBCATEGORY_CONSTRUCTION, RESEARCH_SUBCATEGORY_DEFENSE, RESEARCH_SUBCATEGORY_EXPANSION, RESEARCH_SUBCATEGORY_FAITH, RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION, RESEARCH_SUBCATEGORY_FOOD_PRODUCTION, RESEARCH_SUBCATEGORY_HABITATION, RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION, RESEARCH_SUBCATEGORY_MINING, RESEARCH_SUBCATEGORY_STORAGE, RESEARCH_SUBCATEGORY_TRANSPORTATION, RESEARCH_SUBCATEGORY_WARNING, RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION, RESEARCH_SUBCATEGORY_WOOD_PRODUCTION} from '@/js/engine/enums.js'

// Worker split: fixed 60/40 food/wood, balanced by need, or by marginal value (bottleneck first)
export const WORKER_SPLIT_FIXED = 'fixed'
export const WORKER_SPLIT_BALANCED = 'balanced'
export const WORKER_SPLIT_MARGINAL = 'marginal'

// Army policy: none, sized to win the expected raid, or sized above it with counter units
export const ARMY_NONE = 'none'
export const ARMY_FORECAST = 'forecast'
export const ARMY_COUNTER = 'counter'

// Challenge hold: keep a faith or resource amount once it is met, or also while the income can still reach it in time
export const HOLD_MET = 'met'
export const HOLD_REACHABLE = 'reachable'

// Blessing choice: always the first option, the productivity blessing for the weakest resource, or the highest estimated value
export const BLESSING_CHOICE_FIRST = 'first'
export const BLESSING_CHOICE_WEAKEST_RESOURCE = 'weakestResource'
export const BLESSING_CHOICE_ESTIMATED_VALUE = 'estimatedValue'

// A casual player: slow, distracted, never researches or trains an army
export const WEAK_BOT = {
  name: 'weak',
  decisionInterval: 20, // Game seconds between decisions
  reactionDelay: 90, // Seconds after a countdown starts before the bot works on it
  skipChance: 0.2, // Chance that a decision is skipped
  challengeHold: HOLD_MET, // Which challenge amounts it keeps instead of spending them
  workerSplit: WORKER_SPLIT_FIXED, // How spare workers are split between producers
  foodWoodMargin: 0, // Food and wood production kept above upkeep (0.1 = +10%)
  storehouseFill: 1, // Share of the storage cap a needed resource reaches before a storehouse level
  storehouseAhead: false, // Also adds storehouse levels before the planned costs outgrow the cap
  hqUpgradeStockFactor: 2, // HQ tier upgrades wait for this multiple of the cost in stock (or full storage)
  territoryReserve: 1, // Expands the territory when this few slots are free
  houseLead: 0, // Adds a house level when this few beds are left
  altarsPerTier: 3, // Altar levels wanted per HQ tier reached
  faithShare: 0, // Share of the spare workers sent to the temple
  knowledgeShare: 0, // Share of the spare workers sent to the academy
  research: [], // Research chains, in order of preference
  maxActiveResearch: 0, // Researches run at the same time
  army: ARMY_NONE, // Army policy
  armyRatio: 0, // Forecast strength ratio the army is sized for
  cheapTributeShare: 0.25, // Calls a raid off only when that costs at most this share of each resource in stock
  usesMarket: false, // Trades at the market
  blessingChoice: BLESSING_CHOICE_FIRST, // Blessing choice policy
  spendsPerDecision: 1, // Constructions, upgrades and researches started per decision
}

// A regular player: reacts quickly, keeps a food/wood margin, researches a fixed list
export const AVERAGE_BOT = {
  name: 'average',
  decisionInterval: 5,
  reactionDelay: 15,
  skipChance: 0,
  challengeHold: HOLD_REACHABLE,
  workerSplit: WORKER_SPLIT_BALANCED,
  foodWoodMargin: 0.1,
  storehouseFill: 0.8,
  storehouseAhead: false,
  hqUpgradeStockFactor: 1,
  territoryReserve: 2,
  houseLead: 2,
  altarsPerTier: 5,
  faithShare: 0.15,
  knowledgeShare: 0.1,
  research: [
    RESEARCH_SUBCATEGORY_CONSTRUCTION,
    RESEARCH_SUBCATEGORY_FOOD_PRODUCTION,
    RESEARCH_SUBCATEGORY_STORAGE,
    RESEARCH_SUBCATEGORY_HABITATION,
    RESEARCH_SUBCATEGORY_FAITH,
    RESEARCH_SUBCATEGORY_MINING,
  ],
  maxActiveResearch: 1,
  army: ARMY_FORECAST,
  armyRatio: 1.05,
  cheapTributeShare: 0,
  usesMarket: false,
  blessingChoice: BLESSING_CHOICE_WEAKEST_RESOURCE,
  spendsPerDecision: 2,
}

// An expert player: reacts at once, plans storage ahead, researches every useful chain
export const STRONG_BOT = {
  name: 'strong',
  decisionInterval: 2,
  reactionDelay: 0,
  skipChance: 0,
  challengeHold: HOLD_REACHABLE,
  workerSplit: WORKER_SPLIT_MARGINAL,
  foodWoodMargin: 0.05,
  storehouseFill: 0.6,
  storehouseAhead: true,
  hqUpgradeStockFactor: 1,
  territoryReserve: 3,
  houseLead: 5,
  altarsPerTier: 6,
  faithShare: 0.15,
  knowledgeShare: 0.15,
  research: [
    RESEARCH_SUBCATEGORY_CONSTRUCTION,
    RESEARCH_SUBCATEGORY_TRANSPORTATION,
    RESEARCH_SUBCATEGORY_FOOD_PRODUCTION,
    RESEARCH_SUBCATEGORY_WOOD_PRODUCTION,
    RESEARCH_SUBCATEGORY_STORAGE,
    RESEARCH_SUBCATEGORY_HABITATION,
    RESEARCH_SUBCATEGORY_FAITH,
    RESEARCH_SUBCATEGORY_MINING,
    RESEARCH_SUBCATEGORY_EXPANSION,
    RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION,
    RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION,
    RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION,
    RESEARCH_SUBCATEGORY_DEFENSE,
    RESEARCH_SUBCATEGORY_ATTACK,
    RESEARCH_SUBCATEGORY_WARNING,
  ],
  maxActiveResearch: 2,
  army: ARMY_COUNTER,
  armyRatio: 1.3,
  cheapTributeShare: 0,
  usesMarket: true,
  blessingChoice: BLESSING_CHOICE_ESTIMATED_VALUE,
  spendsPerDecision: 3,
}

// Every profile, in the order the report lists them
export const BOT_PROFILES = [
  WEAK_BOT,
  AVERAGE_BOT,
  STRONG_BOT,
]
