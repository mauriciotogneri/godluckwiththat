// Heuristic player for the balance simulation, driven by a profile (bot_profiles.js).

import {BUILDING_STOREHOUSE, CHALLENGE_MODAL_FAILURE, CHALLENGE_MODAL_REWARD, RESOURCE_FOOD, RESOURCE_GOLD} from '@/js/engine/enums.js'
import {challengeFocus, challengeItems, challengeRates, challengeReserve, chooseBlessing} from './challenge_planner.js'
import {addAmounts, applyWorkerTargets, buildingItem, dismissIdleWhenShort, emptyAmounts, exceedsCap, fitsReserve, foodWoodItems, growthItems, planWorkers, populationItems, producerCapacity, recruitFoodNeed, recruitWorkers, researchItems, storageCapOf, storehouseItems, territoryItems, tradeAtMarket} from './economy_planner.js'
import {militaryItems, respondToRaid} from './military_planner.js'

const SAVED_ITEMS = 3 // Unaffordable items whose costs steer the worker split
const GOAL_HOLD_SECONDS = 60 // The first of them is held back from cheaper wishes once the income covers it this soon
const RECOVERY_SHARE = 0.7 // A challenge item may use held amounts the income earns back within this share of the time left

// Blocking windows the bot closes (reported to the run recorder)
export const RESOLUTION_TUTORIAL = 'tutorial'
export const RESOLUTION_BLESSING = 'blessing'
export const RESOLUTION_PUNISHMENT = 'punishment'
export const RESOLUTION_RAID = 'raid'

/**
 * Heuristic player for the balance simulation. Plays only through public State actions and reads
 * the state the way the screen shows it (including the raid forecast). It respects the headquarters
 * building unlocks and the hidden research category itself, since the engine does not check them.
 *
 * Each decision: recruit and split workers (dismissing idle ones while food or wood runs at a loss),
 * answer an announced raid, then walk a wish list in priority order — (1) food/wood, (2) the running
 * challenge, (3) population, (4) storage, (5) territory and headquarters tier, (6) economy,
 * (7) research, (8) military — starting what it can pay for and saving for what it cannot yet.
 * A wish item is {label, cost, save, urgent?, challenge?, ignoresHold?, run}; run() starts it and returns whether it did.
 */
class Bot {
  /**
   * @param {Object} profile - Skill settings (bot_profiles.js)
   * @param {function(): number} random - The bot's own random stream (separate from the engine's)
   */
  constructor(profile, random) {
    this.profile = profile // Skill settings
    this.random = random // Random stream for skipped decisions
    this.goal = emptyAmounts() // Resources the bot was saving for at its last decision (steers the worker split)
  }

  /**
   * Closes one blocking window while the game is paused: a tutorial popup, the challenge reward
   * (choosing a blessing) or failure window, or the raid result. No game time passes.
   * @param {State} state - Game state
   * @returns {Object|null} What was closed ({kind, ...}), or null when nothing could be closed
   */
  handleBlocking(state) {
    if (state.meta.tutorial.activeModal) {
      state.dismissTutorialModal()
      return {
        kind: RESOLUTION_TUTORIAL,
      }
    }
    if (state.challengeModal === CHALLENGE_MODAL_REWARD) {
      const challenge = state.meta.challenges.active
      const index = chooseBlessing(state, this.profile, challenge)
      const type = challenge.blessings[index].type
      state.selectBlessing(index)
      return {
        kind: RESOLUTION_BLESSING,
        index: index,
        type: type,
      }
    }
    if (state.challengeModal === CHALLENGE_MODAL_FAILURE) {
      state.acknowledgePunishment()
      return {
        kind: RESOLUTION_PUNISHMENT,
      }
    }
    if (state.raidReport) {
      state.acknowledgeRaid()
      return {
        kind: RESOLUTION_RAID,
      }
    }
    return null
  }

  /**
   * Makes one decision (the harness calls it every profile.decisionInterval game seconds).
   * @param {State} state - Game state
   */
  act(state) {
    const {
      profile,
    } = this
    if (profile.skipChance > 0 && this.random() < profile.skipChance) {
      return
    }
    const focus = challengeFocus(state, profile)
    const reserve = focus ? challengeReserve(state, focus, profile.challengeHold) : emptyAmounts()
    const rates = focus ? challengeRates(state, focus) : {}

    recruitWorkers(state, reserve, Math.max(producerCapacity(state), focus?.requirements.workers ?? 0))
    const workerPlan = planWorkers(state, profile, rates, this._shortfall(state, reserve))
    applyWorkerTargets(state, workerPlan.targets)
    dismissIdleWhenShort(state)
    respondToRaid(state, profile, reserve)

    const items = [
      ...foodWoodItems(state, workerPlan),
      ...(focus ? challengeItems(state, focus, rates) : []),
      ...populationItems(state, profile, workerPlan),
      ...storehouseItems(state, profile),
      ...territoryItems(state, profile),
      ...growthItems(state, profile),
      ...researchItems(state, profile),
      ...militaryItems(state, profile),
    ]
    this.goal = this._spend(state, items, reserve, focus?.timeLeft ?? 0)
    // The market pays in gold: never below the gold the running challenge asks for, even out of reach
    const marketReserve = {
      ...reserve,
      [RESOURCE_GOLD]: Math.max(reserve[RESOURCE_GOLD] ?? 0, focus?.requirements.resources?.[RESOURCE_GOLD] ?? 0),
    }
    tradeAtMarket(state, profile, this._shortfall(state, reserve), marketReserve)
  }

