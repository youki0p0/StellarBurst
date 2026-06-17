import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { GameAction, RoomState } from "./types";

export type NetRequest =
  | { reqType: "join"; fromId: string; name: string }
  | { reqType: "ready"; fromId: string; ready: boolean }
  | { reqType: "start"; fromId: string }
  | { reqType: "restart"; fromId: string }
  | { reqType: "action"; fromId: string; action: GameAction };

export interface NetHandlers {
  /** Fired on every client when the host broadcasts authoritative state. */
  onState: (state: RoomState) => void;
  /** Host only: a client requested something. */
  onRequest?: (req: NetRequest) => void;
  /** Host only: the set of currently-present player ids changed. */
  onPresence?: (presentIds: string[]) => void;
}

/**
 * Thin wrapper over a Supabase Realtime channel implementing a
 * host-authoritative protocol: clients send `req` broadcasts, the host applies
 * them and broadcasts full `state` snapshots back to everyone.
 */
export class RoomNet {
  private channel: RealtimeChannel | null = null;
  private handlers: NetHandlers | null = null;

  constructor(
    private readonly code: string,
    private readonly self: { id: string; name: string },
    private readonly isHost: boolean,
  ) {}

  connect(handlers: NetHandlers): boolean {
    const supabase = getSupabase();
    if (!supabase) return false;
    this.handlers = handlers;

    const channel = supabase.channel(`room:${this.code}`, {
      config: { presence: { key: this.self.id } },
    });

    channel.on("broadcast", { event: "state" }, ({ payload }) => {
      this.handlers?.onState(payload as RoomState);
    });

    channel.on("broadcast", { event: "req" }, ({ payload }) => {
      if (this.isHost) this.handlers?.onRequest?.(payload as NetRequest);
    });

    if (this.isHost) {
      channel.on("presence", { event: "sync" }, () => {
        const ids = Object.keys(channel.presenceState());
        this.handlers?.onPresence?.(ids);
      });
    }

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({ id: this.self.id, name: this.self.name });
      if (!this.isHost) {
        // Ask the host to add us and send current state.
        this.sendRequest({ reqType: "join", fromId: this.self.id, name: this.self.name });
      }
    });

    this.channel = channel;
    return true;
  }

  /** Host: broadcast the authoritative state to all clients. */
  broadcastState(state: RoomState): void {
    this.channel?.send({ type: "broadcast", event: "state", payload: state });
  }

  /** Client (or host): send a request to the host. */
  sendRequest(req: NetRequest): void {
    this.channel?.send({ type: "broadcast", event: "req", payload: req });
  }

  disconnect(): void {
    if (this.channel) {
      getSupabase()?.removeChannel(this.channel);
      this.channel = null;
    }
    this.handlers = null;
  }
}
