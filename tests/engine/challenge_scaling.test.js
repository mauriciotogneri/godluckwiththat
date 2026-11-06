import {describe, it, expect} from 'vitest'
import {CHALLENGE_AMOUNT_ROUNDING, CHALLENGE_EFFECT_CAPS, CHALLENGE_FAILURE_DELAY_BONUS, CHALLENGE_HEALTH_RATIO_MAX, CHALLENGE_HEALTH_RATIO_MIN, CHALLENGE_HEALTH_WEIGHTS, CHALLENGE_MAX_HARDEN_SCALE, CHALLENGE_MAX_LEVEL_CUT, CHALLENGE_MAX_TIMEOUT_SCALE, CHALLENGE_MIN_AMOUNT_SCALE, CHALLENGE_MOOD_THRESHOLDS, CHALLENGE_TARGET_TIME_SHARE, CHALLENGE_TIMEOUT_ROUNDING, PRODUCTION_RATES, WORKER_RECRUIT_COST} from '@/js/engine/balancing.js'
import {adjustBlessing, adjustChallenge, adjustDelay, adjustPunishment, challengeDifficulty, challengeMood, estimateCompletionTime, fitRequirements, healthScore} from '@/js/engine/challenge_scaling.js'
import {CHALLENGE_MOODS} from '@/js/engine/constants.js'
import {BLESSING_FERTILE_SOIL, BLESSING_GIFT_FROM_THE_HEAVENS, BLESSING_HOLY_EXPANSION, BLESSING_RAPID_CONSTRUCTION, BUILDING_TEMPLE, CHALLENGE_MOOD_DEMANDING, CHALLENGE_MOOD_MERCIFUL, CHALLENGE_MOOD_WATCHFUL, PUNISHMENT_CROP_FAILURE, RESOURCE_COPPER, RESOURCE_FAITH, RESOURCE_FOOD, RESOURCE_KNOWLEDGE, RESOURCE_STONE, RESOURCE_WOOD} from '@/js/engine/enums.js'
import Blessing from '@/js/models/blessing.js'
import Punishment from '@/js/models/punishment.js'
import Altar from '@/js/models/buildings/altar.js'
import {createChallengeDefinition} from '../helpers/factories.js'

// A colonyStats snapshot of a Village colony; stock and net rates override per resource
function createStats(overrides = {}) {
  return {
    elapsed: 1800,
    hqTier: 2,
    hqLevel: 5,
    workers: 100,
    workersCap: 120,
    idleWorkers: 0,
    storageCap: 2000,
    productionValue: 20,
    faithRate: 2,
    armyUnits: 10,
    researchCount: 5,
    buildingLevels: 60,
    altar: 5,
    temple: 3,
    monument: 0,
    templeWorkers: 15,
    house: 12,
    storehouse: 6,
    territoryFree: 10,
    constructionMult: 1,
    unlockedResources: [
      RESOURCE_FOOD,
      RESOURCE_WOOD,
      RESOURCE_FAITH,
      RESOURCE_STONE,
      RESOURCE_KNOWLEDGE,
      RESOURCE_COPPER,
    ],
    unlockedBuildings: [],
    ...overrides,
    stock: {
      food: 1000,
      wood: 1000,
      stone: 500,
      copper: 200,
      iron: 0,
      gold: 0,
      knowledge: 100,
      faith: 0,
      ...overrides.stock,
    },
    netRates: {
      food: 2,
      wood: 2,
      stone: 1,
      copper: 0.5,
      iron: 0,
      gold: 0,
      knowledge: 1,
      faith: 2,
      ...overrides.netRates,
    },
  }
}

// A colony that produces everything fast
function createRichStats() {
  return createStats({
    faithRate: 1000,
    netRates: {
      food: 1000,
      wood: 1000,
      stone: 1000,
      copper: 1000,
    },
  })
}

// Requirements with every absent field null
function requirementsOf(requirements) {
  return {
    faith: null,
    altar: null,
    temple: null,
    monument: null,
    resources: null,
    workers: null,
    ...requirements,
  }
}

