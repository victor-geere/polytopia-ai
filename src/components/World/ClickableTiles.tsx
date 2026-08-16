import { useMemo } from 'react'
import * as THREE from 'three'
import type { GameState } from '../../game/types'
import { isReachable } from '../../game/pathfinding'
import { enemyTilesInRange } from '../../game/combat'

const TILE_SIZE = 1

interface Props {
  state: GameState
  selectedUnitId: string | null
  onTileClick: (x: number, y: number) => void
}

/**
 * Raycast plane + movement (gold) and attack-range (red) highlights.
 */
export function ClickableTiles({ state, selectedUnitId, onTileClick }: Props) {
  const { mapWidth, mapHeight } = state

  const selectedUnit = selectedUnitId ? state.units[selectedUnitId] : null

  const reachable = useMemo(() => {
    if (!selectedUnit || selectedUnit.acted) return [] as { x: number; y: number }[]
    const cells: { x: number; y: number }[] = []
    const range = selectedUnit.movement
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue
        const tx = selectedUnit.x + dx
        const ty = selectedUnit.y + dy
        if (tx < 0 || ty < 0 || tx >= mapWidth || ty >= mapHeight) continue
        if (isReachable(state, selectedUnit.x, selectedUnit.y, tx, ty, range)) {
          cells.push({ x: tx, y: ty })
        }
      }
    }
    return cells
  }, [selectedUnit, state, mapWidth, mapHeight])

  const attackTargets = useMemo(() => {
    if (!selectedUnit || selectedUnit.acted) return [] as { x: number; y: number }[]
    return enemyTilesInRange(selectedUnit, state.units, mapWidth, mapHeight)
  }, [selectedUnit, state.units, mapWidth, mapHeight])

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    const point: THREE.Vector3 = e.point
    const tileX = Math.floor(point.x / TILE_SIZE + mapWidth / 2)
    const tileY = Math.floor(point.z / TILE_SIZE + mapHeight / 2)
    if (tileX < 0 || tileY < 0 || tileX >= mapWidth || tileY >= mapHeight) return
    onTileClick(tileX, tileY)
  }

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.2, 0]}
        onPointerDown={handlePointerDown}
      >
        <planeGeometry args={[mapWidth * TILE_SIZE, mapHeight * TILE_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {reachable.map(({ x, y }) => {
        const wx = (x - mapWidth / 2 + 0.5) * TILE_SIZE
        const wz = (y - mapHeight / 2 + 0.5) * TILE_SIZE
        return (
          <mesh
            key={`m-${x},${y}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[wx, 0.28, wz]}
            onPointerDown={(e) => {
              e.stopPropagation()
              onTileClick(x, y)
            }}
          >
            <planeGeometry args={[TILE_SIZE * 0.85, TILE_SIZE * 0.85]} />
            <meshBasicMaterial
              color="#ffd700"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* Attack range — red rings under enemy tiles in range (esp. archers range 2) */}
      {attackTargets.map(({ x, y }) => {
        const wx = (x - mapWidth / 2 + 0.5) * TILE_SIZE
        const wz = (y - mapHeight / 2 + 0.5) * TILE_SIZE
        return (
          <mesh
            key={`a-${x},${y}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[wx, 0.3, wz]}
            onPointerDown={(e) => {
              e.stopPropagation()
              onTileClick(x, y)
            }}
          >
            <ringGeometry args={[0.28, 0.42, 20]} />
            <meshBasicMaterial
              color="#e74c3c"
              transparent
              opacity={0.75}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
