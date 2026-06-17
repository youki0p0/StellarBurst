import type { RealtimeChannel } from "@supabase/supabase-js";
import { currentPlayerId } from "./room";
import { getSupabase } from "./supabase";
import type {
  GameEvent,
  GamePhase,
  Player,
  PlayerEffects,
  RoomState,
} from "./types";

/**
 * Database persistence + Supabase Realtime layer.
 *
 * The pure reducer in `room.ts` remains the single brain: callers load a
 * `RoomState`, run `applyAction`/`startGame`, then persist it back here.
 * `rooms.version` provides optimistic concurrency so concurrent writers don't
 * clobber each other. Realtime postgres_changes notify every client to reload.
 */

const MAX_LOG = 60;

// --- Row shapes (the client is untyped, so we model the columns we use) ----

interface RoomRow {
  id: string;
  code: string;
  status: "waiting" | "playing" | "finished";
  host_client_id: string | null;
  seed: string;
  current_turn_player_id: string | null;
  winner_player_id: string | null;
  state: {
    phase?: GamePhase;
    turnOrder?: string[];
    currentTurnIndex?: number;
    direction?: 1 | -1;
    pending?: RoomState["pending"];
  } | null;
  version: number;
}

interface PlayerRow {
  id: string;
  room_id: string;
  client_id: string;
  name: string;
  hp: number;
  hand: unknown;
  status: "alive" | "defeated";
  is_ready: boolean;
  is_cpu: boolean;
  effects: Partial<PlayerEffects> | null;
}

interface EventRow {
  id: number;
  player_id: string | null;
  event_type: GameEvent["type"];
  payload: {
    key?: string;
    params?: Record<string, string | number>;
    targetId?: string | null;
  } | null;
  created_at: string;
}

// --- Helpers ---------------------------------------------------------------

function newId(): string {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function stringToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function phaseToStatus(phase: GamePhase): RoomRow["status"] {
  if (phase === "lobby") return "waiting";
  if (phase === "finished") return "finished";
  return "playing";
}

function statusToPhase(status: RoomRow["status"]): GamePhase {
  if (status === "waiting") return "lobby";
  if (status === "finished") return "finished";
  return "action";
}

function normalizeEffects(e: Partial<PlayerEffects> | null): PlayerEffects {
  return {
    skipNextTurn: e?.skipNextTurn ?? false,
    defenseLimitedTurns: e?.defenseLimitedTurns ?? 0,
    slip: e?.slip ?? null,
  };
}

function rowToEvent(row: EventRow): GameEvent {
  return {
    id: String(row.id),
    ts: new Date(row.created_at).getTime(),
    type: row.event_type,
    key: row.payload?.key ?? "log.info",
    params: row.payload?.params ?? {},
    actorId: row.player_id ?? undefined,
    targetId: row.payload?.targetId ?? undefined,
  };
}

// --- Loading ---------------------------------------------------------------

export async function loadRoomState(roomId: string): Promise<RoomState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [{ data: roomData }, { data: playerData }, { data: eventData }] =
    await Promise.all([
      supabase.from("rooms").select("*").eq("id", roomId).maybeSingle(),
      supabase.from("players").select("*").eq("room_id", roomId).order("joined_at"),
      supabase
        .from("game_events")
        .select("id,player_id,event_type,payload,created_at")
        .eq("room_id", roomId)
        .order("id", { ascending: false })
        .limit(MAX_LOG),
    ]);

  const room = roomData as RoomRow | null;
  if (!room) return null;
  const playerRows = (playerData ?? []) as PlayerRow[];
  const eventRows = ((eventData ?? []) as EventRow[]).slice().reverse();

  const players: Player[] = playerRows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    hp: r.hp,
    maxHp: 100,
    isCPU: r.is_cpu,
    isHost: r.client_id === room.host_client_id,
    isReady: r.is_ready,
    alive: r.status === "alive",
    connected: true,
    effects: normalizeEffects(r.effects),
  }));

  const hands: Record<string, RoomState["hands"][string]> = {};
  for (const r of playerRows) {
    hands[r.id] = (Array.isArray(r.hand) ? r.hand : []) as RoomState["hands"][string];
  }

  const st = room.state ?? {};
  const host = players.find((p) => p.clientId === room.host_client_id);

  return {
    code: room.code,
    seed: Number(room.seed) || stringToSeed(room.seed),
    phase: st.phase ?? statusToPhase(room.status),
    hostId: host?.id ?? "",
    players,
    turnOrder: st.turnOrder ?? [],
    currentTurnIndex: st.currentTurnIndex ?? 0,
    direction: st.direction ?? 1,
    hands,
    pending: st.pending ?? null,
    log: eventRows.map(rowToEvent),
    winnerId: room.winner_player_id ?? null,
    version: room.version,
  };
}

