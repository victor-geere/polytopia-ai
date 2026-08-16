import { RigidBody } from '@react-three/rapier'
import type { GameState, Unit } from '../../game/types'
import { isRangedUnit } from '../../game/units'

const TILE_SIZE = 1
const TRIBE_COLORS: Record<string, string> = {
  imperius: '#4a90d9',
  bardur: '#c47a3a',
  'xin-xi': '#cc3333',
  oumaji: '#e6b800',
  kickoo: '#33aa77',
  hoodrick: '#66aa33',
  luxidoor: '#9933cc',
  vengir: '#888888',
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
  const wx = (unit.x - mapWidth / 2 + 0.5) * TILE_SIZE
  const wz = (unit.y - mapHeight / 2 + 0.5) * TILE_SIZE
  const color = TRIBE_COLORS[unit.tribe] ?? '#ffffff'
  const ranged = isRangedUnit(unit.type)

  return (
    <RigidBody
      type="kinematicPosition"
      position={[wx, 0.45, wz]}
      colliders="hull"
      enabledRotations={[false, false, false]}
    >
      <group
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {/* Body — archers slightly thinner */}
        <mesh castShadow={false} position={[0, 0.15, 0]}>
          <capsuleGeometry args={[ranged ? 0.2 : 0.28, ranged ? 0.4 : 0.35, 4, 8]} />
          <meshStandardMaterial
            color={selected ? '#ffffff' : color}
            flatShading
            emissive={selected ? color : '#000000'}
            emissiveIntensity={selected ? 0.4 : 0}
          />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.16, 8, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* Bow marker for archers */}
        {ranged && (
          <mesh position={[0.22, 0.35, 0]} rotation={[0, 0, 0.3]}>
            <torusGeometry args={[0.14, 0.03, 6, 10, Math.PI]} />
            <meshStandardMaterial color="#8b5a2b" flatShading />
          </mesh>
        )}
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.4, 0.5, 16]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.85} />
          </mesh>
        )}
      </group>
    </RigidBody>
  )
}
