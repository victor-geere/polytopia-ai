import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { createInitialState, endTurn, researchTech, trainUnit } from './game'
import { findPath, isReachable, chebyshev } from './game/pathfinding'
import { resolveCombat, canAttack } from './game/combat'
import { isRangedUnit } from './game/units'
import type { AiConfig } from './game/aiCompact'
import { requestAiActions } from './game/aiClient'
import { applyAiActions } from './game/aiRunner'
import { PolytopiaWorld } from './components/World/PolytopiaWorld'
import { CameraFocus } from './components/World/CameraFocus'
import { HUD } from './components/UI/HUD'
import { Splash, type StartConfig, type DifficultyLevel } from './components/UI/Splash'
import type { GameState, TechId, UnitType } from './game/types'

const TRIBE_NAMES: Record<string, string> = {
  imperius: 'Imperius',
  bardur: 'Bardur',
}

function difficultySettings(d: DifficultyLevel): { startingStars: number; maxTurns: number } {
  switch (d) {
    case 'easy':
      return { startingStars: 8, maxTurns: 40 }
    case 'hard':
      return { startingStars: 3, maxTurns: 25 }
    default:
      return { startingStars: 5, maxTurns: 30 }
  }
}

function App() {
  const [state, setState] = useState<GameState>(() =>
    createInitialState({
      mode: 'perfection',
      mapWidth: 16,
      mapHeight: 16,
      tribes: ['imperius', 'bardur'],
    })
  )
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [showTech, setShowTech] = useState(false)
  const [started, setStarted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  const [playMode, setPlayMode] = useState<'pass-and-play' | 'vs-ai'>('pass-and-play')
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const prevPlayerIndex = useRef(0)
  const aiAbort = useRef<AbortController | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const currentPlayer = state.players[state.currentPlayerIndex]
  const humanTribe = state.players[0]?.tribe
  const isAiTurn =
    playMode === 'vs-ai' && currentPlayer.tribe !== humanTribe && !state.gameOver

  // Toast + camera on turn change
  useEffect(() => {
    if (!started) return

    if (state.gameOver) {
      setToast(`Game over — ${state.winner?.toUpperCase()} wins!`)
      return
    }

    const tribeLabel = TRIBE_NAMES[currentPlayer.tribe] ?? currentPlayer.tribe
    if (state.currentPlayerIndex !== prevPlayerIndex.current || state.turn === 1) {
      if (playMode === 'vs-ai' && currentPlayer.tribe !== humanTribe) {
        setToast(`AI (${aiConfig?.provider ?? 'llm'}) is thinking…`)
      } else {
        setToast(
          `You are ${tribeLabel.toUpperCase()}. Tap your unit, then a highlighted tile to move.`
        )
      }
      setFocusKey((k) => k + 1)
    }
    prevPlayerIndex.current = state.currentPlayerIndex
  }, [
    started,
    state.currentPlayerIndex,
    state.turn,
    state.gameOver,
    state.winner,
    currentPlayer.tribe,
    playMode,
    humanTribe,
    aiConfig?.provider,
  ])

  // Run AI turn automatically
  useEffect(() => {
    if (!started || !isAiTurn || !aiConfig || aiBusy || state.gameOver) return

    const playerIndex = state.currentPlayerIndex
    const tribe = state.players[playerIndex].tribe
    const ctrl = new AbortController()
    aiAbort.current = ctrl
    setAiBusy(true)

    ;(async () => {
      try {
        const snapshot = stateRef.current
        const actions = await requestAiActions(snapshot, tribe, aiConfig, ctrl.signal)
        if (ctrl.signal.aborted) return
        const { state: next, log } = applyAiActions(snapshot, actions, playerIndex)
        setState(next)
        setSelectedUnitId(null)
        setShowTech(false)
        const summary = log.filter((l) => !l.startsWith('skip')).slice(0, 4).join(' · ') || 'end'
        setToast(`AI turn done: ${summary}`)
      } catch (err) {
        if (ctrl.signal.aborted) return
        const msg = err instanceof Error ? err.message : 'AI request failed'
        setToast(`AI error — ending turn. ${msg.slice(0, 120)}`)
        setState((prev) => endTurn(prev))
        setSelectedUnitId(null)
      } finally {
        if (!ctrl.signal.aborted) setAiBusy(false)
      }
    })()

    return () => {
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, isAiTurn, aiConfig, state.currentPlayerIndex, state.turn, state.gameOver])

  const tryMoveOrAttack = useCallback(
    (targetX: number, targetY: number) => {
      if (isAiTurn || aiBusy || !selectedUnitId || state.gameOver) return
      const unit = state.units[selectedUnitId]
      if (!unit || unit.tribe !== currentPlayer.tribe || unit.acted) return

      const occupant = Object.values(state.units).find(
        (u) => u.x === targetX && u.y === targetY && u.health > 0 && u.id !== unit.id
      )
      if (occupant && occupant.tribe === unit.tribe) {
        const cityThere = Object.values(state.cities).some(
          (c) => c.x === targetX && c.y === targetY && c.tribe === unit.tribe
        )
        if (!cityThere) return
      }

      if (occupant && occupant.tribe !== unit.tribe) {
        const dist = chebyshev(unit.x, unit.y, occupant.x, occupant.y)
        if (!canAttack(unit, occupant, dist)) {
          setToast(
            isRangedUnit(unit.type)
              ? `Out of range (this unit has range ${unit.range}).`
              : 'Enemy is out of attack range.'
          )
          return
        }

        const tile = state.tiles[occupant.y][occupant.x]
        const { attacker, defender } = resolveCombat(unit, occupant, tile, dist)

        setState((prev) => {
          const units = { ...prev.units }
          units[attacker.id] = attacker
          let players = prev.players
          if (defender.health <= 0) {
            delete units[defender.id]
            players = prev.players.map((p) =>
              p.tribe === defender.tribe
                ? { ...p, units: p.units.filter((id) => id !== defender.id) }
                : p
            )
            setToast(
              isRangedUnit(unit.type) && dist > 1
                ? 'Ranged shot — enemy defeated!'
                : 'Enemy unit defeated!'
            )
          } else {
            units[defender.id] = defender
            setToast(
              isRangedUnit(unit.type) && dist > 1
                ? `Ranged hit! Enemy HP: ${defender.health} (no counter)`
                : `Hit! Enemy HP: ${defender.health}`
            )
          }
          return { ...prev, units, players }
        })
        setSelectedUnitId(null)
        return
      }

      if (!isReachable(state, unit.x, unit.y, targetX, targetY, unit.movement)) {
        setToast('That tile is out of movement range.')
        return
      }
      const path = findPath(state, unit.x, unit.y, targetX, targetY, unit.movement)
      if (!path) {
        setToast('No path to that tile.')
        return
      }

      setState((prev) => {
        const units = { ...prev.units }
        units[selectedUnitId] = {
          ...units[selectedUnitId],
          x: targetX,
          y: targetY,
          movement: 0,
          acted: true,
        }
        return { ...prev, units }
      })
      setSelectedUnitId(null)
      setToast('Moved. Tap End Turn when finished.')
    },
    [selectedUnitId, state, currentPlayer, isAiTurn, aiBusy]
  )

  const handleSelectUnit = useCallback(
    (id: string | null) => {
      if (isAiTurn || aiBusy) return
      if (!id) {
        setSelectedUnitId(null)
        return
      }
      const unit = state.units[id]
      if (!unit) return
      if (unit.tribe !== currentPlayer.tribe) {
        setToast(`That unit belongs to ${TRIBE_NAMES[unit.tribe] ?? unit.tribe}.`)
        return
      }
      if (unit.acted) {
        setToast('This unit has already acted this turn.')
        return
      }
      setSelectedUnitId(id)
      if (isRangedUnit(unit.type)) {
        setToast(`Archer selected (range ${unit.range}). Highlighted tiles = move, red = attack.`)
      } else {
        setToast('Highlighted tiles show where you can move. Tap one to move.')
      }
    },
    [state.units, currentPlayer.tribe, isAiTurn, aiBusy]
  )

  const handleEndTurn = () => {
    if (isAiTurn || aiBusy) return
    setState((prev) => endTurn(prev))
    setSelectedUnitId(null)
    setShowTech(false)
  }

  const handleResearch = (techId: TechId) => {
    if (isAiTurn || aiBusy) return
    setState((prev) => {
      const next = researchTech(prev, prev.currentPlayerIndex, techId)
      if (next) {
        setToast(
          techId === 'archery'
            ? 'Archery researched! Train Archers from the Train panel (☆3, range 2).'
            : 'Technology researched!'
        )
      } else {
        setToast('Cannot research that (cost or prerequisites).')
      }
      return next ?? prev
    })
  }

  const handleTrain = (unitType: UnitType) => {
    if (isAiTurn || aiBusy || state.gameOver) return
    setState((prev) => {
      const next = trainUnit(prev, prev.currentPlayerIndex, unitType)
      if (next) {
        setToast(
          unitType === 'archer'
            ? 'Archer trained at your capital (above the spire). Acts next turn.'
            : `${unitType} trained at your capital (above the spire).`
        )
      } else {
        setToast('Cannot train (stars or tech).')
      }
      return next ?? prev
    })
  }

  const handleStart = (config: StartConfig) => {
    const { startingStars, maxTurns } = difficultySettings(config.difficulty)
    const size = config.boardSize

    const next = createInitialState({
      mode: 'perfection',
      mapWidth: size,
      mapHeight: size,
      tribes: ['imperius', 'bardur'],
    })

    next.maxTurns = maxTurns
    next.players = next.players.map((p) => ({ ...p, stars: startingStars }))

    setState(next)
    setPlayMode(config.mode)
    setAiConfig(config.ai ?? null)
    if (config.ai?.apiKey) {
      try {
        sessionStorage.setItem('polytopia_ai_provider', config.ai.provider)
        sessionStorage.setItem('polytopia_ai_key', config.ai.apiKey)
      } catch {
        /* ignore */
      }
    }
    setSelectedUnitId(null)
    setShowTech(false)
    setAiBusy(false)
    setStarted(true)
    setFocusKey((k) => k + 1)
    const tribe = TRIBE_NAMES[next.players[0].tribe] ?? next.players[0].tribe
    setToast(
      config.mode === 'vs-ai'
        ? `You are ${tribe}. ${size}×${size}, ${config.difficulty}. AI: ${config.ai?.provider}.`
        : `You are ${tribe.toUpperCase()}. ${size}×${size}, ${config.difficulty}. Tap a unit to move.`
    )
  }

  const camDist = 8 + state.mapWidth * 0.4

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none' }}>
      {!started && (
        <Splash
          onStart={handleStart}
          yourTribe={TRIBE_NAMES[humanTribe] ?? 'Imperius'}
        />
      )}

      <Canvas
        camera={{
          position: [camDist * 0.7, camDist * 0.9, camDist * 0.7],
          fov: 50,
          near: 0.1,
          far: 300,
        }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={{ width: '100%', height: '100%' }}
        onPointerMissed={() => !isAiTurn && !aiBusy && setSelectedUnitId(null)}
      >
        <color attach="background" args={['#4ab0d8']} />
        <fog attach="fog" args={['#6bc4e0', 48, 125]} />

        <ambientLight intensity={0.4} color="#fff4e0" />
        <directionalLight
          position={[18, 28, 12]}
          intensity={1.55}
          color="#fff2cc"
          castShadow={false}
        />
        <directionalLight position={[-8, 10, -6]} intensity={0.3} color="#a8d8ff" />
        <hemisphereLight args={['#6ec4e8', '#6bc46b', 0.45]} />

        <Suspense fallback={null}>
          <PolytopiaWorld
            state={state}
            selectedUnitId={selectedUnitId}
            onSelectUnit={handleSelectUnit}
            onTileClick={tryMoveOrAttack}
          />
          <CameraFocus state={state} focusKey={focusKey} />
        </Suspense>

        <OrbitControls
          maxPolarAngle={Math.PI / 2.2}
          minDistance={6}
          maxDistance={60}
          target={[0, 0, 0]}
          enablePan={true}
          enableDamping
          dampingFactor={0.12}
          makeDefault
        />
      </Canvas>

      {started && (
        <HUD
          state={state}
          selectedUnitId={selectedUnitId}
          showTech={showTech}
          onToggleTech={() => !isAiTurn && !aiBusy && setShowTech((v) => !v)}
          onEndTurn={handleEndTurn}
          onResearch={handleResearch}
          onTrain={handleTrain}
          toast={toast}
          onToastDone={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default App
