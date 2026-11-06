import {describe, it, expect, vi} from 'vitest'
import {BUILDING_UPGRADES, RESEARCH_SUBCATEGORY_COST_MULTIPLIERS, RESEARCH_TIER_COSTS} from '@/js/engine/balancing.js'
import {BUILDING_CLASS_MAP, DOWNGRADABLE_BUILDINGS, HQ_BUILDING_UNLOCKS, RESEARCH_COSTS, RESEARCH_PREREQUISITES, RESEARCH_TREE, TUTORIAL_MODALS, TUTORIAL_STEPS, UNIT_BUILDINGS, UNIT_COUNTERS, UNIT_TYPES, createInitialColony, createInitialColonyBasic, createInitialColonyAdvanced, createInitialMeta, createInitialChallenges} from '@/js/engine/constants.js'
import {BLESSING_CELESTIAL_FORTIFICATION, BLESSING_CELESTIAL_PROSPERITY, BLESSING_FOREST_BLOOM, BLESSING_TEMPORARY_PEACE, BUILDING_ARCHERY, BUILDING_BARRACKS, BUILDING_HEADQUARTERS, BUILDING_STABLE, HQ_TYPE_CAMP, HQ_TYPE_CITY, HQ_TYPE_SETTLEMENT, HQ_TYPE_TOWN, HQ_TYPE_VILLAGE, RESEARCH_FOOD_PRODUCTION_1, RESEARCH_SUBCATEGORY_FOOD_PRODUCTION, TUTORIAL_MODAL_RAID_INCOMING, UNIT_ARCHER, UNIT_CAVALRY, UNIT_INFANTRY} from '@/js/engine/enums.js'
import Cost from '@/js/models/cost.js'
import Colony from '@/js/models/colony.js'
import Meta from '@/js/models/meta.js'
import Challenges from '@/js/models/challenges.js'
import Military from '@/js/models/military.js'
import {VALID_BUILDING_KEYS} from '../helpers/building_keys.js'

