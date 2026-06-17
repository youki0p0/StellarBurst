"use client";

import type { Card } from "@/lib/types";

// Hand-made 16x16 pixel-art sprites for DEFENSE (shield) cards.
// Theme: STELLA — stars / orbits / magnetospheres / gravity lenses.
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
// "block" → STAR SHIELD / MAGNETOSPHERE
// A glowing star/planet wrapped by a protective magnetic arc.
// Legend: o outline | b arc body | d deep arc | h arc highlight
//         c star core | s star surface | t gold flare
// ---------------------------------------------------------------------------
const STAR_SHIELD_PALETTE: Record<string, string> = {
  o: OUTLINE,
  b: "#38bdf8",
  d: "#0ea5e9",
  h: "#e0f2fe",
  c: "#fbbf24",
  s: "#fde68a",
  t: "#fbbf24",
};

const STAR_SHIELD_GRID: string[] = [
  "     hbbbbh     ",
  "   hbdoooodbh   ",
  "  hbo      obh  ",
  " hbo  ssss  obh ",
  " bo  scccccs ob ",
  "dbo sccssccs odb",
  "do  ccs  scc  od",
  "do  ccs  scc  od",
  "dbo sccssccs odb",
  " bo  scccccs ob ",
  " hbo  ssss  obh ",
  "  hbo      obh  ",
  "   hbdoooodbh   ",
  "     hbbbbh     ",
  "      ttt       ",
  "       t        ",
];

// ---------------------------------------------------------------------------
// "reflect" → MIRROR ORBIT / GRAVITY LENS
// A circular lens that bends light, with a bright diagonal glint.
// Legend: o outline | f frame | g glass | l light glass | w white glint | s shadow
// ---------------------------------------------------------------------------
const LENS_PALETTE: Record<string, string> = {
  o: OUTLINE,
  f: "#a855f7",
  g: "#c084fc",
  l: "#e9d5ff",
  w: "#ffffff",
  s: "#7e22ce",
};

const LENS_GRID: string[] = [
  "     oooooo     ",
  "   ooffffffoo   ",
  "  offlgggggffo  ",
  " offlwgggggsffo ",
  " oflwwggggssfo  ",
  "offlwgggggssffo ",
  "offlggwgggsssffo",
  "ofgggwwggggsssfo",
  "ofgggggwwgggssfo",
  "offgggggwwgsssfo",
  " offgggggwwsffo ",
  " offsgggggwsffo ",
  "  offsgggggwfo  ",
  "   ooffsssfoo   ",
  "     oooooo     ",
  "                ",
];

// ---------------------------------------------------------------------------
// "pass" → GRAVITY PASS / ORBIT DEFLECT
// A curved orbit arrow that catches an incoming mote and sends it sideways.
// Legend: o outline | a arc body | b arc bright | h arrow head | m gold mote | g mote glow
// ---------------------------------------------------------------------------
const PASS_PALETTE: Record<string, string> = {
  o: OUTLINE,
  a: "#22d3ee",
  b: "#a5f3fc",
  h: "#67e8f9",
  m: "#fbbf24",
  g: "#fef08a",
};

const PASS_GRID: string[] = [
  "       gmg      ",
  "       gmg      ",
  "        m       ",
  "     ooo        ",
  "   ooaabo       ",
  "  oabbbao       ",
  " oabo oao   o   ",
  " oab      ooho  ",
  " oab     oahho  ",
  " oabo   oahhhho ",
  "  oabo ooahhho  ",
  "   oaaaaaaaho   ",
  "    ooaaaooo    ",
  "      ooo       ",
  "                ",
  "                ",
];

export function DefenseArt({ card, px = 48 }: { card: Card; px?: number }) {
  let grid = STAR_SHIELD_GRID;
  let palette = STAR_SHIELD_PALETTE;

  if (card.defense === "reflect") {
    grid = LENS_GRID;
    palette = LENS_PALETTE;
  } else if (card.defense === "pass") {
    grid = PASS_GRID;
    palette = PASS_PALETTE;
  }
  // "block" and any fallback use the STAR SHIELD sprite.

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
