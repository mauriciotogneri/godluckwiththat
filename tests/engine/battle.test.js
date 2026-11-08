import {describe, it, expect} from 'vitest'
import {RAID_DEFEAT_MAX_LEVELS, RAID_DEFEAT_MAX_RESOURCES, RAID_DEFEAT_MAX_WORKERS, TOWER_ARCHERS_PER_LEVEL, UNIT_COUNTER_MULTIPLIER, UNIT_STATS, WALL_HEALTH_PER_LEVEL} from '@/js/engine/balancing.js'
import {armyAttack, armyHealth, resolveBattle} from '@/js/engine/battle.js'
import {UNIT_COUNTERS, UNIT_TYPES} from '@/js/engine/constants.js'
import {UNIT_ARCHER, UNIT_CAVALRY, UNIT_INFANTRY} from '@/js/engine/enums.js'

function createDefender(overrides = {}) {
  return {
    units: {},
    wallLevel: 0,
    towerLevel: 0,
    attackBonus: 0,
    defenseBonus: 0,
    workers: 0,
    ...overrides,
  }
}

function fight(defenderOverrides, enemyUnits) {
  return resolveBattle(createDefender(defenderOverrides), {
    units: enemyUnits,
  })
}

describe('armyHealth', () => {
  it('should sum count × health over every unit type', () => {
    const units = {
      [UNIT_INFANTRY]: 2,
      [UNIT_ARCHER]: 3,
      [UNIT_CAVALRY]: 1,
    }
    const expected = 2 * UNIT_STATS[UNIT_INFANTRY].health
      + 3 * UNIT_STATS[UNIT_ARCHER].health
      + UNIT_STATS[UNIT_CAVALRY].health
    expect(armyHealth(units)).toBe(expected)
  })

  it('should apply the defense bonus to unit health', () => {
    expect(armyHealth({
      [UNIT_INFANTRY]: 10,
    }, 0.1)).toBeCloseTo(10 * UNIT_STATS[UNIT_INFANTRY].health * 1.1, 10)
  })

  it('should treat missing unit types as 0', () => {
    expect(armyHealth({})).toBe(0)
  })
})

describe('armyAttack', () => {
  it('should apply no counter bonus when the opponent has none of the beaten type', () => {
    // Infantry beats cavalry; archers are not countered by infantry
    expect(armyAttack({
      [UNIT_INFANTRY]: 10,
    }, 0, {
      [UNIT_ARCHER]: 10,
    })).toBe(10 * UNIT_STATS[UNIT_INFANTRY].attack)
  })

  it('should apply the full counter multiplier against an army made only of the beaten type', () => {
    expect(armyAttack({
      [UNIT_INFANTRY]: 10,
    }, 0, {
      [UNIT_CAVALRY]: 10,
    })).toBe(10 * UNIT_STATS[UNIT_INFANTRY].attack * UNIT_COUNTER_MULTIPLIER)
  })

  it('should scale the counter bonus with the beaten type share of opponent health', () => {
    // 5 infantry + 5 cavalry: equal health, so cavalry holds half the health
    const expectedFactor = 1 + (UNIT_COUNTER_MULTIPLIER - 1) * 0.5
    expect(armyAttack({
      [UNIT_INFANTRY]: 10,
    }, 0, {
      [UNIT_INFANTRY]: 5,
      [UNIT_CAVALRY]: 5,
    })).toBeCloseTo(10 * UNIT_STATS[UNIT_INFANTRY].attack * expectedFactor, 10)
  })

  it('should apply the attack bonus', () => {
    expect(armyAttack({
      [UNIT_INFANTRY]: 10,
    }, 0.1, {
      [UNIT_ARCHER]: 10,
    })).toBeCloseTo(10 * UNIT_STATS[UNIT_INFANTRY].attack * 1.1, 10)
  })

  it('should apply no counter bonus against an empty opponent', () => {
    expect(armyAttack({
      [UNIT_INFANTRY]: 10,
    }, 0, {})).toBe(10 * UNIT_STATS[UNIT_INFANTRY].attack)
  })

  it('should return 0 for an empty army', () => {
    expect(armyAttack({}, 0, {
      [UNIT_INFANTRY]: 10,
    })).toBe(0)
  })
})