describe('constants', () => {
  describe('BUILDING_CLASS_MAP', () => {
    it('every key is a valid BUILDING_* enum', () => {
      for (const key of Object.keys(BUILDING_CLASS_MAP)) {
        expect(VALID_BUILDING_KEYS.has(key), `unexpected key "${key}"`).toBe(true)
      }
    })

    it('every value is a constructor function', () => {
      for (const [
        key,
        BuildingClass,
      ] of Object.entries(BUILDING_CLASS_MAP)) {
        expect(typeof BuildingClass, `${key} value`).toBe('function')
        expect(BuildingClass.prototype, `${key} has no prototype`).toBeDefined()
      }
    })
  })

  describe('BUILDING_CLASS_MAP and BUILDING_UPGRADES consistency', () => {
    it('no orphaned keys between BUILDING_CLASS_MAP and BUILDING_UPGRADES', () => {
      const classMapKeys = new Set(Object.keys(BUILDING_CLASS_MAP))
      const upgradesKeys = new Set(Object.keys(BUILDING_UPGRADES))

      for (const key of classMapKeys) {
        expect(upgradesKeys.has(key), `"${key}" is in BUILDING_CLASS_MAP but not BUILDING_UPGRADES`).toBe(true)
      }
      for (const key of upgradesKeys) {
        expect(classMapKeys.has(key), `"${key}" is in BUILDING_UPGRADES but not BUILDING_CLASS_MAP`).toBe(true)
      }
    })
  })

  describe('RESEARCH_COSTS', () => {
    const subcategories = RESEARCH_TREE.flatMap(entry => entry.subcategories)

    it('has a Cost for every research in RESEARCH_TREE and no extra keys', () => {
      const treeKeys = new Set(subcategories.flatMap(subcategory => subcategory.researches))
      expect(new Set(Object.keys(RESEARCH_COSTS))).toEqual(treeKeys)
      for (const key of treeKeys) {
        expect(RESEARCH_COSTS[key], key).toBeInstanceOf(Cost)
      }
    })

    it('knowledge rises tier by tier within each chain', () => {
      for (const subcategory of subcategories) {
        for (let i = 1; i < subcategory.researches.length; i++) {
          const previous = RESEARCH_COSTS[subcategory.researches[i - 1]]
          const current = RESEARCH_COSTS[subcategory.researches[i]]
          expect(current.knowledge, subcategory.researches[i]).toBeGreaterThan(previous.knowledge)
        }
      }
    })

    it('scales the tier base cost by the chain price band', () => {
      const expected = RESEARCH_TIER_COSTS[0].multiplyFloor(RESEARCH_SUBCATEGORY_COST_MULTIPLIERS[RESEARCH_SUBCATEGORY_FOOD_PRODUCTION])
      expect(RESEARCH_COSTS[RESEARCH_FOOD_PRODUCTION_1].entries).toEqual(expected.entries)
    })
  })

  describe('RESEARCH_PREREQUISITES', () => {
    const subcategories = RESEARCH_TREE.flatMap(entry => entry.subcategories)

    it('should map each research to the previous tier in its chain', () => {
      for (const subcategory of subcategories) {
        for (let i = 1; i < subcategory.researches.length; i++) {
          expect(RESEARCH_PREREQUISITES[subcategory.researches[i]], subcategory.researches[i]).toBe(subcategory.researches[i - 1])
        }
      }
    })

    it('should have no entry for tier 1 researches', () => {
      for (const subcategory of subcategories) {
        expect(RESEARCH_PREREQUISITES[subcategory.researches[0]], subcategory.researches[0]).toBeUndefined()
      }
    })

    it('should have one entry per non-first research', () => {
      const researchCount = subcategories.reduce((total, subcategory) => total + subcategory.researches.length, 0)
      expect(Object.keys(RESEARCH_PREREQUISITES)).toHaveLength(researchCount - subcategories.length)
    })
  })

  describe('factory functions', () => {
    it('createInitialColony returns a Colony instance', () => {
      const colony = createInitialColony()
      expect(colony).toBeInstanceOf(Colony)
    })

    it('createInitialMeta returns a Meta instance', () => {
      const meta = createInitialMeta()
      expect(meta).toBeInstanceOf(Meta)
    })

    it('createInitialChallenges returns a Challenges instance', () => {
      const challenges = createInitialChallenges()
      expect(challenges).toBeInstanceOf(Challenges)
    })

    it('createInitialChallenges defaults missing punishment fields to null', () => {
      const challenges = createInitialChallenges()
      const optionalFields = [
        'timeout',
        'faith',
        'productivityFarm',
        'productivityWoodcutter',
        'productivityMines',
        'productivityGeneral',
        'resources',
        'workers',
        'levels',
      ]
      for (const challenge of challenges.pending) {
        for (const field of optionalFields) {
          expect(challenge.punishment[field],
            `challenge ${challenge.index} punishment.${field} should not be undefined`,
          ).not.toBeUndefined()
        }
      }
    })

    it('createInitialChallenges resolves absent punishment fields to null', () => {
      const challenges = createInitialChallenges()
      // Challenge 3 (plague) omits timeout, productivityFarm, productivityWoodcutter,
      // productivityMines, productivityGeneral, and levels in the JSON template
      const plague = challenges.pending.find(challenge => challenge.index === 3)
      expect(plague.punishment.timeout).toBeNull()
      expect(plague.punishment.productivityFarm).toBeNull()
      expect(plague.punishment.productivityWoodcutter).toBeNull()
      expect(plague.punishment.productivityMines).toBeNull()
      expect(plague.punishment.productivityGeneral).toBeNull()
      expect(plague.punishment.levels).toBeNull()
    })

    describe('createInitialColonyBasic', () => {
      it('should return a Colony instance', () => {
        const colony = createInitialColonyBasic()
        expect(colony).toBeInstanceOf(Colony)
      })

      it('should have HQ at level 1 with type camp', () => {
        const colony = createInitialColonyBasic()
        const headquarters = colony.buildings[BUILDING_HEADQUARTERS]
        expect(headquarters.level).toBe(1)
        expect(headquarters.type).toBe(HQ_TYPE_CAMP)
      })

      it('should have starting food of 250 and wood of 100', () => {
        const colony = createInitialColonyBasic()
        expect(colony.resources.food).toBe(250)
        expect(colony.resources.wood).toBe(100)
      })

      it('should start with an empty army and no raid', () => {
        const colony = createInitialColonyBasic()
        expect(colony.military).toBeInstanceOf(Military)
        expect(colony.military.totalUnits).toBe(0)
        expect(colony.military.raid).toBeNull()
        expect(colony.military.raidCount).toBe(0)
      })
    })

    describe('createInitialColonyAdvanced', () => {
      it('should return a Colony instance', () => {
        const colony = createInitialColonyAdvanced()
        expect(colony).toBeInstanceOf(Colony)
      })

      it('should have HQ at level 5 with type city', () => {
        const colony = createInitialColonyAdvanced()
        const headquarters = colony.buildings[BUILDING_HEADQUARTERS]
        expect(headquarters.level).toBe(5)
        expect(headquarters.type).toBe(HQ_TYPE_CITY)
      })

      it('should have 60 workers and 1000 of each basic resource', () => {
        const colony = createInitialColonyAdvanced()
        expect(colony.resources.workers).toBe(60)
        expect(colony.resources.food).toBe(1000)
        expect(colony.resources.wood).toBe(1000)
        expect(colony.resources.stone).toBe(1000)
        expect(colony.resources.copper).toBe(1000)
        expect(colony.resources.iron).toBe(1000)
        expect(colony.resources.gold).toBe(1000)
      })

      it('should start with an empty army and no raid', () => {
        const colony = createInitialColonyAdvanced()
        expect(colony.military).toBeInstanceOf(Military)
        expect(colony.military.totalUnits).toBe(0)
        expect(colony.military.raid).toBeNull()
      })
    })

    it('should default punishment.faith to null when absent in JSON', async () => {
      vi.resetModules()
      vi.doMock('@/data/challenges.json', () => ({
        default: [
          {
            index: 99,
            delay: 60,
            timeout: 300,
            requirements: {
              faith: 100,
            },
            blessings: [
              {
                type: 'fertileSoil',
              },
            ],
            punishment: {
              type: 'cropFailure',
            },
          },
        ],
      }))
      const {
        createInitialChallenges: create,
      } = await import('@/js/engine/constants.js')
      const challenges = create()
      expect(challenges.pending[0].punishment.faith).toBeNull()
      vi.doUnmock('@/data/challenges.json')
    })
  })

  describe('UNIT_TYPES', () => {
    it('lists infantry, archer and cavalry in display order', () => {
      expect(UNIT_TYPES).toEqual([
        UNIT_INFANTRY,
        UNIT_ARCHER,
        UNIT_CAVALRY,
      ])
    })
  })

  describe('UNIT_BUILDINGS', () => {
    it('maps every unit type to its training building', () => {
      expect(UNIT_BUILDINGS).toEqual({
        [UNIT_INFANTRY]: BUILDING_BARRACKS,
        [UNIT_ARCHER]: BUILDING_ARCHERY,
        [UNIT_CAVALRY]: BUILDING_STABLE,
      })
    })

    it('every building is a real building class', () => {
      for (const type of UNIT_TYPES) {
        expect(BUILDING_CLASS_MAP[UNIT_BUILDINGS[type]], type).toBeDefined()
      }
    })

    it('unlocks infantry at Settlement, archers at Village and cavalry at Town', () => {
      expect(HQ_BUILDING_UNLOCKS[HQ_TYPE_SETTLEMENT]).toContain(UNIT_BUILDINGS[UNIT_INFANTRY])
      expect(HQ_BUILDING_UNLOCKS[HQ_TYPE_VILLAGE]).toContain(UNIT_BUILDINGS[UNIT_ARCHER])
      expect(HQ_BUILDING_UNLOCKS[HQ_TYPE_TOWN]).toContain(UNIT_BUILDINGS[UNIT_CAVALRY])
    })

    it('no military building can be downgraded', () => {
      for (const type of UNIT_TYPES) {
        expect(DOWNGRADABLE_BUILDINGS.has(UNIT_BUILDINGS[type]), type).toBe(false)
      }
    })
  })

  describe('UNIT_COUNTERS', () => {
    it('infantry beats cavalry, archers beat infantry, cavalry beats archers', () => {
      expect(UNIT_COUNTERS).toEqual({
        [UNIT_INFANTRY]: UNIT_CAVALRY,
        [UNIT_ARCHER]: UNIT_INFANTRY,
        [UNIT_CAVALRY]: UNIT_ARCHER,
      })
    })

    it('forms a triangle: no type beats itself and every type is beaten exactly once', () => {
      const beaten = UNIT_TYPES.map(type => UNIT_COUNTERS[type])
      for (const type of UNIT_TYPES) {
        expect(UNIT_COUNTERS[type], type).not.toBe(type)
      }
      expect([...beaten].sort()).toEqual([...UNIT_TYPES].sort())
    })
  })

  describe('TUTORIAL_MODALS', () => {
    it('includes the raid incoming popup', () => {
      expect(TUTORIAL_MODALS[TUTORIAL_MODAL_RAID_INCOMING]).toEqual({
        titleKey: 'tutorial.modal.raidIncoming.title',
        bodyKey: 'tutorial.modal.raidIncoming.body',
      })
    })
  })

  describe('military blessings in challenges.json', () => {
    function blessingTypes(index) {
      const challenge = createInitialChallenges().pending.find(candidate => candidate.index === index)
      return challenge.blessings.map(blessing => blessing.type)
    }

    function findBlessing(type) {
      for (const challenge of createInitialChallenges().pending) {
        const blessing = challenge.blessings.find(candidate => candidate.type === type)
        if (blessing) {
          return blessing
        }
      }
      return null
    }

    it('challenge 6 offers Temporary Peace instead of Forest Bloom', () => {
      expect(blessingTypes(6)).toContain(BLESSING_TEMPORARY_PEACE)
      expect(blessingTypes(6)).not.toContain(BLESSING_FOREST_BLOOM)
    })

    it('challenge 8 offers Celestial Fortification instead of Celestial Prosperity', () => {
      expect(blessingTypes(8)).toContain(BLESSING_CELESTIAL_FORTIFICATION)
      expect(blessingTypes(8)).not.toContain(BLESSING_CELESTIAL_PROSPERITY)
    })

    it('both last 300 s (at most 300 s, so blessings cannot stack)', () => {
      for (const type of [
        BLESSING_TEMPORARY_PEACE,
        BLESSING_CELESTIAL_FORTIFICATION,
      ]) {
        expect(findBlessing(type).timeout, type).toBe(300)
      }
    })
  })

  describe('TUTORIAL_STEPS', () => {
    it('upgradeCamp check returns true when HQ type is not camp', () => {
      const upgradeCampStep = TUTORIAL_STEPS.find(step => step.building === BUILDING_HEADQUARTERS && step.textKey === 'tutorial.step.upgradeCamp')
      const buildings = {
        headquarters: {
          type: HQ_TYPE_SETTLEMENT,
        },
      }
      expect(upgradeCampStep.check(buildings)).toBe(true)
    })

    it('upgradeCamp check returns false when HQ type is camp', () => {
      const upgradeCampStep = TUTORIAL_STEPS.find(step => step.building === BUILDING_HEADQUARTERS && step.textKey === 'tutorial.step.upgradeCamp')
      const buildings = {
        headquarters: {
          type: HQ_TYPE_CAMP,
        },
      }
      expect(upgradeCampStep.check(buildings)).toBe(false)
    })
  })
})
