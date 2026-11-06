import EventFuture from '@/js/models/events/event_future.js'
import EventPast from '@/js/models/events/event_past.js'

/**
 * Container for all active game events.
 *
 * @property {EventFuture[]} future - Active future events (countdowns)
 * @property {EventPast[]} past - Active past events (notifications)
 * @property {number} _nextId - Auto-incrementing event ID counter
 */
class Events {
  /** Initializes empty event containers. */
  constructor() {
    this.future = [] // Active future events (countdowns)
    this.past = [] // Past events (notifications)
    this._nextId = 1 // Auto-incrementing event ID counter
  }

  /**
   * Adds a new future event with a countdown.
   * @param {Object} data - Future event data
   * @param {string} data.type - Event type constant
   * @param {string} data.textKey - i18n key
   * @param {string} data.icon - Full image path (e.g. '/img/resources/food.png')
   * @param {string[]} [data.params] - Positional i18n interpolation values
   * @param {string} [data.buildingKey] - Building key for construction lookup
   * @param {string} [data.researchKey] - Research key for research lookup
   * @param {string} [data.action] - Action identifier triggered on click
   * @param {number} data.remainingSeconds - Countdown duration
   * @returns {EventFuture} The created future event
   */
  addFuture(data) {
    const event = new EventFuture({
      id: this._nextId++,
      type: data.type,
      textKey: data.textKey,
      icon: data.icon,
      params: data.params,
      buildingKey: data.buildingKey,
      researchKey: data.researchKey,
      action: data.action,
      remainingSeconds: data.remainingSeconds,
    })
    this._binaryInsertFuture(event)
    return event
  }

  /**
   * Adds a new past event (no countdown).
   * @param {Object} data - Past event data
   * @param {string} data.type - Event type constant
   * @param {string} data.textKey - i18n key
   * @param {string} data.icon - Full image path (e.g. '/img/resources/food.png')
   * @param {string[]} [data.params] - Positional i18n interpolation values
   * @param {string} [data.buildingKey] - Building key for construction lookup
   * @param {string} [data.researchKey] - Research key for research lookup
   * @returns {EventPast} The created past event
   */
  addPast(data) {
    const event = new EventPast({
      id: this._nextId++,
      type: data.type,
      textKey: data.textKey,
      icon: data.icon,
      params: data.params,
      buildingKey: data.buildingKey,
      researchKey: data.researchKey,
    })
    this.past.unshift(event)
    return event
  }

  /**
   * Finds the future event for the given building key, removes it,
   * and adds a new past event with the provided data.
   * @param {string} buildingKey - Building key to match
   * @param {Object} data - Past event data (type, textKey, icon, params, buildingKey, researchKey)
   */
  convertToPast(buildingKey, data) {
    const index = this.future.findIndex(
      event => event.buildingKey === buildingKey,
    )
    if (index !== -1) {
      this.future.splice(index, 1)
    }
    this.addPast(data)
  }

  /**
   * Removes a future event by its type.
   * @param {string} type - Event type to match
   */
  dismissFutureByType(type) {
    const index = this.future.findIndex(
      event => event.type === type,
    )
    if (index !== -1) {
      this.future.splice(index, 1)
    }
  }

  /**
   * Removes a future event by its building key.
   * @param {string} buildingKey - Building key to match
   */
  dismissFutureByBuildingKey(buildingKey) {
    const index = this.future.findIndex(
      event => event.buildingKey === buildingKey,
    )
    if (index !== -1) {
      this.future.splice(index, 1)
    }
  }

  /**
   * Removes a future event by its research key.
   * @param {string} researchKey - Research key to match
   */
  dismissFutureByResearchKey(researchKey) {
    const index = this.future.findIndex(
      event => event.researchKey === researchKey,
    )
    if (index !== -1) {
      this.future.splice(index, 1)
    }
  }

  /**
   * Removes an event by its ID.
   * @param {number} id - Event ID to remove
   */
  dismiss(id) {
    // Search future events first, then past events
    let index = this.future.findIndex(event => event.id === id)
    if (index !== -1) {
      this.future.splice(index, 1)
      return
    }
    index = this.past.findIndex(event => event.id === id)
    if (index !== -1) {
      this.past.splice(index, 1)
    }
  }

