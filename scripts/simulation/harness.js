// Simulation harness: plays one full game headlessly with a bot, mirroring the game screen's loop.

import {createInitialColonyBasic, createInitialMeta} from '@/js/engine/constants.js'
import {CHALLENGE_MODAL_WIN} from '@/js/engine/enums.js'
import State from '@/js/engine/state.js'
import Bot from './bots/bot.js'
import RunRecorder from './run_recorder.js'
import {createSeededRandom} from './seeded_random.js'

const BOT_SEED_OFFSET = 1000003 // The bot's random stream uses seed + this, apart from the engine's
const MAX_BLOCKING_RESOLUTIONS = 20 // Blocking windows closed in a row before the run counts as stuck
const PAST_EVENTS_CLEAR_INTERVAL = 600 // Game seconds between clearing the past events (the list only grows)

/**
 * Plays one game from the Camp start until the win screen or the time cap.
 * Each step mirrors the game screen's catch-up loop: production (update), the tutorial check,
 * then progress (season, construction, research, challenges, events, raids). While the game is
 * paused the bot closes the blocking window (tutorial, challenge result, raid result) without game
 * time passing; between steps it decides every profile.decisionInterval seconds.
 * Math.random is replaced by a seeded stream for the run and restored afterwards.
 * @param {Object} options - Run options
 * @param {Object} options.profile - Bot profile
 * @param {number} options.seed - Seed of the run
 * @param {number} options.maxSeconds - Game seconds before the run ends unfinished
 * @param {number} options.step - Game seconds per simulation step
 * @param {boolean} [options.scaling=true] - Whether the engine scales the challenges (false keeps the fixed values of challenges.json)
 * @returns {Object} Run result (RunRecorder.finish)
 */
export function runGame({
  profile, seed, maxSeconds, step, scaling = true,
}) {
  const originalRandom = Math.random
  Math.random = createSeededRandom(seed)
  try {
    // Always the Camp start, whatever createInitialColony currently returns
    const state = new State(createInitialMeta(), createInitialColonyBasic())
    if (!scaling) {
      // The engine leaves a challenge without its definition at its fixed values
      for (const challenge of state.meta.challenges.pending) {
        challenge.base = null
      }
    }
    state.update(0)
    const bot = new Bot(profile, createSeededRandom(seed + BOT_SEED_OFFSET))
    const recorder = new RunRecorder()
    let time = 0
    let nextDecision = 0
    let nextClear = PAST_EVENTS_CLEAR_INTERVAL

    while (time < maxSeconds) {
      if (closeBlockingWindows(state, bot, recorder, `${time}s (seed ${seed}, ${profile.name} bot)`)) {
        return recorder.finish(state, time, true)
      }
      if (time >= nextDecision) {
        bot.act(state)
        nextDecision += profile.decisionInterval
        // An action can open a window (e.g. a tutorial popup); the game stops its loops while paused
        if (state.paused) {
          continue
        }
      }
      state.update(step)
      state.checkTutorial()
      state.advanceProgress(step)
      time += step
      recorder.observe(state, time)
      if (time >= nextClear) {
        state.colony.events.dismissAllPast()
        nextClear += PAST_EVENTS_CLEAR_INTERVAL
      }
    }
    // A challenge may resolve on the last step: close its window so a win at the cap still counts
    const won = closeBlockingWindows(state, bot, recorder, `${time}s (seed ${seed}, ${profile.name} bot)`)
    return recorder.finish(state, time, won)
  } finally {
    Math.random = originalRandom
  }
}

/**
 * Closes blocking windows (tutorial, challenge result, raid result) while the game is paused,
 * without game time passing. Stops at the win screen.
 * @param {State} state - Game state
 * @param {Bot} bot - Bot closing the windows
 * @param {RunRecorder} recorder - Recorder of the closed windows
 * @param {string} where - Run position for the stuck error message
 * @returns {boolean} Whether the win screen is showing
 */
function closeBlockingWindows(state, bot, recorder, where) {
  let resolutions = 0
  while (state.paused) {
    if (state.challengeModal === CHALLENGE_MODAL_WIN) {
      return true
    }
    const resolution = bot.handleBlocking(state)
    resolutions += 1
    if (!resolution || resolutions > MAX_BLOCKING_RESOLUTIONS) {
      throw new Error(`Run stuck while paused at ${where}`)
    }
    recorder.recordResolution(resolution)
  }
  return false
}
