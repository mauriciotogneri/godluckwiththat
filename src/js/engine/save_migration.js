// Save format upgrades — State.fromJSON runs migrateSave() on the raw save data before any model is rebuilt from it.

import {SAVE_VERSION} from '@/js/engine/constants.js'
import {CHALLENGE_STATUS_STARTED} from '@/js/engine/enums.js'

/**
 * Upgrades serialized save data to the current format (SAVE_VERSION).
 * A save without a version counts as version 1.
 * @param {Object} data - Serialized state data
 * @returns {Object} Save data in the current format (a new object when upgraded; the input is not changed)
 * @throws {Error} When the save comes from a newer version of the game
 */
export function migrateSave(data) {
  const version = data.meta.version ?? 1
  if (version > SAVE_VERSION) {
    throw new Error(`Save version ${version} is newer than the supported version ${SAVE_VERSION}`)
  }
  let migrated = data
  if (version < 2) {
    migrated = migrateVersion1To2(migrated)
  }
  return migrated
}

/**
 * Version 1 → 2: challenges keep only their progress, their base values come from challenges.json.
 * Completed challenges become a list of indexes and pending ones are dropped (both are rebuilt from the definitions).
 * @param {Object} data - Version 1 save data
 * @returns {Object} Version 2 save data
 */
function migrateVersion1To2(data) {
  const challenges = data.meta.challenges
  return {
    ...data,
    meta: {
      ...data.meta,
      version: 2,
      challenges: {
        active: challenges.active ? migrateActiveChallenge(challenges.active) : null,
        completed: (challenges.completed ?? []).map(challenge => challenge.index),
        activeBlessings: challenges.activeBlessings ?? [],
        activePunishments: challenges.activePunishments ?? [],
      },
    },
  }
}

/**
 * Version 1 → 2 for the active challenge. A started challenge keeps its stored values as the values in effect
 * (the countdown is already running); an activated one keeps its delay and timers and takes everything else
 * from its definition.
 * @param {Object} challenge - Version 1 active challenge
 * @returns {Object} Version 2 active challenge
 */
function migrateActiveChallenge(challenge) {
  const progress = {
    index: challenge.index,
    status: challenge.status,
    delay: challenge.delay,
    delayElapsed: challenge.delayElapsed,
    timeoutElapsed: challenge.timeoutElapsed,
  }
  if (challenge.status !== CHALLENGE_STATUS_STARTED) {
    return progress
  }
  return {
    ...progress,
    timeout: challenge.timeout,
    requirements: challenge.requirements,
    blessings: challenge.blessings,
    punishment: challenge.punishment,
  }
}
