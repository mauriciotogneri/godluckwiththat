import challengesData from '@/data/challenges.json'
import {IMG_BUILDING_ACADEMY, IMG_BUILDING_ALTAR, IMG_BUILDING_ARCHERY, IMG_BUILDING_BARRACKS, IMG_BUILDING_COPPER_MINE, IMG_BUILDING_FARM, IMG_BUILDING_GOLD_MINE, IMG_BUILDING_HEADQUARTERS_CAMP, IMG_BUILDING_HEADQUARTERS_CITY, IMG_BUILDING_HEADQUARTERS_SETTLEMENT, IMG_BUILDING_HEADQUARTERS_TOWN, IMG_BUILDING_HEADQUARTERS_VILLAGE, IMG_BUILDING_HOUSE, IMG_BUILDING_IRON_MINE, IMG_BUILDING_MARKET, IMG_BUILDING_MONUMENT, IMG_BUILDING_QUARRY, IMG_BUILDING_TEMPLE, IMG_BUILDING_STABLE, IMG_BUILDING_STOREHOUSE, IMG_BUILDING_TOWER, IMG_BUILDING_WALL, IMG_BUILDING_WOODCUTTER, IMG_RESOURCE_COPPER, IMG_RESOURCE_FOOD, IMG_RESOURCE_GOLD, IMG_RESOURCE_IRON, IMG_RESOURCE_STONE, IMG_RESOURCE_WOOD, MUS_MUSIC_1, MUS_MUSIC_2, MUS_MUSIC_3, MUS_MUSIC_4, SND_BUILDING_CREATED, SND_BUTTON_TAP, SND_HEADQUARTERS_UPGRADED, SND_MARKET_EXCHANGE, SND_NOTIFICATION_ALERT, SND_NOTIFICATION_BLESSING, SND_NOTIFICATION_DISASTER, SND_NOTIFICATION_SEASON, SND_OPEN_ACADEMY, SND_OPEN_MARKET, SND_RESEARCH_COMPLETED, SND_TERRITORY_EXPANDED, SND_UNDER_ATTACK, SND_WORKER_ACADEMY, SND_WORKER_CREATED, SND_WORKER_FARM, SND_WORKER_MINE, SND_WORKER_TEMPLE, SND_WORKER_WOODCUTTER} from '@/js/engine/assets.js'
import {BUILDING_ACADEMY, BUILDING_ALTAR, BUILDING_ARCHERY, BUILDING_BARRACKS, BUILDING_COPPER_MINE, BUILDING_FARM, BUILDING_GOLD_MINE, BUILDING_HEADQUARTERS, BUILDING_HOUSE, BUILDING_IRON_MINE, BUILDING_MARKET, BUILDING_MONUMENT, BUILDING_QUARRY, BUILDING_TEMPLE, BUILDING_STABLE, BUILDING_STOREHOUSE, BUILDING_TOWER, BUILDING_WALL, BUILDING_WOODCUTTER, CHALLENGE_MOOD_DEMANDING, CHALLENGE_MOOD_LENIENT, CHALLENGE_MOOD_MERCIFUL, CHALLENGE_MOOD_STERN, CHALLENGE_MOOD_WATCHFUL, HQ_TYPE_CAMP, HQ_TYPE_CITY, HQ_TYPE_SETTLEMENT, HQ_TYPE_TOWN, HQ_TYPE_VILLAGE, TUTORIAL_MODAL_SEASON_CHANGED, TUTORIAL_MODAL_NEGATIVE_PRODUCTION, TUTORIAL_MODAL_HQ_UPGRADE, TUTORIAL_MODAL_CHALLENGE_STARTED, TUTORIAL_MODAL_RAID_INCOMING, RESEARCH_ATTACK_1, RESEARCH_ATTACK_2, RESEARCH_ATTACK_3, RESEARCH_ATTACK_4, RESEARCH_ATTACK_5, RESEARCH_CATEGORY_MILITARY, RESEARCH_CATEGORY_COLONY, RESEARCH_CATEGORY_DISASTERS, RESEARCH_CATEGORY_RELIGION, RESEARCH_CATEGORY_RESOURCES, RESEARCH_CONSTRUCTION_1, RESEARCH_CONSTRUCTION_2, RESEARCH_CONSTRUCTION_3, RESEARCH_CONSTRUCTION_4, RESEARCH_CONSTRUCTION_5, RESEARCH_DEFENSE_1, RESEARCH_DEFENSE_2, RESEARCH_DEFENSE_3, RESEARCH_DEFENSE_4, RESEARCH_DEFENSE_5, RESEARCH_EARTHQUAKES_1, RESEARCH_EARTHQUAKES_2, RESEARCH_EARTHQUAKES_3, RESEARCH_EARTHQUAKES_4, RESEARCH_EARTHQUAKES_5, RESEARCH_EXPANSION_1, RESEARCH_EXPANSION_2, RESEARCH_EXPANSION_3, RESEARCH_EXPANSION_4, RESEARCH_EXPANSION_5, RESEARCH_HABITATION_1, RESEARCH_HABITATION_2, RESEARCH_HABITATION_3, RESEARCH_HABITATION_4, RESEARCH_HABITATION_5, RESEARCH_FAITH_1, RESEARCH_FAITH_2, RESEARCH_FAITH_3, RESEARCH_FAITH_4, RESEARCH_FAITH_5, RESEARCH_FLOODS_1, RESEARCH_FLOODS_2, RESEARCH_FLOODS_3, RESEARCH_FLOODS_4, RESEARCH_FLOODS_5, RESEARCH_FOOD_CONSUMPTION_1, RESEARCH_FOOD_CONSUMPTION_2, RESEARCH_FOOD_CONSUMPTION_3, RESEARCH_FOOD_CONSUMPTION_4, RESEARCH_FOOD_CONSUMPTION_5, RESEARCH_FOOD_PRODUCTION_1, RESEARCH_FOOD_PRODUCTION_2, RESEARCH_FOOD_PRODUCTION_3, RESEARCH_FOOD_PRODUCTION_4, RESEARCH_FOOD_PRODUCTION_5, RESEARCH_HEALTH_1, RESEARCH_HEALTH_2, RESEARCH_HEALTH_3, RESEARCH_HEALTH_4, RESEARCH_HEALTH_5, RESEARCH_KNOWLEDGE_PRODUCTION_1, RESEARCH_KNOWLEDGE_PRODUCTION_2, RESEARCH_KNOWLEDGE_PRODUCTION_3, RESEARCH_KNOWLEDGE_PRODUCTION_4, RESEARCH_KNOWLEDGE_PRODUCTION_5, RESEARCH_MINING_1, RESEARCH_MINING_2, RESEARCH_MINING_3, RESEARCH_MINING_4, RESEARCH_MINING_5, RESEARCH_STORAGE_1, RESEARCH_STORAGE_2, RESEARCH_STORAGE_3, RESEARCH_STORAGE_4, RESEARCH_STORAGE_5, RESEARCH_SUBCATEGORY_ATTACK, RESEARCH_SUBCATEGORY_CONSTRUCTION, RESEARCH_SUBCATEGORY_DEFENSE, RESEARCH_SUBCATEGORY_EARTHQUAKES, RESEARCH_SUBCATEGORY_EXPANSION, RESEARCH_SUBCATEGORY_FAITH, RESEARCH_SUBCATEGORY_FLOODS, RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION, RESEARCH_SUBCATEGORY_FOOD_PRODUCTION, RESEARCH_SUBCATEGORY_HABITATION, RESEARCH_SUBCATEGORY_HEALTH, RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION, RESEARCH_SUBCATEGORY_MINING, RESEARCH_SUBCATEGORY_STORAGE, RESEARCH_SUBCATEGORY_TRANSPORTATION, RESEARCH_SUBCATEGORY_WARNING, RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION, RESEARCH_SUBCATEGORY_WOOD_PRODUCTION, RESEARCH_TRANSPORTATION_1, RESEARCH_TRANSPORTATION_2, RESEARCH_TRANSPORTATION_3, RESEARCH_TRANSPORTATION_4, RESEARCH_TRANSPORTATION_5, RESEARCH_WARNING_1, RESEARCH_WARNING_2, RESEARCH_WARNING_3, RESEARCH_WARNING_4, RESEARCH_WARNING_5, RESEARCH_WOOD_CONSUMPTION_1, RESEARCH_WOOD_CONSUMPTION_2, RESEARCH_WOOD_CONSUMPTION_3, RESEARCH_WOOD_CONSUMPTION_4, RESEARCH_WOOD_CONSUMPTION_5, RESEARCH_WOOD_PRODUCTION_1, RESEARCH_WOOD_PRODUCTION_2, RESEARCH_WOOD_PRODUCTION_3, RESEARCH_WOOD_PRODUCTION_4, RESEARCH_WOOD_PRODUCTION_5, RESOURCE_COPPER, RESOURCE_FAITH, RESOURCE_FOOD, RESOURCE_GOLD, RESOURCE_IRON, RESOURCE_KNOWLEDGE, RESOURCE_STONE, RESOURCE_WOOD, SEASON_WARM, UNIT_ARCHER, UNIT_CAVALRY, UNIT_INFANTRY} from '@/js/engine/enums.js'
import {RESEARCH_SUBCATEGORY_BONUSES, RESEARCH_SUBCATEGORY_COST_MULTIPLIERS, RESEARCH_TIER_COSTS} from '@/js/engine/balancing.js'
import Academy from '@/js/models/buildings/academy.js'
import Altar from '@/js/models/buildings/altar.js'
import Archery from '@/js/models/buildings/archery.js'
import Barracks from '@/js/models/buildings/barracks.js'
import Buildings from '@/js/models/buildings.js'
import Stable from '@/js/models/buildings/stable.js'
import CopperMine from '@/js/models/buildings/copper_mine.js'
import Farm from '@/js/models/buildings/farm.js'
import GoldMine from '@/js/models/buildings/gold_mine.js'
import Headquarters from '@/js/models/buildings/headquarters.js'
import House from '@/js/models/buildings/house.js'
import IronMine from '@/js/models/buildings/iron_mine.js'
import Market from '@/js/models/buildings/market.js'
import Monument from '@/js/models/buildings/monument.js'
import Quarry from '@/js/models/buildings/quarry.js'
import Storehouse from '@/js/models/buildings/storehouse.js'
import Temple from '@/js/models/buildings/temple.js'
import Tower from '@/js/models/buildings/tower.js'
import Wall from '@/js/models/buildings/wall.js'
import Woodcutter from '@/js/models/buildings/woodcutter.js'
import Challenge from '@/js/models/challenge.js'
import Challenges from '@/js/models/challenges.js'
import Colony from '@/js/models/colony.js'
import Season from '@/js/models/season.js'
import Events from '@/js/models/events/events.js'
import Meta from '@/js/models/meta.js'
import Military from '@/js/models/military.js'
import Tutorial from '@/js/models/tutorial.js'
import Resources from '@/js/models/resources.js'

