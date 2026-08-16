import { Physics } from '@react-three/rapier'
import { TileGrid } from './TileGrid'
import { TerrainCSGFeatures } from './TerrainCSG'
import { UnitLayer } from '../Units/UnitLayer'
import { CityLayer } from './CityLayer'
import type { GameState } from '../../game/types'

interface Props {
  state: GameState
  selectedUnitId: string | null
  onSelectUnit: (id: string | null) => void
}

export function PolytopiaWorld({ state, selectedUnitId, onSelectUnit }: Props) {
  return (
    <Physics timeStep={1 / 30} gravity={[0, -9.81, 0]}>
      <TileGrid state={state} />
      <TerrainCSGFeatures />
      <CityLayer state={state} />
      <UnitLayer
        state={state}
        selectedUnitId={selectedUnitId}
        onSelectUnit={onSelectUnit}
      />
    </Physics>
  )
}
