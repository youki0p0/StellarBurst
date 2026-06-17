"use client";

import { useRouter } from "next/navigation";
import { LangToggle } from "@/components/LangToggle";
import { RoomCode } from "@/components/RoomCode";
import { useGameStore } from "@/store/gameStore";
import { useT } from "@/store/i18n";
import { MAX_PLAYERS } from "@/lib/room";

export function RoomLobby() {
  const t = useT();
  const router = useRouter();
  const roomState = useGameStore((s) => s.roomState);
  const identity = useGameStore((s) => s.identity);
  const isHost = useGameStore((s) => s.isHost);
  const toggleReady = useGameStore((s) => s.toggleReady);
  const startMatch = useGameStore((s) => s.startMatch);
  const addCpu = useGameStore((s) => s.addCpu);
  const kickPlayer = useGameStore((s) => s.kickPlayer);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const disbandRoom = useGameStore((s) => s.disbandRoom);
  const error = useGameStore((s) => s.error);

  if (!roomState) return null;

  const me = roomState.players.find((p) => p.clientId === identity.id);
  const canStart = isHost && roomState.players.length >= 2;
  const roomFull = roomState.players.length >= MAX_PLAYERS;

  const leave = () => {
    leaveRoom();
    router.push("/");
  };
  const disband = () => {
    disbandRoom();
    router.push("/");
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <div className="panel p-4">
        <RoomCode code={roomState.code} large />
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
              <span className="flex items-center gap-2">
                {!p.isCPU && (
                  <span
                    className={
                      p.isReady ? "text-sm font-bold text-card-green" : "text-sm text-slate-500"
                    }
                  >
                    {p.isReady ? t("lobby.ready") : "…"}
                  </span>
                )}
                {isHost && p.clientId !== identity.id && (
                  <button
                    onClick={() => kickPlayer(p.id)}
                    className="rounded px-1 text-sm font-bold text-card-red hover:brightness-125"
                    aria-label={`${t("lobby.kick")} ${p.name}`}
                    title={t("lobby.kick")}
                  >
                    ✕
                  </button>
                )}
              </span>
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
        {error && <p className="text-center text-sm text-card-red">{t(error)}</p>}
        <button
          onClick={isHost ? disband : leave}
          className="btn-secondary w-full border-card-red/50 text-card-red"
        >
          {isHost ? t("lobby.disband") : t("lobby.leave")}
        </button>
      </div>
    </div>
  );
}