/**
 * Structural constants — class maps, arrays, config objects, and factory functions.
 * Balancing values (costs, rates, production) are in balancing.js; string enums are in enums.js.
 */

// Whether the app is running in a local development environment
export const IS_DEV = import.meta.env.DEV

// Firebase web app configuration (public by design; identifies the project, grants no access)
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDqXvxNcmyrFhrV4vb_UozS0BbBjO_Hje8',
  authDomain: 'god-luck-with-that.firebaseapp.com',
  projectId: 'god-luck-with-that',
  storageBucket: 'god-luck-with-that.firebasestorage.app',
  messagingSenderId: '676925285254',
  appId: '1:676925285254:web:d84d8307f137e148878207',
  measurementId: 'G-FP50VBQH4N',
}

// Hostnames where analytics stays disabled (local dev server and local preview builds)
export const ANALYTICS_EXCLUDED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
]

// Tick interval in milliseconds
export const TICK_INTERVAL = 1000

// Available speed multipliers and the default speed
export const GAME_SPEED_OPTIONS = [
  1,
  2,
  3,
]
export const GAME_SPEED_DEFAULT = 1

// Save format version written by this build; older saves are upgraded by migrateSave()
export const SAVE_VERSION = 2

// Autosave interval bounds (minutes)
export const AUTOSAVE_DEFAULT_INTERVAL = 5 // Default autosave frequency
export const AUTOSAVE_MIN_INTERVAL = 1 // Minimum allowed autosave frequency
export const AUTOSAVE_MAX_INTERVAL = 60 // Maximum allowed autosave frequency

