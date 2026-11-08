import {unitCounts} from '@/js/engine/utils.js'

/**
 * Outcome of a resolved raid, shown in the raid result window.
 * Losses are recorded as applied, so the report lists what was actually lost.
 *
 * @property {boolean} victory - Whether the raid was repelled
 * @property {Object<string, number>} army - Colony unit count per type before the battle
 * @property {Object<string, number>} enemy - Raider count per type
 * @property {Object<string, number>} unitsLost - Colony units lost per type
 * @property {Object<string, number>} resourcesLost - Amount lost per resource (defeat only)
 * @property {number} workersLost - Workers lost (defeat only)
 * @property {string[]} buildingsLost - Building key per level lost (the wall and the tower also after a victory)
 */
class RaidReport {
  /**
   * @param {Object} data - Report data (missing fields get defaults)
   */
  constructor(data) {
    this.victory = data.victory ?? false // Whether the raid was repelled
    this.army = unitCounts(data.army) // Colony units before the battle
    this.enemy = unitCounts(data.enemy) // Raiders per type
    this.unitsLost = unitCounts(data.unitsLost) // Colony units lost per type
    this.resourcesLost = {
      ...data.resourcesLost,
    } // Amount lost per resource
    this.workersLost = data.workersLost ?? 0 // Workers lost
    this.buildingsLost = [...(data.buildingsLost ?? [])] // Building key per level lost
  }

  /**
   * Reconstructs a RaidReport instance from serialized data.
   * @param {Object} data - Serialized report data
   * @returns {RaidReport} Restored RaidReport instance
   */
  static fromJSON(data) {
    return new RaidReport(data)
  }

  /**
   * Serializable snapshot for save/load.
   * @returns {Object} Plain object snapshot for serialization
   */
  toJSON() {
    return {
      victory: this.victory,
      army: {
        ...this.army,
      },
      enemy: {
        ...this.enemy,
      },
      unitsLost: {
        ...this.unitsLost,
      },
      resourcesLost: {
        ...this.resourcesLost,
      },
      workersLost: this.workersLost,
      buildingsLost: [...this.buildingsLost],
    }
  }
}

export default RaidReport
