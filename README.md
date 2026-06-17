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

- **Host-authoritative netcode** over Supabase Realtime **Broadcast + Presence**
  — no database tables or RLS to configure (free tier is enough). The room
  creator runs the single reducer (`lib/room.ts`), validates every action, and
  broadcasts authoritative `RoomState` + append-only `GameEvent[]` to all clients.
- Clients send action *requests*; only the host mutates state.
- Pure, testable game logic lives in `lib/{cards,rules,cpu,room}.ts`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

If the Supabase env vars are missing, the app shows a setup screen instead of
crashing.

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Scripts

```bash
npm run dev     # local dev
npm run build   # production build
npm run lint    # eslint
npm test        # vitest (core rule logic)
```

## Deploy to Vercel

Import the repo, set the two env vars in Project Settings → Environment
Variables, and deploy. The app is fully client-rendered, so no extra server
configuration is required.

## Known limitations

- State lives on the host client. If the **host** hard-refreshes mid-match, the
  authoritative state is lost (other players can refresh and rejoin fine).
- Hands are broadcast in full state for simplicity — fine for a casual party
  game, but not cheat-proof.
