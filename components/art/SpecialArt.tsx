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
// CORE REKINDLE (heal) — a star core re-igniting: white-hot center, gold
// flame body, with a green life-spark and rising embers.
// O outline · W white core · C bright gold · F gold flame · g green spark
// ---------------------------------------------------------------------------
const REKINDLE_PALETTE: Record<string, string> = {
  O: OUTLINE,
  W: "#ffffff",
  C: "#fde68a",
  F: "#fbbf24",
  g: "#4ade80",
};
const REKINDLE_GRID = [
  ".......O........",
  ".....g.O.g......",
  "......OFO.......",
  ".......F....g...",
  "...O..OFO..O....",
  "..OFO.OCO.OFO...",
  "...OFOOCOOFO....",
  "....OFCCWCFO....",
  "...OFCWWWCCFO...",
  "...OFCWWWWCFO...",
  "....OCCWWCCO....",
  "....OFCCCCFO....",
  ".....OFCCFO.....",
  "..g...OFFO...g..",
  ".......OO.......",
  "................",
];

// ---------------------------------------------------------------------------
// NEBULA SHUFFLE (shuffle_hands) — a swirling nebula cloud with purple,
// cyan, and pink wisps spiraling around a bright core, dotted with stars.
// O outline · P purple · C cyan · K pink · W star
// ---------------------------------------------------------------------------
const NEBULA_PALETTE: Record<string, string> = {
  O: OUTLINE,
  P: "#a855f7",
  C: "#22d3ee",
  K: "#ec4899",
  W: "#ffffff",
};
const NEBULA_GRID = [
  "....OOOO...W....",
  "...OPPPPOO......",
  "..OPPCCCPPO.W...",
  ".OPPCCCCCKPO....",
  ".OPCCWCCKKKO....",
  "OPCCWCCKKKKPO...",
  "OPCCCCKKWKKPO.W.",
  "OPPCCCKKKKKPO...",
  ".OPPCCKKKKPO....",
  "W.OPPPKKKPO.....",
  "...OOPPPOO...W..",
  ".....OOO........",
  "..W.......W.....",
  "...........W....",
  ".....W..........",
  "................",
];

// ---------------------------------------------------------------------------
// ECLIPSE (skip_turn) — a dark disc eclipsing a star, surrounded by a
// bright gold corona ring with flares streaming outward.
// O outline · F gold corona · C bright corona · D dark disc · h disc shade
// ---------------------------------------------------------------------------
const ECLIPSE_PALETTE: Record<string, string> = {
  O: OUTLINE,
  F: "#fbbf24",
  C: "#fde68a",
  D: "#0a0612",
  h: "#1e1b2e",
};
const ECLIPSE_GRID = [
  ".......C........",
  "...C...F...C....",
  "....F.OCO.F.....",
  "....OOCCCOO.....",
  "...OCCFFFCCO....",
  "..OCFODDDOFCO...",
  ".COFODhhhDOFOC..",
  "C.FODhhhhhDOF.C.",
  ".COFODhhhDOFOC..",
  "..OCFODDDOFCO...",
  "...OCCFFFCCO....",
  "....OOCCCOO.....",
  "....F.OCO.F.....",
  "...C...F...C....",
  ".......C........",
  "................",
];

// ---------------------------------------------------------------------------
// RETROGRADE ORBIT (reverse) — two curved arrows forming a counter-rotating
// orbit loop, cyan sweeping one way and purple the other, around a core.
// O outline · C cyan arrow · P purple arrow · W core star
// ---------------------------------------------------------------------------
const RETROGRADE_PALETTE: Record<string, string> = {
  O: OUTLINE,
  C: "#22d3ee",
  P: "#a855f7",
  W: "#ffffff",
};
const RETROGRADE_GRID = [
  "....OOOOO.......",
  "...OCCCCCOO.....",
  "..OCCOOOOCCO....",
  ".OCCO....OCCO...",
  ".OCO..O...OCO.O.",
  "OCO..OCO..OCOOO.",
  "OCO.OCCCO.OCCCO.",
  "OCO..OCO........",
  ".OPO..O....OPO..",
  ".OPPPO.OCO.OPO..",
  "..OPPPOOPO.OPO..",
  "...OPPO.OPOOPO.O",
  "....OOO..OPPPO.O",
  ".........OPPO.O.",
  "..........OOOO..",
  "................",
];

// ---------------------------------------------------------------------------
// METEOR DECAY (slip_damage) — small descending meteor bits trailing toxic
// green debris, falling diagonally across the frame.
// O outline · H hot head · T trail · t faint trail
// ---------------------------------------------------------------------------
const METEOR_PALETTE: Record<string, string> = {
  O: OUTLINE,
  H: "#bbf7d0",
  T: "#4ade80",
  t: "#22c55e",
};
const METEOR_GRID = [
  ".t..............",
  "Ot.....t........",
  "OTt...OTt.......",
  ".OTt...OTt......",
  "..OHO...OTt.....",
  "...O.....OHO....",
  ".........O......",
  "...t............",
  "..OTt......t....",
  ".OTHO.....OTt...",
  "..OO.......OTt..",
  "............OHO.",
  ".....t......OO..",
  "....OTt.........",
  "...OTHO.....t...",
  "....OO.....OHO..",
];

// ---------------------------------------------------------------------------
// STARBURST (fallback) — four-point star sparkle with a warm glowing core
// and small accent twinkles in the corners.
// O outline · S star body · C bright core · t twinkle
// ---------------------------------------------------------------------------
const STARBURST_PALETTE: Record<string, string> = {
  O: OUTLINE,
  S: "#fde68a",
  C: "#fef9c3",
  t: "#fde68a",
};
const STARBURST_GRID = [
  ".......O.....t..",
  ".......OO..tOt..",
  "......OSO...t...",
  "......OSO.......",
  ".O...OSSSO...O..",
  "..OOOSSSSSOO...O",
  "...OSSCCCSSO....",
  ".OOSSCCWCCSSOO..",
  "...OSSCCCSSO....",
  "..OOOSSSSSOO....",
  ".O...OSSSO...O..",
  "......OSO.......",
  "..t...OSO.......",
  ".tOt..OO........",
  "..t....O........",
  "................",
];

// White-core variant key for STARBURST uses 'W'; add to palette.
STARBURST_PALETTE.W = "#ffffff";

function spriteFor(card: Card): {
  grid: string[];
  palette: Record<string, string>;
} {
  switch (card.special) {
    case "heal":
      return { grid: REKINDLE_GRID, palette: REKINDLE_PALETTE };
    case "shuffle_hands":
      return { grid: NEBULA_GRID, palette: NEBULA_PALETTE };
    case "skip_turn":
      return { grid: ECLIPSE_GRID, palette: ECLIPSE_PALETTE };
    case "reverse":
      return { grid: RETROGRADE_GRID, palette: RETROGRADE_PALETTE };
    case "slip_damage":
      return { grid: METEOR_GRID, palette: METEOR_PALETTE };
    default:
      return { grid: STARBURST_GRID, palette: STARBURST_PALETTE };
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
