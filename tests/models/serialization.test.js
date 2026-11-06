import {describe, it, expect} from 'vitest'
import {BLESSING_FERTILE_SOIL, BLESSING_GIFT_FROM_THE_HEAVENS, BUILDING_FARM, BUILDING_HEADQUARTERS, CHALLENGE_STATUS_PENDING, CHALLENGE_STATUS_STARTED, EVENT_TYPE_SEASON_CHANGED, HQ_TYPE_CAMP, PUNISHMENT_CROP_FAILURE, RAID_PHASE_INCOMING, RAID_PHASE_WAITING, SEASON_WARM, UNIT_ARCHER, UNIT_CAVALRY, UNIT_INFANTRY} from '@/js/engine/enums.js'
import {BUILDING_CLASS_MAP} from '@/js/engine/constants.js'
import Blessing from '@/js/models/blessing.js'
import Punishment from '@/js/models/punishment.js'
import Challenge from '@/js/models/challenge.js'
import Challenges from '@/js/models/challenges.js'
import Meta from '@/js/models/meta.js'
import Tutorial from '@/js/models/tutorial.js'
import Colony from '@/js/models/colony.js'
import Resources from '@/js/models/resources.js'
import Season from '@/js/models/season.js'
import Buildings from '@/js/models/buildings.js'
import Headquarters from '@/js/models/buildings/headquarters.js'
import Market from '@/js/models/buildings/market.js'
import Production from '@/js/models/production.js'
import Consumption from '@/js/models/consumption.js'
import Events from '@/js/models/events/events.js'
import EventFuture from '@/js/models/events/event_future.js'
import EventPast from '@/js/models/events/event_past.js'
import Cost from '@/js/models/cost.js'
import Military from '@/js/models/military.js'
import Raid from '@/js/models/raid.js'
import RaidReport from '@/js/models/raid_report.js'
import {createChallengeDefinition} from '../helpers/factories.js'

// Minimal valid data factories for nested dependencies

function minimalBlessingData(overrides = {}) {
  return {
    type: BLESSING_FERTILE_SOIL,
    ...overrides,
  }
}

function minimalPunishmentData(overrides = {}) {
  return {
    type: PUNISHMENT_CROP_FAILURE,
    ...overrides,
  }
}

function minimalChallengeData(overrides = {}) {
  return {
    index: 1,
    status: CHALLENGE_STATUS_PENDING,
    delay: 60,
    timeout: 300,
    requirements: {
      faith: 100,
    },
    blessings: [minimalBlessingData()],
    punishment: minimalPunishmentData(),
    ...overrides,
  }
}

function minimalChallengesData(overrides = {}) {
  return {
    active: null,
    completed: [],
    activeBlessings: [],
    activePunishments: [],
    ...overrides,
  }
}

function minimalTutorialData(overrides = {}) {
  return {
    currentStep: 0,
    completed: false,
    dismissedModals: [],
    ...overrides,
  }
}

function minimalMetaData(overrides = {}) {
  return {
    version: 2,
    createdDateTime: '2026-01-01T00:00:00.000Z',
    updatedDateTime: '2026-01-01T00:00:00.000Z',
    challenges: minimalChallengesData(),
    tutorial: minimalTutorialData(),
    ...overrides,
  }
}

function minimalSeasonData(overrides = {}) {
  return {
    currentSeason: SEASON_WARM,
    seasonElapsed: 0,
    ...overrides,
  }
}

function minimalResourcesData(overrides = {}) {
  return {
    territory: 1,
    workers: 0,
    food: 0,
    wood: 0,
    stone: 0,
    copper: 0,
    iron: 0,
    gold: 0,
    faith: 0,
    knowledge: 0,
    ...overrides,
  }
}

function minimalBuildingsData() {
  const data = {}
  for (const key of Object.keys(BUILDING_CLASS_MAP)) {
    data[key] = key === BUILDING_HEADQUARTERS
      ? {
        level: 1,
        type: HQ_TYPE_CAMP,
      }
      : {
        level: 0,
      }
  }
  return data
}