// Seconds-per-minute conversion for production rate display
export const SECONDS_PER_MINUTE = 60

// Ordered resource keys shown in the game header
export const HEADER_RESOURCES = [
  RESOURCE_FOOD,
  RESOURCE_WOOD,
  RESOURCE_STONE,
  RESOURCE_COPPER,
  RESOURCE_IRON,
  RESOURCE_GOLD,
  RESOURCE_KNOWLEDGE,
  RESOURCE_FAITH,
]

// Bounded resources (subject to storage caps)
export const BOUNDED_RESOURCES = [
  RESOURCE_FOOD,
  RESOURCE_WOOD,
  RESOURCE_STONE,
  RESOURCE_COPPER,
  RESOURCE_IRON,
  RESOURCE_GOLD,
]

// Resources without a storage capacity (no progress bar, no "full in" estimate)
export const UNBOUNDED_RESOURCES = [
  RESOURCE_KNOWLEDGE,
  RESOURCE_FAITH,
]

// Resources that can be traded at the market (exchanged for gold)
export const TRADEABLE_RESOURCES = [
  RESOURCE_FOOD,
  RESOURCE_WOOD,
  RESOURCE_STONE,
  RESOURCE_COPPER,
  RESOURCE_IRON,
]

// Config for resource-limit-reached events (textKey + icon per bounded resource)
export const RESOURCE_LIMIT_EVENT_CONFIG = {
  [RESOURCE_FOOD]: {
    textKey: 'event.foodLimitReached',
    icon: IMG_RESOURCE_FOOD,
  },
  [RESOURCE_WOOD]: {
    textKey: 'event.woodLimitReached',
    icon: IMG_RESOURCE_WOOD,
  },
  [RESOURCE_STONE]: {
    textKey: 'event.stoneLimitReached',
    icon: IMG_RESOURCE_STONE,
  },
  [RESOURCE_COPPER]: {
    textKey: 'event.copperLimitReached',
    icon: IMG_RESOURCE_COPPER,
  },
  [RESOURCE_IRON]: {
    textKey: 'event.ironLimitReached',
    icon: IMG_RESOURCE_IRON,
  },
  [RESOURCE_GOLD]: {
    textKey: 'event.goldLimitReached',
    icon: IMG_RESOURCE_GOLD,
  },
}

// Config for negative-production events (textKey + icon per bounded resource)
export const RESOURCE_NEGATIVE_PRODUCTION_EVENT_CONFIG = {
  [RESOURCE_FOOD]: {
    textKey: 'event.foodNegativeProduction',
    icon: IMG_RESOURCE_FOOD,
  },
  [RESOURCE_WOOD]: {
    textKey: 'event.woodNegativeProduction',
    icon: IMG_RESOURCE_WOOD,
  },
  [RESOURCE_STONE]: {
    textKey: 'event.stoneNegativeProduction',
    icon: IMG_RESOURCE_STONE,
  },
  [RESOURCE_COPPER]: {
    textKey: 'event.copperNegativeProduction',
    icon: IMG_RESOURCE_COPPER,
  },
  [RESOURCE_IRON]: {
    textKey: 'event.ironNegativeProduction',
    icon: IMG_RESOURCE_IRON,
  },
  [RESOURCE_GOLD]: {
    textKey: 'event.goldNegativeProduction',
    icon: IMG_RESOURCE_GOLD,
  },
}

// Ordered headquarters progression (used for upgrade lookups)
export const HQ_TYPES = [
  HQ_TYPE_CAMP,
  HQ_TYPE_SETTLEMENT,
  HQ_TYPE_VILLAGE,
  HQ_TYPE_TOWN,
  HQ_TYPE_CITY,
]

// Headquarters image lookup by type
export const IMG_BUILDING_HEADQUARTERS_MAP = {
  [HQ_TYPE_CAMP]: IMG_BUILDING_HEADQUARTERS_CAMP,
  [HQ_TYPE_SETTLEMENT]: IMG_BUILDING_HEADQUARTERS_SETTLEMENT,
  [HQ_TYPE_VILLAGE]: IMG_BUILDING_HEADQUARTERS_VILLAGE,
  [HQ_TYPE_TOWN]: IMG_BUILDING_HEADQUARTERS_TOWN,
  [HQ_TYPE_CITY]: IMG_BUILDING_HEADQUARTERS_CITY,
}

// Buildings unlocked at each headquarters type (non-cumulative per tier)
export const HQ_BUILDING_UNLOCKS = {
  [HQ_TYPE_CAMP]: [
    BUILDING_HOUSE,
    BUILDING_ALTAR,
    BUILDING_FARM,
    BUILDING_WOODCUTTER,
  ],
  [HQ_TYPE_SETTLEMENT]: [
    BUILDING_STOREHOUSE,
    BUILDING_TEMPLE,
    BUILDING_QUARRY,
    BUILDING_BARRACKS,
  ],
  [HQ_TYPE_VILLAGE]: [
    BUILDING_ACADEMY,
    BUILDING_COPPER_MINE,
    BUILDING_ARCHERY,
  ],
  [HQ_TYPE_TOWN]: [
    BUILDING_MONUMENT,
    BUILDING_IRON_MINE,
    BUILDING_STABLE,
    BUILDING_WALL,
  ],
  [HQ_TYPE_CITY]: [
    BUILDING_MARKET,
    BUILDING_GOLD_MINE,
    BUILDING_TOWER,
  ],
}

