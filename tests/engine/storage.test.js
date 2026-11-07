import {describe, it, expect, vi, afterEach} from 'vitest'
import {AUTOSAVE_DEFAULT_INTERVAL, AUTOSAVE_MAX_INTERVAL, AUTOSAVE_MIN_INTERVAL} from '@/js/engine/constants.js'
import {STORAGE_AUTOSAVE_INTERVAL, STORAGE_INTRO_SEEN} from '@/js/engine/enums.js'
import storage from '@/js/engine/storage.js'

/**
 * Stubs window.localStorage with the given stored values.
 * @param {Object} values - Stored strings keyed by storage key
 */
function stubLocalStorage(values) {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: key => values[key] ?? null,
    },
  })
}

describe('storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('autosaveInterval', () => {
    it('should return the default when nothing is stored', () => {
      stubLocalStorage({})
      expect(storage.autosaveInterval).toBe(AUTOSAVE_DEFAULT_INTERVAL)
    })

    it('should return the stored interval when it is within range', () => {
      stubLocalStorage({
        [STORAGE_AUTOSAVE_INTERVAL]: '12',
      })
      expect(storage.autosaveInterval).toBe(12)
    })

    it('should return the default when the stored value is not a number', () => {
      stubLocalStorage({
        [STORAGE_AUTOSAVE_INTERVAL]: 'abc',
      })
      expect(storage.autosaveInterval).toBe(AUTOSAVE_DEFAULT_INTERVAL)
    })

    it('should return the default when the stored value is infinite', () => {
      stubLocalStorage({
        [STORAGE_AUTOSAVE_INTERVAL]: 'Infinity',
      })
      expect(storage.autosaveInterval).toBe(AUTOSAVE_DEFAULT_INTERVAL)
    })

    it('should clamp a stored value below the minimum', () => {
      stubLocalStorage({
        [STORAGE_AUTOSAVE_INTERVAL]: '0',
      })
      expect(storage.autosaveInterval).toBe(AUTOSAVE_MIN_INTERVAL)
    })

    it('should clamp a stored value above the maximum', () => {
      stubLocalStorage({
        [STORAGE_AUTOSAVE_INTERVAL]: '1000',
      })
      expect(storage.autosaveInterval).toBe(AUTOSAVE_MAX_INTERVAL)
    })

    it('should return the default when storage throws', () => {
      vi.stubGlobal('window', {
        localStorage: {
          getItem: () => {
            throw new Error('blocked')
          },
        },
      })
      expect(storage.autosaveInterval).toBe(AUTOSAVE_DEFAULT_INTERVAL)
    })
  })

  describe('introSeen', () => {
    it('should be false when nothing is stored', () => {
      stubLocalStorage({})
      expect(storage.introSeen).toBe(false)
    })

    it('should be true once stored as seen', () => {
      stubLocalStorage({
        [STORAGE_INTRO_SEEN]: 'true',
      })
      expect(storage.introSeen).toBe(true)
    })

    it('should be false when storage throws', () => {
      vi.stubGlobal('window', {
        localStorage: {
          getItem: () => {
            throw new Error('blocked')
          },
        },
      })
      expect(storage.introSeen).toBe(false)
    })
  })
})
