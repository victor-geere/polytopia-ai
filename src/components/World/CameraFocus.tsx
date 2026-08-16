import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameState } from '../../game/types'

const TILE_SIZE = 1

interface Props {
  state: GameState
  /** Bumps when the active player changes so we re-focus. */
  focusKey: number
}

/**
 * Smoothly pans OrbitControls target (and camera offset) toward the
 * centroid of the current player's units/cities after each turn.
 */
export function CameraFocus({ state, focusKey }: Props) {
  const { controls } = useThree() as { controls: any }
  const goal = useRef(new THREE.Vector3(0, 0, 0))
  const animating = useRef(false)

  useEffect(() => {
    const player = state.players[state.currentPlayerIndex]
    if (!player) return

    let sx = 0
    let sz = 0
    let n = 0

    for (const id of player.units) {
      const u = state.units[id]
      if (!u) continue
      sx += (u.x - state.mapWidth / 2 + 0.5) * TILE_SIZE
      sz += (u.y - state.mapHeight / 2 + 0.5) * TILE_SIZE
      n++
    }
    for (const id of player.cities) {
      const c = state.cities[id]
      if (!c) continue
      sx += (c.x - state.mapWidth / 2 + 0.5) * TILE_SIZE
      sz += (c.y - state.mapHeight / 2 + 0.5) * TILE_SIZE
      n++
    }

    if (n === 0) return
    goal.current.set(sx / n, 0, sz / n)
    animating.current = true
  }, [focusKey, state])

  useFrame((_, dt) => {
    if (!animating.current || !controls) return

    const target = controls.target as THREE.Vector3
    const cam = controls.object as THREE.Camera

    // Lerp look-at target
    target.lerp(goal.current, Math.min(1, dt * 3.5))

    // Keep the same camera offset relative to target by sliding the camera
    const offset = new THREE.Vector3().subVectors(cam.position, target)
    // Recompute desired camera position = goal + same offset direction/length from previous frame is messy;
    // instead gently pull camera so it looks at the new target while preserving distance.
    const desired = goal.current.clone().add(
      new THREE.Vector3(8, 11, 8).normalize().multiplyScalar(
        cam.position.distanceTo(target) || 16
      )
    )
    // Simpler: move camera by the same delta as target movement this frame
    // (already handled roughly by OrbitControls when target moves if we call update)

    // Nudge camera toward a comfortable offset from the goal
    const comfortable = new THREE.Vector3(
      goal.current.x + 9,
      12,
      goal.current.z + 9
    )
    cam.position.lerp(comfortable, Math.min(1, dt * 2.2))

    controls.update?.()

    if (target.distanceTo(goal.current) < 0.08) {
      target.copy(goal.current)
      animating.current = false
    }

    // silence unused
    void offset
  })

  return null
}
