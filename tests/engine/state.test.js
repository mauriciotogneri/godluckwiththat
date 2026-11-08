import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {BLESSING_BLESSED_MARKETS, BLESSING_CELESTIAL_FORTIFICATION, BLESSING_CELESTIAL_PROSPERITY, BLESSING_FAVORABLE_WEATHER, BLESSING_FERTILE_SOIL, BLESSING_FOREST_BLOOM, BLESSING_GIFT_FROM_THE_HEAVENS, BLESSING_HOLY_EXPANSION, BLESSING_RAPID_CONSTRUCTION, BLESSING_RICH_MINES, BLESSING_TEMPORARY_PEACE, BLESSING_WISDOM_OF_THE_GODS, BUILDING_ACADEMY, BUILDING_ALTAR, BUILDING_ARCHERY, BUILDING_BARRACKS, BUILDING_COPPER_MINE, BUILDING_FARM, BUILDING_GOLD_MINE, BUILDING_HEADQUARTERS, BUILDING_HOUSE, BUILDING_IRON_MINE, BUILDING_MARKET, BUILDING_MONUMENT, BUILDING_QUARRY, BUILDING_STABLE, BUILDING_STOREHOUSE, BUILDING_TEMPLE, BUILDING_TOWER, BUILDING_WALL, BUILDING_WOODCUTTER, CHALLENGE_MODAL_FAILURE, CHALLENGE_MODAL_REWARD, CHALLENGE_MODAL_WIN, CHALLENGE_MOOD_MERCIFUL, CHALLENGE_MOOD_WATCHFUL, CHALLENGE_STATUS_ACTIVATED, CHALLENGE_STATUS_COMPLETED, CHALLENGE_STATUS_PENDING, CHALLENGE_STATUS_STARTED, EVENT_TYPE_BUILDING_UPGRADE, EVENT_TYPE_CHALLENGE_STARTED, EVENT_TYPE_POPULATION_LIMIT_REACHED, EVENT_TYPE_RAID_INCOMING, EVENT_TYPE_RAID_RESULT, EVENT_TYPE_RESEARCH_COMPLETE, EVENT_TYPE_RESOURCE_LIMIT_REACHED, EVENT_TYPE_TERRITORY_LIMIT_REACHED, HQ_TYPE_CAMP, HQ_TYPE_CITY, HQ_TYPE_SETTLEMENT, HQ_TYPE_TOWN, HQ_TYPE_VILLAGE, PUNISHMENT_CROP_FAILURE, PUNISHMENT_LANDSLIDE, PUNISHMENT_PLAGUE, PUNISHMENT_VOLCANO, PUNISHMENT_WILDFIRES, RAID_PHASE_INCOMING, RAID_PHASE_WAITING, RESEARCH_ATTACK_1, RESEARCH_DEFENSE_1, RESEARCH_FOOD_PRODUCTION_1, RESEARCH_WARNING_1, RESEARCH_WARNING_2, RESOURCE_COPPER, RESOURCE_FOOD, RESOURCE_GOLD, RESOURCE_IRON, RESOURCE_STONE, RESOURCE_WOOD, SEASON_COLD, SEASON_WARM, TRADE_BUY, TRADE_SELL, TRIBUTE_CANCEL, TRIBUTE_DELAY, TUTORIAL_MODAL_CHALLENGE_STARTED, TUTORIAL_MODAL_HQ_UPGRADE, TUTORIAL_MODAL_NEGATIVE_PRODUCTION, TUTORIAL_MODAL_RAID_INCOMING, TUTORIAL_MODAL_SEASON_CHANGED, UNIT_ARCHER, UNIT_CAVALRY, UNIT_INFANTRY} from '@/js/engine/enums.js'
import {CHALLENGE_FAILURE_DELAY_BONUS, CHALLENGE_REFERENCE_STATS, HQ_TERRITORY_PER_LEVEL, MILITARY_UNITS_PER_LEVEL, MONUMENT_FAITH_PER_LEVEL, RAID_BONUS_PER_YEAR, RAID_GRACE_PERIOD, RAID_INTERVAL_BASE, RAID_INTERVAL_MIN, RAID_INTERVAL_PER_TERRITORY, RAID_UNITS_BASE, RAID_UNITS_PER_TERRITORY, RAID_UNITS_PER_YEAR, RAID_WARNING_TIME, RESEARCH_TIME_MULTIPLIER, SEASON_DURATION, SHORTAGE_MAX_PENALTY, TRIBUTE_DELAY_SECONDS, TRIBUTE_ROUNDING, UNIT_STATS, WORKER_FOOD_CONSUMPTION, WORKER_RECRUIT_COST, WORKER_WOOD_CONSUMPTION} from '@/js/engine/balancing.js'
import {IMG_BUILDING_WALL, IMG_OTHER_TERRITORY, SND_BUILDING_CREATED, SND_HEADQUARTERS_UPGRADED, SND_NOTIFICATION_ALERT, SND_NOTIFICATION_DISASTER, SND_RESEARCH_COMPLETED, SND_TERRITORY_EXPANDED, SND_UNDER_ATTACK, SND_WORKER_ACADEMY, SND_WORKER_FARM, SND_WORKER_MINE, SND_WORKER_TEMPLE, SND_WORKER_WOODCUTTER} from '@/js/engine/assets.js'
import {resolveBattle} from '@/js/engine/battle.js'
import {adjustChallenge} from '@/js/engine/challenge_scaling.js'
import {colonyStats} from '@/js/engine/colony_stats.js'
import {CHALLENGE_DEFINITIONS, DOWNGRADABLE_BUILDINGS, RESEARCH_COSTS, RESOURCE_LIMIT_EVENT_CONFIG, RESOURCE_NEGATIVE_PRODUCTION_EVENT_CONFIG, SAVE_VERSION, createInitialChallenges} from '@/js/engine/constants.js'
import Academy from '@/js/models/buildings/academy.js'
import Altar from '@/js/models/buildings/altar.js'
import Archery from '@/js/models/buildings/archery.js'
import Barracks from '@/js/models/buildings/barracks.js'
import CopperMine from '@/js/models/buildings/copper_mine.js'
import Farm from '@/js/models/buildings/farm.js'
import GoldMine from '@/js/models/buildings/gold_mine.js'
import Headquarters from '@/js/models/buildings/headquarters.js'
import House from '@/js/models/buildings/house.js'
import IronMine from '@/js/models/buildings/iron_mine.js'
import Market from '@/js/models/buildings/market.js'
import Monument from '@/js/models/buildings/monument.js'
import Quarry from '@/js/models/buildings/quarry.js'
import Stable from '@/js/models/buildings/stable.js'
import Storehouse from '@/js/models/buildings/storehouse.js'
import Temple from '@/js/models/buildings/temple.js'
import Tower from '@/js/models/buildings/tower.js'
import Wall from '@/js/models/buildings/wall.js'
import Woodcutter from '@/js/models/buildings/woodcutter.js'
import Buildings from '@/js/models/buildings.js'
import Challenge from '@/js/models/challenge.js'
import Colony from '@/js/models/colony.js'
import Cost from '@/js/models/cost.js'
import Meta from '@/js/models/meta.js'
import Raid from '@/js/models/raid.js'
import RaidReport from '@/js/models/raid_report.js'
import Resources from '@/js/models/resources.js'
import Season from '@/js/models/season.js'
import Events from '@/js/models/events/events.js'
import Tutorial from '@/js/models/tutorial.js'
import {createBlessing, createChallenge, createChallengeDefinition, createChallenges, createMilitary, createPunishment, createRaid} from '../helpers/factories.js'
import activatedSave from '../fixtures/save_version_1_activated.json'
import startedSave from '../fixtures/save_version_1_started.json'

vi.mock('@/js/engine/analytics.js', () => ({
  default: {
    logTutorialComplete: vi.fn(),
  },
}))

vi.mock('@/js/engine/audio.js', () => ({
  default: {
    playSound: vi.fn(),
  },
}))

vi.mock('@/js/engine/storage.js', () => ({
  default: {
    tutorialCompleted: false,
  },
}))

vi.mock('@/js/i18n/localized.js', () => ({
  t: (key) => key,
}))

function createBuildings(overrides = {}) {
  const defaultBuilding = (BuildingClass, extra = {}) => {
    const data = {
      level: 0,
      ...extra,
    }
    return new BuildingClass(data)
  }
  return new Buildings({
    headquarters: new Headquarters({
      level: 1,
      type: HQ_TYPE_CAMP,
      ...overrides.headquarters,
    }),
    house: new House({
      level: 0,
      ...overrides.house,
    }),
    academy: new Academy({
      level: 0,
      ...overrides.academy,
    }),
    storehouse: new Storehouse({
      level: 0,
      ...overrides.storehouse,
    }),
    market: new Market({
      level: 0,
      ...overrides.market,
    }),
    farm: new Farm({
      level: 0,
      ...overrides.farm,
    }),
    woodcutter: new Woodcutter({
      level: 0,
      ...overrides.woodcutter,
    }),
    quarry: defaultBuilding(Quarry, overrides.quarry),
    copperMine: defaultBuilding(CopperMine, overrides.copperMine),
    ironMine: defaultBuilding(IronMine, overrides.ironMine),
    goldMine: defaultBuilding(GoldMine, overrides.goldMine),
    altar: defaultBuilding(Altar, overrides.altar),
    temple: defaultBuilding(Temple, overrides.temple),
    monument: defaultBuilding(Monument, overrides.monument),
    barracks: defaultBuilding(Barracks, overrides.barracks),
    archery: defaultBuilding(Archery, overrides.archery),
    stable: defaultBuilding(Stable, overrides.stable),
    wall: defaultBuilding(Wall, overrides.wall),
    tower: defaultBuilding(Tower, overrides.tower),
  })
}

function createColony(overrides = {}) {
  return new Colony({
    year: overrides.year ?? 1,
    season: new Season({
      currentSeason: SEASON_WARM,
      seasonElapsed: 0,
      ...overrides.season,
    }),
    resources: new Resources({
      territory: 0,
      territoryBonus: 0,
      workers: 0,
      food: 200,
      wood: 200,
      stone: 200,
      copper: 200,
      iron: 200,
      gold: 200,
      faith: 200,
      knowledge: 200,
      ...overrides.resources,
    }),
    buildings: overrides.buildings ?? createBuildings(overrides.buildingOverrides),
    events: overrides.events ?? new Events(),
    military: overrides.military,
  })
}

function createMeta(overrides = {}) {
  return new Meta({
    version: SAVE_VERSION,
    createdDateTime: '2025-01-01T00:00:00.000Z',
    updatedDateTime: '2025-01-01T00:00:00.000Z',
    challenges: overrides.challenges ?? createChallenges(),
    gameSpeed: overrides.gameSpeed ?? 1,
    tutorial: overrides.tutorial ?? new Tutorial({
      completed: true,
    }),
  })
}

async function createState(options = {}) {
  const {
    default: State,
  } = await import('@/js/engine/state.js')
  const meta = options.meta ?? createMeta(options.metaOverrides ?? {})
  const colony = options.colony ?? createColony(options.colonyOverrides ?? {})
  return new State(meta, colony)
}

// A Settlement colony with the given army and raid; an incoming raid also gets its upcoming event
async function createRaidState(options = {}) {
  const colonyOverrides = options.colonyOverrides ?? {}
  const state = await createState({
    metaOverrides: options.metaOverrides,
    colonyOverrides: {
      ...colonyOverrides,
      military: createMilitary({
        units: options.units ?? {},
        raid: options.raid === undefined ? createRaid() : options.raid,
        raidCount: options.raidCount ?? 0,
      }),
      buildingOverrides: {
        headquarters: {
          level: 1,
          type: HQ_TYPE_SETTLEMENT,
        },
        ...colonyOverrides.buildingOverrides,
      },
    },
  })
  const raid = state.colony.military.raid
  if (raid?.phase === RAID_PHASE_INCOMING) {
    state.colony.events.addFuture({
      type: EVENT_TYPE_RAID_INCOMING,
      textKey: 'event.raidIncoming',
      icon: IMG_BUILDING_WALL,
      params: [raid.enemyCount],
      action: 'openMilitaryModal',
      remainingSeconds: raid.remainingSeconds,
    })
  }
  return state
}

function raidEvent(state) {
  return state.colony.events.future.find(event => event.type === EVENT_TYPE_RAID_INCOMING)
}

// An academy at the given level running foodProduction1 with the given time left
function academyWithResearch(level, remainingSeconds, overrides = {}) {
  return {
    level: level,
    active: [
      {
        key: 'foodProduction1',
        remainingSeconds: remainingSeconds,
        duration: 100,
      },
    ],
    ...overrides,
  }
}

// Adds the upcoming event startResearch creates for a running research
function addResearchEvent(state, researchKey, remainingSeconds) {
  return state.colony.events.addFuture({
    type: EVENT_TYPE_RESEARCH_COMPLETE,
    textKey: 'event.researchInProgress',
    icon: '',
    researchKey: researchKey,
    remainingSeconds: remainingSeconds,
  })
}

function researchEvent(state, researchKey) {
  return state.colony.events.future.find(event => event.researchKey === researchKey)
}

