import type {
  GameState,
  GameMode,
  TribeId,
  PlayerState,
  Tile,
  Unit,
  City,
  TechId,
} from './types'
import { TRIBE_STARTING_TECH } from './techTree'

let nextId = 1
export function uid(prefix = 'id'): string {
  return `${prefix}_${nextId++}`
}

/** Create a simple procedural square map. */
export function createMap(width: number, height: number): Tile[][] {
  const tiles: Tile[][] = []
  for (let y = 0; y < height; y++) {
    const row: Tile[] = []
    for (let x = 0; x < width; x++) {
      // Very simple noise-like terrain
      const r = Math.random()
      let terrain: Tile['terrain'] = 'land'
      if (r < 0.18) terrain = 'water'
      else if (r < 0.28) terrain = 'mountain'
      else if (r < 0.42) terrain = 'forest'

      row.push({
        x,
        y,
        terrain,
        owner: null,
        resource: terrain === 'land' && Math.random() < 0.12 ? 'fruit' : null,
        building: null,
        exploredBy: [],
      })
    }
    tiles.push(row)
  }
  return tiles
}

export function createInitialState(options: {
  mode?: GameMode
  mapWidth?: number
  mapHeight?: number
  tribes?: TribeId[]
}): GameState {
  const mode = options.mode ?? 'perfection'
  const mapWidth = options.mapWidth ?? 16
  const mapHeight = options.mapHeight ?? 16
  const tribes = options.tribes ?? (['imperius', 'bardur'] as TribeId[])

  const tiles = createMap(mapWidth, mapHeight)
  const units: Record<string, Unit> = {}
  const cities: Record<string, City> = {}
  const players: PlayerState[] = []

  // Place capitals and starting warriors in roughly opposite corners / spread
  const startPositions = [
    { x: 2, y: 2 },
    { x: mapWidth - 3, y: mapHeight - 3 },
    { x: 2, y: mapHeight - 3 },
    { x: mapWidth - 3, y: 2 },
  ]

  tribes.forEach((tribe, i) => {
    const pos = startPositions[i % startPositions.length]
    const cityId = uid('city')
    const unitId = uid('unit')

    // Clear terrain under capital
    tiles[pos.y][pos.x].terrain = 'land'
    tiles[pos.y][pos.x].building = 'city'
    tiles[pos.y][pos.x].owner = tribe
    tiles[pos.y][pos.x].exploredBy = [tribe]

    cities[cityId] = {
      id: cityId,
      tribe,
      x: pos.x,
      y: pos.y,
      level: tribe === 'luxidoor' ? 2 : 1,
      population: 0,
      isCapital: true,
      starsPerTurn: tribe === 'luxidoor' ? 3 : 2,
    }

    units[unitId] = {
      id: unitId,
      type: 'warrior',
      tribe,
      x: pos.x,
      y: pos.y,
      health: 10,
      maxHealth: 10,
      movement: 1,
      maxMovement: 1,
      attack: 2,
      defense: 2,
      range: 1,
      veteran: false,
      acted: false,
    }

    const startingTech = TRIBE_STARTING_TECH[tribe]
    players.push({
      tribe,
      stars: 5,
      researched: startingTech ? [startingTech] : [],
      cities: [cityId],
      units: [unitId],
      score: 0,
      isAlive: true,
    })
  })

  return {
    mode,
    turn: 1,
    maxTurns: mode === 'perfection' ? 30 : 999,
    currentPlayerIndex: 0,
    players,
    tiles,
    units,
    cities,
    mapWidth,
    mapHeight,
    winner: null,
    gameOver: false,
  }
}

/** Spend stars if possible. Returns new player state or null if insufficient. */
export function spendStars(player: PlayerState, amount: number): PlayerState | null {
  if (player.stars < amount) return null
  return { ...player, stars: player.stars - amount }
}

/** Add income at the end of a player's turn. */
export function applyIncome(state: GameState, playerIndex: number): GameState {
  const players = [...state.players]
  const player = { ...players[playerIndex] }
  let income = 0
  for (const cityId of player.cities) {
    const city = state.cities[cityId]
    if (city) income += city.starsPerTurn
  }
  player.stars += income
  players[playerIndex] = player
  return { ...state, players }
}

/** End the current player's turn and advance. */
export function endTurn(state: GameState): GameState {
  if (state.gameOver) return state

  // Reset acted flags for the player who just finished
  const units = { ...state.units }
  const current = state.players[state.currentPlayerIndex]
  for (const uid of current.units) {
    if (units[uid]) {
      units[uid] = {
        ...units[uid],
        acted: false,
        movement: units[uid].maxMovement,
      }
    }
  }

  let nextState: GameState = { ...state, units }
  nextState = applyIncome(nextState, state.currentPlayerIndex)

  // Advance player
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length
  // Skip dead players
  let safety = 0
  while (!nextState.players[nextIndex].isAlive && safety < state.players.length) {
    nextIndex = (nextIndex + 1) % state.players.length
    safety++
  }

  const newTurn = nextIndex <= state.currentPlayerIndex ? state.turn + 1 : state.turn

  nextState = {
    ...nextState,
    currentPlayerIndex: nextIndex,
    turn: newTurn,
  }

  // Check win conditions
  nextState = checkWinConditions(nextState)
  return nextState
}

export function checkWinConditions(state: GameState): GameState {
  const alive = state.players.filter((p) => p.isAlive)

  if (state.mode === 'domination' && alive.length === 1) {
    return {
      ...state,
      gameOver: true,
      winner: alive[0].tribe,
    }
  }

  if (state.mode === 'perfection' && state.turn > state.maxTurns) {
    // Highest score wins
    const sorted = [...state.players].sort((a, b) => b.score - a.score)
    return {
      ...state,
      gameOver: true,
      winner: sorted[0]?.tribe ?? null,
    }
  }

  return state
}

export function researchTech(
  state: GameState,
  playerIndex: number,
  techId: TechId
): GameState | null {
  const player = state.players[playerIndex]
  const cityCount = player.cities.length
  const cost = researchCostSafe(techId, cityCount)

  if (player.stars < cost) return null
  if (player.researched.includes(techId)) return null

  const players = [...state.players]
  players[playerIndex] = {
    ...player,
    stars: player.stars - cost,
    researched: [...player.researched, techId],
    score: player.score + 50, // simple score for researching
  }

  return { ...state, players }
}

function researchCostSafe(techId: TechId, cityCount: number): number {
  // local import avoided circular; duplicate small helper
  const baseCosts: Partial<Record<TechId, number>> = {
    climbing: 5, organization: 5, riding: 5, hunting: 5, fishing: 5,
    archery: 6, farming: 6, forestry: 6, mining: 6, roads: 6,
    sailing: 7, strategy: 7, chivalry: 8, construction: 8,
    mathematics: 8, philosophy: 8, navigation: 9, smithery: 9,
    'free-spirit': 7, meditation: 6,
  }
  const base = baseCosts[techId] ?? 10
  return base + Math.max(0, cityCount - 1) * 2
}
