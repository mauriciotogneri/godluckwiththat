// Heuristic player for the balance simulation, driven by a profile (bot_profiles.js).

import {BUILDING_STOREHOUSE, CHALLENGE_MODAL_FAILURE, CHALLENGE_MODAL_REWARD, RESOURCE_FOOD} from '@/js/engine/enums.js'
import {challengeFocus, challengeItems, challengeRates, challengeReserve, chooseBlessing} from './challenge_planner.js'
import {addAmounts, applyWorkerTargets, buildingItem, dismissIdleWhenShort, emptyAmounts, exceedsCap, fitsReserve, foodWoodItems, growthItems, planWorkers, populationItems, producerCapacity, recruitFoodNeed, recruitWorkers, researchItems, storageCapOf, storehouseItems, territoryItems, tradeAtMarket} from './economy_planner.js'
import {militaryItems, respondToRaid} from './military_planner.js'

const SAVED_ITEMS = 3 // Unaffordable items whose costs steer the worker split
const GOAL_HOLD_SECONDS = 60 // The first of them is held back from cheaper wishes once the income covers it this soon
const NOTHING_HELD = emptyAmounts() // Reserve for items that may use every held amount

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
 * answer an announced raid, then walk a wish list in priority order — (1) food/wood, (2) population,
 * (3) the running challenge, (4) storage, (5) territory and headquarters tier, (6) economy,
 * (7) research, (8) military — starting what it can pay for and saving for what it cannot yet.
 * A wish item is {label, cost, save, urgent?, ignoresHold?, run}; run() starts it and returns whether it did.
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
    const reserve = focus && profile.holdsRequirements ? challengeReserve(state, focus) : emptyAmounts()
    const rates = focus ? challengeRates(state, focus) : {}

    recruitWorkers(state, reserve, Math.max(producerCapacity(state), focus?.requirements.workers ?? 0))
    const workerPlan = planWorkers(state, profile, rates, this._shortfall(state, reserve))
    applyWorkerTargets(state, workerPlan.targets)
    dismissIdleWhenShort(state)
    respondToRaid(state, profile, reserve)

    const items = [
      ...foodWoodItems(state, workerPlan),
      ...populationItems(state, profile, workerPlan),
      ...(focus ? challengeItems(state, focus, rates) : []),
      ...storehouseItems(state, profile),
      ...territoryItems(state, profile),
      ...growthItems(state, profile),
      ...researchItems(state, profile),
      ...militaryItems(state, profile),
    ]
    this.goal = this._spend(state, items, reserve)
    tradeAtMarket(state, profile, this._shortfall(state, reserve), reserve)
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
   * decision) without touching the held amounts: the challenge hold, plus the cost of the first
   * unaffordable item marked to save for (the goal) once the income covers it within
   * GOAL_HOLD_SECONDS. Urgent items (headquarters tier upgrades) only respect the challenge hold,
   * and the challenge's own items respect neither. An item whose cost cannot fit in storage is replaced by a storehouse level, and
   * items needing a resource the colony does not produce are not saved for.
   * @param {State} state - Game state
   * @param {Array<Object|null>} items - Wish items in priority order (null entries are skipped)
   * @param {Object<string, number>} reserve - Challenge hold
   * @returns {Object<string, number>} Summed cost of the first unaffordable items to save for (drives the worker split)
   */
  _spend(state, items, reserve) {
    const cap = storageCapOf(state)
    const held = addAmounts(emptyAmounts(), reserve)
    const wanted = emptyAmounts()
    let saved = 0
    let spends = 0
    for (const wish of items) {
      if (spends >= this.profile.spendsPerDecision) {
        break
      }
      const item = wish && exceedsCap(wish.cost, cap) ? buildingItem(state, BUILDING_STOREHOUSE, true, 'fit') : wish
      if (!item || exceedsCap(item.cost, cap)) {
        continue
      }
      if (fitsReserve(state, item.cost, item.ignoresHold ? NOTHING_HELD : (item.urgent ? reserve : held))) {
        if (item.run()) {
          spends += 1
        }
      } else if (item.save && saved < SAVED_ITEMS && this._canProgress(state, item.cost)) {
        if (saved === 0 && this._secondsToAfford(state, item.cost, held) <= GOAL_HOLD_SECONDS) {
          addAmounts(held, item.cost)
        }
        addAmounts(wanted, item.cost)
        saved += 1
      }
    }
    return wanted
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
