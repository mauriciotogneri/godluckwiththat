import {describe, it, expect} from 'vitest'
import Events from '@/js/models/events/events.js'
import EventFuture from '@/js/models/events/event_future.js'

function createEventData(overrides = {}) {
  return {
    type: 'building_upgrade',
    textKey: 'event.building',
    icon: 'test.png',
    ...overrides,
  }
}

describe('Events', () => {
  describe('addFuture', () => {
    it('should create a future event with auto-incremented ID', () => {
      const events = new Events()
      const event = events.addFuture({
        ...createEventData(),
        remainingSeconds: 60,
      })
      expect(event).toBeInstanceOf(EventFuture)
      expect(event.id).toBe(1)
      expect(event.remainingSeconds).toBe(60)
    })

    it('should insert sorted by remainingSeconds', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 30,
      })
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 10,
      })
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 50,
      })
      expect(events.future[0].remainingSeconds).toBe(10)
      expect(events.future[1].remainingSeconds).toBe(30)
      expect(events.future[2].remainingSeconds).toBe(50)
    })

    it('should maintain sorted order when many events are inserted out of order', () => {
      const events = new Events()
      const values = [
        90,
        10,
        50,
        30,
        80,
        20,
        70,
        5,
        60,
        40,
        100,
        15,
        55,
        25,
        75,
      ]
      for (const remainingSeconds of values) {
        events.addFuture({
          ...createEventData(),
          remainingSeconds: remainingSeconds,
        })
      }
      const sorted = [...values].sort((a, b) => a - b)
      expect(events.future.map(event => event.remainingSeconds)).toEqual(sorted)
    })
  })

  describe('addPast', () => {
    it('should create a past event prepended to array', () => {
      const events = new Events()
      events.addPast(createEventData({
        textKey: 'first',
      }))
      events.addPast(createEventData({
        textKey: 'second',
      }))
      expect(events.past).toHaveLength(2)
      expect(events.past[0].textKey).toBe('second')
    })
  })

  describe('convertToPast', () => {
    it('should still add past event when no matching future event found', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        buildingKey: 'farm',
        remainingSeconds: 30,
      })
      events.convertToPast('quarry', createEventData({
        textKey: 'quarry.done',
      }))
      expect(events.future).toHaveLength(1)
      expect(events.past).toHaveLength(1)
      expect(events.past[0].textKey).toBe('quarry.done')
    })

    it('should remove future event and add past event', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        buildingKey: 'farm',
        remainingSeconds: 30,
      })
      events.convertToPast('farm', createEventData({
        textKey: 'farm.done',
      }))
      expect(events.future).toHaveLength(0)
      expect(events.past).toHaveLength(1)
      expect(events.past[0].textKey).toBe('farm.done')
    })
  })

  describe('dismissFutureByType', () => {
    it('should remove a future event by type', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData({
          type: 'season_changed',
        }),
        remainingSeconds: 10,
      })
      events.addFuture({
        ...createEventData({
          type: 'building_upgrade',
        }),
        remainingSeconds: 20,
      })
      events.dismissFutureByType('season_changed')
      expect(events.future).toHaveLength(1)
      expect(events.future[0].type).toBe('building_upgrade')
    })
  })

  describe('dismissFutureByBuildingKey', () => {
    it('should remove a future event by buildingKey', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        buildingKey: 'farm',
        remainingSeconds: 10,
      })
      events.dismissFutureByBuildingKey('farm')
      expect(events.future).toHaveLength(0)
    })
  })

  describe('dismissFutureByResearchKey', () => {
    it('should remove a future event by researchKey', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        researchKey: 'mining1',
        remainingSeconds: 10,
      })
      events.dismissFutureByResearchKey('mining1')
      expect(events.future).toHaveLength(0)
    })
  })

  describe('dismiss', () => {
    it('should remove a future event by ID', () => {
      const events = new Events()
      const event = events.addFuture({
        ...createEventData(),
        remainingSeconds: 10,
      })
      events.dismiss(event.id)
      expect(events.future).toHaveLength(0)
    })

    it('should no-op gracefully when ID does not match any event', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 10,
      })
      events.addPast(createEventData())
      events.dismiss(999)
      expect(events.future).toHaveLength(1)
      expect(events.past).toHaveLength(1)
    })

    it('should remove a past event by ID', () => {
      const events = new Events()
      const event = events.addPast(createEventData())
      events.dismiss(event.id)
      expect(events.past).toHaveLength(0)
    })
  })

  describe('hasPastEvent', () => {
    it('should return true when past event of type exists', () => {
      const events = new Events()
      events.addPast(createEventData({
        type: 'season_changed',
      }))
      expect(events.hasPastEvent('season_changed')).toBe(true)
    })

    it('should return false when no match', () => {
      const events = new Events()
      expect(events.hasPastEvent('season_changed')).toBe(false)
    })
  })

  describe('dismissPastByType', () => {
    it('should remove all past events of a type', () => {
      const events = new Events()
      events.addPast(createEventData({
        type: 'season_changed',
      }))
      events.addPast(createEventData({
        type: 'season_changed',
      }))
      events.addPast(createEventData({
        type: 'building_upgrade',
      }))
      events.dismissPastByType('season_changed')
      expect(events.past).toHaveLength(1)
    })
  })

  describe('dismissPastByTextKey', () => {
    it('should remove all past events matching textKey', () => {
      const events = new Events()
      events.addPast(createEventData({
        textKey: 'event.a',
      }))
      events.addPast(createEventData({
        textKey: 'event.b',
      }))
      events.dismissPastByTextKey('event.a')
      expect(events.past).toHaveLength(1)
      expect(events.past[0].textKey).toBe('event.b')
    })
  })

  describe('dismissAllPast', () => {
    it('should clear all past events', () => {
      const events = new Events()
      events.addPast(createEventData())
      events.addPast(createEventData())
      events.dismissAllPast()
      expect(events.past).toHaveLength(0)
    })
  })

  describe('advance', () => {
    it('should decrement all future event countdowns', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 30,
      })
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 60,
      })
      events.advance(10)
      expect(events.future[0].remainingSeconds).toBe(20)
      expect(events.future[1].remainingSeconds).toBe(50)
    })
  })

  describe('setFutureRemaining', () => {
    it('should update the countdown of the event with the given type', () => {
      const events = new Events()
      const event = events.addFuture({
        ...createEventData({
          type: 'raid_incoming',
        }),
        remainingSeconds: 30,
      })
      events.setFutureRemaining('raid_incoming', 45)
      expect(event.remainingSeconds).toBe(45)
      expect(events.future[0]).toBe(event)
    })

    it('should move an event later in the list when its countdown grows', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData({
          type: 'raid_incoming',
        }),
        remainingSeconds: 10,
      })
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 50,
      })
      events.setFutureRemaining('raid_incoming', 100)
      expect(events.future.map(event => event.remainingSeconds)).toEqual([
        50,
        100,
      ])
      expect(events.future[1].type).toBe('raid_incoming')
    })

    it('should move an event earlier in the list when its countdown shrinks', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 50,
      })
      events.addFuture({
        ...createEventData({
          type: 'raid_incoming',
        }),
        remainingSeconds: 100,
      })
      events.setFutureRemaining('raid_incoming', 20)
      expect(events.future[0].type).toBe('raid_incoming')
      expect(events.future.map(event => event.remainingSeconds)).toEqual([
        20,
        50,
      ])
    })

    it('should keep the event id', () => {
      const events = new Events()
      const event = events.addFuture({
        ...createEventData({
          type: 'raid_incoming',
        }),
        remainingSeconds: 10,
      })
      events.setFutureRemaining('raid_incoming', 60)
      expect(events.future[0].id).toBe(event.id)
    })

    it('should do nothing when no event has the given type', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 10,
      })
      events.setFutureRemaining('raid_incoming', 60)
      expect(events.future).toHaveLength(1)
      expect(events.future[0].remainingSeconds).toBe(10)
    })

    it('should not reorder when the value is unchanged', () => {
      const events = new Events()
      const other = events.addFuture({
        ...createEventData(),
        remainingSeconds: 20,
      })
      events.addFuture({
        ...createEventData({
          type: 'raid_incoming',
        }),
        remainingSeconds: 30,
      })
      // Tie: re-inserting the raid event would place it before the other one
      other.remainingSeconds = 30
      events.setFutureRemaining('raid_incoming', 30)
      expect(events.future[0]).toBe(other)
      expect(events.future[1].type).toBe('raid_incoming')
    })
  })

  describe('setFutureRemainingByResearchKey', () => {
    it('should move the research event to its sorted position', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 50,
      })
      const research = events.addFuture({
        ...createEventData({
          type: 'research_complete',
          researchKey: 'mining1',
        }),
        remainingSeconds: 10,
      })
      events.setFutureRemainingByResearchKey('mining1', 100)
      expect(research.remainingSeconds).toBe(100)
      expect(events.future[1]).toBe(research)
    })

    it('should leave other research and non-research events alone', () => {
      const events = new Events()
      const building = events.addFuture({
        ...createEventData(),
        remainingSeconds: 50,
      })
      const other = events.addFuture({
        ...createEventData({
          type: 'research_complete',
          researchKey: 'farming1',
        }),
        remainingSeconds: 30,
      })
      events.addFuture({
        ...createEventData({
          type: 'research_complete',
          researchKey: 'mining1',
        }),
        remainingSeconds: 10,
      })
      events.setFutureRemainingByResearchKey('mining1', 40)
      expect(other.remainingSeconds).toBe(30)
      expect(building.remainingSeconds).toBe(50)
      expect(events.future.map(event => event.remainingSeconds)).toEqual([
        30,
        40,
        50,
      ])
    })

    it('should do nothing when no event has the given research key', () => {
      const events = new Events()
      events.addFuture({
        ...createEventData(),
        remainingSeconds: 10,
      })
      events.setFutureRemainingByResearchKey('mining1', 60)
      expect(events.future).toHaveLength(1)
      expect(events.future[0].remainingSeconds).toBe(10)
    })

    it('should not reorder when the value is unchanged', () => {
      const events = new Events()
      const other = events.addFuture({
        ...createEventData(),
        remainingSeconds: 20,
      })
      events.addFuture({
        ...createEventData({
          type: 'research_complete',
          researchKey: 'mining1',
        }),
        remainingSeconds: 30,
      })
      // Tie: re-inserting the research event would place it before the other one
      other.remainingSeconds = 30
      events.setFutureRemainingByResearchKey('mining1', 30)
      expect(events.future[0]).toBe(other)
      expect(events.future[1].researchKey).toBe('mining1')
    })
  })

  describe('sortedFuture / sortedPast', () => {
    it('should return future array directly', () => {
      const events = new Events()
      expect(events.sortedFuture).toBe(events.future)
    })

    it('should return past array directly', () => {
      const events = new Events()
      expect(events.sortedPast).toBe(events.past)
    })
  })

  describe('fromJSON / toJSON', () => {
    it('should round-trip through serialization', () => {
      const original = new Events()
      original.addFuture({
        ...createEventData({
          type: 'building_upgrade',
        }),
        buildingKey: 'farm',
        remainingSeconds: 30,
      })
      original.addPast(createEventData({
        type: 'season_changed',
      }))
      const json = original.toJSON()
      const restored = Events.fromJSON(json)
      expect(restored.future).toHaveLength(1)
      expect(restored.future[0].remainingSeconds).toBe(30)
      expect(restored.past).toHaveLength(1)
      expect(restored._nextId).toBe(original._nextId)
    })
  })
})
