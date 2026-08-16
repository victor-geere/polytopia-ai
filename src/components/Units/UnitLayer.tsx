import { RigidBody } from '@react-three/rapier'
import type { GameState, Unit } from '../../game/types'

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

interface UnitLayerProps {
  state: GameState
  selectedUnitId: string | null
  onSelectUnit: (id: string | null) => void
}

export function UnitLayer({ state, selectedUnitId, onSelectUnit }: UnitLayerProps) {
  const units = Object.values(state.units)

  return (
    <group>
      {units.map((unit) => (
        <UnitMesh
          key={unit.id}
          unit={unit}
          mapWidth={state.mapWidth}
          mapHeight={state.mapHeight}
          selected={unit.id === selectedUnitId}
          onSelect={() => onSelectUnit(unit.id === selectedUnitId ? null : unit.id)}
        />
      ))}
    </group>
  )
}

function UnitMesh({
  unit,
  mapWidth,
  mapHeight,
  selected,
  onSelect,
}: {
  unit: Unit
  mapWidth: number
  mapHeight: number
  selected: boolean
  onSelect: () => void
}) {
  const wx = (unit.x - mapWidth / 2) * TILE_SIZE
  const wz = (unit.y - mapHeight / 2) * TILE_SIZE
  const color = TRIBE_COLORS[unit.tribe] ?? '#ffffff'

  return (
    <RigidBody
      type="kinematicPosition"
      position={[wx, 0.55, wz]}
      colliders="hull"
      enabledRotations={[false, false, false]}
    >
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        castShadow={false}
      >
        <capsuleGeometry args={[0.22, 0.35, 4, 8]} />
        <meshStandardMaterial
          color={selected ? '#ffffff' : color}
          flatShading
          emissive={selected ? color : '#000000'}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      {/* Simple team flag / head indicator */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </RigidBody>
  )
}
