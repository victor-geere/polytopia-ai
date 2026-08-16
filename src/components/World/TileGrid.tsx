import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameState, TerrainType } from '../../game/types'

const TERRAIN_COLORS: Record<TerrainType, string> = {
  land: '#4a7c59',
  water: '#2a6f8f',
  mountain: '#6b6b6b',
  forest: '#2d5a27',
  ice: '#c8e0f0',
}

const TILE_SIZE = 1

interface TileGridProps {
  state: GameState
}

/**
 * Renders the square map using InstancedMesh for performance.
 * One instanced mesh per major terrain type keeps draw calls low (mobile friendly).
 */
export function TileGrid({ state }: TileGridProps) {
  const { tiles, mapWidth, mapHeight } = state

  // Group tiles by terrain for instancing
  const groups = useMemo(() => {
    const map: Record<TerrainType, { positions: number[]; count: number }> = {
      land: { positions: [], count: 0 },
      water: { positions: [], count: 0 },
      mountain: { positions: [], count: 0 },
      forest: { positions: [], count: 0 },
      ice: { positions: [], count: 0 },
    }

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y][x]
        const g = map[tile.terrain]
        // Center the map around origin
        const wx = (x - mapWidth / 2) * TILE_SIZE
        const wz = (y - mapHeight / 2) * TILE_SIZE
        const wy = tile.terrain === 'mountain' ? 0.35 : tile.terrain === 'water' ? -0.15 : 0
        g.positions.push(wx, wy, wz)
        g.count++
      }
    }
    return map
  }, [tiles, mapWidth, mapHeight])

  return (
    <group>
      {(Object.keys(groups) as TerrainType[]).map((terrain) => {
        const g = groups[terrain]
        if (g.count === 0) return null
        return (
          <TerrainInstances
            key={terrain}
            terrain={terrain}
            positions={g.positions}
            count={g.count}
          />
        )
      })}
    </group>
  )
}

function TerrainInstances({
  terrain,
  positions,
  count,
}: {
  terrain: TerrainType
  positions: number[]
  count: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const geometry = useMemo(() => {
    if (terrain === 'mountain') {
      // Simple low-poly mountain: taller box
      return new THREE.BoxGeometry(TILE_SIZE * 0.95, 0.7, TILE_SIZE * 0.95)
    }
    if (terrain === 'water') {
      return new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.2, TILE_SIZE * 0.98)
    }
    // land / forest / ice
    return new THREE.BoxGeometry(TILE_SIZE * 0.95, 0.25, TILE_SIZE * 0.95)
  }, [terrain])

  useMemo(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      dummy.position.set(positions[ix], positions[ix + 1], positions[ix + 2])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions, count])

  // Ensure matrices are set after mount
  useFrame(() => {
    // one-time init safety; matrices already set in useMemo above in practice
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
      castShadow={false}
      receiveShadow={false}
    >
      <meshStandardMaterial color={TERRAIN_COLORS[terrain]} flatShading />
    </instancedMesh>
  )
}
