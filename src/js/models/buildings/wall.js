import {BUILDING_UPGRADES, WALL_HEALTH_PER_LEVEL} from '@/js/engine/balancing.js'
import {BUILDING_WALL} from '@/js/engine/enums.js'
import Building from '@/js/models/buildings/building.js'

/**
 * Defensive fortification. In a raid it absorbs damage before units take losses, and loses a level per full level of damage it absorbed.
 * Workers cannot be assigned to this building.
 */
class Wall extends Building {
  /**
   * @param {Object} data - Initial building data
   */
  constructor(data) {
    super(data)
  }

  /**
   * Damage absorbed in a raid before units take losses.
   * Formula: level × WALL_HEALTH_PER_LEVEL
   * @returns {number} Absorbed damage at the current level
   */
  get absorb() {
    return this.level * WALL_HEALTH_PER_LEVEL
  }

  /**
   * Cost to level up from the current level.
   * Formula: floor(baseCost * multiplier ^ level)
   * @returns {Cost} Resource cost for the next level
   */
  get levelUpCost() {
    const {
      cost, multiplier,
    } = BUILDING_UPGRADES[BUILDING_WALL]
    return cost.multiplyFloor(Math.pow(multiplier, this.level))
  }
}

export default Wall