// Resources unlocked at each headquarters type (non-cumulative per tier)
export const HQ_RESOURCE_UNLOCKS = {
  [HQ_TYPE_CAMP]: [
    RESOURCE_FOOD,
    RESOURCE_WOOD,
    RESOURCE_FAITH,
  ],
  [HQ_TYPE_SETTLEMENT]: [RESOURCE_STONE],
  [HQ_TYPE_VILLAGE]: [
    RESOURCE_KNOWLEDGE,
    RESOURCE_COPPER,
  ],
  [HQ_TYPE_TOWN]: [RESOURCE_IRON],
  [HQ_TYPE_CITY]: [RESOURCE_GOLD],
}

// Building class map — resolves building keys to their class constructors
export const BUILDING_CLASS_MAP = {
  [BUILDING_HEADQUARTERS]: Headquarters,
  [BUILDING_HOUSE]: House,
  [BUILDING_ACADEMY]: Academy,
  [BUILDING_STOREHOUSE]: Storehouse,
  [BUILDING_MARKET]: Market,
  [BUILDING_FARM]: Farm,
  [BUILDING_WOODCUTTER]: Woodcutter,
  [BUILDING_QUARRY]: Quarry,
  [BUILDING_COPPER_MINE]: CopperMine,
  [BUILDING_IRON_MINE]: IronMine,
  [BUILDING_GOLD_MINE]: GoldMine,
  [BUILDING_ALTAR]: Altar,
  [BUILDING_TEMPLE]: Temple,
  [BUILDING_MONUMENT]: Monument,
  [BUILDING_BARRACKS]: Barracks,
  [BUILDING_ARCHERY]: Archery,
  [BUILDING_STABLE]: Stable,
  [BUILDING_WALL]: Wall,
  [BUILDING_TOWER]: Tower,
}

// Buildings that can be downgraded (level reduced by 1) to free territory slots.
// The 8 worker-assignable producers plus market and altar.
export const DOWNGRADABLE_BUILDINGS = new Set([
  BUILDING_FARM,
  BUILDING_WOODCUTTER,
  BUILDING_QUARRY,
  BUILDING_COPPER_MINE,
  BUILDING_IRON_MINE,
  BUILDING_GOLD_MINE,
  BUILDING_ACADEMY,
  BUILDING_TEMPLE,
  BUILDING_MARKET,
  BUILDING_ALTAR,
])

// Ordered military unit types (display order in the military window)
export const UNIT_TYPES = [
  UNIT_INFANTRY,
  UNIT_ARCHER,
  UNIT_CAVALRY,
]

// Building that trains each unit type; its level caps how many units of that type the colony can have
export const UNIT_BUILDINGS = {
  [UNIT_INFANTRY]: BUILDING_BARRACKS,
  [UNIT_ARCHER]: BUILDING_ARCHERY,
  [UNIT_CAVALRY]: BUILDING_STABLE,
}

// Unit type each unit type beats (gets the counter attack bonus against)
export const UNIT_COUNTERS = {
  [UNIT_INFANTRY]: UNIT_CAVALRY,
  [UNIT_ARCHER]: UNIT_INFANTRY,
  [UNIT_CAVALRY]: UNIT_ARCHER,
}

// Building grid layout — column definitions for the game screen
export const BUILDING_GRID = [
  {
    headerKey: 'buildingGroup.colony',
    buildings: [
      {
        key: BUILDING_HEADQUARTERS,
        img: IMG_BUILDING_HEADQUARTERS_CAMP,
      },
      {
        key: BUILDING_HOUSE,
        img: IMG_BUILDING_HOUSE,
      },
      {
        key: BUILDING_STOREHOUSE,
        img: IMG_BUILDING_STOREHOUSE,
      },
      {
        key: BUILDING_ACADEMY,
        img: IMG_BUILDING_ACADEMY,
      },
      {
        key: BUILDING_MARKET,
        img: IMG_BUILDING_MARKET,
      },
    ],
  },
  {
    headerKey: 'buildingGroup.resources',
    buildings: [
      {
        key: BUILDING_FARM,
        img: IMG_BUILDING_FARM,
      },
      {
        key: BUILDING_WOODCUTTER,
        img: IMG_BUILDING_WOODCUTTER,
      },
      {
        key: BUILDING_QUARRY,
        img: IMG_BUILDING_QUARRY,
      },
      {
        key: BUILDING_COPPER_MINE,
        img: IMG_BUILDING_COPPER_MINE,
      },
      {
        key: BUILDING_IRON_MINE,
        img: IMG_BUILDING_IRON_MINE,
      },
      {
        key: BUILDING_GOLD_MINE,
        img: IMG_BUILDING_GOLD_MINE,
      },
    ],
  },
  {
    headerKey: 'buildingGroup.religion',
    buildings: [
      {
        key: BUILDING_ALTAR,
        img: IMG_BUILDING_ALTAR,
      },
      {
        key: BUILDING_TEMPLE,
        img: IMG_BUILDING_TEMPLE,
      },
      {
        key: BUILDING_MONUMENT,
        img: IMG_BUILDING_MONUMENT,
      },
    ],
  },
  {
    headerKey: 'buildingGroup.military',
    buildings: [
      {
        key: BUILDING_BARRACKS,
        img: IMG_BUILDING_BARRACKS,
      },
      {
        key: BUILDING_ARCHERY,
        img: IMG_BUILDING_ARCHERY,
      },
      {
        key: BUILDING_STABLE,
        img: IMG_BUILDING_STABLE,
      },
      {
        key: BUILDING_WALL,
        img: IMG_BUILDING_WALL,
      },
      {
        key: BUILDING_TOWER,
        img: IMG_BUILDING_TOWER,
      },
    ],
  },
]

