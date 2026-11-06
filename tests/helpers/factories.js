import {BLESSING_FERTILE_SOIL, BLESSING_GIFT_FROM_THE_HEAVENS, CHALLENGE_STATUS_PENDING, HQ_TYPE_CAMP, PUNISHMENT_CROP_FAILURE, RAID_PHASE_INCOMING, SEASON_WARM} from '@/js/engine/enums.js'
import Blessing from '@/js/models/blessing.js'
import Challenge from '@/js/models/challenge.js'
import Challenges from '@/js/models/challenges.js'
import Cost from '@/js/models/cost.js'
import Military from '@/js/models/military.js'
import Punishment from '@/js/models/punishment.js'
import Raid from '@/js/models/raid.js'
import Resources from '@/js/models/resources.js'
import Season from '@/js/models/season.js'
import Tutorial from '@/js/models/tutorial.js'
import Building from '@/js/models/buildings/building.js'
import Headquarters from '@/js/models/buildings/headquarters.js'
import Producer from '@/js/models/buildings/producer.js'

export function createCost(overrides = {}) {
  return new Cost(overrides)
}

export function createResources(overrides = {}) {
  return new Resources({
    territory: 0,
    territoryBonus: 0,
    workers: 0,
    food: 100,
    wood: 100,
    stone: 100,
    copper: 100,
    iron: 100,
    gold: 100,
    faith: 100,
    knowledge: 100,
    ...overrides,
  })
}

export function createSeason(overrides = {}) {
  return new Season({
    currentSeason: SEASON_WARM,
    seasonElapsed: 0,
    ...overrides,
  })
}

export function createBuilding(overrides = {}) {
  return new Building({
    level: 1,
    ...overrides,
  })
}

export function createProducer(overrides = {}) {
  return new Producer({
    level: 1,
    workers: 0,
    ...overrides,
  })
}

export function createHeadquarters(overrides = {}) {
  return new Headquarters({
    level: 1,
    type: HQ_TYPE_CAMP,
    ...overrides,
  })
}

export function createBlessing(overrides = {}) {
  return new Blessing({
    type: BLESSING_FERTILE_SOIL,
    ...overrides,
  })
}

export function createPunishment(overrides = {}) {
  return new Punishment({
    type: PUNISHMENT_CROP_FAILURE,
    ...overrides,
  })
}

export function createChallenge(overrides = {}) {
  return new Challenge({
    index: 1,
    status: CHALLENGE_STATUS_PENDING,
    delay: 60,
    timeout: 300,
    requirements: {
      faith: 100,
    },
    blessings: [createBlessing()],
    punishment: createPunishment(),
    ...overrides,
  })
}

function deepFreeze(value) {
  for (const nested of Object.values(value)) {
    if (nested !== null && typeof nested === 'object') {
      deepFreeze(nested)
    }
  }
  return Object.freeze(value)
}

// A deep-frozen challenge definition shaped like CHALLENGE_DEFINITIONS entries (absent fields null)
export function createChallengeDefinition(overrides = {}) {
  return deepFreeze({
    index: 1,
    delay: 60,
    timeout: 300,
    requirements: {
      faith: 100,
      altar: null,
      temple: null,
      monument: null,
      resources: {
        food: 200,
      },
      workers: null,
    },
    blessings: [
      new Blessing({
        type: BLESSING_FERTILE_SOIL,
        timeout: 120,
        productivity: 0.3,
      }).toJSON(),
      new Blessing({
        type: BLESSING_GIFT_FROM_THE_HEAVENS,
        resources: {
          food: 500,
        },
      }).toJSON(),
    ],
    punishment: new Punishment({
      type: PUNISHMENT_CROP_FAILURE,
      timeout: 120,
      faith: 0.5,
    }).toJSON(),
    ...overrides,
  })
}

export function createChallenges(overrides = {}) {
  return new Challenges({
    pending: [],
    active: null,
    completed: [],
    activeBlessings: [],
    activePunishments: [],
    ...overrides,
  })
}

export function createTutorial(overrides) {
  return new Tutorial(overrides)
}

export function createRaid(overrides = {}) {
  return new Raid({
    phase: RAID_PHASE_INCOMING,
    remainingSeconds: 60,
    enemy: {
      infantry: 5,
    },
    demand: {
      food: 100,
      wood: 50,
    },
    delaysPaid: 0,
    ...overrides,
  })
}

export function createMilitary(overrides = {}) {
  return new Military({
    units: {
      infantry: 0,
      archer: 0,
      cavalry: 0,
    },
    raid: null,
    raidCount: 0,
    ...overrides,
  })
}
