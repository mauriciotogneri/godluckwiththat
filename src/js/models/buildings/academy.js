import {BUILDING_UPGRADES} from '@/js/engine/balancing.js'
import {BUILDING_ACADEMY} from '@/js/engine/enums.js'
import Producer from '@/js/models/buildings/producer.js'

/**
 * Generates knowledge for the colony and manages research state.
 *
 * @property {Set<string>} completed - Set of completed research keys
 * @property {Map<string, Research>} active - In-progress researches
 */
class Academy extends Producer {
  /**
   * @param {Object} data - Initial building data
   * @param {string[]} [data.completed] - Array of completed research keys
   * @param {Array<{key: string, remainingSeconds: number, duration: number}>} [data.active] - Serialized active researches
   */
  constructor(data) {
    super(data)
    this.completed = new Set(data.completed ?? []) // Set of completed research keys
    this.active = new Map() // In-progress researches keyed by research key
    this._bonusCache = null // Cached result of completedBonuses(); invalidated on complete()
    for (const entry of (data.active ?? [])) {
      this.active.set(entry.key, new Research(entry.duration, entry.remainingSeconds))
    }
  }

  /**
   * Cost to level up from the current level.
   * Formula: floor(baseCost * multiplier ^ level)
   * @returns {Cost} Resource cost for the next level
   */
  get levelUpCost() {
    const {
      cost, multiplier,
    } = BUILDING_UPGRADES[BUILDING_ACADEMY]
    return cost.multiplyFloor(Math.pow(multiplier, this.level))
  }

  /**
   * @param {string} key - Research key
   * @returns {boolean} Whether the research is completed
   */
  isCompleted(key) {
    return this.completed.has(key)
  }

  /**
   * @param {string} key - Research key
   * @returns {boolean} Whether the research is currently active
   */
  isActive(key) {
    return this.active.has(key)
  }

  /**
   * Whether the academy can start a given research.
   * Tier N of a chain requires tier N-1 to be completed (not just active).
   * @param {string} key - Research key
   * @param {Object<string, string>} prerequisites - RESEARCH_PREREQUISITES from constants.js
   * @returns {boolean} Whether the research can be started
   */
  canResearch(key, prerequisites) {
    const prerequisite = prerequisites[key] // Previous tier; undefined for tier 1
    return this.level >= 1 && !this.isActive(key) && !this.isCompleted(key) && (!prerequisite || this.isCompleted(prerequisite))
  }

  /**
   * Whether running researches are paused (academy downgraded or destroyed to level 0).
   * @returns {boolean} True while the academy is below level 1
   */
  get isResearchPaused() {
    return this.level < 1
  }

  /**
   * Starts a new research.
   * @param {string} key - Research key
   * @param {number} duration - Total duration in seconds
   */
  start(key, duration) {
    this.active.set(key, new Research(duration))
  }

  /**
   * Moves a research from active to completed.
   * @param {string} key - Research key
   */
  complete(key) {
    this.active.delete(key)
    this.completed.add(key)
    this._bonusCache = null
  }

  /**
   * Aggregates bonus values from all completed researches by bonus type.
   * @param {Array<Object>} researchTree - RESEARCH_TREE from constants.js
   * @returns {Object<string, number>} Bonus type → cumulative value
   */
  completedBonuses(researchTree) {
    if (this._bonusCache !== null) {
      return this._bonusCache
    }
    const bonuses = {}
    // Iterate categories → subcategories → individual researches, accumulating bonus values
    for (const cat of researchTree) {
      for (const sub of cat.subcategories) {
        if (!sub.bonus) {
          continue
        }
        for (const key of sub.researches) {
          if (!this.completed.has(key)) {
            continue
          }
          const {
            type, value,
          } = sub.bonus
          bonuses[type] = (bonuses[type] ?? 0) + value
        }
      }
    }
    this._bonusCache = bonuses
    return bonuses
  }

  /**
   * Serializable snapshot for save/load.
   * @returns {Object} Plain object snapshot for serialization
   */
  toJSON() {
    return {
      level: this.level,
      constructionRemaining: this.constructionRemaining,
      constructionDuration: this.constructionDuration,
      workers: this.workers,
      completed: [...this.completed],
      active: [...this.active.entries()].map(([
        key,
        data,
      ]) => ({
        key: key,
        remainingSeconds: data.remainingSeconds,
        duration: data.duration,
      })),
    }
  }
}

/**
 * Tracks the progress of a single active research.
 *
 * @property {number} duration - Total duration in seconds
 * @property {number} remainingSeconds - Seconds remaining until completion
 */
class Research {
  /**
   * @param {number} duration - Total duration in seconds
   * @param {number} [remainingSeconds] - Seconds remaining (defaults to duration)
   */
  constructor(duration, remainingSeconds = duration) {
    this.duration = duration // Total duration in seconds
    this.remainingSeconds = remainingSeconds // Seconds remaining until completion
  }

  /**
   * Advances the timer by the given delta.
   * @param {number} delta - Seconds elapsed
   * @returns {boolean} True if the research just completed
   */
  advance(delta) {
    this.remainingSeconds = Math.max(0, this.remainingSeconds - delta)
    return this.remainingSeconds === 0
  }
}

export default Academy
export {
  Research,
}
