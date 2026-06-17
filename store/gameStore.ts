"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import { chooseCpuAction, chooseCpuDefense } from "@/lib/cpu";
import {
  createRoomRow,
  createStartedRoomRow,
  joinRoomRow,
  leaveRoomRow,
  loadRoomState,
  persistState,
  pokeRoom,
  setReadyRow,
  subscribeRoom,
  unsubscribeRoom,
} from "@/lib/db";
import {
  addCpuPlayer,
  applyAction,
  createRoomState,
  currentPlayerId,
  generateRoomCode,
  makePlayer,
  newId,
  removePlayer,
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
let pollTimer: ReturnType<typeof setInterval> | null = null;
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
  startSolo: (cpuCount?: number) => Promise<string | null>;
  leaveRoom: () => void;
  toggleReady: () => void;
  addCpu: () => void;
  removeCpu: (id: string) => void;
  startMatch: () => void;
  restart: () => void;
  sendGameAction: (action: GameAction) => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  function teardown() {
    if (cpuTimer) clearTimeout(cpuTimer);
    if (reloadTimer) clearTimeout(reloadTimer);
    if (pollTimer) clearInterval(pollTimer);
    cpuTimer = null;
    reloadTimer = null;
    pollTimer = null;
    unsubscribeRoom(channel);
    channel = null;
    roomId = null;
    myPlayerId = null;
  }

  /**
   * Periodic refresh as a safety net: if a Realtime event is missed (or the
   * tables aren't on the realtime publication yet), clients still converge.
   */
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!applying) void reload();
    }, 2500);
  }

  /** Reload authoritative state from the DB and refresh derived flags. */
  async function reload() {
    if (!roomId) return;
    const state = await loadRoomState(roomId);
    if (!state) return;
    // Ignore stale reads: rooms.version is monotonic, so a snapshot older than
    // what we already hold is an out-of-order read and must not clobber state.
    const cur = get().roomState;
    if (cur && cur.code === state.code && state.version < cur.version) return;
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
          pokeRoom(channel); // tell everyone else to reload now
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
        set({ error: "error.not_configured" });
        return null;
      }
      set({ connecting: true, error: null, roomState: null });
      teardown();
      const code = generateRoomCode();
      const res = await createRoomRow(code, { clientId: identity.id, name: identity.name || "Host" });
      if (!res) {
        set({ connecting: false, error: "error.create_failed" });
        return null;
      }
      roomId = res.roomId;
      myPlayerId = res.playerId;
      channel = subscribeRoom(roomId, scheduleReload);
      startPolling();
      await reload();
      set({ connecting: false, isHost: true });
      return code;
    },

    joinRoom: async (code) => {
      const { identity } = get();
      if (!isSupabaseConfigured) {
        set({ error: "error.not_configured" });
        return false;
      }
      set({ connecting: true, error: null, roomState: null });
      teardown();
      const res = await joinRoomRow(code, { clientId: identity.id, name: identity.name || "Player" });
      if (!res.ok || !res.roomId || !res.playerId) {
        const errKey =
          res.error === "not_found" || res.error === "in_progress"
            ? `error.${res.error}`
            : "error.join_failed";
        set({ connecting: false, error: errKey });
        return false;
      }
      roomId = res.roomId;
      myPlayerId = res.playerId;
      channel = subscribeRoom(roomId, scheduleReload);
      startPolling();
      await reload();
      pokeRoom(channel); // notify the host (and others) that we joined
      set({ connecting: false });
      return true;
    },

    startSolo: async (cpuCount = 3) => {
      const { identity } = get();
      if (!isSupabaseConfigured) {
        set({ error: "error.not_configured" });
        return null;
      }
      // Build the fully-started game in memory, then persist it in one batch so
      // there are no intermediate snapshots for polling/realtime to clobber.
      const code = generateRoomCode();
      const hostId = newId();
      const host = makePlayer(hostId, identity.name || "You", {
        isHost: true,
        clientId: identity.id,
      });
      host.isReady = true;
      let state = createRoomState(code, host);
      const bots = Math.max(1, Math.min(cpuCount, 7));
      for (let i = 0; i < bots; i++) state = addCpuPlayer(state);
      state = startGame(state);

      set({ connecting: true, error: null, roomState: null });
      teardown();
      const res = await createStartedRoomRow(state, identity.id);
      if (!res) {
        set({ connecting: false, error: "error.solo_failed" });
        return null;
      }
      roomId = res.roomId;
      myPlayerId = res.playerId;
      // Reflect the started game from the DB ids we just inserted.
      state.code = code;
      channel = subscribeRoom(roomId, scheduleReload);
      startPolling();
      set({ roomState: state, isHost: true, connecting: false });
      maybeRunCpu(state);
      return code;
    },

    leaveRoom: () => {
      const { roomState } = get();
      const ch = channel;
      // Only vacate the seat while still in the lobby.
      if (roomState?.phase === "lobby" && myPlayerId) {
        void leaveRoomRow(myPlayerId).then(() => pokeRoom(ch));
      }
      teardown();
      set({ roomState: null, isHost: false, error: null });
    },

    toggleReady: () => {
      const { roomState } = get();
      const me = roomState?.players.find((p) => p.id === myPlayerId);
      if (!me) return;
      void setReadyRow(me.id, !me.isReady).then(() => pokeRoom(channel));
    },

    addCpu: () => void applyAndPersist((s) => addCpuPlayer(s)),

    removeCpu: (id) => void applyAndPersist((s) => removePlayer(s, id)),

    startMatch: () => void applyAndPersist((s) => startGame(s)),

    restart: () => void applyAndPersist((s) => resetToLobby(s)),

    sendGameAction: (action) => {
      if (!myPlayerId) return;
      const id = myPlayerId;
      void applyAndPersist((s) => applyAction(s, action, id));
    },
  };
});
