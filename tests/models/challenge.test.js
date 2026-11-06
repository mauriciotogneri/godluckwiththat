import {describe, it, expect} from 'vitest'
import {CHALLENGE_STATUS_ACTIVATED, CHALLENGE_STATUS_PENDING, CHALLENGE_STATUS_STARTED} from '@/js/engine/enums.js'
import Blessing from '@/js/models/blessing.js'
import Challenge from '@/js/models/challenge.js'
import Punishment from '@/js/models/punishment.js'
import {createChallenge, createChallengeDefinition} from '../helpers/factories.js'

describe('Challenge', () => {
  describe('constructor', () => {
    it('should set all fields', () => {
      const challenge = createChallenge({
        index: 3,
        delay: 120,
        timeout: 600,
      })
      expect(challenge.index).toBe(3)
      expect(challenge.status).toBe(CHALLENGE_STATUS_PENDING)
      expect(challenge.delay).toBe(120)
      expect(challenge.timeout).toBe(600)
      expect(challenge.delayElapsed).toBe(0)
      expect(challenge.timeoutElapsed).toBe(0)
    })

    it('should default base, failures and mood', () => {
      const challenge = createChallenge()
      expect(challenge.base).toBeNull()
      expect(challenge.failures).toBe(0)
      expect(challenge.mood).toBeNull()
    })

    it('should accept base, failures and mood', () => {
      const definition = createChallengeDefinition()
      const challenge = createChallenge({
        base: definition,
        failures: 2,
        mood: 'stern',
      })
      expect(challenge.base).toBe(definition)
      expect(challenge.failures).toBe(2)
      expect(challenge.mood).toBe('stern')
    })
  })

  describe('isDelayElapsed', () => {
    it('should return true when activated and delay elapsed', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 60,
        delayElapsed: 60,
      })
      expect(challenge.isDelayElapsed).toBe(true)
    })

    it('should return false when delay not yet elapsed', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 60,
        delayElapsed: 30,
      })
      expect(challenge.isDelayElapsed).toBe(false)
    })

    it('should return false when not in activated status', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        delay: 60,
        delayElapsed: 60,
      })
      expect(challenge.isDelayElapsed).toBe(false)
    })
  })

  describe('isTimeoutElapsed', () => {
    it('should return true when started and timeout elapsed', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeout: 300,
        timeoutElapsed: 300,
      })
      expect(challenge.isTimeoutElapsed).toBe(true)
    })

    it('should return false when timeout not yet elapsed', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeout: 300,
        timeoutElapsed: 100,
      })
      expect(challenge.isTimeoutElapsed).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset timers and set status to activated', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        delayElapsed: 50,
        timeoutElapsed: 200,
      })
      challenge.reset()
      expect(challenge.status).toBe(CHALLENGE_STATUS_ACTIVATED)
      expect(challenge.delayElapsed).toBe(0)
      expect(challenge.timeoutElapsed).toBe(0)
    })

    it('should keep the failure count', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        failures: 3,
      })
      challenge.reset()
      expect(challenge.failures).toBe(3)
    })
  })

  describe('fromDefinition', () => {
    it('should create a pending challenge with the base values', () => {
      const definition = createChallengeDefinition({
        index: 4,
      })
      const challenge = Challenge.fromDefinition(definition)
      expect(challenge.index).toBe(4)
      expect(challenge.status).toBe(CHALLENGE_STATUS_PENDING)
      expect(challenge.delay).toBe(60)
      expect(challenge.timeout).toBe(300)
      expect(challenge.requirements).toEqual(definition.requirements)
      expect(challenge.blessings.map(blessing => blessing.toJSON())).toEqual(definition.blessings)
      expect(challenge.punishment.toJSON()).toEqual(definition.punishment)
      expect(challenge.base).toBe(definition)
      expect(challenge.failures).toBe(0)
      expect(challenge.mood).toBeNull()
    })

    it('should build Blessing and Punishment instances', () => {
      const challenge = Challenge.fromDefinition(createChallengeDefinition())
      expect(challenge.blessings[0]).toBeInstanceOf(Blessing)
      expect(challenge.punishment).toBeInstanceOf(Punishment)
    })

    it('should deep-copy the base values so changes never reach the definition', () => {
      const definition = createChallengeDefinition()
      const challenge = Challenge.fromDefinition(definition)
      expect(challenge.requirements).not.toBe(definition.requirements)
      expect(challenge.requirements.resources).not.toBe(definition.requirements.resources)
      expect(challenge.blessings[1].resources).not.toBe(definition.blessings[1].resources)
      challenge.timeout = 900
      challenge.requirements.faith = 999
      challenge.requirements.resources.food = 999
      challenge.blessings[1].resources.food = 999
      challenge.blessings[0].productivity = 0.9
      challenge.punishment.faith = 0.9
      expect(definition.timeout).toBe(300)
      expect(definition.requirements.faith).toBe(100)
      expect(definition.requirements.resources.food).toBe(200)
      expect(definition.blessings[1].resources.food).toBe(500)
      expect(definition.blessings[0].productivity).toBe(0.3)
      expect(definition.punishment.faith).toBe(0.5)
    })

    it('should give two challenges from the same definition separate objects', () => {
      const definition = createChallengeDefinition()
      const first = Challenge.fromDefinition(definition)
      const second = Challenge.fromDefinition(definition)
      first.requirements.resources.food = 999
      first.blessings[1].resources.food = 999
      expect(second.requirements.resources.food).toBe(200)
      expect(second.blessings[1].resources.food).toBe(500)
    })
  })

  describe('toJSON', () => {
    it('should save only progress while activated', () => {
      const challenge = createChallenge({
        index: 2,
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 90,
        delayElapsed: 30,
        failures: 0,
        mood: 'lenient',
      })
      expect(challenge.toJSON()).toEqual({
        index: 2,
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 90,
        delayElapsed: 30,
        timeoutElapsed: 0,
        failures: 0,
        mood: 'lenient',
      })
    })

    it('should add the failed attempt\'s requirements while a retry waits', () => {
      const challenge = createChallenge({
        index: 2,
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 90,
        delayElapsed: 30,
        failures: 1,
        mood: 'lenient',
        requirements: {
          altar: 7,
        },
      })
      expect(challenge.toJSON()).toEqual({
        index: 2,
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 90,
        delayElapsed: 30,
        timeoutElapsed: 0,
        failures: 1,
        mood: 'lenient',
        requirements: {
          altar: 7,
        },
      })
    })

    it('should add the values in effect while started', () => {
      const challenge = createChallenge({
        status: CHALLENGE_STATUS_STARTED,
        timeout: 420,
        timeoutElapsed: 100,
        requirements: {
          altar: 7,
        },
      })
      const json = challenge.toJSON()
      expect(json.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(json.timeout).toBe(420)
      expect(json.timeoutElapsed).toBe(100)
      expect(json.requirements).toEqual({
        altar: 7,
      })
      expect(json.blessings).toEqual([challenge.blessings[0].toJSON()])
      expect(json.punishment).toEqual(challenge.punishment.toJSON())
    })

    it('should never save the base values', () => {
      const challenge = Challenge.fromDefinition(createChallengeDefinition())
      challenge.status = CHALLENGE_STATUS_STARTED
      expect(challenge.toJSON()).not.toHaveProperty('base')
    })
  })

  describe('fromJSON', () => {
    it('should fill the values left out of the save from the definition', () => {
      const definition = createChallengeDefinition({
        index: 2,
      })
      const restored = Challenge.fromJSON({
        index: 2,
        status: CHALLENGE_STATUS_ACTIVATED,
        delay: 90,
        delayElapsed: 30,
        timeoutElapsed: 0,
        failures: 1,
        mood: 'lenient',
      }, definition)
      expect(restored.delay).toBe(90)
      expect(restored.delayElapsed).toBe(30)
      expect(restored.failures).toBe(1)
      expect(restored.mood).toBe('lenient')
      expect(restored.timeout).toBe(300)
      expect(restored.requirements).toEqual(definition.requirements)
      expect(restored.requirements).not.toBe(definition.requirements)
      expect(restored.blessings).toHaveLength(2)
      expect(restored.blessings[0]).toBeInstanceOf(Blessing)
      expect(restored.punishment.toJSON()).toEqual(definition.punishment)
      expect(restored.base).toBe(definition)
    })

    it('should keep the failed attempt\'s requirements of a waiting retry over the definition', () => {
      const definition = createChallengeDefinition()
      const original = Challenge.fromDefinition(definition)
      original.status = CHALLENGE_STATUS_ACTIVATED
      original.failures = 1
      original.requirements = {
        ...original.requirements,
        faith: 150,
      }
      const restored = Challenge.fromJSON(original.toJSON(), definition)
      expect(restored.requirements.faith).toBe(150)
      expect(restored.timeout).toBe(definition.timeout)
      expect(restored.base).toBe(definition)
    })

    it('should keep the saved values of a started challenge over the definition', () => {
      const definition = createChallengeDefinition()
      const original = Challenge.fromDefinition(definition)
      original.status = CHALLENGE_STATUS_STARTED
      original.timeout = 420
      original.timeoutElapsed = 100
      original.requirements = {
        ...original.requirements,
        faith: 150,
      }
      original.blessings[0].productivity = 0.4
      original.punishment.faith = 0.25
      const restored = Challenge.fromJSON(original.toJSON(), definition)
      expect(restored.timeout).toBe(420)
      expect(restored.timeoutElapsed).toBe(100)
      expect(restored.requirements.faith).toBe(150)
      expect(restored.blessings[0].productivity).toBe(0.4)
      expect(restored.punishment.faith).toBe(0.25)
      expect(restored.base).toBe(definition)
    })

    it('should round-trip a started challenge without a definition', () => {
      const original = createChallenge({
        index: 2,
        status: CHALLENGE_STATUS_STARTED,
        delay: 60,
        delayElapsed: 60,
        timeout: 300,
        timeoutElapsed: 30,
      })
      const restored = Challenge.fromJSON(original.toJSON())
      expect(restored.index).toBe(2)
      expect(restored.status).toBe(CHALLENGE_STATUS_STARTED)
      expect(restored.timeoutElapsed).toBe(30)
      expect(restored.blessings).toHaveLength(1)
      expect(restored.punishment).toBeInstanceOf(Punishment)
      expect(restored.base).toBeNull()
    })
  })
})
