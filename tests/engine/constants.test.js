import {describe, it, expect, vi} from 'vitest'
import {BUILDING_UPGRADES, CHALLENGE_MOOD_THRESHOLDS, CHALLENGE_REFERENCE_STATS, RESEARCH_SUBCATEGORY_COST_MULTIPLIERS, RESEARCH_TIER_COSTS} from '@/js/engine/balancing.js'
import {BUILDING_CLASS_MAP, CHALLENGE_DEFINITIONS, CHALLENGE_MOODS, DOWNGRADABLE_BUILDINGS, HQ_BUILDING_UNLOCKS, RESEARCH_COSTS, RESEARCH_PREREQUISITES, RESEARCH_TREE, TUTORIAL_MODALS, TUTORIAL_STEPS, UNIT_BUILDINGS, SAVE_VERSION, UNIT_COUNTERS, UNIT_TYPES, createInitialColony, createInitialColonyBasic, createInitialColonyAdvanced, createInitialMeta, createInitialChallenges} from '@/js/engine/constants.js'
import {CHALLENGE_MOOD_DEMANDING, CHALLENGE_MOOD_LENIENT, CHALLENGE_MOOD_MERCIFUL, CHALLENGE_MOOD_STERN, CHALLENGE_MOOD_WATCHFUL, BLESSING_CELESTIAL_FORTIFICATION, BLESSING_CELESTIAL_PROSPERITY, BLESSING_FOREST_BLOOM, BLESSING_TEMPORARY_PEACE, BUILDING_ARCHERY, BUILDING_BARRACKS, BUILDING_HEADQUARTERS, BUILDING_STABLE, HQ_TYPE_CAMP, HQ_TYPE_CITY, HQ_TYPE_SETTLEMENT, HQ_TYPE_TOWN, HQ_TYPE_VILLAGE, RESEARCH_FOOD_PRODUCTION_1, RESEARCH_SUBCATEGORY_FOOD_PRODUCTION, TUTORIAL_MODAL_RAID_INCOMING, UNIT_ARCHER, UNIT_CAVALRY, UNIT_INFANTRY} from '@/js/engine/enums.js'
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

    it('createInitialColony starts a new game at the Camp', () => {
      const colony = createInitialColony()
      const headquarters = colony.buildings[BUILDING_HEADQUARTERS]
      expect(headquarters.type).toBe(HQ_TYPE_CAMP)
      expect(headquarters.level).toBe(1)
      expect(colony.resources.food).toBe(250)
      expect(colony.resources.wood).toBe(100)
    })

    it('createInitialMeta returns a Meta instance', () => {
      const meta = createInitialMeta()
      expect(meta).toBeInstanceOf(Meta)
    })

    it('createInitialMeta uses the current save version', () => {
      expect(SAVE_VERSION).toBe(2)
      expect(createInitialMeta().version).toBe(SAVE_VERSION)
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

    it('createInitialChallenges builds every challenge from its definition', () => {
      const challenges = createInitialChallenges()
      expect(challenges.pending).toHaveLength(CHALLENGE_DEFINITIONS.length)
      challenges.pending.forEach((challenge, i) => {
        expect(challenge.base).toBe(CHALLENGE_DEFINITIONS[i])
        expect(challenge.index).toBe(CHALLENGE_DEFINITIONS[i].index)
        expect(challenge.failures).toBe(0)
        expect(challenge.mood).toBeNull()
      })
    })

    it('createInitialChallenges games share no objects with the definitions or each other', () => {
      const first = createInitialChallenges()
      const second = createInitialChallenges()
      // Challenge 7 has resource requirements; challenge 2 gifts resources
      const firstSeventh = first.pending.find(challenge => challenge.index === 7)
      const firstSecond = first.pending.find(challenge => challenge.index === 2)
      const definitionSeventh = CHALLENGE_DEFINITIONS.find(definition => definition.index === 7)
      const definitionSecond = CHALLENGE_DEFINITIONS.find(definition => definition.index === 2)
      const foodRequired = definitionSeventh.requirements.resources.food
      const foodGifted = definitionSecond.blessings[0].resources.food
      firstSeventh.timeout = 1
      firstSeventh.requirements.resources.food = 1
      firstSecond.blessings[0].resources.food = 1
      firstSecond.punishment.faith = 1
      expect(definitionSeventh.timeout).not.toBe(1)
      expect(definitionSeventh.requirements.resources.food).toBe(foodRequired)
      expect(definitionSecond.blessings[0].resources.food).toBe(foodGifted)
      expect(definitionSecond.punishment.faith).not.toBe(1)
      const secondSeventh = second.pending.find(challenge => challenge.index === 7)
      const secondSecond = second.pending.find(challenge => challenge.index === 2)
      expect(secondSeventh.timeout).toBe(definitionSeventh.timeout)
      expect(secondSeventh.requirements.resources.food).toBe(foodRequired)
      expect(secondSecond.blessings[0].resources.food).toBe(foodGifted)
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

    describe('CHALLENGE_DEFINITIONS', () => {
      it('should hold the 10 challenges in index order', () => {
        expect(CHALLENGE_DEFINITIONS.map(definition => definition.index)).toEqual([
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
        ])
      })

      it('should be deep-frozen', () => {
        expect(Object.isFrozen(CHALLENGE_DEFINITIONS)).toBe(true)
        for (const definition of CHALLENGE_DEFINITIONS) {
          expect(Object.isFrozen(definition)).toBe(true)
          expect(Object.isFrozen(definition.requirements)).toBe(true)
          expect(Object.isFrozen(definition.blessings)).toBe(true)
          expect(Object.isFrozen(definition.punishment)).toBe(true)
          if (definition.requirements.resources) {
            expect(Object.isFrozen(definition.requirements.resources)).toBe(true)
          }
          for (const blessing of definition.blessings) {
            expect(Object.isFrozen(blessing)).toBe(true)
            if (blessing.resources) {
              expect(Object.isFrozen(blessing.resources)).toBe(true)
            }
          }
        }
      })

      it('should set absent optional fields to null', () => {
        // Challenge 1 asks only for an altar level and has no gifted resources
        const first = CHALLENGE_DEFINITIONS[0]
        expect(first.requirements.faith).toBeNull()
        expect(first.requirements.resources).toBeNull()
        expect(first.requirements.workers).toBeNull()
        expect(first.blessings[0].resources).toBeNull()
        expect(first.blessings[0].territory).toBeNull()
      })
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

  describe('CHALLENGE_MOODS', () => {
    it('lists the five moods from mildest to most demanding, one more than the thresholds', () => {
      expect(CHALLENGE_MOODS).toEqual([
        CHALLENGE_MOOD_MERCIFUL,
        CHALLENGE_MOOD_LENIENT,
        CHALLENGE_MOOD_WATCHFUL,
        CHALLENGE_MOOD_STERN,
        CHALLENGE_MOOD_DEMANDING,
      ])
      expect(CHALLENGE_MOODS).toHaveLength(CHALLENGE_MOOD_THRESHOLDS.length + 1)
    })
  })

  describe('CHALLENGE_REFERENCE_STATS', () => {
    it('has one row per challenge definition', () => {
      expect(CHALLENGE_REFERENCE_STATS.map(row => row.index)).toEqual(CHALLENGE_DEFINITIONS.map(definition => definition.index))
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

    it('both are timed blessings', () => {
      for (const type of [
        BLESSING_TEMPORARY_PEACE,
        BLESSING_CELESTIAL_FORTIFICATION,
      ]) {
        expect(findBlessing(type).timeout, type).toBeGreaterThan(0)
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