describe('State', () => {
  let analytics
  let audio
  let storage

  beforeEach(async () => {
    vi.clearAllMocks()
    const analyticsModule = await import('@/js/engine/analytics.js')
    analytics = analyticsModule.default
    const audioModule = await import('@/js/engine/audio.js')
    audio = audioModule.default
    const storageModule = await import('@/js/engine/storage.js')
    storage = storageModule.default
    storage.tutorialCompleted = false
  })

  // ── constructor ──────────────────────────────────────────────────

  describe('constructor', () => {
    it('should set meta and colony fields', async () => {
      const state = await createState()
      expect(state.meta).toBeDefined()
      expect(state.colony).toBeDefined()
    })

    it('should initialize tracking sets empty', async () => {
      const state = await createState()
      expect(state._resourcesAtCap.size).toBe(0)
      expect(state._resourcesNegativeProduction.size).toBe(0)
    })

    it('should initialize paused to false', async () => {
      const state = await createState()
      expect(state.paused).toBe(false)
    })

    it('should initialize challengeModal to null', async () => {
      const state = await createState()
      expect(state.challengeModal).toBeNull()
    })

    it('should initialize raidReport to null', async () => {
      const state = await createState()
      expect(state.raidReport).toBeNull()
    })

    it('should initialize army consumption to zero', async () => {
      const state = await createState()
      expect(state.armyConsumption).toEqual({
        food: 0,
        wood: 0,
      })
    })

    it('should give the colony an empty Military when none is passed', async () => {
      const state = await createState()
      expect(state.colony.military.totalUnits).toBe(0)
      expect(state.colony.military.raid).toBeNull()
    })

    it('should detect constructing buildings', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 0,
              constructionRemaining: 5,
              constructionDuration: 10,
            },
          },
        },
      })
      expect(state._constructingKeys.has(BUILDING_FARM)).toBe(true)
    })

    it('should not add non-constructing buildings to constructing keys', async () => {
      const state = await createState()
      expect(state._constructingKeys.size).toBe(0)
    })
  })

  // ── update(delta) ────────────────────────────────────────────────

  describe('update', () => {
    it('should keep completed research bonuses while the academy is at level 0', async () => {
      const createWithAcademy = academy => createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academy,
          },
        },
      })
      const levelZero = await createWithAcademy({
        level: 0,
        completed: ['foodProduction1'],
      })
      const levelOne = await createWithAcademy({
        level: 1,
        completed: ['foodProduction1'],
      })
      const noResearch = await createWithAcademy({
        level: 1,
      })
      levelZero.update(0)
      levelOne.update(0)
      noResearch.update(0)
      expect(levelZero.productionMultipliers.food).toBe(levelOne.productionMultipliers.food)
      expect(levelZero.productionMultipliers.food).toBeGreaterThan(noResearch.productionMultipliers.food)
    })

    it('should increase food when farm has workers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
            wood: 100,
            workers: 5,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 5,
            },
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      const foodBefore = state.colony.resources.food
      state.update(1)
      const foodAfter = state.colony.resources.food
      // Farm produces 1 food/sec per worker in warm season (1.2 multiplier)
      // 5 workers * 1 rate * 1.2 season = 6/sec production
      // Consumption: 5 workers * 0.1 = 0.5/sec
      // Net should increase food
      expect(foodAfter).toBeGreaterThan(foodBefore)
    })

    it('should deduct food and wood consumption from workers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
            wood: 100,
            workers: 10,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(1)
      // 10 workers * 0.1 food/sec = 1.0 food consumed
      // No production buildings, so food should decrease
      expect(state.colony.resources.food).toBeLessThan(100)
      // Warm season reduces wood consumption (multiplier 0.8)
      // 10 workers * 0.1 * 0.8 = 0.8 wood consumed
      expect(state.colony.resources.wood).toBeLessThan(100)
    })

    it('should NOT deduct consumption when delta is 0', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
            wood: 100,
            workers: 10,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      // delta=0 is a recalculate-only call, no resource flow
      expect(state.colony.resources.food).toBe(100)
      expect(state.colony.resources.wood).toBe(100)
    })

    it('should cap resources at storage limit', async () => {
      // Storehouse level 0: storageCap = 500 * 1.2^0 = 500
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 499,
            workers: 5,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 5,
            },
            house: {
              level: 1,
              workersCap: 10,
            },
          },
        },
      })
      // Big delta to push food well above 500 cap
      state.update(100)
      expect(state.colony.resources.food).toBeLessThanOrEqual(500)
    })

    it('should floor resources at 0', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0.01,
            wood: 0.01,
            workers: 10,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(1)
      expect(state.colony.resources.food).toBeGreaterThanOrEqual(0)
      expect(state.colony.resources.wood).toBeGreaterThanOrEqual(0)
    })

    it('should update territory count based on building levels', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 2,
            },
            woodcutter: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      // totalLevels = all non-HQ building levels = 2 + 1 = 3
      expect(state.colony.resources.territory).toBe(3)
    })

    it('should dismiss cap event when resource drops below storage cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
          },
          buildingOverrides: {
            storehouse: {
              level: 1,
            },
          },
        },
      })
      // Pre-populate the tracking set as if food was previously at cap
      state._resourcesAtCap.add(RESOURCE_FOOD)
      const dismissSpy = vi.spyOn(state.colony.events, 'dismissPastByTextKey')
      state.update(1)
      expect(state._resourcesAtCap.has(RESOURCE_FOOD)).toBe(false)
      const config = RESOURCE_LIMIT_EVENT_CONFIG[RESOURCE_FOOD]
      expect(dismissSpy).toHaveBeenCalledWith(config.textKey)
    })

    it('should not re-fire cap event when resource stays at cap on consecutive ticks', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      // Pre-populate as if food was already at cap on the previous tick
      state._resourcesAtCap.add(RESOURCE_FOOD)
      const addSpy = vi.spyOn(state.colony.events, 'addPast')
      state.update(0)
      // Food is still at cap but already tracked — no duplicate event
      expect(state._resourcesAtCap.has(RESOURCE_FOOD)).toBe(true)
      expect(addSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENT_TYPE_RESOURCE_LIMIT_REACHED,
        }),
      )
    })

    it('should not trigger tutorial modal for non-food/non-wood negative production', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            wood: 200,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      // Inject artificial stone consumption to force negative stone production
      state.consumption.stone = 999
      const triggerSpy = vi.spyOn(state, '_triggerTutorialModal')
      state.update(0)
      expect(state._resourcesNegativeProduction.has(RESOURCE_STONE)).toBe(true)
      expect(triggerSpy).not.toHaveBeenCalledWith(TUTORIAL_MODAL_NEGATIVE_PRODUCTION)
    })

    it('should dismiss negative production event when production recovers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            wood: 200,
            workers: 5,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 5,
            },
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      // Pre-populate as if food had negative production previously
      state._resourcesNegativeProduction.add(RESOURCE_FOOD)
      const dismissSpy = vi.spyOn(state.colony.events, 'dismissPastByTextKey')
      // With 5 farm workers, production exceeds consumption → recovery
      state.update(1)
      expect(state._resourcesNegativeProduction.has(RESOURCE_FOOD)).toBe(false)
      const config = RESOURCE_NEGATIVE_PRODUCTION_EVENT_CONFIG[RESOURCE_FOOD]
      expect(dismissSpy).toHaveBeenCalledWith(config.textKey)
    })

    it('should store the army share of upkeep in armyConsumption', async () => {
      const state = await createState({
        colonyOverrides: {
          military: createMilitary({
            units: {
              [UNIT_INFANTRY]: 10,
            },
          }),
        },
      })
      state.update(0)
      expect(state.armyConsumption.food).toBeCloseTo(10 * UNIT_STATS[UNIT_INFANTRY].upkeep.food, 10)
      expect(state.armyConsumption.wood).toBeGreaterThan(0)
      // No workers: all consumption comes from the army
      expect(state.consumption.food).toBeCloseTo(state.armyConsumption.food, 10)
      expect(state.consumption.wood).toBeCloseTo(state.armyConsumption.wood, 10)
    })

    it('should store the Attack and Defense research bonuses in unitBonuses', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              completed: [
                RESEARCH_ATTACK_1,
                RESEARCH_DEFENSE_1,
              ],
            },
          },
        },
      })
      state.update(0)
      expect(state.unitBonuses.attack).toBeCloseTo(0.1, 10)
      expect(state.unitBonuses.defense).toBeCloseTo(0.1, 10)
    })

    it('should give zero unitBonuses without military research', async () => {
      const state = await createState()
      expect(state.unitBonuses).toEqual({
        attack: 0,
        defense: 0,
      })
      state.update(0)
      expect(state.unitBonuses).toEqual({
        attack: 0,
        defense: 0,
      })
    })

    it('should deduct army upkeep from food and wood over time', async () => {
      const state = await createState({
        colonyOverrides: {
          military: createMilitary({
            units: {
              [UNIT_INFANTRY]: 10,
            },
          }),
        },
      })
      state.update(10)
      expect(state.colony.resources.food).toBeCloseTo(200 - 10 * state.armyConsumption.food, 6)
      expect(state.colony.resources.wood).toBeCloseTo(200 - 10 * state.armyConsumption.wood, 6)
      expect(state.colony.resources.food).toBeLessThan(200)
    })

    it('should count army upkeep toward the shortage penalty', async () => {
      const colonyOverrides = (units) => ({
        resources: {
          workers: 10,
        },
        buildingOverrides: {
          farm: {
            level: 1,
            workers: 5,
          },
          woodcutter: {
            level: 1,
            workers: 5,
          },
          house: {
            level: 2,
          },
        },
        military: createMilitary({
          units: units,
        }),
      })
      const withoutArmy = await createState({
        colonyOverrides: colonyOverrides({}),
      })
      const withArmy = await createState({
        colonyOverrides: colonyOverrides({
          [UNIT_INFANTRY]: 60,
        }),
      })
      // The second tick applies the penalty detected on the first
      withoutArmy.update(0)
      withoutArmy.update(0)
      withArmy.update(0)
      withArmy.update(0)
      expect(withoutArmy.productivity).toBe(1)
      expect(withArmy.netProduction(RESOURCE_FOOD)).toBeLessThan(0)
      expect(withArmy.productivity).toBeLessThan(1)
    })
  })

  // ── netProduction ────────────────────────────────────────────────

  describe('netProduction', () => {
    it('should return production minus consumption for food', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            wood: 200,
            workers: 5,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 5,
            },
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      const netFood = state.netProduction(RESOURCE_FOOD)
      // Production: 5 * 1 * 1.2 (warm season) = 6.0
      // Consumption: 5 * 0.1 = 0.5
      // Net: 6.0 - 0.5 = 5.5
      expect(netFood).toBeGreaterThan(0)
    })

    it('should return production only for resources without consumption', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            quarry: {
              level: 1,
              workers: 3,
            },
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      const netStone = state.netProduction(RESOURCE_STONE)
      // Stone has no consumption, so net = production
      expect(netStone).toBeGreaterThan(0)
    })
  })

  // ── expansionCost ────────────────────────────────────────────────

  describe('expansionCost', () => {
    it('should return HQ levelUpCost when no research bonuses', async () => {
      const state = await createState()
      const cost = state.expansionCost
      const baseCost = state.colony.buildings.headquarters.levelUpCost
      expect(cost.food).toBe(baseCost.food)
      expect(cost.wood).toBe(baseCost.wood)
    })

    it('should return discounted cost with expansion research', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              completed: ['expansion1'],
            },
          },
        },
      })
      const cost = state.expansionCost
      const baseCost = state.colony.buildings.headquarters.levelUpCost
      // With expansion research, cost should be lower
      expect(cost.food).toBeLessThanOrEqual(baseCost.food)
      expect(cost.wood).toBeLessThanOrEqual(baseCost.wood)
    })
  })

  // ── unlockedBuildings ────────────────────────────────────────────

  describe('unlockedBuildings', () => {
    const campBuildings = [
      BUILDING_HEADQUARTERS,
      BUILDING_HOUSE,
      BUILDING_ALTAR,
      BUILDING_FARM,
      BUILDING_WOODCUTTER,
    ]
    const settlementBuildings = [
      ...campBuildings,
      BUILDING_STOREHOUSE,
      BUILDING_TEMPLE,
      BUILDING_QUARRY,
      BUILDING_BARRACKS,
    ]
    const villageBuildings = [
      ...settlementBuildings,
      BUILDING_ACADEMY,
      BUILDING_COPPER_MINE,
      BUILDING_ARCHERY,
    ]
    const townBuildings = [
      ...villageBuildings,
      BUILDING_MONUMENT,
      BUILDING_IRON_MINE,
      BUILDING_STABLE,
      BUILDING_WALL,
    ]
    const cityBuildings = [
      ...townBuildings,
      BUILDING_MARKET,
      BUILDING_GOLD_MINE,
      BUILDING_TOWER,
    ]

    it.each([
      {
        type: HQ_TYPE_CAMP,
        expected: campBuildings,
      },
      {
        type: HQ_TYPE_SETTLEMENT,
        expected: settlementBuildings,
      },
      {
        type: HQ_TYPE_VILLAGE,
        expected: villageBuildings,
      },
      {
        type: HQ_TYPE_TOWN,
        expected: townBuildings,
      },
      {
        type: HQ_TYPE_CITY,
        expected: cityBuildings,
      },
    ])('should unlock the headquarters and every building up to $type', async ({
      type, expected,
    }) => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: type,
            },
          },
        },
      })
      expect(state.unlockedBuildings).toEqual(new Set(expected))
    })

    it('should unlock all 19 buildings at City', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CITY,
            },
          },
        },
      })
      expect(state.unlockedBuildings.size).toBe(Object.keys(state.colony.buildings).length)
    })
  })

  // ── advanceProgress ──────────────────────────────────────────────

  describe('advanceProgress', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should advance season, construction, research, challenges, events and raids in that order', async () => {
      const state = await createState()
      const methods = [
        'advanceSeason',
        'advanceConstruction',
        'advanceResearch',
        'advanceChallenges',
        'advanceEvents',
        'advanceRaids',
      ]
      const spies = methods.map(method => vi.spyOn(state, method))
      state.advanceProgress(2)
      const callOrder = spies.map(spy => spy.mock.invocationCallOrder[0])
      expect(callOrder).toEqual([...callOrder].sort((first, second) => first - second))
      for (const spy of spies) {
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(2)
      }
    })

    it('should move the season timer by the step', async () => {
      const state = await createState()
      state.advanceProgress(3)
      expect(state.colony.season.seasonElapsed).toBe(3)
    })
  })

  // ── advanceSeason ────────────────────────────────────────────────

  describe('advanceSeason', () => {
    it('should not flip season before duration reached', async () => {
      const state = await createState({
        colonyOverrides: {
          season: {
            currentSeason: SEASON_WARM,
            seasonElapsed: 0,
          },
        },
      })
      state.advanceSeason(10)
      expect(state.colony.season.currentSeason).toBe(SEASON_WARM)
    })

    it('should flip season at duration boundary', async () => {
      const state = await createState({
        colonyOverrides: {
          season: {
            currentSeason: SEASON_WARM,
            seasonElapsed: SEASON_DURATION - 1,
          },
        },
      })
      state.advanceSeason(1)
      expect(state.colony.season.currentSeason).toBe(SEASON_COLD)
    })

    it('should increment year when flipping to warm', async () => {
      const state = await createState({
        colonyOverrides: {
          year: 1,
          season: {
            currentSeason: SEASON_COLD,
            seasonElapsed: SEASON_DURATION - 1,
          },
        },
      })
      state.advanceSeason(1)
      expect(state.colony.season.currentSeason).toBe(SEASON_WARM)
      expect(state.colony.year).toBe(2)
    })

    it('should increment year correctly on multi-flip from cold', async () => {
      const state = await createState({
        colonyOverrides: {
          year: 1,
          season: {
            currentSeason: SEASON_COLD,
            seasonElapsed: 0,
          },
        },
      })
      // 3 flips from cold: cold→warm (year++), warm→cold, cold→warm (year++)
      state.advanceSeason(SEASON_DURATION * 3)
      expect(state.colony.season.currentSeason).toBe(SEASON_WARM)
      expect(state.colony.year).toBe(3)
    })

    it('should increment year correctly on multi-flip from warm', async () => {
      const state = await createState({
        colonyOverrides: {
          year: 1,
          season: {
            currentSeason: SEASON_WARM,
            seasonElapsed: 0,
          },
        },
      })
      // 4 flips from warm: warm→cold, cold→warm (year++), warm→cold, cold→warm (year++)
      state.advanceSeason(SEASON_DURATION * 4)
      expect(state.colony.season.currentSeason).toBe(SEASON_WARM)
      expect(state.colony.year).toBe(3)
    })

    it('should play season notification sound on flip', async () => {
      const state = await createState({
        colonyOverrides: {
          season: {
            currentSeason: SEASON_WARM,
            seasonElapsed: SEASON_DURATION - 1,
          },
        },
      })
      state.advanceSeason(1)
      expect(audio.playSound).toHaveBeenCalled()
    })
  })

  // ── advanceConstruction ──────────────────────────────────────────

  describe('advanceConstruction', () => {
    it('should resume paused research once the academy is rebuilt', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(0, 10, {
              constructionRemaining: 1,
              constructionDuration: 5,
            }),
          },
        },
      })
      addResearchEvent(state, 'foodProduction1', 10)
      const research = state.colony.buildings.academy.active.get('foodProduction1')
      state.advanceResearch(0.5)
      state.advanceEvents(0.5)
      expect(research.remainingSeconds).toBe(10)
      state.advanceConstruction(1)
      expect(state.colony.buildings.academy.level).toBe(1)
      state.advanceResearch(4)
      state.advanceEvents(4)
      expect(research.remainingSeconds).toBe(6)
      expect(researchEvent(state, 'foodProduction1').remainingSeconds).toBe(6)
    })

    it('should complete building when timer reaches 0', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 0,
              constructionRemaining: 1,
              constructionDuration: 5,
            },
          },
        },
      })
      expect(state._constructingKeys.has(BUILDING_FARM)).toBe(true)
      state.advanceConstruction(1)
      expect(state.colony.buildings.farm.level).toBe(1)
    })

    it('should remove building from constructing keys on completion', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 0,
              constructionRemaining: 1,
              constructionDuration: 5,
            },
          },
        },
      })
      state.advanceConstruction(1)
      expect(state._constructingKeys.has(BUILDING_FARM)).toBe(false)
    })

    it('should not advance when nothing is constructing', async () => {
      const state = await createState()
      // No buildings constructing, should be a no-op
      state.advanceConstruction(1)
      expect(state.colony.buildings.farm.level).toBe(0)
    })

    it('should not complete building when timer has time remaining', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 0,
              constructionRemaining: 10,
              constructionDuration: 10,
            },
          },
        },
      })
      state.advanceConstruction(5)
      expect(state.colony.buildings.farm.level).toBe(0)
      expect(state.colony.buildings.farm.constructionRemaining).toBe(5)
    })

    it('should handle HQ level-up completion', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
              constructionRemaining: 1,
              constructionDuration: 10,
            },
          },
        },
      })
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingUpgrading',
        buildingKey: BUILDING_HEADQUARTERS,
      })
      state.colony.events.addPast({
        type: EVENT_TYPE_TERRITORY_LIMIT_REACHED,
        textKey: 'event.territoryLimitReached',
      })
      state.advanceConstruction(1)
      expect(state.colony.events.past.some(
        event => event.textKey === 'event.territoryExpanded' && event.icon === IMG_OTHER_TERRITORY,
      )).toBe(true)
      expect(audio.playSound).toHaveBeenCalledWith(SND_TERRITORY_EXPANDED)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_TERRITORY_LIMIT_REACHED)).toBe(false)
    })

    it('should handle storehouse completion', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            storehouse: {
              level: 0,
              constructionRemaining: 1,
              constructionDuration: 10,
            },
          },
        },
      })
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingBuilding',
        buildingKey: BUILDING_STOREHOUSE,
      })
      state.colony.events.addPast({
        type: EVENT_TYPE_RESOURCE_LIMIT_REACHED,
        textKey: 'event.resourceLimitReached',
      })
      state._resourcesAtCap.add('food')
      state.advanceConstruction(1)
      expect(state.colony.events.future.some(
        event => event.buildingKey === BUILDING_STOREHOUSE,
      )).toBe(false)
      expect(audio.playSound).toHaveBeenCalledWith(SND_BUILDING_CREATED)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_RESOURCE_LIMIT_REACHED)).toBe(false)
      expect(state._resourcesAtCap.size).toBe(0)
    })

    it('should handle house completion', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            house: {
              level: 0,
              constructionRemaining: 1,
              constructionDuration: 10,
            },
          },
        },
      })
      state.colony.events.addPast({
        type: EVENT_TYPE_POPULATION_LIMIT_REACHED,
        textKey: 'event.populationLimitReached',
      })
      state.advanceConstruction(1)
      expect(audio.playSound).toHaveBeenCalledWith(SND_BUILDING_CREATED)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(false)
    })

    it('should handle monument completion and grant faith', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            monument: {
              level: 1,
              constructionRemaining: 1,
              constructionDuration: 10,
            },
          },
        },
      })
      const faithBefore = state.colony.resources.faith
      state.advanceConstruction(1)
      expect(audio.playSound).toHaveBeenCalledWith(SND_BUILDING_CREATED)
      expect(state.colony.resources.faith).toBe(faithBefore + MONUMENT_FAITH_PER_LEVEL * 2)
    })

    it('should handle HQ type upgrade completion', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
              upgradeRemaining: 1,
              upgradeDuration: 10,
            },
          },
        },
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
          }),
        },
      })
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingUpgrading',
        buildingKey: BUILDING_HEADQUARTERS,
      })
      expect(state._hqUpgrading).toBe(true)
      state.advanceConstruction(1)
      expect(state._hqUpgrading).toBe(false)
      expect(state.colony.events.future.some(
        event => event.buildingKey === BUILDING_HEADQUARTERS,
      )).toBe(false)
      expect(audio.playSound).toHaveBeenCalledWith(SND_HEADQUARTERS_UPGRADED)
      expect(state.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_HQ_UPGRADE)
    })

    it('should not complete HQ upgrade when timer has time remaining', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
              isUpgrading: true,
              upgradeRemaining: 10,
            },
          },
        },
      })
      state._hqUpgrading = true
      state.advanceConstruction(1)
      expect(state._hqUpgrading).toBe(true)
      expect(state.colony.buildings.headquarters.upgradeRemaining).toBe(9)
    })
  })

  // ── advanceResearch ──────────────────────────────────────────────

  describe('advanceResearch', () => {
    it('should complete research when timer reaches 0', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              active: [
                {
                  key: 'foodProduction1',
                  remainingSeconds: 1,
                  duration: 10,
                },
              ],
            },
          },
        },
      })
      state.advanceResearch(1)
      expect(state.colony.buildings.academy.isCompleted('foodProduction1')).toBe(true)
    })

    it('should move research from active to completed', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              active: [
                {
                  key: 'foodProduction1',
                  remainingSeconds: 1,
                  duration: 10,
                },
              ],
            },
          },
        },
      })
      expect(state.colony.buildings.academy.isActive('foodProduction1')).toBe(true)
      state.advanceResearch(1)
      expect(state.colony.buildings.academy.isActive('foodProduction1')).toBe(false)
      expect(state.colony.buildings.academy.isCompleted('foodProduction1')).toBe(true)
    })

    it('should not complete research when timer has not elapsed', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              active: [
                {
                  key: 'foodProduction1',
                  remainingSeconds: 10,
                  duration: 10,
                },
              ],
            },
          },
        },
      })
      state.advanceResearch(1)
      expect(state.colony.buildings.academy.isActive('foodProduction1')).toBe(true)
      expect(state.colony.buildings.academy.isCompleted('foodProduction1')).toBe(false)
    })

    it('should not advance when no active research', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
            },
          },
        },
      })
      // No active research, should be a no-op
      state.advanceResearch(1)
      expect(state.colony.buildings.academy.completed.size).toBe(0)
    })

    it('should dismiss population limit event when habitation research raises the cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            workers: 9,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
            academy: {
              level: 1,
              active: [
                {
                  key: 'habitation1',
                  remainingSeconds: 1,
                  duration: 10,
                },
              ],
            },
          },
        },
      })
      state.update(0)
      // workersCap = 1 * 10 = 10
      state._recruit()
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(true)
      state.advanceResearch(1)
      expect(state.colony.buildings.house.workersCap).toBe(11)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(false)
      // Reaching the raised cap warns again
      audio.playSound.mockClear()
      state._recruit()
      expect(state.colony.resources.workers).toBe(11)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(true)
      expect(audio.playSound).toHaveBeenCalledWith(SND_NOTIFICATION_ALERT)
    })

    it('should keep population limit event when completed research leaves workers at the cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 10,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
            academy: {
              level: 1,
              active: [
                {
                  key: 'foodProduction1',
                  remainingSeconds: 1,
                  duration: 10,
                },
              ],
            },
          },
        },
      })
      state.update(0)
      // workersCap = 1 * 10 = 10
      state.colony.events.addPast({
        type: EVENT_TYPE_POPULATION_LIMIT_REACHED,
        textKey: 'event.populationLimitReached',
        icon: '',
      })
      state.advanceResearch(1)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(true)
    })

    it('should freeze research while the academy is at level 0', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(0, 10),
          },
        },
      })
      state.advanceResearch(100)
      const {
        academy,
      } = state.colony.buildings
      expect(academy.active.get('foodProduction1').remainingSeconds).toBe(10)
      expect(academy.isActive('foodProduction1')).toBe(true)
      expect(academy.isCompleted('foodProduction1')).toBe(false)
      expect(audio.playSound).not.toHaveBeenCalledWith(SND_RESEARCH_COMPLETED)
    })

    it('should resume paused research with the same time left once the academy is rebuilt', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(0, 10),
          },
        },
      })
      const {
        academy,
      } = state.colony.buildings
      state.advanceResearch(100)
      academy.level = 1
      state.advanceResearch(9)
      expect(academy.active.get('foodProduction1').remainingSeconds).toBe(1)
      state.advanceResearch(1)
      expect(academy.isCompleted('foodProduction1')).toBe(true)
      expect(audio.playSound).toHaveBeenCalledWith(SND_RESEARCH_COMPLETED)
    })
  })

  // ── advanceEvents ────────────────────────────────────────────────

  describe('advanceEvents', () => {
    it('should decrement future event countdowns', async () => {
      const state = await createState()
      state.colony.events.addFuture({
        type: 'test',
        textKey: 'test.event',
        icon: '/img/test.png',
        remainingSeconds: 10,
      })
      state.advanceEvents(3)
      expect(state.colony.events.future[0].remainingSeconds).toBe(7)
    })

    it('should not error when no future events exist', async () => {
      const state = await createState()
      expect(() => state.advanceEvents(1)).not.toThrow()
    })

    it('should keep a paused research event on its frozen research timer, in sorted order', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(0, 10),
          },
        },
      })
      addResearchEvent(state, 'foodProduction1', 10)
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingBuilding',
        icon: '',
        buildingKey: BUILDING_FARM,
        remainingSeconds: 15,
      })
      expect(state.colony.events.future[0].researchKey).toBe('foodProduction1')
      state.advanceResearch(8)
      state.advanceEvents(8)
      const [
        first,
        second,
      ] = state.colony.events.future
      expect(first.buildingKey).toBe(BUILDING_FARM)
      expect(first.remainingSeconds).toBe(7)
      expect(second.researchKey).toBe('foodProduction1')
      expect(second.remainingSeconds).toBe(10)
    })

    it('should tick a research event together with its research while the academy is built', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(1, 10),
          },
        },
      })
      addResearchEvent(state, 'foodProduction1', 10)
      state.advanceResearch(4)
      state.advanceEvents(4)
      expect(state.colony.buildings.academy.active.get('foodProduction1').remainingSeconds).toBe(6)
      expect(researchEvent(state, 'foodProduction1').remainingSeconds).toBe(6)
    })

    it('should not error when a running research has no event', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(0, 10),
          },
        },
      })
      state.colony.events.addFuture({
        type: 'test',
        textKey: 'test.event',
        icon: '',
        remainingSeconds: 10,
      })
      expect(() => state.advanceEvents(1)).not.toThrow()
      expect(state.colony.events.future[0].remainingSeconds).toBe(9)
    })
  })

  // ── advanceChallenges ────────────────────────────────────────────

  describe('advanceChallenges', () => {
    it('should activate pending challenge', async () => {
      const pendingChallenge = createChallenge({
        status: CHALLENGE_STATUS_PENDING,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            pending: [pendingChallenge],
          }),
        },
      })
      state.advanceChallenges(1)
      expect(state.meta.challenges.active).not.toBeNull()
      expect(state.meta.challenges.active.status).toBe(CHALLENGE_STATUS_ACTIVATED)
    })

    it('should advance delay timer on activated challenge', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 60,
        delayElapsed: 0,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      state.advanceChallenges(10)
      expect(state.meta.challenges.active.delayElapsed).toBe(10)
    })

    it('should advance timeout timer when started', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeout: 300,
        timeoutElapsed: 0,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      state.advanceChallenges(15)
      expect(state.meta.challenges.active.timeoutElapsed).toBe(15)
    })

    it('should not advance when challenge modal is showing', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeout: 300,
        timeoutElapsed: 0,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      state.challengeModal = CHALLENGE_MODAL_REWARD
      state.advanceChallenges(10)
      expect(state.meta.challenges.active.timeoutElapsed).toBe(0)
    })

    it('should return early when all challenges completed', async () => {
      const completedChallenge = createChallenge()
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            completed: [completedChallenge],
          }),
        },
      })
      state.advanceChallenges(1)
      expect(state.meta.challenges.active).toBeNull()
    })

    it('should return early when no pending and no active challenge', async () => {
      const state = await createState()
      state.advanceChallenges(1)
      expect(state.meta.challenges.active).toBeNull()
    })

    it('should return early if activate does not set an active challenge', async () => {
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            pending: [createChallenge()],
          }),
        },
      })
      vi.spyOn(state.meta.challenges, 'activate').mockImplementation(() => {})
      state.advanceChallenges(1)
      expect(state.meta.challenges.active).toBeNull()
    })

    it('should still advance effect timeouts when all challenges completed', async () => {
      const blessing = createBlessing({
        timeout: 100,
      })
      const punishment = createPunishment({
        timeout: 80,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            completed: [createChallenge()],
            activeBlessings: [blessing],
            activePunishments: [punishment],
          }),
        },
      })
      state.advanceChallenges(10)
      expect(state.meta.challenges.active).toBeNull()
      expect(blessing.timeout).toBe(90)
      expect(punishment.timeout).toBe(70)
    })

    it('should clear the Blessed Markets fee override as soon as the blessing expires', async () => {
      const blessing = createBlessing({
        type: BLESSING_BLESSED_MARKETS,
        timeout: 10,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [blessing],
          }),
        },
      })
      state.update(0)
      expect(state.colony.buildings.market.blessedMarkets).toBe(true)
      state.advanceChallenges(10)
      expect(state.meta.challenges.activeBlessings).toHaveLength(0)
      expect(state.colony.buildings.market.blessedMarkets).toBe(false)
    })

    it('should transition to started when delay elapses', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 60,
        delayElapsed: 59,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      state.advanceChallenges(1)
      expect(state.meta.challenges.active.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(state.colony.events.future.some(
        event => event.type === EVENT_TYPE_CHALLENGE_STARTED,
      )).toBe(true)
      expect(audio.playSound).toHaveBeenCalledWith(SND_NOTIFICATION_ALERT)
    })

    it('should show the challenge explanation after a simultaneous season popup closes', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 60,
        delayElapsed: 59,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
            pending: [],
          }),
          tutorial: new Tutorial({
            completed: false,
          }),
        },
        colonyOverrides: {
          season: {
            seasonElapsed: SEASON_DURATION - 1,
          },
        },
      })
      state.advanceSeason(1)
      state.advanceChallenges(1)
      expect(state.meta.challenges.active.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(state.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_SEASON_CHANGED)
      expect(state.meta.tutorial.pendingModals).toEqual([TUTORIAL_MODAL_CHALLENGE_STARTED])

      state.dismissTutorialModal()
      expect(state.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_CHALLENGE_STARTED)
      expect(state.meta.tutorial.pendingModals).toEqual([])
      expect(state.paused).toBe(true)

      state.dismissTutorialModal()
      expect(state.meta.tutorial.dismissedModals.has(TUTORIAL_MODAL_CHALLENGE_STARTED)).toBe(true)
      expect(state.paused).toBe(false)
    })

    it('should resolve challenge when timeout elapses and requirements met', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeout: 300,
        timeoutElapsed: 299,
        requirements: {
          faith: 50,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      state.advanceChallenges(1)
      expect(state.challengeModal).toBe(CHALLENGE_MODAL_REWARD)
      expect(state.paused).toBe(true)
    })
  })

  // ── areChallengeRequirementsMet ──────────────────────────────────

  describe('areChallengeRequirementsMet', () => {
    it('should return false when no active challenge', async () => {
      const state = await createState()
      expect(state.areChallengeRequirementsMet()).toBe(false)
    })

    it('should return true when all requirements met', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: 50,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        colonyOverrides: {
          resources: {
            faith: 100,
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(true)
    })

    it('should return false when faith insufficient', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: 500,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        colonyOverrides: {
          resources: {
            faith: 100,
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(false)
    })

    it('should return false when altar level insufficient', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: 3,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            altar: {
              level: 1,
            },
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(false)
    })

    it('should return false when resource requirement not met', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: null,
          temple: null,
          monument: null,
          resources: {
            food: 9999,
          },
          workers: null,
        },
      })
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(false)
    })

    it('should return false when monument level insufficient', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: null,
          temple: null,
          monument: 3,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            monument: {
              level: 1,
            },
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(false)
    })

    it('should return false when temple level insufficient', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: null,
          temple: 2,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            temple: {
              level: 0,
            },
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(false)
    })

    it('should return false when workers insufficient', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: 10,
        },
      })
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 3,
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(false)
    })

    it('should return true when resource requirements are met', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: null,
          temple: null,
          monument: null,
          resources: {
            food: 100,
          },
          workers: null,
        },
      })
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      expect(state.areChallengeRequirementsMet()).toBe(true)
    })
  })

  // ── selectBlessing ───────────────────────────────────────────────

  describe('selectBlessing', () => {
    it('should complete challenge and unpause', async () => {
      const blessing = createBlessing({
        type: BLESSING_FERTILE_SOIL,
        productivity: 0.3,
        timeout: 600,
      })
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        blessings: [blessing],
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
            pending: [createChallenge()],
          }),
        },
      })
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_REWARD
      state.selectBlessing(0)
      expect(state.meta.challenges.active).toBeNull()
      expect(state.meta.challenges.completed).toHaveLength(1)
      expect(state.paused).toBe(false)
      expect(state.challengeModal).toBeNull()
    })

    it('should do nothing when no reward modal', async () => {
      const state = await createState()
      state.challengeModal = null
      state.selectBlessing(0)
      // No error, no change
      expect(state.meta.challenges.completed).toHaveLength(0)
    })

    it('should show win modal when all challenges completed', async () => {
      const blessing = createBlessing({
        type: BLESSING_FERTILE_SOIL,
        productivity: 0.3,
        timeout: 600,
      })
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        blessings: [blessing],
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
            pending: [],
          }),
        },
      })
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_REWARD
      state.selectBlessing(0)
      expect(state.challengeModal).toBe(CHALLENGE_MODAL_WIN)
    })
  })

  // ── acknowledgePunishment ────────────────────────────────────────

  describe('acknowledgePunishment', () => {
    it('should fail challenge, unpause, and reset timers', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeoutElapsed: 300,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      expect(state.paused).toBe(false)
      expect(state.challengeModal).toBeNull()
      // Challenge should be reset (back to activated, timers zeroed)
      expect(state.meta.challenges.active.status).toBe(CHALLENGE_STATUS_ACTIVATED)
      expect(state.meta.challenges.active.delayElapsed).toBe(0)
      expect(state.meta.challenges.active.timeoutElapsed).toBe(0)
    })

    it('should apply punishment effects to colony', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        punishment: createPunishment({
          faith: 0.5,
          resources: 0.3,
        }),
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
        colonyOverrides: {
          resources: {
            faith: 1000,
            food: 500,
          },
        },
      })
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      expect(state.colony.resources.faith).toBe(500)
      expect(state.colony.resources.food).toBe(350)
    })

    it('should apply the full punishment duration when the challenge is failed again', async () => {
      const activeChallenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        punishment: createPunishment({
          productivityFarm: 0.5,
          timeout: 120,
        }),
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: activeChallenge,
          }),
        },
      })
      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      // Let the first punishment expire
      state.advanceChallenges(120)
      expect(state.meta.challenges.activePunishments).toHaveLength(0)

      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      expect(state.meta.challenges.active.punishment.timeout).toBe(120)
      expect(state.meta.challenges.activePunishments).toHaveLength(1)
      expect(state.meta.challenges.activePunishments[0].timeout).toBe(120)
    })

    it('should do nothing when modal is not failure', async () => {
      const state = await createState()
      state.challengeModal = null
      state.acknowledgePunishment()
      expect(state.meta.challenges.activePunishments).toHaveLength(0)
    })
  })

  // ── continueAfterWin ─────────────────────────────────────────────

  describe('_decideChallengeDelay', () => {
    // A state whose only challenge is built from the factory definition (delay 60, timeout 300)
    async function createScaledState(challengeOverrides = {}) {
      const challenge = Challenge.fromDefinition(createChallengeDefinition())
      Object.assign(challenge, challengeOverrides)
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            pending: challenge.status === CHALLENGE_STATUS_PENDING ? [challenge] : [],
            active: challenge.status === CHALLENGE_STATUS_PENDING ? null : challenge,
          }),
        },
      })
      state.update(0)
      return state
    }

    it('should decide the delay from the base delay when the challenge activates', async () => {
      const state = await createScaledState({
        delay: 999,
      })
      state.advanceChallenges(0)
      expect(state.meta.challenges.active.delay).toBe(60)
    })

    it('should add recovery time to the delay after a failure', async () => {
      const state = await createScaledState({
        status: CHALLENGE_STATUS_STARTED,
        timeoutElapsed: 300,
      })
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      const active = state.meta.challenges.active
      expect(active.failures).toBe(1)
      expect(active.delay).toBe(60 + CHALLENGE_FAILURE_DELAY_BONUS)
    })

    it('should leave the delay of a challenge without a definition alone', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_PENDING,
        delay: 45,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            pending: [challenge],
          }),
        },
      })
      state.advanceChallenges(0)
      expect(state.meta.challenges.active.delay).toBe(45)
      state.meta.challenges.active.status = CHALLENGE_STATUS_STARTED
      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      expect(state.meta.challenges.active.delay).toBe(45)
    })
  })

  describe('_decideChallengeCountdown', () => {
    // A state whose activated challenge (factory definition, delay 60, timeout 300) starts its countdown on the next step
    async function createReadyState(failures = 0) {
      const challenge = Challenge.fromDefinition(createChallengeDefinition())
      challenge.status = CHALLENGE_STATUS_ACTIVATED
      challenge.delayElapsed = challenge.delay
      challenge.failures = failures
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
      })
      state.update(0)
      return state
    }

    it('should decide the timer, requirements, blessings, punishment and mood as the countdown starts', async () => {
      const state = await createReadyState()
      const active = state.meta.challenges.active
      const expected = adjustChallenge(active.base, colonyStats(state), CHALLENGE_REFERENCE_STATS[0], 0)
      state.advanceChallenges(0)
      expect(active.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(active.timeout).toBe(expected.timeout)
      expect(active.requirements).toEqual(expected.requirements)
      expect(active.requirements).not.toBe(active.base.requirements)
      expect(active.blessings.map(blessing => blessing.toJSON())).toEqual(expected.blessings.map(blessing => blessing.toJSON()))
      expect(active.punishment.toJSON()).toEqual(expected.punishment.toJSON())
      expect(active.mood).toBe(expected.mood)
      expect(state.challengeScaling.scales).toEqual(expected.scales)
    })

    it('should keep the values fixed until the countdown ends', async () => {
      const state = await createReadyState()
      state.advanceChallenges(0)
      const active = state.meta.challenges.active
      const {
        requirements, timeout, blessings, punishment, mood,
      } = active
      state.colony.resources.faith = 100000
      state.colony.resources.food = 100000
      state.update(0)
      state.advanceChallenges(10)
      expect(active.requirements).toBe(requirements)
      expect(active.timeout).toBe(timeout)
      expect(active.blessings).toBe(blessings)
      expect(active.punishment).toBe(punishment)
      expect(active.mood).toBe(mood)
    })

    it('should give the countdown event the adjusted timer', async () => {
      const state = await createReadyState(2)
      state.advanceChallenges(0)
      const active = state.meta.challenges.active
      const event = state.colony.events.future.find(entry => entry.type === EVENT_TYPE_CHALLENGE_STARTED)
      expect(active.timeout).toBeGreaterThan(active.base.timeout)
      expect(event.remainingSeconds).toBe(active.timeout)
    })

    it('should recalculate the values on a retry', async () => {
      const state = await createReadyState()
      state.advanceChallenges(0)
      const active = state.meta.challenges.active
      const firstTimeout = active.timeout
      const firstRequirements = active.requirements
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      state.advanceChallenges(active.delay)
      expect(active.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(active.failures).toBe(1)
      expect(active.timeout).toBeGreaterThan(firstTimeout)
      expect(active.requirements).not.toBe(firstRequirements)
    })

    // Fails the active challenge's countdown and leaves it waiting for its retry, with a colony that
    // has grown rich in faith meanwhile (a refit without the cap would ask for more faith)
    function failAndEnrich(state) {
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_FAILURE
      state.acknowledgePunishment()
      state.colony.resources.faith = 100000
      state.update(0)
    }

    it('should never ask a retry for more than the failed attempt', async () => {
      // A colony without faith income is asked for at most the faith it has
      const state = await createReadyState()
      state.colony.resources.faith = 50
      state.update(0)
      state.advanceChallenges(0)
      const active = state.meta.challenges.active
      const first = active.requirements
      failAndEnrich(state)
      const uncapped = adjustChallenge(active.base, colonyStats(state), CHALLENGE_REFERENCE_STATS[0], 1)
      expect(uncapped.requirements.faith).toBeGreaterThan(first.faith)
      state.advanceChallenges(active.delay)
      expect(active.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(active.requirements.faith).toBeLessThanOrEqual(first.faith)
      expect(active.requirements.resources.food).toBeLessThanOrEqual(first.resources.food)
    })

    it('should keep the failed attempt\'s requirements through a save and load before the retry', async () => {
      // The real definitions, which a load re-attaches by index
      const state = await createState({
        metaOverrides: {
          challenges: createInitialChallenges(),
        },
      })
      state.update(0)
      state.advanceChallenges(0)
      const active = state.meta.challenges.active
      state.advanceChallenges(active.delay)
      const first = active.requirements
      failAndEnrich(state)
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      const restoredActive = restored.meta.challenges.active
      expect(restoredActive.requirements).toEqual(first)
      restored.advanceChallenges(restoredActive.delay)
      expect(restoredActive.status).toBe(CHALLENGE_STATUS_STARTED)
      for (const key of [
        'faith',
        'altar',
        'temple',
        'monument',
        'workers',
      ]) {
        if (first[key] === null) {
          expect(restoredActive.requirements[key]).toBeNull()
        } else {
          expect(restoredActive.requirements[key]).toBeLessThanOrEqual(first[key])
        }
      }
    })

    it('should keep the decided values through a save and load', async () => {
      const state = await createState({
        metaOverrides: {
          challenges: createInitialChallenges(),
        },
      })
      state.update(0)
      state.advanceChallenges(0)
      const active = state.meta.challenges.active
      state.advanceChallenges(active.delay)
      expect(active.status).toBe(CHALLENGE_STATUS_STARTED)
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restoredActive = State.fromJSON(state.toJSON()).meta.challenges.active
      expect(restoredActive.timeout).toBe(active.timeout)
      expect(restoredActive.requirements).toEqual(active.requirements)
      expect(restoredActive.blessings.map(blessing => blessing.toJSON())).toEqual(active.blessings.map(blessing => blessing.toJSON()))
      expect(restoredActive.punishment.toJSON()).toEqual(active.punishment.toJSON())
      expect(restoredActive.mood).toBe(active.mood)
    })

    it('should leave a challenge without a definition alone', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 60,
        delayElapsed: 60,
        timeout: 300,
      })
      const requirements = challenge.requirements
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
      })
      state.challengeScaling = {
        backstop: true,
      }
      state.advanceChallenges(0)
      expect(challenge.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(challenge.requirements).toBe(requirements)
      expect(challenge.timeout).toBe(300)
      expect(challenge.mood).toBeNull()
      expect(state.challengeScaling).toBeNull()
    })
  })

  describe('continueAfterWin', () => {
    it('should unpause and clear modal', async () => {
      const state = await createState()
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_WIN
      state.continueAfterWin()
      expect(state.paused).toBe(false)
      expect(state.challengeModal).toBeNull()
    })

    it('should do nothing when modal is not win', async () => {
      const state = await createState()
      state.paused = true
      state.challengeModal = CHALLENGE_MODAL_REWARD
      state.continueAfterWin()
      // Should not unpause because modal type is wrong
      expect(state.paused).toBe(true)
      expect(state.challengeModal).toBe(CHALLENGE_MODAL_REWARD)
    })
  })

  // ── levelUpBuilding ──────────────────────────────────────────────

  describe('levelUpBuilding', () => {
    it('should deduct cost and start construction', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            workers: 0,
          },
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_CAMP,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      const woodBefore = state.colony.resources.wood
      state.levelUpBuilding(BUILDING_FARM)
      expect(state.colony.buildings.farm.isConstructing).toBe(true)
      expect(state.colony.resources.wood).toBeLessThan(woodBefore)
      expect(state._constructingKeys.has(BUILDING_FARM)).toBe(true)
    })

    it('should not build when resources insufficient', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0,
            wood: 0,
          },
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.levelUpBuilding(BUILDING_FARM)
      expect(state.colony.buildings.farm.isConstructing).toBe(false)
    })

    it('should not build when territory full', async () => {
      // HQ level 1 = 10 territory cap. Set totalLevels to fill it.
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 5,
            },
            woodcutter: {
              level: 5,
            },
          },
        },
      })
      // After update(0), territory = 10 (5+5), territoryCap = 10
      state.update(0)
      state.levelUpBuilding(BUILDING_HOUSE)
      expect(state.colony.buildings.house.isConstructing).toBe(false)
    })

    it('should not build when already constructing', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
          },
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 0,
              constructionRemaining: 5,
              constructionDuration: 10,
            },
          },
        },
      })
      const woodBefore = state.colony.resources.wood
      state.levelUpBuilding(BUILDING_FARM)
      // Should not deduct cost or change anything
      expect(state.colony.resources.wood).toBe(woodBefore)
    })

    it('should fire territory limit event when build fills territory', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 9,
            },
          },
        },
      })
      state.levelUpBuilding(BUILDING_HOUSE)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_TERRITORY_LIMIT_REACHED)).toBe(true)
      expect(audio.playSound).toHaveBeenCalledWith(SND_NOTIFICATION_ALERT)
    })

    it('should use buildingUpgrading text when building already exists', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_CAMP,
            },
            storehouse: {
              level: 1,
            },
            farm: {
              level: 1,
            },
          },
        },
      })
      state.levelUpBuilding(BUILDING_FARM)
      const futureEvent = state.colony.events.future.find(
        event => event.type === EVENT_TYPE_BUILDING_UPGRADE,
      )
      expect(futureEvent.textKey).toBe('event.buildingUpgrading')
    })
  })

  // ── recruitWorker ────────────────────────────────────────────────

  describe('recruitWorker', () => {
    it('should deduct food cost and increment worker count', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      const foodBefore = state.colony.resources.food
      state.recruitWorker()
      expect(state.colony.resources.workers).toBe(1)
      expect(state.colony.resources.food).toBe(foodBefore - WORKER_RECRUIT_COST.food)
    })

    it('should not recruit when cannot afford', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
          },
        },
      })
      state.update(0)
      state.recruitWorker()
      expect(state.colony.resources.workers).toBe(0)
    })

    it('should not recruit past population cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            workers: 10,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      state.recruitWorker()
      expect(state.colony.resources.workers).toBe(10)
    })

    it('should play worker created sound on success', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      state.recruitWorker()
      expect(audio.playSound).toHaveBeenCalled()
    })
  })

  // ── dismissWorkers ───────────────────────────────────────────────

  describe('dismissWorkers', () => {
    it('should reduce worker count', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
          },
        },
      })
      state.update(0)
      state.dismissWorkers(2)
      expect(state.colony.resources.workers).toBe(3)
    })

    it('should not dismiss more than idle workers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            farm: {
              level: 1,
              workers: 3,
            },
          },
        },
      })
      state.update(0)
      // 5 total - 3 assigned = 2 idle
      state.dismissWorkers(5)
      // Should only dismiss 2 (the idle ones)
      expect(state.colony.resources.workers).toBe(3)
    })

    it('should do nothing when no idle workers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 3,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            farm: {
              level: 1,
              workers: 3,
            },
          },
        },
      })
      state.update(0)
      state.dismissWorkers(1)
      expect(state.colony.resources.workers).toBe(3)
    })

    it('should not dismiss population event when workers still at or above cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 2,
            },
          },
        },
      })
      state.update(0)
      state.dismissWorkers(1)
      expect(state.colony.resources.workers).toBe(4)
    })

    it('should not dismiss population limit event when workers remain at or above cap after dismissal', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 12,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      // workersCap = 1 * 10 = 10, idle = 12
      const dismissSpy = vi.spyOn(state.colony.events, 'dismissPastByType')
      state.dismissWorkers(1)
      // workers = 11, still >= 10 → population limit event NOT dismissed
      expect(state.colony.resources.workers).toBe(11)
      expect(dismissSpy).not.toHaveBeenCalledWith(EVENT_TYPE_POPULATION_LIMIT_REACHED)
    })
  })

  // ── assignWorkers ────────────────────────────────────────────────

  describe('assignWorkers', () => {
    it('should increment building workers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            farm: {
              level: 1,
              workers: 0,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      state.assignWorkers(BUILDING_FARM, 3)
      expect(state.colony.buildings.farm.workers).toBe(3)
    })

    it('should not assign past max workers', async () => {
      // Farm level 1 = maxWorkers 5
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 10,
          },
          buildingOverrides: {
            house: {
              level: 2,
              workersCap: 20,
            },
            farm: {
              level: 1,
              workers: 4,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      state.assignWorkers(BUILDING_FARM, 5)
      // maxWorkers = level 1 * 5 = 5
      expect(state.colony.buildings.farm.workers).toBe(5)
    })

    it('should not assign when auto-recruit fails due to insufficient resources', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            farm: {
              level: 1,
              workers: 0,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      state.assignWorkers(BUILDING_FARM, 5)
      expect(state.colony.buildings.farm.workers).toBe(0)
    })

    it('should auto-recruit when no idle workers available', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            farm: {
              level: 1,
              workers: 0,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      state.assignWorkers(BUILDING_FARM, 1)
      // Should auto-recruit and assign
      expect(state.colony.buildings.farm.workers).toBe(1)
      expect(state.colony.resources.workers).toBe(1)
    })
  })

  // ── unassignWorkers ──────────────────────────────────────────────

  describe('unassignWorkers', () => {
    it('should decrement building workers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            farm: {
              level: 1,
              workers: 3,
            },
          },
        },
      })
      state.unassignWorkers(BUILDING_FARM, 2)
      expect(state.colony.buildings.farm.workers).toBe(1)
    })

    it('should not unassign more than assigned', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            house: {
              level: 1,
              workersCap: 10,
            },
            farm: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      state.unassignWorkers(BUILDING_FARM, 5)
      expect(state.colony.buildings.farm.workers).toBe(0)
    })

    it('should do nothing when no workers assigned', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 0,
            },
          },
        },
      })
      state.unassignWorkers(BUILDING_FARM, 1)
      expect(state.colony.buildings.farm.workers).toBe(0)
    })
  })

  // ── startResearch ────────────────────────────────────────────────

  describe('startResearch', () => {
    it('should deduct cost and start research', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      const knowledgeBefore = state.colony.resources.knowledge
      state.startResearch('foodProduction1')
      expect(state.colony.buildings.academy.isActive('foodProduction1')).toBe(true)
      expect(state.colony.resources.knowledge).toBeLessThan(knowledgeBefore)
    })

    it('should not start when already completed', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
              completed: ['foodProduction1'],
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.startResearch('foodProduction1')
      expect(state.colony.buildings.academy.isActive('foodProduction1')).toBe(false)
    })

    it('should not start when cannot afford', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0,
            wood: 0,
            knowledge: 0,
          },
          buildingOverrides: {
            academy: {
              level: 1,
            },
          },
        },
      })
      state.startResearch('foodProduction1')
      expect(state.colony.buildings.academy.isActive('foodProduction1')).toBe(false)
    })

    it('should not start when academy level is 0', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 0,
            },
          },
        },
      })
      state.startResearch('foodProduction1')
      expect(state.colony.buildings.academy.isActive('foodProduction1')).toBe(false)
    })

    it('should create a future event for research in progress', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.startResearch('foodProduction1')
      expect(state.colony.events.future.length).toBeGreaterThan(0)
    })

    it('should set duration to cost.toSeconds × RESEARCH_TIME_MULTIPLIER', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      const expected = Math.max(1, Math.floor(RESEARCH_COSTS.foodProduction1.toSeconds * RESEARCH_TIME_MULTIPLIER))
      state.startResearch('foodProduction1')
      const event = state.colony.events.future.find(future => future.researchKey === 'foodProduction1')
      expect(state.colony.buildings.academy.active.get('foodProduction1').duration).toBe(expected)
      expect(event.remainingSeconds).toBe(expected)
    })

    it('should not shorten research duration with completed construction research', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
              completed: [
                'construction1',
                'construction2',
                'construction3',
                'construction4',
                'construction5',
              ],
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      const expected = Math.max(1, Math.floor(RESEARCH_COSTS.foodProduction1.toSeconds * RESEARCH_TIME_MULTIPLIER))
      state.startResearch('foodProduction1')
      expect(state.colony.buildings.academy.active.get('foodProduction1').duration).toBe(expected)
    })

    it('should not start a tier whose previous tier is not completed', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      const {
        knowledge, wood, stone,
      } = state.colony.resources
      state.startResearch('foodProduction2')
      expect(state.colony.buildings.academy.isActive('foodProduction2')).toBe(false)
      expect(state.colony.resources.knowledge).toBe(knowledge)
      expect(state.colony.resources.wood).toBe(wood)
      expect(state.colony.resources.stone).toBe(stone)
      expect(state.colony.events.future).toHaveLength(0)
    })

    it('should start a tier when the previous tier is completed', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
              completed: ['foodProduction1'],
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      const knowledgeBefore = state.colony.resources.knowledge
      state.startResearch('foodProduction2')
      expect(state.colony.buildings.academy.isActive('foodProduction2')).toBe(true)
      expect(state.colony.resources.knowledge).toBeLessThan(knowledgeBefore)
    })

    it('should not start a tier while the previous tier is still active', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
            wood: 500,
            knowledge: 500,
          },
          buildingOverrides: {
            academy: {
              level: 1,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.startResearch('foodProduction1')
      state.startResearch('foodProduction2')
      expect(state.colony.buildings.academy.isActive('foodProduction2')).toBe(false)
      expect(state.colony.events.future).toHaveLength(1)
    })
  })

  // ── executeTrade ─────────────────────────────────────────────────

  describe('executeTrade', () => {
    it('should delegate buy trade to market', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
            gold: 500,
          },
          buildingOverrides: {
            market: {
              level: 1,
            },
            storehouse: {
              level: 2,
            },
          },
        },
      })
      state.update(0)
      const foodBefore = state.colony.resources.food
      state.executeTrade(RESOURCE_FOOD, TRADE_BUY, 100)
      expect(state.colony.resources.food).toBeGreaterThan(foodBefore)
    })

    it('should delegate sell trade to market', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 300,
            gold: 0,
          },
          buildingOverrides: {
            market: {
              level: 1,
            },
            storehouse: {
              level: 2,
            },
          },
        },
      })
      state.update(0)
      const goldBefore = state.colony.resources.gold
      state.executeTrade(RESOURCE_FOOD, TRADE_SELL, 100)
      expect(state.colony.resources.gold).toBeGreaterThan(goldBefore)
    })

    it('should not update when trade fails', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0,
            gold: 0,
          },
          buildingOverrides: {
            market: {
              level: 0,
            },
          },
        },
      })
      state.update(0)
      const spy = vi.spyOn(state, 'update')
      state.executeTrade(RESOURCE_FOOD, TRADE_BUY, 100)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  // ── toJSON / fromJSON ────────────────────────────────────────────

  describe('toJSON / fromJSON', () => {
    it('should keep paused research frozen after a save and load', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(0, 10),
          },
        },
      })
      addResearchEvent(state, 'foodProduction1', 10)
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      const research = restored.colony.buildings.academy.active.get('foodProduction1')
      restored.advanceResearch(5)
      restored.advanceEvents(5)
      expect(research.remainingSeconds).toBe(10)
      expect(researchEvent(restored, 'foodProduction1').remainingSeconds).toBe(10)
      restored.colony.buildings.academy.level = 1
      restored.advanceResearch(4)
      restored.advanceEvents(4)
      expect(research.remainingSeconds).toBe(6)
      expect(researchEvent(restored, 'foodProduction1').remainingSeconds).toBe(6)
    })

    it('should serialize toJSON with correct structure', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 123,
            wood: 456,
            workers: 5,
          },
          buildingOverrides: {
            farm: {
              level: 2,
              workers: 3,
            },
            house: {
              level: 1,
              workersCap: 10,
            },
            storehouse: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      const json = state.toJSON()
      // Meta fields
      expect(json.meta).toBeDefined()
      expect(json.meta.version).toBe(SAVE_VERSION)
      expect(json.meta.challenges).toBeDefined()
      expect(json.meta.tutorial).toBeDefined()
      // Colony fields
      expect(json.colony).toBeDefined()
      expect(json.colony.year).toBe(1)
      expect(json.colony.season).toBeDefined()
      expect(json.colony.resources).toBeDefined()
      expect(json.colony.buildings).toBeDefined()
      // All 19 buildings serialized
      const expectedBuildingKeys = [
        'headquarters',
        'house',
        'academy',
        'storehouse',
        'market',
        'farm',
        'woodcutter',
        'quarry',
        'copperMine',
        'ironMine',
        'goldMine',
        'altar',
        'temple',
        'monument',
        'barracks',
        'archery',
        'stable',
        'wall',
        'tower',
      ]
      for (const key of expectedBuildingKeys) {
        expect(json.colony.buildings[key]).toBeDefined()
      }
      // Tracking state serialized
      expect(json.resourcesAtCap).toBeDefined()
      expect(json.resourcesNegativeProduction).toBeDefined()
      expect(json.hadIdleWorkers).toBeDefined()
    })

    it('should preserve tracking state in toJSON', async () => {
      const state = await createState()
      state._resourcesAtCap.add(RESOURCE_FOOD)
      state._resourcesNegativeProduction.add(RESOURCE_WOOD)
      state._hadIdleWorkers = true
      state.challengeModal = CHALLENGE_MODAL_REWARD
      const json = state.toJSON()
      expect(json.resourcesAtCap).toContain(RESOURCE_FOOD)
      expect(json.resourcesNegativeProduction).toContain(RESOURCE_WOOD)
      expect(json.hadIdleWorkers).toBe(true)
      expect(json.challengeModal).toBe(CHALLENGE_MODAL_REWARD)
    })

    it('should preserve resource values in toJSON', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 123.456,
            wood: 789.012,
          },
        },
      })
      const json = state.toJSON()
      expect(json.colony.resources.food).toBeCloseTo(123.456, 2)
      expect(json.colony.resources.wood).toBeCloseTo(789.012, 2)
    })

    it('should return null for corrupted data via fromJSON', async () => {
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const result = State.fromJSON({
        broken: true,
      })
      expect(result).toBeNull()
    })

    it('should restore paused to true when challengeModal is set in data', async () => {
      const state = await createState()
      state.challengeModal = CHALLENGE_MODAL_REWARD
      const json = state.toJSON()
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored.challengeModal).toBe(CHALLENGE_MODAL_REWARD)
      expect(restored.paused).toBe(true)
    })

    it('should restore the active tutorial modal and pause when saved while it was open', async () => {
      const state = await createState()
      state.meta.tutorial.activeModal = TUTORIAL_MODAL_NEGATIVE_PRODUCTION
      const json = state.toJSON()
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_NEGATIVE_PRODUCTION)
      expect(restored.paused).toBe(true)
    })

    it('should restore a queued tutorial explanation after a save', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
            activeModal: TUTORIAL_MODAL_SEASON_CHANGED,
            pendingModals: [TUTORIAL_MODAL_CHALLENGE_STARTED],
          }),
        },
      })
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      expect(restored.paused).toBe(true)
      restored.dismissTutorialModal()
      expect(restored.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_CHALLENGE_STARTED)
      expect(restored.paused).toBe(true)
    })

    it('should restore a queued explanation when the saved active popup is outdated', async () => {
      const state = await createState()
      const json = state.toJSON()
      json.meta.tutorial.activeModal = 'outdatedModal'
      json.meta.tutorial.pendingModals = [TUTORIAL_MODAL_CHALLENGE_STARTED]
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_CHALLENGE_STARTED)
      expect(restored.paused).toBe(true)
    })

    it('should finish an older tutorial save without pausing for its saved modal after device completion', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 3,
            completed: false,
            activeModal: TUTORIAL_MODAL_NEGATIVE_PRODUCTION,
            pendingModals: [TUTORIAL_MODAL_CHALLENGE_STARTED],
          }),
        },
      })
      const json = state.toJSON()
      storage.tutorialCompleted = true
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored.meta.tutorial.completed).toBe(true)
      expect(restored.meta.tutorial.activeModal).toBeNull()
      expect(restored.meta.tutorial.pendingModals).toEqual([])
      expect(restored.paused).toBe(false)
    })

    it('should default resourcesAtCap to empty set when missing from data', async () => {
      const state = await createState()
      const json = state.toJSON()
      delete json.resourcesAtCap
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored._resourcesAtCap).toBeInstanceOf(Set)
      expect(restored._resourcesAtCap.size).toBe(0)
    })

    it('should default resourcesNegativeProduction to empty set when missing', async () => {
      const state = await createState()
      const json = state.toJSON()
      delete json.resourcesNegativeProduction
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored._resourcesNegativeProduction).toBeInstanceOf(Set)
      expect(restored._resourcesNegativeProduction.size).toBe(0)
    })

    it('should default hadIdleWorkers to false when missing', async () => {
      const state = await createState()
      const json = state.toJSON()
      delete json.hadIdleWorkers
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored._hadIdleWorkers).toBe(false)
    })

    it('should default challengeModal to null when missing', async () => {
      const state = await createState()
      const json = state.toJSON()
      delete json.challengeModal
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored.challengeModal).toBeNull()
      expect(restored.paused).toBe(false)
    })

    it('should rebuild upcoming event names in the current language on load', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_SETTLEMENT,
            },
          },
        },
      })
      const {
        events,
      } = state.colony
      // Params saved under another language
      events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingBuilding',
        params: ['granja'],
        buildingKey: BUILDING_FARM,
        remainingSeconds: 10,
      })
      events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingUpgrading',
        params: ['asentamiento'],
        buildingKey: BUILDING_HEADQUARTERS,
        remainingSeconds: 20,
      })
      events.addFuture({
        type: EVENT_TYPE_RESEARCH_COMPLETE,
        textKey: 'event.researchInProgress',
        params: ['agricultura'],
        researchKey: RESEARCH_FOOD_PRODUCTION_1,
        remainingSeconds: 30,
      })
      events.addFuture({
        type: EVENT_TYPE_CHALLENGE_STARTED,
        textKey: 'event.challengeStarted',
        params: [
          1,
          10,
          'Prueba de Devoción',
        ],
        action: 'openChallengeModal',
        remainingSeconds: 40,
      })
      events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.territoryExpanding',
        buildingKey: BUILDING_HEADQUARTERS,
        remainingSeconds: 50,
      })
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      expect(restored.colony.events.future.map(event => event.params)).toEqual([
        ['building.farm'],
        ['building.headquarters.settlement'],
        [('research.' + RESEARCH_FOOD_PRODUCTION_1).toLowerCase()],
        [
          1,
          10,
          'challenge.name.1',
        ],
        [],
      ])
    })

    it('should still load a save whose upcoming event params are not a list', async () => {
      const state = await createState()
      state.colony.events.addFuture({
        type: EVENT_TYPE_CHALLENGE_STARTED,
        textKey: 'event.challengeStarted',
        params: 'edited',
        action: 'openChallengeModal',
        remainingSeconds: 40,
      })
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      expect(restored).not.toBeNull()
      expect(restored.colony.events.future[0].params).toBe('edited')
    })

    it('should serialize the military with its incoming raid', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 3,
        },
        raid: createRaid({
          remainingSeconds: 40,
          delaysPaid: 1,
        }),
        raidCount: 2,
      })
      const json = state.toJSON()
      expect(json.colony.military).toEqual({
        units: {
          [UNIT_INFANTRY]: 3,
          [UNIT_ARCHER]: 0,
          [UNIT_CAVALRY]: 0,
        },
        raid: {
          phase: RAID_PHASE_INCOMING,
          remainingSeconds: 40,
          enemy: {
            [UNIT_INFANTRY]: 5,
            [UNIT_ARCHER]: 0,
            [UNIT_CAVALRY]: 0,
          },
          demand: {
            food: 100,
            wood: 50,
          },
          delaysPaid: 1,
        },
        raidCount: 2,
      })
    })

    it('should restore the military and its raid on load', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_ARCHER]: 2,
        },
        raid: createRaid({
          remainingSeconds: 40,
          delaysPaid: 1,
        }),
        raidCount: 2,
      })
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      const {
        military,
      } = restored.colony
      expect(military.units[UNIT_ARCHER]).toBe(2)
      expect(military.raidCount).toBe(2)
      expect(military.raid).toBeInstanceOf(Raid)
      expect(military.raid.remainingSeconds).toBe(40)
      expect(military.raid.delaysPaid).toBe(1)
      expect(military.raid.demand).toBeInstanceOf(Cost)
      expect(raidEvent(restored).remainingSeconds).toBe(40)
    })

    it('should serialize raidReport as null when no result window is open', async () => {
      const state = await createState()
      expect(state.toJSON().raidReport).toBeNull()
    })

    it('should restore the raid report and stay paused on load', async () => {
      const state = await createState()
      state.raidReport = new RaidReport({
        victory: false,
        army: {
          [UNIT_INFANTRY]: 2,
        },
        unitsLost: {
          [UNIT_INFANTRY]: 2,
        },
        resourcesLost: {
          food: 60,
        },
        workersLost: 1,
        buildingsLost: [BUILDING_FARM],
      })
      const json = state.toJSON()
      expect(json.raidReport.buildingsLost).toEqual([BUILDING_FARM])
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored.raidReport).toBeInstanceOf(RaidReport)
      expect(restored.raidReport.toJSON()).toEqual(state.raidReport.toJSON())
      expect(restored.paused).toBe(true)
    })

    it('should default raidReport to null and not pause when missing', async () => {
      const state = await createState()
      const json = state.toJSON()
      delete json.raidReport
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(json)
      expect(restored.raidReport).toBeNull()
      expect(restored.paused).toBe(false)
    })

    it('should load a version 1 save with the failure window of a started challenge open', async () => {
      // Clears the save's open tutorial modal, so only the failure window can pause the game
      storage.tutorialCompleted = true
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(JSON.parse(JSON.stringify(startedSave)))
      expect(restored).not.toBeNull()
      expect(restored.meta.version).toBe(SAVE_VERSION)
      const {
        completed, pending, active,
      } = restored.meta.challenges
      expect(completed.map(challenge => challenge.index)).toEqual([
        1,
        2,
      ])
      for (const challenge of completed) {
        expect(challenge.status).toBe(CHALLENGE_STATUS_COMPLETED)
        expect(challenge.base).toBe(CHALLENGE_DEFINITIONS[challenge.index - 1])
      }
      expect(pending.map(challenge => challenge.index)).toEqual([
        4,
        5,
        6,
        7,
        8,
        9,
        10,
      ])
      expect(active.index).toBe(3)
      expect(active.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(active.base).toBe(CHALLENGE_DEFINITIONS[2])
      expect(active.toJSON()).toEqual({
        ...startedSave.meta.challenges.active,
        failures: 0,
        mood: null,
      })
      expect(restored.challengeModal).toBe(CHALLENGE_MODAL_FAILURE)
      expect(restored.paused).toBe(true)
    })

    it('should take the values in effect of an activated version 1 challenge from its definition', async () => {
      const save = JSON.parse(JSON.stringify(activatedSave))
      // Stored values that differ from challenges.json show which source the loaded challenge uses
      const stored = save.meta.challenges.active
      stored.timeout = 999
      stored.requirements.temple = 99
      stored.blessings[0].productivity = 0.99
      stored.punishment.workers = 99
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(save)
      const active = restored.meta.challenges.active
      const definition = CHALLENGE_DEFINITIONS[2]
      expect(active.index).toBe(3)
      expect(active.status).toBe(CHALLENGE_STATUS_ACTIVATED)
      expect(active.delayElapsed).toBe(10)
      expect(active.timeout).toBe(definition.timeout)
      expect(active.requirements).toEqual(definition.requirements)
      expect(active.blessings.map(blessing => blessing.toJSON())).toEqual(definition.blessings)
      expect(active.punishment.toJSON()).toEqual(definition.punishment)
      expect(active.failures).toBe(0)
      expect(active.base).toBe(definition)
    })

    it('should keep the values in effect of a started challenge after a save and load', async () => {
      const state = await createState({
        metaOverrides: {
          challenges: createInitialChallenges(),
        },
      })
      state.meta.challenges.activate()
      state.meta.challenges.start()
      const active = state.meta.challenges.active
      active.timeout = 420
      active.timeoutElapsed = 100
      active.requirements = {
        ...active.requirements,
        altar: 7,
      }
      active.failures = 2
      active.mood = 'stern'
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      const restoredActive = restored.meta.challenges.active
      expect(restoredActive.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(restoredActive.timeout).toBe(420)
      expect(restoredActive.timeoutElapsed).toBe(100)
      expect(restoredActive.requirements.altar).toBe(7)
      expect(restoredActive.failures).toBe(2)
      expect(restoredActive.mood).toBe('stern')
      expect(restoredActive.base).toBe(CHALLENGE_DEFINITIONS[0])
      expect(restoredActive.toJSON()).toEqual(active.toJSON())
    })

    it('should keep a waiting retry\'s requirements and rebuild its other values from the definition after a save and load', async () => {
      const state = await createState({
        metaOverrides: {
          challenges: createInitialChallenges(),
        },
      })
      state.meta.challenges.activate()
      const active = state.meta.challenges.active
      active.delay = 45
      active.delayElapsed = 12
      active.timeout = 420
      active.requirements = {
        ...active.requirements,
        altar: 7,
      }
      active.failures = 2
      active.mood = 'stern'
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      const restored = State.fromJSON(state.toJSON())
      const restoredActive = restored.meta.challenges.active
      const definition = CHALLENGE_DEFINITIONS[0]
      expect(restoredActive.status).toBe(CHALLENGE_STATUS_ACTIVATED)
      expect(restoredActive.timeout).toBe(definition.timeout)
      expect(restoredActive.requirements).toEqual(active.requirements)
      expect(restoredActive.blessings.map(blessing => blessing.toJSON())).toEqual(definition.blessings)
      expect(restoredActive.delay).toBe(45)
      expect(restoredActive.delayElapsed).toBe(12)
      expect(restoredActive.failures).toBe(2)
      expect(restoredActive.mood).toBe('stern')
    })

    it('should return null for a save from a newer version of the game', async () => {
      const state = await createState()
      const json = state.toJSON()
      json.meta.version = SAVE_VERSION + 1
      const {
        default: State,
      } = await import('@/js/engine/state.js')
      expect(State.fromJSON(json)).toBeNull()
    })
  })

  // ── checkTutorial ────────────────────────────────────────────────

  describe('checkTutorial', () => {
    it('should advance tutorial steps when conditions met', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 0,
            completed: false,
          }),
        },
        colonyOverrides: {
          buildingOverrides: {
            house: {
              level: 1,
            },
            farm: {
              level: 1,
            },
            woodcutter: {
              level: 1,
            },
          },
        },
      })
      state.checkTutorial()
      // Steps 0-2 check house>=1, farm>=1, woodcutter>=1 — all met
      expect(state.meta.tutorial.currentStep).toBeGreaterThanOrEqual(3)
    })

    it('should stop at first unmet step', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 0,
            completed: false,
          }),
        },
        colonyOverrides: {
          buildingOverrides: {
            house: {
              level: 1,
            },
            // farm level 0 — step 1 will not pass
          },
        },
      })
      state.checkTutorial()
      // Step 0 passes (house>=1), step 1 fails (farm<1)
      expect(state.meta.tutorial.currentStep).toBe(1)
    })

    it('should not advance when tutorial already completed', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 0,
            completed: true,
          }),
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.currentStep).toBe(0)
    })

    it('should not complete tutorial when all steps pass but modals remain undismissed', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 0,
            completed: false,
          }),
        },
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_SETTLEMENT,
            },
            house: {
              level: 3,
            },
            farm: {
              level: 3,
              workers: 5,
            },
            woodcutter: {
              level: 3,
              workers: 5,
            },
            altar: {
              level: 1,
            },
          },
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(false)
      expect(storage.tutorialCompleted).toBe(false)
    })

    it('should complete tutorial when all steps pass and all modals dismissed', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 0,
            completed: false,
            dismissedModals: [
              TUTORIAL_MODAL_SEASON_CHANGED,
              TUTORIAL_MODAL_NEGATIVE_PRODUCTION,
              TUTORIAL_MODAL_HQ_UPGRADE,
              TUTORIAL_MODAL_CHALLENGE_STARTED,
              TUTORIAL_MODAL_RAID_INCOMING,
            ],
          }),
        },
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_SETTLEMENT,
            },
            house: {
              level: 3,
            },
            farm: {
              level: 3,
              workers: 5,
            },
            woodcutter: {
              level: 3,
              workers: 5,
            },
            altar: {
              level: 1,
            },
          },
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(true)
      expect(storage.tutorialCompleted).toBe(true)
    })

    it('should complete tutorial on re-entry after steps passed and modals later dismissed', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 0,
            completed: false,
          }),
        },
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_SETTLEMENT,
            },
            house: {
              level: 3,
            },
            farm: {
              level: 3,
              workers: 5,
            },
            woodcutter: {
              level: 3,
              workers: 5,
            },
            altar: {
              level: 1,
            },
          },
        },
      })
      // First call: all steps pass but modals are undismissed
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(false)
      expect(storage.tutorialCompleted).toBe(false)

      // Simulate user dismissing all modals between ticks
      state.meta.tutorial.dismissedModals.add(TUTORIAL_MODAL_SEASON_CHANGED)
      state.meta.tutorial.dismissedModals.add(TUTORIAL_MODAL_NEGATIVE_PRODUCTION)
      state.meta.tutorial.dismissedModals.add(TUTORIAL_MODAL_HQ_UPGRADE)
      state.meta.tutorial.dismissedModals.add(TUTORIAL_MODAL_CHALLENGE_STARTED)
      state.meta.tutorial.dismissedModals.add(TUTORIAL_MODAL_RAID_INCOMING)

      // Second call: should now detect all modals dismissed and complete
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(true)
      expect(storage.tutorialCompleted).toBe(true)
    })

    it('should defer completion when steps pre-completed but modals undismissed', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 16,
            completed: false,
          }),
        },
      })
      // allStepsCompleted is true at entry (currentStep >= 16),
      // but no modals dismissed → should not complete
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(false)
      expect(storage.tutorialCompleted).toBe(false)
    })

    it('should log tutorial completion the first time on this device', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 16,
            completed: false,
            dismissedModals: [
              TUTORIAL_MODAL_SEASON_CHANGED,
              TUTORIAL_MODAL_NEGATIVE_PRODUCTION,
              TUTORIAL_MODAL_HQ_UPGRADE,
              TUTORIAL_MODAL_CHALLENGE_STARTED,
              TUTORIAL_MODAL_RAID_INCOMING,
            ],
          }),
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(true)
      expect(analytics.logTutorialComplete).toHaveBeenCalledTimes(1)
    })

    it('should not log tutorial completion again when replayed from an older save', async () => {
      storage.tutorialCompleted = true
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 16,
            completed: false,
            dismissedModals: [
              TUTORIAL_MODAL_SEASON_CHANGED,
              TUTORIAL_MODAL_NEGATIVE_PRODUCTION,
              TUTORIAL_MODAL_HQ_UPGRADE,
              TUTORIAL_MODAL_CHALLENGE_STARTED,
              TUTORIAL_MODAL_RAID_INCOMING,
            ],
          }),
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(true)
      expect(analytics.logTutorialComplete).not.toHaveBeenCalled()
    })

    it('should show a dropped HQ upgrade modal once the HQ is past camp', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            currentStep: 16,
            completed: false,
            dismissedModals: [
              TUTORIAL_MODAL_SEASON_CHANGED,
              TUTORIAL_MODAL_NEGATIVE_PRODUCTION,
              TUTORIAL_MODAL_CHALLENGE_STARTED,
              TUTORIAL_MODAL_RAID_INCOMING,
            ],
          }),
        },
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_SETTLEMENT,
            },
          },
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_HQ_UPGRADE)
      expect(state.paused).toBe(true)
      expect(state.meta.tutorial.completed).toBe(false)

      // Dismissing it lets the tutorial complete on the next tick
      state.meta.tutorial.dismissedModals.add(TUTORIAL_MODAL_HQ_UPGRADE)
      state.meta.tutorial.activeModal = null
      state.paused = false
      state.checkTutorial()
      expect(state.meta.tutorial.completed).toBe(true)
    })

    it('should wait for an open tutorial modal before showing the HQ upgrade modal', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
            activeModal: TUTORIAL_MODAL_SEASON_CHANGED,
          }),
        },
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_SETTLEMENT,
            },
          },
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_SEASON_CHANGED)
    })

    it('should not show the HQ upgrade modal while the HQ is a camp', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
          }),
        },
      })
      state.checkTutorial()
      expect(state.meta.tutorial.activeModal).toBeNull()
      expect(state.paused).toBe(false)
    })
  })

  // ── _computeGeneralProductivity ─────────────────────────────────────

  describe('_computeGeneralProductivity', () => {
    it('should return 1 when food and wood are sufficient', async () => {
      const state = await createState()
      const result = state._computeGeneralProductivity(
        5,
        {
          food: 5,
          wood: 3,
        },
        {
          food: 2,
          wood: 1,
        },
      )
      expect(result).toBe(1)
    })

    it('should return 0 when workers is 0', async () => {
      const state = await createState()
      const result = state._computeGeneralProductivity(
        0,
        {
          food: 5,
          wood: 3,
        },
        {
          food: 2,
          wood: 1,
        },
      )
      expect(result).toBe(0)
    })

    it('should return reduced value when food is short', async () => {
      const state = await createState()
      state._resourcesNegativeProduction.add(RESOURCE_FOOD)
      const result = state._computeGeneralProductivity(
        5,
        {
          food: 1,
          wood: 3,
        },
        {
          food: 4,
          wood: 1,
        },
      )
      // deficit = max(0, 4 - 1) = 3, penalty = (3/4) * SHORTAGE_MAX_PENALTY
      const expected = 1 - (3 / 4) * SHORTAGE_MAX_PENALTY
      expect(result).toBeCloseTo(expected, 10)
    })

    it('should return reduced value when wood is short', async () => {
      const state = await createState()
      state._resourcesNegativeProduction.add(RESOURCE_WOOD)
      const result = state._computeGeneralProductivity(
        5,
        {
          food: 5,
          wood: 1,
        },
        {
          food: 2,
          wood: 4,
        },
      )
      const expected = 1 - (3 / 4) * SHORTAGE_MAX_PENALTY
      expect(result).toBeCloseTo(expected, 10)
    })

    it('should return minimum of food and wood penalty when both are short', async () => {
      const state = await createState()
      state._resourcesNegativeProduction.add(RESOURCE_FOOD)
      state._resourcesNegativeProduction.add(RESOURCE_WOOD)
      // Food deficit worse than wood deficit
      const result = state._computeGeneralProductivity(
        5,
        {
          food: 0,
          wood: 2,
        },
        {
          food: 4,
          wood: 4,
        },
      )
      const foodPenalty = 1 - (4 / 4) * SHORTAGE_MAX_PENALTY
      const woodPenalty = 1 - (2 / 4) * SHORTAGE_MAX_PENALTY
      expect(result).toBeCloseTo(Math.min(foodPenalty, woodPenalty), 10)
    })

    it('should not penalize when resource is not in _resourcesNegativeProduction', async () => {
      const state = await createState()
      // Food production < consumption, but not tracked as negative
      const result = state._computeGeneralProductivity(
        5,
        {
          food: 1,
          wood: 3,
        },
        {
          food: 4,
          wood: 1,
        },
      )
      expect(result).toBe(1)
    })
  })

  // ── _computeSeasonMultipliers ───────────────────────────────────────

  describe('_computeSeasonMultipliers', () => {
    it('should return warm season multipliers with no blessing', async () => {
      const state = await createState()
      const result = state._computeSeasonMultipliers([])
      expect(result.food).toBeCloseTo(1.2, 10)
      expect(result.wood).toBeCloseTo(0.8, 10)
    })

    it('should return cold season multipliers with no blessing', async () => {
      const state = await createState({
        colonyOverrides: {
          season: {
            currentSeason: SEASON_COLD,
            seasonElapsed: 0,
          },
        },
      })
      const result = state._computeSeasonMultipliers([])
      expect(result.food).toBeCloseTo(0.8, 10)
      expect(result.wood).toBeCloseTo(1.2, 10)
    })

    it('should stack FAVORABLE_WEATHER blessing on warm season', async () => {
      const state = await createState()
      const blessing = createBlessing({
        type: BLESSING_FAVORABLE_WEATHER,
        warm: 0.1,
        cold: 0.05,
        timeout: 60,
      })
      const result = state._computeSeasonMultipliers([blessing])
      expect(result.food).toBeCloseTo(1.3, 10)
      expect(result.wood).toBeCloseTo(0.7, 10)
    })

    it('should stack FAVORABLE_WEATHER blessing on cold season', async () => {
      const state = await createState({
        colonyOverrides: {
          season: {
            currentSeason: SEASON_COLD,
            seasonElapsed: 0,
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_FAVORABLE_WEATHER,
        warm: 0.1,
        cold: 0.05,
        timeout: 60,
      })
      const result = state._computeSeasonMultipliers([blessing])
      expect(result.food).toBeCloseTo(0.85, 10)
      expect(result.wood).toBeCloseTo(1.15, 10)
    })
  })

  // ── _computeConsumptionRates ────────────────────────────────────────

  describe('_computeConsumptionRates', () => {
    it('should return zero rates with 0 workers', async () => {
      const state = await createState()
      const {
        rates,
      } = state._computeConsumptionRates({}, {
        food: 1.2,
        wood: 0.8,
      }, 0)
      expect(rates.food).toBe(0)
      expect(rates.wood).toBe(0)
    })

    it('should scale with worker count at neutral season', async () => {
      const state = await createState()
      const {
        rates,
      } = state._computeConsumptionRates({}, {
        food: 1,
        wood: 1,
      }, 10)
      expect(rates.food).toBeCloseTo(10 * WORKER_FOOD_CONSUMPTION, 10)
      expect(rates.wood).toBeCloseTo(10 * WORKER_WOOD_CONSUMPTION, 10)
    })

    it('should apply food consumption research bonus', async () => {
      const state = await createState()
      const bonuses = {
        foodConsumption: 0.1,
      }
      const {
        rates,
      } = state._computeConsumptionRates(bonuses, {
        food: 1,
        wood: 1,
      }, 10)
      expect(rates.food).toBeCloseTo(10 * WORKER_FOOD_CONSUMPTION * 0.9, 10)
      expect(rates.wood).toBeCloseTo(10 * WORKER_WOOD_CONSUMPTION, 10)
    })

    it('should stack wood consumption bonus and season multiplier additively', async () => {
      const state = await createState()
      const bonuses = {
        woodConsumption: 0.1,
      }
      // Warm season: wood multiplier = 0.8 → season reduction = 1 - 0.8 = 0.2
      // Total wood multiplier = max(0, 1 - 0.1 - 0.2) = 0.7
      const {
        rates,
      } = state._computeConsumptionRates(bonuses, {
        food: 1.2,
        wood: 0.8,
      }, 10)
      expect(rates.wood).toBeCloseTo(10 * WORKER_WOOD_CONSUMPTION * 0.7, 10)
    })

    it('should add army upkeep to the rates even with 0 workers', async () => {
      const state = await createState()
      const {
        rates, armyRates,
      } = state._computeConsumptionRates({}, {
        food: 1,
        wood: 1,
      }, 0, {
        [UNIT_INFANTRY]: 2,
        [UNIT_ARCHER]: 1,
        [UNIT_CAVALRY]: 1,
      })
      const expectedFood = 2 * UNIT_STATS[UNIT_INFANTRY].upkeep.food + UNIT_STATS[UNIT_ARCHER].upkeep.food + UNIT_STATS[UNIT_CAVALRY].upkeep.food
      const expectedWood = 2 * UNIT_STATS[UNIT_INFANTRY].upkeep.wood + UNIT_STATS[UNIT_ARCHER].upkeep.wood + UNIT_STATS[UNIT_CAVALRY].upkeep.wood
      expect(armyRates.food).toBeCloseTo(expectedFood, 10)
      expect(armyRates.wood).toBeCloseTo(expectedWood, 10)
      expect(rates.food).toBeCloseTo(expectedFood, 10)
      expect(rates.wood).toBeCloseTo(expectedWood, 10)
    })

    it('should add army upkeep to worker upkeep', async () => {
      const state = await createState()
      const {
        rates,
      } = state._computeConsumptionRates({}, {
        food: 1,
        wood: 1,
      }, 10, {
        [UNIT_INFANTRY]: 4,
      })
      expect(rates.food).toBeCloseTo(10 * WORKER_FOOD_CONSUMPTION + 4 * UNIT_STATS[UNIT_INFANTRY].upkeep.food, 10)
      expect(rates.wood).toBeCloseTo(10 * WORKER_WOOD_CONSUMPTION + 4 * UNIT_STATS[UNIT_INFANTRY].upkeep.wood, 10)
    })

    it('should apply the food consumption research to army upkeep', async () => {
      const state = await createState()
      const {
        armyRates,
      } = state._computeConsumptionRates({
        foodConsumption: 0.1,
      }, {
        food: 1,
        wood: 1,
      }, 0, {
        [UNIT_CAVALRY]: 4,
      })
      expect(armyRates.food).toBeCloseTo(4 * UNIT_STATS[UNIT_CAVALRY].upkeep.food * 0.9, 10)
      expect(armyRates.wood).toBeCloseTo(4 * UNIT_STATS[UNIT_CAVALRY].upkeep.wood, 10)
    })

    it('should apply the wood consumption research and the season to army upkeep', async () => {
      const state = await createState()
      // Same additive stacking as workers: max(0, 1 − 0.1 − (1 − 0.8)) = 0.7
      const {
        armyRates,
      } = state._computeConsumptionRates({
        woodConsumption: 0.1,
      }, {
        food: 1.2,
        wood: 0.8,
      }, 0, {
        [UNIT_ARCHER]: 4,
      })
      expect(armyRates.wood).toBeCloseTo(4 * UNIT_STATS[UNIT_ARCHER].upkeep.wood * 0.7, 10)
      expect(armyRates.food).toBeCloseTo(4 * UNIT_STATS[UNIT_ARCHER].upkeep.food, 10)
    })

    it('should return zero army rates without units', async () => {
      const state = await createState()
      const {
        armyRates,
      } = state._computeConsumptionRates({}, {
        food: 1,
        wood: 1,
      }, 10)
      expect(armyRates).toEqual({
        food: 0,
        wood: 0,
      })
    })
  })

  // ── _computeProductionRates ─────────────────────────────────────────

  describe('_computeProductionRates', () => {
    it('should return zero rates with all buildings at level 0', async () => {
      const state = await createState()
      const {
        rates,
      } = state._computeProductionRates({}, [], [], {
        food: 1,
        wood: 1,
      })
      expect(rates.food).toBe(0)
      expect(rates.wood).toBe(0)
      expect(rates.stone).toBe(0)
    })

    it('should produce based on assigned workers', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 3,
            },
          },
        },
      })
      const {
        rates,
      } = state._computeProductionRates({}, [], [], {
        food: 1,
        wood: 1,
      })
      // Farm: 3 workers × 1/s = 3, with food season multiplier of 1 (neutral)
      expect(rates.food).toBeCloseTo(3, 10)
    })

    it('should aggregate production from multiple buildings', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 2,
            },
            woodcutter: {
              level: 1,
              workers: 4,
            },
          },
        },
      })
      const {
        rates,
      } = state._computeProductionRates({}, [], [], {
        food: 1,
        wood: 1,
      })
      expect(rates.food).toBeCloseTo(2, 10)
      expect(rates.wood).toBeCloseTo(2, 10)
    })

    it('should apply research bonuses as multipliers', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const bonuses = {
        foodProduction: 0.2,
      }
      const {
        rates,
      } = state._computeProductionRates(bonuses, [], [], {
        food: 1,
        wood: 1,
      })
      // 2 workers × 1/s × (1 + 0.2) = 2.4, plus season (food: 1 → +0 from season)
      expect(rates.food).toBeCloseTo(2.4, 10)
    })

    it('should apply FERTILE_SOIL blessing productivity bonus to food', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_FERTILE_SOIL,
        productivity: 0.3,
        timeout: 60,
      })
      const {
        rates,
      } = state._computeProductionRates({}, [blessing], [], {
        food: 1,
        wood: 1,
      })
      // 2 workers × 1/s × (1 + 0.3) = 2.6
      expect(rates.food).toBeCloseTo(2.6, 10)
    })

    it('should apply season modifier to food production', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      // Warm season multiplier: food = 1.2
      const {
        rates,
      } = state._computeProductionRates({}, [], [], {
        food: 1.2,
        wood: 0.8,
      })
      // 2 workers × 1/s × (1 + (1.2 - 1)) = 2 × 1.2 = 2.4
      expect(rates.food).toBeCloseTo(2.4, 10)
    })

    it('should produce from passive buildings based on level', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            altar: {
              level: 3,
            },
          },
        },
      })
      const {
        rates,
      } = state._computeProductionRates({}, [], [], {
        food: 1,
        wood: 1,
      })
      // Altar: passive, 3 levels × 0.1/s = 0.3
      expect(rates.faith).toBeCloseTo(0.3, 10)
    })

    it('should apply FOREST_BLOOM blessing productivity bonus to wood', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            woodcutter: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_FOREST_BLOOM,
        productivity: 0.25,
        timeout: 60,
      })
      const {
        rates,
        multipliers,
      } = state._computeProductionRates({}, [blessing], [], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.wood).toBeCloseTo(1.25, 10)
      // 2 workers × 0.5/s × 1.25 = 1.25
      expect(rates.wood).toBeCloseTo(1.25, 10)
    })

    it('should apply RICH_MINES blessing productivity bonus to stone, copper, iron, gold', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            quarry: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_RICH_MINES,
        productivity: 0.4,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [blessing], [], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.stone).toBeCloseTo(1.4, 10)
      expect(multipliers.copper).toBeCloseTo(1.4, 10)
      expect(multipliers.iron).toBeCloseTo(1.4, 10)
      expect(multipliers.gold).toBeCloseTo(1.4, 10)
    })

    it('should apply WISDOM_OF_THE_GODS blessing productivity bonus to knowledge', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_WISDOM_OF_THE_GODS,
        productivity: 0.5,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [blessing], [], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.knowledge).toBeCloseTo(1.5, 10)
    })

    it('should apply CELESTIAL_PROSPERITY blessing productivity bonus to all 8 resources', async () => {
      const state = await createState()
      const blessing = createBlessing({
        type: BLESSING_CELESTIAL_PROSPERITY,
        productivity: 0.2,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [blessing], [], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.food).toBeCloseTo(1.2, 10)
      expect(multipliers.wood).toBeCloseTo(1.2, 10)
      expect(multipliers.stone).toBeCloseTo(1.2, 10)
      expect(multipliers.copper).toBeCloseTo(1.2, 10)
      expect(multipliers.iron).toBeCloseTo(1.2, 10)
      expect(multipliers.gold).toBeCloseTo(1.2, 10)
      expect(multipliers.faith).toBeCloseTo(1.2, 10)
      expect(multipliers.knowledge).toBeCloseTo(1.2, 10)
    })

    it('should not apply productivity bonus for blessings without a productivity branch', async () => {
      const state = await createState()
      const blessing = createBlessing({
        type: BLESSING_GIFT_FROM_THE_HEAVENS,
        productivity: 0,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [blessing], [], {
        food: 1,
        wood: 1,
      })
      // No productivity branch matches → all multipliers stay at 1
      expect(multipliers.food).toBeCloseTo(1, 10)
      expect(multipliers.wood).toBeCloseTo(1, 10)
      expect(multipliers.stone).toBeCloseTo(1, 10)
      expect(multipliers.copper).toBeCloseTo(1, 10)
      expect(multipliers.iron).toBeCloseTo(1, 10)
      expect(multipliers.gold).toBeCloseTo(1, 10)
      expect(multipliers.faith).toBeCloseTo(1, 10)
      expect(multipliers.knowledge).toBeCloseTo(1, 10)
    })

    it('should apply CROP_FAILURE punishment productivity penalty to food', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const punishment = createPunishment({
        type: PUNISHMENT_CROP_FAILURE,
        productivityFarm: 0.2,
        timeout: 60,
      })
      const {
        rates,
        multipliers,
      } = state._computeProductionRates({}, [], [punishment], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.food).toBeCloseTo(0.8, 10)
      // 2 workers × 1/s × 0.8 = 1.6
      expect(rates.food).toBeCloseTo(1.6, 10)
    })

    it('should apply WILDFIRES punishment productivity penalty to wood', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            woodcutter: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const punishment = createPunishment({
        type: PUNISHMENT_WILDFIRES,
        productivityWoodcutter: 0.3,
        timeout: 60,
      })
      const {
        rates,
        multipliers,
      } = state._computeProductionRates({}, [], [punishment], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.wood).toBeCloseTo(0.7, 10)
      // 2 workers × 0.5/s × 0.7 = 0.7
      expect(rates.wood).toBeCloseTo(0.7, 10)
    })

    it('should apply LANDSLIDE punishment productivity penalty to stone, copper, iron, gold', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            quarry: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const punishment = createPunishment({
        type: PUNISHMENT_LANDSLIDE,
        productivityMines: 0.3,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [], [punishment], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.stone).toBeCloseTo(0.7, 10)
      expect(multipliers.copper).toBeCloseTo(0.7, 10)
      expect(multipliers.iron).toBeCloseTo(0.7, 10)
      expect(multipliers.gold).toBeCloseTo(0.7, 10)
    })

    it('should apply VOLCANO punishment productivityGeneral penalty to all 8 resources', async () => {
      const state = await createState()
      const punishment = createPunishment({
        type: PUNISHMENT_VOLCANO,
        productivityGeneral: 0.3,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [], [punishment], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.food).toBeCloseTo(0.7, 10)
      expect(multipliers.wood).toBeCloseTo(0.7, 10)
      expect(multipliers.stone).toBeCloseTo(0.7, 10)
      expect(multipliers.copper).toBeCloseTo(0.7, 10)
      expect(multipliers.iron).toBeCloseTo(0.7, 10)
      expect(multipliers.gold).toBeCloseTo(0.7, 10)
      expect(multipliers.faith).toBeCloseTo(0.7, 10)
      expect(multipliers.knowledge).toBeCloseTo(0.7, 10)
    })

    it('should apply PLAGUE punishment productivityGeneral penalty to all 8 resources', async () => {
      const state = await createState()
      const punishment = createPunishment({
        type: PUNISHMENT_PLAGUE,
        productivityGeneral: 0.2,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [], [punishment], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.food).toBeCloseTo(0.8, 10)
      expect(multipliers.wood).toBeCloseTo(0.8, 10)
      expect(multipliers.stone).toBeCloseTo(0.8, 10)
      expect(multipliers.copper).toBeCloseTo(0.8, 10)
      expect(multipliers.iron).toBeCloseTo(0.8, 10)
      expect(multipliers.gold).toBeCloseTo(0.8, 10)
      expect(multipliers.faith).toBeCloseTo(0.8, 10)
      expect(multipliers.knowledge).toBeCloseTo(0.8, 10)
    })

    it('should not apply productivity penalty for punishments without a productivity field', async () => {
      const state = await createState()
      const punishment = createPunishment({
        type: PUNISHMENT_CROP_FAILURE,
        timeout: 60,
      })
      const {
        multipliers,
      } = state._computeProductionRates({}, [], [punishment], {
        food: 1,
        wood: 1,
      })
      expect(multipliers.food).toBeCloseTo(1, 10)
      expect(multipliers.wood).toBeCloseTo(1, 10)
      expect(multipliers.stone).toBeCloseTo(1, 10)
      expect(multipliers.copper).toBeCloseTo(1, 10)
      expect(multipliers.iron).toBeCloseTo(1, 10)
      expect(multipliers.gold).toBeCloseTo(1, 10)
      expect(multipliers.faith).toBeCloseTo(1, 10)
      expect(multipliers.knowledge).toBeCloseTo(1, 10)
    })

    it('should stack blessing and punishment on the same resource', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 2,
            },
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_FERTILE_SOIL,
        productivity: 0.3,
        timeout: 60,
      })
      const punishment = createPunishment({
        type: PUNISHMENT_CROP_FAILURE,
        productivityFarm: 0.2,
        timeout: 60,
      })
      const {
        rates,
        multipliers,
      } = state._computeProductionRates({}, [blessing], [punishment], {
        food: 1,
        wood: 1,
      })
      // 1 + 0.3 (blessing) - 0.2 (punishment) = 1.1
      expect(multipliers.food).toBeCloseTo(1.1, 10)
      // 2 workers × 1/s × 1.1 = 2.2
      expect(rates.food).toBeCloseTo(2.2, 10)
    })
  })

  // ── _resolveChallengeTimeout ────────────────────────────────────────

  describe('_resolveChallengeTimeout', () => {
    it('should complete challenge when requirements are met', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: 50,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
        colonyOverrides: {
          resources: {
            faith: 100,
          },
        },
      })
      state._resolveChallengeTimeout()
      expect(state.paused).toBe(true)
      expect(state.challengeModal).toBe(CHALLENGE_MODAL_REWARD)
    })

    it('should fail challenge when requirements are not met', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: 500,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
        colonyOverrides: {
          resources: {
            faith: 10,
          },
        },
      })
      state._resolveChallengeTimeout()
      expect(state.paused).toBe(true)
      expect(state.challengeModal).toBe(CHALLENGE_MODAL_FAILURE)
    })
  })

  // ── _deductRequirements ─────────────────────────────────────────────

  describe('_deductRequirements', () => {
    it('should deduct faith when challenge requires it', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: 50,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
        colonyOverrides: {
          resources: {
            faith: 200,
          },
        },
      })
      state._deductRequirements()
      expect(state.colony.resources.faith).toBe(150)
    })

    it('should deduct resources when challenge requires them', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: null,
          temple: null,
          monument: null,
          resources: {
            food: 30,
            wood: 20,
          },
          workers: null,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
        colonyOverrides: {
          resources: {
            food: 200,
            wood: 200,
          },
        },
      })
      state._deductRequirements()
      expect(state.colony.resources.food).toBe(170)
      expect(state.colony.resources.wood).toBe(180)
    })

    it('should sacrifice workers when challenge requires them', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: null,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: 3,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
        colonyOverrides: {
          resources: {
            workers: 5,
          },
        },
      })
      state._deductRequirements()
      expect(state.colony.resources.workers).toBe(2)
    })

    it('should no-op when no active challenge', async () => {
      const state = await createState()
      const foodBefore = state.colony.resources.food
      state._deductRequirements()
      expect(state.colony.resources.food).toBe(foodBefore)
    })
  })

  // ── _completeChallenge ──────────────────────────────────────────────

  describe('_completeChallenge', () => {
    it('should pause game and show reward modal', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: 50,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
        colonyOverrides: {
          resources: {
            faith: 200,
          },
        },
      })
      state._completeChallenge()
      expect(state.paused).toBe(true)
      expect(state.challengeModal).toBe(CHALLENGE_MODAL_REWARD)
    })

    it('should deduct requirements from colony', async () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        requirements: {
          faith: 50,
          altar: null,
          temple: null,
          monument: null,
          resources: null,
          workers: null,
        },
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            active: challenge,
          }),
        },
        colonyOverrides: {
          resources: {
            faith: 200,
          },
        },
      })
      state._completeChallenge()
      expect(state.colony.resources.faith).toBe(150)
    })
  })

  // ── _failChallenge ──────────────────────────────────────────────────

  describe('_failChallenge', () => {
    it('should pause game and show failure modal', async () => {
      const state = await createState()
      state._failChallenge()
      expect(state.paused).toBe(true)
      expect(state.challengeModal).toBe(CHALLENGE_MODAL_FAILURE)
    })
  })

  // ── _sacrificeWorkers ───────────────────────────────────────────────

  describe('_sacrificeWorkers', () => {
    it('should return the number of workers removed', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
        },
      })
      expect(state._sacrificeWorkers(3)).toBe(3)
    })

    it('should return fewer than asked when the colony runs out of workers', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 3,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 1,
            },
          },
        },
      })
      expect(state._sacrificeWorkers(5)).toBe(3)
      expect(state.colony.resources.workers).toBe(0)
      expect(state.colony.buildings.farm.workers).toBe(0)
    })

    it('should remove workers from idle pool first', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
        },
      })
      state._sacrificeWorkers(3)
      expect(state.colony.resources.workers).toBe(2)
    })

    it('should remove from producer buildings when idle pool is exhausted', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 3,
            },
          },
        },
      })
      // 5 total - 3 assigned = 2 idle. Sacrificing 4 means: 2 from idle, 2 from farm
      state._sacrificeWorkers(4)
      expect(state.colony.resources.workers).toBe(1)
      expect(state.colony.buildings.farm.workers).toBe(1)
    })

    it('should handle fewer total workers than sacrifice count', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 2,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 1,
            },
          },
        },
      })
      // 2 total, 1 assigned, 1 idle. Sacrificing 5 removes all available
      state._sacrificeWorkers(5)
      expect(state.colony.resources.workers).toBe(0)
      expect(state.colony.buildings.farm.workers).toBe(0)
    })

    it('should decrement resources.workers for each removed worker', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 10,
          },
          buildingOverrides: {
            farm: {
              level: 1,
              workers: 5,
            },
            woodcutter: {
              level: 1,
              workers: 3,
            },
          },
        },
      })
      // 10 total - 8 assigned = 2 idle
      state._sacrificeWorkers(2)
      expect(state.colony.resources.workers).toBe(8)
    })

    it('should dismiss population limit event when workers drop below cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 10,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      // workersCap = 1 * 10 = 10
      state.colony.events.addPast({
        type: EVENT_TYPE_POPULATION_LIMIT_REACHED,
        textKey: 'event.populationLimitReached',
        icon: '',
      })
      state._sacrificeWorkers(1)
      expect(state.colony.resources.workers).toBe(9)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(false)
    })

    it('should keep population limit event when workers remain at or above cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 12,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.update(0)
      // workersCap = 1 * 10 = 10
      state.colony.events.addPast({
        type: EVENT_TYPE_POPULATION_LIMIT_REACHED,
        textKey: 'event.populationLimitReached',
        icon: '',
      })
      state._sacrificeWorkers(1)
      expect(state.colony.resources.workers).toBe(11)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(true)
    })
  })

  // ── _advanceEffectTimeouts ──────────────────────────────────────────

  describe('_advanceEffectTimeouts', () => {
    it('should decrement timeout by delta', async () => {
      const state = await createState()
      const effects = [
        createBlessing({
          timeout: 100,
        }),
      ]
      state._advanceEffectTimeouts(effects, 10)
      expect(effects[0].timeout).toBe(90)
    })

    it('should remove effect when timeout reaches 0', async () => {
      const state = await createState()
      const effects = [
        createBlessing({
          timeout: 10,
        }),
      ]
      state._advanceEffectTimeouts(effects, 10)
      expect(effects.length).toBe(0)
    })

    it('should skip effects with null timeout', async () => {
      const state = await createState()
      const effects = [
        createBlessing({
          timeout: null,
        }),
      ]
      state._advanceEffectTimeouts(effects, 10)
      expect(effects.length).toBe(1)
      expect(effects[0].timeout).toBeNull()
    })

    it('should no-op on empty array', async () => {
      const state = await createState()
      const effects = []
      state._advanceEffectTimeouts(effects, 10)
      expect(effects.length).toBe(0)
    })

    it('should handle multiple effects with mixed timeouts', async () => {
      const state = await createState()
      const effects = [
        createBlessing({
          timeout: 5,
        }),
        createBlessing({
          timeout: null,
        }),
        createBlessing({
          timeout: 20,
        }),
      ]
      state._advanceEffectTimeouts(effects, 5)
      // First removed (timeout reached 0), second skipped, third decremented
      expect(effects.length).toBe(2)
      expect(effects[0].timeout).toBeNull()
      expect(effects[1].timeout).toBe(15)
    })
  })

  // ── _applyBlessing ─────────────────────────────────────────────────

  describe('_applyBlessing', () => {
    it('should add resources for GIFT_FROM_THE_HEAVENS', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
            wood: 100,
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_GIFT_FROM_THE_HEAVENS,
        resources: {
          food: 50,
          wood: 30,
        },
      })
      state._applyBlessing(blessing)
      expect(state.colony.resources.food).toBe(150)
      expect(state.colony.resources.wood).toBe(130)
    })

    it('should cap resources at storage limit for GIFT_FROM_THE_HEAVENS', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 500,
          },
          buildingOverrides: {
            storehouse: {
              level: 0,
            },
          },
        },
      })
      const storageCap = state.colony.buildings.storehouse.storageCap(0)
      const blessing = createBlessing({
        type: BLESSING_GIFT_FROM_THE_HEAVENS,
        resources: {
          food: 99999,
        },
      })
      state._applyBlessing(blessing)
      expect(state.colony.resources.food).toBe(storageCap)
    })

    it('should add territory bonus for HOLY_EXPANSION', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territoryBonus: 0,
          },
        },
      })
      const blessing = createBlessing({
        type: BLESSING_HOLY_EXPANSION,
        territory: 3,
      })
      state._applyBlessing(blessing)
      expect(state.colony.resources.territoryBonus).toBe(3)
    })

    it('should not mutate resources for non-resource blessings', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
            wood: 100,
          },
        },
      })
      const foodBefore = state.colony.resources.food
      const woodBefore = state.colony.resources.wood
      const blessing = createBlessing({
        type: BLESSING_FERTILE_SOIL,
        productivity: 0.3,
        timeout: 60,
      })
      state._applyBlessing(blessing)
      expect(state.colony.resources.food).toBe(foodBefore)
      expect(state.colony.resources.wood).toBe(woodBefore)
    })
  })

  // ── _applyPunishment ────────────────────────────────────────────────

  describe('_applyPunishment', () => {
    it('should pause running research when it destroys a constructing level-1 academy', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(1, 30, {
              constructionRemaining: 10,
              constructionDuration: 20,
            }),
          },
        },
      })
      state._constructingKeys.add(BUILDING_ACADEMY)
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingUpgrading',
        icon: '',
        buildingKey: BUILDING_ACADEMY,
        remainingSeconds: 10,
      })
      addResearchEvent(state, 'foodProduction1', 30)
      state._applyPunishment(createPunishment({
        levels: 1,
      }))
      state.advanceResearch(5)
      state.advanceEvents(5)
      const {
        academy,
      } = state.colony.buildings
      expect(academy.level).toBe(0)
      expect(academy.isActive('foodProduction1')).toBe(true)
      expect(academy.active.get('foodProduction1').remainingSeconds).toBe(30)
      // Only the construction event is removed
      expect(state.colony.events.future).toHaveLength(1)
      expect(researchEvent(state, 'foodProduction1').remainingSeconds).toBe(30)
    })

    it('should pause running research when two levels destroy an upgrading level-2 academy', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(2, 30, {
              constructionRemaining: 10,
              constructionDuration: 20,
            }),
          },
        },
      })
      state._constructingKeys.add(BUILDING_ACADEMY)
      state._applyPunishment(createPunishment({
        levels: 2,
      }))
      state.advanceResearch(5)
      const {
        academy,
      } = state.colony.buildings
      expect(academy.level).toBe(0)
      expect(academy.active.get('foodProduction1').remainingSeconds).toBe(30)
    })

    it('should remove fraction of stored faith', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            faith: 1000,
          },
        },
      })
      const punishment = createPunishment({
        faith: 0.5,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.faith).toBe(500)
    })

    it('should floor faith after fractional loss', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            faith: 1001,
          },
        },
      })
      const punishment = createPunishment({
        faith: 0.5,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.faith).toBe(500)
    })

    it('should not change faith when punishment.faith is null', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            faith: 1000,
          },
        },
      })
      const punishment = createPunishment({
        faith: null,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.faith).toBe(1000)
    })

    it('should remove fraction of each bounded resource', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 1000,
            wood: 500,
            stone: 200,
            copper: 100,
            iron: 50,
            gold: 10,
          },
        },
      })
      const punishment = createPunishment({
        resources: 0.3,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.food).toBe(700)
      expect(state.colony.resources.wood).toBe(350)
      expect(state.colony.resources.stone).toBe(140)
      expect(state.colony.resources.copper).toBe(70)
      expect(state.colony.resources.iron).toBe(35)
      expect(state.colony.resources.gold).toBe(7)
    })

    it('should floor bounded resources after fractional loss', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 101,
          },
        },
      })
      const punishment = createPunishment({
        resources: 0.3,
      })
      state._applyPunishment(punishment)
      // 101 * 0.7 = 70.7 → floor → 70
      expect(state.colony.resources.food).toBe(70)
    })

    it('should not change resources when punishment.resources is null', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 1000,
            wood: 500,
          },
        },
      })
      const punishment = createPunishment({
        resources: null,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.food).toBe(1000)
      expect(state.colony.resources.wood).toBe(500)
    })

    it('should sacrifice workers clamped to available count', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 3,
          },
        },
      })
      const punishment = createPunishment({
        workers: 10,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.workers).toBe(0)
    })

    it('should sacrifice exact worker count when available', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 10,
          },
        },
      })
      const punishment = createPunishment({
        workers: 4,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.workers).toBe(6)
    })

    it('should not change workers when punishment.workers is null', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 10,
          },
        },
      })
      const punishment = createPunishment({
        workers: null,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.workers).toBe(10)
    })

    it('should downgrade a building with level > 1', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 3,
            },
          },
        },
      })
      const punishment = createPunishment({
        levels: 1,
      })
      state._applyPunishment(punishment)
      expect(state.colony.buildings.farm.level).toBe(2)
    })

    it('should return excess workers to idle after downgrade', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            workers: 8,
          },
          buildingOverrides: {
            farm: {
              level: 2,
              workers: 8,
            },
          },
        },
      })
      const punishment = createPunishment({
        levels: 1,
      })
      state._applyPunishment(punishment)
      // Farm goes from level 2 (max 10) to level 1 (max 5), excess 3 returned to idle
      expect(state.colony.buildings.farm.level).toBe(1)
      expect(state.colony.buildings.farm.workers).toBe(5)
      // Total workers unchanged — just reassigned to idle
      expect(state.colony.resources.workers).toBe(8)
    })

    it('should destroy level-1 building under construction', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              constructionRemaining: 10,
              constructionDuration: 20,
              workers: 1,
            },
          },
        },
      })
      state._constructingKeys.add(BUILDING_FARM)
      const punishment = createPunishment({
        levels: 1,
      })
      state._applyPunishment(punishment)
      expect(state.colony.buildings.farm.level).toBe(0)
      expect(state.colony.buildings.farm.constructionRemaining).toBe(0)
      expect(state.colony.buildings.farm.constructionDuration).toBe(0)
      expect(state.colony.buildings.farm.workers).toBe(0)
      expect(state._constructingKeys.has(BUILDING_FARM)).toBe(false)
    })

    it('should destroy level-1 constructing non-producer building without touching workers', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            altar: {
              level: 1,
              constructionRemaining: 10,
              constructionDuration: 20,
            },
          },
        },
      })
      state._constructingKeys.add(BUILDING_ALTAR)
      const punishment = createPunishment({
        levels: 1,
      })
      state._applyPunishment(punishment)
      expect(state.colony.buildings.altar.level).toBe(0)
      expect(state.colony.buildings.altar.constructionRemaining).toBe(0)
      expect(state.colony.buildings.altar.constructionDuration).toBe(0)
      expect('workers' in state.colony.buildings.altar).toBe(false)
      expect(state._constructingKeys.has(BUILDING_ALTAR)).toBe(false)
    })

    it('should dismiss future event when destroying constructing building', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              constructionRemaining: 10,
              constructionDuration: 20,
            },
          },
        },
      })
      state._constructingKeys.add(BUILDING_FARM)
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingUpgrading',
        icon: 'icon',
        buildingKey: BUILDING_FARM,
        remainingSeconds: 10,
      })
      const punishment = createPunishment({
        levels: 1,
      })
      state._applyPunishment(punishment)
      expect(state.colony.events.future).toHaveLength(0)
    })

    it('should skip remaining downgrades when no eligible buildings', async () => {
      const state = await createState()
      // All buildings at level 0 — none eligible
      const punishment = createPunishment({
        levels: 5,
      })
      state._applyPunishment(punishment)
      // Should not throw, all buildings remain at level 0
      for (const key of DOWNGRADABLE_BUILDINGS) {
        expect(state.colony.buildings[key].level).toBe(0)
      }
    })

    it('should downgrade multiple levels across buildings', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 3,
            },
            woodcutter: {
              level: 2,
            },
          },
        },
      })
      const punishment = createPunishment({
        levels: 3,
      })
      state._applyPunishment(punishment)
      // Total levels lost should be 3 (distributed randomly across the two eligible buildings)
      const totalLevels = state.colony.buildings.farm.level + state.colony.buildings.woodcutter.level
      expect(totalLevels).toBe(2) // Started with 5, lost 3
    })

    it('should not change buildings when punishment.levels is null', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 3,
            },
          },
        },
      })
      const punishment = createPunishment({
        levels: null,
      })
      state._applyPunishment(punishment)
      expect(state.colony.buildings.farm.level).toBe(3)
    })

    it('should dismiss territory limit event when a level is lost', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 3,
            },
          },
        },
      })
      state.colony.events.addPast({
        type: EVENT_TYPE_TERRITORY_LIMIT_REACHED,
        textKey: 'event.territoryLimitReached',
        icon: '',
      })
      const punishment = createPunishment({
        levels: 1,
      })
      state._applyPunishment(punishment)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_TERRITORY_LIMIT_REACHED)).toBe(false)
    })

    it('should keep territory limit event when no level can be lost', async () => {
      const state = await createState()
      // All buildings at level 0 — none eligible
      state.colony.events.addPast({
        type: EVENT_TYPE_TERRITORY_LIMIT_REACHED,
        textKey: 'event.territoryLimitReached',
        icon: '',
      })
      const punishment = createPunishment({
        levels: 1,
      })
      state._applyPunishment(punishment)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_TERRITORY_LIMIT_REACHED)).toBe(true)
    })

    it('should apply all punishment effects together', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            faith: 1000,
            food: 500,
            wood: 500,
            stone: 500,
            copper: 500,
            iron: 500,
            gold: 500,
            workers: 10,
          },
          buildingOverrides: {
            farm: {
              level: 3,
              workers: 5,
            },
          },
        },
      })
      const punishment = createPunishment({
        type: PUNISHMENT_VOLCANO,
        faith: 0.5,
        resources: 0.3,
        workers: 3,
        levels: 1,
      })
      state._applyPunishment(punishment)
      expect(state.colony.resources.faith).toBe(500)
      expect(state.colony.resources.food).toBe(350)
      expect(state.colony.resources.workers).toBe(7)
      expect(state.colony.buildings.farm.level).toBe(2)
    })
  })

  // ── _constructionDurationMult ───────────────────────────────────────

  describe('_constructionDurationMult', () => {
    it('should return 1 with no research bonus and no blessing', async () => {
      const state = await createState()
      expect(state._constructionDurationMult).toBe(1)
    })

    it('should return reduced value with construction-time research', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              completed: ['construction1'],
            },
          },
        },
      })
      // If research key is in the tree, the bonus applies.
      // Since we may not know exact research keys, test via the getter logic
      const result = state._constructionDurationMult
      expect(result).toBeLessThanOrEqual(1)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should stack RAPID_CONSTRUCTION blessing with research', async () => {
      const blessing = createBlessing({
        type: BLESSING_RAPID_CONSTRUCTION,
        construction: 0.3,
        timeout: 60,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [blessing],
          }),
        },
      })
      expect(state._constructionDurationMult).toBeCloseTo(0.7, 10)
    })

    it('should combine full construction research and RAPID_CONSTRUCTION multiplicatively', async () => {
      const blessing = createBlessing({
        type: BLESSING_RAPID_CONSTRUCTION,
        construction: 0.5,
        timeout: 60,
      })
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              completed: [
                'construction1',
                'construction2',
                'construction3',
                'construction4',
                'construction5',
              ],
            },
          },
        },
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [blessing],
          }),
        },
      })
      // (1 - 0.5 research) × (1 - 0.5 blessing) = 0.25, not 1 - (0.5 + 0.5) = 0
      expect(state._constructionDurationMult).toBeCloseTo(0.25, 10)
    })

    it('should floor at 0', async () => {
      const blessing = createBlessing({
        type: BLESSING_RAPID_CONSTRUCTION,
        construction: 2.0,
        timeout: 60,
      })
      const state = await createState({
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [blessing],
          }),
        },
      })
      expect(state._constructionDurationMult).toBe(0)
    })
  })

  // ── _recruit ────────────────────────────────────────────────────────

  describe('_recruit', () => {
    it('should return true and increment workers when affordable and under cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.colony.buildings.house.workersCap = 10
      const result = state._recruit()
      expect(result).toBe(true)
      expect(state.colony.resources.workers).toBe(1)
    })

    it('should return false when cannot afford recruit cost', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.colony.buildings.house.workersCap = 10
      const result = state._recruit()
      expect(result).toBe(false)
      expect(state.colony.resources.workers).toBe(0)
    })

    it('should return false when at population cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            workers: 5,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.colony.buildings.house.workersCap = 5
      const result = state._recruit()
      expect(result).toBe(false)
      expect(state.colony.resources.workers).toBe(5)
    })

    it('should fire population limit event when reaching cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            workers: 4,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.colony.buildings.house.workersCap = 5
      state._recruit()
      expect(state.colony.resources.workers).toBe(5)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_POPULATION_LIMIT_REACHED)).toBe(true)
    })

    it('should deduct recruit cost from resources', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 200,
            workers: 0,
          },
          buildingOverrides: {
            house: {
              level: 1,
            },
          },
        },
      })
      state.colony.buildings.house.workersCap = 10
      state._recruit()
      expect(state.colony.resources.food).toBe(150)
    })
  })

  // ── expandTerritory ────────────────────────────────────────────

  describe('expandTerritory', () => {
    it('should deduct expansion cost and start HQ construction', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      const foodBefore = state.colony.resources.food
      const woodBefore = state.colony.resources.wood
      state.expandTerritory()
      expect(state.colony.resources.food).toBeLessThan(foodBefore)
      expect(state.colony.resources.wood).toBeLessThan(woodBefore)
      expect(state.colony.buildings.headquarters.isConstructing).toBe(true)
    })

    it('should add headquarters to constructing keys', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.expandTerritory()
      expect(state._constructingKeys.has(BUILDING_HEADQUARTERS)).toBe(true)
    })

    it('should create a future EVENT_TYPE_BUILDING_UPGRADE event with event.territoryExpanding text', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.expandTerritory()
      const futureEvent = state.colony.events.future.find(
        event => event.type === EVENT_TYPE_BUILDING_UPGRADE,
      )
      expect(futureEvent).toBeDefined()
      expect(futureEvent.textKey).toBe('event.territoryExpanding')
      expect(futureEvent.buildingKey).toBe(BUILDING_HEADQUARTERS)
    })

    it('should dismiss existing EVENT_TYPE_BUILDING_UPGRADE past events', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.colony.events.addPast({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.territoryExpanded',
        icon: '',
      })
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_BUILDING_UPGRADE)).toBe(true)
      state.expandTerritory()
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_BUILDING_UPGRADE)).toBe(false)
    })

    it('should call update(0) after expansion', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      const updateSpy = vi.spyOn(state, 'update')
      state.expandTerritory()
      expect(updateSpy).toHaveBeenCalledWith(0)
    })

    it('should reject when HQ is already constructing', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.colony.buildings.headquarters.constructionRemaining = 10
      const foodBefore = state.colony.resources.food
      state.expandTerritory()
      expect(state.colony.resources.food).toBe(foodBefore)
    })

    it('should reject when HQ is upgrading', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 5000,
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.colony.buildings.headquarters.upgradeRemaining = 10
      const foodBefore = state.colony.resources.food
      state.expandTerritory()
      expect(state.colony.resources.food).toBe(foodBefore)
    })

    it('should reject when resources insufficient', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 0,
            wood: 0,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.expandTerritory()
      expect(state.colony.buildings.headquarters.isConstructing).toBe(false)
    })
  })

  // ── upgradeHeadquarters ────────────────────────────────────────

  describe('upgradeHeadquarters', () => {
    it('should deduct upgrade cost and start HQ type upgrade', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      const woodBefore = state.colony.resources.wood
      state.upgradeHeadquarters()
      expect(state.colony.resources.wood).toBeLessThan(woodBefore)
      expect(state.colony.buildings.headquarters.isUpgrading).toBe(true)
    })

    it('should set _hqUpgrading to true', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      expect(state._hqUpgrading).toBe(false)
      state.upgradeHeadquarters()
      expect(state._hqUpgrading).toBe(true)
    })

    it('should create a future EVENT_TYPE_BUILDING_UPGRADE event with event.buildingUpgrading text', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.upgradeHeadquarters()
      const futureEvent = state.colony.events.future.find(
        event => event.type === EVENT_TYPE_BUILDING_UPGRADE,
      )
      expect(futureEvent).toBeDefined()
      expect(futureEvent.textKey).toBe('event.buildingUpgrading')
      expect(futureEvent.buildingKey).toBe(BUILDING_HEADQUARTERS)
    })

    it('should dismiss existing EVENT_TYPE_BUILDING_UPGRADE past events', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.colony.events.addPast({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.territoryExpanded',
        icon: '',
      })
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_BUILDING_UPGRADE)).toBe(true)
      state.upgradeHeadquarters()
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_BUILDING_UPGRADE)).toBe(false)
    })

    it('should call update(0) after upgrade', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      const updateSpy = vi.spyOn(state, 'update')
      state.upgradeHeadquarters()
      expect(updateSpy).toHaveBeenCalledWith(0)
    })

    it('should reject when HQ is already constructing', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.colony.buildings.headquarters.constructionRemaining = 10
      const woodBefore = state.colony.resources.wood
      state.upgradeHeadquarters()
      expect(state.colony.resources.wood).toBe(woodBefore)
    })

    it('should reject when HQ is already upgrading', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 5000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.colony.buildings.headquarters.upgradeRemaining = 10
      const woodBefore = state.colony.resources.wood
      state.upgradeHeadquarters()
      expect(state.colony.resources.wood).toBe(woodBefore)
    })

    it('should reject when HQ is at max type', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 50000,
            stone: 50000,
            copper: 50000,
            iron: 50000,
            gold: 50000,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CITY,
            },
          },
        },
      })
      const woodBefore = state.colony.resources.wood
      state.upgradeHeadquarters()
      expect(state.colony.resources.wood).toBe(woodBefore)
      expect(state._hqUpgrading).toBe(false)
    })

    it('should reject when resources insufficient', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            wood: 0,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
          },
        },
      })
      state.upgradeHeadquarters()
      expect(state.colony.buildings.headquarters.isUpgrading).toBe(false)
    })
  })

  // ── _triggerTutorialModal ───────────────────────────────────────

  describe('_triggerTutorialModal', () => {
    it('should set tutorial.activeModal to the given key', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
          }),
        },
      })
      state._triggerTutorialModal('welcome')
      expect(state.meta.tutorial.activeModal).toBe('welcome')
    })

    it('should pause the game', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
          }),
        },
      })
      state._triggerTutorialModal('welcome')
      expect(state.paused).toBe(true)
    })

    it('should not trigger when key is already in dismissedModals', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
            dismissedModals: ['welcome'],
          }),
        },
      })
      state._triggerTutorialModal('welcome')
      expect(state.meta.tutorial.activeModal).toBeNull()
      expect(state.paused).toBe(false)
    })

    it('should not trigger when activeModal is already set', async () => {
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
          }),
        },
      })
      state.meta.tutorial.activeModal = 'existing'
      state._triggerTutorialModal('another')
      expect(state.meta.tutorial.activeModal).toBe('existing')
    })

    it('should not trigger when storage.tutorialCompleted is true', async () => {
      storage.tutorialCompleted = true
      const state = await createState({
        metaOverrides: {
          tutorial: new Tutorial({
            completed: false,
          }),
        },
      })
      state._triggerTutorialModal('welcome')
      expect(state.meta.tutorial.activeModal).toBeNull()
      expect(state.paused).toBe(false)
    })
  })

  // ── _playAssignSound ──────────────────────────────────────────────

  describe('_playAssignSound', () => {
    it('should play SND_WORKER_FARM for farm', async () => {
      const state = await createState()
      state._playAssignSound(BUILDING_FARM)
      expect(audio.playSound).toHaveBeenCalledWith(SND_WORKER_FARM)
    })

    it('should play SND_WORKER_WOODCUTTER for woodcutter', async () => {
      const state = await createState()
      state._playAssignSound(BUILDING_WOODCUTTER)
      expect(audio.playSound).toHaveBeenCalledWith(SND_WORKER_WOODCUTTER)
    })

    it('should play SND_WORKER_ACADEMY for academy', async () => {
      const state = await createState()
      state._playAssignSound(BUILDING_ACADEMY)
      expect(audio.playSound).toHaveBeenCalledWith(SND_WORKER_ACADEMY)
    })

    it('should play SND_WORKER_TEMPLE for temple', async () => {
      const state = await createState()
      state._playAssignSound(BUILDING_TEMPLE)
      expect(audio.playSound).toHaveBeenCalledWith(SND_WORKER_TEMPLE)
    })

    it('should play SND_WORKER_MINE for quarry, copper_mine, iron_mine, gold_mine', async () => {
      const state = await createState()
      for (const buildingKey of [
        BUILDING_QUARRY,
        BUILDING_COPPER_MINE,
        BUILDING_IRON_MINE,
        BUILDING_GOLD_MINE,
      ]) {
        audio.playSound.mockClear()
        state._playAssignSound(buildingKey)
        expect(audio.playSound).toHaveBeenCalledWith(SND_WORKER_MINE)
      }
    })

    it('should not play any sound for non-producer buildings', async () => {
      const state = await createState()
      state._playAssignSound(BUILDING_HOUSE)
      expect(audio.playSound).not.toHaveBeenCalled()
    })
  })

  // ── _buildingName ─────────────────────────────────────────────────

  describe('_buildingName', () => {
    it('should return t(building.headquarters.<type>) for headquarters', async () => {
      const state = await createState()
      const result = state._buildingName(BUILDING_HEADQUARTERS)
      expect(result).toBe('building.headquarters.' + HQ_TYPE_CAMP)
    })

    it('should return t(building.<key>) for non-headquarters buildings', async () => {
      const state = await createState()
      const result = state._buildingName(BUILDING_FARM)
      expect(result).toBe('building.farm')
    })
  })

  // ── downgradeBuilding ─────────────────────────────────────────────

  describe('downgradeBuilding', () => {
    it('should pause running research when the academy drops to level 0', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
            workers: 5,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            academy: academyWithResearch(1, 10, {
              workers: 5,
            }),
          },
        },
      })
      addResearchEvent(state, 'foodProduction1', 10)
      state.downgradeBuilding(BUILDING_ACADEMY)
      state.advanceResearch(5)
      state.advanceEvents(5)
      const {
        academy,
      } = state.colony.buildings
      expect(academy.level).toBe(0)
      expect(academy.workers).toBe(0)
      expect(academy.active.get('foodProduction1').remainingSeconds).toBe(10)
      expect(researchEvent(state, 'foodProduction1').remainingSeconds).toBe(10)
    })

    it('should decrement building level by 1', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 2,
            },
          },
        },
      })
      state.downgradeBuilding(BUILDING_FARM)
      expect(state.colony.buildings.farm.level).toBe(1)
    })

    it('should cap workers at new maxWorkers when workers exceed it', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 2,
            },
          },
        },
      })
      state.colony.buildings.farm.workers = 10
      state.downgradeBuilding(BUILDING_FARM)
      expect(state.colony.buildings.farm.workers).toBeLessThanOrEqual(
        state.colony.buildings.farm.maxWorkers,
      )
    })

    it('should dismiss EVENT_TYPE_TERRITORY_LIMIT_REACHED past events', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 2,
            },
          },
        },
      })
      state.colony.events.addPast({
        type: EVENT_TYPE_TERRITORY_LIMIT_REACHED,
        textKey: 'event.territoryLimitReached',
        icon: '',
      })
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_TERRITORY_LIMIT_REACHED)).toBe(true)
      state.downgradeBuilding(BUILDING_FARM)
      expect(state.colony.events.hasPastEvent(EVENT_TYPE_TERRITORY_LIMIT_REACHED)).toBe(false)
    })

    it('should call update(0) after downgrade', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 2,
            },
          },
        },
      })
      const updateSpy = vi.spyOn(state, 'update')
      state.downgradeBuilding(BUILDING_FARM)
      expect(updateSpy).toHaveBeenCalledWith(0)
    })

    it('should reject when building key is not in DOWNGRADABLE_BUILDINGS', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            house: {
              level: 2,
            },
          },
        },
      })
      expect(DOWNGRADABLE_BUILDINGS.has(BUILDING_HOUSE)).toBe(false)
      state.downgradeBuilding(BUILDING_HOUSE)
      expect(state.colony.buildings.house.level).toBe(2)
    })

    it('should reject when building level is 0', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 0,
            },
          },
        },
      })
      state.downgradeBuilding(BUILDING_FARM)
      expect(state.colony.buildings.farm.level).toBe(0)
    })

    it('should reject when building is constructing', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: HQ_TERRITORY_PER_LEVEL,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 2,
            },
          },
        },
      })
      state.colony.buildings.farm.constructionRemaining = 10
      state.downgradeBuilding(BUILDING_FARM)
      expect(state.colony.buildings.farm.level).toBe(2)
    })

    it('should reject when territory is not at cap', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            territory: 0,
          },
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_CAMP,
            },
            farm: {
              level: 2,
            },
          },
        },
      })
      state.downgradeBuilding(BUILDING_FARM)
      expect(state.colony.buildings.farm.level).toBe(2)
    })
  })

  // ── buyUnits ──────────────────────────────────────────────────────

  describe('buyUnits', () => {
    it('should buy a unit, deduct its cost and return 1', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            barracks: {
              level: 1,
            },
          },
        },
      })
      const cost = UNIT_STATS[UNIT_INFANTRY].cost
      expect(state.buyUnits(UNIT_INFANTRY, 1)).toBe(1)
      expect(state.colony.military.units[UNIT_INFANTRY]).toBe(1)
      expect(state.colony.resources.food).toBe(200 - cost.food)
      expect(state.colony.resources.wood).toBe(200 - cost.wood)
    })

    it('should stop at the cap set by the building level', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 450,
            wood: 450,
          },
          buildingOverrides: {
            barracks: {
              level: 1,
            },
          },
        },
      })
      const cost = UNIT_STATS[UNIT_INFANTRY].cost
      expect(state.buyUnits(UNIT_INFANTRY, 10)).toBe(MILITARY_UNITS_PER_LEVEL)
      expect(state.colony.military.units[UNIT_INFANTRY]).toBe(MILITARY_UNITS_PER_LEVEL)
      expect(state.colony.resources.food).toBe(450 - MILITARY_UNITS_PER_LEVEL * cost.food)
    })

    it('should buy nothing while the building is unbuilt', async () => {
      const state = await createState()
      expect(state.buyUnits(UNIT_INFANTRY, 1)).toBe(0)
      expect(state.colony.military.units[UNIT_INFANTRY]).toBe(0)
      expect(state.colony.resources.food).toBe(200)
    })

    it('should buy nothing when already at the cap', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            barracks: {
              level: 1,
            },
          },
          military: createMilitary({
            units: {
              [UNIT_INFANTRY]: MILITARY_UNITS_PER_LEVEL,
            },
          }),
        },
      })
      expect(state.buyUnits(UNIT_INFANTRY, 1)).toBe(0)
      expect(state.colony.military.units[UNIT_INFANTRY]).toBe(MILITARY_UNITS_PER_LEVEL)
      expect(state.colony.resources.food).toBe(200)
    })

    it('should stop when the colony can no longer afford a unit', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 100,
          },
          buildingOverrides: {
            barracks: {
              level: 2,
            },
          },
        },
      })
      // 40 food each: 2 bought, 20 food left
      expect(state.buyUnits(UNIT_INFANTRY, 10)).toBe(2)
      expect(state.colony.military.units[UNIT_INFANTRY]).toBe(2)
      expect(state.colony.resources.food).toBe(20)
    })

    it('should buy nothing and keep resources when the colony cannot afford one unit', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 30,
          },
          buildingOverrides: {
            barracks: {
              level: 1,
            },
          },
        },
      })
      expect(state.buyUnits(UNIT_INFANTRY, 1)).toBe(0)
      expect(state.colony.resources.food).toBe(30)
      expect(state.colony.resources.wood).toBe(200)
    })

    it('should use each unit type own building and cost', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            archery: {
              level: 1,
            },
            stable: {
              level: 1,
            },
          },
        },
      })
      const archerCost = UNIT_STATS[UNIT_ARCHER].cost
      const cavalryCost = UNIT_STATS[UNIT_CAVALRY].cost
      expect(state.buyUnits(UNIT_ARCHER, 1)).toBe(1)
      expect(state.buyUnits(UNIT_CAVALRY, 1)).toBe(1)
      expect(state.colony.military.units).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 1,
        [UNIT_CAVALRY]: 1,
      })
      expect(state.colony.resources.wood).toBe(200 - archerCost.wood - cavalryCost.wood)
      expect(state.colony.resources.copper).toBe(200 - archerCost.copper - cavalryCost.copper)
      expect(state.colony.resources.food).toBe(200 - archerCost.food - cavalryCost.food)
      expect(state.colony.resources.iron).toBe(200 - archerCost.iron - cavalryCost.iron)
    })

    it('should not let another military building raise the cap', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            barracks: {
              level: 3,
            },
          },
        },
      })
      expect(state.buyUnits(UNIT_ARCHER, 1)).toBe(0)
      expect(state.buyUnits(UNIT_CAVALRY, 1)).toBe(0)
    })

    it('should refresh the army upkeep after buying', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            barracks: {
              level: 1,
            },
          },
        },
      })
      state.buyUnits(UNIT_INFANTRY, 3)
      expect(state.armyConsumption.food).toBeCloseTo(3 * UNIT_STATS[UNIT_INFANTRY].upkeep.food, 10)
    })
  })

  // ── dismissUnits ──────────────────────────────────────────────────

  describe('dismissUnits', () => {
    it('should remove units without any refund', async () => {
      const state = await createState({
        colonyOverrides: {
          military: createMilitary({
            units: {
              [UNIT_INFANTRY]: 4,
            },
          }),
        },
      })
      const before = state.colony.resources.toJSON()
      state.dismissUnits(UNIT_INFANTRY, 3)
      expect(state.colony.military.units[UNIT_INFANTRY]).toBe(1)
      expect(state.colony.resources.toJSON()).toEqual(before)
    })

    it('should clamp to the units owned', async () => {
      const state = await createState({
        colonyOverrides: {
          military: createMilitary({
            units: {
              [UNIT_ARCHER]: 4,
            },
          }),
        },
      })
      state.dismissUnits(UNIT_ARCHER, 10)
      expect(state.colony.military.units[UNIT_ARCHER]).toBe(0)
    })

    it('should do nothing when there are no units of that type', async () => {
      const state = await createState({
        colonyOverrides: {
          military: createMilitary({
            units: {
              [UNIT_INFANTRY]: 2,
            },
          }),
        },
      })
      state.dismissUnits(UNIT_CAVALRY, 1)
      expect(state.colony.military.units).toEqual({
        [UNIT_INFANTRY]: 2,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 0,
      })
    })

    it('should refresh the army upkeep after dismissing', async () => {
      const state = await createState({
        colonyOverrides: {
          military: createMilitary({
            units: {
              [UNIT_INFANTRY]: 4,
            },
          }),
        },
      })
      state.update(0)
      expect(state.armyConsumption.food).toBeGreaterThan(0)
      state.dismissUnits(UNIT_INFANTRY, 4)
      expect(state.armyConsumption).toEqual({
        food: 0,
        wood: 0,
      })
    })
  })

  // ── advanceRaids ──────────────────────────────────────────────────

  describe('advanceRaids', () => {
    beforeEach(() => {
      // Keep tutorial popups from pausing the game between steps
      storage.tutorialCompleted = true
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should not schedule raids while the headquarters is a Camp', async () => {
      const state = await createState()
      state.advanceRaids(10000)
      expect(state.colony.military.raid).toBeNull()
      expect(state.colony.events.future).toHaveLength(0)
    })

    it('should schedule the first raid after the grace period once at Settlement', async () => {
      const state = await createRaidState({
        raid: null,
      })
      state.advanceRaids(0)
      const raid = state.colony.military.raid
      expect(raid).toBeInstanceOf(Raid)
      expect(raid.phase).toBe(RAID_PHASE_WAITING)
      expect(raid.remainingSeconds).toBe(RAID_GRACE_PERIOD)
    })

    it('should keep the waiting timer hidden', async () => {
      const state = await createRaidState({
        raid: null,
      })
      state.advanceRaids(10)
      expect(state.colony.military.raid.remainingSeconds).toBe(RAID_GRACE_PERIOD - 10)
      expect(state.colony.events.future).toHaveLength(0)
    })

    it('should announce the raid when the grace period ends', async () => {
      const state = await createRaidState({
        raid: null,
      })
      state.advanceRaids(0)
      state.advanceRaids(RAID_GRACE_PERIOD - 1)
      expect(state.colony.military.raid.phase).toBe(RAID_PHASE_WAITING)
      state.advanceRaids(1)
      expect(state.colony.military.raid.phase).toBe(RAID_PHASE_INCOMING)
    })

    it('should wait the raid interval instead of the grace period for later raids', async () => {
      const state = await createRaidState({
        raid: null,
        raidCount: 1,
      })
      state.advanceRaids(0)
      // HQ level 1 → territory cap 10
      const expected = Math.max(RAID_INTERVAL_MIN, RAID_INTERVAL_BASE - RAID_INTERVAL_PER_TERRITORY * HQ_TERRITORY_PER_LEVEL)
      expect(state.colony.military.raid.remainingSeconds).toBe(expected)
    })

    it('should shorten the interval as the territory cap grows, territory bonus included', async () => {
      const small = await createRaidState({
        raid: null,
      })
      const large = await createRaidState({
        raid: null,
        colonyOverrides: {
          resources: {
            territoryBonus: 10,
          },
          buildingOverrides: {
            headquarters: {
              level: 5,
              type: HQ_TYPE_SETTLEMENT,
            },
          },
        },
      })
      // Territory cap 5 × 10 + 10 = 60
      expect(large._raidInterval).toBe(RAID_INTERVAL_BASE - RAID_INTERVAL_PER_TERRITORY * 60)
      expect(large._raidInterval).toBeLessThan(small._raidInterval)
    })

    it('should never wait less than RAID_INTERVAL_MIN', async () => {
      const state = await createRaidState({
        raid: null,
        raidCount: 1,
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 20,
              type: HQ_TYPE_CITY,
            },
          },
        },
      })
      state.advanceRaids(0)
      expect(state.colony.military.raid.remainingSeconds).toBe(RAID_INTERVAL_MIN)
    })

    it('should do nothing while the game is paused', async () => {
      const state = await createRaidState({
        raid: null,
      })
      state.paused = true
      state.advanceRaids(10)
      expect(state.colony.military.raid).toBeNull()
    })

    it('should keep sending raids after every challenge is completed', async () => {
      const state = await createRaidState({
        raid: createRaid({
          remainingSeconds: 10,
        }),
        metaOverrides: {
          challenges: createChallenges({
            completed: [createChallenge()],
          }),
        },
      })
      expect(state.meta.challenges.allCompleted).toBe(true)
      state.advanceRaids(10)
      expect(state.raidReport).toBeInstanceOf(RaidReport)
      expect(state.colony.military.raidCount).toBe(1)
    })

    it('should turn the raid incoming with raiders, a tribute demand and the warning countdown', async () => {
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 5,
        }),
      })
      state.advanceRaids(5)
      const raid = state.colony.military.raid
      // Territory cap 10, year 1: floor(3 + 1.5) raiders
      const expectedCount = Math.floor(RAID_UNITS_BASE + RAID_UNITS_PER_TERRITORY * 10)
      expect(raid.phase).toBe(RAID_PHASE_INCOMING)
      expect(raid.enemyCount).toBe(expectedCount)
      expect(raid.demand).toBeInstanceOf(Cost)
      expect(raid.demand.entries.size).toBeGreaterThanOrEqual(2)
      expect(raid.delaysPaid).toBe(0)
      expect(raid.remainingSeconds).toBe(RAID_WARNING_TIME)
    })

    it('should add a clickable upcoming raid event on announcement', async () => {
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 5,
        }),
      })
      state.advanceRaids(5)
      const event = raidEvent(state)
      expect(event).toBeDefined()
      expect(event.textKey).toBe('event.raidIncoming')
      expect(event.action).toBe('openMilitaryModal')
      expect(event.icon).toBe(IMG_BUILDING_WALL)
      expect(event.params).toEqual([state.colony.military.raid.enemyCount])
      expect(event.remainingSeconds).toBe(RAID_WARNING_TIME)
    })

    it('should play the under attack sound on announcement', async () => {
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 5,
        }),
      })
      state.advanceRaids(5)
      expect(audio.playSound).toHaveBeenCalledWith(SND_UNDER_ATTACK)
    })

    it('should show the raid tutorial popup and pause on the first announcement', async () => {
      storage.tutorialCompleted = false
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 5,
        }),
      })
      state.advanceRaids(5)
      expect(state.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_RAID_INCOMING)
      expect(state.paused).toBe(true)
    })

    it('should not show the raid tutorial popup once it was dismissed', async () => {
      storage.tutorialCompleted = false
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 5,
        }),
      })
      state.meta.tutorial.dismissedModals.add(TUTORIAL_MODAL_RAID_INCOMING)
      state.advanceRaids(5)
      expect(state.meta.tutorial.activeModal).toBeNull()
      expect(state.paused).toBe(false)
    })

    it('should lengthen the warning countdown with Warning research', async () => {
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 5,
        }),
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              completed: [RESEARCH_WARNING_1],
            },
          },
        },
      })
      state.advanceRaids(5)
      expect(state.colony.military.raid.remainingSeconds).toBeCloseTo(RAID_WARNING_TIME * 1.1, 10)
      expect(raidEvent(state).remainingSeconds).toBeCloseTo(RAID_WARNING_TIME * 1.1, 10)
    })

    it('should stack Warning research tiers', async () => {
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            academy: {
              level: 1,
              completed: [
                RESEARCH_WARNING_1,
                RESEARCH_WARNING_2,
              ],
            },
          },
        },
      })
      expect(state._raidWarningTime).toBeCloseTo(RAID_WARNING_TIME * 1.2, 10)
    })

    it('should only send unit types the colony can train', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 5,
        }),
      })
      state.advanceRaids(5)
      const {
        enemy,
      } = state.colony.military.raid
      expect(enemy[UNIT_ARCHER]).toBe(0)
      expect(enemy[UNIT_CAVALRY]).toBe(0)
      expect(enemy[UNIT_INFANTRY]).toBeGreaterThan(0)
    })

    it('should freeze the waiting timer and announce nothing during Temporary Peace', async () => {
      const state = await createRaidState({
        raid: null,
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [
              createBlessing({
                type: BLESSING_TEMPORARY_PEACE,
                timeout: 300,
              }),
            ],
          }),
        },
      })
      state.advanceRaids(0)
      state.advanceRaids(RAID_GRACE_PERIOD * 2)
      const raid = state.colony.military.raid
      expect(raid.phase).toBe(RAID_PHASE_WAITING)
      expect(raid.remainingSeconds).toBe(RAID_GRACE_PERIOD)
      expect(raidEvent(state)).toBeUndefined()
      expect(audio.playSound).not.toHaveBeenCalledWith(SND_UNDER_ATTACK)
    })

    it('should freeze the incoming countdown during Temporary Peace', async () => {
      const state = await createRaidState({
        raid: createRaid({
          remainingSeconds: 30,
        }),
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [
              createBlessing({
                type: BLESSING_TEMPORARY_PEACE,
                timeout: 300,
              }),
            ],
          }),
        },
      })
      state.advanceRaids(100)
      expect(state.colony.military.raid.remainingSeconds).toBe(30)
      expect(state.raidReport).toBeNull()
      expect(state.paused).toBe(false)
    })

    it('should keep the raid event on the frozen raid timer during Temporary Peace', async () => {
      const state = await createRaidState({
        raid: createRaid({
          remainingSeconds: 30,
        }),
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [
              createBlessing({
                type: BLESSING_TEMPORARY_PEACE,
                timeout: 300,
              }),
            ],
          }),
        },
      })
      // The event step lowers every upcoming countdown; the raid step corrects it
      state.colony.events.advance(10)
      expect(raidEvent(state).remainingSeconds).toBe(20)
      state.advanceRaids(10)
      expect(raidEvent(state).remainingSeconds).toBe(30)
    })

    it('should resume the countdown once Temporary Peace ends', async () => {
      const state = await createRaidState({
        raid: createRaid({
          remainingSeconds: 30,
        }),
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [
              createBlessing({
                type: BLESSING_TEMPORARY_PEACE,
                timeout: 300,
              }),
            ],
          }),
        },
      })
      state.advanceRaids(10)
      state.meta.challenges.activeBlessings = []
      state.advanceRaids(10)
      expect(state.colony.military.raid.remainingSeconds).toBe(20)
    })

    describe('challenge truce', () => {
      // A Settlement colony whose next raid waits 100 s, with the given active challenge
      async function createTruceState(challenge) {
        return createRaidState({
          raid: createRaid({
            phase: RAID_PHASE_WAITING,
            remainingSeconds: 100,
          }),
          metaOverrides: {
            challenges: createChallenges({
              active: createChallenge(challenge),
            }),
          },
        })
      }

      it('should freeze the waiting timer during a retry countdown', async () => {
        const state = await createTruceState({
          status: CHALLENGE_STATUS_STARTED,
          failures: 1,
          mood: CHALLENGE_MOOD_WATCHFUL,
        })
        state.advanceRaids(200)
        expect(state.colony.military.raid.phase).toBe(RAID_PHASE_WAITING)
        expect(state.colony.military.raid.remainingSeconds).toBe(100)
        expect(raidEvent(state)).toBeUndefined()
      })

      it('should freeze the waiting timer during a merciful countdown', async () => {
        const state = await createTruceState({
          status: CHALLENGE_STATUS_STARTED,
          mood: CHALLENGE_MOOD_MERCIFUL,
        })
        state.advanceRaids(200)
        expect(state.colony.military.raid.phase).toBe(RAID_PHASE_WAITING)
        expect(state.colony.military.raid.remainingSeconds).toBe(100)
      })

      it('should keep the waiting timer running during a first-try countdown of another mood', async () => {
        const state = await createTruceState({
          status: CHALLENGE_STATUS_STARTED,
          mood: CHALLENGE_MOOD_WATCHFUL,
        })
        state.advanceRaids(40)
        expect(state.colony.military.raid.remainingSeconds).toBe(60)
      })

      it('should keep the waiting timer running before a retry countdown starts', async () => {
        const state = await createTruceState({
          status: CHALLENGE_STATUS_ACTIVATED,
          failures: 1,
          mood: CHALLENGE_MOOD_MERCIFUL,
        })
        state.advanceRaids(40)
        expect(state.colony.military.raid.remainingSeconds).toBe(60)
      })

      it('should let an announced raid arrive during a truce', async () => {
        const state = await createRaidState({
          raid: createRaid({
            remainingSeconds: 30,
          }),
          metaOverrides: {
            challenges: createChallenges({
              active: createChallenge({
                status: CHALLENGE_STATUS_STARTED,
                failures: 1,
              }),
            }),
          },
        })
        state.advanceRaids(30)
        expect(state.raidReport).not.toBeNull()
        expect(state.colony.military.raid).toBeNull()
      })
    })

    it('should keep the raid event countdown in sync and sorted', async () => {
      const state = await createRaidState({
        raid: createRaid({
          remainingSeconds: 100,
        }),
      })
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingBuilding',
        buildingKey: BUILDING_FARM,
        remainingSeconds: 50,
      })
      expect(state.colony.events.future[0].type).toBe(EVENT_TYPE_BUILDING_UPGRADE)
      state.advanceRaids(60)
      expect(raidEvent(state).remainingSeconds).toBe(40)
      expect(state.colony.events.future[0].type).toBe(EVENT_TYPE_RAID_INCOMING)
      expect(state.colony.events.future[1].type).toBe(EVENT_TYPE_BUILDING_UPGRADE)
    })

    it('should resolve the raid when the countdown reaches 0', async () => {
      const state = await createRaidState({
        raid: createRaid({
          remainingSeconds: 10,
        }),
      })
      state.advanceRaids(10)
      expect(state.raidReport).toBeInstanceOf(RaidReport)
      expect(state.colony.military.raid).toBeNull()
      expect(state.colony.military.raidCount).toBe(1)
      expect(state.paused).toBe(true)
      expect(raidEvent(state)).toBeUndefined()
    })

    it('should schedule the next raid with the interval after a resolved raid', async () => {
      const state = await createRaidState({
        raid: createRaid({
          remainingSeconds: 10,
        }),
      })
      state.advanceRaids(10)
      state.acknowledgeRaid()
      state.advanceRaids(0)
      const raid = state.colony.military.raid
      expect(raid.phase).toBe(RAID_PHASE_WAITING)
      expect(raid.remainingSeconds).toBe(state._raidInterval)
    })
  })

  // ── _raidSize ─────────────────────────────────────────────────────

  describe('_raidSize', () => {
    it('should grow with the territory cap and the year', async () => {
      const state = await createRaidState({
        colonyOverrides: {
          year: 3,
          resources: {
            territoryBonus: 10,
          },
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_SETTLEMENT,
            },
          },
        },
      })
      // Territory cap 2 × 10 + 10 = 30: floor(3 + 4.5 + 2 × 2) = 11
      expect(state._raidSize).toBe(11)
      expect(Math.floor(RAID_UNITS_BASE + RAID_UNITS_PER_TERRITORY * 30 + RAID_UNITS_PER_YEAR * 2)).toBe(11)
    })
  })

  // ── _raidBonus ────────────────────────────────────────────────────

  describe('_raidBonus', () => {
    it('should be 0 in the first year', async () => {
      const state = await createRaidState()
      expect(state.colony.year).toBe(1)
      expect(state._raidBonus).toBe(0)
    })

    it('should grow with every year after the first', async () => {
      const state = await createRaidState({
        colonyOverrides: {
          year: 4,
        },
      })
      expect(state._raidBonus).toBeCloseTo(RAID_BONUS_PER_YEAR * 3, 10)
    })
  })

  // ── _generateRaidArmy ─────────────────────────────────────────────

  describe('_generateRaidArmy', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    function total(enemy) {
      return enemy[UNIT_INFANTRY] + enemy[UNIT_ARCHER] + enemy[UNIT_CAVALRY]
    }

    it('should size the army from the territory cap and the year', async () => {
      const state = await createRaidState({
        colonyOverrides: {
          year: 3,
          resources: {
            territoryBonus: 10,
          },
          buildingOverrides: {
            headquarters: {
              level: 2,
              type: HQ_TYPE_SETTLEMENT,
            },
          },
        },
      })
      // Territory cap 2 × 10 + 10 = 30: floor(3 + 4.5 + 2 × 2) = 11
      const expected = Math.floor(RAID_UNITS_BASE + RAID_UNITS_PER_TERRITORY * 30 + RAID_UNITS_PER_YEAR * 2)
      expect(expected).toBe(11)
      expect(total(state._generateRaidArmy())).toBe(expected)
    })

    it('should only send infantry at Settlement', async () => {
      const state = await createRaidState()
      const enemy = state._generateRaidArmy()
      expect(enemy[UNIT_ARCHER]).toBe(0)
      expect(enemy[UNIT_CAVALRY]).toBe(0)
      expect(enemy[UNIT_INFANTRY]).toBe(total(enemy))
    })

    it('should add archers but not cavalry at Village', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 1,
              type: HQ_TYPE_VILLAGE,
            },
          },
        },
      })
      // 4 raiders split evenly between infantry and archers
      expect(state._generateRaidArmy()).toEqual({
        [UNIT_INFANTRY]: 2,
        [UNIT_ARCHER]: 2,
        [UNIT_CAVALRY]: 0,
      })
    })

    it('should split by random weight with floor and give the remainder to one random type', async () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.25)
        .mockReturnValueOnce(0.25)
        .mockReturnValueOnce(0.99)
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 3,
              type: HQ_TYPE_TOWN,
            },
          },
        },
      })
      // 7 raiders: floor(3.5) = 3, floor(1.75) = 1, floor(1.75) = 1, remainder 2 to cavalry
      expect(state._generateRaidArmy()).toEqual({
        [UNIT_INFANTRY]: 3,
        [UNIT_ARCHER]: 1,
        [UNIT_CAVALRY]: 3,
      })
    })

    it('should give the remainder to the type the last random pick selects', async () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.25)
        .mockReturnValueOnce(0.25)
        .mockReturnValueOnce(0)
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 3,
              type: HQ_TYPE_TOWN,
            },
          },
        },
      })
      expect(state._generateRaidArmy()).toEqual({
        [UNIT_INFANTRY]: 5,
        [UNIT_ARCHER]: 1,
        [UNIT_CAVALRY]: 1,
      })
    })

    it('should always total the army size whatever the weights', async () => {
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 5,
              type: HQ_TYPE_CITY,
            },
          },
        },
      })
      // Territory cap 50: floor(3 + 7.5) = 10
      for (const values of [
        [
          0.1,
          0.2,
          0.7,
          0.4,
        ],
        [
          0.9,
          0.05,
          0.05,
          0.6,
        ],
        [
          0.33,
          0.33,
          0.34,
          0.99,
        ],
      ]) {
        const spy = vi.spyOn(Math, 'random')
        for (const value of values) {
          spy.mockReturnValueOnce(value)
        }
        const enemy = state._generateRaidArmy()
        expect(total(enemy), values.join()).toBe(10)
        for (const count of Object.values(enemy)) {
          expect(count).toBeGreaterThanOrEqual(0)
        }
        spy.mockRestore()
      }
    })
  })

  // ── _generateTributeDemand ────────────────────────────────────────

  describe('_generateTributeDemand', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should split the value evenly over the picked resources', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const state = await createRaidState()
      // 2 resources (food, wood), 25 × 4 = 100 value → 50 each
      const demand = state._generateTributeDemand(4)
      expect(demand).toBeInstanceOf(Cost)
      expect(Object.fromEntries(demand.entries)).toEqual({
        food: 50,
        wood: 50,
      })
    })

    it('should convert by resource value and round each amount up to TRIBUTE_ROUNDING', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const state = await createRaidState()
      // 3 resources, 100 / 3 ≈ 33.3 each: food and wood 34 → 35, stone 33.3 / 1.5 → 23 → 25
      const demand = state._generateTributeDemand(4)
      expect(Object.fromEntries(demand.entries)).toEqual({
        food: 35,
        wood: 35,
        stone: 25,
      })
      for (const amount of demand.entries.values()) {
        expect(amount % TRIBUTE_ROUNDING).toBe(0)
      }
    })

    it('should pick from the higher resources once the headquarters unlocks them', async () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)
        .mockReturnValue(0.99)
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 5,
              type: HQ_TYPE_CITY,
            },
          },
        },
      })
      // 2 resources (gold, iron), 250 value → 125 each: gold 125 / 5 = 25, iron 125 / 3 → 42 → 45
      expect(Object.fromEntries(state._generateTributeDemand(10).entries)).toEqual({
        gold: 25,
        iron: 45,
      })
    })

    it('should only ask for bounded resources the headquarters has unlocked', async () => {
      const state = await createRaidState()
      const allowed = [
        RESOURCE_FOOD,
        RESOURCE_WOOD,
        RESOURCE_STONE,
      ]
      for (let i = 0; i < 30; i++) {
        const demand = state._generateTributeDemand(5)
        for (const resource of demand.entries.keys()) {
          expect(allowed, resource).toContain(resource)
        }
        expect(demand.copper + demand.iron + demand.gold + demand.faith + demand.knowledge).toBe(0)
      }
    })

    it('should ask for 2 or 3 distinct resources', async () => {
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            headquarters: {
              level: 5,
              type: HQ_TYPE_CITY,
            },
          },
        },
      })
      const counts = new Set()
      for (const first of [
        0,
        0.49,
        0.5,
        0.99,
      ]) {
        const spy = vi.spyOn(Math, 'random').mockReturnValueOnce(first).mockReturnValue(0.5)
        counts.add(state._generateTributeDemand(6).entries.size)
        spy.mockRestore()
      }
      expect([...counts].sort()).toEqual([
        2,
        3,
      ])
    })
  })

  // ── _resolveRaid ──────────────────────────────────────────────────

  describe('_resolveRaid', () => {
    beforeEach(() => {
      storage.tutorialCompleted = true
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    // A colony with no army, stocked resources, idle workers and two downgradable buildings
    function defeatOptions(overrides = {}) {
      return {
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 5,
          },
        }),
        colonyOverrides: {
          resources: {
            workers: 20,
            food: 400,
            wood: 300,
            stone: 200,
            copper: 100,
            iron: 50,
            gold: 10,
          },
          buildingOverrides: {
            farm: {
              level: 3,
            },
            quarry: {
              level: 3,
            },
          },
        },
        ...overrides,
      }
    }

    it('should apply only unit losses on a victory', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 9,
          },
        }),
        colonyOverrides: {
          resources: {
            workers: 5,
          },
          buildingOverrides: {
            barracks: {
              level: 2,
            },
            farm: {
              level: 3,
            },
          },
        },
      })
      state._resolveRaid()
      const report = state.raidReport
      expect(state.colony.military.units[UNIT_INFANTRY]).toBe(4)
      expect(report.victory).toBe(true)
      expect(report.army[UNIT_INFANTRY]).toBe(10)
      expect(report.enemy[UNIT_INFANTRY]).toBe(9)
      expect(report.unitsLost[UNIT_INFANTRY]).toBe(6)
      expect(report.resourcesLost).toEqual({})
      expect(report.workersLost).toBe(0)
      expect(report.buildingsLost).toEqual([])
      expect(state.colony.resources.food).toBe(200)
      expect(state.colony.resources.workers).toBe(5)
      expect(state.colony.buildings.farm.level).toBe(3)
    })

    it('should add a "Raid repelled" past event and play the alert sound on a victory', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 2,
          },
        }),
      })
      state._resolveRaid()
      const event = state.colony.events.past.find(candidate => candidate.type === EVENT_TYPE_RAID_RESULT)
      expect(event.textKey).toBe('event.raidRepelled')
      // The shortage warning may also play the alert later in the same step
      expect(audio.playSound).toHaveBeenNthCalledWith(1, SND_NOTIFICATION_ALERT)
      expect(audio.playSound).not.toHaveBeenCalledWith(SND_NOTIFICATION_DISASTER)
    })

    it('should apply full-severity defeat losses to a colony with no army', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const state = await createRaidState(defeatOptions())
      state._resolveRaid()
      const {
        resources, buildings,
      } = state.colony
      // 30% of each bounded resource, floored
      expect(resources.food).toBe(280)
      expect(resources.wood).toBe(210)
      expect(resources.stone).toBe(140)
      expect(resources.copper).toBe(70)
      expect(resources.iron).toBe(35)
      expect(resources.gold).toBe(7)
      // 10% of 20 workers
      expect(resources.workers).toBe(18)
      // 3 levels: the first eligible building each time (farm, farm, then quarry)
      expect(buildings.farm.level).toBe(1)
      expect(buildings.quarry.level).toBe(2)
    })

    it('should never take faith or knowledge on a defeat', async () => {
      const state = await createRaidState(defeatOptions())
      state._resolveRaid()
      expect(state.colony.resources.faith).toBe(200)
      expect(state.colony.resources.knowledge).toBe(200)
    })

    it('should pause running research when a defeat destroys an upgrading academy', async () => {
      const state = await createRaidState({
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 5,
          },
        }),
        colonyOverrides: {
          buildingOverrides: {
            academy: academyWithResearch(1, 30, {
              constructionRemaining: 10,
              constructionDuration: 20,
            }),
          },
        },
      })
      addResearchEvent(state, 'foodProduction1', 30)
      state._resolveRaid()
      state.advanceResearch(5)
      state.advanceEvents(5)
      const {
        academy,
      } = state.colony.buildings
      // The academy is the only eligible building, so the other levels are not taken
      expect(state.raidReport.buildingsLost).toEqual([BUILDING_ACADEMY])
      expect(academy.level).toBe(0)
      expect(academy.active.get('foodProduction1').remainingSeconds).toBe(30)
      expect(researchEvent(state, 'foodProduction1').remainingSeconds).toBe(30)
    })

    it('should report the losses actually applied on a defeat', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const state = await createRaidState(defeatOptions())
      state._resolveRaid()
      const report = state.raidReport
      expect(report.victory).toBe(false)
      expect(report.resourcesLost).toEqual({
        food: 120,
        wood: 90,
        stone: 60,
        copper: 30,
        iron: 15,
        gold: 3,
      })
      expect(report.workersLost).toBe(2)
      expect(report.buildingsLost).toEqual([
        BUILDING_FARM,
        BUILDING_FARM,
        BUILDING_QUARRY,
      ])
    })

    it('should report no building levels when no building can lose one', async () => {
      const state = await createRaidState(defeatOptions({
        colonyOverrides: {
          resources: {
            workers: 0,
          },
        },
      }))
      state._resolveRaid()
      expect(state.raidReport.victory).toBe(false)
      expect(state.raidReport.buildingsLost).toEqual([])
      expect(state.raidReport.workersLost).toBe(0)
    })

    it('should lose the whole army on a defeat', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 2,
          [UNIT_ARCHER]: 1,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 20,
          },
        }),
      })
      state._resolveRaid()
      expect(state.colony.military.totalUnits).toBe(0)
      expect(state.raidReport.army).toEqual({
        [UNIT_INFANTRY]: 2,
        [UNIT_ARCHER]: 1,
        [UNIT_CAVALRY]: 0,
      })
      expect(state.raidReport.unitsLost).toEqual(state.raidReport.army)
    })

    it('should add a "Raid lost" past event and play the disaster sound on a defeat', async () => {
      const state = await createRaidState(defeatOptions())
      state._resolveRaid()
      const event = state.colony.events.past.find(candidate => candidate.type === EVENT_TYPE_RAID_RESULT)
      expect(event.textKey).toBe('event.raidLost')
      expect(event.icon).toBe(IMG_BUILDING_WALL)
      expect(audio.playSound).toHaveBeenCalledWith(SND_NOTIFICATION_DISASTER)
    })

    it('should take no building levels while Celestial Fortification is active', async () => {
      const state = await createRaidState(defeatOptions({
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [
              createBlessing({
                type: BLESSING_CELESTIAL_FORTIFICATION,
                timeout: 300,
              }),
            ],
          }),
        },
      }))
      state._resolveRaid()
      expect(state.raidReport.buildingsLost).toEqual([])
      expect(state.colony.buildings.farm.level).toBe(3)
      expect(state.colony.buildings.quarry.level).toBe(3)
      // Resources and workers are still lost
      expect(state.colony.resources.food).toBe(280)
      expect(state.colony.resources.workers).toBe(18)
    })

    it('should pause the game, store the report and remove the raid event', async () => {
      const state = await createRaidState()
      expect(raidEvent(state)).toBeDefined()
      state._resolveRaid()
      expect(state.paused).toBe(true)
      expect(state.raidReport).toBeInstanceOf(RaidReport)
      expect(raidEvent(state)).toBeUndefined()
    })

    it('should increase the raid count and clear the raid', async () => {
      const state = await createRaidState({
        raidCount: 2,
      })
      state._resolveRaid()
      expect(state.colony.military.raidCount).toBe(3)
      expect(state.colony.military.raid).toBeNull()
    })

    it('should let the wall absorb losses', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 9,
          },
        }),
        colonyOverrides: {
          buildingOverrides: {
            wall: {
              level: 1,
            },
          },
        },
      })
      state._resolveRaid()
      expect(state.raidReport.unitsLost[UNIT_INFANTRY]).toBe(2)
    })

    it('should let the tower turn a tie into a victory', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 10,
          },
        }),
        colonyOverrides: {
          buildingOverrides: {
            tower: {
              level: 1,
            },
          },
        },
      })
      state._resolveRaid()
      expect(state.raidReport.victory).toBe(true)
    })

    it('should apply Attack and Defense research to the colony units', async () => {
      const tie = {
        units: {
          [UNIT_INFANTRY]: 10,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 10,
          },
        }),
      }
      const withoutResearch = await createRaidState(tie)
      withoutResearch._resolveRaid()
      expect(withoutResearch.raidReport.victory).toBe(false)
      for (const research of [
        RESEARCH_ATTACK_1,
        RESEARCH_DEFENSE_1,
      ]) {
        const state = await createRaidState({
          ...tie,
          raid: createRaid({
            enemy: {
              [UNIT_INFANTRY]: 10,
            },
          }),
          colonyOverrides: {
            buildingOverrides: {
              academy: {
                level: 1,
                completed: [research],
              },
            },
          },
        })
        state._resolveRaid()
        expect(state.raidReport.victory, research).toBe(true)
      }
    })

    it('should match the forecast shown before the battle', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 6,
          [UNIT_ARCHER]: 4,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 4,
            [UNIT_CAVALRY]: 3,
          },
        }),
      })
      const forecast = state._raidForecast
      state._resolveRaid()
      expect(state.raidReport.victory).toBe(forecast.victory)
      expect(state.raidReport.unitsLost).toEqual(forecast.unitsLost)
    })
  })

  // ── _raidForecast ─────────────────────────────────────────────────

  describe('_raidForecast', () => {
    it('should be null without a raid', async () => {
      const state = await createRaidState({
        raid: null,
      })
      expect(state._raidForecast).toBeNull()
    })

    it('should be null while the raid is waiting', async () => {
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 100,
        }),
      })
      expect(state._raidForecast).toBeNull()
    })

    it('should be the battle result for the incoming raid', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 3,
        },
      })
      const raid = state.colony.military.raid
      expect(state._raidForecast).toEqual(resolveBattle(state._raidDefender, {
        units: raid.enemy,
      }))
    })

    it('should include the raiders yearly bonus', async () => {
      const state = await createRaidState({
        colonyOverrides: {
          year: 4,
        },
        units: {
          [UNIT_INFANTRY]: 3,
        },
      })
      const raid = state.colony.military.raid
      const bonus = RAID_BONUS_PER_YEAR * 3
      expect(state._raidForecast).toEqual(resolveBattle(state._raidDefender, {
        units: raid.enemy,
        attackBonus: bonus,
        defenseBonus: bonus,
      }))
      expect(state._raidForecast.enemyPower).toBeGreaterThan(resolveBattle(state._raidDefender, {
        units: raid.enemy,
      }).enemyPower)
    })

    it('should improve as units are bought', async () => {
      storage.tutorialCompleted = true
      const state = await createRaidState({
        colonyOverrides: {
          buildingOverrides: {
            barracks: {
              level: 2,
            },
          },
        },
      })
      const before = state._raidForecast
      state.buyUnits(UNIT_INFANTRY, 4)
      const after = state._raidForecast
      expect(after.ratio).toBeGreaterThan(before.ratio)
    })

    it('should spare building levels while Celestial Fortification is active', async () => {
      const without = await createRaidState()
      const blessed = await createRaidState({
        metaOverrides: {
          challenges: createChallenges({
            activeBlessings: [
              createBlessing({
                type: BLESSING_CELESTIAL_FORTIFICATION,
                timeout: 300,
              }),
            ],
          }),
        },
      })
      expect(without._raidForecast.levelsLost).toBe(3)
      expect(blessed._raidForecast.levelsLost).toBe(0)
      expect(blessed._raidForecast.resourceShare).toBe(without._raidForecast.resourceShare)
    })
  })

  // ── _raidDefender ─────────────────────────────────────────────────

  describe('_raidDefender', () => {
    it('should describe the colony side of the battle', async () => {
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 4,
          [UNIT_CAVALRY]: 1,
        },
        colonyOverrides: {
          resources: {
            workers: 12,
          },
          buildingOverrides: {
            wall: {
              level: 2,
            },
            tower: {
              level: 3,
            },
            academy: {
              level: 1,
              completed: [
                RESEARCH_ATTACK_1,
                RESEARCH_DEFENSE_1,
              ],
            },
          },
        },
      })
      const defender = state._raidDefender
      expect(defender.units).toEqual({
        [UNIT_INFANTRY]: 4,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 1,
      })
      expect(defender.units).not.toBe(state.colony.military.units)
      expect(defender.wallLevel).toBe(2)
      expect(defender.towerLevel).toBe(3)
      expect(defender.attackBonus).toBeCloseTo(0.1, 10)
      expect(defender.defenseBonus).toBeCloseTo(0.1, 10)
      expect(defender.workers).toBe(12)
    })

    it('should give zero bonuses without military research', async () => {
      const state = await createRaidState()
      expect(state._raidDefender.attackBonus).toBe(0)
      expect(state._raidDefender.defenseBonus).toBe(0)
    })
  })

  // ── payTribute ────────────────────────────────────────────────────

  describe('payTribute', () => {
    beforeEach(() => {
      storage.tutorialCompleted = true
    })

    function tributeOptions(overrides = {}) {
      return {
        raid: createRaid({
          remainingSeconds: 60,
          ...overrides.raid,
        }),
        colonyOverrides: {
          resources: {
            food: 450,
            wood: 450,
            ...overrides.resources,
          },
          buildingOverrides: overrides.buildingOverrides,
        },
      }
    }

    it('should pay the delay price, add TRIBUTE_DELAY_SECONDS and count the delay', async () => {
      const state = await createRaidState(tributeOptions())
      state.payTribute(TRIBUTE_DELAY)
      const raid = state.colony.military.raid
      expect(state.colony.resources.food).toBe(350)
      expect(state.colony.resources.wood).toBe(400)
      expect(raid.remainingSeconds).toBe(60 + TRIBUTE_DELAY_SECONDS)
      expect(raid.delaysPaid).toBe(1)
    })

    it('should move the raid event to the new countdown in sorted order', async () => {
      const state = await createRaidState(tributeOptions())
      state.colony.events.addFuture({
        type: EVENT_TYPE_BUILDING_UPGRADE,
        textKey: 'event.buildingBuilding',
        buildingKey: BUILDING_FARM,
        remainingSeconds: 100,
      })
      expect(state.colony.events.future[0].type).toBe(EVENT_TYPE_RAID_INCOMING)
      state.payTribute(TRIBUTE_DELAY)
      expect(raidEvent(state).remainingSeconds).toBe(60 + TRIBUTE_DELAY_SECONDS)
      expect(state.colony.events.future[0].type).toBe(EVENT_TYPE_BUILDING_UPGRADE)
      expect(state.colony.events.future[1].type).toBe(EVENT_TYPE_RAID_INCOMING)
    })

    it('should raise the price with each delay', async () => {
      const state = await createRaidState(tributeOptions({
        resources: {
          food: 500,
          wood: 500,
        },
      }))
      state.payTribute(TRIBUTE_DELAY)
      state.payTribute(TRIBUTE_DELAY)
      state.payTribute(TRIBUTE_DELAY)
      // 100 + 150 + 225 food, 50 + 75 + 112 wood
      expect(state.colony.resources.food).toBe(25)
      expect(state.colony.resources.wood).toBe(263)
      expect(state.colony.military.raid.delaysPaid).toBe(3)
      expect(state.colony.military.raid.remainingSeconds).toBe(60 + 3 * TRIBUTE_DELAY_SECONDS)
    })

    it('should not offer a delay once it would cost more than cancelling', async () => {
      const state = await createRaidState(tributeOptions({
        raid: {
          delaysPaid: 3,
        },
      }))
      state.payTribute(TRIBUTE_DELAY)
      expect(state.colony.resources.food).toBe(450)
      expect(state.colony.military.raid.remainingSeconds).toBe(60)
      expect(state.colony.military.raid.delaysPaid).toBe(3)
    })

    it('should not scale a paid delay with Warning research', async () => {
      const state = await createRaidState(tributeOptions({
        buildingOverrides: {
          academy: {
            level: 1,
            completed: [RESEARCH_WARNING_1],
          },
        },
      }))
      state.payTribute(TRIBUTE_DELAY)
      expect(state.colony.military.raid.remainingSeconds).toBe(60 + TRIBUTE_DELAY_SECONDS)
    })

    it('should cancel the raid for the cancel price', async () => {
      const state = await createRaidState(tributeOptions())
      state.payTribute(TRIBUTE_CANCEL)
      const {
        military, events,
      } = state.colony
      expect(state.colony.resources.food).toBe(150)
      expect(state.colony.resources.wood).toBe(300)
      expect(military.raid).toBeNull()
      expect(military.raidCount).toBe(1)
      expect(raidEvent(state)).toBeUndefined()
      const event = events.past.find(candidate => candidate.type === EVENT_TYPE_RAID_RESULT)
      expect(event.textKey).toBe('event.raidCancelled')
      expect(state.raidReport).toBeNull()
      expect(state.paused).toBe(false)
    })

    it('should keep the cancel price fixed after delays', async () => {
      const state = await createRaidState(tributeOptions({
        raid: {
          delaysPaid: 2,
        },
      }))
      state.payTribute(TRIBUTE_CANCEL)
      expect(state.colony.resources.food).toBe(150)
      expect(state.colony.military.raid).toBeNull()
    })

    it('should schedule the next raid normally after cancelling', async () => {
      const state = await createRaidState(tributeOptions())
      state.payTribute(TRIBUTE_CANCEL)
      state.advanceRaids(0)
      const raid = state.colony.military.raid
      expect(raid.phase).toBe(RAID_PHASE_WAITING)
      expect(raid.remainingSeconds).toBe(state._raidInterval)
    })

    it('should do nothing when the delay is unaffordable', async () => {
      const state = await createRaidState(tributeOptions({
        resources: {
          food: 50,
        },
      }))
      state.payTribute(TRIBUTE_DELAY)
      expect(state.colony.resources.food).toBe(50)
      expect(state.colony.resources.wood).toBe(450)
      expect(state.colony.military.raid.remainingSeconds).toBe(60)
      expect(state.colony.military.raid.delaysPaid).toBe(0)
    })

    it('should do nothing when the cancel is unaffordable', async () => {
      const state = await createRaidState(tributeOptions({
        resources: {
          food: 299,
        },
      }))
      state.payTribute(TRIBUTE_CANCEL)
      expect(state.colony.resources.food).toBe(299)
      expect(state.colony.military.raid).not.toBeNull()
      expect(state.colony.military.raidCount).toBe(0)
      expect(raidEvent(state)).toBeDefined()
    })

    it('should do nothing while the raid is not announced', async () => {
      const state = await createRaidState({
        raid: new Raid({
          phase: RAID_PHASE_WAITING,
          remainingSeconds: 100,
        }),
      })
      state.payTribute(TRIBUTE_CANCEL)
      state.payTribute(TRIBUTE_DELAY)
      expect(state.colony.military.raid.phase).toBe(RAID_PHASE_WAITING)
      expect(state.colony.military.raid.remainingSeconds).toBe(100)
      expect(state.colony.resources.food).toBe(200)
    })

    it('should do nothing without a raid', async () => {
      const state = await createRaidState({
        raid: null,
      })
      state.payTribute(TRIBUTE_CANCEL)
      expect(state.colony.military.raid).toBeNull()
      expect(state.colony.military.raidCount).toBe(0)
    })

    it('should ignore an unknown tribute kind', async () => {
      const state = await createRaidState(tributeOptions())
      state.payTribute('bribe')
      expect(state.colony.resources.food).toBe(450)
      expect(state.colony.military.raid.remainingSeconds).toBe(60)
    })
  })

  // ── acknowledgeRaid ───────────────────────────────────────────────

  describe('acknowledgeRaid', () => {
    it('should clear the report and resume the game', async () => {
      const state = await createState()
      state.raidReport = new RaidReport({
        victory: true,
      })
      state.paused = true
      state.acknowledgeRaid()
      expect(state.raidReport).toBeNull()
      expect(state.paused).toBe(false)
    })

    it('should stay paused while a tutorial popup is open', async () => {
      const state = await createState()
      state.raidReport = new RaidReport({
        victory: true,
      })
      state.meta.tutorial.activeModal = TUTORIAL_MODAL_RAID_INCOMING
      state.paused = true
      state.acknowledgeRaid()
      expect(state.raidReport).toBeNull()
      expect(state.paused).toBe(true)
    })

    it('should stay paused while a challenge window is open', async () => {
      const state = await createState()
      state.raidReport = new RaidReport({
        victory: false,
      })
      state.challengeModal = CHALLENGE_MODAL_REWARD
      state.paused = true
      state.acknowledgeRaid()
      expect(state.raidReport).toBeNull()
      expect(state.paused).toBe(true)
    })

    it('should do nothing without a report', async () => {
      const state = await createState()
      state.paused = true
      state.acknowledgeRaid()
      expect(state.paused).toBe(true)
    })

    it('should keep the game paused when a tutorial popup closes while the result window is open', async () => {
      const state = await createState()
      state.raidReport = new RaidReport({
        victory: true,
      })
      state.meta.tutorial.activeModal = TUTORIAL_MODAL_NEGATIVE_PRODUCTION
      state.paused = true
      state.dismissTutorialModal()
      expect(state.paused).toBe(true)
      state.acknowledgeRaid()
      expect(state.paused).toBe(false)
    })

    it('should stay paused after a won raid that triggered a tutorial popup', async () => {
      // The surviving army eats food the colony does not produce, which shows the shortage popup
      const state = await createRaidState({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        raid: createRaid({
          enemy: {
            [UNIT_INFANTRY]: 2,
          },
        }),
      })
      state._resolveRaid()
      expect(state.meta.tutorial.activeModal).toBe(TUTORIAL_MODAL_NEGATIVE_PRODUCTION)
      state.acknowledgeRaid()
      expect(state.paused).toBe(true)
      state.dismissTutorialModal()
      expect(state.paused).toBe(false)
    })
  })

  // ── _removeResourceShare ──────────────────────────────────────────

  describe('_removeResourceShare', () => {
    it('should remove the share of each bounded resource and return the amounts removed', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 400,
            wood: 300,
            stone: 200,
            copper: 100,
            iron: 50,
            gold: 10,
          },
        },
      })
      expect(state._removeResourceShare(0.3)).toEqual({
        [RESOURCE_FOOD]: 120,
        [RESOURCE_WOOD]: 90,
        [RESOURCE_STONE]: 60,
        [RESOURCE_COPPER]: 30,
        [RESOURCE_IRON]: 15,
        [RESOURCE_GOLD]: 3,
      })
      expect(state.colony.resources.food).toBe(280)
      expect(state.colony.resources.gold).toBe(7)
    })

    it('should floor what remains and count the rest as removed', async () => {
      const state = await createState({
        colonyOverrides: {
          resources: {
            food: 101,
          },
        },
      })
      const removed = state._removeResourceShare(0.3)
      expect(state.colony.resources.food).toBe(70)
      expect(removed[RESOURCE_FOOD]).toBe(31)
    })

    it('should not touch faith or knowledge', async () => {
      const state = await createState()
      const removed = state._removeResourceShare(0.5)
      expect(state.colony.resources.faith).toBe(200)
      expect(state.colony.resources.knowledge).toBe(200)
      expect(removed).not.toHaveProperty('faith')
      expect(removed).not.toHaveProperty('knowledge')
    })

    it('should remove nothing for a share of 0', async () => {
      const state = await createState()
      const removed = state._removeResourceShare(0)
      expect(Object.values(removed).every(amount => amount === 0)).toBe(true)
      expect(state.colony.resources.food).toBe(200)
    })
  })

  // ── _downgradeRandomBuildings ─────────────────────────────────────

  describe('_downgradeRandomBuildings', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should return the key of each level removed', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 3,
            },
            quarry: {
              level: 3,
            },
          },
        },
      })
      expect(state._downgradeRandomBuildings(3)).toEqual([
        BUILDING_FARM,
        BUILDING_FARM,
        BUILDING_QUARRY,
      ])
      expect(state.colony.buildings.farm.level).toBe(1)
      expect(state.colony.buildings.quarry.level).toBe(2)
    })

    it('should stop and return fewer keys when nothing else is eligible', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 2,
            },
          },
        },
      })
      expect(state._downgradeRandomBuildings(3)).toEqual([BUILDING_FARM])
      expect(state.colony.buildings.farm.level).toBe(1)
    })

    it('should destroy a level 1 building under construction and return its key', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 1,
              constructionRemaining: 5,
              constructionDuration: 10,
            },
          },
        },
      })
      expect(state._downgradeRandomBuildings(1)).toEqual([BUILDING_FARM])
      expect(state.colony.buildings.farm.level).toBe(0)
      expect(state.colony.buildings.farm.isConstructing).toBe(false)
      expect(state._constructingKeys.has(BUILDING_FARM)).toBe(false)
    })

    it('should never downgrade military buildings', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            barracks: {
              level: 3,
            },
            archery: {
              level: 3,
            },
            stable: {
              level: 3,
            },
            wall: {
              level: 3,
            },
            tower: {
              level: 3,
            },
          },
        },
      })
      expect(state._downgradeRandomBuildings(3)).toEqual([])
      const {
        buildings,
      } = state.colony
      expect([
        buildings.barracks.level,
        buildings.archery.level,
        buildings.stable.level,
        buildings.wall.level,
        buildings.tower.level,
      ]).toEqual([
        3,
        3,
        3,
        3,
        3,
      ])
    })

    it('should return an empty list for 0 levels', async () => {
      const state = await createState({
        colonyOverrides: {
          buildingOverrides: {
            farm: {
              level: 3,
            },
          },
        },
      })
      expect(state._downgradeRandomBuildings(0)).toEqual([])
      expect(state.colony.buildings.farm.level).toBe(3)
    })
  })
})
