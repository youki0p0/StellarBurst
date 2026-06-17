"use client";

import { create } from "zustand";
import { chooseCpuAction, chooseCpuDefense } from "@/lib/cpu";
import { RoomNet, type NetRequest } from "@/lib/net";
import {
  addPlayer,
  applyAction,
  createRoomState,
  currentPlayerId,
  generateRoomCode,
  makePlayer,
  removePlayer,
  resetToLobby,
  setReady,
  startGame,
} from "@/lib/room";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { GameAction, Player, RoomState } from "@/lib/types";

// Kept outside the store so they aren't part of serializable state.
let net: RoomNet | null = null;
let cpuTimer: ReturnType<typeof setTimeout> | null = null;

interface Identity {
  id: string;
  name: string;
}

function loadIdentity(): Identity {
  if (typeof window === "undefined") return { id: "server", name: "Player" };
  let id = localStorage.getItem("sb_player_id");
  if (!id) {
    id = `p_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("sb_player_id", id);
  }
  const name = localStorage.getItem("sb_player_name") || "";
  return { id, name };
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
  /** Host: push authoritative state to everyone and re-evaluate CPU turns. */
  function publish(state: RoomState) {
    set({ roomState: state });
    net?.broadcastState(state);
    scheduleCpu();
  }

  /** Host: apply an action to the authoritative state. */
  function hostApply(action: GameAction, actorId: string) {
    const current = get().roomState;
    if (!current) return;
    publish(applyAction(current, action, actorId));
  }

  /** Host: if it's a CPU's turn (or a CPU must defend), act after a beat. */
  function scheduleCpu() {
    if (cpuTimer) {
      clearTimeout(cpuTimer);
      cpuTimer = null;
    }
    const state = get().roomState;
    if (!state || !get().isHost) return;

    if (state.phase === "action") {
      const id = currentPlayerId(state);
      const p = state.players.find((x) => x.id === id);
      if (p?.isCPU && p.alive) {
        cpuTimer = setTimeout(() => hostApply(chooseCpuAction(state, p.id), p.id), 750);
      }
    } else if (state.phase === "defense" && state.pending) {
      const t = state.players.find((x) => x.id === state.pending!.targetId);
      if (t?.isCPU) {
        cpuTimer = setTimeout(
          () => hostApply({ type: "defend", cardId: chooseCpuDefense(state, t.id) }, t.id),
          750,
        );
      }
    }
  }

  /** Host: handle inbound client requests. */
  function handleRequest(req: NetRequest) {
    const current = get().roomState;
    if (!current) return;
    switch (req.reqType) {
      case "join":
        publish(addPlayer(current, req.fromId, req.name));
        break;
      case "ready":
        publish(setReady(current, req.fromId, req.ready));
        break;
      case "start":
        publish(startGame(current));
        break;
      case "restart":
        publish(resetToLobby(current));
        break;
      case "action":
        hostApply(req.action, req.fromId);
        break;
    }
  }

  /** Host: reconcile presence (mark disconnects, drop lobby leavers). */
  function handlePresence(presentIds: string[]) {
    const current = get().roomState;
    if (!current) return;
    let next = current;
    const present = new Set(presentIds);
    for (const p of current.players) {
      if (p.isCPU) continue;
      if (!present.has(p.id) && p.connected) next = removePlayer(next, p.id);
    }
    if (next !== current) publish(next);
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
      const code = generateRoomCode();
      const host: Player = makePlayer(identity.id, identity.name || "Host", {
        isHost: true,
      });
      host.isReady = true;
      const state = createRoomState(code, host);
      set({ roomState: state, isHost: true, connecting: true, error: null });

      net?.disconnect();
      net = new RoomNet(code, { id: identity.id, name: host.name }, true);
      const ok = net.connect({
        onState: (s) => set({ roomState: s }),
        onRequest: handleRequest,
        onPresence: handlePresence,
      });
      set({ connecting: false });
      if (!ok) {
        set({ error: "Could not connect to realtime service." });
        return null;
      }
      return code;
    },

    joinRoom: async (code) => {
      const { identity } = get();
      if (!isSupabaseConfigured) {
        set({ error: "Supabase is not configured." });
        return false;
      }
      set({ isHost: false, connecting: true, error: null, roomState: null });
      net?.disconnect();
      net = new RoomNet(code, { id: identity.id, name: identity.name || "Player" }, false);
      const ok = net.connect({ onState: (s) => set({ roomState: s }) });
      set({ connecting: false });
      if (!ok) {
        set({ error: "Could not connect to realtime service." });
        return false;
      }
      return true;
    },

    leaveRoom: () => {
      if (cpuTimer) clearTimeout(cpuTimer);
      cpuTimer = null;
      net?.disconnect();
      net = null;
      set({ roomState: null, isHost: false, error: null });
    },

    toggleReady: () => {
      const { roomState, identity, isHost } = get();
      if (!roomState) return;
      const me = roomState.players.find((p) => p.id === identity.id);
      const ready = !me?.isReady;
      if (isHost) {
        publish(setReady(roomState, identity.id, ready));
      } else {
        net?.sendRequest({ reqType: "ready", fromId: identity.id, ready });
      }
    },

    startMatch: () => {
      const { roomState, isHost, identity } = get();
      if (!roomState) return;
      if (isHost) publish(startGame(roomState));
      else net?.sendRequest({ reqType: "start", fromId: identity.id });
    },

    restart: () => {
      const { roomState, isHost, identity } = get();
      if (!roomState) return;
      if (isHost) publish(resetToLobby(roomState));
      else net?.sendRequest({ reqType: "restart", fromId: identity.id });
    },

    sendGameAction: (action) => {
      const { isHost, identity } = get();
      if (isHost) hostApply(action, identity.id);
      else net?.sendRequest({ reqType: "action", fromId: identity.id, action });
    },
  };
});
