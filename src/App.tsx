import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useState, useCallback } from 'react'
import { createInitialState, endTurn } from './game'
import { findPath, isReachable, chebyshev } from './game/pathfinding'
import { resolveCombat, canAttack } from './game/combat'
import { PolytopiaWorld } from './components/World/PolytopiaWorld'
import type { GameState } from './game/types'

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

  const currentPlayer = state.players[state.currentPlayerIndex]

  const tryMoveOrAttack = useCallback(
    (targetX: number, targetY: number) => {
      if (!selectedUnitId || state.gameOver) return
      const unit = state.units[selectedUnitId]
      if (!unit || unit.tribe !== currentPlayer.tribe || unit.acted) return

      // Check for enemy unit on target tile
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
          if (defender.health <= 0) {
            delete units[defender.id]
            // Remove from player unit list
            const players = prev.players.map((p) => {
              if (p.tribe === defender.tribe) {
                return {
                  ...p,
                  units: p.units.filter((id) => id !== defender.id),
                }
              }
              return p
            })
            return { ...prev, units, players }
          }
          units[defender.id] = defender
          return { ...prev, units }
        })
        setSelectedUnitId(null)
        return
      }

      // Movement
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

  const handleEndTurn = () => {
    setState((prev) => endTurn(prev))
    setSelectedUnitId(null)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
        />
      </Canvas>

      {/* HUD */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          color: '#eee',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          background: 'rgba(0,0,0,0.6)',
          padding: '10px 14px',
          borderRadius: 10,
          minWidth: 180,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Turn {state.turn}{state.mode === 'perfection' ? ` / ${state.maxTurns}` : ''}
        </div>
        <div>
          {currentPlayer.tribe.toUpperCase()} — ☆ {currentPlayer.stars}
        </div>
        <div style={{ opacity: 0.8, marginTop: 6, fontSize: 12 }}>
          {selectedUnitId
            ? 'Unit selected — click enemy to attack or empty tile to move'
            : 'Select one of your units'}
        </div>
        {state.gameOver && (
          <div style={{ marginTop: 8, color: '#ffd700', fontWeight: 700 }}>
            Winner: {state.winner?.toUpperCase()}
          </div>
        )}
      </div>

      <button
        onClick={handleEndTurn}
        disabled={state.gameOver}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          padding: '12px 22px',
          fontSize: 16,
          fontWeight: 600,
          background: state.gameOver ? '#555' : '#4a7c59',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          cursor: state.gameOver ? 'default' : 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        End Turn
      </button>
    </div>
  )
}

export default App
