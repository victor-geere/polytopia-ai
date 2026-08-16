import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { GameState, TerrainType } from '../../game/types'

const TERRAIN_COLORS: Record<TerrainType, string> = {
  land: '#4a7c59',
  water: '#2a6f8f',
  mountain: '#7a7a7a',
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

  const groups = useMemo(() => {
    const map: Record<TerrainType, { positions: Float32Array; count: number }> = {
      land: { positions: new Float32Array(0), count: 0 },
      water: { positions: new Float32Array(0), count: 0 },
      mountain: { positions: new Float32Array(0), count: 0 },
      forest: { positions: new Float32Array(0), count: 0 },
      ice: { positions: new Float32Array(0), count: 0 },
    }

    // First pass: counts
    const counts: Record<TerrainType, number> = {
      land: 0, water: 0, mountain: 0, forest: 0, ice: 0,
    }
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        counts[tiles[y][x].terrain]++
      }
    }

    // Allocate
    for (const t of Object.keys(counts) as TerrainType[]) {
      map[t] = { positions: new Float32Array(counts[t] * 3), count: counts[t] }
    }

    // Second pass: fill positions
    const cursors: Record<TerrainType, number> = {
      land: 0, water: 0, mountain: 0, forest: 0, ice: 0,
    }
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y][x]
        const t = tile.terrain
        const i = cursors[t] * 3
        map[t].positions[i] = (x - mapWidth / 2 + 0.5) * TILE_SIZE
        map[t].positions[i + 1] =
          t === 'mountain' ? 0.35 : t === 'water' ? -0.12 : 0
        map[t].positions[i + 2] = (y - mapHeight / 2 + 0.5) * TILE_SIZE
        cursors[t]++
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
  positions: Float32Array
  count: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const geometry = useMemo(() => {
    if (terrain === 'mountain') {
      return new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.7, TILE_SIZE * 0.92)
    }
    if (terrain === 'water') {
      return new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.18, TILE_SIZE * 0.98)
    }
    return new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.22, TILE_SIZE * 0.92)
  }, [terrain])

  // Set instance matrices after the mesh is mounted
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      dummy.position.set(positions[ix], positions[ix + 1], positions[ix + 2])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [positions, count])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={false}
    >
      <meshStandardMaterial
        color={TERRAIN_COLORS[terrain]}
        flatShading
        roughness={0.85}
        metalness={0.05}
      />
    </instancedMesh>
  )
}
