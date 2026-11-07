// Singleton analytics manager — Firebase Analytics initialization and event logging.

import {initializeApp} from 'firebase/app'
import {getAnalytics, isSupported, logEvent} from 'firebase/analytics'
import {FIREBASE_CONFIG, LOCAL_HOSTNAMES} from '@/js/engine/constants.js'
import {ANALYTICS_EVENT_GAME_START, ANALYTICS_EVENT_TUTORIAL_COMPLETE} from '@/js/engine/enums.js'

/**
 * Sends gameplay events to Firebase Analytics.
 * Stays disabled on local hostnames, in unsupported browsers, and when blocked by the browser.
 */
class Analytics {
  /** Starts disabled until init() resolves a Firebase Analytics instance. */
  constructor() {
    this._ready = Promise.resolve(null) // Resolves to the Analytics instance, or null when disabled
  }

  /** Initializes Firebase Analytics unless the app runs on a local hostname or the browser lacks support. */
  init() {
    if (LOCAL_HOSTNAMES.includes(window.location.hostname)) {
      return
    }
    this._ready = isSupported()
      .then((supported) => (supported ? getAnalytics(initializeApp(FIREBASE_CONFIG)) : null))
      .catch(() => null) // Ad blockers and privacy settings can make initialization fail
  }

  /**
   * Logs the start of a game session.
   * @param {string} mode - ANALYTICS_GAME_MODE_NEW or ANALYTICS_GAME_MODE_SAVED
   */
  logGameStart(mode) {
    this._log(ANALYTICS_EVENT_GAME_START, {
      mode: mode,
    })
  }

  /** Logs that the player finished the tutorial. */
  logTutorialComplete() {
    this._log(ANALYTICS_EVENT_TUTORIAL_COMPLETE)
  }

  /**
   * Sends an event once initialization settles, so events fired early are not lost.
   * @param {string} name - Event name
   * @param {Object} [params] - Event parameters
   */
  _log(name, params) {
    this._ready
      .then((analytics) => {
        if (analytics) {
          logEvent(analytics, name, params)
        }
      })
      .catch(() => { /* Analytics must never break the game */ })
  }
}

export default new Analytics()