function minimalEventsData(overrides = {}) {
  return {
    future: [],
    past: [],
    nextId: 1,
    ...overrides,
  }
}

function minimalColonyData(overrides = {}) {
  return {
    year: 1,
    season: minimalSeasonData(),
    resources: minimalResourcesData(),
    buildings: minimalBuildingsData(),
    events: minimalEventsData(),
    ...overrides,
  }
}

function minimalEventData(overrides = {}) {
  return {
    id: 1,
    type: EVENT_TYPE_SEASON_CHANGED,
    textKey: 'event.seasonChanged',
    icon: '/img/resources/food.png',
    ...overrides,
  }
}

// ============================================================
// Blessing
// ============================================================

describe('Serialization robustness', () => {
  describe('Blessing', () => {
    it('fromJSON with missing optional fields uses defaults', () => {
      const blessing = Blessing.fromJSON({
        type: BLESSING_FERTILE_SOIL,
      })
      expect(blessing).toBeInstanceOf(Blessing)
      expect(blessing.type).toBe(BLESSING_FERTILE_SOIL)
      expect(blessing.timeout).toBeNull()
      expect(blessing.productivity).toBeNull()
      expect(blessing.resources).toBeNull()
      expect(blessing.territory).toBeNull()
      expect(blessing.construction).toBeNull()
      expect(blessing.warm).toBeNull()
      expect(blessing.cold).toBeNull()
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const blessing = Blessing.fromJSON({
        type: BLESSING_FERTILE_SOIL,
        unknownField: 'test',
        anotherExtra: 42,
      })
      expect(blessing).toBeInstanceOf(Blessing)
      expect(blessing.type).toBe(BLESSING_FERTILE_SOIL)
      expect(blessing).not.toHaveProperty('unknownField')
      expect(blessing).not.toHaveProperty('anotherExtra')
    })

    it('fromJSON with null input throws', () => {
      expect(() => Blessing.fromJSON(null)).toThrow()
    })

    it('fromJSON with undefined input throws', () => {
      expect(() => Blessing.fromJSON(undefined)).toThrow()
    })
  })

  // ============================================================
  // Punishment
  // ============================================================

  describe('Punishment', () => {
    it('fromJSON with missing optional fields uses defaults', () => {
      const punishment = Punishment.fromJSON({
        type: PUNISHMENT_CROP_FAILURE,
      })
      expect(punishment).toBeInstanceOf(Punishment)
      expect(punishment.type).toBe(PUNISHMENT_CROP_FAILURE)
      expect(punishment.timeout).toBeNull()
      expect(punishment.faith).toBeNull()
      expect(punishment.productivityFarm).toBeNull()
      expect(punishment.productivityWoodcutter).toBeNull()
      expect(punishment.productivityMines).toBeNull()
      expect(punishment.productivityGeneral).toBeNull()
      expect(punishment.resources).toBeNull()
      expect(punishment.workers).toBeNull()
      expect(punishment.levels).toBeNull()
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const punishment = Punishment.fromJSON({
        type: PUNISHMENT_CROP_FAILURE,
        unknownField: true,
      })
      expect(punishment).toBeInstanceOf(Punishment)
      expect(punishment).not.toHaveProperty('unknownField')
    })

    it('fromJSON with null input throws', () => {
      expect(() => Punishment.fromJSON(null)).toThrow()
    })

    it('fromJSON with undefined input throws', () => {
      expect(() => Punishment.fromJSON(undefined)).toThrow()
    })
  })

  // ============================================================
  // Challenge
  // ============================================================

  describe('Challenge', () => {
    it('fromJSON with missing optional fields uses defaults', () => {
      const challenge = Challenge.fromJSON(minimalChallengeData())
      expect(challenge).toBeInstanceOf(Challenge)
      expect(challenge.delayElapsed).toBe(0)
      expect(challenge.timeoutElapsed).toBe(0)
    })

    it('fromJSON preserves provided optional fields', () => {
      const challenge = Challenge.fromJSON(minimalChallengeData({
        delayElapsed: 30,
        timeoutElapsed: 120,
      }))
      expect(challenge.delayElapsed).toBe(30)
      expect(challenge.timeoutElapsed).toBe(120)
    })

    it('fromJSON with missing failures and mood uses defaults', () => {
      const challenge = Challenge.fromJSON(minimalChallengeData())
      expect(challenge.failures).toBe(0)
      expect(challenge.mood).toBeNull()
    })

    it('fromJSON preserves provided failures and mood', () => {
      const challenge = Challenge.fromJSON(minimalChallengeData({
        failures: 2,
        mood: 'merciful',
      }))
      expect(challenge.failures).toBe(2)
      expect(challenge.mood).toBe('merciful')
    })

    it('fromJSON with only progress and no definition throws', () => {
      expect(() => Challenge.fromJSON({
        index: 1,
        status: CHALLENGE_STATUS_PENDING,
        delay: 60,
      })).toThrow()
    })

    it('fromJSON reconstructs nested Blessing and Punishment instances', () => {
      const challenge = Challenge.fromJSON(minimalChallengeData({
        blessings: [
          minimalBlessingData({
            timeout: 60,
          }),
          minimalBlessingData({
            type: BLESSING_GIFT_FROM_THE_HEAVENS,
          }),
        ],
      }))
      expect(challenge.blessings).toHaveLength(2)
      expect(challenge.blessings[0]).toBeInstanceOf(Blessing)
      expect(challenge.blessings[0].timeout).toBe(60)
      expect(challenge.blessings[1].type).toBe(BLESSING_GIFT_FROM_THE_HEAVENS)
      expect(challenge.punishment).toBeInstanceOf(Punishment)
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const challenge = Challenge.fromJSON(minimalChallengeData({
        unknownField: 'test',
      }))
      expect(challenge).toBeInstanceOf(Challenge)
      expect(challenge).not.toHaveProperty('unknownField')
    })

    it('fromJSON with null input throws', () => {
      expect(() => Challenge.fromJSON(null)).toThrow()
    })
  })

  // ============================================================
  // Challenges
  // ============================================================

  describe('Challenges', () => {
    it('fromJSON with missing optional arrays uses defaults', () => {
      const challenges = Challenges.fromJSON({})
      expect(challenges).toBeInstanceOf(Challenges)
      expect(challenges.pending).toEqual([])
      expect(challenges.active).toBeNull()
      expect(challenges.completed).toEqual([])
      expect(challenges.activeBlessings).toEqual([])
      expect(challenges.activePunishments).toEqual([])
    })

    it('fromJSON reconstructs nested Challenge instances from the definitions', () => {
      const challenges = Challenges.fromJSON({
        active: minimalChallengeData({
          index: 2,
          status: CHALLENGE_STATUS_STARTED,
        }),
        completed: [1],
        activeBlessings: [
          minimalBlessingData({
            timeout: 60,
          }),
        ],
        activePunishments: [
          minimalPunishmentData({
            timeout: 60,
          }),
        ],
      }, [
        createChallengeDefinition({
          index: 1,
        }),
        createChallengeDefinition({
          index: 2,
        }),
        createChallengeDefinition({
          index: 3,
        }),
      ])
      expect(challenges.pending[0]).toBeInstanceOf(Challenge)
      expect(challenges.active).toBeInstanceOf(Challenge)
      expect(challenges.completed[0]).toBeInstanceOf(Challenge)
      expect(challenges.activeBlessings[0]).toBeInstanceOf(Blessing)
      expect(challenges.activePunishments[0]).toBeInstanceOf(Punishment)
    })

    it('fromJSON without definitions restores no pending or completed challenges', () => {
      const challenges = Challenges.fromJSON(minimalChallengesData({
        completed: [1],
      }))
      expect(challenges.pending).toEqual([])
      expect(challenges.completed).toEqual([])
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const challenges = Challenges.fromJSON({
        ...minimalChallengesData(),
        unknownField: [
          1,
          2,
          3,
        ],
      })
      expect(challenges).toBeInstanceOf(Challenges)
      expect(challenges).not.toHaveProperty('unknownField')
    })

    it('fromJSON with null input throws', () => {
      expect(() => Challenges.fromJSON(null)).toThrow()
    })
  })

  // ============================================================
  // Tutorial (constructor-based deserialization)
  // ============================================================

  describe('Tutorial', () => {
    it('constructor with missing fields uses defaults', () => {
      const tutorial = new Tutorial({})
      expect(tutorial.currentStep).toBe(0)
      expect(tutorial.completed).toBe(false)
      expect(tutorial.dismissedModals).toEqual(new Set())
      expect(tutorial.activeModal).toBeNull()
    })

    it('constructor with null input uses defaults', () => {
      const tutorial = new Tutorial(null)
      expect(tutorial.currentStep).toBe(0)
      expect(tutorial.completed).toBe(false)
      expect(tutorial.dismissedModals).toEqual(new Set())
    })

    it('constructor with undefined input uses defaults', () => {
      const tutorial = new Tutorial(undefined)
      expect(tutorial.currentStep).toBe(0)
      expect(tutorial.completed).toBe(false)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const tutorial = new Tutorial({
        currentStep: 3,
        completed: true,
        unknownField: 'test',
      })
      expect(tutorial.currentStep).toBe(3)
      expect(tutorial.completed).toBe(true)
      expect(tutorial).not.toHaveProperty('unknownField')
    })

    it('constructor converts dismissedModals array to Set', () => {
      const tutorial = new Tutorial({
        dismissedModals: [
          'modal1',
          'modal2',
        ],
      })
      expect(tutorial.dismissedModals).toBeInstanceOf(Set)
      expect(tutorial.dismissedModals.has('modal1')).toBe(true)
      expect(tutorial.dismissedModals.has('modal2')).toBe(true)
    })
  })

  // ============================================================
  // Resources (constructor-based deserialization)
  // ============================================================

  describe('Resources', () => {
    it('constructor with missing fields uses zero defaults', () => {
      const resources = new Resources({})
      expect(resources.territory).toBe(0)
      expect(resources.territoryBonus).toBe(0)
      expect(resources.workers).toBe(0)
      expect(resources.food).toBe(0)
      expect(resources.wood).toBe(0)
      expect(resources.stone).toBe(0)
      expect(resources.copper).toBe(0)
      expect(resources.iron).toBe(0)
      expect(resources.gold).toBe(0)
      expect(resources.faith).toBe(0)
      expect(resources.knowledge).toBe(0)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const resources = new Resources({
        food: 50,
        unknownResource: 999,
      })
      expect(resources.food).toBe(50)
      expect(resources).not.toHaveProperty('unknownResource')
    })

    it('constructor with null input throws', () => {
      expect(() => new Resources(null)).toThrow()
    })
  })

  // ============================================================
  // Season (constructor-based deserialization)
  // ============================================================

  describe('Season', () => {
    it('constructor sets fields from data', () => {
      const season = new Season({
        currentSeason: SEASON_WARM,
        seasonElapsed: 50,
      })
      expect(season.currentSeason).toBe(SEASON_WARM)
      expect(season.seasonElapsed).toBe(50)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const season = new Season({
        currentSeason: SEASON_WARM,
        seasonElapsed: 0,
        unknownField: true,
      })
      expect(season).not.toHaveProperty('unknownField')
    })

    it('constructor with null input throws', () => {
      expect(() => new Season(null)).toThrow()
    })
  })

  // ============================================================
  // Meta
  // ============================================================

  describe('Meta', () => {
    it('fromJSON with missing gameSpeed uses default', () => {
      const meta = Meta.fromJSON(minimalMetaData())
      expect(meta).toBeInstanceOf(Meta)
      expect(meta.gameSpeed).toBe(1)
    })

    it('fromJSON preserves provided gameSpeed', () => {
      const meta = Meta.fromJSON(minimalMetaData({
        gameSpeed: 3,
      }))
      expect(meta.gameSpeed).toBe(3)
    })

    it('fromJSON reconstructs nested Challenges and Tutorial', () => {
      const meta = Meta.fromJSON(minimalMetaData({
        challenges: minimalChallengesData(),
        tutorial: {
          currentStep: 5,
          completed: true,
          dismissedModals: ['m1'],
        },
      }), [createChallengeDefinition()])
      expect(meta.challenges).toBeInstanceOf(Challenges)
      expect(meta.challenges.pending).toHaveLength(1)
      expect(meta.tutorial).toBeInstanceOf(Tutorial)
      expect(meta.tutorial.currentStep).toBe(5)
      expect(meta.tutorial.completed).toBe(true)
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const meta = Meta.fromJSON({
        ...minimalMetaData(),
        unknownField: 'test',
      })
      expect(meta).toBeInstanceOf(Meta)
      expect(meta).not.toHaveProperty('unknownField')
    })

    it('fromJSON with null input throws', () => {
      expect(() => Meta.fromJSON(null)).toThrow()
    })
  })

  // ============================================================
  // Buildings
  // ============================================================

  describe('Buildings', () => {
    it('fromJSON reconstructs all building instances', () => {
      const buildings = Buildings.fromJSON(minimalBuildingsData(), BUILDING_CLASS_MAP)
      expect(buildings).toBeInstanceOf(Buildings)
      expect(buildings.headquarters).toBeInstanceOf(Headquarters)
      expect(buildings.headquarters.type).toBe(HQ_TYPE_CAMP)
      expect(buildings.farm.level).toBe(0)
    })

    it('fromJSON skips unknown building keys', () => {
      const data = {
        ...minimalBuildingsData(),
        unknownBuilding: {
          level: 5,
        },
      }
      const buildings = Buildings.fromJSON(data, BUILDING_CLASS_MAP)
      expect(buildings).toBeInstanceOf(Buildings)
      expect(buildings).not.toHaveProperty('unknownBuilding')
    })

    it('fromJSON with empty object creates Buildings with undefined fields', () => {
      const buildings = Buildings.fromJSON({}, BUILDING_CLASS_MAP)
      expect(buildings).toBeInstanceOf(Buildings)
      expect(buildings.headquarters).toBeUndefined()
    })

    it('fromJSON with null input throws', () => {
      expect(() => Buildings.fromJSON(null, BUILDING_CLASS_MAP)).toThrow()
    })
  })

  // ============================================================
  // Headquarters
  // ============================================================

  describe('Headquarters', () => {
    it('constructor with missing optional fields uses defaults', () => {
      const headquarters = new Headquarters({
        level: 1,
        type: HQ_TYPE_CAMP,
      })
      expect(headquarters.level).toBe(1)
      expect(headquarters.type).toBe(HQ_TYPE_CAMP)
      expect(headquarters.upgradeRemaining).toBe(0)
      expect(headquarters.upgradeDuration).toBe(0)
      expect(headquarters.constructionRemaining).toBe(0)
      expect(headquarters.constructionDuration).toBe(0)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const headquarters = new Headquarters({
        level: 1,
        type: HQ_TYPE_CAMP,
        unknownField: 'test',
      })
      expect(headquarters).not.toHaveProperty('unknownField')
    })

    it('constructor with null input throws', () => {
      expect(() => new Headquarters(null)).toThrow()
    })
  })

  // ============================================================
  // Market
  // ============================================================

  describe('Market', () => {
    it('constructor with missing price fields uses base price defaults', () => {
      const market = new Market({
        level: 1,
      })
      expect(market).toBeInstanceOf(Market)
      expect(market.level).toBe(1)
      expect(market.food).toBeGreaterThan(0)
      expect(market.wood).toBeGreaterThan(0)
      expect(market.stone).toBeGreaterThan(0)
      expect(market.copper).toBeGreaterThan(0)
      expect(market.iron).toBeGreaterThan(0)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const market = new Market({
        level: 1,
        unknownField: 'test',
      })
      expect(market).not.toHaveProperty('unknownField')
    })

    it('constructor with null input throws', () => {
      expect(() => new Market(null)).toThrow()
    })
  })

  // ============================================================
  // Production (constructor-based deserialization)
  // ============================================================

  describe('Production', () => {
    it('constructor with missing fields uses zero defaults', () => {
      const production = new Production({})
      expect(production.food).toBe(0)
      expect(production.wood).toBe(0)
      expect(production.stone).toBe(0)
      expect(production.copper).toBe(0)
      expect(production.iron).toBe(0)
      expect(production.gold).toBe(0)
      expect(production.faith).toBe(0)
      expect(production.knowledge).toBe(0)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const production = new Production({
        food: 5,
        unknownField: 99,
      })
      expect(production.food).toBe(5)
      expect(production).not.toHaveProperty('unknownField')
    })

    it('constructor with null input throws', () => {
      expect(() => new Production(null)).toThrow()
    })

    it('constructor with undefined input throws', () => {
      expect(() => new Production(undefined)).toThrow()
    })
  })

  // ============================================================
  // Consumption (constructor-based deserialization)
  // ============================================================

  describe('Consumption', () => {
    it('constructor with missing fields uses zero defaults', () => {
      const consumption = new Consumption({})
      expect(consumption.food).toBe(0)
      expect(consumption.wood).toBe(0)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const consumption = new Consumption({
        food: 3,
        unknownField: 42,
      })
      expect(consumption.food).toBe(3)
      expect(consumption).not.toHaveProperty('unknownField')
    })

    it('constructor with null input throws', () => {
      expect(() => new Consumption(null)).toThrow()
    })

    it('constructor with undefined input throws', () => {
      expect(() => new Consumption(undefined)).toThrow()
    })
  })

  // ============================================================
  // Events
  // ============================================================

  describe('Events', () => {
    it('fromJSON with missing optional fields uses defaults', () => {
      const events = Events.fromJSON({})
      expect(events).toBeInstanceOf(Events)
      expect(events.future).toEqual([])
      expect(events.past).toEqual([])
      expect(events._nextId).toBe(1)
    })

    it('fromJSON reconstructs EventFuture and EventPast instances', () => {
      const events = Events.fromJSON({
        future: [
          {
            ...minimalEventData(),
            remainingSeconds: 30,
          },
        ],
        past: [
          minimalEventData({
            id: 2,
          }),
        ],
        nextId: 3,
      })
      expect(events.future).toHaveLength(1)
      expect(events.future[0]).toBeInstanceOf(EventFuture)
      expect(events.future[0].remainingSeconds).toBe(30)
      expect(events.past).toHaveLength(1)
      expect(events.past[0]).toBeInstanceOf(EventPast)
      expect(events._nextId).toBe(3)
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const events = Events.fromJSON({
        future: [],
        past: [],
        nextId: 1,
        unknownField: 'test',
      })
      expect(events).toBeInstanceOf(Events)
      expect(events).not.toHaveProperty('unknownField')
    })

    it('fromJSON with null input throws', () => {
      expect(() => Events.fromJSON(null)).toThrow()
    })
  })

  // ============================================================
  // EventFuture
  // ============================================================

  describe('EventFuture', () => {
    it('constructor with missing optional fields uses defaults', () => {
      const event = new EventFuture({
        id: 1,
        type: EVENT_TYPE_SEASON_CHANGED,
        textKey: 'event.test',
        icon: '/img/test.png',
        remainingSeconds: 60,
      })
      expect(event.params).toEqual([])
      expect(event.buildingKey).toBeNull()
      expect(event.researchKey).toBeNull()
      expect(event.action).toBeNull()
      expect(event.remainingSeconds).toBe(60)
    })

    it('constructor with extra unknown fields ignores them', () => {
      const event = new EventFuture({
        ...minimalEventData(),
        remainingSeconds: 10,
        unknownField: 'test',
      })
      expect(event).not.toHaveProperty('unknownField')
    })
  })

  // ============================================================
  // EventPast
  // ============================================================

  describe('EventPast', () => {
    it('constructor with missing optional fields uses defaults', () => {
      const event = new EventPast({
        id: 1,
        type: EVENT_TYPE_SEASON_CHANGED,
        textKey: 'event.test',
        icon: '/img/test.png',
      })
      expect(event.params).toEqual([])
      expect(event.buildingKey).toBeNull()
      expect(event.researchKey).toBeNull()
      expect(event.action).toBeNull()
    })

    it('constructor with extra unknown fields ignores them', () => {
      const event = new EventPast({
        ...minimalEventData(),
        unknownField: 'test',
      })
      expect(event).not.toHaveProperty('unknownField')
    })
  })

  // ============================================================
  // Raid
  // ============================================================

  describe('Raid', () => {
    it('fromJSON with missing optional fields uses defaults', () => {
      const raid = Raid.fromJSON({})
      expect(raid).toBeInstanceOf(Raid)
      expect(raid.phase).toBe(RAID_PHASE_WAITING)
      expect(raid.remainingSeconds).toBe(0)
      expect(raid.enemy).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 0,
      })
      expect(raid.demand).toBeNull()
      expect(raid.delaysPaid).toBe(0)
    })

    it('fromJSON fills missing unit types in the enemy', () => {
      const raid = Raid.fromJSON({
        phase: RAID_PHASE_INCOMING,
        remainingSeconds: 10,
        enemy: {
          [UNIT_CAVALRY]: 3,
        },
      })
      expect(raid.enemy).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 3,
      })
    })

    it('fromJSON with null enemy and demand uses defaults', () => {
      const raid = Raid.fromJSON({
        enemy: null,
        demand: null,
      })
      expect(raid.enemyCount).toBe(0)
      expect(raid.demand).toBeNull()
    })

    it('fromJSON rebuilds a partial demand as a Cost', () => {
      const raid = Raid.fromJSON({
        demand: {
          stone: 25,
        },
      })
      expect(raid.demand).toBeInstanceOf(Cost)
      expect(raid.demand.stone).toBe(25)
      expect(raid.demand.food).toBe(0)
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const raid = Raid.fromJSON({
        phase: RAID_PHASE_WAITING,
        unknownField: 'test',
      })
      expect(raid).toBeInstanceOf(Raid)
      expect(raid).not.toHaveProperty('unknownField')
    })

    it('fromJSON with undefined input uses defaults', () => {
      const raid = Raid.fromJSON(undefined)
      expect(raid).toBeInstanceOf(Raid)
      expect(raid.phase).toBe(RAID_PHASE_WAITING)
    })

    it('fromJSON with null input throws', () => {
      expect(() => Raid.fromJSON(null)).toThrow()
    })
  })

  // ============================================================
  // Military
  // ============================================================

  describe('Military', () => {
    it('fromJSON with missing optional fields uses defaults', () => {
      const military = Military.fromJSON({})
      expect(military).toBeInstanceOf(Military)
      expect(military.units).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 0,
      })
      expect(military.raid).toBeNull()
      expect(military.raidCount).toBe(0)
    })

    it('fromJSON fills missing unit types', () => {
      const military = Military.fromJSON({
        units: {
          [UNIT_INFANTRY]: 2,
        },
      })
      expect(military.units).toEqual({
        [UNIT_INFANTRY]: 2,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 0,
      })
    })

    it('fromJSON with null units and raid uses defaults', () => {
      const military = Military.fromJSON({
        units: null,
        raid: null,
        raidCount: null,
      })
      expect(military.totalUnits).toBe(0)
      expect(military.raid).toBeNull()
      expect(military.raidCount).toBe(0)
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const military = Military.fromJSON({
        units: {
          [UNIT_INFANTRY]: 1,
          siege: 4,
        },
        unknownField: 'test',
      })
      expect(military).not.toHaveProperty('unknownField')
      expect(military.units).not.toHaveProperty('siege')
      expect(military.totalUnits).toBe(1)
    })

    it('fromJSON with null input uses defaults', () => {
      const military = Military.fromJSON(null)
      expect(military).toBeInstanceOf(Military)
      expect(military.totalUnits).toBe(0)
    })

    it('fromJSON with undefined input uses defaults', () => {
      const military = Military.fromJSON(undefined)
      expect(military).toBeInstanceOf(Military)
      expect(military.raid).toBeNull()
    })
  })

  // ============================================================
  // RaidReport
  // ============================================================

  describe('RaidReport', () => {
    it('fromJSON with missing optional fields uses defaults', () => {
      const report = RaidReport.fromJSON({})
      expect(report).toBeInstanceOf(RaidReport)
      expect(report.victory).toBe(false)
      expect(report.army).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 0,
      })
      expect(report.enemy).toEqual(report.army)
      expect(report.unitsLost).toEqual(report.army)
      expect(report.resourcesLost).toEqual({})
      expect(report.workersLost).toBe(0)
      expect(report.buildingsLost).toEqual([])
    })

    it('fromJSON with null nested fields uses defaults', () => {
      const report = RaidReport.fromJSON({
        army: null,
        enemy: null,
        unitsLost: null,
        resourcesLost: null,
        workersLost: null,
        buildingsLost: null,
      })
      expect(report.army[UNIT_INFANTRY]).toBe(0)
      expect(report.resourcesLost).toEqual({})
      expect(report.workersLost).toBe(0)
      expect(report.buildingsLost).toEqual([])
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const report = RaidReport.fromJSON({
        victory: true,
        buildingsLost: [BUILDING_FARM],
        unknownField: 'test',
      })
      expect(report).not.toHaveProperty('unknownField')
      expect(report.victory).toBe(true)
      expect(report.buildingsLost).toEqual([BUILDING_FARM])
    })

    it('fromJSON with null input throws', () => {
      expect(() => RaidReport.fromJSON(null)).toThrow()
    })

    it('fromJSON with undefined input throws', () => {
      expect(() => RaidReport.fromJSON(undefined)).toThrow()
    })
  })

  // ============================================================
  // Colony
  // ============================================================

  describe('Colony', () => {
    it('fromJSON reconstructs all sub-models', () => {
      const colony = Colony.fromJSON(minimalColonyData(), BUILDING_CLASS_MAP)
      expect(colony).toBeInstanceOf(Colony)
      expect(colony.year).toBe(1)
      expect(colony.season).toBeInstanceOf(Season)
      expect(colony.resources).toBeInstanceOf(Resources)
      expect(colony.buildings).toBeInstanceOf(Buildings)
      expect(colony.events).toBeInstanceOf(Events)
      expect(colony.military).toBeInstanceOf(Military)
    })

    it('fromJSON with missing military uses an empty Military', () => {
      const colony = Colony.fromJSON(minimalColonyData(), BUILDING_CLASS_MAP)
      expect(colony.military.totalUnits).toBe(0)
      expect(colony.military.raid).toBeNull()
      expect(colony.military.raidCount).toBe(0)
    })

    it('fromJSON with null military uses an empty Military', () => {
      const colony = Colony.fromJSON(minimalColonyData({
        military: null,
      }), BUILDING_CLASS_MAP)
      expect(colony.military).toBeInstanceOf(Military)
      expect(colony.military.totalUnits).toBe(0)
    })

    it('fromJSON restores a saved incoming raid', () => {
      const colony = Colony.fromJSON(minimalColonyData({
        military: {
          units: {
            [UNIT_ARCHER]: 3,
          },
          raid: {
            phase: RAID_PHASE_INCOMING,
            remainingSeconds: 50,
            enemy: {
              [UNIT_INFANTRY]: 4,
            },
            demand: {
              food: 50,
            },
            delaysPaid: 1,
          },
          raidCount: 2,
        },
      }), BUILDING_CLASS_MAP)
      expect(colony.military.units[UNIT_ARCHER]).toBe(3)
      expect(colony.military.raid).toBeInstanceOf(Raid)
      expect(colony.military.raid.enemyCount).toBe(4)
      expect(colony.military.raid.demand).toBeInstanceOf(Cost)
      expect(colony.military.raidCount).toBe(2)
    })

    it('fromJSON with extra unknown fields ignores them', () => {
      const colony = Colony.fromJSON({
        ...minimalColonyData(),
        unknownField: 'test',
      }, BUILDING_CLASS_MAP)
      expect(colony).toBeInstanceOf(Colony)
      expect(colony).not.toHaveProperty('unknownField')
    })

    it('fromJSON with null input throws', () => {
      expect(() => Colony.fromJSON(null, BUILDING_CLASS_MAP)).toThrow()
    })
  })
})
