# Polytopia AI

This repository explores artificial intelligence approaches for **The Battle of Polytopia** (originally released as *SuperTribes*), a streamlined 4X turn-based strategy game. It includes research materials (see `tribes-paper.pdf`) and related resources focused on tribe behaviors, game-state modeling, and AI agents.

## What is The Battle of Polytopia?

*The Battle of Polytopia* is a highly polished, minimalist 4X (eXplore, eXpand, eXploit, eXterminate) turn-based strategy game developed and published by the Swedish studio **Midjiwan AB**. First released in 2016 for mobile platforms and later expanded to Steam, Nintendo Switch, and even Tesla in-car systems, it is celebrated for compressing the depth of classic *Civilization*-style games into short, highly replayable sessions (typically 10–30 minutes) while retaining meaningful strategic choices.

The game features a distinctive low-poly geometric art style, charismatic asymmetric tribes, and a procedurally generated square-tiled world known as “the Square.”

### Core Premise

Players control one of up to 16 tribes. Each game begins with a capital city and a single starting unit on a fog-of-war-covered map. The primary resource is **stars** (☆), generated mainly by cities and spent on technology research, unit production, buildings, and resource harvesting. Victory conditions depend on the selected mode.

### Game Modes

- **Perfection** — Score as many points as possible in exactly 30 turns. Points are earned by exploring, capturing villages/cities, researching technology, producing units, harvesting resources, and defeating enemies. Opponent count and difficulty apply score multipliers. This is the primary competitive single-player / leaderboard mode.
- **Domination** — No turn limit. Eliminate every rival tribe by capturing or destroying their last city. Performance is evaluated on speed and efficiency.
- **Creative** — Sandbox mode with optional opponents, ideal for experimentation.
- Multiplayer variants (Glory / Might) support online and local play (up to 16 players on larger maps) and include diplomacy features such as peace treaties and embassies in later versions.

Map sizes range from tiny to massive, with generation styles including Dryland, Lake, Pangea, Continents, Archipelago, and Water World.

### Tribes

There are **12 regular tribes** and **4 special (DLC) tribes**. Every tribe has a unique starting technology, visual identity, resource spawn biases, and unit aesthetics. Special tribes also possess unique technology trees, units, and buildings.

**Selected regular tribes**:
- **Xin-xi** — Starts with Climbing (mountain movement + vision). East-Asian inspired.
- **Imperius** — Starts with Organization (fruit harvesting). Classical / Roman aesthetic.
- **Bardur** — Starts with Hunting. Norse-inspired; strong early game on forested maps.
- **Oumaji** — Starts with Riding (fast Rider unit). Desert nomads.
- **Kickoo** — Starts with Fishing. Coastal / island focus.
- **Hoodrick** — Starts with Archery.
- **Luxidoor** — Begins with an already-upgraded capital (high early income).
- **Vengir, Zebasi, Ai-Mo, Quetzali, Yădakk** — Distinct starting technologies (Mining, Farming, Meditation, Strategy, Roads) and cultural themes.

**Special tribes**:
- **Aquarion** — Aquatic civilization with mermaid/crab units and water-centric mechanics.
- **∑∫ỹriȱŋ (Elyrion)** — Nature/magic theme; can enchant animals into units and raise dragons.
- **Polaris** — Ice-themed with unique frost mechanics.
- **Cymanti** — Insect/fungal hive-mind with a radically different technology tree and units (hexapods, centipedes, etc.).

Regular tribes share the same core technology tree and unit roster (visually reskinned). Special tribes diverge substantially.

### Technology, Economy & Combat

The technology tree is a compact interconnected web rather than a long linear progression. Tier-1 starting technologies (Riding, Organization, Climbing, Fishing, Hunting) open distinct early-game paths. Higher tiers unlock advanced units (Knights, Giants), ships, temples, mathematics (sawmills, forges), and powerful abilities. Research cost scales with the number of cities controlled. Ruins can grant free technologies or units.

