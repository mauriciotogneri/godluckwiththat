import {describe, it, expect} from 'vitest'
import {CHALLENGE_STATUS_ACTIVATED, CHALLENGE_STATUS_COMPLETED, CHALLENGE_STATUS_STARTED} from '@/js/engine/enums.js'
import Challenges from '@/js/models/challenges.js'
import {createBlessing, createChallenge, createChallenges, createPunishment} from '../helpers/factories.js'

describe('Challenges', () => {
  describe('totalCount', () => {
    it('should count pending, active, and completed', () => {
      const challenges = createChallenges({
        pending: [
          createChallenge(),
          createChallenge(),
        ],
        active: createChallenge(),
        completed: [createChallenge()],
      })
      expect(challenges.totalCount).toBe(4)
    })

    it('should handle null active', () => {
      const challenges = createChallenges({
        pending: [createChallenge()],
      })
      expect(challenges.totalCount).toBe(1)
    })
  })

  describe('allCompleted', () => {
    it('should return true when no pending and no active', () => {
      const challenges = createChallenges({
        completed: [createChallenge()],
      })
      expect(challenges.allCompleted).toBe(true)
    })

    it('should return false when pending challenges exist', () => {
      const challenges = createChallenges({
        pending: [createChallenge()],
      })
      expect(challenges.allCompleted).toBe(false)
    })

    it('should return false when active challenge exists', () => {
      const challenges = createChallenges({
        active: createChallenge(),
      })
      expect(challenges.allCompleted).toBe(false)
    })
  })

  describe('activate', () => {
    it('should move first pending challenge to active', () => {
      const challenge = createChallenge({
        index: 1,
      })
      const challenges = createChallenges({
        pending: [challenge],
      })
      challenges.activate()
      expect(challenges.active).toBe(challenge)
      expect(challenges.active.status).toBe(CHALLENGE_STATUS_ACTIVATED)
      expect(challenges.pending).toHaveLength(0)
    })

    it('should do nothing when no pending challenges', () => {
      const challenges = createChallenges()
      challenges.activate()
      expect(challenges.active).toBeNull()
    })

    it('should replace active when called with existing active and pending', () => {
      const first = createChallenge({
        index: 1,
      })
      const second = createChallenge({
        index: 2,
      })
      const challenges = createChallenges({
        pending: [
          first,
          second,
        ],
      })
      challenges.activate()
      expect(challenges.active).toBe(first)
      challenges.activate()
      expect(challenges.active).toBe(second)
      expect(challenges.pending).toHaveLength(0)
    })
  })

  describe('start', () => {
    it('should transition active challenge to started', () => {
      const challenges = createChallenges({
        active: createChallenge({
          status: CHALLENGE_STATUS_ACTIVATED,
        }),
      })
      challenges.start()
      expect(challenges.active.status).toBe(CHALLENGE_STATUS_STARTED)
    })

    it('should do nothing when no active challenge', () => {
      const challenges = createChallenges()
      challenges.start()
      expect(challenges.active).toBeNull()
    })
  })

  describe('complete', () => {
    it('should move active to completed and store blessing', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
      })
      const challenges = createChallenges({
        active: challenge,
      })
      const blessing = createBlessing({
        timeout: 120,
      })
      challenges.complete(blessing)
      expect(challenges.active).toBeNull()
      expect(challenges.completed).toHaveLength(1)
      expect(challenges.completed[0].status).toBe(CHALLENGE_STATUS_COMPLETED)
      expect(challenges.activeBlessings).toHaveLength(1)
    })

    it('should not store an instant blessing', () => {
      const challenges = createChallenges({
        active: createChallenge({
          status: CHALLENGE_STATUS_STARTED,
        }),
      })
      challenges.complete(createBlessing({
        timeout: null,
      }))
      expect(challenges.completed).toHaveLength(1)
      expect(challenges.activeBlessings).toHaveLength(0)
    })

    it('should store a copy so the challenge blessing is not drained', () => {
      const challenges = createChallenges({
        active: createChallenge({
          status: CHALLENGE_STATUS_STARTED,
        }),
      })
      const blessing = createBlessing({
        timeout: 600,
      })
      challenges.complete(blessing)
      expect(challenges.activeBlessings[0]).not.toBe(blessing)
      expect(challenges.activeBlessings[0].toJSON()).toEqual(blessing.toJSON())
      challenges.activeBlessings[0].timeout = 0
      expect(blessing.timeout).toBe(600)
    })

    it('should do nothing when no active challenge', () => {
      const challenges = createChallenges()
      const blessing = createBlessing()
      challenges.complete(blessing)
      expect(challenges.completed).toHaveLength(0)
      expect(challenges.activeBlessings).toHaveLength(0)
    })
  })

  describe('fail', () => {
    it('should reset active challenge and store punishment', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        delayElapsed: 50,
        timeoutElapsed: 200,
      })
      const challenges = createChallenges({
        active: challenge,
      })
      const punishment = createPunishment({
        timeout: 120,
      })
      challenges.fail(punishment)
      expect(challenges.active.status).toBe(CHALLENGE_STATUS_ACTIVATED)
      expect(challenges.active.delayElapsed).toBe(0)
      expect(challenges.activePunishments).toHaveLength(1)
    })

    it('should not store an instant punishment', () => {
      const challenges = createChallenges({
        active: createChallenge({
          status: CHALLENGE_STATUS_STARTED,
        }),
      })
      challenges.fail(createPunishment({
        timeout: null,
      }))
      expect(challenges.active.status).toBe(CHALLENGE_STATUS_ACTIVATED)
      expect(challenges.activePunishments).toHaveLength(0)
    })

    it('should store a copy so the challenge punishment is not drained', () => {
      const challenges = createChallenges({
        active: createChallenge({
          status: CHALLENGE_STATUS_STARTED,
        }),
      })
      const punishment = createPunishment({
        timeout: 120,
      })
      challenges.fail(punishment)
      expect(challenges.activePunishments[0]).not.toBe(punishment)
      expect(challenges.activePunishments[0].toJSON()).toEqual(punishment.toJSON())
      challenges.activePunishments[0].timeout = 0
      expect(punishment.timeout).toBe(120)
    })

    it('should do nothing when no active challenge', () => {
      const challenges = createChallenges()
      const punishment = createPunishment()
      challenges.fail(punishment)
      expect(challenges.activePunishments).toHaveLength(0)
    })
  })

  describe('advance', () => {
    it('should advance delay timer when activated', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delayElapsed: 10,
      })
      const challenges = createChallenges({
        active: challenge,
      })
      challenges.advance(5)
      expect(challenges.active.delayElapsed).toBe(15)
    })

    it('should advance timeout timer when started', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeoutElapsed: 10,
      })
      const challenges = createChallenges({
        active: challenge,
      })
      challenges.advance(5)
      expect(challenges.active.timeoutElapsed).toBe(15)
    })

    it('should not advance timers when status is completed', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_COMPLETED,
        delayElapsed: 10,
        timeoutElapsed: 10,
      })
      const challenges = createChallenges({
        active: challenge,
      })
      challenges.advance(5)
      expect(challenges.active.delayElapsed).toBe(10)
      expect(challenges.active.timeoutElapsed).toBe(10)
    })

    it('should do nothing when no active challenge', () => {
      const challenges = createChallenges()
      challenges.advance(5)
      expect(challenges.active).toBeNull()
    })
  })

  describe('fromJSON / toJSON', () => {
    it('should serialize active as null when no active challenge', () => {
      const original = createChallenges({
        pending: [createChallenge()],
        completed: [createChallenge()],
      })
      const json = original.toJSON()
      expect(json.active).toBeNull()
      const restored = Challenges.fromJSON(json)
      expect(restored.active).toBeNull()
    })

    it('should round-trip through serialization', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delayElapsed: 20,
      })
      const original = createChallenges({
        active: challenge,
        activeBlessings: [
          createBlessing({
            timeout: 60,
          }),
        ],
        activePunishments: [
          createPunishment({
            timeout: 60,
          }),
        ],
      })
      const json = original.toJSON()
      const restored = Challenges.fromJSON(json)
      expect(restored.active.delayElapsed).toBe(20)
      expect(restored.activeBlessings).toHaveLength(1)
      expect(restored.activePunishments).toHaveLength(1)
    })

    it('should drop instant effects left in older saves', () => {
      const original = createChallenges({
        activeBlessings: [
          createBlessing({
            timeout: null,
          }),
          createBlessing({
            timeout: 60,
          }),
        ],
        activePunishments: [
          createPunishment({
            timeout: null,
          }),
        ],
      })
      const restored = Challenges.fromJSON(original.toJSON())
      expect(restored.activeBlessings).toHaveLength(1)
      expect(restored.activeBlessings[0].timeout).toBe(60)
      expect(restored.activePunishments).toHaveLength(0)
    })
  })
})
