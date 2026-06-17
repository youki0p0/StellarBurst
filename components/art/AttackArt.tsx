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
// SWORD (colorless) — vertical steel blade, gold crossguard + pommel.
// O outline · S steel · H highlight · g gold · d dark-gold
// ---------------------------------------------------------------------------
const SWORD_PALETTE: Record<string, string> = {
  O: OUTLINE,
  S: "#cbd5e1",
  H: "#f8fafc",
  g: "#fbbf24",
  d: "#b45309",
};
const SWORD_GRID = [
  "......OO........",
  ".....OHSO.......",
  ".....OHSO.......",
  ".....OHSO.......",
  ".....OHSO.......",
  ".....OHSO.......",
  ".....OHSO.......",
  "...OOOHSOOO.....",
  "...OgggdggO.....",
  "...OOOgdOOO.....",
  ".....OgdO.......",
  ".....OgdO.......",
  "....OgggdO......",
  "....OgddgO......",
  "....OOggOO......",
  "......OO........",
];

// ---------------------------------------------------------------------------
// FLAME (red) — teardrop fire with hot inner core.
// O outline · R deep red · F orange · Y yellow core
// ---------------------------------------------------------------------------
const FLAME_PALETTE: Record<string, string> = {
  O: OUTLINE,
  R: "#ef4444",
  F: "#f97316",
  Y: "#fbbf24",
};
const FLAME_GRID = [
  ".......O........",
  "......ORO.......",
  "......ORO.......",
  ".....ORFO......",
  ".....ORFO.O....",
  "....ORFFOFO....",
  "....ORFYFRO....",
  "...ORFYYFFRO...",
  "...ORFYYYFRO...",
  "..ORFFYYYFFRO..",
  "..ORFYYYYYFRO..",
  "..ORFYYYYYFRO..",
  "..ORFFYYYFFRO..",
  "...ORFFFFFRO...",
  "....ORRRRRO....",
  ".....OOOOO.....",
];

// ---------------------------------------------------------------------------
// BOLT (blue) — jagged lightning, electric blue with white-hot core.
// O outline · B sky blue · L pale blue · C yellow core
// ---------------------------------------------------------------------------
const BOLT_PALETTE: Record<string, string> = {
  O: OUTLINE,
  B: "#38bdf8",
  L: "#e0f2fe",
  C: "#facc15",
};
const BOLT_GRID = [
  "........OOO.....",
  ".......OBLO.....",
  "......OBLBO.....",
  ".....OBLBO......",
  "....OBLCBO......",
  "...OBLCBO.......",
  "..OBLCBOO.......",
  ".OBLCBBO........",
  ".OLCBBBBBO......",
  ".OBBBBLCBO......",
  "...OOOBLCBO.....",
  ".....OBLCBO....",
  "......OBLCO....",
  ".......OBLO....",
  "........OBO....",
  ".........O....",
];

// ---------------------------------------------------------------------------
// CLAW (green) — three diagonal slash marks.
// O outline · G green · L light green
// ---------------------------------------------------------------------------
const CLAW_PALETTE: Record<string, string> = {
  O: OUTLINE,
  G: "#22c55e",
  L: "#86efac",
};
const CLAW_GRID = [
  "..O....O....O...",
  ".OLO..OLO..OLO..",
  ".OGO..OGO..OGO..",
  ".OGO..OGO..OGO..",
  ".OGO..OGO..OGO..",
  "OGLO.OGLO.OGLO..",
  "OGGO.OGGO.OGGO..",
  "OGGO.OGGO.OGGO..",
  "OGGO.OGGO.OGGO..",
  "OGGO.OGGO.OGGO..",
  ".OGO..OGO..OGO..",
  ".OGO..OGO..OGO..",
  ".OGO..OGO..OGO..",
  ".OGO..OGO..OGO..",
  "..OO...OO...OO..",
  "................",
];

// ---------------------------------------------------------------------------
// SKULL (fatal) — bone white skull with neon-pink glowing eye sockets.
// O outline · B bone · W bright bone · P pink glow · p deep pink
// ---------------------------------------------------------------------------
const SKULL_PALETTE: Record<string, string> = {
  O: OUTLINE,
  B: "#f1f5f9",
  W: "#ffffff",
  P: "#ec4899",
  p: "#9d174d",
};
const SKULL_GRID = [
  "....OOOOOO.....",
  "...OWBBBBWO....",
  "..OBBBBBBBBO...",
  ".OBBBBBBBBBBO..",
  ".OBBBBBBBBBBO..",
  ".OBOPPBBPPOBO..",
  ".OBPPPBBPPPBO..",
  ".OBOPpBBpPOBO..",
  ".OBBBBPPBBBBO..",
  ".OBBBBPPBBBBO..",
  "..OBBOBBOBBO...",
  "...OBOBBOBO....",
  "...OBOBBOBO....",
  "...OBOBBOBO....",
  "....OO..OO....",
  "..............",
];

function spriteFor(card: Card): {
  grid: string[];
  palette: Record<string, string>;
} {
  if (card.fatal) {
    return { grid: SKULL_GRID, palette: SKULL_PALETTE };
  }
  switch (card.color) {
    case "red":
      return { grid: FLAME_GRID, palette: FLAME_PALETTE };
    case "blue":
      return { grid: BOLT_GRID, palette: BOLT_PALETTE };
    case "green":
      return { grid: CLAW_GRID, palette: CLAW_PALETTE };
    case "colorless":
    default:
      return { grid: SWORD_GRID, palette: SWORD_PALETTE };
  }
}

export function AttackArt({ card, px = 48 }: { card: Card; px?: number }) {
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
