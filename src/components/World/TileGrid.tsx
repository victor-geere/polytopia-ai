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

/** Warm gold tint applied to the tile mesh itself when reachable */
const MOVE_HIGHLIGHT = new THREE.Color('#e8c84a')

const TILE_SIZE = 1

interface TileGridProps {
  state: GameState
  /** Set of "x,y" keys that should be tinted as move targets */
  reachableKeys?: Set<string>
}

/**
 * Renders the square map using InstancedMesh for performance.
 * Reachable tiles get their instance color shifted to gold (no separate overlay).
 */
export function TileGrid({ state, reachableKeys }: TileGridProps) {
  const { tiles, mapWidth, mapHeight } = state

  const groups = useMemo(() => {
    type Group = {
      positions: Float32Array
      coords: { x: number; y: number }[]
      count: number
    }
    const map: Record<TerrainType, Group> = {
      land: { positions: new Float32Array(0), coords: [], count: 0 },
      water: { positions: new Float32Array(0), coords: [], count: 0 },
      mountain: { positions: new Float32Array(0), coords: [], count: 0 },
      forest: { positions: new Float32Array(0), coords: [], count: 0 },
      ice: { positions: new Float32Array(0), coords: [], count: 0 },
    }

    const counts: Record<TerrainType, number> = {
      land: 0, water: 0, mountain: 0, forest: 0, ice: 0,
    }
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        counts[tiles[y][x].terrain]++
      }
    }

    for (const t of Object.keys(counts) as TerrainType[]) {
      map[t] = {
        positions: new Float32Array(counts[t] * 3),
        coords: new Array(counts[t]),
        count: counts[t],
      }
    }

    const cursors: Record<TerrainType, number> = {
      land: 0, water: 0, mountain: 0, forest: 0, ice: 0,
    }
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y][x]
        const t = tile.terrain
        const i = cursors[t]
        const pi = i * 3
        map[t].positions[pi] = (x - mapWidth / 2 + 0.5) * TILE_SIZE
        map[t].positions[pi + 1] =
          t === 'mountain' ? 0.35 : t === 'water' ? -0.12 : 0
        map[t].positions[pi + 2] = (y - mapHeight / 2 + 0.5) * TILE_SIZE
        map[t].coords[i] = { x, y }
        cursors[t]++
      }
    }

    return map
  }, [tiles, mapWidth, mapHeight])

  const groundW = mapWidth * TILE_SIZE + 4
  const groundH = mapHeight * TILE_SIZE + 4

  return (
    <group>
      {/* Brown earth base under the whole map */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow={false}>
        <planeGeometry args={[groundW, groundH]} />
        <meshStandardMaterial color="#6b4423" flatShading roughness={1} metalness={0} />
      </mesh>
      {/* Slightly thicker dirt slab so edges read in perspective */}
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[groundW, 0.4, groundH]} />
        <meshStandardMaterial color="#5a3820" flatShading roughness={1} />
      </mesh>

      {(Object.keys(groups) as TerrainType[]).map((terrain) => {
        const g = groups[terrain]
        if (g.count === 0) return null
        return (
          <TerrainInstances
            key={terrain}
            terrain={terrain}
            positions={g.positions}
            coords={g.coords}
            count={g.count}
            reachableKeys={reachableKeys}
          />
        )
      })}
    </group>
  )
}

function TerrainInstances({
  terrain,
  positions,
  coords,
  count,
  reachableKeys,
}: {
  terrain: TerrainType
  positions: Float32Array
  coords: { x: number; y: number }[]
  count: number
  reachableKeys?: Set<string>
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const baseColor = useMemo(() => new THREE.Color(TERRAIN_COLORS[terrain]), [terrain])

  const geometry = useMemo(() => {
    if (terrain === 'mountain') {
      return new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.7, TILE_SIZE * 0.92)
    }
    if (terrain === 'water') {
      return new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.18, TILE_SIZE * 0.98)
    }
    return new THREE.BoxGeometry(TILE_SIZE * 0.92, 0.22, TILE_SIZE * 0.92)
  }, [terrain])

  // Matrices once positions change
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

  // Per-instance colors: gold when reachable, terrain color otherwise
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    // Ensure instanceColor buffer exists
    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(count * 3),
        3
      )
    }

    for (let i = 0; i < count; i++) {
      const { x, y } = coords[i]
      const key = `${x},${y}`
      if (reachableKeys?.has(key)) {
        mesh.setColorAt(i, MOVE_HIGHLIGHT)
      } else {
        mesh.setColorAt(i, baseColor)
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [coords, count, reachableKeys, baseColor])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={false}
    >
      <meshStandardMaterial
        // Base color is overridden per-instance via instanceColor
        color="#ffffff"
        flatShading
        roughness={0.85}
        metalness={0.05}
      />
    </instancedMesh>
  )
}
