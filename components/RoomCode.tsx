"use client";

import { useState } from "react";
import { useT } from "@/store/i18n";

/**
 * Room code that stays hidden by default (streaming-safe) and is revealed with
 * an eye toggle. When revealed, tapping the code copies it.
 */
export function RoomCode({ code, large = false }: { code: string; large?: boolean }) {
  const t = useT();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!show) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const shown = show ? code : "•".repeat(code.length);

  const eye = (
    <button
      onClick={() => setShow((v) => !v)}
      aria-pressed={show}
      aria-label={show ? t("room.hide") : t("room.reveal")}
      title={show ? t("room.hide") : t("room.reveal")}
      className={
        large
          ? "rounded-lg border border-board-600 bg-board-800 px-2 py-1 text-lg"
          : "rounded border border-board-600 bg-board-800 px-1 text-xs"
      }
    >
      {show ? "🙈" : "👁"}
    </button>
  );

  if (large) {
    return (
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-slate-400">{t("lobby.roomCode")}</div>
        <div className="mt-1 flex items-center justify-center gap-3">
          <button
            onClick={copy}
            disabled={!show}
            className="text-5xl font-black tracking-[0.3em] text-neon-gold disabled:cursor-default"
          >
            {shown}
          </button>
          {eye}
        </div>
        <div className="mt-1 text-sm text-slate-400">
          {!show ? t("room.hiddenHint") : copied ? t("lobby.copied") : t("lobby.tapToCopy")}
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {t("game.room")}{" "}
      <button onClick={copy} disabled={!show} className="font-bold tabular-nums text-neon-gold disabled:cursor-default">
        {shown}
      </button>
      {eye}
    </span>
  );
}
