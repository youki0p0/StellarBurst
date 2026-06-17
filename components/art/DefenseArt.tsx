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

// Pip overlay colors keyed by strength (number of pips). Pips sit on the body.
const PIP_COLOR = "#fbbf24";

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

// ---------------------------------------------------------------------------
// ARMOR — steel chestplate with a gold cross/studs.
// Legend: o outline | s steel | l light steel | d dark steel | t gold stud
// ---------------------------------------------------------------------------
const ARMOR_PALETTE: Record<string, string> = {
  o: OUTLINE,
  s: "#94a3b8",
  l: "#cbd5e1",
  d: "#64748b",
  t: "#fbbf24",
};

const ARMOR_GRID: string[] = [
  "                ",
  "  oo        oo  ",
  " ollo      ollo ",
  " olloooooooollo ",
  " ollllllllllllo ",
  "olllssssssslllo ",
  "ollssslsslssslo ",
  "olsssltttlsssslo",
  "olssslttslssslo ",
  "olsssslttslsslo ",
  "olddsslttslsddo ",
  " olddssttssddlo ",
  " oldddsssddddo  ",
  "  olddddddddo   ",
  "   oodddddoo    ",
  "     ooooo      ",
];

function pickMotif(defense: Card["defense"]):
  | { kind: "mirror" }
  | { kind: "armor" }
  | { kind: "shield"; pips: number; tint?: string } {
  switch (defense) {
    case "reflect":
      return { kind: "mirror" };
    case "nullify_fatal":
      return { kind: "armor" };
    case "reduce_third":
      return { kind: "shield", pips: 1 };
    case "reduce_half":
      return { kind: "shield", pips: 2 };
    case "reduce_twothirds":
      return { kind: "shield", pips: 3 };
    default:
      return { kind: "shield", pips: 0 };
  }
}

// Pip positions on the shield body, drawn as a small horizontal row.
const PIP_SLOTS: [number, number][] = [
  [6, 6],
  [8, 6],
  [10, 6],
];

export function DefenseArt({ card, px = 48 }: { card: Card; px?: number }) {
  const motif = pickMotif(card.defense);

  let grid: string[];
  let palette: Record<string, string>;

  if (motif.kind === "mirror") {
    grid = MIRROR_GRID;
    palette = MIRROR_PALETTE;
  } else if (motif.kind === "armor") {
    grid = ARMOR_GRID;
    palette = ARMOR_PALETTE;
  } else {
    grid = SHIELD_GRID;
    palette = SHIELD_PALETTE;
  }

  const pips =
    motif.kind === "shield"
      ? PIP_SLOTS.slice(0, Math.min(motif.pips, PIP_SLOTS.length))
      : [];

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
      {pips.map(([x, y]) => (
        <rect
          key={`pip-${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={PIP_COLOR}
        />
      ))}
    </svg>
  );
}
