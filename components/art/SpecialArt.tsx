"use client";

import type { Card } from "@/lib/types";

// Outline color shared by every sprite so they read on any background.
const OUTLINE = "#0a0612";

// Renders a 16x16 string-grid as individual 1x1 pixels. Cells of " " or "."
// are treated as transparent and emit no rect.
function Pixels({
  grid,
  palette,
}: {
  grid: string[];
  palette: Record<string, string>;
}) {
  return (
    <>
      {grid.flatMap((row, y) =>
        row.split("").map((ch, x) =>
          palette[ch] ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={palette[ch]}
            />
          ) : null,
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// POTION (heal) — round flask with green liquid, neck cork, glass shine,
// and a sparkle by the rim.
// O outline · G glass · L liquid · H shine · k cork · s sparkle
// ---------------------------------------------------------------------------
const POTION_PALETTE: Record<string, string> = {
  O: OUTLINE,
  G: "#86efac",
  L: "#22c55e",
  H: "#f8fafc",
  k: "#b45309",
  s: "#fde68a",
};
const POTION_GRID = [
  ".............s..",
  ".....OOO....sss.",
  ".....OkO....ss..",
  ".....OkO........",
  "....OOkOO.......",
  "....OGGGO.......",
  "...OGHGGGO......",
  "..OGHGGGGGO.....",
  "..OGHLLLLLO.....",
  ".OGHLLLLLLLO....",
  ".OGLLLLLLLLO....",
  ".OGLLLLLLLLO....",
  ".OGLLLLLLLLO....",
  "..OGLLLLLLO.....",
  "..OOGGGGGOO.....",
  "....OOOOO.......",
];

// ---------------------------------------------------------------------------
// SHUFFLE (shuffle_hands) — two crossing curved arrows, one purple
// pointing right, one cyan pointing left.
// O outline · P purple · C cyan
// ---------------------------------------------------------------------------
const SHUFFLE_PALETTE: Record<string, string> = {
  O: OUTLINE,
  P: "#a855f7",
  C: "#22d3ee",
};
const SHUFFLE_GRID = [
  "................",
  "..OOOOOOOO......",
  ".OPPPPPPPPO.....",
  "OPPPPPPPPPPO..O.",
  ".OOOOOOOOPPOOOO.",
  ".......OOPPPPPO.",
  "........OPPPPO..",
  ".........OOOO...",
  "...OOOO.........",
  "..OCCCCOO.......",
  ".OCCCCCOOOOOOOO.",
  "OCCCCCCCCCCCCCCO",
  ".OCCOOOOOOOOOOO.",
  "..OCCCCO........",
  "...OOOO.........",
  "................",
];

// ---------------------------------------------------------------------------
// HOURGLASS (skip_turn) — gold frame, pink sand pooled in the lower bulb
// with a falling stream through the pinch.
// O outline · F gold frame · S pink sand · g glass
// ---------------------------------------------------------------------------
const HOURGLASS_PALETTE: Record<string, string> = {
  O: OUTLINE,
  F: "#fbbf24",
  S: "#ec4899",
  g: "#bae6fd",
};
const HOURGLASS_GRID = [
  "..OOOOOOOOOO....",
  "..OFFFFFFFFO....",
  "...OgggggggO....",
  "...OgSSSSSgO....",
  "....OgSSSgO.....",
  ".....OgSgO......",
  "......OSO.......",
  ".......O.......",
  "......OSO.......",
  ".....OgSgO......",
  "....OgSSSgO.....",
  "...OgSSSSSgO....",
  "...OSSSSSSSO....",
  "..OFFFFFFFFO....",
  "..OOOOOOOOOO....",
  "................",
];

// ---------------------------------------------------------------------------
// CRACKED SHIELD (limit_defense) — steel shield with a jagged red crack
// running down its face.
// O outline · S steel · H highlight · C crack (red)
// ---------------------------------------------------------------------------
const SHIELD_PALETTE: Record<string, string> = {
  O: OUTLINE,
  S: "#64748b",
  H: "#94a3b8",
  C: "#ef4444",
};
const SHIELD_GRID = [
  "...OOOOOOOO.....",
  "..OHHSSSSCSO....",
  ".OHHSSSSCCSSO...",
  ".OHSSSSCSSSSO...",
  ".OHSSSCSSSSSO...",
  ".OHSSSCSSSSSO...",
  ".OHSSSSCSSSSO...",
  ".OHSSSSCSSSSO...",
  ".OHSSSSSCSSSO...",
  "..OHSSSSCSSO....",
  "..OHSSSCSSSO....",
  "...OHSSCSSO.....",
  "....OHSCSO.....",
  ".....OHCO......",
  "......OO.......",
  "................",
];

// ---------------------------------------------------------------------------
// POISON (slip_damage) — toxic green droplet with a bright highlight,
// dripping a small falling bead beneath.
// O outline · D drop · L lighter drop · H highlight
// ---------------------------------------------------------------------------
const POISON_PALETTE: Record<string, string> = {
  O: OUTLINE,
  D: "#22c55e",
  L: "#4ade80",
  H: "#bbf7d0",
};
const POISON_GRID = [
  ".......O........",
  ".......O........",
  "......OLO.......",
  "......OLO.......",
  ".....OHLDO......",
  ".....OHLDO......",
  "....OHLLDDO.....",
  "...OHLLDDDDO....",
  "..OHLLDDDDDDO...",
  "..OHLDDDDDDDO...",
  "..ODDDDDDDDDO...",
  "...ODDDDDDDO....",
  "....OODDDOO.....",
  "......OOO.......",
  "........O.......",
  "......OLDO......",
];

// ---------------------------------------------------------------------------
// SPARKLE (fallback) — four-point star burst with a warm glowing core.
// O outline · S star body · C bright core
// ---------------------------------------------------------------------------
const SPARKLE_PALETTE: Record<string, string> = {
  O: OUTLINE,
  S: "#fde68a",
  C: "#fef9c3",
};
const SPARKLE_GRID = [
  ".......O........",
  ".......OO.......",
  "......OSSO......",
  "......OSSO......",
  ".O...OSSSO...O..",
  "..OOOSSSSSSOO...",
  "...OSSSCCSSO....",
  "..OSSCCCCSSO....",
  "..OSSCCCCSSO....",
  "...OSSSCCSSO....",
  "..OOOSSSSSSOO...",
  ".O...OSSSO...O..",
  "......OSSO......",
  "......OSSO......",
  ".......OO.......",
  ".......O........",
];

function spriteFor(card: Card): {
  grid: string[];
  palette: Record<string, string>;
} {
  switch (card.special) {
    case "heal":
      return { grid: POTION_GRID, palette: POTION_PALETTE };
    case "shuffle_hands":
      return { grid: SHUFFLE_GRID, palette: SHUFFLE_PALETTE };
    case "skip_turn":
      return { grid: HOURGLASS_GRID, palette: HOURGLASS_PALETTE };
    case "limit_defense":
      return { grid: SHIELD_GRID, palette: SHIELD_PALETTE };
    case "slip_damage":
      return { grid: POISON_GRID, palette: POISON_PALETTE };
    default:
      return { grid: SPARKLE_GRID, palette: SPARKLE_PALETTE };
  }
}

export function SpecialArt({ card, px = 48 }: { card: Card; px?: number }) {
  const { grid, palette } = spriteFor(card);
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label={card.name}
    >
      <Pixels grid={grid} palette={palette} />
    </svg>
  );
}
