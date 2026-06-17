"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import { chooseCpuAction, chooseCpuDefense } from "@/lib/cpu";
import {
  createRoomRow,
  joinRoomRow,
  leaveRoomRow,
  loadRoomState,
  persistState,
  setReadyRow,
  subscribeRoom,
  unsubscribeRoom,
} from "@/lib/db";
import {
  applyAction,
  currentPlayerId,
  generateRoomCode,
  resetToLobby,
  startGame,
} from "@/lib/room";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { GameAction, RoomState } from "@/lib/types";

// Non-serializable connection state kept outside the store.
let channel: RealtimeChannel | null = null;
let roomId: string | null = null;
let myPlayerId: string | null = null;
let cpuTimer: ReturnType<typeof setTimeout> | null = null;
let reloadTimer: ReturnType<typeof setTimeout> | null = null;
let applying = false;

interface Identity {
  id: string; // stable per-browser client_id
  name: string;
}

function loadIdentity(): Identity {
  if (typeof window === "undefined") return { id: "server", name: "" };
  let id = localStorage.getItem("sb_client_id");
  if (!id) {
    id = `c_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem("sb_client_id", id);
  }
  return { id, name: localStorage.getItem("sb_player_name") || "" };
}

interface GameStore {
  configured: boolean;
  identity: Identity;
  roomState: RoomState | null;
  isHost: boolean;
  connecting: boolean;
  error: string | null;

  setName: (name: string) => void;
  createRoom: () => Promise<string | null>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => void;
  toggleReady: () => void;
  startMatch: () => void;
  restart: () => void;
  sendGameAction: (action: GameAction) => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  function teardown() {
    if (cpuTimer) clearTimeout(cpuTimer);
    if (reloadTimer) clearTimeout(reloadTimer);
    cpuTimer = null;
    reloadTimer = null;
    unsubscribeRoom(channel);
    channel = null;
    roomId = null;
    myPlayerId = null;
  }

  /** Reload authoritative state from the DB and refresh derived flags. */
  async function reload() {
    if (!roomId) return;
    const state = await loadRoomState(roomId);
    if (!state) return;
    const me = state.players.find((p) => p.id === myPlayerId);
    set({ roomState: state, isHost: Boolean(me?.isHost) });
    maybeRunCpu(state);
  }

  function scheduleReload() {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => void reload(), 90);
  }

  /**
   * Load → reduce → persist with optimistic concurrency. On a version conflict
   * we reload the latest state and retry a few times.
   */
  async function applyAndPersist(transform: (s: RoomState) => RoomState) {
    if (!roomId || applying) return;
    applying = true;
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const base = get().roomState;
        if (!base) return;
        const next = transform(base);
        if (next.version === base.version) return; // no-op / illegal action
        const ok = await persistState(roomId, base, next);
        if (ok) {
          const me = next.players.find((p) => p.id === myPlayerId);
          set({ roomState: next, isHost: Boolean(me?.isHost) });
          maybeRunCpu(next);
          return;
        }
        await reload(); // conflict: refresh and retry
      }
    } finally {
      applying = false;
    }
  }

  /** Host only: drive CPU players' actions / defenses on a short delay. */
  function maybeRunCpu(state: RoomState) {
    if (cpuTimer) {
      clearTimeout(cpuTimer);
      cpuTimer = null;
    }
    const me = state.players.find((p) => p.id === myPlayerId);
    if (!me?.isHost) return;

    if (state.phase === "action") {
      const cur = currentPlayerId(state);
      const p = state.players.find((x) => x.id === cur);
      if (p?.isCPU && p.alive) {
        cpuTimer = setTimeout(() => {
          void applyAndPersist((s) => {
            if (s.phase !== "action" || currentPlayerId(s) !== p.id) return s;
            return applyAction(s, chooseCpuAction(s, p.id), p.id);
          });
        }, 800);
      }
    } else if (state.phase === "defense" && state.pending) {
      const targetId = state.pending.targetId;
      const t = state.players.find((x) => x.id === targetId);
      if (t?.isCPU) {
        cpuTimer = setTimeout(() => {
          void applyAndPersist((s) => {
            if (s.phase !== "defense" || s.pending?.targetId !== t.id) return s;
            return applyAction(s, { type: "defend", cardId: chooseCpuDefense(s, t.id) }, t.id);
          });
        }, 800);
      }
    }
  }

  return {
    configured: isSupabaseConfigured,
    identity: loadIdentity(),
    roomState: null,
    isHost: false,
    connecting: false,
    error: null,

    setName: (name) => {
      if (typeof window !== "undefined") localStorage.setItem("sb_player_name", name);
      set((s) => ({ identity: { ...s.identity, name } }));
    },

    createRoom: async () => {
      const { identity } = get();
      if (!isSupabaseConfigured) {
        set({ error: "Supabase is not configured." });
        return null;
      }
      set({ connecting: true, error: null, roomState: null });
      teardown();
      const code = generateRoomCode();
      const res = await createRoomRow(code, { clientId: identity.id, name: identity.name || "Host" });
      if (!res) {
        set({ connecting: false, error: "Could not create room. Check Supabase setup." });
        return null;
      }
      roomId = res.roomId;
      myPlayerId = res.playerId;
      channel = subscribeRoom(roomId, scheduleReload);
      await reload();
      set({ connecting: false, isHost: true });
      return code;
    },

    joinRoom: async (code) => {
      const { identity } = get();
      if (!isSupabaseConfigured) {
        set({ error: "Supabase is not configured." });
        return false;
      }
      set({ connecting: true, error: null, roomState: null });
      teardown();
      const res = await joinRoomRow(code, { clientId: identity.id, name: identity.name || "Player" });
      if (!res.ok || !res.roomId || !res.playerId) {
        const msg =
          res.error === "not_found"
            ? "Room not found."
            : res.error === "in_progress"
              ? "That game is already in progress."
              : "Could not join room.";
        set({ connecting: false, error: msg });
        return false;
      }
      roomId = res.roomId;
      myPlayerId = res.playerId;
      channel = subscribeRoom(roomId, scheduleReload);
      await reload();
      set({ connecting: false });
      return true;
    },

    leaveRoom: () => {
      const { roomState } = get();
      // Only vacate the seat while still in the lobby.
      if (roomState?.phase === "lobby" && myPlayerId) void leaveRoomRow(myPlayerId);
      teardown();
      set({ roomState: null, isHost: false, error: null });
    },

    toggleReady: () => {
      const { roomState } = get();
      const me = roomState?.players.find((p) => p.id === myPlayerId);
      if (!me) return;
      void setReadyRow(me.id, !me.isReady);
    },

    startMatch: () => void applyAndPersist((s) => startGame(s)),

    restart: () => void applyAndPersist((s) => resetToLobby(s)),

    sendGameAction: (action) => {
      if (!myPlayerId) return;
      const id = myPlayerId;
      void applyAndPersist((s) => applyAction(s, action, id));
    },
  };
});
