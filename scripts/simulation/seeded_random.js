// Seeded random numbers for the balance simulation, so the same seed always plays the same game.

/**
 * Creates a deterministic pseudo-random number generator (mulberry32).
 * @param {number} seed - Integer seed (only the low 32 bits are used)
 * @returns {function(): number} Generator returning floats in [0, 1), like Math.random
 */
export function createSeededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6D2B79F5) >>> 0
    let mixed = value
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
