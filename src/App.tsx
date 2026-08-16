import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useState } from 'react'
import { createInitialState } from './game'
import { PolytopiaWorld } from './components/World/PolytopiaWorld'
import type { GameState } from './game/types'

/**
 * Phase 3: 3D World foundation.
 * - Mobile-friendly Canvas
 * - Procedural instanced tile grid driven by pure GameState
 * - three-bvh-csg demo feature
 */
function App() {
  const [state] = useState<GameState>(() =>
    createInitialState({
      mode: 'perfection',
      mapWidth: 16,
      mapHeight: 16,
      tribes: ['imperius', 'bardur'],
    })
  )

  return (
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
    >
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[12, 25, 8]} intensity={1.15} />

      <Suspense fallback={null}>
        <PolytopiaWorld state={state} />
      </Suspense>

      <OrbitControls
        maxPolarAngle={Math.PI / 2.15}
        minDistance={6}
        maxDistance={45}
        target={[0, 0, 0]}
        enablePan={true}
      />
    </Canvas>
  )
}

export default App
