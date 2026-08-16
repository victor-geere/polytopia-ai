import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useState, useCallback } from 'react'
import { createInitialState, endTurn } from './game'
import { findPath, isReachable } from './game/pathfinding'
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

  const handleTileClick = useCallback(
    (x: number, y: number) => {
      if (!selectedUnitId || state.gameOver) return
      const unit = state.units[selectedUnitId]
      if (!unit || unit.tribe !== currentPlayer.tribe || unit.acted) return

      if (!isReachable(state, unit.x, unit.y, x, y, unit.movement)) return

      const path = findPath(state, unit.x, unit.y, x, y, unit.movement)
      if (!path) return

      // Apply move in pure state
      setState((prev) => {
        const units = { ...prev.units }
        const moved = {
          ...units[selectedUnitId],
          x,
          y,
          movement: 0,
          acted: true,
        }
        units[selectedUnitId] = moved
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

      {/* Minimal debug HUD for Phase 4 */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          color: '#eee',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          background: 'rgba(0,0,0,0.55)',
          padding: '8px 12px',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      >
        <div>Turn {state.turn} / {state.maxTurns}</div>
        <div>
          {currentPlayer.tribe.toUpperCase()} — ☆ {currentPlayer.stars}
        </div>
        <div style={{ opacity: 0.75, marginTop: 4 }}>
          {selectedUnitId ? `Selected: ${selectedUnitId}` : 'Tap a unit to select'}
        </div>
      </div>

      <button
        onClick={handleEndTurn}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          padding: '12px 20px',
          fontSize: 16,
          fontWeight: 600,
          background: '#4a7c59',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        End Turn
      </button>
    </div>
  )
}

export default App
