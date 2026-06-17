"use client";

import { useMemo, useState } from "react";
import { BattleLog } from "./BattleLog";
import { CardView } from "./CardView";
import { PlayerPanel } from "./PlayerPanel";
import { canDefend, canUseDefense } from "@/lib/rules";
import { currentPlayerId } from "@/lib/room";
import { useGameStore } from "@/store/gameStore";
import type { Card } from "@/lib/types";

function needsTarget(card: Card): boolean {
  if (card.kind === "attack") return true;
  if (card.kind === "special") {
    return (
      card.special === "skip_turn" ||
      card.special === "limit_defense" ||
      card.special === "slip_damage"
    );
  }
  return false;
}

export function GameBoard() {
  const roomState = useGameStore((s) => s.roomState)!;
  const identity = useGameStore((s) => s.identity);
  const sendGameAction = useGameStore((s) => s.sendGameAction);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const myId = identity.id;
  const me = roomState.players.find((p) => p.id === myId);
  const hand = useMemo(() => roomState.hands[myId] ?? [], [roomState.hands, myId]);
  const turnId = currentPlayerId(roomState);
  const turnPlayer = roomState.players.find((p) => p.id === turnId);
  const isMyTurn = turnId === myId && roomState.phase === "action";

  const pending = roomState.pending;
  const amDefending =
    roomState.phase === "defense" && pending?.targetId === myId && Boolean(me?.alive);

  const selectedCard = hand.find((c) => c.id === selectedCardId) ?? null;
  const targetingMode = Boolean(selectedCard && needsTarget(selectedCard) && isMyTurn);

  const opponents = roomState.players.filter((p) => p.id !== myId);

  // Defense options when responding to an attack.
  const defenseOptions = useMemo(() => {
    if (!amDefending || !pending || !me) return [];
    if (!canUseDefense(me)) return [];
    return hand.filter(
      (c) => c.kind === "defense" && (pending.card.fatal || canDefend(pending.card, c)),
    );
  }, [amDefending, pending, me, hand]);

  function playCard(targetId?: string) {
    if (!selectedCard) return;
    if (selectedCard.kind === "attack") {
      if (!targetId) return;
      sendGameAction({ type: "play_attack", cardId: selectedCard.id, targetId });
    } else if (selectedCard.special === "heal") {
      sendGameAction({ type: "play_heal", cardId: selectedCard.id });
    } else {
      sendGameAction({ type: "play_special", cardId: selectedCard.id, targetId });
    }
    setSelectedCardId(null);
  }

  function handleCardTap(card: Card) {
    if (!isMyTurn) return;
    setSelectedCardId((cur) => (cur === card.id ? null : card.id));
    if (card.kind === "special" && !needsTarget(card)) {
      // Non-targeted special (heal / shuffle) — confirm via the action bar.
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Turn banner */}
      <div className="panel flex items-center justify-between p-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400">Current turn</div>
          <div className="text-lg font-black text-neon-purple">
            {turnPlayer?.name ?? "—"}
            {isMyTurn && <span className="ml-2 text-neon-gold">— your move!</span>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          Room <span className="font-bold text-neon-gold">{roomState.code}</span>
        </div>
      </div>

      {/* Player panels */}
      <div className="grid grid-cols-2 gap-2">
        {roomState.players.map((p) => (
          <PlayerPanel
            key={p.id}
            player={p}
            isSelf={p.id === myId}
            isCurrent={p.id === turnId}
            handCount={roomState.hands[p.id]?.length}
            selectable={targetingMode && p.id !== myId}
            selected={false}
            onSelect={() => playCard(p.id)}
          />
        ))}
      </div>

      <BattleLog log={roomState.log} />

      {/* Defense prompt */}
      {amDefending && pending && (
        <div className="panel border-neon-pink/60 p-3">
          <div className="mb-2 text-sm font-bold text-neon-pink">
            Incoming {pending.card.fatal ? "FATAL " : ""}
            {pending.card.name}
            {!pending.card.fatal && ` (${pending.card.damage})`}! Defend?
          </div>
          {!canUseDefense(me!) && (
            <p className="mb-2 text-xs text-red-300">Your defense is crippled right now.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {defenseOptions.map((c) => (
              <CardView
                key={c.id}
                card={c}
                compact
                onClick={() => sendGameAction({ type: "defend", cardId: c.id })}
              />
            ))}
          </div>
          <button
            onClick={() => sendGameAction({ type: "defend", cardId: null })}
            className="btn-secondary mt-3 w-full"
          >
            Take the hit
          </button>
        </div>
      )}

      {/* Hand + action bar */}
      <div className="mt-auto">
        {targetingMode && (
          <div className="mb-2 text-center text-sm font-semibold text-neon-gold">
            Select a target above
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          {hand.map((c) => (
            <CardView
              key={c.id}
              card={c}
              selected={c.id === selectedCardId}
              disabled={!isMyTurn}
              onClick={() => handleCardTap(c)}
            />
          ))}
        </div>

        {isMyTurn && (
          <div className="flex gap-2">
            {selectedCard && !needsTarget(selectedCard) && (
              <button onClick={() => playCard()} className="btn-primary flex-1">
                Play {selectedCard.name}
              </button>
            )}
            {selectedCard && (
              <button onClick={() => setSelectedCardId(null)} className="btn-secondary">
                Cancel
              </button>
            )}
            {!selectedCard && (
              <button
                onClick={() => sendGameAction({ type: "pass" })}
                className="btn-secondary flex-1"
              >
                Pass turn
              </button>
            )}
          </div>
        )}

        {!isMyTurn && !amDefending && (
          <div className="py-2 text-center text-sm text-slate-400">
            Waiting for {turnPlayer?.name ?? "the next player"}…
          </div>
        )}
      </div>
    </div>
  );
}
