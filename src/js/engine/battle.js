// Battle math — pure, deterministic functions shared by the raid forecast and the raid resolution.

import {RAID_DEFEAT_DEFENSE_LEVEL_SHARE, RAID_DEFEAT_MAX_LEVELS, RAID_DEFEAT_MAX_RESOURCES, RAID_DEFEAT_MAX_WORKERS, TOWER_ARCHERS_PER_LEVEL, UNIT_COUNTER_MULTIPLIER, UNIT_STATS, WALL_HEALTH_PER_LEVEL} from '@/js/engine/balancing.js'
import {UNIT_COUNTERS, UNIT_TYPES} from '@/js/engine/constants.js'
import {UNIT_ARCHER} from '@/js/engine/enums.js'

/**
 * Health of each unit type in an army.
 * @param {Object<string, number>} units - Unit count per type
 * @param {number} defenseBonus - Fractional health bonus (research for the colony, yearly for raiders)
 * @returns {Object<string, number>} Health per unit type
 */
function healthByType(units, defenseBonus) {
  const health = {}
  for (const type of UNIT_TYPES) {
    health[type] = (units[type] ?? 0) * UNIT_STATS[type].health * (1 + defenseBonus)
  }
  return health
}

/**
 * Share of the total held by each unit type.
 * @param {Object<string, number>} health - Health per unit type
 * @returns {Object<string, number>} Share (0–1) per unit type; all 0 when the total is 0
 */
function sharesFromHealth(health) {
  let total = 0
  for (const type of UNIT_TYPES) {
    total += health[type]
  }
  const shares = {}
  for (const type of UNIT_TYPES) {
    shares[type] = total > 0 ? health[type] / total : 0
  }
  return shares
}

/**
 * Share of an army's unit health held by each unit type.
 * @param {Object<string, number>} units - Unit count per type
 * @param {number} defenseBonus - Fractional health bonus (research for the colony, yearly for raiders)
 * @returns {Object<string, number>} Share (0–1) per unit type; all 0 for an empty army
 */
function healthShares(units, defenseBonus) {
  return sharesFromHealth(healthByType(units, defenseBonus))
}

/**
 * Attack multiplier of a unit type against an opponent. Grows with the share of the
 * opponent's unit health made of the type it beats, up to UNIT_COUNTER_MULTIPLIER.
 * @param {string} type - Attacking unit type
 * @param {Object<string, number>} opponentShares - Opponent health share per unit type
 * @returns {number} Multiplier between 1 and UNIT_COUNTER_MULTIPLIER
 */
function counterFactor(type, opponentShares) {
  return 1 + (UNIT_COUNTER_MULTIPLIER - 1) * opponentShares[UNIT_COUNTERS[type]]
}

/**
 * Total health of an army's units (the wall is not included).
 * @param {Object<string, number>} units - Unit count per type
 * @param {number} [defenseBonus=0] - Fractional health bonus (research for the colony, yearly for raiders)
 * @returns {number} Summed unit health
 */
export function armyHealth(units, defenseBonus = 0) {
  const health = healthByType(units, defenseBonus)
  let total = 0
  for (const type of UNIT_TYPES) {
    total += health[type]
  }
  return total
}

/**
 * Total attack of an army's units against an opponent with the given mix, counter bonuses included.
 * @param {Object<string, number>} units - Unit count per type
 * @param {number} attackBonus - Fractional attack bonus (research for the colony, yearly for raiders)
 * @param {Object<string, number>} opponentShares - Opponent health share per unit type
 * @returns {number} Summed attack
 */
function attackAgainst(units, attackBonus, opponentShares) {
  let total = 0
  for (const type of UNIT_TYPES) {
    total += (units[type] ?? 0) * UNIT_STATS[type].attack * (1 + attackBonus) * counterFactor(type, opponentShares)
  }
  return total
}

/**
 * Total attack of an army's units against an opponent, counter bonuses included (the tower is not included).
 * @param {Object<string, number>} units - Unit count per type
 * @param {number} attackBonus - Fractional attack bonus (research for the colony, yearly for raiders)
 * @param {Object<string, number>} opponentUnits - Opponent unit count per type
 * @param {number} [opponentDefenseBonus=0] - Opponent's fractional health bonus
 * @returns {number} Summed attack
 */
export function armyAttack(units, attackBonus, opponentUnits, opponentDefenseBonus = 0) {
  return attackAgainst(units, attackBonus, healthShares(opponentUnits, opponentDefenseBonus))
}

