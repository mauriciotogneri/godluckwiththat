import {CHALLENGE_STATUS_ACTIVATED, CHALLENGE_STATUS_COMPLETED, CHALLENGE_STATUS_STARTED} from '@/js/engine/enums.js'
import Blessing from '@/js/models/blessing.js'
import Challenge from '@/js/models/challenge.js'
import Punishment from '@/js/models/punishment.js'

/**
 * Container for the challenge system state.
 * Lives on Meta. Tracks pending, active, and completed challenges
 * plus the timed blessings and punishments currently in effect.
 *
 * @property {Challenge[]} pending - Challenges not yet activated
 * @property {Challenge|null} active - Currently active challenge (or null)
 * @property {Challenge[]} completed - Successfully completed challenges
 * @property {Blessing[]} activeBlessings - Timed blessings currently in effect
 * @property {Punishment[]} activePunishments - Timed punishments currently in effect
 */
class Challenges {
  /**
   * @param {Object} data - Challenges container data
   */
  constructor(data) {
    this.pending = data.pending // Challenges not yet activated
    this.active = data.active // Currently active challenge (or null)
    this.completed = data.completed // Successfully completed challenges
    this.activeBlessings = data.activeBlessings // Timed blessings currently in effect
    this.activePunishments = data.activePunishments // Timed punishments currently in effect
  }
  /** @returns {number} Total number of challenges across all states */
  get totalCount() {
    return this.pending.length + (this.active ? 1 : 0) + this.completed.length
  }

  /** @returns {boolean} Whether all challenges have been completed */
  get allCompleted() {
    return this.pending.length === 0 && this.active === null
  }

  /**
   * Moves the first pending challenge to active with status `activated`.
   */
  activate() {
    if (this.pending.length === 0) {
      return
    }
    this.active = this.pending.shift()
    this.active.status = CHALLENGE_STATUS_ACTIVATED
  }

  /**
   * Transitions the active challenge from `activated` to `started`.
   */
  start() {
    if (!this.active) {
      return
    }
    this.active.status = CHALLENGE_STATUS_STARTED
  }

  /**
   * Completes the active challenge: moves it to completed, stores a copy of the chosen blessing.
   * A copy is stored so the timeout countdown does not drain the challenge's own blessing.
   * A blessing of the same type already in effect is replaced, so its duration restarts instead of stacking.
   * Instant blessings (null timeout) are not stored: their effect is applied once and never expires.
   * @param {Blessing} blessing - The blessing the player chose as reward
   */
  complete(blessing) {
    if (!this.active) {
      return
    }
    this.active.status = CHALLENGE_STATUS_COMPLETED
    this.completed.push(this.active)
    if (blessing.timeout !== null) {
      this._removeEffectsOfType(this.activeBlessings, blessing.type)
      this.activeBlessings.push(Blessing.fromJSON(blessing.toJSON()))
    }
    this.active = null
  }

  /**
   * Fails the active challenge: resets timers, counts the failure, stores a copy of the punishment.
   * A copy is stored so the timeout countdown does not drain the challenge's own punishment,
   * which the next countdown replaces with one decided from the colony (a challenge built without
   * a definition keeps it).
   * A punishment of the same type already in effect is replaced, so its duration restarts instead of stacking.
   * Instant punishments (null timeout) are not stored: their effect is applied once and never expires.
   * @param {Punishment} punishment - The punishment applied
   */
  fail(punishment) {
    if (!this.active) {
      return
    }
    this.active.reset()
    this.active.failures += 1
    if (punishment.timeout !== null) {
      this._removeEffectsOfType(this.activePunishments, punishment.type)
      this.activePunishments.push(Punishment.fromJSON(punishment.toJSON()))
    }
  }

  /**
   * Removes every effect of the given type from the array, in place.
   * @param {Array} effects - Array of Blessing or Punishment instances
   * @param {string} type - Blessing or punishment type to remove
   */
  _removeEffectsOfType(effects, type) {
    for (let i = effects.length - 1; i >= 0; i--) {
      if (effects[i].type === type) {
        effects.splice(i, 1)
      }
    }
  }

  /**
   * Advances the active challenge timers by the elapsed delta.
   * @param {number} delta - Seconds since last tick
   */
  advance(delta) {
    if (!this.active) {
      return
    }
    if (this.active.status === CHALLENGE_STATUS_ACTIVATED) {
      this.active.delayElapsed += delta
    } else if (this.active.status === CHALLENGE_STATUS_STARTED) {
      this.active.timeoutElapsed += delta
    }
  }

  /**
   * Reconstructs a Challenges instance from serialized data.
   * Completed and pending challenges are rebuilt from the definitions (saves keep only completed indexes);
   * completed indexes without a definition are ignored. An active challenge without a definition
   * needs its full values in the save (a started one has them), otherwise restoring it throws.
   * Drops instant blessings/punishments (null timeout) that older saves stored and never removed.
   * @param {Object} data - Serialized challenges data
   * @param {Object[]} [definitions] - Frozen challenge definitions (CHALLENGE_DEFINITIONS)
   * @returns {Challenges} Restored Challenges instance
   */
  static fromJSON(data, definitions = []) {
    const active = data.active
      ? Challenge.fromJSON(data.active, definitions.find(definition => definition.index === data.active.index) ?? null)
      : null
    const completedIndexes = new Set(data.completed ?? [])
    const completed = definitions
      .filter(definition => completedIndexes.has(definition.index))
      .map(definition => {
        const challenge = Challenge.fromDefinition(definition)
        challenge.status = CHALLENGE_STATUS_COMPLETED
        return challenge
      })
    const pending = definitions
      .filter(definition => !completedIndexes.has(definition.index) && definition.index !== active?.index)
      .map(definition => Challenge.fromDefinition(definition))
    return new Challenges({
      pending: pending,
      active: active,
      completed: completed,
      activeBlessings: (data.activeBlessings ?? []).map(blessing => Blessing.fromJSON(blessing)).filter(blessing => blessing.timeout !== null),
      activePunishments: (data.activePunishments ?? []).map(punishment => Punishment.fromJSON(punishment)).filter(punishment => punishment.timeout !== null),
    })
  }

  /**
   * Serializable snapshot for save/load.
   * Pending challenges are not saved and completed ones only by index: both come back from the definitions.
   * @returns {Object} Plain object snapshot for serialization
   */
  toJSON() {
    return {
      active: this.active ? this.active.toJSON() : null,
      completed: this.completed.map(challenge => challenge.index),
      activeBlessings: this.activeBlessings.map(blessing => blessing.toJSON()),
      activePunishments: this.activePunishments.map(punishment => punishment.toJSON()),
    }
  }
}

export default Challenges
