"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useRef } from "react";
import { GameBoard } from "@/components/GameBoard";
import { ResultScreen } from "@/components/ResultScreen";
import { RoomLobby } from "@/components/RoomLobby";
import { SetupScreen } from "@/components/SetupScreen";
import { useGameStore } from "@/store/gameStore";
import { useT } from "@/store/i18n";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const t = useT();
  const configured = useGameStore((s) => s.configured);
  const roomState = useGameStore((s) => s.roomState);
  const identity = useGameStore((s) => s.identity);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  const roomCode = code.toUpperCase();
  // Set once we've been kicked / the room was disbanded, to stop auto-rejoin.
  const ejectedRef = useRef(false);

  // Reconnect on direct load / refresh (store resets on hard reload).
  useEffect(() => {
    if (configured && !roomState && !ejectedRef.current) {
      joinRoom(roomCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, roomCode]);

  // Ejection: if we hold a room but our seat is gone (host kicked us, or the
  // room was disbanded), bail back home and don't silently rejoin.
  const inRoom = roomState?.players.some((p) => p.clientId === identity.id) ?? true;
  useEffect(() => {
    if (roomState && roomState.phase !== "finished" && !inRoom && !ejectedRef.current) {
      ejectedRef.current = true;
      leaveRoom();
      router.push("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState, inRoom]);

  if (!configured) return <SetupScreen />;

  if (!roomState) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="animate-pulse text-lg text-slate-300">
          {t("common.connecting")} {roomCode}…
        </div>
        <button
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
          className="btn-secondary"
        >
          {t("result.backHome")}
        </button>
      </div>
    );
  }

  if (roomState.phase === "lobby") return <RoomLobby />;
  if (roomState.phase === "finished") return <ResultScreen />;
  return <GameBoard />;
}
