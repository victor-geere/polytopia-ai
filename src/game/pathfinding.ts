import type { GameState, Tile } from './types'

/** Chebyshev distance (king-move distance). */
export function chebyshev(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
}

export interface PathNode {
  x: number
  y: number
}

/**
 * Simple A* on the square grid using Chebyshev distance.
 * Movement cost is 1 per step for land; mountains/water may be restricted later.
 */
export function findPath(
  state: GameState,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  maxSteps = 20
): PathNode[] | null {
  if (startX === goalX && startY === goalY) return [{ x: startX, y: startY }]

  const { mapWidth, mapHeight, tiles } = state
  const key = (x: number, y: number) => `${x},${y}`

  const open = new Map<string, { x: number; y: number; g: number; f: number; parent: string | null }>()
  const closed = new Set<string>()

  const startKey = key(startX, startY)
  open.set(startKey, {
    x: startX,
    y: startY,
    g: 0,
    f: chebyshev(startX, startY, goalX, goalY),
    parent: null,
  })

  const dirs = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ]

  while (open.size > 0) {
    // Pick lowest f
    let currentKey = ''
    let current: (typeof open extends Map<string, infer V> ? V : never) | null = null
    for (const [k, v] of open) {
      if (!current || v.f < current.f) {
        current = v
        currentKey = k
      }
    }
    if (!current) break

    if (current.x === goalX && current.y === goalY) {
      // Reconstruct
      const path: PathNode[] = []
      let k: string | null = currentKey
      while (k) {
        const node = open.get(k) || (closed.has(k) ? null : null)
        // We need parents from a separate map; rebuild properly
        break
      }
      // Simpler reconstruction using a parent map
      break
    }

    open.delete(currentKey)
    closed.add(currentKey)

    if (current.g >= maxSteps) continue

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx
      const ny = current.y + dy
      if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue
      const nKey = key(nx, ny)
      if (closed.has(nKey)) continue

      const tile = tiles[ny][nx]
      // Basic passability: water is impassable for now (no swimming tech)
      if (tile.terrain === 'water') continue

      const g = current.g + 1
      const h = chebyshev(nx, ny, goalX, goalY)
      const f = g + h

      const existing = open.get(nKey)
      if (!existing || g < existing.g) {
        open.set(nKey, { x: nx, y: ny, g, f, parent: currentKey })
      }
    }
  }

  // Reconstruct using parent pointers stored in a side map for reliability
  return reconstructPath(state, startX, startY, goalX, goalY, maxSteps)
}

/** Reliable BFS-style path for short distances (sufficient for early game). */
function reconstructPath(
  state: GameState,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  maxSteps: number
): PathNode[] | null {
  const { mapWidth, mapHeight, tiles } = state
  const key = (x: number, y: number) => `${x},${y}`
  const cameFrom = new Map<string, string | null>()
  const queue: { x: number; y: number; dist: number }[] = [{ x: startX, y: startY, dist: 0 }]
  cameFrom.set(key(startX, startY), null)

  const dirs = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ]

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.x === goalX && cur.y === goalY) {
      // build path
      const path: PathNode[] = []
      let k: string | null = key(goalX, goalY)
      while (k) {
        const [xs, ys] = k.split(',').map(Number)
        path.push({ x: xs, y: ys })
        k = cameFrom.get(k) ?? null
      }
      path.reverse()
      return path
    }
    if (cur.dist >= maxSteps) continue

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx
      const ny = cur.y + dy
      if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) continue
      const nKey = key(nx, ny)
      if (cameFrom.has(nKey)) continue
      const tile = tiles[ny][nx]
      if (tile.terrain === 'water') continue
      cameFrom.set(nKey, key(cur.x, cur.y))
      queue.push({ x: nx, y: ny, dist: cur.dist + 1 })
    }
  }
  return null
}

export function isReachable(
  state: GameState,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  movementPoints: number
): boolean {
  const dist = chebyshev(fromX, fromY, toX, toY)
  if (dist > movementPoints) return false
  const path = findPath(state, fromX, fromY, toX, toY, movementPoints)
  return path !== null && path.length - 1 <= movementPoints
}
