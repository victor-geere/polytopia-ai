import type { Unit, Tile, TerrainType } from './types'

/** Terrain defense bonuses (simplified). */
const TERRAIN_DEFENSE: Partial<Record<TerrainType, number>> = {
  forest: 1.5,
  mountain: 2,
  land: 1,
  water: 0.8,
  ice: 1,
}

/**
 * Deterministic combat resolution matching the spirit of Polytopia.
 * Returns updated attacker and defender (health may reach 0).
 */
export function resolveCombat(
  attacker: Unit,
  defender: Unit,
  defenderTile: Tile
): { attacker: Unit; defender: Unit } {
  const defBonus = TERRAIN_DEFENSE[defenderTile.terrain] ?? 1

  // Simple formula inspired by the original game
  const attackForce = attacker.attack * (attacker.health / attacker.maxHealth)
  const defenseForce = defender.defense * (defender.health / defender.maxHealth) * defBonus

  const total = attackForce + defenseForce
  const attackResult = Math.round((attackForce / total) * attacker.attack * 4.5)
  const defenseResult = Math.round((defenseForce / total) * defender.defense * 4.5)

  const newDefenderHealth = Math.max(0, defender.health - attackResult)
  const newAttackerHealth = Math.max(0, attacker.health - defenseResult)

  const newAttacker: Unit = {
    ...attacker,
    health: newAttackerHealth,
    acted: true,
    movement: 0,
    veteran: attacker.veteran || (newDefenderHealth <= 0 && !attacker.veteran),
  }

  const newDefender: Unit = {
    ...defender,
    health: newDefenderHealth,
  }

  return { attacker: newAttacker, defender: newDefender }
}

export function canAttack(
  attacker: Unit,
  defender: Unit,
  distance: number
): boolean {
  if (attacker.tribe === defender.tribe) return false
  if (attacker.acted) return false
  if (attacker.health <= 0 || defender.health <= 0) return false
  return distance <= attacker.range
}
