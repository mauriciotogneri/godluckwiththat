import {GAME_SPEED_DEFAULT} from '@/js/engine/constants.js'
import Challenges from '@/js/models/challenges.js'
import Tutorial from '@/js/models/tutorial.js'

/**
 * Game metadata. Tracks save version, timestamps,
 * challenge state, and tutorial progress.
 *
 * @property {number} version - Save format version
 * @property {string} createdDateTime - When the game was created (ISO string)
 * @property {string} updatedDateTime - When the game was last updated (ISO string)
 * @property {Challenges} challenges - Challenge system state
 * @property {number} gameSpeed - Game speed multiplier (1, 2, or 3)
 * @property {Tutorial} tutorial - Tutorial progress
 */
class Meta {
  /**
   * @param {Object} data - Meta data
   */
  constructor(data) {
    this.version = data.version // Save format version
    this.createdDateTime = data.createdDateTime // When the game was created
    this.updatedDateTime = data.updatedDateTime // When the game was last updated
    this.challenges = data.challenges // Challenge system state
    this.gameSpeed = data.gameSpeed ?? GAME_SPEED_DEFAULT // Game speed multiplier
    this.tutorial = data.tutorial // Tutorial progress
  }
  /**
   * Reconstructs a Meta instance from serialized data.
   * @param {Object} data - Serialized meta data
   * @param {Object[]} [definitions] - Frozen challenge definitions, passed to Challenges.fromJSON
   * @returns {Meta} Restored Meta instance
   */
  static fromJSON(data, definitions = []) {
    return new Meta({
      version: data.version,
      createdDateTime: data.createdDateTime,
      updatedDateTime: data.updatedDateTime,
      challenges: Challenges.fromJSON(data.challenges, definitions),
      gameSpeed: data.gameSpeed ?? GAME_SPEED_DEFAULT,
      tutorial: new Tutorial(data.tutorial),
    })
  }

  /**
   * Serializable snapshot for save/load.
   * @returns {Object} Plain object snapshot for serialization
   */
  toJSON() {
    return {
      version: this.version,
      createdDateTime: this.createdDateTime,
      updatedDateTime: new Date().toISOString(),
      challenges: this.challenges.toJSON(),
      gameSpeed: this.gameSpeed,
      tutorial: this.tutorial.toJSON(),
    }
  }
}

export default Meta
