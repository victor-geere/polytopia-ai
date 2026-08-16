import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useState, useCallback } from 'react'
import { createInitialState, endTurn, researchTech } from './game'
import { findPath, isReachable, chebyshev } from './game/pathfinding'
import { resolveCombat, canAttack } from './game/combat'
import { PolytopiaWorld } from './components/World/PolytopiaWorld'
import { HUD } from './components/UI/HUD'
import type { GameState, TechId } from './game/types'

function App() {
  const [state, setState] = useState<GameState>(() =>
    createInitialState({
      mode: 'perfection',
      mapWidth: 16,
      mapHeight: 16,
      tribes: ['imperius', 'bardur'],
    })
  )
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [showTech, setShowTech] = useState(false)

  const currentPlayer = state.players[state.currentPlayerIndex]

  const tryMoveOrAttack = useCallback(
    (targetX: number, targetY: number) => {
      if (!selectedUnitId || state.gameOver) return
      const unit = state.units[selectedUnitId]
      if (!unit || unit.tribe !== currentPlayer.tribe || unit.acted) return

      const enemy = Object.values(state.units).find(
        (u) => u.x === targetX && u.y === targetY && u.tribe !== unit.tribe && u.health > 0
      )

      if (enemy) {
        const dist = chebyshev(unit.x, unit.y, enemy.x, enemy.y)
        if (!canAttack(unit, enemy, dist)) return

        const tile = state.tiles[enemy.y][enemy.x]
        const { attacker, defender } = resolveCombat(unit, enemy, tile)

        setState((prev) => {
          const units = { ...prev.units }
          units[attacker.id] = attacker
          let players = prev.players
          if (defender.health <= 0) {
            delete units[defender.id]
            players = prev.players.map((p) =>
              p.tribe === defender.tribe
                ? { ...p, units: p.units.filter((id) => id !== defender.id) }
                : p
            )
          } else {
            units[defender.id] = defender
          }
          return { ...prev, units, players }
        })
        setSelectedUnitId(null)
        return
      }

      if (!isReachable(state, unit.x, unit.y, targetX, targetY, unit.movement)) return
      const path = findPath(state, unit.x, unit.y, targetX, targetY, unit.movement)
      if (!path) return

      setState((prev) => {
        const units = { ...prev.units }
        units[selectedUnitId] = {
          ...units[selectedUnitId],
          x: targetX,
          y: targetY,
          movement: 0,
          acted: true,
        }
        return { ...prev, units }
      })
      setSelectedUnitId(null)
    },
    [selectedUnitId, state, currentPlayer]
  )

  // Expose a simple way to click tiles via a global helper for now
  // (full tile raycasting can be added later)
  ;(window as any).__polytopiaTryAction = tryMoveOrAttack

  const handleEndTurn = () => {
    setState((prev) => endTurn(prev))
    setSelectedUnitId(null)
    setShowTech(false)
  }

  const handleResearch = (techId: TechId) => {
    setState((prev) => {
      const next = researchTech(prev, prev.currentPlayerIndex, techId)
      return next ?? prev
    })
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none' }}>
      <Canvas
        camera={{ position: [10, 16, 10], fov: 45, near: 0.1, far: 200 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={{ width: '100%', height: '100%' }}
        onPointerMissed={() => setSelectedUnitId(null)}
      >
        <color attach="background" args={['#1a1a2e']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[12, 25, 8]} intensity={1.15} />

        <Suspense fallback={null}>
          <PolytopiaWorld
            state={state}
            selectedUnitId={selectedUnitId}
            onSelectUnit={setSelectedUnitId}
          />
        </Suspense>

        <OrbitControls
          maxPolarAngle={Math.PI / 2.15}
          minDistance={6}
          maxDistance={45}
          target={[0, 0, 0]}
          enablePan={true}
          // Mobile-friendly damping
          enableDamping
          dampingFactor={0.12}
        />
      </Canvas>

      <HUD
        state={state}
        selectedUnitId={selectedUnitId}
        showTech={showTech}
        onToggleTech={() => setShowTech((v) => !v)}
        onEndTurn={handleEndTurn}
        onResearch={handleResearch}
      />
    </div>
  )
}

export default App