  /**
   * Amount still missing, per resource, for the saved-for goal and the next recruits on top of the held reserve.
   * @param {State} state - Game state
   * @param {Object<string, number>} reserve - Held amounts
   * @returns {Object<string, number>} Missing amount by resource (0 when covered)
   */
  _shortfall(state, reserve) {
    const needed = addAmounts(addAmounts(emptyAmounts(), this.goal), reserve)
    needed[RESOURCE_FOOD] += recruitFoodNeed(state)
    const shortfall = {}
    for (const [
      resource,
      amount,
    ] of Object.entries(needed)) {
      shortfall[resource] = Math.max(0, amount - state.colony.resources[resource])
    }
    return shortfall
  }

  /**
   * Walks the wish list in order, starting every item it can pay for (up to the profile's budget per
   * decision) without touching the held amounts: the challenge hold, the cost of the first challenge
   * item it cannot pay for yet while the income covers it before the countdown ends, plus the cost of
   * the first unaffordable item marked to save for (the goal) once the income covers it within
   * GOAL_HOLD_SECONDS. Urgent items (headquarters tier upgrades, the challenge's items) only respect the
   * challenge hold and the saved-for challenge item; the challenge's own buildings may also use the held
   * amounts the income earns back within RECOVERY_SHARE of the time left.
   * An item whose cost cannot fit in storage is replaced by a storehouse level, and items needing a
   * resource the colony does not produce are not saved for.
   * @param {State} state - Game state
   * @param {Array<Object|null>} items - Wish items in priority order (null entries are skipped)
   * @param {Object<string, number>} reserve - Challenge hold
   * @param {number} challengeTimeLeft - Seconds left on the countdown the bot works on (0 without one)
   * @returns {Object<string, number>} Summed cost of the first unaffordable items to save for (drives the worker split)
   */
  _spend(state, items, reserve, challengeTimeLeft) {
    const cap = storageCapOf(state)
    const held = addAmounts(emptyAmounts(), reserve)
    const urgentHeld = addAmounts(emptyAmounts(), reserve)
    const wanted = emptyAmounts()
    let saved = 0
    let spends = 0
    let challengeSaved = false
    for (const wish of items) {
      if (spends >= this.profile.spendsPerDecision) {
        break
      }
      const item = wish && exceedsCap(wish.cost, cap) ? buildingItem(state, BUILDING_STOREHOUSE, true, 'fit') : wish
      if (!item || exceedsCap(item.cost, cap)) {
        continue
      }
      const fits = item.ignoresHold ? this._fitsRecoverably(state, item.cost, urgentHeld, challengeTimeLeft) : fitsReserve(state, item.cost, item.urgent ? urgentHeld : held)
      if (fits) {
        if (item.run()) {
          spends += 1
        }
      } else if (item.save && saved < SAVED_ITEMS && this._canProgress(state, item.cost)) {
        if (item.challenge && !challengeSaved && this._secondsToAfford(state, item.cost, held) <= challengeTimeLeft) {
          // The countdown cannot wait: its item is saved for even against urgent wishes
          addAmounts(held, item.cost)
          addAmounts(urgentHeld, item.cost)
          challengeSaved = true
        } else if (saved === 0 && this._secondsToAfford(state, item.cost, held) <= GOAL_HOLD_SECONDS) {
          addAmounts(held, item.cost)
        }
        addAmounts(wanted, item.cost)
        saved += 1
      }
    }
    return wanted
  }

  /**
   * Whether a cost can be paid now, with every held amount it dips into earned back by the income
   * within RECOVERY_SHARE of the time left.
   * @param {State} state - Game state
   * @param {Cost} cost - Cost to pay
   * @param {Object<string, number>} reserve - Held amounts (the challenge hold and the saved-for challenge item)
   * @param {number} timeLeft - Seconds left on the countdown
   * @returns {boolean} True when it can be paid and the hold restored in time
   */
  _fitsRecoverably(state, cost, reserve, timeLeft) {
    for (const [
      resource,
      amount,
    ] of cost.entries) {
      const left = state.colony.resources[resource] - amount
      const missing = (reserve[resource] ?? 0) - left
      if (left < 0 || (missing > 0 && missing > Math.max(0, state.netProduction(resource)) * timeLeft * RECOVERY_SHARE)) {
        return false
      }
    }
    return true
  }

  /**
   * Seconds of net income until a cost fits on top of the held amounts.
   * @param {State} state - Game state
   * @param {Cost} cost - Cost to pay
   * @param {Object<string, number>} held - Amounts already held
   * @returns {number} Seconds (Infinity when a missing resource is not growing)
   */
  _secondsToAfford(state, cost, held) {
    let seconds = 0
    for (const [
      resource,
      amount,
    ] of cost.entries) {
      const missing = amount + held[resource] - state.colony.resources[resource]
      if (missing > 0) {
        const rate = state.netProduction(resource)
        seconds = Math.max(seconds, rate > 0 ? missing / rate : Infinity)
      }
    }
    return seconds
  }

  /**
   * Whether saving for a cost can get anywhere: every missing resource is being produced.
   * @param {State} state - Game state
   * @param {Cost} cost - Cost to save for
   * @returns {boolean} True when each resource the colony lacks has a positive production
   */
  _canProgress(state, cost) {
    for (const [
      resource,
      amount,
    ] of cost.entries) {
      if (state.colony.resources[resource] < amount && state.production[resource] <= 0) {
        return false
      }
    }
    return true
  }
}

export default Bot
