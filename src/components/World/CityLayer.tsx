import { RigidBody } from '@react-three/rapier'
import type { GameState, City } from '../../game/types'

const TILE_SIZE = 1
const TRIBE_COLORS: Record<string, string> = {
  imperius: '#4a90d9',
  bardur: '#8b5a2b',
  'xin-xi': '#cc3333',
  oumaji: '#e6b800',
  kickoo: '#33aa77',
  hoodrick: '#66aa33',
  luxidoor: '#9933cc',
  vengir: '#555555',
  zebasi: '#dd8833',
  'ai-mo': '#66ccff',
  quetzali: '#33cc99',
  yadakk: '#cc6633',
}

interface Props {
  state: GameState
}

export function CityLayer({ state }: Props) {
  const cities = Object.values(state.cities)

  return (
    <group>
      {cities.map((city) => (
        <CityMesh
          key={city.id}
          city={city}
          mapWidth={state.mapWidth}
          mapHeight={state.mapHeight}
        />
      ))}
    </group>
  )
}

function CityMesh({
  city,
  mapWidth,
  mapHeight,
}: {
  city: City
  mapWidth: number
  mapHeight: number
}) {
  const wx = (city.x - mapWidth / 2) * TILE_SIZE
  const wz = (city.y - mapHeight / 2) * TILE_SIZE
  const color = TRIBE_COLORS[city.tribe] ?? '#ffffff'
  const scale = 0.7 + city.level * 0.15

  return (
    <RigidBody type="fixed" position={[wx, 0.4, wz]} colliders="cuboid">
      {/* Base platform */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.45 * scale, 0.5 * scale, 0.2, 6]} />
        <meshStandardMaterial color="#3a3a3a" flatShading />
      </mesh>
      {/* Building */}
      <mesh position={[0, 0.35 * scale, 0]}>
        <boxGeometry args={[0.55 * scale, 0.6 * scale, 0.55 * scale]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {/* Capital marker */}
      {city.isCapital && (
        <mesh position={[0, 0.85 * scale, 0]}>
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshStandardMaterial color="#ffd700" flatShading />
        </mesh>
      )}
    </RigidBody>
  )
}
