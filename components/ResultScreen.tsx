"use client";

import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";

export function ResultScreen() {
  const router = useRouter();
  const roomState = useGameStore((s) => s.roomState)!;
  const identity = useGameStore((s) => s.identity);
  const isHost = useGameStore((s) => s.isHost);
  const restart = useGameStore((s) => s.restart);
  const leaveRoom = useGameStore((s) => s.leaveRoom);

  const winner = roomState.players.find((p) => p.id === roomState.winnerId);
  const iWon = roomState.winnerId === identity.id;

  const goHome = () => {
    leaveRoom();
    router.push("/");
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="animate-pop">
        <div className="text-7xl">{iWon ? "👑" : "💥"}</div>
        <h1 className="mt-3 text-3xl font-black text-neon-gold">
          {winner ? `${winner.name} wins!` : "Game over"}
        </h1>
        <p className="mt-1 text-slate-300">
          {iWon ? "You are the last one standing." : "Better luck next burst."}
        </p>
      </div>

      <div className="panel w-full max-w-sm p-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          Final standings
        </h2>
        <ul className="space-y-1 text-left">
          {[...roomState.players]
            .sort((a, b) => b.hp - a.hp)
            .map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {p.id === roomState.winnerId && "🏆 "}
                  {p.name}
                  {p.isCPU && " (CPU)"}
                </span>
                <span className="tabular-nums text-slate-400">{Math.max(0, p.hp)} HP</span>
              </li>
            ))}
        </ul>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {isHost ? (
          <button onClick={restart} className="btn-primary w-full">
            Rematch
          </button>
        ) : (
          <p className="text-sm text-slate-400">Waiting for the host to start a rematch…</p>
        )}
        <button onClick={goHome} className="btn-secondary w-full">
          Back to home
        </button>
      </div>
    </div>
  );
}
