"use client";

import { useState } from "react";
import { LangToggle } from "@/components/LangToggle";
import { useGameStore } from "@/store/gameStore";
import { useT } from "@/store/i18n";
import { MAX_PLAYERS } from "@/lib/room";

export function RoomLobby() {
  const t = useT();
  const roomState = useGameStore((s) => s.roomState);
  const identity = useGameStore((s) => s.identity);
  const isHost = useGameStore((s) => s.isHost);
  const toggleReady = useGameStore((s) => s.toggleReady);
  const startMatch = useGameStore((s) => s.startMatch);
  const addCpu = useGameStore((s) => s.addCpu);
  const removeCpu = useGameStore((s) => s.removeCpu);
  const [copied, setCopied] = useState(false);

  if (!roomState) return null;

  const me = roomState.players.find((p) => p.clientId === identity.id);
  const canStart = isHost && roomState.players.length >= 2;
  const roomFull = roomState.players.length >= MAX_PLAYERS;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomState.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <div className="panel p-4 text-center">
        <div className="text-xs uppercase tracking-widest text-slate-400">
          {t("lobby.roomCode")}
        </div>
        <button
          onClick={copyCode}
          className="mt-1 text-5xl font-black tracking-[0.3em] text-neon-gold"
        >
          {roomState.code}
        </button>
        <div className="mt-1 text-sm text-slate-400">
          {copied ? t("lobby.copied") : t("lobby.tapToCopy")}
        </div>
      </div>

      <div className="panel flex-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{t("lobby.players")}</h2>
          <span className="text-sm text-slate-400">
            {roomState.players.length}/{MAX_PLAYERS}
          </span>
        </div>
        <ul className="space-y-2">
          {roomState.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-board-900/60 px-3 py-2.5"
            >
              <span className="flex items-center gap-2">
                <span className="font-semibold">{p.name}</span>
                {p.isHost && <span className="text-xs text-neon-cyan">{t("common.host")}</span>}
                {p.isCPU && (
                  <span className="rounded bg-board-600 px-1.5 py-0.5 text-[10px] font-bold">
                    {t("common.cpu")}
                  </span>
                )}
                {p.clientId === identity.id && (
                  <span className="text-xs text-slate-400">{t("common.you")}</span>
                )}
              </span>
              {isHost && p.isCPU ? (
                <button
                  onClick={() => removeCpu(p.id)}
                  className="text-sm font-bold text-card-red hover:brightness-125"
                  aria-label={`Remove ${p.name}`}
                >
                  ✕
                </button>
              ) : (
                <span
                  className={
                    p.isReady ? "text-sm font-bold text-card-green" : "text-sm text-slate-500"
                  }
                >
                  {p.isReady ? t("lobby.ready") : "…"}
                </span>
              )}
            </li>
          ))}
        </ul>

        {isHost && (
          <button
            onClick={addCpu}
            disabled={roomFull}
            className="btn-secondary mt-3 w-full"
          >
            {t("lobby.addCpu")}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {!isHost && (
          <button onClick={toggleReady} className="btn-primary w-full">
            {me?.isReady ? t("lobby.notReady") : t("lobby.imReady")}
          </button>
        )}
        {isHost && (
          <>
            <button onClick={startMatch} disabled={!canStart} className="btn-primary w-full">
              {roomState.players.length < 2 ? t("lobby.needOpponent") : t("lobby.startBattle")}
            </button>
            <p className="text-center text-xs text-slate-500">{t("lobby.hint")}</p>
          </>
        )}
      </div>
    </div>
  );
}