**Cities** generate stars each turn and support a limited population of units. Population is increased by harvesting fruit/animals/fish, building farms, lumber huts, mines, ports, temples, etc. Higher population levels unlock city upgrades that improve income, production capacity, and eventually grant the Giant (or tribe-specific super unit). There are no settlers—new cities are obtained only by capturing neutral villages or enemy cities. Roads and ports enable faster movement and beneficial city connections.

**Units** use Chebyshev distance (king-move in chess) for movement and attack range. Most units receive one action per turn. Common skills include Dash, Fortify, Swim, Fly, and Convert. Core land units include Warrior, Archer, Defender, Rider, Swordsman, Knight, Catapult, Mind Bender, Cloak, and Giant. Naval progression typically runs Raft → Boat/Ship → Battleship (with tribe-specific variants).

Combat is deterministic. Attack and defense values are modified by terrain, veteran status, and skills. Terrain (forest, mountain, water, ice) strongly affects movement cost, defense bonuses, and vision.

The combination of short session length, high procedural replayability, tribe asymmetry, and elegant rules makes Polytopia an excellent domain for AI research (reinforcement learning, MCTS, multi-agent systems, opponent modeling, etc.).

## Repository Contents

- `tribes-paper.pdf` — Research paper related to tribe modeling / AI.
- `Tribes/` — Related submodule or resources.
- `jan21-dev-log.md` — Development notes.

This project aims to model game state and tribe strategies and to develop AI agents capable of competitive play in both Perfection and Domination modes.

## Implementing a 3D Polytopia Experience with React Three Fiber, three-bvh-csg & Rapier (Mobile-Browser Optimized)

Although the original game is a crisp 2D top-down experience, a modern 3D reimplementation or interactive visualizer is valuable for AI demonstration, spectator modes, educational tools, or hybrid real-time variants. The stack below is chosen specifically for good performance on **mobile browsers** (iOS Safari, Chrome on Android), where draw-call budgets, memory, thermal throttling, and battery life are severe constraints.

### Recommended Tech Stack

| Library | Role | Why it fits |
|---------|------|-------------|
| **Three.js** + **@react-three/fiber** (R3F) | Declarative 3D scene | React component model, excellent ecosystem, automatic context handling |
| **three-mesh-bvh** + **three-bvh-csg** | Spatial queries & Constructive Solid Geometry | Extremely fast real-time boolean operations for terrain features (mountains, rivers, forests, city extrusions) |
| **@react-three/rapier** | Physics (Rapier WASM) | Efficient collision detection and rigid-body simulation; deterministic and mobile-friendly when used carefully |
| **@react-three/drei** | Helpers | Controls, instancing utilities, HTML overlays, textures |
| **@react-three/csg** (optional) | React wrapper around three-bvh-csg | Declarative `<Geometry>`, `<Base>`, `<Subtraction>` components |

### High-Level Architecture

1. **Tile Grid**  
   Represent the Square as a pure data structure (2D array of terrain, resource, building, ownership, and fog state). Extrude tiles into low-poly prisms or drive an instanced heightfield. Prefer `InstancedMesh` for identical tiles, trees, and units of the same type.

2. **Terrain & Features with three-bvh-csg**  
   Generate a base geometry, then use `Brush` + `Evaluator` to add or subtract mountain forms, carve riverbeds, or union forest canopies and city walls. three-bvh-csg is dramatically faster than classic BSP CSG libraries and is designed for dynamic updates.

```tsx
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg';
import { useMemo } from 'react';
import * as THREE from 'three';

function TerrainWithFeatures({ baseGeometry, featureGeometries }) {
  const result = useMemo(() => {
    const evaluator = new Evaluator();
    let current = new Brush(baseGeometry);
    current.updateMatrixWorld();

    featureGeometries.forEach((geo) => {
      const feature = new Brush(geo);
      feature.updateMatrixWorld();
      current = evaluator.evaluate(current, feature, ADDITION); // or SUBTRACTION
    });

    return current;
  }, [baseGeometry, featureGeometries]);

  return (
    <mesh geometry={result.geometry}>
      <meshStandardMaterial color="#4a7c59" flatShading />
    </mesh>
  );
}
```

Perform expensive CSG offline or at level load; only re-evaluate affected regions during play. Cache results aggressively.