// Building image lookup by key (for event icons)
export const BUILDING_IMAGE_MAP = Object.fromEntries(
  BUILDING_GRID.flatMap(column => column.buildings.map(building => [
    building.key,
    building.img,
  ])),
)

// Per-file audio configuration (volume 0.0–1.0)
export const AUDIO_CONFIG = {
  [SND_BUILDING_CREATED]: {
    volume: 1,
  },
  [SND_BUTTON_TAP]: {
    volume: 0.5,
  },
  [SND_HEADQUARTERS_UPGRADED]: {
    volume: 1,
  },
  [SND_TERRITORY_EXPANDED]: {
    volume: 0.8,
  },
  [SND_NOTIFICATION_ALERT]: {
    volume: 0.8,
  },
  [SND_NOTIFICATION_BLESSING]: {
    volume: 0.8,
  },
  [SND_NOTIFICATION_DISASTER]: {
    volume: 0.8,
  },
  [SND_NOTIFICATION_SEASON]: {
    volume: 0.8,
  },
  [SND_RESEARCH_COMPLETED]: {
    volume: 0.8,
  },
  [SND_UNDER_ATTACK]: {
    volume: 0.7,
  },
  [SND_WORKER_ACADEMY]: {
    volume: 0.3,
  },
  [SND_WORKER_CREATED]: {
    volume: 0.5,
  },
  [SND_WORKER_FARM]: {
    volume: 0.1,
  },
  [SND_WORKER_MINE]: {
    volume: 0.3,
  },
  [SND_WORKER_TEMPLE]: {
    volume: 0.3,
  },
  [SND_WORKER_WOODCUTTER]: {
    volume: 0.3,
  },
  [SND_MARKET_EXCHANGE]: {
    volume: 0.6,
  },
  [SND_OPEN_ACADEMY]: {
    volume: 0.6,
  },
  [SND_OPEN_MARKET]: {
    volume: 0.6,
  },
  [MUS_MUSIC_1]: {
    volume: 0.3,
  },
  [MUS_MUSIC_2]: {
    volume: 0.3,
  },
  [MUS_MUSIC_3]: {
    volume: 0.3,
  },
  [MUS_MUSIC_4]: {
    volume: 0.3,
  },
}

// Research tree — ordered categories → subcategories → linear research chains.
// Position in the researches array implies linear prerequisite (index N requires N-1).
export const RESEARCH_TREE = [
  {
    category: RESEARCH_CATEGORY_COLONY,
    subcategories: [
      {
        key: RESEARCH_SUBCATEGORY_TRANSPORTATION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_TRANSPORTATION],
        researches: [
          RESEARCH_TRANSPORTATION_1,
          RESEARCH_TRANSPORTATION_2,
          RESEARCH_TRANSPORTATION_3,
          RESEARCH_TRANSPORTATION_4,
          RESEARCH_TRANSPORTATION_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_CONSTRUCTION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_CONSTRUCTION],
        researches: [
          RESEARCH_CONSTRUCTION_1,
          RESEARCH_CONSTRUCTION_2,
          RESEARCH_CONSTRUCTION_3,
          RESEARCH_CONSTRUCTION_4,
          RESEARCH_CONSTRUCTION_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_EXPANSION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_EXPANSION],
        researches: [
          RESEARCH_EXPANSION_1,
          RESEARCH_EXPANSION_2,
          RESEARCH_EXPANSION_3,
          RESEARCH_EXPANSION_4,
          RESEARCH_EXPANSION_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_STORAGE,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_STORAGE],
        researches: [
          RESEARCH_STORAGE_1,
          RESEARCH_STORAGE_2,
          RESEARCH_STORAGE_3,
          RESEARCH_STORAGE_4,
          RESEARCH_STORAGE_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_HABITATION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_HABITATION],
        researches: [
          RESEARCH_HABITATION_1,
          RESEARCH_HABITATION_2,
          RESEARCH_HABITATION_3,
          RESEARCH_HABITATION_4,
          RESEARCH_HABITATION_5,
        ],
      },
    ],
  },
  {
    category: RESEARCH_CATEGORY_RESOURCES,
    subcategories: [
      {
        key: RESEARCH_SUBCATEGORY_FOOD_PRODUCTION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_FOOD_PRODUCTION],
        researches: [
          RESEARCH_FOOD_PRODUCTION_1,
          RESEARCH_FOOD_PRODUCTION_2,
          RESEARCH_FOOD_PRODUCTION_3,
          RESEARCH_FOOD_PRODUCTION_4,
          RESEARCH_FOOD_PRODUCTION_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION],
        researches: [
          RESEARCH_FOOD_CONSUMPTION_1,
          RESEARCH_FOOD_CONSUMPTION_2,
          RESEARCH_FOOD_CONSUMPTION_3,
          RESEARCH_FOOD_CONSUMPTION_4,
          RESEARCH_FOOD_CONSUMPTION_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_WOOD_PRODUCTION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_WOOD_PRODUCTION],
        researches: [
          RESEARCH_WOOD_PRODUCTION_1,
          RESEARCH_WOOD_PRODUCTION_2,
          RESEARCH_WOOD_PRODUCTION_3,
          RESEARCH_WOOD_PRODUCTION_4,
          RESEARCH_WOOD_PRODUCTION_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION],
        researches: [
          RESEARCH_WOOD_CONSUMPTION_1,
          RESEARCH_WOOD_CONSUMPTION_2,
          RESEARCH_WOOD_CONSUMPTION_3,
          RESEARCH_WOOD_CONSUMPTION_4,
          RESEARCH_WOOD_CONSUMPTION_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_MINING,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_MINING],
        researches: [
          RESEARCH_MINING_1,
          RESEARCH_MINING_2,
          RESEARCH_MINING_3,
          RESEARCH_MINING_4,
          RESEARCH_MINING_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION],
        researches: [
          RESEARCH_KNOWLEDGE_PRODUCTION_1,
          RESEARCH_KNOWLEDGE_PRODUCTION_2,
          RESEARCH_KNOWLEDGE_PRODUCTION_3,
          RESEARCH_KNOWLEDGE_PRODUCTION_4,
          RESEARCH_KNOWLEDGE_PRODUCTION_5,
        ],
      },
    ],
  },
  {
    category: RESEARCH_CATEGORY_RELIGION,
    subcategories: [
      {
        key: RESEARCH_SUBCATEGORY_FAITH,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_FAITH],
        researches: [
          RESEARCH_FAITH_1,
          RESEARCH_FAITH_2,
          RESEARCH_FAITH_3,
          RESEARCH_FAITH_4,
          RESEARCH_FAITH_5,
        ],
      },
    ],
  },
  {
    category: RESEARCH_CATEGORY_MILITARY,
    subcategories: [
      {
        key: RESEARCH_SUBCATEGORY_DEFENSE,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_DEFENSE],
        researches: [
          RESEARCH_DEFENSE_1,
          RESEARCH_DEFENSE_2,
          RESEARCH_DEFENSE_3,
          RESEARCH_DEFENSE_4,
          RESEARCH_DEFENSE_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_ATTACK,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_ATTACK],
        researches: [
          RESEARCH_ATTACK_1,
          RESEARCH_ATTACK_2,
          RESEARCH_ATTACK_3,
          RESEARCH_ATTACK_4,
          RESEARCH_ATTACK_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_WARNING,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_WARNING],
        researches: [
          RESEARCH_WARNING_1,
          RESEARCH_WARNING_2,
          RESEARCH_WARNING_3,
          RESEARCH_WARNING_4,
          RESEARCH_WARNING_5,
        ],
      },
    ],
  },
  {
    category: RESEARCH_CATEGORY_DISASTERS,
    subcategories: [
      {
        key: RESEARCH_SUBCATEGORY_FLOODS,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_FLOODS],
        researches: [
          RESEARCH_FLOODS_1,
          RESEARCH_FLOODS_2,
          RESEARCH_FLOODS_3,
          RESEARCH_FLOODS_4,
          RESEARCH_FLOODS_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_HEALTH,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_HEALTH],
        researches: [
          RESEARCH_HEALTH_1,
          RESEARCH_HEALTH_2,
          RESEARCH_HEALTH_3,
          RESEARCH_HEALTH_4,
          RESEARCH_HEALTH_5,
        ],
      },
      {
        key: RESEARCH_SUBCATEGORY_EARTHQUAKES,
        bonus: RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_EARTHQUAKES],
        researches: [
          RESEARCH_EARTHQUAKES_1,
          RESEARCH_EARTHQUAKES_2,
          RESEARCH_EARTHQUAKES_3,
          RESEARCH_EARTHQUAKES_4,
          RESEARCH_EARTHQUAKES_5,
        ],
      },
    ],
  },
]

