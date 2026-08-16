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

const MOVE_HIGHLIGHT = new THREE.Color('#e8c84a')

const TILE_SIZE = 1
/** Top face size (same visual footprint as before) */
const TOP_SIZE = TILE_SIZE * 0.92
/** Bottom face size — full cell so neighboring bases touch */
const BOTTOM_SIZE = TILE_SIZE

interface TileGridProps {
  state: GameState
  reachableKeys?: Set<string>
}

/**
 * Square frustum (bevelled block): larger base, smaller top.
 * Bases of adjacent tiles touch; tops keep the previous inset look.
 */
function createBevelledBox(topSize: number, bottomSize: number, height: number): THREE.BufferGeometry {
  const ht = topSize / 2
  const hb = bottomSize / 2
  const hy = height / 2

  // 8 corners: 0-3 bottom, 4-7 top (CCW from +Z)
  const positions = new Float32Array([
    // bottom
    -hb, -hy,  hb,
     hb, -hy,  hb,
     hb, -hy, -hb,
    -hb, -hy, -hb,
    // top
    -ht,  hy,  ht,
     ht,  hy,  ht,
     ht,  hy, -ht,
    -ht,  hy, -ht,
  ])

  // Non-indexed faces with per-face normals (flat shading)
  const faces: number[][] = [
    [0, 1, 5, 4], // +Z
    [1, 2, 6, 5], // +X
    [2, 3, 7, 6], // -Z
    [3, 0, 4, 7], // -X
    [4, 5, 6, 7], // +Y top
    [0, 3, 2, 1], // -Y bottom
  ]

  const verts: number[] = []
  const norms: number[] = []

  for (const face of faces) {
    const [a, b, c, d] = face
    const ax = positions[a * 3], ay = positions[a * 3 + 1], az = positions[a * 3 + 2]
    const bx = positions[b * 3], by = positions[b * 3 + 1], bz = positions[b * 3 + 2]
    const cx = positions[c * 3], cy = positions[c * 3 + 1], cz = positions[c * 3 + 2]

    const e1x = bx - ax, e1y = by - ay, e1z = bz - az
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az
    let nx = e1y * e2z - e1z * e2y
    let ny = e1z * e2x - e1x * e2z
    let nz = e1x * e2y - e1y * e2x
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len
    ny /= len
    nz /= len

    // two triangles: a-b-c and a-c-d
    for (const idx of [a, b, c, a, c, d]) {
      verts.push(positions[idx * 3], positions[idx * 3 + 1], positions[idx * 3 + 2])
      norms.push(nx, ny, nz)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3))
  return geo
}

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
        // Water slightly lower; mountain higher; land/forest/ice sit on the base
        map[t].positions[pi + 1] =
          t === 'mountain' ? 0.4 : t === 'water' ? -0.05 : 0.05
        map[t].positions[pi + 2] = (y - mapHeight / 2 + 0.5) * TILE_SIZE
        map[t].coords[i] = { x, y }
        cursors[t]++
      }
    }

    return map
  }, [tiles, mapWidth, mapHeight])

  // Single ground mesh — avoids plane+box z-fighting flicker
  const groundW = mapWidth * TILE_SIZE + 6
  const groundH = mapHeight * TILE_SIZE + 6

  return (
    <group>
      <mesh position={[0, -0.45, 0]}>
        <boxGeometry args={[groundW, 0.5, groundH]} />
        <meshStandardMaterial
          color="#6b4423"
          flatShading
          roughness={1}
          metalness={0}
          // Push base slightly back in depth buffer vs tile bottoms
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
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
      // Taller frustum, still bevelled
      return createBevelledBox(TOP_SIZE * 0.95, BOTTOM_SIZE, 0.75)
    }
    if (terrain === 'water') {
      return createBevelledBox(TOP_SIZE, BOTTOM_SIZE, 0.2)
    }
    // land / forest / ice — bevelled grass-style blocks
    return createBevelledBox(TOP_SIZE, BOTTOM_SIZE, 0.28)
  }, [terrain])

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

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

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
        color="#ffffff"
        flatShading
        roughness={0.85}
        metalness={0.05}
      />
    </instancedMesh>
  )
}
