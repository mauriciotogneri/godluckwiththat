import {describe, it, expect} from 'vitest'
import {SAVE_VERSION} from '@/js/engine/constants.js'
import {BLESSING_FERTILE_SOIL, CHALLENGE_STATUS_ACTIVATED, CHALLENGE_STATUS_STARTED, PUNISHMENT_CROP_FAILURE} from '@/js/engine/enums.js'
import {migrateSave} from '@/js/engine/save_migration.js'
import activatedSave from '../fixtures/save_version_1_activated.json'
import startedSave from '../fixtures/save_version_1_started.json'

// Deep copy of plain JSON save data, so no test can change the shared fixtures
function copy(data) {
  return JSON.parse(JSON.stringify(data))
}

// A minimal version 1 save: only the challenge data differs between tests
function createVersion1Save(challenges = {}) {
  return {
    meta: {
      version: 1,
      createdDateTime: '2025-01-01T00:00:00.000Z',
      updatedDateTime: '2025-01-01T00:00:00.000Z',
      challenges: {
        pending: [],
        active: null,
        completed: [],
        activeBlessings: [],
        activePunishments: [],
        ...challenges,
      },
      gameSpeed: 1,
      tutorial: {
        completed: true,
      },
    },
    colony: {
      year: 1,
    },
  }
}

describe('migrateSave', () => {
  it('should upgrade a version 1 save to the current version', () => {
    const migrated = migrateSave(copy(startedSave))
    expect(migrated.meta.version).toBe(SAVE_VERSION)
  })

  it('should replace completed challenges with their indexes and drop pending ones', () => {
    const migrated = migrateSave(copy(startedSave))
    expect(migrated.meta.challenges.completed).toEqual([
      1,
      2,
    ])
    expect(migrated.meta.challenges).not.toHaveProperty('pending')
  })

  it('should keep the stored values of a started challenge', () => {
    const migrated = migrateSave(copy(startedSave))
    const active = migrated.meta.challenges.active
    expect(active.index).toBe(3)
    expect(active.status).toBe(CHALLENGE_STATUS_STARTED)
    expect(active.timeoutElapsed).toBe(300)
    // Every stored field: timeout, requirements, blessings, punishment, delay, delayElapsed, timeoutElapsed
    expect(active).toStrictEqual(startedSave.meta.challenges.active)
  })

  it('should keep only the progress of an activated challenge', () => {
    const migrated = migrateSave(copy(activatedSave))
    expect(migrated.meta.challenges.active).toStrictEqual({
      index: 3,
      status: CHALLENGE_STATUS_ACTIVATED,
      delay: 30,
      delayElapsed: 10,
      timeoutElapsed: 0,
    })
  })

  it('should pass the blessings and punishments in effect through', () => {
    const save = createVersion1Save({
      activeBlessings: [
        {
          type: BLESSING_FERTILE_SOIL,
          timeout: 60,
          productivity: 0.3,
          resources: null,
          territory: null,
          construction: null,
          warm: null,
          cold: null,
        },
      ],
      activePunishments: [
        {
          type: PUNISHMENT_CROP_FAILURE,
          timeout: 90,
          faith: null,
          productivityFarm: 0.1,
          productivityWoodcutter: null,
          productivityMines: null,
          productivityGeneral: null,
          resources: null,
          workers: null,
          levels: null,
        },
      ],
    })
    const migrated = migrateSave(save)
    expect(migrated.meta.challenges.active).toBeNull()
    expect(migrated.meta.challenges.activeBlessings).toEqual(save.meta.challenges.activeBlessings)
    expect(migrated.meta.challenges.activePunishments).toEqual(save.meta.challenges.activePunishments)
  })

  it('should keep the colony and every other field', () => {
    const save = copy(startedSave)
    const migrated = migrateSave(save)
    // Everything but meta.version and meta.challenges is left as saved
    expect({
      ...migrated,
      meta: null,
    }).toEqual({
      ...save,
      meta: null,
    })
    expect({
      ...migrated.meta,
      version: null,
      challenges: null,
    }).toEqual({
      ...save.meta,
      version: null,
      challenges: null,
    })
  })

  it('should return a new object and leave the input unchanged', () => {
    const save = copy(startedSave)
    const original = copy(save)
    const migrated = migrateSave(save)
    expect(migrated).not.toBe(save)
    expect(save).toEqual(original)
  })

  it('should return a save already at the current version unchanged', () => {
    const save = createVersion1Save()
    save.meta.version = SAVE_VERSION
    save.meta.challenges = {
      active: null,
      completed: [1],
      activeBlessings: [],
      activePunishments: [],
    }
    const original = copy(save)
    const migrated = migrateSave(save)
    expect(migrated).toBe(save)
    expect(migrated).toEqual(original)
  })

  it('should treat a save without a version as version 1', () => {
    const save = copy(startedSave)
    delete save.meta.version
    const migrated = migrateSave(save)
    expect(migrated.meta.version).toBe(SAVE_VERSION)
    expect(migrated.meta.challenges.completed).toEqual([
      1,
      2,
    ])
    expect(migrated.meta.challenges).not.toHaveProperty('pending')
  })

  it('should throw for a save from a newer version of the game', () => {
    const save = createVersion1Save()
    save.meta.version = SAVE_VERSION + 1
    expect(() => migrateSave(save)).toThrow()
  })
})
