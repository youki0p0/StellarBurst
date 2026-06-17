# CLAUDE.md

This file is the canonical specification and working instruction set for **StellarBurst**. Read it together with `PROJECT_CONTEXT.md` and `SUPABASE_SETUP.md` before implementing anything.

## Project Description

StellarBurst is a **mobile-first**, browser-based multiplayer card battle party game.

- **Deployment target:** Vercel.
- **Framework:** Next.js 15 (App Router).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS.
- **State:** Zustand.
- **Realtime / backend:** Supabase (Postgres + Realtime).
- **Players:** 2–8 per room.

The product is a casual party game played through shared room codes. Optimize for fast start, readability on small screens, and chaotic fun. Do not overbuild before the MVP works.

## Working Workflow (Fusion-style)

When implementing a feature or the MVP, work through these roles in sequence, then merge their outputs into a single coherent plan before writing code.

### Roles

1. **Game Designer**
   - Owns rules, balance, card effects, and player-facing flow.
   - Ensures the game is fun, fast, chaotic, and not too punitive.

2. **Realtime Multiplayer Architect**
   - Owns room lifecycle, Supabase schema usage, Realtime subscriptions, optimistic updates, and conflict handling.
   - Ensures state stays consistent across 2–8 clients.

3. **Frontend / UI Engineer**
   - Owns the App Router screens, Tailwind layout, Zustand stores, components, and pixel-art card rendering.
   - Ensures the UI is mobile-first and readable.

4. **QA / Test Engineer**
   - Owns build, lint, and tests.
   - Ensures correctness, catches edge cases, and verifies acceptance criteria.

### Procedure

1. Each role produces its recommendations for the task.
2. **Merge** the role outputs into one consistent design and task list. Resolve conflicts explicitly.
3. **Implement** the merged plan.
4. Run **build / lint / test**.
5. **Fix** any failures.
6. **Report** what changed, what was run, schema assumptions, required Vercel env vars, and remaining TODOs.

## Game Rules

- **Players:** 2–8 humans per room.
- **CPU fallback:** If a match starts with only **2 human players**, add **1 CPU** player.
- **Health:** Each player starts at **100 HP**.
- **Hand:** Each player holds **5 cards**.
- **Draw:** At the **end of a turn**, the player draws back **up to 5 cards**.
- **Elimination:** A player is defeated at **0 HP**.
- **Victory:** The **last player standing** wins.
- **Turn order:** Randomized using the **room seed** so all clients agree on order.

### Card Types

#### Attack
- Deal **10–30 damage**.
- About **~60% of attack cards are colorless** (no element/affinity restriction).
- A **rare** attack variant is a **fatal** attack. Fatal attacks are **not unavoidable** — see Defense.

#### Defense
- Includes a **colorless wildcard** defense usable against any attack.
- Defense effects can reduce incoming damage by:
  - **1/3**
  - **1/2**
  - **2/3**
- Other defense effects:
  - **Reflect** damage back at the attacker.
  - **Nullify a fatal attack.**
- A **fatal attack is nullified by consuming any defense card** (the defense card is spent to cancel it).

#### Special
- **Heal self.**
- **Shuffle all hands.**
- **Skip the target's next action** with some **probability** (not guaranteed).
- **Limit the target's usable defense cards for 3 turns.**
- **Slip damage:** apply damage spread **over 3 turns** (damage over time).
- **No seal / lockdown effects** (do not add hard-lock mechanics that fully disable a player).

## CPU Behavior

- The CPU acts **automatically** on its turn.
- Targeting and decisions:
  - Prefer to **attack the lowest-HP** opponent.
  - **Heal when its own HP is low.**
  - **Defend when possible** against incoming threats.
  - **Occasionally play a random special** for chaos.
- CPU **strength comes from draw luck**, not from advanced AI. Keep the logic simple and readable.

## Supabase Data Model

Use these tables (see `supabase/schema.sql` and `SUPABASE_SETUP.md`).

### `public.rooms`
- Room lifecycle and shared game state.
- `state` (jsonb): authoritative **game state**.
- `version` (integer): used for **optimistic updates** / conflict detection.
- `seed`: drives randomized turn order and shuffles.
- `status`: `waiting` | `playing` | `finished`.

### `public.players`
- One row per **participant** (human or CPU).
- Tracks **HP**, **hand**, **ready** state, and **CPU** flag.

### `public.game_events`
- **Append-only log** of game events for replay/debug and event-driven UI.

### Environment & Access
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **No `service_role` / secret keys** in frontend code.
- **No login** required for MVP.
- Identify players with a **`client_id` stored in localStorage**.
- If env vars are **missing**, show a **setup screen** instead of crashing.

## Required Screens

Use the App Router. Implement these screens:

1. **Home** — create or join a room (enter name, enter/generate room code).
2. **Lobby** — list players, ready toggle, host start; CPU-fallback note.
3. **Game** — the battle board, hand, targeting, and battle log.
4. **Result** — winner display and return-to-home / rematch.

## Visual Direction

- **Dark fantasy neon** aesthetic.
- Mobile-first, readable layout.
- **Card art must be original pixel art / dot art** — **not emoji**, and not copied from existing games.

## Reusable Components

Build these components for reuse:

- `CardView` — renders a single card (pixel art, type, value, effect).
- `PlayerPanel` — shows a player's name, HP, status, effects, CPU flag.
- `BattleLog` — scrollable event feed.
- `RoomLobby` — lobby UI (players, ready, start).
- `GameBoard` — main battle layout tying panels, hand, and log together.

## Logic Files

Keep game logic separated from UI:

- `cards.ts` — card definitions, deck generation, draw logic.
- `rules.ts` — turn resolution, damage/defense math, win/lose checks.
- `cpu.ts` — CPU decision logic.
- `room.ts` — room lifecycle, Supabase reads/writes, Realtime, optimistic updates.

## Type Definitions

Define shared types (e.g. in a `types.ts`):

- `Player` — id, client_id, name, hp, hand, status, is_ready, is_cpu, effects.
- `Card` — id, type (`attack` | `defense` | `special`), value/effect metadata, colorless flag, fatal flag.
- `RoomState` — turn order, current turn, status, version, per-game state stored in `rooms.state`.
- `GameEvent` — room_id, player_id, event_type, payload, created_at.

## Acceptance Criteria

The MVP is acceptable when:

1. A user can **create a room** and receive a shareable **room code**.
2. Other users can **join** that room by code.
3. The **lobby** shows all players, supports **ready**, and lets the host **start**.
4. Starting with **only 2 humans adds 1 CPU**.
5. Game state **synchronizes in realtime** across all clients via Supabase Realtime.
6. **Turn order** is consistent across clients (seeded).
7. Core **turn-based battle** works: play attack/defense/special, resolve damage, draw up to 5 at end of turn.
8. **Fatal attacks** can be nullified by consuming any defense card.
9. Defense reductions (**1/3, 1/2, 2/3**), **reflect**, **slip damage over 3 turns**, **heal**, **shuffle hands**, **probabilistic skip**, and **defense-limit (3 turns)** all behave as specified.
10. Players reaching **0 HP** are defeated; the **last standing** wins and the **Result** screen shows the winner.
11. The **CPU** plays automatically with the described simple behavior.
12. **Card art is original pixel art**, not emoji.
13. Missing Supabase env vars show a **setup screen**, not a crash.
14. **No `service_role`/secret keys** are used in frontend code; auth is **localStorage `client_id`** only.
15. **Build, lint, and tests pass.**
