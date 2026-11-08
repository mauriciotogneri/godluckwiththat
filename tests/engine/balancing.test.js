import {describe, it, expect} from 'vitest'
import {BUILDING_UPGRADES,
  MARKET_BASE_FEE,
  MARKET_MIN_FEE,
  RESEARCH_SUBCATEGORY_BONUSES,
  RESEARCH_SUBCATEGORY_COST_MULTIPLIERS,
  RESEARCH_TIER_COSTS,
  RESEARCH_TIME_MULTIPLIER,
  SEASON_WARM_FOOD_MODIFIER,
  SEASON_COLD_FOOD_MODIFIER,
  SEASON_WARM_WOOD_MODIFIER,
  SEASON_COLD_WOOD_MODIFIER,
  MILITARY_UNITS_PER_LEVEL,
  UNIT_STATS,
  UNIT_COUNTER_MULTIPLIER,
  WALL_HEALTH_PER_LEVEL,
  TOWER_ARCHERS_PER_LEVEL,
  RAID_GRACE_PERIOD,
  RAID_INTERVAL_BASE,
  RAID_INTERVAL_PER_TERRITORY,
  RAID_INTERVAL_MIN,
  RAID_WARNING_TIME,
  RAID_UNITS_BASE,
  RAID_UNITS_PER_TERRITORY,
  RAID_UNITS_PER_YEAR,
  RAID_BONUS_PER_YEAR,
  RAID_DEFEAT_MAX_RESOURCES,
  RAID_DEFEAT_MAX_WORKERS,
  RAID_DEFEAT_MAX_LEVELS,
  TRIBUTE_VALUE_PER_UNIT,
  TRIBUTE_RESOURCE_VALUES,
  TRIBUTE_MIN_RESOURCES,
  TRIBUTE_MAX_RESOURCES,
  TRIBUTE_DELAY_GROWTH,
  TRIBUTE_CANCEL_MULTIPLIER,
  TRIBUTE_DELAY_SECONDS,
  TRIBUTE_ROUNDING,
  CHALLENGE_AMOUNT_ROUNDING,
  CHALLENGE_BLESSING_DURATION_RANGE,
  CHALLENGE_BLESSING_MAGNITUDE_RANGE,
  CHALLENGE_DELAY_SCALE_MAX,
  CHALLENGE_DELAY_SCALE_MIN,
  CHALLENGE_HEALTH_RATIO_MAX,
  CHALLENGE_HEALTH_RATIO_MIN,
  CHALLENGE_MAX_HARDEN_SCALE,
  CHALLENGE_MAX_LEVEL_CUT,
  CHALLENGE_MAX_TIMEOUT_SCALE,
  CHALLENGE_MIN_AMOUNT_SCALE,
  CHALLENGE_MOOD_THRESHOLDS,
  CHALLENGE_PUNISHMENT_SEVERITY_RANGE,
  CHALLENGE_TARGET_TIME_SHARE} from '@/js/engine/balancing.js'
import {BOUNDED_RESOURCES, HQ_RESOURCE_UNLOCKS, UNIT_TYPES} from '@/js/engine/constants.js'
import * as enums from '@/js/engine/enums.js'
import {HQ_TYPE_CAMP, HQ_TYPE_SETTLEMENT, RESOURCE_COPPER, RESOURCE_FOOD, RESOURCE_GOLD, RESOURCE_IRON, RESOURCE_KNOWLEDGE, RESOURCE_STONE, RESOURCE_WOOD} from '@/js/engine/enums.js'
import Cost from '@/js/models/cost.js'
import {VALID_BUILDING_KEYS} from '../helpers/building_keys.js'

