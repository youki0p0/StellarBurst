# PROJECT_CONTEXT.md

## Overview

**StellarBurst** is a lightweight browser-based multiplayer card battle game.

The target is a mobile-friendly party game for friends. The game should support 2–8 players, with realtime room synchronization through Supabase Realtime.

The initial goal is an MVP that can be deployed to Vercel and played casually through shared room codes.

## Design Philosophy

The game should be:

- Fast to start.
- Easy to understand.
- Chaotic enough to be fun with friends.
- Not too punitive.
- Better as a party game than a serious competitive TCG.
- Simple enough to finish a match quickly.

## Inspirations

Do not copy names, art, assets, card text, or exact copyrighted mechanics from existing games.

The intended feel is:

- Party card battle.
- Simple turn-based multiplayer.
- Chaotic item/card interactions.
- Readable mobile UI.
- Pixel-art fantasy interface.

## MVP Priority

Prioritize in this order:

1. Room creation and joining.
2. Lobby with ready/start.
3. Realtime game state synchronization.
4. Core turn-based battle.
5. CPU fallback when only 2 human players start.
6. Pixel-art card visuals.
7. Polish and animations.

Do not overbuild before the MVP works.

## Non-goals for MVP

Do not build these in the first version unless all MVP features are complete:

- Account login.
- Ranking.
- Long-term progression.
- Deck building.
- Paid items.
- Complex matchmaking.
- Animation-heavy effects.
- Advanced AI.
- Real-time action combat.
