"use client";

import type { Card } from "@/lib/types";

// Hand-made 16x16 pixel-art sprites for DEFENSE cards.
// No emoji, no text, no external assets — every cell is a 1x1 <rect>.

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
          ) : null
        )
      )}
    </>
  );
}

const OUTLINE = "#0a0612";

// ---------------------------------------------------------------------------
// SHIELD — sky-blue body, light highlight, gold trim. Pips hint at strength.
// Legend: o outline | b body | d deep body | h highlight | t gold trim
// ---------------------------------------------------------------------------
const SHIELD_PALETTE: Record<string, string> = {
  o: OUTLINE,
  b: "#38bdf8",
  d: "#0ea5e9",
  h: "#e0f2fe",
  t: "#fbbf24",
};

const SHIELD_GRID: string[] = [
  "                ",
  "   oooooooooo   ",
  "  otttttttttto  ",
  "  othhhbbbbbto  ",
  "  othhbbbbbbto  ",
  "  otbbbbbbbbto  ",
  "  otbbbbbbbbto  ",
  "  otbbbbbbbbto  ",
  "  otdbbbbbbdto  ",
  "  otddbbbbddto  ",
  "   otddbbddto   ",
  "    otddddto    ",
  "     otddto     ",
  "      otto      ",
  "       oo       ",
  "                ",
];

// ---------------------------------------------------------------------------
// MIRROR — purple diamond frame with a bright white glint streak.
// Legend: o outline | f frame (deep purple) | g glass (light purple) | w white glint | s shadow
// ---------------------------------------------------------------------------
const MIRROR_PALETTE: Record<string, string> = {
  o: OUTLINE,
  f: "#a855f7",
  g: "#e9d5ff",
  w: "#ffffff",
  s: "#7e22ce",
};

const MIRROR_GRID: string[] = [
  "       oo       ",
  "      offfo     ",
  "     offwffo    ",
  "    offwwgffo   ",
  "   offwggsgffo  ",
  "  offwgggsggffo ",
  " offwggggsgggffo",
  " ofwgggggsgggsfo",
  " offgggggsggssfo",
  "  offggggsgssfo ",
  "   offgggssssfo ",
  "    offgssssfo  ",
  "     offsssfo   ",
  "      offsfo    ",
  "       offo     ",
  "        oo      ",
];

export function DefenseArt({ card, px = 48 }: { card: Card; px?: number }) {
  // reflect → mirror sprite; block (and any fallback) → shield sprite.
  const isReflect = card.defense === "reflect";
  const grid = isReflect ? MIRROR_GRID : SHIELD_GRID;
  const palette = isReflect ? MIRROR_PALETTE : SHIELD_PALETTE;

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
