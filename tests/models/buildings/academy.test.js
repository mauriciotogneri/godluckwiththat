import {describe, it, expect} from 'vitest'
import Cost from '@/js/models/cost.js'
import Academy, {Research} from '@/js/models/buildings/academy.js'

describe('Research', () => {
  it('should initialize with duration and remainingSeconds equal to duration', () => {
    const research = new Research(120)
    expect(research.duration).toBe(120)
    expect(research.remainingSeconds).toBe(120)
  })

  it('should accept custom remainingSeconds override', () => {
    const research = new Research(120, 45)
    expect(research.duration).toBe(120)
    expect(research.remainingSeconds).toBe(45)
  })

  describe('advance', () => {
    it('should decrement remainingSeconds by delta', () => {
      const research = new Research(60)
      const completed = research.advance(10)
      expect(research.remainingSeconds).toBe(50)
      expect(completed).toBe(false)
    })

    it('should clamp remainingSeconds at 0', () => {
      const research = new Research(60)
      const completed = research.advance(100)
      expect(research.remainingSeconds).toBe(0)
      expect(completed).toBe(true)
    })
  })
})

describe('Academy', () => {
  describe('constructor', () => {
    it('should initialize with empty completed and active sets', () => {
      const academy = new Academy({
        level: 1,
      })
      expect(academy.completed).toBeInstanceOf(Set)
      expect(academy.completed.size).toBe(0)
      expect(academy.active).toBeInstanceOf(Map)
      expect(academy.active.size).toBe(0)
    })

    it('should restore completed researches from data', () => {
      const academy = new Academy({
        level: 1,
        completed: [
          'transportation1',
          'construction1',
        ],
      })
      expect(academy.completed.size).toBe(2)
      expect(academy.completed.has('transportation1')).toBe(true)
    })

    it('should restore active researches from data', () => {
      const academy = new Academy({
        level: 1,
        active: [
          {
            key: 'mining1',
            remainingSeconds: 30,
            duration: 60,
          },
        ],
      })
      expect(academy.active.size).toBe(1)
      expect(academy.active.has('mining1')).toBe(true)
      const research = academy.active.get('mining1')
      expect(research.remainingSeconds).toBe(30)
      expect(research.duration).toBe(60)
    })
  })

  describe('levelUpCost', () => {
    it('should return a Cost instance', () => {
      expect(new Academy({
        level: 1,
      }).levelUpCost).toBeInstanceOf(Cost)
    })
  })

  describe('isCompleted', () => {
    it('should return true for completed research', () => {
      const academy = new Academy({
        level: 1,
        completed: ['transportation1'],
      })
      expect(academy.isCompleted('transportation1')).toBe(true)
    })

    it('should return false for non-completed research', () => {
      const academy = new Academy({
        level: 1,
      })
      expect(academy.isCompleted('transportation1')).toBe(false)
    })
  })

  describe('isActive', () => {
    it('should return true for active research', () => {
      const academy = new Academy({
        level: 1,
      })
      academy.start('mining1', 60)
      expect(academy.isActive('mining1')).toBe(true)
    })

    it('should return false for non-active research', () => {
      const academy = new Academy({
        level: 1,
      })
      expect(academy.isActive('mining1')).toBe(false)
    })
  })

  describe('canResearch', () => {
    const prerequisites = {
      transportation2: 'transportation1',
      transportation3: 'transportation2',
    }

    it('should return true when level >= 1 and not active or completed', () => {
      const academy = new Academy({
        level: 1,
      })
      expect(academy.canResearch('transportation1', prerequisites)).toBe(true)
    })

    it('should return false when level is 0', () => {
      const academy = new Academy({
        level: 0,
      })
      expect(academy.canResearch('transportation1', prerequisites)).toBe(false)
    })

    it('should return false when already completed', () => {
      const academy = new Academy({
        level: 1,
        completed: ['transportation1'],
      })
      expect(academy.canResearch('transportation1', prerequisites)).toBe(false)
    })

    it('should return false when already active', () => {
      const academy = new Academy({
        level: 1,
      })
      academy.start('transportation1', 60)
      expect(academy.canResearch('transportation1', prerequisites)).toBe(false)
    })

    it('should return false when the previous tier is not completed', () => {
      const academy = new Academy({
        level: 1,
      })
      expect(academy.canResearch('transportation2', prerequisites)).toBe(false)
    })

    it('should return true when the previous tier is completed', () => {
      const academy = new Academy({
        level: 1,
        completed: ['transportation1'],
      })
      expect(academy.canResearch('transportation2', prerequisites)).toBe(true)
    })

    it('should return false when the previous tier is only active', () => {
      const academy = new Academy({
        level: 1,
      })
      academy.start('transportation1', 60)
      expect(academy.canResearch('transportation2', prerequisites)).toBe(false)
    })

    it('should return false when skipping more than one tier', () => {
      const academy = new Academy({
        level: 1,
        completed: ['transportation1'],
      })
      expect(academy.canResearch('transportation3', prerequisites)).toBe(false)
    })
  })

  describe('start', () => {
    it('should add research to active map', () => {
      const academy = new Academy({
        level: 1,
      })
      academy.start('mining1', 120)
      expect(academy.active.has('mining1')).toBe(true)
      expect(academy.active.get('mining1').duration).toBe(120)
      expect(academy.active.get('mining1').remainingSeconds).toBe(120)
    })
  })

  describe('complete', () => {
    it('should move research from active to completed', () => {
      const academy = new Academy({
        level: 1,
      })
      academy.start('mining1', 60)
      academy.complete('mining1')
      expect(academy.active.has('mining1')).toBe(false)
      expect(academy.completed.has('mining1')).toBe(true)
    })

    it('should invalidate bonus cache', () => {
      const researchTree = [
        {
          subcategories: [
            {
              bonus: {
                type: 'miningProduction',
                value: 0.05,
              },
              researches: ['mining1'],
            },
          ],
        },
      ]
      const academy = new Academy({
        level: 1,
        completed: ['mining1'],
      })
      academy.completedBonuses(researchTree)
      academy.start('mining2', 60)
      academy.complete('mining2')
      expect(academy._bonusCache).toBeNull()
    })
  })

  describe('completedBonuses', () => {
    it('should aggregate bonus values from completed researches', () => {
      const researchTree = [
        {
          subcategories: [
            {
              bonus: {
                type: 'miningProduction',
                value: 0.05,
              },
              researches: [
                'mining1',
                'mining2',
                'mining3',
              ],
            },
          ],
        },
      ]
      const academy = new Academy({
        level: 1,
        completed: [
          'mining1',
          'mining2',
        ],
      })
      const bonuses = academy.completedBonuses(researchTree)
      expect(bonuses.miningProduction).toBeCloseTo(0.10)
    })

    it('should return empty object when no researches completed', () => {
      const researchTree = [
        {
          subcategories: [
            {
              bonus: {
                type: 'miningProduction',
                value: 0.05,
              },
              researches: ['mining1'],
            },
          ],
        },
      ]
      const academy = new Academy({
        level: 1,
      })
      const bonuses = academy.completedBonuses(researchTree)
      expect(Object.keys(bonuses)).toHaveLength(0)
    })

    it('should skip subcategories that have no bonus property', () => {
      const researchTree = [
        {
          subcategories: [
            {
              researches: ['transportation1'],
            },
            {
              bonus: {
                type: 'miningProduction',
                value: 0.05,
              },
              researches: ['mining1'],
            },
          ],
        },
      ]
      const academy = new Academy({
        level: 1,
        completed: [
          'transportation1',
          'mining1',
        ],
      })
      const bonuses = academy.completedBonuses(researchTree)
      expect(Object.keys(bonuses)).toHaveLength(1)
      expect(bonuses.miningProduction).toBeCloseTo(0.05)
    })

    it('should cache the result', () => {
      const researchTree = [
        {
          subcategories: [],
        },
      ]
      const academy = new Academy({
        level: 1,
      })
      const first = academy.completedBonuses(researchTree)
      const second = academy.completedBonuses(researchTree)
      expect(first).toBe(second)
    })
  })

  describe('toJSON', () => {
    it('should serialize completed as array and active as entries', () => {
      const academy = new Academy({
        level: 2,
        workers: 3,
        completed: ['transportation1'],
      })
      academy.start('mining1', 60)
      const json = academy.toJSON()
      expect(json.level).toBe(2)
      expect(json.workers).toBe(3)
      expect(json.completed).toEqual(['transportation1'])
      expect(json.active).toHaveLength(1)
      expect(json.active[0].key).toBe('mining1')
      expect(json.active[0].duration).toBe(60)
    })
  })
})
