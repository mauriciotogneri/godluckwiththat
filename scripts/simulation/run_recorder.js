// Run recorder for the balance simulation: watches one game step by step and keeps what the report needs.

import {colonyStats} from '@/js/engine/colony_stats.js'
import {CHALLENGE_MODAL_FAILURE, CHALLENGE_MODAL_REWARD, CHALLENGE_STATUS_STARTED, RAID_PHASE_INCOMING} from '@/js/engine/enums.js'
import {RESOLUTION_BLESSING} from './bots/bot.js'

// Game seconds at which a colony snapshot is kept (30, 60 and 90 minutes)
export const MILESTONE_SECONDS = [
  1800,
  3600,
  5400,
]

// Challenge attempt outcomes
export const RESULT_SUCCESS = 'success'
export const RESULT_FAILURE = 'failure'

/**
 * Records one simulated game: every challenge attempt (timings, requirements, colony stats when it
 * activates and when its countdown starts, how the engine scaled it to the colony as its countdown
 * started, when its requirements were first met, the result and the blessing chosen), raid outcomes,
 * time spent in a food or wood shortage, colony snapshots at the milestones, and the run length.
 * observe() runs after every simulation step; it only reads the state.
 */
class RunRecorder {
  constructor() {
    this.attempts = [] // Every challenge attempt, in order
    this.current = null // Attempt in progress (null between attempts)
    this.raids = {
      won: 0,
      lost: 0,
      paid: 0,
      delays: 0,
    } // Raid outcomes: battles won and lost, raids called off, delays bought
    this.milestones = {} // Colony stats keyed by milestone second
    this.shortageSeconds = 0 // Game seconds with production cut by a food or wood shortage
    this._lastTime = 0 // Game seconds at the previous step
    this._lastRaidReport = null // Raid report already counted
    this._lastRaidCount = 0 // Raids resolved or called off at the last step
    this._lastRaidDelays = 0 // Delays bought on the current raid at the last step
    this.result = null // Final result, set by finish()
  }

  /**
   * Reads the state after a simulation step.
   * @param {State} state - Game state
   * @param {number} time - Game seconds since the start
   */
  observe(state, time) {
    if (state.productivity < 1 && state.colony.resources.workers > 0) {
      this.shortageSeconds += time - this._lastTime
    }
    this._lastTime = time
    this._observeChallenge(state, time)
    this._observeRaids(state)
    for (const milestone of MILESTONE_SECONDS) {
      if (time >= milestone && !this.milestones[milestone]) {
        this.milestones[milestone] = colonyStats(state)
      }
    }
  }