describe('resolveBattle', () => {
  describe('worked examples', () => {
    it('10 infantry vs 9 infantry: ratio 1.11, victory, 6 infantry lost', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }, {
        [UNIT_INFANTRY]: 9,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBeCloseTo(1.11, 2)
      expect(result.unitsLost[UNIT_INFANTRY]).toBe(6)
    })

    it('same plus a level 1 wall: ratio 1.28, victory, 2 infantry lost', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        wallLevel: 1,
      }, {
        [UNIT_INFANTRY]: 9,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBeCloseTo(1.28, 2)
      expect(result.unitsLost[UNIT_INFANTRY]).toBe(2)
    })

    it('10 infantry vs 10 cavalry: ratio 1.29, infantry win', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }, {
        [UNIT_CAVALRY]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBeCloseTo(1.29, 2)
    })

    it('10 archers vs 10 infantry: ratio 1.41, archers win', () => {
      const result = fight({
        units: {
          [UNIT_ARCHER]: 10,
        },
      }, {
        [UNIT_INFANTRY]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBeCloseTo(1.41, 2)
    })

    it('10 cavalry vs 10 archers: ratio 1.55, cavalry win', () => {
      const result = fight({
        units: {
          [UNIT_CAVALRY]: 10,
        },
      }, {
        [UNIT_ARCHER]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBeCloseTo(1.55, 2)
    })

    it('0 units vs anything: defeat at full severity (30% resources, 10% workers, 3 levels)', () => {
      const result = fight({
        workers: 50,
      }, {
        [UNIT_INFANTRY]: 3,
      })
      expect(result.victory).toBe(false)
      expect(result.ratio).toBe(0)
      expect(result.playerPower).toBe(0)
      expect(result.severity).toBe(1)
      expect(result.resourceShare).toBeCloseTo(0.3, 10)
      expect(result.workersLost).toBe(5)
      expect(result.levelsLost).toBe(3)
    })
  })

  describe('unit counters', () => {
    it('should make every counter win at equal numbers', () => {
      for (const type of UNIT_TYPES) {
        const result = fight({
          units: {
            [type]: 10,
          },
        }, {
          [UNIT_COUNTERS[type]]: 10,
        })
        expect(result.victory, `${type} vs ${UNIT_COUNTERS[type]}`).toBe(true)
        expect(result.ratio, `${type} vs ${UNIT_COUNTERS[type]}`).toBeGreaterThan(1)
      }
    })

    it('should make every countered type lose at equal numbers', () => {
      for (const type of UNIT_TYPES) {
        const result = fight({
          units: {
            [UNIT_COUNTERS[type]]: 10,
          },
        }, {
          [type]: 10,
        })
        expect(result.victory, `${UNIT_COUNTERS[type]} vs ${type}`).toBe(false)
      }
    })
  })

  describe('mirror fights', () => {
    it('should give a ratio of exactly 1 for identical armies', () => {
      for (const type of UNIT_TYPES) {
        const result = fight({
          units: {
            [type]: 10,
          },
        }, {
          [type]: 10,
        })
        expect(result.ratio, type).toBe(1)
      }
    })

    it('should count a tie as a defeat with severity 0 and no colony losses', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        workers: 100,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      expect(result.victory).toBe(false)
      expect(result.severity).toBe(0)
      expect(result.resourceShare).toBe(0)
      expect(result.workersLost).toBe(0)
      expect(result.levelsLost).toBe(0)
      expect(result.unitsLost[UNIT_INFANTRY]).toBe(10)
    })

    it('should let the larger army win', () => {
      const result = fight({
        units: {
          [UNIT_ARCHER]: 11,
        },
      }, {
        [UNIT_ARCHER]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBeCloseTo(1.1, 10)
    })
  })

  describe('wall', () => {
    it('should add its health to the player power', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        wallLevel: 2,
      }, {
        [UNIT_INFANTRY]: 9,
      })
      const attack = 10 * UNIT_STATS[UNIT_INFANTRY].attack
      const health = 10 * UNIT_STATS[UNIT_INFANTRY].health + 2 * WALL_HEALTH_PER_LEVEL
      expect(result.playerPower).toBe(attack * health)
    })

    it('should absorb all losses against a weak raid', () => {
      const withoutWall = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }, {
        [UNIT_INFANTRY]: 6,
      })
      const withWall = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        wallLevel: 1,
      }, {
        [UNIT_INFANTRY]: 6,
      })
      expect(withoutWall.unitsLost[UNIT_INFANTRY]).toBe(2)
      expect(withWall.victory).toBe(true)
      expect(withWall.unitsLost[UNIT_INFANTRY]).toBe(0)
    })

    it('should not be scaled by the defense bonus', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        wallLevel: 1,
        defenseBonus: 0.1,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      // 100 attack × (330 unit health + 100 wall health)
      expect(result.playerPower).toBeCloseTo(100 * (330 + WALL_HEALTH_PER_LEVEL), 6)
    })

    it('should not fight on its own (no attack without units or tower)', () => {
      const result = fight({
        wallLevel: 5,
        workers: 10,
      }, {
        [UNIT_INFANTRY]: 1,
      })
      expect(result.victory).toBe(false)
      expect(result.playerPower).toBe(0)
      expect(result.severity).toBe(1)
    })
  })

  describe('tower', () => {
    // Health of the tower's archers per level (they share losses but never die)
    const TOWER_HEALTH = TOWER_ARCHERS_PER_LEVEL * UNIT_STATS[UNIT_ARCHER].health

    it('should add its archers attack and health to the player', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        towerLevel: 1,
      }, {
        [UNIT_CAVALRY]: 10,
      })
      // Infantry 10 × 10 × 2 (counter) + tower 3 archers × 15 × 1 (no infantry to counter)
      const towerAttack = TOWER_ARCHERS_PER_LEVEL * UNIT_STATS[UNIT_ARCHER].attack
      expect(result.playerPower).toBeCloseTo((200 + towerAttack) * (300 + TOWER_HEALTH), 6)
    })

    it('should get the archer counter bonus against infantry', () => {
      const withoutTower = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }, {
        [UNIT_INFANTRY]: 10,
      })
      const withTower = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        towerLevel: 1,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      const towerAttack = TOWER_ARCHERS_PER_LEVEL * UNIT_STATS[UNIT_ARCHER].attack * UNIT_COUNTER_MULTIPLIER
      expect(withTower.playerPower).toBeCloseTo((100 + towerAttack) * (300 + TOWER_HEALTH), 6)
      expect(withoutTower.victory).toBe(false)
      expect(withTower.victory).toBe(true)
    })

    it('should scale with the tower level', () => {
      const level1 = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        towerLevel: 1,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      const level3 = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        towerLevel: 3,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      // Tower adds 90 attack and 60 health per level against infantry
      expect(level1.playerPower).toBeCloseTo((100 + 90) * (300 + 60), 6)
      expect(level3.playerPower).toBeCloseTo((100 + 270) * (300 + 180), 6)
    })

    it('should not get the attack research bonus', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        towerLevel: 1,
        attackBonus: 0.5,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      // Units 100 × 1.5 = 150, tower 90 unchanged
      expect(result.playerPower).toBeCloseTo((150 + 90) * (300 + TOWER_HEALTH), 6)
    })

    it('should not get the defense research bonus', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        towerLevel: 1,
        defenseBonus: 0.1,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      // Units 300 × 1.1 = 330 health, tower 60 unchanged
      expect(result.playerPower).toBeCloseTo((100 + 90) * (330 + TOWER_HEALTH), 6)
    })

    it('should defend on its own', () => {
      const result = fight({
        towerLevel: 1,
        workers: 10,
      }, {
        [UNIT_INFANTRY]: 3,
      })
      // Tower 90 attack × 60 health against 3 infantry: 30 attack × 90 health
      expect(result.playerPower).toBeCloseTo(5400, 6)
      expect(result.ratio).toBeCloseTo(Math.SQRT2, 6)
      expect(result.victory).toBe(true)
      expect(result.unitsLost).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 0,
      })
    })

    it('should count its archers in the mix the raiders counter', () => {
      const result = fight({
        towerLevel: 2,
      }, {
        [UNIT_CAVALRY]: 5,
      })
      // An all-archer mix gives the raider cavalry their full counter bonus: 5 × 12 × 2 attack × 150 health
      expect(result.enemyPower).toBeCloseTo(5 * 12 * UNIT_COUNTER_MULTIPLIER * 150, 6)
      expect(result.victory).toBe(false)
    })

    it('should not turn a won fight into a loss when the first unit is trained, with no wall', () => {
      const towerOnly = fight({
        towerLevel: 3,
      }, {
        [UNIT_ARCHER]: 8,
      })
      const withInfantry = fight({
        units: {
          [UNIT_INFANTRY]: 1,
        },
        towerLevel: 3,
      }, {
        [UNIT_ARCHER]: 8,
      })
      // One infantry is only 1/7 of the mix, so the raider archers' bonus over it stays small
      expect(towerOnly.victory).toBe(true)
      expect(withInfantry.victory).toBe(true)
      expect(withInfantry.ratio).toBeGreaterThan(towerOnly.ratio)
    })

    it('should share losses with the units without dying', () => {
      // Ratio 1.98: about 58 of 420 health (300 infantry + 120 tower) is lost. Units alone would
      // lose 10 × 58 / 300 ≈ 2 infantry; the tower's archers take their share, so 10 × 58 / 420 ≈ 1
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        towerLevel: 2,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBeCloseTo(1.98, 2)
      expect(result.unitsLost[UNIT_INFANTRY]).toBe(1)
    })
  })

  describe('research', () => {
    it('should turn a tie into a victory with the attack bonus', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        attackBonus: 0.1,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.playerPower).toBeCloseTo(110 * 300, 6)
      expect(result.ratio).toBeCloseTo(Math.sqrt(1.1), 10)
    })

    it('should turn a tie into a victory with the defense bonus', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        defenseBonus: 0.1,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.playerPower).toBeCloseTo(100 * 330, 6)
    })

    it('should not apply the player research to the raiders', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        attackBonus: 0.5,
        defenseBonus: 0.5,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      expect(result.enemyPower).toBe(10 * UNIT_STATS[UNIT_INFANTRY].attack * 10 * UNIT_STATS[UNIT_INFANTRY].health)
    })

    it('should apply the raiders own attack and health bonuses', () => {
      const result = resolveBattle(createDefender({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }), {
        units: {
          [UNIT_INFANTRY]: 10,
        },
        attackBonus: 0.1,
        defenseBonus: 0.2,
      })
      expect(result.enemyPower).toBeCloseTo((10 * UNIT_STATS[UNIT_INFANTRY].attack * 1.1) * (10 * UNIT_STATS[UNIT_INFANTRY].health * 1.2), 6)
      expect(result.victory).toBe(false)
    })

    it('should turn a tie into a defeat with a raider bonus', () => {
      const result = resolveBattle(createDefender({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }), {
        units: {
          [UNIT_INFANTRY]: 10,
        },
        attackBonus: 0.05,
        defenseBonus: 0.05,
      })
      expect(result.ratio).toBeLessThan(1)
      expect(result.victory).toBe(false)
    })
  })

  describe('defeat severity', () => {
    it('should give severity 1 to a colony with no army', () => {
      const result = fight({}, {
        [UNIT_CAVALRY]: 1,
      })
      expect(result.severity).toBe(1)
      expect(result.resourceShare).toBe(RAID_DEFEAT_MAX_RESOURCES)
      expect(result.levelsLost).toBe(RAID_DEFEAT_MAX_LEVELS)
    })

    it('should give a severity near 0 to a near tie', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 99,
        },
        workers: 100,
      }, {
        [UNIT_INFANTRY]: 100,
      })
      // ratio 0.99 → severity sqrt(1 − 0.9801) ≈ 0.141
      expect(result.victory).toBe(false)
      expect(result.ratio).toBeCloseTo(0.99, 10)
      expect(result.severity).toBeCloseTo(0.141, 3)
      expect(result.levelsLost).toBe(0)
      expect(result.workersLost).toBe(1)
    })

    it('should scale resources, workers and levels with severity', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 5,
        },
        workers: 40,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      // ratio 0.5 → severity sqrt(0.75) ≈ 0.866
      const severity = Math.sqrt(0.75)
      expect(result.severity).toBeCloseTo(severity, 10)
      expect(result.resourceShare).toBeCloseTo(severity * RAID_DEFEAT_MAX_RESOURCES, 10)
      expect(result.workersLost).toBe(Math.round(severity * RAID_DEFEAT_MAX_WORKERS * 40))
      expect(result.levelsLost).toBe(Math.round(severity * RAID_DEFEAT_MAX_LEVELS))
    })

    it('should lose the whole army on defeat', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 5,
          [UNIT_ARCHER]: 2,
        },
      }, {
        [UNIT_CAVALRY]: 20,
      })
      expect(result.victory).toBe(false)
      expect(result.unitsLost).toEqual({
        [UNIT_INFANTRY]: 5,
        [UNIT_ARCHER]: 2,
        [UNIT_CAVALRY]: 0,
      })
    })

    it('should report no defeat losses on a victory', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        workers: 100,
      }, {
        [UNIT_INFANTRY]: 2,
      })
      expect(result.victory).toBe(true)
      expect(result.severity).toBe(0)
      expect(result.resourceShare).toBe(0)
      expect(result.workersLost).toBe(0)
      expect(result.levelsLost).toBe(0)
    })
  })

  describe('victory losses', () => {
    it('should round losses per unit type', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 3,
          [UNIT_ARCHER]: 5,
        },
      }, {
        [UNIT_INFANTRY]: 2,
        [UNIT_CAVALRY]: 2,
      })
      // Lost health share ≈ 0.121: infantry round(0.36) = 0, archers round(0.60) = 1
      expect(result.victory).toBe(true)
      expect(result.unitsLost).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 1,
        [UNIT_CAVALRY]: 0,
      })
    })

    it('should never lose more units than the army has, even when winning by a hair', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        attackBonus: 0.001,
      }, {
        [UNIT_INFANTRY]: 10,
      })
      expect(result.victory).toBe(true)
      expect(result.unitsLost[UNIT_INFANTRY]).toBe(10)
    })

    it('should lose fewer units the larger the victory', () => {
      const close = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }, {
        [UNIT_INFANTRY]: 9,
      })
      const easy = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }, {
        [UNIT_INFANTRY]: 6,
      })
      expect(easy.unitsLost[UNIT_INFANTRY]).toBeLessThan(close.unitsLost[UNIT_INFANTRY])
    })

    it('should report every unit type in unitsLost', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
      }, {
        [UNIT_INFANTRY]: 9,
      })
      expect(Object.keys(result.unitsLost).sort()).toEqual([...UNIT_TYPES].sort())
    })
  })

  describe('empty enemy', () => {
    it('should be a victory with no losses and an infinite ratio', () => {
      const result = fight({
        units: {
          [UNIT_INFANTRY]: 10,
        },
        workers: 10,
      }, {})
      expect(result.victory).toBe(true)
      expect(result.ratio).toBe(Infinity)
      expect(result.enemyPower).toBe(0)
      expect(result.unitsLost).toEqual({
        [UNIT_INFANTRY]: 0,
        [UNIT_ARCHER]: 0,
        [UNIT_CAVALRY]: 0,
      })
      expect(result.severity).toBe(0)
      expect(result.workersLost).toBe(0)
      expect(result.levelsLost).toBe(0)
    })

    it('should be a victory even when the colony has no army', () => {
      const result = fight({}, {
        [UNIT_INFANTRY]: 0,
      })
      expect(result.victory).toBe(true)
      expect(result.ratio).toBe(Infinity)
    })
  })
})