// --- Create / join ---------------------------------------------------------

export async function createRoomRow(
  code: string,
  client: { clientId: string; name: string },
): Promise<{ roomId: string; playerId: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const roomId = newId();
  const playerId = newId();
  const seed = Math.floor(Math.random() * 2 ** 31);

  const { error: roomErr } = await supabase.from("rooms").insert({
    id: roomId,
    code,
    status: "waiting",
    host_client_id: client.clientId,
    seed: String(seed),
    state: { phase: "lobby", turnOrder: [], currentTurnIndex: 0, direction: 1, pending: null },
    version: 0,
  });
  if (roomErr) {
    console.error("[StellarBurst] createRoom rooms.insert failed:", roomErr.message);
    return null;
  }

  const { error: playerErr } = await supabase.from("players").insert({
    id: playerId,
    room_id: roomId,
    client_id: client.clientId,
    name: client.name,
    hp: 100,
    hand: [],
    status: "alive",
    is_ready: true,
    is_cpu: false,
    effects: {},
  });
  if (playerErr) {
    console.error("[StellarBurst] createRoom players.insert failed:", playerErr.message);
    return null;
  }

  return { roomId, playerId };
}

/**
 * Create a room that is already mid-game in a single batch of inserts (used for
 * solo / practice play). Avoids the multi-write race of create-then-mutate.
 */
export async function createStartedRoomRow(
  state: RoomState,
  hostClientId: string,
): Promise<{ roomId: string; playerId: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const roomId = newId();
  const hostPlayer = state.players.find((p) => p.clientId === hostClientId);
  if (!hostPlayer) return null;

  const { error: roomErr } = await supabase.from("rooms").insert({
    id: roomId,
    code: state.code,
    status: phaseToStatus(state.phase),
    host_client_id: hostClientId,
    seed: String(state.seed),
    current_turn_player_id: currentPlayerId(state),
    winner_player_id: state.winnerId,
    state: {
      phase: state.phase,
      turnOrder: state.turnOrder,
      currentTurnIndex: state.currentTurnIndex,
      direction: state.direction,
      pending: state.pending,
    },
    version: state.version,
  });
  if (roomErr) return null;

  const playerRows = state.players.map((p) => ({
    id: p.id,
    room_id: roomId,
    client_id: p.clientId,
    name: p.name,
    hp: p.hp,
    hand: state.hands[p.id] ?? [],
    status: p.alive ? "alive" : "defeated",
    is_ready: p.isReady,
    is_cpu: p.isCPU,
    effects: p.effects,
  }));
  const { error: playerErr } = await supabase.from("players").insert(playerRows);
  if (playerErr) return null;

  const events = state.log.filter((e) => /^e\d+$/.test(e.id));
  if (events.length > 0) {
    await supabase.from("game_events").insert(
      events.map((e) => ({
        room_id: roomId,
        player_id: e.actorId ?? null,
        event_type: e.type,
        payload: { key: e.key, params: e.params ?? {}, targetId: e.targetId ?? null },
      })),
    );
  }

  return { roomId, playerId: hostPlayer.id };
}

export interface JoinResult {
  ok: boolean;
  roomId?: string;
  playerId?: string;
  error?: string;
}

export async function joinRoomRow(
  code: string,
  client: { clientId: string; name: string },
): Promise<JoinResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "not_configured" };

  const { data: roomData, error: selErr } = await supabase
    .from("rooms")
    .select("id,status")
    .eq("code", code)
    .maybeSingle();
  if (selErr) {
    console.error("[StellarBurst] join rooms.select failed:", selErr.message);
  }
  const room = roomData as { id: string; status: RoomRow["status"] } | null;
  if (!room) return { ok: false, error: "not_found" };

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", room.id)
    .eq("client_id", client.clientId)
    .maybeSingle();

  if (existing) {
    // Reconnecting to a seat we already hold.
    await supabase.from("players").update({ name: client.name }).eq("id", (existing as { id: string }).id);
    return { ok: true, roomId: room.id, playerId: (existing as { id: string }).id };
  }

  if (room.status !== "waiting") {
    return { ok: false, roomId: room.id, error: "in_progress" };
  }

  const playerId = newId();
  const { error } = await supabase.from("players").insert({
    id: playerId,
    room_id: room.id,
    client_id: client.clientId,
    name: client.name,
    hp: 100,
    hand: [],
    status: "alive",
    is_ready: false,
    is_cpu: false,
    effects: {},
  });
  if (error) {
    console.error("[StellarBurst] join players.insert failed:", error.message);
    return { ok: false, roomId: room.id, error: "join_failed" };
  }

  return { ok: true, roomId: room.id, playerId };
}

export async function setReadyRow(playerId: string, ready: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("players").update({ is_ready: ready }).eq("id", playerId);
}

