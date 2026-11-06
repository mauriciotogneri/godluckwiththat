import {describe, it, expect, vi} from 'vitest'
import {PRODUCTION_RATES, RESEARCH_SUBCATEGORY_BONUSES, SEASON_DURATION, STOREHOUSE_BASE_CAPACITY, TOWER_ARCHERS_PER_LEVEL, TRIBUTE_RESOURCE_VALUES} from '@/js/engine/balancing.js'
import {colonyStats} from '@/js/engine/colony_stats.js'
import {BOUNDED_RESOURCES, HEADER_RESOURCES, createInitialColonyBasic, createInitialMeta} from '@/js/engine/constants.js'
import {BUILDING_ALTAR, BUILDING_FARM, BUILDING_HEADQUARTERS, BUILDING_HOUSE, BUILDING_WOODCUTTER, HQ_TYPE_TOWN, HQ_TYPE_VILLAGE, RESEARCH_CONSTRUCTION_1, RESEARCH_STORAGE_1, RESEARCH_SUBCATEGORY_CONSTRUCTION, RESEARCH_SUBCATEGORY_STORAGE, RESOURCE_COPPER, RESOURCE_FAITH, RESOURCE_FOOD, RESOURCE_KNOWLEDGE, RESOURCE_STONE, RESOURCE_WOOD, SEASON_COLD, SEASON_WARM, UNIT_ARCHER, UNIT_INFANTRY} from '@/js/engine/enums.js'
import {storageCapacity} from '@/js/engine/utils.js'
import Academy from '@/js/models/buildings/academy.js'

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

// A new game's Camp colony (the real starting state), changed by the callback before the first update
async function createState(customize = () => {}) {
  const {
    default: State,
  } = await import('@/js/engine/state.js')
  const meta = createInitialMeta()
  meta.tutorial.completed = true
  const colony = createInitialColonyBasic()
  customize(colony)
  const state = new State(meta, colony)
  state.update(0)
  return state
}

