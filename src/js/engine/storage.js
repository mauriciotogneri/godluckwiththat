// Thin localStorage wrapper for persisting user preferences and game state.
// Exposes getter/setter pairs for music, sound, autosave, tutorial, story intro, and trade amount, plus saved game read/write/delete.

import {STORAGE_AUTOSAVE_ENABLED, STORAGE_AUTOSAVE_INTERVAL, STORAGE_INTRO_SEEN, STORAGE_MUSIC_ENABLED, STORAGE_SAVED_GAME, STORAGE_SOUND_ENABLED, STORAGE_TRADE_AMOUNT, STORAGE_TUTORIAL_COMPLETED} from '@/js/engine/enums.js'
import {AUTOSAVE_DEFAULT_INTERVAL, AUTOSAVE_MAX_INTERVAL, AUTOSAVE_MIN_INTERVAL} from '@/js/engine/constants.js'
import {MARKET_TRADE_AMOUNT} from '@/js/engine/balancing.js'

/**
 * Thin wrapper around localStorage for persisting user preferences.
 * Music and sound default to enabled (true) and autosave to disabled when no value has been stored yet.
 */
class Storage {
  /** @returns {boolean} Whether music is enabled */
  get musicEnabled() {
    try {
      return window.localStorage.getItem(STORAGE_MUSIC_ENABLED) !== 'false'
    } catch {
      return true
    }
  }

  /** @param {boolean} value - Whether music should be enabled */
  set musicEnabled(value) {
    try {
      window.localStorage.setItem(STORAGE_MUSIC_ENABLED, value)
    } catch { /* Safari Private Browsing may throw QuotaExceededError */ }
  }

  /** @returns {boolean} Whether sound effects are enabled */
  get soundEnabled() {
    try {
      return window.localStorage.getItem(STORAGE_SOUND_ENABLED) !== 'false'
    } catch {
      return true
    }
  }

  /** @param {boolean} value - Whether sound effects should be enabled */
  set soundEnabled(value) {
    try {
      window.localStorage.setItem(STORAGE_SOUND_ENABLED, value)
    } catch { /* Safari Private Browsing may throw QuotaExceededError */ }
  }

  /** @returns {Object|null} Parsed saved game data, or null if none/corrupt */
  get savedGame() {
    try {
      const raw = window.localStorage.getItem(STORAGE_SAVED_GAME)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  /**
   * Persists the game state, reporting whether the write succeeded.
   * @param {Object} value - Game state data to persist
   * @returns {boolean} False if storage is blocked or full
   */
  writeSavedGame(value) {
    try {
      window.localStorage.setItem(STORAGE_SAVED_GAME, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  }

  /** @returns {boolean} Whether autosave is enabled */
  get autosaveEnabled() {
    try {
      return window.localStorage.getItem(STORAGE_AUTOSAVE_ENABLED) === 'true'
    } catch {
      return false
    }
  }

  /** @param {boolean} value - Whether autosave should be enabled */
  set autosaveEnabled(value) {
    try {
      window.localStorage.setItem(STORAGE_AUTOSAVE_ENABLED, value)
    } catch { /* quota exceeded */ }
  }

  /** @returns {number} Autosave interval in minutes, clamped to the allowed range */
  get autosaveInterval() {
    try {
      const raw = window.localStorage.getItem(STORAGE_AUTOSAVE_INTERVAL)
      const value = Number(raw)
      // Stored text can be hand-edited; a non-number would make autosave run almost constantly
      if (!raw || !Number.isFinite(value)) {
        return AUTOSAVE_DEFAULT_INTERVAL
      }
      return Math.min(AUTOSAVE_MAX_INTERVAL, Math.max(AUTOSAVE_MIN_INTERVAL, value))
    } catch {
      return AUTOSAVE_DEFAULT_INTERVAL
    }
  }

  /** @param {number} value - Autosave interval in minutes */
  set autosaveInterval(value) {
    try {
      window.localStorage.setItem(STORAGE_AUTOSAVE_INTERVAL, value)
    } catch { /* quota exceeded */ }
  }

  /** @returns {boolean} Whether the player has completed the tutorial in a previous game */
  get tutorialCompleted() {
    try {
      return window.localStorage.getItem(STORAGE_TUTORIAL_COMPLETED) === 'true'
    } catch {
      return false
    }
  }

  /** @param {boolean} value - Whether the tutorial has been completed */
  set tutorialCompleted(value) {
    try {
      window.localStorage.setItem(STORAGE_TUTORIAL_COMPLETED, value)
    } catch { /* quota exceeded */ }
  }

  /** @returns {boolean} Whether the player has already seen the story intro on this device */
  get introSeen() {
    try {
      return window.localStorage.getItem(STORAGE_INTRO_SEEN) === 'true'
    } catch {
      return false
    }
  }

  /** @param {boolean} value - Whether the story intro has been seen */
  set introSeen(value) {
    try {
      window.localStorage.setItem(STORAGE_INTRO_SEEN, value)
    } catch { /* quota exceeded */ }
  }

  /** @returns {number} Last selected trade amount */
  get tradeAmount() {
    try {
      const raw = window.localStorage.getItem(STORAGE_TRADE_AMOUNT)
      return raw ? Number(raw) : MARKET_TRADE_AMOUNT
    } catch {
      return MARKET_TRADE_AMOUNT
    }
  }

  /** @param {number} value - Trade amount to persist */
  set tradeAmount(value) {
    try {
      window.localStorage.setItem(STORAGE_TRADE_AMOUNT, value)
    } catch { /* quota exceeded */ }
  }

  /** Removes the saved game from localStorage. */
  deleteSavedGame() {
    try {
      window.localStorage.removeItem(STORAGE_SAVED_GAME)
    } catch { /* ignore */ }
  }
}

export default new Storage()
