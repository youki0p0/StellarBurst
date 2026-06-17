"use client";

import { useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { MAX_PLAYERS } from "@/lib/room";

export function RoomLobby() {
  const roomState = useGameStore((s) => s.roomState);
  const identity = useGameStore((s) => s.identity);
  const isHost = useGameStore((s) => s.isHost);
  const toggleReady = useGameStore((s) => s.toggleReady);
  const startMatch = useGameStore((s) => s.startMatch);
  const [copied, setCopied] = useState(false);

  if (!roomState) return null;

  const me = roomState.players.find((p) => p.clientId === identity.id);
  const humans = roomState.players.filter((p) => !p.isCPU);
  const allReady = humans.every((p) => p.isReady);
  const canStart = isHost && humans.length >= 2 && allReady;

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
      <div className="panel p-4 text-center">
        <div className="text-xs uppercase tracking-widest text-slate-400">Room code</div>
        <button
          onClick={copyCode}
          className="mt-1 text-5xl font-black tracking-[0.3em] text-neon-gold"
        >
          {roomState.code}
        </button>
        <div className="mt-1 text-sm text-slate-400">
          {copied ? "Copied!" : "Tap code to copy · share it with friends"}
        </div>
      </div>

      <div className="panel flex-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Players</h2>
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
                {p.isHost && <span className="text-xs text-neon-cyan">host</span>}
                {p.isCPU && (
                  <span className="rounded bg-board-600 px-1.5 py-0.5 text-[10px] font-bold">
                    CPU
                  </span>
                )}
                {p.clientId === identity.id && <span className="text-xs text-slate-400">you</span>}
              </span>
              <span
                className={
                  p.isReady ? "text-sm font-bold text-card-green" : "text-sm text-slate-500"
                }
              >
                {p.isReady ? "READY" : "…"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        {!isHost && (
          <button onClick={toggleReady} className="btn-primary w-full">
            {me?.isReady ? "Not ready" : "I'm ready!"}
          </button>
        )}
        {isHost && (
          <>
            <button onClick={startMatch} disabled={!canStart} className="btn-primary w-full">
              {humans.length < 2
                ? "Need 2+ players to start"
                : !allReady
                  ? "Waiting for players to ready up…"
                  : "Start battle"}
            </button>
            <p className="text-center text-xs text-slate-500">
              Starting with exactly 2 humans adds 1 CPU rival automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