/**
 * Resolves a raid in one step by comparing both sides' power (attack × health, Lanchester square law).
 * The defender's wall adds health that soaks losses first and wears down by the damage it absorbs; the tower fights as a
 * fixed number of archers per level, adding their attack and health, sharing losses with the units and
 * never dying in the fight, so a tower alone can defend. Its archers count as archers in the colony's mix, so raider
 * cavalry gets its counter bonus against them. Research bonuses apply to defender units only; the
 * raiders have their own bonuses, which grow with the year.
 *
 * | Fight                            | Ratio | Result                   |
 * |----------------------------------|-------|--------------------------|
 * | 10 infantry vs 9 infantry        | 1.11  | Victory, 6 infantry lost |
 * | Same, plus a level 1 wall        | 1.28  | Victory, 2 infantry lost |
 * | 10 archers vs 10 infantry        | 1.41  | Victory                  |
 * | No units and no tower (any wall) | 0     | Defeat at severity 1     |
 *
 * @param {Object} defender - The colony's side
 * @param {Object<string, number>} defender.units - Unit count per type
 * @param {number} defender.wallLevel - Wall level
 * @param {number} defender.towerLevel - Tower level
 * @param {number} defender.attackBonus - Fractional unit attack bonus
 * @param {number} defender.defenseBonus - Fractional unit health bonus
 * @param {number} defender.workers - Colony worker total (for the workers lost on defeat)
 * @param {Object} attacker - The raiders
 * @param {Object<string, number>} attacker.units - Unit count per type
 * @param {number} [attacker.attackBonus=0] - Fractional raider attack bonus
 * @param {number} [attacker.defenseBonus=0] - Fractional raider health bonus
 * @returns {{victory: boolean, ratio: number, playerPower: number, enemyPower: number, unitsLost: Object<string, number>, severity: number, resourceShare: number, workersLost: number, levelsLost: number, wallLevelsLost: number, towerLevelsLost: number}}
 *   Outcome; ratio > 1 is a victory, severity (0–1) scales the defeat losses. The wall and the tower lose levels
 *   in either outcome: a level per full WALL_HEALTH_PER_LEVEL of damage the wall absorbed and per full
 *   tower-level health the tower's archers took, or half their levels (rounded up) on a defeat
 */
export function resolveBattle(defender, attacker) {
  const {
    units, wallLevel, towerLevel, attackBonus, defenseBonus, workers,
  } = defender
  const {
    attackBonus: enemyAttackBonus = 0, defenseBonus: enemyDefenseBonus = 0,
  } = attacker
  const enemyShares = healthShares(attacker.units, enemyDefenseBonus)

  const unitHealth = armyHealth(units, defenseBonus)
  const wallHealth = wallLevel * WALL_HEALTH_PER_LEVEL
  const towerArchers = towerLevel * TOWER_ARCHERS_PER_LEVEL
  const towerAttack = towerArchers * UNIT_STATS[UNIT_ARCHER].attack * counterFactor(UNIT_ARCHER, enemyShares)
  const towerHealth = towerArchers * UNIT_STATS[UNIT_ARCHER].health
  const playerAttack = armyAttack(units, attackBonus, attacker.units, 0) + towerAttack
  const playerHealth = unitHealth + wallHealth + towerHealth
  const playerPower = playerAttack * playerHealth
  // The tower's archers are part of the colony's mix that sets the raiders' counter bonus
  const defenderHealth = healthByType(units, defenseBonus)
  defenderHealth[UNIT_ARCHER] += towerHealth
  const enemyPower = attackAgainst(attacker.units, enemyAttackBonus, sharesFromHealth(defenderHealth)) * armyHealth(attacker.units, enemyDefenseBonus)

  const unitsLost = {}
  for (const type of UNIT_TYPES) {
    unitsLost[type] = 0
  }
  const victoryResult = {
    victory: true,
    playerPower: playerPower,
    enemyPower: enemyPower,
    unitsLost: unitsLost,
    severity: 0,
    resourceShare: 0,
    workersLost: 0,
    levelsLost: 0,
    wallLevelsLost: 0,
    towerLevelsLost: 0,
  }

  // No raiders to fight (cannot normally happen)
  if (enemyPower === 0) {
    return {
      ...victoryResult,
      ratio: Infinity,
    }
  }

  const ratio = Math.sqrt(playerPower / enemyPower)

  if (ratio > 1) {
    // The wall soaks the lost health first; units and the tower's archers share the rest by health,
    // and units lose their share in proportion to their numbers (the tower's archers never die)
    const lossShare = 1 - Math.sqrt(Math.max(0, 1 - 1 / (ratio * ratio)))
    const healthLost = lossShare * playerHealth
    const absorbed = Math.min(healthLost, wallHealth)
    for (const type of UNIT_TYPES) {
      const count = units[type] ?? 0
      unitsLost[type] = unitHealth > 0 ? Math.min(count, Math.round(count * (healthLost - absorbed) / (unitHealth + towerHealth))) : 0
    }
    // Each defense loses a level per full level of health it took; the tower's archers take their share of what the wall left
    const towerDamage = unitHealth + towerHealth > 0 ? (healthLost - absorbed) * towerHealth / (unitHealth + towerHealth) : 0
    return {
      ...victoryResult,
      ratio: ratio,
      wallLevelsLost: Math.min(wallLevel, Math.floor(absorbed / WALL_HEALTH_PER_LEVEL)),
      towerLevelsLost: Math.min(towerLevel, Math.floor(towerDamage / (TOWER_ARCHERS_PER_LEVEL * UNIT_STATS[UNIT_ARCHER].health))),
    }
  }

  // Defeat: the whole army is lost; other losses scale from 0 (near tie) to 1 (no defense)
  const severity = Math.sqrt(Math.max(0, 1 - ratio * ratio))
  for (const type of UNIT_TYPES) {
    unitsLost[type] = units[type] ?? 0
  }
  return {
    victory: false,
    ratio: ratio,
    playerPower: playerPower,
    enemyPower: enemyPower,
    unitsLost: unitsLost,
    severity: severity,
    resourceShare: severity * RAID_DEFEAT_MAX_RESOURCES,
    workersLost: Math.round(severity * RAID_DEFEAT_MAX_WORKERS * workers),
    levelsLost: Math.round(severity * RAID_DEFEAT_MAX_LEVELS),
    wallLevelsLost: Math.ceil(wallLevel * RAID_DEFEAT_DEFENSE_LEVEL_SHARE),
    towerLevelsLost: Math.ceil(towerLevel * RAID_DEFEAT_DEFENSE_LEVEL_SHARE),
  }
}
