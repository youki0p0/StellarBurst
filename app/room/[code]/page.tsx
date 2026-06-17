"use client";

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { GameBoard } from "@/components/GameBoard";
import { ResultScreen } from "@/components/ResultScreen";
import { RoomLobby } from "@/components/RoomLobby";
import { SetupScreen } from "@/components/SetupScreen";
import { useGameStore } from "@/store/gameStore";

export default function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const configured = useGameStore((s) => s.configured);
  const roomState = useGameStore((s) => s.roomState);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  const roomCode = code.toUpperCase();

  // Reconnect on direct load / refresh (store resets on hard reload).
  useEffect(() => {
    if (configured && !roomState) {
      joinRoom(roomCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, roomCode]);

  if (!configured) return <SetupScreen />;

  if (!roomState) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="animate-pulse text-lg text-slate-300">
          Connecting to room {roomCode}…
        </div>
        <button
          onClick={() => {
            leaveRoom();
            router.push("/");
          }}
          className="btn-secondary"
        >
          Back to home
        </button>
      </div>
    );
  }

  if (roomState.phase === "lobby") return <RoomLobby />;
  if (roomState.phase === "finished") return <ResultScreen />;
  return <GameBoard />;
}
