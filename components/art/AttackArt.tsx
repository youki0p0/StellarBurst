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
// SOLAR FLARE (colorless) — a white-gold star with a curved flare arc sweeping
// off its edge. Bright corona, hot white core.
// O outline · g gold · y pale gold · W white core · a arc glow
// ---------------------------------------------------------------------------
const SOLAR_PALETTE: Record<string, string> = {
  O: OUTLINE,
  g: "#fde68a",
  y: "#fef9c3",
  W: "#f8fafc",
  a: "#facc15",
};
const SOLAR_GRID = [
  ".......O........",
  "......OgO.......",
  "....O.OyO.O.....",
  "...OgOOyOOgO....",
  "....OOgyyOO.....",
  "..O..OyWWyO..O..",
  ".OgOOyWWWWyOOgO.",
  "..OOyWWWWWWyOO..",
  ".....OyWWyO.....",
  "...OOgyyyyOO....",
  "..OgOOyOOyOgaO..",
  "...O.OyO.OaO....",
  "......OO..OaO...",
  ".........OyaO...",
  "..........OaO...",
  "...........O....",
];

// ---------------------------------------------------------------------------
// RED GIANT BURST (red) — a swelling red-orange star, fat core with flame
// tongues licking outward and a hot amber center.
// O outline · R deep red · F orange · Y amber core · W hot center
// ---------------------------------------------------------------------------
const REDGIANT_PALETTE: Record<string, string> = {
  O: OUTLINE,
  R: "#ef4444",
  F: "#f97316",
  Y: "#fbbf24",
  W: "#fef3c7",
};
const REDGIANT_GRID = [
  "...O....O....O..",
  "..ORO..ORO..ORO.",
  "...ORO.ORO.ORO..",
  "....ORRRRRRRO...",
  "...ORFFFFFFFRO..",
  "..ORFFYYYYYFFRO.",
  ".ORFFYYWWWYYFFRO",
  ".ORFYYWWWWWYYFRO",
  ".ORFYYWWWWWYYFRO",
  ".ORFFYYWWWYYFFRO",
  "..ORFFYYYYYFFRO.",
  "...ORFFFFFFFRO..",
  "....ORRRRRRRO...",
  "...ORO.ORO.ORO..",
  "..ORO..ORO..ORO.",
  "...O....O....O..",
];

// ---------------------------------------------------------------------------
// BLUE COMET (blue) — a blue-cyan comet head with a streaking tail trailing
// from upper-right to lower-left.
// O outline · B sky blue · C cyan · L pale ice · W white core
// ---------------------------------------------------------------------------
const COMET_PALETTE: Record<string, string> = {
  O: OUTLINE,
  B: "#38bdf8",
  C: "#22d3ee",
  L: "#e0f2fe",
  W: "#f8fafc",
};
const COMET_GRID = [
  "............OO..",
  "...........OBLO.",
  "..........OBLBO.",
  ".........OCLBO..",
  "........OCBBO...",
  "...O...OCBBO....",
  "..OBO.OCWWBO....",
  "...OBOCWWWCBO...",
  "....OBLWWWLBO...",
  ".....OBCWCBO....",
  "....OBO.OBO.....",
  "...OBO..OCBO....",
  "..OBO....OCBO...",
  ".OBO......OCBO..",
  ".OO........OBO..",
  "............OO..",
];

// ---------------------------------------------------------------------------
// GREEN AURORA (green) — a green star with shimmering aurora ribbons waving
// behind it.
// O outline · G green · L light green · P pale mint · W white star core
// ---------------------------------------------------------------------------
const AURORA_PALETTE: Record<string, string> = {
  O: OUTLINE,
  G: "#22c55e",
  L: "#4ade80",
  P: "#bbf7d0",
  W: "#f0fdf4",
};
const AURORA_GRID = [
  "..O.......O.....",
  ".OLO.....OLO....",
  ".OPO.O..OPO.....",
  ".OLOOLO.OLO.O...",
  ".OLOOPOOOLOOLO..",
  "..OLOLOOPLOLPO..",
  "...OPLO.OLPLO...",
  "......O.O.......",
  ".......W........",
  "....OPLWLPO.....",
  "...OPLWWWLPO....",
  "..OGLWWWWWLGO...",
  "...OPLWWWLPO....",
  "....OPLWLPO.....",
  ".....O.W.O......",
  ".......O........",
];

// ---------------------------------------------------------------------------
// SUPERNOVA (fatal) — a bright exploding star: white-pink-gold core hurling
// magenta rays in every direction. The most dramatic sprite.
// O outline · W white core · y gold · p pink · M magenta ray · P deep magenta
// ---------------------------------------------------------------------------
const SUPERNOVA_PALETTE: Record<string, string> = {
  O: OUTLINE,
  W: "#ffffff",
  y: "#fde047",
  p: "#f9a8d4",
  M: "#ec4899",
  P: "#a21caf",
};
const SUPERNOVA_GRID = [
  "..O....OMO....O.",
  ".OMO...OpO...OMO",
  "..OPO..OpO..OPO.",
  "...OpO.OMO.OpO..",
  "....OpOpyOpO....",
  ".O...OpyypO...O.",
  "OMOpOpyWWyOpOpMO",
  ".OMpypWWWWypMpO.",
  ".OMpypWWWWypMpO.",
  "OMOpOpyWWyOpOpMO",
  ".O...OpyypO...O.",
  "....OpOpyOpO....",
  "...OpO.OMO.OpO..",
  "..OPO..OpO..OPO.",
  ".OMO...OpO...OMO",
  "..O....OMO....O.",
];

function spriteFor(card: Card): {
  grid: string[];
  palette: Record<string, string>;
} {
  if (card.fatal) {
    return { grid: SUPERNOVA_GRID, palette: SUPERNOVA_PALETTE };
  }
  switch (card.color) {
    case "red":
      return { grid: REDGIANT_GRID, palette: REDGIANT_PALETTE };
    case "blue":
      return { grid: COMET_GRID, palette: COMET_PALETTE };
    case "green":
      return { grid: AURORA_GRID, palette: AURORA_PALETTE };
    case "colorless":
    default:
      return { grid: SOLAR_GRID, palette: SOLAR_PALETTE };
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
