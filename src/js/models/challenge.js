import {CHALLENGE_STATUS_ACTIVATED, CHALLENGE_STATUS_PENDING, CHALLENGE_STATUS_STARTED} from '@/js/engine/enums.js'
import Blessing from '@/js/models/blessing.js'
import Punishment from '@/js/models/punishment.js'

/**
 * A single divine challenge with requirements, timer state, and rewards/penalties.
 * The gods send sequential challenges to test the colony's worthiness.
 * Delay, timeout, requirements, blessings and punishment are the values in effect;
 * the base values from challenges.json stay in `base`.
 *
 * @property {number} index - Challenge number (starting from 1)
 * @property {string} status - Lifecycle state (pending, activated, started, completed)
 * @property {number} delay - Seconds from activation until the player is informed
 * @property {number} delayElapsed - Seconds elapsed since activation
 * @property {number} timeout - Seconds to complete the challenge once started
 * @property {number} timeoutElapsed - Seconds elapsed since started
 * @property {Object} requirements - Challenge requirements (faith, altar, temple, monument, resources, workers)
 * @property {Blessing[]} blessings - Available blessing reward choices
 * @property {Punishment} punishment - Punishment applied on failure
 * @property {Object|null} base - Frozen definition from challenges.json (never saved; null when built without one)
 * @property {number} failures - Times this challenge has been failed
 * @property {string|null} mood - Mood of the gods for the current attempt (null until decided)
 */
class Challenge {
  /**
   * @param {Object} data - Challenge data
   */
  constructor(data) {
    this.index = data.index // Challenge number (starting from 1)
    this.status = data.status // Lifecycle state
    this.delay = data.delay // Seconds from activation until player is informed
    this.delayElapsed = data.delayElapsed ?? 0 // Seconds elapsed since activation
    this.timeout = data.timeout // Seconds to complete once started
    this.timeoutElapsed = data.timeoutElapsed ?? 0 // Seconds elapsed since started
    this.requirements = data.requirements // Requirements object
    this.blessings = data.blessings // Array of Blessing choices
    this.punishment = data.punishment // Punishment on failure
    this.base = data.base ?? null // Frozen definition from challenges.json (never saved)
    this.failures = data.failures ?? 0 // Times this challenge has been failed
    this.mood = data.mood ?? null // Mood of the gods for the current attempt
  }

  /**
   * Whether the activation delay has fully elapsed and the challenge is ready to start.
   * @returns {boolean}
   */
  get isDelayElapsed() {
    return this.status === CHALLENGE_STATUS_ACTIVATED
      && this.delayElapsed >= this.delay
  }

  /**
   * Whether the challenge timeout has fully elapsed and is ready for resolution.
   * @returns {boolean}
   */
  get isTimeoutElapsed() {
    return this.status === CHALLENGE_STATUS_STARTED
      && this.timeoutElapsed >= this.timeout
  }

  /**
   * Resets timer state and sets status back to activated (for retrying after failure).
   * The failure count is kept.
   */
  reset() {
    this.delayElapsed = 0
    this.timeoutElapsed = 0
    this.status = CHALLENGE_STATUS_ACTIVATED
  }

  /**
   * Creates a pending challenge from its definition.
   * The base values are deep-copied into new objects, so changing the challenge never changes the definition.
   * @param {Object} definition - Frozen definition from CHALLENGE_DEFINITIONS
   * @returns {Challenge} New pending challenge
   */
  static fromDefinition(definition) {
    return new Challenge({
      index: definition.index,
      status: CHALLENGE_STATUS_PENDING,
      delay: definition.delay,
      timeout: definition.timeout,
      requirements: {
        ...definition.requirements,
        resources: definition.requirements.resources ? {
          ...definition.requirements.resources,
        } : null,
      },
      blessings: definition.blessings.map(blessing => new Blessing({
        ...blessing,
        resources: blessing.resources ? {
          ...blessing.resources,
        } : null,
      })),
      punishment: new Punishment(definition.punishment),
      base: definition,
    })
  }

  /**
   * Reconstructs a Challenge instance from serialized data.
   * Values the save leaves out (all but progress, unless the countdown had started or a retry is waiting) come from the definition.
   * @param {Object} data - Serialized challenge data
   * @param {Object|null} [definition] - Frozen definition with the same index (null keeps `base` empty)
   * @returns {Challenge} Restored Challenge instance
   */
  static fromJSON(data, definition = null) {
    const fromBase = definition ? Challenge.fromDefinition(definition) : null
    return new Challenge({
      index: data.index,
      status: data.status,
      delay: data.delay ?? fromBase.delay,
      delayElapsed: data.delayElapsed,
      timeout: data.timeout ?? fromBase.timeout,
      timeoutElapsed: data.timeoutElapsed,
      requirements: data.requirements ?? fromBase.requirements,
      blessings: data.blessings ? data.blessings.map(blessing => Blessing.fromJSON(blessing)) : fromBase.blessings,
      punishment: data.punishment ? Punishment.fromJSON(data.punishment) : fromBase.punishment,
      base: definition,
      failures: data.failures,
      mood: data.mood,
    })
  }

  /**
   * Serializable snapshot for save/load.
   * Saves only progress; the values in effect are added while the countdown runs, since the base
   * values cannot rebuild them, and the requirements while a failed challenge waits for its retry.
   * @returns {Object} Plain object snapshot for serialization
   */
  toJSON() {
    const progress = {
      index: this.index,
      status: this.status,
      delay: this.delay,
      delayElapsed: this.delayElapsed,
      timeoutElapsed: this.timeoutElapsed,
      failures: this.failures,
      mood: this.mood,
    }
    // A retry is capped at the failed attempt's requirements, so they are kept until its countdown starts
    if (this.status === CHALLENGE_STATUS_ACTIVATED && this.failures > 0) {
      return {
        ...progress,
        requirements: this.requirements,
      }
    }
    if (this.status !== CHALLENGE_STATUS_STARTED) {
      return progress
    }
    return {
      ...progress,
      timeout: this.timeout,
      requirements: this.requirements,
      blessings: this.blessings.map(blessing => blessing.toJSON()),
      punishment: this.punishment.toJSON(),
    }
  }
}

export default Challenge