3. **Physics with @react-three/rapier**  
   Even in a primarily turn-based game, physics provides satisfying unit movement interpolation, projectile arcs, and collapse animations. It also enables experimental real-time or hybrid modes.

```tsx
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

function Unit({ position, color }) {
  return (
    <RigidBody type="kinematicPosition" position={position} colliders="hull">
      <mesh>
        <capsuleGeometry args={[0.3, 0.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
}

// Scene root
<Physics timeStep={1 / 30} /* lower rate helps mobile */>
  <Terrain />
  {units.map((u) => <Unit key={u.id} {...u} />)}
  <CuboidCollider args={[mapWidth / 2, 0.1, mapHeight / 2]} position={[0, -0.1, 0]} />
</Physics>
```

Prefer simple colliders (cuboid, capsule, hull). Keep the number of active dynamic bodies low; let sleeping bodies rest. Consider running physics in a Web Worker when the main thread is occupied by AI simulation.

4. **React Three Fiber Canvas (mobile-aware)**

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

function App() {
  return (
    <Canvas
      camera={{ position: [15, 20, 15], fov: 45 }}
      dpr={[1, 1.5]}                    // Cap pixel ratio
      performance={{ min: 0.5 }}        // Adaptive quality
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
      }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 5]} intensity={1.2} />
      <Suspense fallback={null}>
        <Physics>
          <PolytopiaWorld />
        </Physics>
      </Suspense>
      <OrbitControls maxPolarAngle={Math.PI / 2.2} />
      {/* Add custom mobile joysticks / tap-to-move UI */}
    </Canvas>
  );
}
```

### Mobile Browser Optimizations (Critical)

- **Draw-call budget**: Target < 100–150 draw calls on mid-range phones. Heavy instancing is mandatory.
- **Pixel ratio**: Cap `dpr` at 1.0–1.5. Detect device capability via `navigator.deviceMemory` or a simple FPS monitor.
- **Geometry & materials**: Extremely low-poly tiles, flat shading, merged geometries where possible.
- **Textures**: Prefer KTX2 (Basis) compression and atlases.
- **Shadows**: Disable or use a single low-resolution map / baked lighting for static terrain.
- **Physics**: Fixed lower timestep, aggressive sleeping, simple colliders.
- **CSG**: Offline / load-time only for complex operations; incremental updates only.
- **Adaptive quality**: Drop particles, post-processing, and higher-detail meshes when FPS falls.
- **Touch input**: Virtual joysticks or tap-select + drag; do not rely solely on OrbitControls for primary interaction.
- **Lifecycle**: Pause the render loop when the tab is hidden (`document.visibilityState`).

### Suggested Project Structure

```
src/
  components/
    World/
      TileGrid.tsx          # Instanced or CSG terrain
      Units.tsx             # Instanced meshes + Rapier bodies
      Cities.tsx
      FogOfWar.tsx
    UI/
      MobileControls.tsx
      TribeSelector.tsx
      TechTree.tsx
  systems/
    GameState.ts            # Pure logic (stars, turns, tech, combat) — shareable with AI
    Pathfinding.ts          # A* using Chebyshev distance
    AI/
      Agent.ts
  hooks/
    useGameLoop.ts
    useMobileDetection.ts
  App.tsx
```

Because the core rules engine can live in pure TypeScript with no Three.js dependency, the same logic powers both the 3D client and offline AI training / simulation loops. The 3D view then becomes an excellent debugging and demonstration surface.

### Quick Start

```bash
npm create vite@latest polytopia-3d -- --template react-ts
cd polytopia-3d
npm install three @react-three/fiber @react-three/drei @react-three/rapier three-bvh-csg three-mesh-bvh
# optional React wrapper
npm install @react-three/csg
```

Begin with a flat instanced grid and simple unit movement, then progressively introduce CSG terrain features and Rapier interactions while continuously profiling on real mobile devices.

---

**License & Attribution**  
*The Battle of Polytopia* is a trademark of Midjiwan AB. This repository is an independent research and educational project and is not affiliated with or endorsed by Midjiwan. Game mechanics descriptions are based on publicly available information and community resources.

Contributions, AI agent implementations, and 3D visualization experiments are welcome.
