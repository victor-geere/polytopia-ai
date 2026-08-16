import { TileGrid } from './TileGrid'
import { TerrainCSGFeatures } from './TerrainCSG'
import type { GameState } from '../../game/types'

interface Props {
  state: GameState
}

export function PolytopiaWorld({ state }: Props) {
  return (
    <group>
      <TileGrid state={state} />
      {/* Optional decorative CSG feature — shows the library is wired */}
      <TerrainCSGFeatures />
    </group>
  )
}
