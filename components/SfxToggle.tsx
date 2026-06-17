"use client";

import { useEffect, useState } from "react";
import { isSfxEnabled, playSfx, setSfxEnabled } from "@/lib/sfx";

/** Tiny sound on/off toggle. Audio only starts after a user gesture anyway. */
export function SfxToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(isSfxEnabled()), []);

  return (
    <button
      onClick={() => {
        const next = !on;
        setSfxEnabled(next);
        setOn(next);
        if (next) playSfx("stella");
      }}
      aria-pressed={on}
      aria-label="Sound"
      className={`rounded-lg border border-board-600 bg-board-800 px-2 py-1 text-xs ${className}`}
      title="Sound on/off"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}