// A deep-frozen definition with a 300 s timer and the given requirements
function definitionWith(requirements, overrides = {}) {
  return createChallengeDefinition({
    timeout: 300,
    requirements: requirementsOf(requirements),
    ...overrides,
  })
}

// Seconds the altar takes to go from one level to another (as Building.levelUp computes them)
function altarBuildSeconds(from, to, constructionMult) {
  let seconds = 0
  for (let level = from; level < to; level++) {
    seconds += Math.max(1, Math.floor(new Altar({
      level: level,
    }).levelUpCost.toSeconds * constructionMult))
  }
  return seconds
}

// Whether an amount is a multiple of its rounding band's step
function isNiceAmount(amount) {
  const band = CHALLENGE_AMOUNT_ROUNDING.find(entry => amount < entry.below)
  return amount % band.step === 0
}

describe('challenge_scaling', () => {
  describe('healthScore', () => {
    it('should be 1 without a reference', () => {
      expect(healthScore(createStats(), null)).toBe(1)
    })

    it('should be 1 for a colony equal to the reference', () => {
      expect(healthScore(createStats(), createStats())).toBeCloseTo(1)
    })

    it('should rise above 1 for a larger colony and fall below 1 for a smaller one', () => {
      const reference = createStats()
      const larger = createStats({
        productionValue: 40,
        faithRate: 4,
        armyUnits: 20,
        researchCount: 10,
        workers: 200,
      })
      const smaller = createStats({
        productionValue: 10,
        faithRate: 1,
        armyUnits: 5,
        researchCount: 2,
        workers: 50,
      })
      expect(healthScore(larger, reference)).toBeGreaterThan(1)
      expect(healthScore(smaller, reference)).toBeLessThan(1)
    })

    it('should clamp every stat ratio', () => {
      const huge = createStats({
        hqTier: 4,
        productionValue: 20000,
        faithRate: 2000,
        armyUnits: 10000,
        researchCount: 5000,
        workers: 100000,
      })
      const empty = createStats({
        hqTier: 0,
        productionValue: -5,
        faithRate: 0,
        armyUnits: 0,
        researchCount: 0,
        workers: 0,
      })
      expect(healthScore(huge, createStats({
        hqTier: 0,
      }))).toBeCloseTo(CHALLENGE_HEALTH_RATIO_MAX)
      expect(healthScore(empty, createStats({
        hqTier: 4,
      }))).toBeCloseTo(CHALLENGE_HEALTH_RATIO_MIN)
    })

    it('should count a reference near 0 as ratio 1', () => {
      const reference = createStats({
        armyUnits: 0,
        researchCount: 0,
      })
      const colony = createStats({
        armyUnits: 50,
        researchCount: 20,
      })
      expect(healthScore(colony, reference)).toBeCloseTo(1)
    })

    it('should compare the HQ tier counted from 1', () => {
      const totalWeight = Object.values(CHALLENGE_HEALTH_WEIGHTS).reduce((sum, weight) => sum + weight, 0)
      const reference = createStats({
        hqTier: 0,
      })
      const colony = createStats({
        hqTier: 1,
      })
      expect(healthScore(colony, reference)).toBeCloseTo(Math.pow(2, CHALLENGE_HEALTH_WEIGHTS.hqTier / totalWeight))
    })
  })

  describe('estimateCompletionTime', () => {
    it('should be 0 when the requirements are already met', () => {
      const requirements = requirementsOf({
        altar: 5,
        resources: {
          food: 500,
        },
      })
      expect(estimateCompletionTime(requirements, createStats())).toBe(0)
    })

    it('should divide missing faith by the faith rate', () => {
      expect(estimateCompletionTime(requirementsOf({
        faith: 200,
      }), createStats())).toBe(100)
    })

    it('should count free temple slots idle workers could fill', () => {
      const stats = createStats({
        idleWorkers: 10,
        templeWorkers: 10,
      })
      const rate = 2 + 5 * PRODUCTION_RATES[BUILDING_TEMPLE].rate
      expect(estimateCompletionTime(requirementsOf({
        faith: 200,
      }), stats)).toBeCloseTo(200 / rate)
    })

    it('should be Infinity when a missing resource is not produced', () => {
      const requirements = requirementsOf({
        resources: {
          copper: 500,
        },
      })
      const stats = createStats({
        netRates: {
          copper: 0,
        },
      })
      expect(estimateCompletionTime(requirements, stats)).toBe(Infinity)
    })

    it('should take the build time of the missing levels when resources are in stock', () => {
      const requirements = requirementsOf({
        altar: 7,
      })
      expect(estimateCompletionTime(requirements, createStats())).toBe(altarBuildSeconds(5, 7, 1))
    })

    it('should apply the construction multiplier', () => {
      const requirements = requirementsOf({
        altar: 7,
      })
      const stats = createStats({
        constructionMult: 0.5,
      })
      expect(estimateCompletionTime(requirements, stats)).toBe(altarBuildSeconds(5, 7, 0.5))
    })

    it('should add the food to recruit missing workers', () => {
      const requirements = requirementsOf({
        workers: 110,
      })
      const stats = createStats({
        workersCap: 200,
        stock: {
          food: 0,
        },
      })
      expect(estimateCompletionTime(requirements, stats)).toBe(10 * WORKER_RECRUIT_COST.food / 2)
    })

    it('should add houses when the workers exceed the population cap', () => {
      const requirements = requirementsOf({
        workers: 130,
      })
      const rates = {
        food: 1000,
      }
      const roomy = createStats({
        workersCap: 200,
        netRates: rates,
      })
      const crowded = createStats({
        workersCap: 120,
        netRates: rates,
      })
      expect(estimateCompletionTime(requirements, crowded)).toBeGreaterThan(estimateCompletionTime(requirements, roomy))
    })

    it('should add storehouse levels when an amount does not fit in storage', () => {
      const requirements = requirementsOf({
        resources: {
          food: 3000,
        },
      })
      const rates = {
        food: 100,
      }
      const roomy = createStats({
        storageCap: 5000,
        netRates: rates,
      })
      const full = createStats({
        storageCap: 2000,
        netRates: rates,
      })
      expect(estimateCompletionTime(requirements, roomy)).toBe(20)
      expect(estimateCompletionTime(requirements, full)).toBeGreaterThan(20)
    })

    it('should add HQ expansions when the new levels do not fit in the territory', () => {
      const requirements = requirementsOf({
        altar: 7,
      })
      const free = createStats({
        territoryFree: 10,
      })
      const full = createStats({
        territoryFree: 0,
      })
      expect(estimateCompletionTime(requirements, full)).toBeGreaterThan(estimateCompletionTime(requirements, free))
    })

    it('should add HQ tier upgrades for a locked building', () => {
      const requirements = requirementsOf({
        monument: 1,
      })
      const unlocked = createStats({
        hqTier: 3,
      })
      const locked = createStats({
        hqTier: 2,
      })
      expect(estimateCompletionTime(requirements, locked)).toBeGreaterThan(estimateCompletionTime(requirements, unlocked))
    })

    it('should finish on values only an edited save can hold', () => {
      const requirements = requirementsOf({
        altar: 7,
        resources: {
          food: 600,
        },
        workers: 130,
      })
      for (const stats of [
        createStats({
          storageCap: 0,
        }),
        createStats({
          altar: -1e17,
          house: -50,
          storehouse: -40,
        }),
        createStats({
          hqTier: -1,
        }),
        createStats({
          territoryFree: -1e9,
        }),
      ]) {
        expect(() => estimateCompletionTime(requirements, stats)).not.toThrow()
      }
      expect(estimateCompletionTime(requirements, createStats({
        storageCap: 0,
      }))).toBe(Infinity)
      expect(estimateCompletionTime(requirements, createStats({
        territoryFree: -1e9,
      }))).toBe(Infinity)
    })

    it('should count the one-time faith of new monument levels', () => {
      const stats = createStats({
        hqTier: 3,
      })
      const monumentOnly = estimateCompletionTime(requirementsOf({
        monument: 3,
      }), stats)
      // Levels 1–3 grant 100 + 200 + 300 faith
      expect(estimateCompletionTime(requirementsOf({
        faith: 600,
        monument: 3,
      }), stats)).toBe(monumentOnly)
    })
  })

  describe('fitRequirements', () => {
    it('should raise every value up to the hardening cap for a thriving colony', () => {
      const definition = definitionWith({
        faith: 100,
        altar: 10,
        resources: {
          food: 200,
        },
      })
      const fitted = fitRequirements(definition, createRichStats(), 0)
      expect(fitted.requirements.faith).toBe(130)
      expect(fitted.requirements.altar).toBe(13)
      expect(fitted.requirements.resources.food).toBe(250)
      expect(fitted.timeout).toBe(300)
      expect(fitted.scales.amounts).toBeLessThanOrEqual(CHALLENGE_MAX_HARDEN_SCALE)
      expect(fitted.scales.levels).toBeCloseTo(CHALLENGE_MAX_HARDEN_SCALE)
      expect(fitted.backstop).toBe(false)
    })

    it('should shrink faith and resource amounts first for a struggling colony', () => {
      const definition = definitionWith({
        faith: 1000,
      })
      const stats = createStats({
        faithRate: 1,
      })
      const fitted = fitRequirements(definition, stats, 0)
      expect(fitted.requirements.faith).toBeLessThan(1000)
      expect(fitted.requirements.faith).toBeGreaterThanOrEqual(1000 * CHALLENGE_MIN_AMOUNT_SCALE)
      expect(fitted.timeout).toBe(300)
      expect(fitted.backstop).toBe(false)
    })

    it('should stop shrinking amounts at the floor and lengthen the timer instead', () => {
      const definition = definitionWith({
        faith: 1000,
      })
      const stats = createStats({
        faithRate: 0.5,
      })
      const fitted = fitRequirements(definition, stats, 0)
      expect(fitted.requirements.faith).toBe(1000 * CHALLENGE_MIN_AMOUNT_SCALE)
      expect(fitted.timeout).toBeGreaterThan(300)
      expect(fitted.timeout).toBeLessThanOrEqual(300 * CHALLENGE_MAX_TIMEOUT_SCALE)
      expect(fitted.backstop).toBe(false)
    })

    it('should cut building levels by at most the level cut with a longer timer', () => {
      const definition = definitionWith({
        faith: 300,
        altar: 12,
      })
      const stats = createStats({
        netRates: {
          wood: 1,
        },
      })
      const fitted = fitRequirements(definition, stats, 0)
      expect(fitted.requirements.altar).toBeLessThan(12)
      expect(fitted.requirements.altar).toBeGreaterThanOrEqual(Math.ceil(12 * (1 - CHALLENGE_MAX_LEVEL_CUT)))
      expect(fitted.requirements.faith).toBe(300)
      expect(fitted.timeout).toBeGreaterThan(300)
      expect(fitted.backstop).toBe(false)
    })

    it('should never make the timer longer than the maximum', () => {
      const definition = definitionWith({
        altar: 16,
      })
      const stats = createStats({
        netRates: {
          wood: 1,
        },
      })
      const fitted = fitRequirements(definition, stats, 5)
      expect(fitted.timeout).toBeLessThanOrEqual(300 * CHALLENGE_MAX_TIMEOUT_SCALE)
      expect(fitted.timeout % CHALLENGE_TIMEOUT_ROUNDING).toBe(0)
    })

    it('should ease every retry further', () => {
      const definition = definitionWith({
        faith: 1000,
      })
      const stats = createStats({
        faithRate: 1,
      })
      const attempts = [
        0,
        1,
        2,
        3,
      ].map(failures => fitRequirements(definition, stats, failures))
      for (let i = 1; i < attempts.length; i++) {
        expect(challengeDifficulty(attempts[i].scales)).toBeLessThan(challengeDifficulty(attempts[i - 1].scales))
        expect(attempts[i].timeout).toBeGreaterThanOrEqual(attempts[i - 1].timeout)
      }
    })

    it('should return whole levels and workers, nice amounts and a timer in whole steps', () => {
      const definition = definitionWith({
        faith: 730,
        altar: 9,
        resources: {
          food: 1370,
          wood: 145,
        },
        workers: 105,
      })
      for (const stats of [
        createStats(),
        createRichStats(),
        createStats({
          faithRate: 0.3,
        }),
      ]) {
        const {
          requirements, timeout,
        } = fitRequirements(definition, stats, 0)
        expect(Number.isInteger(requirements.altar)).toBe(true)
        expect(Number.isInteger(requirements.workers)).toBe(true)
        expect(requirements.altar).toBeGreaterThanOrEqual(1)
        expect(requirements.workers).toBeGreaterThanOrEqual(1)
        expect(isNiceAmount(requirements.faith)).toBe(true)
        for (const amount of Object.values(requirements.resources)) {
          expect(isNiceAmount(amount)).toBe(true)
        }
        expect(timeout % CHALLENGE_TIMEOUT_ROUNDING).toBe(0)
      }
    })

    it('should drop a resource the colony has not unlocked and flag the backstop', () => {
      const definition = definitionWith({
        resources: {
          food: 200,
          iron: 100,
        },
      })
      const fitted = fitRequirements(definition, createStats(), 0)
      expect(fitted.requirements.resources).not.toHaveProperty('iron')
      expect(fitted.requirements.resources.food).toBeGreaterThanOrEqual(200)
      expect(fitted.backstop).toBe(true)
    })

    it('should cap values at what the colony can reach when nothing else is enough', () => {
      const definition = definitionWith({
        altar: 16,
      })
      const stats = createStats({
        netRates: {
          wood: 1,
        },
      })
      const fitted = fitRequirements(definition, stats, 0)
      expect(fitted.backstop).toBe(true)
      expect(fitted.requirements.altar).toBeLessThan(Math.ceil(16 * (1 - CHALLENGE_MAX_LEVEL_CUT)))
      expect(estimateCompletionTime(fitted.requirements, stats)).toBeLessThanOrEqual(fitted.timeout * CHALLENGE_TARGET_TIME_SHARE)
    })

    it('should cap a requirement the colony does not produce at its stock', () => {
      const definition = definitionWith({
        faith: 1000,
      })
      const stats = createStats({
        faithRate: 0,
        stock: {
          faith: 120,
        },
      })
      const fitted = fitRequirements(definition, stats, 0)
      expect(fitted.backstop).toBe(true)
      expect(fitted.requirements.faith).toBeLessThanOrEqual(120)
      expect(estimateCompletionTime(fitted.requirements, stats)).toBe(0)
    })

    it('should drop a worker requirement the colony cannot grow toward instead of asking for all its workers', () => {
      const definition = definitionWith({
        workers: 150,
      })
      const stats = createStats({
        stock: {
          food: 0,
        },
        netRates: {
          food: 0,
        },
      })
      const fitted = fitRequirements(definition, stats, 0)
      expect(fitted.backstop).toBe(true)
      expect(fitted.requirements.workers).toBeNull()
    })

    it('should count a saved failure count that is not a whole number as 0', () => {
      const definition = definitionWith({
        faith: 1000,
      })
      const stats = createStats({
        faithRate: 1,
      })
      const expected = fitRequirements(definition, stats, 0)
      for (const failures of [
        'x',
        '2',
        -1,
        1.5,
        null,
      ]) {
        expect(fitRequirements(definition, stats, failures)).toEqual(expected)
      }
    })

    it('should never change the definition or share objects with it', () => {
      const definition = definitionWith({
        faith: 100,
        resources: {
          food: 200,
        },
      })
      const before = JSON.stringify(definition)
      const fitted = fitRequirements(definition, createRichStats(), 0)
      expect(JSON.stringify(definition)).toBe(before)
      expect(fitted.requirements).not.toBe(definition.requirements)
      expect(fitted.requirements.resources).not.toBe(definition.requirements.resources)
    })
  })

  describe('challengeDifficulty', () => {
    it('should divide the mean of the amount and level scales by the timer scale', () => {
      expect(challengeDifficulty({
        amounts: 1.2,
        levels: 1,
        timeout: 1,
      })).toBeCloseTo(1.1)
      expect(challengeDifficulty({
        amounts: 0.5,
        levels: null,
        timeout: 2,
      })).toBeCloseTo(0.25)
    })

    it('should treat a challenge without requirements as base difficulty over the timer', () => {
      expect(challengeDifficulty({
        amounts: null,
        levels: null,
        timeout: 1.25,
      })).toBeCloseTo(0.8)
    })
  })

  describe('challengeMood', () => {
    it('should pick the mildest mood below the first threshold', () => {
      expect(challengeMood(CHALLENGE_MOOD_THRESHOLDS[0] - 0.01)).toBe(CHALLENGE_MOOD_MERCIFUL)
    })

    it('should move up one mood at each threshold', () => {
      CHALLENGE_MOOD_THRESHOLDS.forEach((threshold, i) => {
        expect(challengeMood(threshold)).toBe(CHALLENGE_MOODS[i + 1])
      })
    })

    it('should be watchful at the base difficulty and demanding far above it', () => {
      expect(challengeMood(1)).toBe(CHALLENGE_MOOD_WATCHFUL)
      expect(challengeMood(10)).toBe(CHALLENGE_MOOD_DEMANDING)
    })
  })

  describe('adjustBlessing', () => {
    const productivityBlessing = {
      type: BLESSING_FERTILE_SOIL,
      timeout: 300,
      productivity: 0.3,
    }

    it('should return a new Blessing with the base values at difficulty 1', () => {
      const blessing = adjustBlessing(productivityBlessing, 1)
      expect(blessing).toBeInstanceOf(Blessing)
      expect(blessing.type).toBe(BLESSING_FERTILE_SOIL)
      expect(blessing.productivity).toBe(0.3)
      expect(blessing.timeout).toBe(300)
    })

    it('should grow stronger and a little longer with the difficulty', () => {
      const easy = adjustBlessing(productivityBlessing, 0.5)
      const hard = adjustBlessing(productivityBlessing, 1.3)
      expect(hard.productivity).toBe(0.39)
      expect(easy.productivity).toBeLessThan(0.3)
      expect(hard.timeout).toBeGreaterThan(easy.timeout)
      expect(hard.timeout % 60).toBe(0)
      expect(easy.timeout % 60).toBe(0)
    })

    it('should clamp the difficulty to the blessing ranges', () => {
      expect(adjustBlessing(productivityBlessing, 5)).toEqual(adjustBlessing(productivityBlessing, 1.3))
      expect(adjustBlessing(productivityBlessing, 0.1)).toEqual(adjustBlessing(productivityBlessing, 0.75))
    })

    it('should cap effect fractions', () => {
      const blessing = adjustBlessing({
        type: BLESSING_RAPID_CONSTRUCTION,
        timeout: 180,
        construction: 0.5,
      }, 1.3)
      expect(blessing.construction).toBe(CHALLENGE_EFFECT_CAPS.blessing)
    })

    it('should round gifted resources to 50 and territory to whole slots', () => {
      const gift = adjustBlessing({
        type: BLESSING_GIFT_FROM_THE_HEAVENS,
        resources: {
          food: 1000,
          wood: 500,
        },
      }, 0.75)
      expect(gift.resources).toEqual({
        food: 750,
        wood: 400,
      })
      expect(gift.timeout).toBeNull()
      const expansion = adjustBlessing({
        type: BLESSING_HOLY_EXPANSION,
        territory: 10,
      }, 1.3)
      expect(expansion.territory).toBe(13)
    })
  })

  describe('adjustPunishment', () => {
    const basePunishment = {
      type: PUNISHMENT_CROP_FAILURE,
      timeout: 120,
      faith: 0.5,
      productivityFarm: 0.1,
      resources: 0.2,
      workers: 2,
      levels: 2,
    }

    it('should return a new Punishment with the base values for a typical colony', () => {
      const punishment = adjustPunishment(basePunishment, 1, createStats(), null)
      expect(punishment).toBeInstanceOf(Punishment)
      expect(punishment.toJSON()).toEqual(new Punishment(basePunishment).toJSON())
    })

    it('should be milder for a struggling colony', () => {
      const punishment = adjustPunishment(basePunishment, 0.25, createStats(), null)
      expect(punishment.faith).toBe(0.25)
      expect(punishment.productivityFarm).toBe(0.05)
      expect(punishment.resources).toBe(0.1)
      expect(punishment.workers).toBe(1)
      expect(punishment.timeout).toBe(60)
    })

    it('should cap effect fractions', () => {
      const punishment = adjustPunishment({
        ...basePunishment,
        resources: 0.6,
      }, 4, createStats(), null)
      expect(punishment.resources).toBe(CHALLENGE_EFFECT_CAPS.punishment)
    })

    it('should scale worker and level losses to the colony size', () => {
      const punishment = adjustPunishment({
        ...basePunishment,
        workers: 20,
        levels: 10,
      }, 1, createStats(), createStats({
        workers: 200,
        buildingLevels: 120,
      }))
      expect(punishment.workers).toBe(10)
      expect(punishment.levels).toBe(5)
    })

    it('should never take more than a share of the colony', () => {
      const punishment = adjustPunishment({
        ...basePunishment,
        workers: 100,
        levels: 30,
      }, 1, createStats({
        workers: 40,
        buildingLevels: 60,
      }), null)
      expect(punishment.workers).toBe(10)
      expect(punishment.levels).toBe(6)
    })
  })

  describe('adjustDelay', () => {
    it('should keep the base delay for a typical colony', () => {
      expect(adjustDelay(40, 1, 0)).toBe(40)
    })

    it('should be longer for a struggling colony and shorter for a thriving one, within the range', () => {
      expect(adjustDelay(40, 0.25, 0)).toBe(60)
      expect(adjustDelay(40, 4, 0)).toBe(30)
    })

    it('should add recovery time per failure', () => {
      expect(adjustDelay(40, 1, 2)).toBe(40 + 2 * CHALLENGE_FAILURE_DELAY_BONUS)
    })

    it('should round to 10 seconds', () => {
      expect(adjustDelay(33, 1, 0)).toBe(30)
    })

    it('should count a saved failure count that is not a whole number as 0', () => {
      expect(adjustDelay(40, 1, 'x')).toBe(40)
      expect(adjustDelay(40, 1, '2')).toBe(40)
    })
  })

  describe('adjustChallenge', () => {
    it('should decide every countdown value', () => {
      const definition = createChallengeDefinition()
      const adjusted = adjustChallenge(definition, createRichStats(), null, 0)
      expect(adjusted.timeout).toBe(300)
      expect(adjusted.requirements.faith).toBe(130)
      expect(adjusted.blessings).toHaveLength(2)
      adjusted.blessings.forEach(blessing => expect(blessing).toBeInstanceOf(Blessing))
      expect(adjusted.blessings[0].productivity).toBeGreaterThan(0.3)
      expect(adjusted.punishment).toBeInstanceOf(Punishment)
      expect(CHALLENGE_MOODS).toContain(adjusted.mood)
      expect(adjusted.mood).toBe(challengeMood(challengeDifficulty(adjusted.scales)))
      expect(adjusted.backstop).toBe(false)
    })

    it('should scale the punishment with the reference at countdown start', () => {
      const definition = createChallengeDefinition({
        punishment: new Punishment({
          type: PUNISHMENT_CROP_FAILURE,
          workers: 20,
        }).toJSON(),
      })
      const referenceRow = {
        index: 1,
        activation: createStats({
          workers: 50,
        }),
        countdownStart: createStats({
          workers: 200,
        }),
      }
      const stats = createStats()
      const expected = adjustPunishment(definition.punishment, healthScore(stats, referenceRow.countdownStart), stats, referenceRow.countdownStart)
      const fromActivation = adjustPunishment(definition.punishment, healthScore(stats, referenceRow.activation), stats, referenceRow.activation)
      const workers = adjustChallenge(definition, stats, referenceRow, 0).punishment.workers
      expect(workers).toBe(expected.workers)
      expect(workers).not.toBe(fromActivation.workers)
    })
  })
})
