# StellarBurst ✦

A fast, chaotic **2–8 player realtime card battle party game** for the browser,
mobile-first, deployable on Vercel. Inspired by simple party card games — no
copyrighted names or assets.

## Gameplay (understandable in 30 seconds)

- Everyone starts at **100 HP** with **5 cards**.
- On your turn, play **one** card: attack, defense (reactively), heal, or a special.
- Attacks deal 10–30 damage. The target may answer with a defense card.
- Cards have colors. Colorless attacks can be blocked by any defense; colored
  attacks need a matching color or a colorless (wildcard) defense.
- **Fatal** attacks are lethal — but *any* defense card negates them, so there's
  no unavoidable instant death.
- Defenses: reduce damage by 1/3, 1/2, 2/3, **reflect**, or **nullify fatal**.
- Specials: **heal**, **shuffle all hands**, **chance to skip** a turn,
  **cripple defense** for 3 turns, **slip damage** over 3 turns.
- Draw back up to 5 at the end of your turn. Last player standing wins.
- Starting with exactly 2 humans auto-adds 1 CPU rival.

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Zustand · Supabase Realtime.

### Architecture

- **Supabase Postgres + Realtime.** State lives in three tables —
  `rooms` (`state` jsonb + `version` for optimistic concurrency),
  `players` (HP, hand, ready, CPU flag, effects), and `game_events`
  (append-only battle log). See `supabase/schema.sql` and `SUPABASE_SETUP.md`.
- The pure reducer in `lib/room.ts` is the single brain: clients
  **load → reduce (`applyAction`) → persist** back with an optimistic
  `version` check, so concurrent writers can't clobber each other. Illegal
  actions are rejected by the reducer's validation.
- Every client **subscribes via `postgres_changes`** (rooms/players/game_events
  filtered by room) in `lib/db.ts` and reloads on any change. The host client
  also drives CPU turns.
- No login required: a stable `client_id` is generated in `localStorage`.
- Pure, testable game logic lives in `lib/{cards,rules,cpu,room}.ts`.
- Card faces are **original pixel-art SVG sprites** (`components/art/*`), no emoji.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + publishable key
# In the Supabase SQL editor, run supabase/schema.sql once.
npm run dev
```

If the Supabase env vars are missing, the app shows a setup screen instead of
crashing.

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key (`sb_publishable_…`); the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works as a fallback |

> Never put a `service_role` / secret key in a `NEXT_PUBLIC_` variable.

## Scripts

```bash
npm run dev     # local dev
npm run build   # production build
npm run lint    # eslint
npm test        # vitest (core rule logic)
```

## Deploy to Vercel

1. Run `supabase/schema.sql` in your Supabase project's SQL editor.
2. Import the repo into Vercel and set `NEXT_PUBLIC_SUPABASE_URL` +
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production / Preview / Development).
3. Deploy. The app is fully client-rendered, so no extra server config is needed.

## Known limitations

- The dev RLS policies in `schema.sql` are intentionally permissive for
  friend-testing; tighten them before any public release (see `SUPABASE_SETUP.md`).
- Player hands are stored in the (readable) `players` table for simplicity —
  fine for a casual party game, but not cheat-proof.
