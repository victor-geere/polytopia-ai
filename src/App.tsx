import { Canvas } from '@react-three/fiber'
import { OrbitControls, Box } from '@react-three/drei'
import { Suspense } from 'react'

/**
 * Phase 1 foundation scene.
 * - Mobile-friendly Canvas settings (dpr cap, no antialias, high-performance preference)
 * - Adaptive performance enabled
 * - Simple scene to verify R3F works
 */
function App() {
  return (
    <Canvas
      camera={{ position: [8, 12, 8], fov: 45, near: 0.1, far: 200 }}
      dpr={[1, 1.5]} // Cap pixel ratio for mobile
      performance={{ min: 0.5 }} // Adaptive performance
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.1}
        castShadow={false} // shadows off by default for mobile
      />

      <Suspense fallback={null}>
        {/* Placeholder geometry — will be replaced by tile grid in Phase 3 */}
        <Box args={[1, 1, 1]} position={[0, 0.5, 0]}>
          <meshStandardMaterial color="#4a7c59" flatShading />
        </Box>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#2d4a3e" flatShading />
        </mesh>
      </Suspense>

      <OrbitControls
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={40}
        enablePan={true}
      />
    </Canvas>
  )
}

export default App
