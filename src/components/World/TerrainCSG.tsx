import { useMemo } from 'react'
import * as THREE from 'three'
import { Brush, Evaluator, ADDITION } from 'three-bvh-csg'

/**
 * Demonstrates three-bvh-csg usage for a few feature meshes.
 * In a full implementation this would be driven by map data (mountain ranges, rivers).
 * CSG is performed once at creation time and cached — never per-frame.
 */
export function TerrainCSGFeatures() {
  const mountainFeature = useMemo(() => {
    const evaluator = new Evaluator()

    // Base plateau
    const base = new Brush(new THREE.BoxGeometry(3.5, 0.4, 3.5))
    base.position.set(4, 0.2, -3)
    base.updateMatrixWorld()

    // Peak
    const peak = new Brush(new THREE.ConeGeometry(1.2, 1.8, 5))
    peak.position.set(4, 1.3, -3)
    peak.updateMatrixWorld()

    const result = evaluator.evaluate(base, peak, ADDITION)
    return result.geometry
  }, [])

  return (
    <mesh geometry={mountainFeature} position={[0, 0, 0]} castShadow={false}>
      <meshStandardMaterial color="#5a5a5a" flatShading />
    </mesh>
  )
}