  /**
   * Checks whether a past event with the given type exists.
   * @param {string} type - Event type constant
   * @returns {boolean} True if a past event of the given type exists
   */
  hasPastEvent(type) {
    return this.past.some(event => event.type === type)
  }

  /**
   * Removes all past events matching the given type.
   * @param {string} type - Event type constant
   */
  dismissPastByType(type) {
    this.past = this.past.filter(event => event.type !== type)
  }

  /**
   * Removes all past events matching the given text key.
   * @param {string} textKey - i18n key to match
   */
  dismissPastByTextKey(textKey) {
    this.past = this.past.filter(event => event.textKey !== textKey)
  }

  /**
   * Removes all past events.
   */
  dismissAllPast() {
    this.past = []
  }

  /**
   * Returns future events sorted by remaining seconds ascending.
   * Returns the internal array directly — callers must not mutate it.
   * @returns {EventFuture[]} Events sorted by remaining seconds ascending
   */
  get sortedFuture() {
    return this.future
  }

  /**
   * Returns past events sorted by ID descending (most recent first).
   * Returns the internal array directly — callers must not mutate it.
   * @returns {EventPast[]} Events sorted by ID descending (most recent first)
   */
  get sortedPast() {
    return this.past
  }

  /**
   * Inserts a future event at the correct sorted position (by remainingSeconds ascending).
   * @param {EventFuture} event - The event to insert
   */
  _binaryInsertFuture(event) {
    let lo = 0
    let hi = this.future.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (this.future[mid].remainingSeconds < event.remainingSeconds) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    this.future.splice(lo, 0, event)
  }

  /**
   * Sets the countdown of the future event with the given type and moves it to its sorted position.
   * Used for events whose timer can freeze or jump (e.g. a raid), so they follow their own timer.
   * No-op when no such event exists or the value is unchanged.
   * @param {string} type - Event type to match
   * @param {number} seconds - New remaining seconds
   */
  setFutureRemaining(type, seconds) {
    const index = this.future.findIndex(
      event => event.type === type,
    )
    if (index === -1 || this.future[index].remainingSeconds === seconds) {
      return
    }
    const [event] = this.future.splice(index, 1)
    event.remainingSeconds = seconds
    this._binaryInsertFuture(event)
  }

  /**
   * Sets the countdown of the future event for the given research and moves it to its sorted position.
   * Research rows follow their research's own timer, which stands still while the academy is at level 0.
   * No-op when no such event exists or the value is unchanged.
   * @param {string} researchKey - Research key to match
   * @param {number} seconds - New remaining seconds
   */
  setFutureRemainingByResearchKey(researchKey, seconds) {
    const index = this.future.findIndex(
      event => event.researchKey === researchKey,
    )
    if (index === -1 || this.future[index].remainingSeconds === seconds) {
      return
    }
    const [event] = this.future.splice(index, 1)
    event.remainingSeconds = seconds
    this._binaryInsertFuture(event)
  }

  /**
   * Decrements remaining seconds on future events.
   * Clamps at 0 — does not auto-convert to past.
   * @param {number} delta - Seconds elapsed since last tick
   */
  advance(delta) {
    for (const event of this.future) {
      event.advance(delta)
    }
  }

  /**
   * Reconstructs an Events instance from serialized data.
   * @param {Object} data - Serialized events data
   * @returns {Events} Restored Events instance
   */
  static fromJSON(data) {
    const events = new Events()
    events._nextId = data.nextId ?? 1
    for (const entry of (data.future ?? [])) {
      events.future.push(new EventFuture(entry))
    }
    for (const entry of (data.past ?? [])) {
      events.past.push(new EventPast(entry))
    }
    return events
  }

  /**
   * Serializable snapshot for save/load.
   * @returns {Object} Plain object snapshot for serialization
   */
  toJSON() {
    return {
      future: this.future.map(event => event.toJSON()),
      past: this.past.map(event => event.toJSON()),
      nextId: this._nextId,
    }
  }
}

export default Events