// Research costs keyed by RESEARCH_* key: the tier's base cost scaled by the chain's price band.
// Resources paid upfront (duration derived via cost.toSeconds × RESEARCH_TIME_MULTIPLIER)
export const RESEARCH_COSTS = Object.fromEntries(
  RESEARCH_TREE.flatMap(entry => entry.subcategories.flatMap(subcategory => subcategory.researches.map((key, index) => [
    key,
    RESEARCH_TIER_COSTS[index].multiplyFloor(RESEARCH_SUBCATEGORY_COST_MULTIPLIERS[subcategory.key]),
  ]))),
)

// Research categories shown as tabs in the research modal; disasters stays hidden until disasters are implemented.
export const RESEARCH_MODAL_TREE = RESEARCH_TREE.filter(entry => entry.category !== RESEARCH_CATEGORY_DISASTERS)

// Research prerequisites — research key → key of the previous tier in its chain (tier 1 keys have no entry).
// Derived from RESEARCH_TREE order, which stays the single definition of each chain.
export const RESEARCH_PREREQUISITES = Object.fromEntries(
  RESEARCH_TREE.flatMap(entry => entry.subcategories.flatMap(subcategory => subcategory.researches.slice(1).map((key, index) => [
    key,
    subcategory.researches[index],
  ]))),
)

