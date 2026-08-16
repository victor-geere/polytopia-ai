import type {
  GameState,
  GameMode,
  TribeId,
  PlayerState,
  Tile,
  Unit,
  City,
  TechId,
  UnitType,
} from './types'
import { TRIBE_STARTING_TECH } from './techTree'
import { createUnit, UNIT_STATS } from './units'

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

    units[unitId] = createUnit('warrior', tribe, pos.x, pos.y, unitId)

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

export function spendStars(player: PlayerState, amount: number): PlayerState | null {
  if (player.stars < amount) return null
  return { ...player, stars: player.stars - amount }
}

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

export function endTurn(state: GameState): GameState {
  if (state.gameOver) return state

  const units = { ...state.units }
  const current = state.players[state.currentPlayerIndex]
  for (const id of current.units) {
    if (units[id]) {
      units[id] = {
        ...units[id],
        acted: false,
        movement: units[id].maxMovement,
      }
    }
  }

  let nextState: GameState = { ...state, units }
  nextState = applyIncome(nextState, state.currentPlayerIndex)

  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length
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

  return checkWinConditions(nextState)
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
    score: player.score + 50,
  }

  return { ...state, players }
}

function researchCostSafe(techId: TechId, cityCount: number): number {
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

/** Find an empty land tile adjacent to (or on) the city for spawning. */
function findSpawnTile(
  state: GameState,
  city: City
): { x: number; y: number } | null {
  const occupied = new Set(
    Object.values(state.units)
      .filter((u) => u.health > 0)
      .map((u) => `${u.x},${u.y}`)
  )

  const candidates: { x: number; y: number }[] = [{ x: city.x, y: city.y }]
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      candidates.push({ x: city.x + dx, y: city.y + dy })
    }
  }

  for (const { x, y } of candidates) {
    if (x < 0 || y < 0 || x >= state.mapWidth || y >= state.mapHeight) continue
    const tile = state.tiles[y][x]
    if (tile.terrain === 'water') continue
    if (occupied.has(`${x},${y}`)) continue
    return { x, y }
  }
  return null
}

/**
 * Train a unit at the player's capital (or first city).
 * Requires stars and tech for non-warrior units.
 */
export function trainUnit(
  state: GameState,
  playerIndex: number,
  unitType: UnitType
): GameState | null {
  const player = state.players[playerIndex]
  const stats = UNIT_STATS[unitType]
  if (!stats || stats.cost <= 0) return null

  if (stats.requiresTech && !player.researched.includes(stats.requiresTech as TechId)) {
    return null
  }
  if (player.stars < stats.cost) return null

  const cityId = player.cities[0]
  const city = cityId ? state.cities[cityId] : null
  if (!city) return null

  const spawn = findSpawnTile(state, city)
  if (!spawn) return null

  const id = uid('unit')
  const unit = createUnit(unitType, player.tribe, spawn.x, spawn.y, id)
  // Newly trained units cannot act the turn they are built
  unit.acted = true
  unit.movement = 0

  const units = { ...state.units, [id]: unit }
  const players = [...state.players]
  players[playerIndex] = {
    ...player,
    stars: player.stars - stats.cost,
    units: [...player.units, id],
    score: player.score + 10,
  }

  return { ...state, units, players }
}