describe('balancing', () => {
  describe('BUILDING_UPGRADES', () => {
    it('every key corresponds to a valid BUILDING_* enum', () => {
      for (const key of Object.keys(BUILDING_UPGRADES)) {
        expect(VALID_BUILDING_KEYS.has(key), `unexpected key "${key}"`).toBe(true)
      }
    })

    it('all cost values are Cost instances with positive values', () => {
      for (const [
        key,
        upgrade,
      ] of Object.entries(BUILDING_UPGRADES)) {
        expect(upgrade.cost, `${key}.cost`).toBeInstanceOf(Cost)
        expect(upgrade.cost.entries.size, `${key}.cost has no positive resources`).toBeGreaterThan(0)
      }
    })

    it('all multiplier values are greater than 1', () => {
      for (const [
        key,
        upgrade,
      ] of Object.entries(BUILDING_UPGRADES)) {
        expect(upgrade.multiplier, `${key}.multiplier`).toBeGreaterThan(1)
      }
    })
  })

  describe('season multipliers', () => {
    const seasonModifiers = [
      {
        name: 'SEASON_WARM_FOOD_MODIFIER',
        value: SEASON_WARM_FOOD_MODIFIER,
      },
      {
        name: 'SEASON_COLD_FOOD_MODIFIER',
        value: SEASON_COLD_FOOD_MODIFIER,
      },
      {
        name: 'SEASON_WARM_WOOD_MODIFIER',
        value: SEASON_WARM_WOOD_MODIFIER,
      },
      {
        name: 'SEASON_COLD_WOOD_MODIFIER',
        value: SEASON_COLD_WOOD_MODIFIER,
      },
    ]

    it.each(seasonModifiers)('$name effective multiplier is between 0 and 2', ({
      value,
    }) => {
      const effectiveMultiplier = 1 + value
      expect(effectiveMultiplier).toBeGreaterThanOrEqual(0)
      expect(effectiveMultiplier).toBeLessThanOrEqual(2)
    })
  })

  describe('RESEARCH_TIER_COSTS', () => {
    const tierResources = [
      [
        RESOURCE_FOOD,
        RESOURCE_WOOD,
      ],
      [
        RESOURCE_WOOD,
        RESOURCE_STONE,
      ],
      [
        RESOURCE_STONE,
        RESOURCE_COPPER,
      ],
      [
        RESOURCE_COPPER,
        RESOURCE_IRON,
      ],
      [
        RESOURCE_IRON,
        RESOURCE_GOLD,
      ],
    ]

    it('has one Cost per tier', () => {
      expect(RESEARCH_TIER_COSTS).toHaveLength(5)
      for (const cost of RESEARCH_TIER_COSTS) {
        expect(cost).toBeInstanceOf(Cost)
      }
    })

    it('knowledge rises with each tier', () => {
      for (let i = 1; i < RESEARCH_TIER_COSTS.length; i++) {
        expect(RESEARCH_TIER_COSTS[i].knowledge, `tier ${i + 1}`).toBeGreaterThan(RESEARCH_TIER_COSTS[i - 1].knowledge)
      }
    })

    it.each(tierResources.map((resources, index) => ({
      tier: index + 1,
      resources: resources,
    })))('tier $tier costs knowledge plus $resources', ({
      tier, resources,
    }) => {
      const cost = RESEARCH_TIER_COSTS[tier - 1]
      expect(new Set(cost.entries.keys())).toEqual(new Set([
        ...resources,
        RESOURCE_KNOWLEDGE,
      ]))
    })
  })

  describe('RESEARCH_SUBCATEGORY_COST_MULTIPLIERS', () => {
    const subcategoryKeys = Object.keys(enums)
      .filter(name => name.startsWith('RESEARCH_SUBCATEGORY_'))
      .map(name => enums[name])

    it('has a positive multiplier for every RESEARCH_SUBCATEGORY_* key and no others', () => {
      expect(new Set(Object.keys(RESEARCH_SUBCATEGORY_COST_MULTIPLIERS))).toEqual(new Set(subcategoryKeys))
      for (const key of subcategoryKeys) {
        expect(RESEARCH_SUBCATEGORY_COST_MULTIPLIERS[key], key).toBeGreaterThan(0)
      }
    })
  })

  describe('RESEARCH_TIME_MULTIPLIER', () => {
    it('is at least 1', () => {
      expect(RESEARCH_TIME_MULTIPLIER).toBeGreaterThanOrEqual(1)
    })
  })

  describe('RESEARCH_SUBCATEGORY_BONUSES', () => {
    it('every bonus is shown as a whole number (percent, or flat amount)', () => {
      for (const [
        key,
        bonus,
      ] of Object.entries(RESEARCH_SUBCATEGORY_BONUSES)) {
        const shown = bonus.flat ? bonus.value : bonus.value * 100
        expect(Number.isInteger(shown), `${key} shows ${shown}`).toBe(true)
      }
    })
  })

  describe('trade fees', () => {
    it('MARKET_BASE_FEE is between 0 and 1', () => {
      expect(MARKET_BASE_FEE).toBeGreaterThanOrEqual(0)
      expect(MARKET_BASE_FEE).toBeLessThanOrEqual(1)
    })

    it('MARKET_MIN_FEE is between 0 and 1', () => {
      expect(MARKET_MIN_FEE).toBeGreaterThanOrEqual(0)
      expect(MARKET_MIN_FEE).toBeLessThanOrEqual(1)
    })
  })

  describe('military', () => {
    it('MILITARY_UNITS_PER_LEVEL is a positive integer', () => {
      expect(Number.isInteger(MILITARY_UNITS_PER_LEVEL)).toBe(true)
      expect(MILITARY_UNITS_PER_LEVEL).toBeGreaterThan(0)
    })

    it('UNIT_STATS has exactly one entry per unit type', () => {
      expect(Object.keys(UNIT_STATS).sort()).toEqual([...UNIT_TYPES].sort())
    })

    it('every unit has positive attack and health, a positive Cost and non-negative upkeep', () => {
      for (const type of UNIT_TYPES) {
        const stats = UNIT_STATS[type]
        expect(stats.attack, `${type} attack`).toBeGreaterThan(0)
        expect(stats.health, `${type} health`).toBeGreaterThan(0)
        expect(stats.cost, `${type} cost`).toBeInstanceOf(Cost)
        expect(stats.cost.entries.size, `${type} cost`).toBeGreaterThan(0)
        expect(stats.upkeep.food, `${type} food upkeep`).toBeGreaterThanOrEqual(0)
        expect(stats.upkeep.wood, `${type} wood upkeep`).toBeGreaterThanOrEqual(0)
      }
    })

    it('UNIT_COUNTER_MULTIPLIER is greater than 1', () => {
      expect(UNIT_COUNTER_MULTIPLIER).toBeGreaterThan(1)
    })

    it('wall and tower values are positive', () => {
      expect(WALL_HEALTH_PER_LEVEL).toBeGreaterThan(0)
      expect(TOWER_ARCHERS_PER_LEVEL).toBeGreaterThan(0)
    })

    it('raid timers are positive and the interval floor is below its base', () => {
      expect(RAID_GRACE_PERIOD).toBeGreaterThan(0)
      expect(RAID_WARNING_TIME).toBeGreaterThan(0)
      expect(RAID_INTERVAL_PER_TERRITORY).toBeGreaterThanOrEqual(0)
      expect(RAID_INTERVAL_MIN).toBeGreaterThan(0)
      expect(RAID_INTERVAL_MIN).toBeLessThanOrEqual(RAID_INTERVAL_BASE)
    })

    it('every raid brings at least one raider', () => {
      expect(Math.floor(RAID_UNITS_BASE)).toBeGreaterThanOrEqual(1)
      expect(RAID_UNITS_PER_TERRITORY).toBeGreaterThanOrEqual(0)
      expect(RAID_UNITS_PER_YEAR).toBeGreaterThanOrEqual(0)
      expect(RAID_BONUS_PER_YEAR).toBeGreaterThanOrEqual(0)
    })

    it('defeat maximums are fractions and a whole level count', () => {
      expect(RAID_DEFEAT_MAX_RESOURCES).toBeGreaterThan(0)
      expect(RAID_DEFEAT_MAX_RESOURCES).toBeLessThanOrEqual(1)
      expect(RAID_DEFEAT_MAX_WORKERS).toBeGreaterThan(0)
      expect(RAID_DEFEAT_MAX_WORKERS).toBeLessThanOrEqual(1)
      expect(Number.isInteger(RAID_DEFEAT_MAX_LEVELS)).toBe(true)
      expect(RAID_DEFEAT_MAX_LEVELS).toBeGreaterThanOrEqual(0)
    })
  })

  describe('tribute', () => {
    it('TRIBUTE_VALUE_PER_UNIT is positive', () => {
      expect(TRIBUTE_VALUE_PER_UNIT).toBeGreaterThan(0)
    })

    it('TRIBUTE_RESOURCE_VALUES has a positive value for exactly the bounded resources', () => {
      expect(Object.keys(TRIBUTE_RESOURCE_VALUES).sort()).toEqual([...BOUNDED_RESOURCES].sort())
      for (const resource of BOUNDED_RESOURCES) {
        expect(TRIBUTE_RESOURCE_VALUES[resource], resource).toBeGreaterThan(0)
      }
    })

    it('demands between 1 and the number of resources unlocked at Settlement', () => {
      const settlementPool = [
        ...HQ_RESOURCE_UNLOCKS[HQ_TYPE_CAMP],
        ...HQ_RESOURCE_UNLOCKS[HQ_TYPE_SETTLEMENT],
      ].filter(resource => BOUNDED_RESOURCES.includes(resource))
      expect(TRIBUTE_MIN_RESOURCES).toBeGreaterThanOrEqual(1)
      expect(TRIBUTE_MIN_RESOURCES).toBeLessThanOrEqual(TRIBUTE_MAX_RESOURCES)
      expect(TRIBUTE_MAX_RESOURCES).toBeLessThanOrEqual(settlementPool.length)
    })

    it('delay price grows and cancelling costs at least the base demand', () => {
      expect(TRIBUTE_DELAY_GROWTH).toBeGreaterThan(1)
      expect(TRIBUTE_CANCEL_MULTIPLIER).toBeGreaterThanOrEqual(1)
    })

    it('allows 3 delays before a delay would cost more than cancelling', () => {
      let delays = 0
      while (Math.pow(TRIBUTE_DELAY_GROWTH, delays) <= TRIBUTE_CANCEL_MULTIPLIER) {
        delays++
      }
      expect(delays).toBe(3)
    })

    it('TRIBUTE_DELAY_SECONDS is positive and TRIBUTE_ROUNDING is a positive integer', () => {
      expect(TRIBUTE_DELAY_SECONDS).toBeGreaterThan(0)
      expect(Number.isInteger(TRIBUTE_ROUNDING)).toBe(true)
      expect(TRIBUTE_ROUNDING).toBeGreaterThan(0)
    })
  })

  describe('challenge scaling', () => {
    it('fits requirements within the timer and keeps the scale limits around the base values', () => {
      expect(CHALLENGE_TARGET_TIME_SHARE).toBeGreaterThan(0)
      expect(CHALLENGE_TARGET_TIME_SHARE).toBeLessThan(1)
      expect(CHALLENGE_MIN_AMOUNT_SCALE).toBeGreaterThan(0)
      expect(CHALLENGE_MIN_AMOUNT_SCALE).toBeLessThan(1)
      expect(CHALLENGE_MAX_HARDEN_SCALE).toBeGreaterThan(1)
      expect(CHALLENGE_MAX_LEVEL_CUT).toBeGreaterThan(0)
      expect(CHALLENGE_MAX_LEVEL_CUT).toBeLessThan(1)
      expect(CHALLENGE_MAX_TIMEOUT_SCALE).toBeGreaterThan(1)
    })

    it('every range includes the base value 1', () => {
      for (const [
        min,
        max,
      ] of [
          [
            CHALLENGE_DELAY_SCALE_MIN,
            CHALLENGE_DELAY_SCALE_MAX,
          ],
          [
            CHALLENGE_HEALTH_RATIO_MIN,
            CHALLENGE_HEALTH_RATIO_MAX,
          ],
          CHALLENGE_BLESSING_MAGNITUDE_RANGE,
          CHALLENGE_BLESSING_DURATION_RANGE,
          CHALLENGE_PUNISHMENT_SEVERITY_RANGE,
        ]) {
        expect(min).toBeLessThanOrEqual(1)
        expect(max).toBeGreaterThanOrEqual(1)
      }
    })

    it('mood thresholds rise and leave the base difficulty in the middle mood', () => {
      for (let i = 1; i < CHALLENGE_MOOD_THRESHOLDS.length; i++) {
        expect(CHALLENGE_MOOD_THRESHOLDS[i]).toBeGreaterThan(CHALLENGE_MOOD_THRESHOLDS[i - 1])
      }
      expect(CHALLENGE_MOOD_THRESHOLDS.filter(threshold => threshold <= 1)).toHaveLength(2)
    })

    it('amount rounding bands rise and cover every amount', () => {
      for (let i = 1; i < CHALLENGE_AMOUNT_ROUNDING.length; i++) {
        expect(CHALLENGE_AMOUNT_ROUNDING[i].below).toBeGreaterThan(CHALLENGE_AMOUNT_ROUNDING[i - 1].below)
        expect(CHALLENGE_AMOUNT_ROUNDING[i].step).toBeGreaterThan(CHALLENGE_AMOUNT_ROUNDING[i - 1].step)
      }
      expect(CHALLENGE_AMOUNT_ROUNDING[CHALLENGE_AMOUNT_ROUNDING.length - 1].below).toBe(Infinity)
    })
  })
})