// Tutorial sequential steps — each has i18n text key, building icon key, and completion check
export const TUTORIAL_STEPS = [
  {
    textKey: 'tutorial.step.buildHouse',
    hintKey: 'tutorial.step.buildHouse.hint',
    building: BUILDING_HOUSE,
    check: buildings => buildings.house.level >= 1,
  },
  {
    textKey: 'tutorial.step.buildFarm',
    hintKey: 'tutorial.step.buildFarm.hint',
    building: BUILDING_FARM,
    check: buildings => buildings.farm.level >= 1,
  },
  {
    textKey: 'tutorial.step.buildWoodcutter',
    hintKey: 'tutorial.step.buildWoodcutter.hint',
    building: BUILDING_WOODCUTTER,
    check: buildings => buildings.woodcutter.level >= 1,
  },
  {
    textKey: 'tutorial.step.assignFarmWorkers',
    hintKey: 'tutorial.step.assignFarmWorkers.hint',
    building: BUILDING_FARM,
    check: buildings => buildings.farm.workers >= 3,
  },
  {
    textKey: 'tutorial.step.assignWoodcutterWorker',
    hintKey: 'tutorial.step.assignWoodcutterWorker.hint',
    building: BUILDING_WOODCUTTER,
    check: buildings => buildings.woodcutter.workers >= 1,
  },
  {
    textKey: 'tutorial.step.fillUpFarmAndWoodcutter',
    hintKey: 'tutorial.step.fillUpFarmAndWoodcutter.hint',
    building: BUILDING_FARM,
    check: buildings => buildings.farm.workers >= 5 && buildings.woodcutter.workers >= 5,
  },
  {
    textKey: 'tutorial.step.upgradeHouse2',
    hintKey: 'tutorial.step.upgradeHouse2.hint',
    building: BUILDING_HOUSE,
    check: buildings => buildings.house.level >= 2,
  },
  {
    textKey: 'tutorial.step.upgradeFarm2',
    hintKey: 'tutorial.step.upgradeFarm2.hint',
    building: BUILDING_FARM,
    check: buildings => buildings.farm.level >= 2,
  },
  {
    textKey: 'tutorial.step.upgradeWoodcutter2',
    hintKey: 'tutorial.step.upgradeWoodcutter2.hint',
    building: BUILDING_WOODCUTTER,
    check: buildings => buildings.woodcutter.level >= 2,
  },
  {
    textKey: 'tutorial.step.upgradeHouse3',
    hintKey: 'tutorial.step.upgradeHouse3.hint',
    building: BUILDING_HOUSE,
    check: buildings => buildings.house.level >= 3,
  },
  {
    textKey: 'tutorial.step.upgradeFarm3',
    hintKey: 'tutorial.step.upgradeFarm3.hint',
    building: BUILDING_FARM,
    check: buildings => buildings.farm.level >= 3,
  },
  {
    textKey: 'tutorial.step.upgradeWoodcutter3',
    hintKey: 'tutorial.step.upgradeWoodcutter3.hint',
    building: BUILDING_WOODCUTTER,
    check: buildings => buildings.woodcutter.level >= 3,
  },
  {
    textKey: 'tutorial.step.buildAltar',
    hintKey: 'tutorial.step.buildAltar.hint',
    building: BUILDING_ALTAR,
    check: buildings => buildings.altar.level >= 1,
  },
  {
    textKey: 'tutorial.step.expandTerritory',
    hintKey: 'tutorial.step.expandTerritory.hint',
    building: BUILDING_HEADQUARTERS,
    check: buildings => buildings.headquarters.level >= 2,
  },
  {
    textKey: 'tutorial.step.upgradeCamp',
    hintKey: 'tutorial.step.upgradeCamp.hint',
    building: BUILDING_HEADQUARTERS,
    check: buildings => buildings.headquarters.type !== HQ_TYPE_CAMP,
  },
]

// Tutorial reactive modals — triggered by state transitions, each fires once
export const TUTORIAL_MODALS = {
  [TUTORIAL_MODAL_SEASON_CHANGED]: {
    titleKey: 'tutorial.modal.seasonChanged.title',
    bodyKey: 'tutorial.modal.seasonChanged.body',
  },
  [TUTORIAL_MODAL_NEGATIVE_PRODUCTION]: {
    titleKey: 'tutorial.modal.negativeProduction.title',
    bodyKey: 'tutorial.modal.negativeProduction.body',
  },
  [TUTORIAL_MODAL_HQ_UPGRADE]: {
    titleKey: 'tutorial.modal.campUpgrade.title',
    bodyKey: 'tutorial.modal.campUpgrade.body',
  },
  [TUTORIAL_MODAL_CHALLENGE_STARTED]: {
    titleKey: 'tutorial.modal.challengeStarted.title',
    bodyKey: 'tutorial.modal.challengeStarted.body',
  },
  [TUTORIAL_MODAL_RAID_INCOMING]: {
    titleKey: 'tutorial.modal.raidIncoming.title',
    bodyKey: 'tutorial.modal.raidIncoming.body',
  },
}

/**
 * Freezes an object and every object or array nested in it.
 * @param {Object} value - Object to freeze
 * @returns {Object} The same object, frozen
 */
function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested !== null && typeof nested === 'object') {
      deepFreeze(nested)
    }
  }
  return Object.freeze(value)
}

// Challenge moods from mildest to most demanding (CHALLENGE_MOOD_THRESHOLDS in balancing.js picks one)
export const CHALLENGE_MOODS = [
  CHALLENGE_MOOD_MERCIFUL,
  CHALLENGE_MOOD_LENIENT,
  CHALLENGE_MOOD_WATCHFUL,
  CHALLENGE_MOOD_STERN,
  CHALLENGE_MOOD_DEMANDING,
]

// Base challenge values from challenges.json, absent optional fields set to null.
// Deep-frozen and copied into each game by Challenge.fromDefinition(), so no game can change them.
export const CHALLENGE_DEFINITIONS = deepFreeze(challengesData.map(challenge => ({
  index: challenge.index,
  delay: challenge.delay,
  timeout: challenge.timeout,
  requirements: {
    faith: challenge.requirements.faith ?? null,
    altar: challenge.requirements.altar ?? null,
    temple: challenge.requirements.temple ?? null,
    monument: challenge.requirements.monument ?? null,
    resources: challenge.requirements.resources ? {
      ...challenge.requirements.resources,
    } : null,
    workers: challenge.requirements.workers ?? null,
  },
  blessings: challenge.blessings.map(blessing => ({
    type: blessing.type,
    timeout: blessing.timeout ?? null,
    productivity: blessing.productivity ?? null,
    resources: blessing.resources ? {
      ...blessing.resources,
    } : null,
    territory: blessing.territory ?? null,
    construction: blessing.construction ?? null,
    warm: blessing.warm ?? null,
    cold: blessing.cold ?? null,
  })),
  punishment: {
    type: challenge.punishment.type,
    timeout: challenge.punishment.timeout ?? null,
    faith: challenge.punishment.faith ?? null,
    productivityFarm: challenge.punishment.productivityFarm ?? null,
    productivityWoodcutter: challenge.punishment.productivityWoodcutter ?? null,
    productivityMines: challenge.punishment.productivityMines ?? null,
    productivityGeneral: challenge.punishment.productivityGeneral ?? null,
    resources: challenge.punishment.resources ?? null,
    workers: challenge.punishment.workers ?? null,
    levels: challenge.punishment.levels ?? null,
  },
})))