  /**
   * Tracks the active challenge: a new attempt, its countdown start (with the scales, mood and
   * backstop flag the engine chose for it, from state.challengeScaling), when its requirements are
   * first met, and its result.
   * @param {State} state - Game state
   * @param {number} time - Game seconds since the start
   */
  _observeChallenge(state, time) {
    const active = state.meta.challenges.active
    const attempt = this.current

    // Result: the reward or failure window just opened
    if (attempt && !attempt.result && (state.challengeModal === CHALLENGE_MODAL_REWARD || state.challengeModal === CHALLENGE_MODAL_FAILURE)) {
      const success = state.challengeModal === CHALLENGE_MODAL_REWARD
      attempt.result = success ? RESULT_SUCCESS : RESULT_FAILURE
      attempt.endTime = time
      attempt.stillMetAtEnd = success
      // Met only on the last step (the requirements are spent by then, so observe never saw them met)
      if (success && attempt.firstMetSeconds === null) {
        attempt.firstMetSeconds = attempt.timeout
      }
      attempt.spareShare = attempt.firstMetSeconds === null ? null : 1 - attempt.firstMetSeconds / attempt.timeout
      this.current = null
      return
    }
    if (!active || state.challengeModal) {
      return
    }

    // New attempt: a freshly activated challenge, or the same one again after a failure
    if (!attempt) {
      const started = active.status === CHALLENGE_STATUS_STARTED
      const activationTime = started ? time - active.timeoutElapsed - active.delay : time - active.delayElapsed
      this.current = {
        index: active.index,
        attempt: this.attempts.filter(previous => previous.index === active.index).length + 1,
        activationTime: activationTime,
        delay: active.delay,
        countdownStartTime: null,
        timeout: active.timeout,
        requirements: JSON.parse(JSON.stringify(active.requirements)),
        statsAtActivation: colonyStats(state),
        statsAtCountdownStart: null,
        scales: null,
        mood: null,
        backstop: null,
        metAtStart: null,
        firstMetSeconds: null,
        stillMetAtEnd: null,
        spareShare: null,
        result: null,
        endTime: null,
        blessing: null,
      }
      this.attempts.push(this.current)
    }

    // Countdown running: note its start and the first time the requirements are met
    const current = this.current
    if (active.status === CHALLENGE_STATUS_STARTED) {
      const met = state.areChallengeRequirementsMet()
      if (current.countdownStartTime === null) {
        current.countdownStartTime = time - active.timeoutElapsed
        current.statsAtCountdownStart = colonyStats(state)
        // The engine decides the timer and requirements as the countdown starts
        current.timeout = active.timeout
        current.requirements = JSON.parse(JSON.stringify(active.requirements))
        // How the engine scaled this countdown (null for a challenge without a definition)
        const scaling = state.challengeScaling
        if (scaling) {
          current.scales = {
            ...scaling.scales,
          }
          current.mood = scaling.mood
          current.backstop = scaling.backstop
        }
        current.metAtStart = met
        if (met) {
          current.firstMetSeconds = 0
        }
      }
      if (met && current.firstMetSeconds === null) {
        current.firstMetSeconds = time - current.countdownStartTime
      }
    }
  }

  /**
   * Counts raid outcomes: a new raid report is a won or lost battle, a raid gone without a report
   * was called off, and delays bought on the announced raid.
   * @param {State} state - Game state
   */
  _observeRaids(state) {
    const {
      military,
    } = state.colony
    let reported = false
    if (state.raidReport && state.raidReport !== this._lastRaidReport) {
      this._lastRaidReport = state.raidReport
      reported = true
      if (state.raidReport.victory) {
        this.raids.won += 1
      } else {
        this.raids.lost += 1
      }
    }
    if (military.raidCount > this._lastRaidCount && !reported) {
      this.raids.paid += military.raidCount - this._lastRaidCount
    }
    this._lastRaidCount = military.raidCount
    const raid = military.raid
    if (raid?.phase === RAID_PHASE_INCOMING) {
      this.raids.delays += Math.max(0, raid.delaysPaid - this._lastRaidDelays)
      this._lastRaidDelays = raid.delaysPaid
    } else {
      this._lastRaidDelays = 0
    }
  }

  /**
   * Notes a blocking window the bot closed; a chosen blessing is kept on the attempt it rewards.
   * @param {Object} resolution - What the bot closed (from Bot.handleBlocking)
   */
  recordResolution(resolution) {
    if (resolution.kind !== RESOLUTION_BLESSING) {
      return
    }
    const rewarded = this.attempts.findLast(attempt => attempt.result === RESULT_SUCCESS)
    if (rewarded) {
      rewarded.blessing = {
        index: resolution.index,
        type: resolution.type,
      }
    }
  }

  /**
   * Ends the run and builds its result.
   * @param {State} state - Game state
   * @param {number} time - Game seconds since the start
   * @param {boolean} won - Whether the win screen was reached
   * @returns {Object} Run result
   */
  finish(state, time, won) {
    const active = state.meta.challenges.active
    this.result = {
      finished: won,
      runLength: won ? time : null,
      endTime: time,
      stuckAt: won ? null : active?.index ?? null,
      challengesCompleted: state.meta.challenges.completed.length,
      failures: this.attempts.filter(attempt => attempt.result === RESULT_FAILURE).length,
      attempts: this.attempts,
      raids: this.raids,
      shortageSeconds: this.shortageSeconds,
      milestones: this.milestones,
      endStats: colonyStats(state),
    }
    return this.result
  }
}

export default RunRecorder