describe('colonyStats', () => {
  describe('starting colony', () => {
    it('should describe a new Camp colony', async () => {
      const state = await createState()
      const stats = colonyStats(state)
      expect(stats.elapsed).toBe(0)
      expect(stats.hqTier).toBe(0)
      expect(stats.hqLevel).toBe(1)
      expect(stats.workers).toBe(0)
      expect(stats.workersCap).toBe(0)
      expect(stats.idleWorkers).toBe(0)
      expect(stats.stock[RESOURCE_FOOD]).toBe(250)
      expect(stats.stock[RESOURCE_WOOD]).toBe(100)
      expect(stats.storageCap).toBe(STOREHOUSE_BASE_CAPACITY)
      expect(stats.productionValue).toBe(0)
      expect(stats.faithRate).toBe(0)
      expect(stats.armyUnits).toBe(0)
      expect(stats.researchCount).toBe(0)
      expect(stats.buildingLevels).toBe(0)
      expect(stats.altar).toBe(0)
      expect(stats.temple).toBe(0)
      expect(stats.monument).toBe(0)
      expect(stats.templeWorkers).toBe(0)
      expect(stats.house).toBe(0)
      expect(stats.storehouse).toBe(0)
      expect(stats.territoryFree).toBe(10)
      expect(stats.constructionMult).toBe(1)
      expect(stats.unlockedResources).toEqual([
        RESOURCE_FOOD,
        RESOURCE_WOOD,
        RESOURCE_FAITH,
      ])
      expect(new Set(stats.unlockedBuildings)).toEqual(new Set([
        BUILDING_HEADQUARTERS,
        BUILDING_HOUSE,
        BUILDING_ALTAR,
        BUILDING_FARM,
        BUILDING_WOODCUTTER,
      ]))
    })

    it('should list the stock and net rate of every header resource', async () => {
      const state = await createState()
      const stats = colonyStats(state)
      expect(Object.keys(stats.stock)).toEqual(HEADER_RESOURCES)
      expect(Object.keys(stats.netRates)).toEqual(HEADER_RESOURCES)
    })
  })

  describe('elapsed', () => {
    it('should count the warm season of later years from the start', async () => {
      const state = await createState(colony => {
        colony.year = 2
        colony.season.currentSeason = SEASON_WARM
        colony.season.seasonElapsed = 10
      })
      expect(colonyStats(state).elapsed).toBe(2 * SEASON_DURATION + 10)
    })

    it('should add the warm season of the current year in the cold season', async () => {
      const state = await createState(colony => {
        colony.year = 3
        colony.season.currentSeason = SEASON_COLD
        colony.season.seasonElapsed = 40
      })
      expect(colonyStats(state).elapsed).toBe(5 * SEASON_DURATION + 40)
    })
  })

  describe('headquarters', () => {
    it('should give the tier as the index of the HQ type', async () => {
      const state = await createState(colony => {
        colony.buildings.headquarters.type = HQ_TYPE_TOWN
        colony.buildings.headquarters.level = 4
      })
      const stats = colonyStats(state)
      expect(stats.hqTier).toBe(3)
      expect(stats.hqLevel).toBe(4)
    })

    it('should list the resources unlocked up to the HQ type', async () => {
      const state = await createState(colony => {
        colony.buildings.headquarters.type = HQ_TYPE_VILLAGE
      })
      expect(colonyStats(state).unlockedResources).toEqual([
        RESOURCE_FOOD,
        RESOURCE_WOOD,
        RESOURCE_FAITH,
        RESOURCE_STONE,
        RESOURCE_KNOWLEDGE,
        RESOURCE_COPPER,
      ])
    })
  })

  describe('population', () => {
    it('should report workers, cap and idle workers', async () => {
      const state = await createState(colony => {
        colony.buildings.house.level = 2
        colony.buildings.farm.level = 1
        colony.buildings.farm.workers = 3
        colony.resources.workers = 7
      })
      const stats = colonyStats(state)
      expect(stats.workers).toBe(7)
      expect(stats.workersCap).toBe(20)
      expect(stats.idleWorkers).toBe(4)
    })
  })

  describe('storageCap', () => {
    it('should include the Storage research bonus', async () => {
      const state = await createState(colony => {
        colony.buildings.storehouse.level = 2
        colony.buildings.academy = new Academy({
          level: 1,
          completed: [RESEARCH_STORAGE_1],
        })
      })
      const bonus = RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_STORAGE].value
      expect(colonyStats(state).storageCap).toBe(storageCapacity(2, bonus))
    })
  })

  describe('rates', () => {
    it('should report the net rate of each resource', async () => {
      const state = await createState(colony => {
        colony.buildings.farm.level = 1
        colony.buildings.farm.workers = 5
        colony.buildings.woodcutter.level = 1
        colony.buildings.woodcutter.workers = 2
        colony.resources.workers = 7
      })
      const stats = colonyStats(state)
      expect(stats.netRates[RESOURCE_FOOD]).toBe(state.netProduction(RESOURCE_FOOD))
      expect(stats.netRates[RESOURCE_WOOD]).toBe(state.netProduction(RESOURCE_WOOD))
      expect(stats.netRates[RESOURCE_FOOD]).toBeGreaterThan(0)
    })

    it('should weight the net production of bounded resources by their tribute value', async () => {
      const state = await createState(colony => {
        colony.buildings.farm.level = 1
        colony.buildings.farm.workers = 5
        colony.buildings.woodcutter.level = 1
        colony.buildings.woodcutter.workers = 2
        colony.resources.workers = 7
      })
      let expected = 0
      for (const resource of BOUNDED_RESOURCES) {
        expected += state.netProduction(resource) * TRIBUTE_RESOURCE_VALUES[resource]
      }
      expect(colonyStats(state).productionValue).toBeCloseTo(expected)
    })

    it('should leave out a gain that flows into full storage but keep a loss at the cap', async () => {
      const state = await createState(colony => {
        colony.buildings.farm.level = 1
        colony.buildings.farm.workers = 5
        colony.buildings.woodcutter.level = 1
        colony.buildings.woodcutter.workers = 0
        colony.resources.workers = 5
        colony.resources.food = STOREHOUSE_BASE_CAPACITY
        colony.resources.wood = STOREHOUSE_BASE_CAPACITY
      })
      expect(state.netProduction(RESOURCE_FOOD)).toBeGreaterThan(0)
      expect(state.netProduction(RESOURCE_WOOD)).toBeLessThan(0)
      expect(colonyStats(state).productionValue).toBeCloseTo(state.netProduction(RESOURCE_WOOD) * TRIBUTE_RESOURCE_VALUES[RESOURCE_WOOD])
    })

    it('should report the faith rate from the altar', async () => {
      const state = await createState(colony => {
        colony.buildings.altar.level = 3
        colony.resources.workers = 1
      })
      expect(colonyStats(state).faithRate).toBeCloseTo(3 * PRODUCTION_RATES[BUILDING_ALTAR].rate)
    })
  })

  describe('armyUnits', () => {
    it('should count trained units plus the archers the tower fights as', async () => {
      const state = await createState(colony => {
        colony.military.units[UNIT_INFANTRY] = 4
        colony.military.units[UNIT_ARCHER] = 2
        colony.buildings.tower.level = 2
      })
      expect(colonyStats(state).armyUnits).toBe(6 + 2 * TOWER_ARCHERS_PER_LEVEL)
    })
  })

  describe('buildings and research', () => {
    it('should report completed research, building levels, religious levels, temple workers, houses and storehouse', async () => {
      const state = await createState(colony => {
        colony.buildings.academy = new Academy({
          level: 1,
          completed: [RESEARCH_CONSTRUCTION_1],
        })
        colony.buildings.altar.level = 3
        colony.buildings.temple.level = 2
        colony.buildings.monument.level = 1
        colony.buildings.temple.workers = 4
        colony.buildings.house.level = 2
        colony.buildings.storehouse.level = 3
        colony.resources.workers = 4
      })
      const stats = colonyStats(state)
      expect(stats.researchCount).toBe(1)
      expect(stats.buildingLevels).toBe(12)
      expect(stats.altar).toBe(3)
      expect(stats.temple).toBe(2)
      expect(stats.monument).toBe(1)
      expect(stats.templeWorkers).toBe(4)
      expect(stats.house).toBe(2)
      expect(stats.storehouse).toBe(3)
    })

    it('should apply Construction research to the construction multiplier', async () => {
      const state = await createState(colony => {
        colony.buildings.academy = new Academy({
          level: 1,
          completed: [RESEARCH_CONSTRUCTION_1],
        })
      })
      const bonus = RESEARCH_SUBCATEGORY_BONUSES[RESEARCH_SUBCATEGORY_CONSTRUCTION].value
      expect(colonyStats(state).constructionMult).toBeCloseTo(1 - bonus)
    })
  })

  describe('territoryFree', () => {
    it('should count the territory bonus and reserve slots under construction', async () => {
      const state = await createState(colony => {
        colony.buildings.headquarters.level = 2
        colony.resources.territoryBonus = 5
        colony.buildings.house.level = 3
        colony.buildings.farm.constructionRemaining = 10
        colony.buildings.farm.constructionDuration = 10
      })
      // Cap 2 × 10 + 5 bonus, minus 3 house levels and 1 farm under construction
      expect(colonyStats(state).territoryFree).toBe(21)
    })
  })

  describe('purity', () => {
    it('should not change the state and return copies of the stock', async () => {
      const state = await createState()
      const before = JSON.stringify(state.toJSON().colony)
      const stats = colonyStats(state)
      stats.stock[RESOURCE_FOOD] = 0
      expect(JSON.stringify(state.toJSON().colony)).toBe(before)
      expect(colonyStats(state)).toEqual({
        ...stats,
        stock: {
          ...stats.stock,
          [RESOURCE_FOOD]: 250,
        },
      })
    })
  })
})
