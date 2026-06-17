"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SetupScreen } from "@/components/SetupScreen";
import { useGameStore } from "@/store/gameStore";

export default function HomePage() {
  const router = useRouter();
  const configured = useGameStore((s) => s.configured);
  const identity = useGameStore((s) => s.identity);
  const setName = useGameStore((s) => s.setName);
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const error = useGameStore((s) => s.error);

  const [name, setLocalName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocalName(identity.name);
  }, [identity.name]);

  if (!configured) return <SetupScreen />;

  const trimmed = name.trim();

  const handleCreate = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    setName(trimmed);
    const roomCode = await createRoom();
    if (roomCode) router.push(`/room/${roomCode}`);
    else setBusy(false);
  };

  const handleJoin = async () => {
    const c = code.trim().toUpperCase();
    if (!trimmed || c.length < 4 || busy) return;
    setBusy(true);
    setName(trimmed);
    const ok = await joinRoom(c);
    if (ok) router.push(`/room/${c}`);
    else setBusy(false);
  };

  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <header className="text-center">
        <h1 className="bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan bg-clip-text text-5xl font-black tracking-tight text-transparent">
          StellarBurst
        </h1>
        <p className="mt-2 text-slate-400">
          A fast, chaotic 2–8 player card battle party game.
        </p>
      </header>

      <div className="panel space-y-3 p-5">
        <label className="block text-sm font-semibold text-slate-300">Your name</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setLocalName(e.target.value.slice(0, 16))}
          placeholder="Enter a name"
          maxLength={16}
        />

        <button onClick={handleCreate} disabled={!trimmed || busy} className="btn-primary w-full">
          Create room
        </button>

        <div className="flex items-center gap-3 py-1 text-xs text-slate-500">
          <span className="h-px flex-1 bg-board-600" />
          OR JOIN
          <span className="h-px flex-1 bg-board-600" />
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1 uppercase tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="CODE"
            maxLength={4}
          />
          <button
            onClick={handleJoin}
            disabled={!trimmed || code.trim().length < 4 || busy}
            className="btn-secondary"
          >
            Join
          </button>
        </div>

        {error && <p className="text-center text-sm text-card-red">{error}</p>}
      </div>

      <p className="text-center text-xs text-slate-600">
        Inspired by simple party card games. No copyrighted assets.
      </p>
    </div>
  );
}