export async function leaveRoomRow(playerId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("players").delete().eq("id", playerId);
}

// --- Persistence (optimistic) ----------------------------------------------

/**
 * Persist a freshly-reduced state. Returns false on a version conflict, meaning
 * another writer won the race and the caller should reload + retry.
 */
export async function persistState(
  roomId: string,
  prev: RoomState,
  next: RoomState,
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const expected = next.version - 1;
  const { data, error } = await supabase
    .from("rooms")
    .update({
      status: phaseToStatus(next.phase),
      seed: String(next.seed),
      current_turn_player_id: currentPlayerId(next),
      winner_player_id: next.winnerId,
      state: {
        phase: next.phase,
        turnOrder: next.turnOrder,
        currentTurnIndex: next.currentTurnIndex,
        direction: next.direction,
        pending: next.pending,
      },
      version: next.version,
    })
    .eq("id", roomId)
    .eq("version", expected)
    .select("id");

  if (error) {
    // A real error here is almost always RLS/permissions on rooms UPDATE.
    console.error("[StellarBurst] rooms.update failed:", error.message);
    return false;
  }
  if (!data || data.length === 0) {
    // 0 rows: either a version race (another writer won) or an RLS policy that
    // silently allows 0 rows to be updated. Probe the current version to tell.
    const { data: probe } = await supabase
      .from("rooms")
      .select("version")
      .eq("id", roomId)
      .maybeSingle();
    const live = (probe as { version?: number } | null)?.version;
    if (live === expected) {
      console.error(
        "[StellarBurst] rooms.update affected 0 rows but version is unchanged — " +
          "the UPDATE is being blocked (RLS/grants). Re-run supabase/schema.sql.",
      );
    }
    return false; // conflict / blocked
  }

  // Upsert all current players.
  const rows = next.players.map((p) => ({
    id: p.id,
    room_id: roomId,
    client_id: p.clientId,
    name: p.name,
    hp: p.hp,
    hand: next.hands[p.id] ?? [],
    status: p.alive ? "alive" : "defeated",
    is_ready: p.isReady,
    is_cpu: p.isCPU,
    effects: p.effects,
  }));
  await supabase.from("players").upsert(rows, { onConflict: "room_id,client_id" });

  // Delete only players intentionally removed (rematch/leave), found by diffing
  // against the previous state — never a blanket "delete everything not kept".
  const removedIds = prev.players
    .filter((p) => !next.players.some((n) => n.id === p.id))
    .map((p) => p.id);
  if (removedIds.length > 0) {
    await supabase.from("players").delete().in("id", removedIds);
  }

  // Append newly-created battle-log events (reducer ids look like "e123").
  const prevIds = new Set(prev.log.map((e) => e.id));
  const newEvents = next.log.filter((e) => !prevIds.has(e.id) && /^e\d+$/.test(e.id));
  if (newEvents.length > 0) {
    await supabase.from("game_events").insert(
      newEvents.map((e) => ({
        room_id: roomId,
        player_id: e.actorId ?? null,
        event_type: e.type,
        payload: { key: e.key, params: e.params ?? {}, targetId: e.targetId ?? null },
      })),
    );
  }

  return true;
}

// --- Realtime subscription -------------------------------------------------

/**
 * Subscribe to all room changes. `onChange` fires whenever the room updates.
 *
 * Two delivery paths for robustness:
 *  1. A lightweight Broadcast "sync" message (sent via pokeRoom after each
 *     write). Broadcast needs no publication/RLS setup, so it works out of the
 *     box and is the primary, instant path — this is Supabase's recommended
 *     way to re-stream DB changes to clients.
 *  2. postgres_changes as a secondary path (works when the tables are on the
 *     supabase_realtime publication).
 * A periodic poll in the store is the final safety net.
 */
export function subscribeRoom(roomId: string, onChange: () => void): RealtimeChannel | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  const channel = supabase
    .channel(`room:${roomId}`, { config: { broadcast: { self: false } } })
    .on("broadcast", { event: "sync" }, () => onChange())
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "game_events", filter: `room_id=eq.${roomId}` },
      () => onChange(),
    )
    .subscribe();

  return channel;
}

/** Notify other clients in the room to reload now (low-latency broadcast). */
export function pokeRoom(channel: RealtimeChannel | null): void {
  // Only broadcast once the channel is actually joined over WebSocket.
  // Calling send() before that makes supabase-js fall back to REST and spam a
  // deprecation warning; polling already covers sync until the socket is up.
  if (channel && channel.state === "joined") {
    channel.send({ type: "broadcast", event: "sync", payload: {} });
  }
}

export function unsubscribeRoom(channel: RealtimeChannel | null): void {
  if (channel) getSupabase()?.removeChannel(channel);
}