/**
 * Creates a Challenges instance from the challenge definitions.
 * All challenges start as pending; the first is activated when the game begins.
 * @returns {Challenges} Initialized challenges container
 */
export function createInitialChallenges() {
  return new Challenges({
    pending: CHALLENGE_DEFINITIONS.map(definition => Challenge.fromDefinition(definition)),
    active: null,
    completed: [],
    activeBlessings: [],
    activePunishments: [],
  })
}

/**
 * Creates a fresh Meta instance for a new game session.
 * @returns {Meta} Initialized meta with current timestamps
 */
export function createInitialMeta() {
  return new Meta({
    version: SAVE_VERSION,
    createdDateTime: new Date().toISOString(),
    updatedDateTime: new Date().toISOString(),
    challenges: createInitialChallenges(),
    gameSpeed: GAME_SPEED_DEFAULT,
    tutorial: new Tutorial(),
  })
}

/**
 * Creates the colony used for a new game session.
 * Returns an advanced colony.
 * @returns {Colony} Fully initialized colony
 */
export function createInitialColony() {
  return createInitialColonyAdvanced()
}

/**
 * Creates a fresh Colony instance for a new game session.
 * @returns {Colony} Fully initialized colony with default values
 */
export function createInitialColonyBasic() {
  return new Colony({
    year: 1,
    season: new Season({
      currentSeason: SEASON_WARM,
      seasonElapsed: 0,
    }),

    resources: new Resources({
      territory: 0,
      workers: 0,
      food: 250,
      wood: 100,
      stone: 0,
      copper: 0,
      iron: 0,
      gold: 0,
      faith: 0,
      knowledge: 0,
    }),

    events: new Events(),

    military: new Military(),

    buildings: new Buildings({
      [BUILDING_HEADQUARTERS]: new Headquarters({
        type: HQ_TYPE_CAMP,
        level: 1,
      }),
      [BUILDING_HOUSE]: new House({
        level: 0,
      }),
      [BUILDING_ACADEMY]: new Academy({
        level: 0,
      }),
      [BUILDING_STOREHOUSE]: new Storehouse({
        level: 0,
      }),
      [BUILDING_MARKET]: new Market({
        level: 0,
      }),
      [BUILDING_ALTAR]: new Altar({
        level: 0,
      }),
      [BUILDING_TEMPLE]: new Temple({
        level: 0,
      }),
      [BUILDING_MONUMENT]: new Monument({
        level: 0,
      }),
      [BUILDING_FARM]: new Farm({
        level: 0,
      }),
      [BUILDING_WOODCUTTER]: new Woodcutter({
        level: 0,
      }),
      [BUILDING_QUARRY]: new Quarry({
        level: 0,
      }),
      [BUILDING_COPPER_MINE]: new CopperMine({
        level: 0,
      }),
      [BUILDING_IRON_MINE]: new IronMine({
        level: 0,
      }),
      [BUILDING_GOLD_MINE]: new GoldMine({
        level: 0,
      }),
      [BUILDING_BARRACKS]: new Barracks({
        level: 0,
      }),
      [BUILDING_ARCHERY]: new Archery({
        level: 0,
      }),
      [BUILDING_STABLE]: new Stable({
        level: 0,
      }),
      [BUILDING_WALL]: new Wall({
        level: 0,
      }),
      [BUILDING_TOWER]: new Tower({
        level: 0,
      }),
    }),
  })
}

/**
 * Creates a pre-built Colony for development/testing with advanced starting resources and buildings.
 * @returns {Colony} Colony with elevated starting values (city-level HQ, 60 workers, etc.)
 */
export function createInitialColonyAdvanced() {
  return new Colony({
    year: 1,
    season: new Season({
      currentSeason: SEASON_WARM,
      seasonElapsed: 0,
    }),

    resources: new Resources({
      territory: 0,
      workers: 60,
      food: 1000,
      wood: 1000,
      stone: 1000,
      copper: 1000,
      iron: 1000,
      gold: 1000,
      faith: 0,
      knowledge: 1500,
    }),

    events: new Events(),

    military: new Military(),

    buildings: new Buildings({
      [BUILDING_HEADQUARTERS]: new Headquarters({
        type: HQ_TYPE_CITY,
        level: 5,
      }),
      [BUILDING_HOUSE]: new House({
        level: 7,
      }),
      [BUILDING_ACADEMY]: new Academy({
        level: 1,
      }),
      [BUILDING_STOREHOUSE]: new Storehouse({
        level: 5,
      }),
      [BUILDING_MARKET]: new Market({
        level: 1,
      }),
      [BUILDING_ALTAR]: new Altar({
        level: 1,
      }),
      [BUILDING_TEMPLE]: new Temple({
        level: 0,
      }),
      [BUILDING_MONUMENT]: new Monument({
        level: 0,
      }),
      [BUILDING_FARM]: new Farm({
        level: 3,
        workers: 10,
      }),
      [BUILDING_WOODCUTTER]: new Woodcutter({
        level: 3,
        workers: 10,
      }),
      [BUILDING_QUARRY]: new Quarry({
        level: 2,
        workers: 10,
      }),
      [BUILDING_COPPER_MINE]: new CopperMine({
        level: 2,
        workers: 10,
      }),
      [BUILDING_IRON_MINE]: new IronMine({
        level: 2,
        workers: 10,
      }),
      [BUILDING_GOLD_MINE]: new GoldMine({
        level: 2,
        workers: 10,
      }),
      [BUILDING_BARRACKS]: new Barracks({
        level: 0,
      }),
      [BUILDING_ARCHERY]: new Archery({
        level: 0,
      }),
      [BUILDING_STABLE]: new Stable({
        level: 0,
      }),
      [BUILDING_WALL]: new Wall({
        level: 0,
      }),
      [BUILDING_TOWER]: new Tower({
        level: 0,
      }),
    }),
  })
}

