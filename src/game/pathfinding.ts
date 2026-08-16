import type { GameState } from './types'

/** Chebyshev distance (king-move distance). */
export function chebyshev(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
}

export interface PathNode {
  x: number
  y: number
}

/**
 * Pathfinding on the square grid using Chebyshev distance.
 * Uses BFS for reliable short-distance paths (sufficient for early game movement).
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
  return reconstructPath(state, startX, startY, goalX, goalY, maxSteps)
}

/** Reliable BFS-style path for short distances. */
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
