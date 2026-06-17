"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BattleLog } from "./BattleLog";
import { CardView } from "./CardView";
import { OrbitBoard } from "./OrbitBoard";
import { SfxToggle } from "./SfxToggle";
import { canDefend, canUseDefense } from "@/lib/rules";
import { currentPlayerId } from "@/lib/room";
import { useGameStore } from "@/store/gameStore";
import { useLangStore, useT } from "@/store/i18n";
import { localizeCardName } from "@/lib/i18n";
import { playSfx, type SfxName } from "@/lib/sfx";
import type { Card, GameEvent } from "@/lib/types";

/** Map a battle-log event to an optional sound + star flash. */
function effectFor(
  e: GameEvent,
): { sfx?: SfxName; flash?: { id: string; kind: "hit" | "reflect" | "heal" | "super" } } {
  const target = e.targetId;
  switch (e.key) {
    case "log.attackFatal":
      return { sfx: "flare", flash: target ? { id: target, kind: "super" } : undefined };
    case "log.attack":
    case "log.takeDamage":
      return { sfx: "flare", flash: target ? { id: target, kind: "hit" } : undefined };
    case "log.aoe":
      return { sfx: "flare" };
    case "log.chain":
      return { sfx: "chain", flash: target ? { id: target, kind: "hit" } : undefined };
    case "log.reflect":
      return { sfx: "reflect", flash: target ? { id: target, kind: "reflect" } : undefined };
    case "log.negate":
      return { sfx: "reflect" };
    case "log.passAttack":
      return { sfx: "chain" };
    case "log.heal":
      return { sfx: "heal", flash: e.actorId ? { id: e.actorId, kind: "heal" } : undefined };
    case "log.reverse":
    case "log.shuffle":
      return { sfx: "reverse" };
    case "log.skipOk":
    case "log.skipped":
      return { sfx: "eclipse" };
    case "log.stella":
      return { sfx: "stella" };
    case "log.calledOut":
      return { sfx: "callout", flash: target ? { id: target, kind: "hit" } : undefined };
    case "log.eliminate":
      return { sfx: "darken" };
    default:
      return {};
  }
}

// Only rare free-pick flares need a chosen target; everything else is
// flow-based (the reducer resolves next/prev/random/all) or self/global.
function needsTarget(card: Card): boolean {
  return card.kind === "attack" && card.attackTarget === "choose";
}

export function GameBoard() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const roomState = useGameStore((s) => s.roomState)!;
  const identity = useGameStore((s) => s.identity);
  const sendGameAction = useGameStore((s) => s.sendGameAction);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [flash, setFlash] = useState<
    { id: string; kind: "hit" | "reflect" | "heal" | "super" } | null
  >(null);
  const lastEventId = useRef<string | null>(null);

  // React to fresh battle-log events with sound + a star flash.
  useEffect(() => {
    const log = roomState.log;
    if (log.length === 0) return;
    let start = log.length;
    if (lastEventId.current) {
      const i = log.findIndex((e) => e.id === lastEventId.current);
      if (i === -1) {
        // ids were swapped (optimistic → reload). Resync without replaying.
        lastEventId.current = log[log.length - 1].id;
        return;
      }
      start = i + 1;
    }
    lastEventId.current = log[log.length - 1].id;
    let latestFlash: typeof flash = null;
    for (const e of log.slice(start)) {
      const fx = effectFor(e);
      if (fx.sfx) playSfx(fx.sfx);
      if (fx.flash) latestFlash = fx.flash;
    }
    if (latestFlash) {
      setFlash(latestFlash);
      const id = setTimeout(() => setFlash(null), 650);
      return () => clearTimeout(id);
    }
  }, [roomState.log]);

  const me = roomState.players.find((p) => p.clientId === identity.id);
  const myId = me?.id ?? "";
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

  // STELLA Call window.
  const stella = roomState.stella;
  const iOweStella = Boolean(stella && stella.playerId === myId && me?.alive);
  const stellaPlayer = stella ? roomState.players.find((p) => p.id === stella.playerId) : null;
  const canCallOut = Boolean(
    stella && me?.alive && stella.playerId !== myId && stellaPlayer,
  );

  // Shields we may answer an incoming flare with: block/reflect need a valid
  // color (or it's a supernova), pass works on anything.
  const defenseOptions = useMemo(() => {
    if (!amDefending || !pending || !me) return [];
    if (!canUseDefense(me)) return [];
    return hand.filter(
      (c) =>
        c.kind === "defense" &&
        (c.defense === "pass" || pending.card.fatal || canDefend(pending.card, c)),
    );
  }, [amDefending, pending, me, hand]);

  function playCard(targetId?: string) {
    if (!selectedCard) return;
    if (selectedCard.kind === "attack") {
      if (needsTarget(selectedCard)) {
        if (!targetId) return;
        sendGameAction({ type: "play_attack", cardId: selectedCard.id, targetId });
      } else {
        sendGameAction({ type: "play_attack", cardId: selectedCard.id });
      }
    } else if (selectedCard.special === "heal") {
      sendGameAction({ type: "play_heal", cardId: selectedCard.id });
    } else {
      sendGameAction({ type: "play_special", cardId: selectedCard.id });
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
          <div className="text-xs uppercase tracking-widest text-slate-400">
            {t("game.currentTurn")}
          </div>
          <div className="text-lg font-black text-neon-purple">
            {turnPlayer?.name ?? "—"}
            {isMyTurn && <span className="ml-2 text-neon-gold">— {t("game.yourMove")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-right text-xs text-slate-400">
          <div>
            <div>
              {t("game.orbit")}{" "}
              <span className="font-bold text-neon-cyan">
                {roomState.direction === 1 ? "↻" : "↺"}
              </span>
            </div>
            {t("game.room")} <span className="font-bold text-neon-gold">{roomState.code}</span>
          </div>
          <SfxToggle />
        </div>
      </div>

      {/* STELLA Call window */}
      {iOweStella && (
        <button
          onClick={() => sendGameAction({ type: "stella_call" })}
          className="btn-primary w-full animate-pop bg-gradient-to-r from-neon-gold to-neon-pink py-4 text-xl font-black tracking-widest"
        >
          {t("stella.declare")}
          <span className="ml-2 text-sm font-normal opacity-80">— {t("stella.prompt")}</span>
        </button>
      )}
      {!iOweStella && canCallOut && stellaPlayer && (
        <button
          onClick={() => sendGameAction({ type: "call_out", targetId: stellaPlayer.id })}
          className="btn-secondary w-full border-neon-pink/70 text-neon-pink"
        >
          {t("stella.callout")}{" "}
          <span className="text-xs opacity-70">({t("stella.calloutOf", { name: stellaPlayer.name })})</span>
        </button>
      )}

      {/* Orbit board: stars on the ring */}
      <OrbitBoard
        players={roomState.players}
        turnId={turnId}
        direction={roomState.direction}
        selfClientId={identity.id}
        selectableIds={
          targetingMode
            ? opponents.filter((p) => p.alive).map((p) => p.id)
            : []
        }
        selectedId={null}
        onSelect={(id) => playCard(id)}
        flash={flash}
      />

      <BattleLog log={roomState.log} />

      {/* Defense prompt */}
      {amDefending && pending && (
        <div className="panel border-neon-pink/60 p-3">
          <div className="mb-2 text-sm font-bold text-neon-pink">
            {t("game.incoming")} {pending.card.fatal ? `${t("game.fatal")} ` : ""}
            {localizeCardName(pending.card, lang)}
            {!pending.card.fatal && ` (${pending.card.damage})`} — {t("game.defendQ")}
          </div>
          {!canUseDefense(me!) && (
            <p className="mb-2 text-xs text-red-300">{t("game.crippled")}</p>
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
            {t("game.takeHit")}
          </button>
        </div>
      )}

      {/* Hand + action bar */}
      <div className="mt-auto">
        {targetingMode && (
          <div className="mb-2 text-center text-sm font-semibold text-neon-gold">
            {t("game.selectTarget")}
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
                {t("game.play")} {localizeCardName(selectedCard, lang)}
              </button>
            )}
            {selectedCard && (
              <button onClick={() => setSelectedCardId(null)} className="btn-secondary">
                {t("game.cancel")}
              </button>
            )}
            {!selectedCard && (
              <button
                onClick={() => sendGameAction({ type: "pass" })}
                className="btn-secondary flex-1"
              >
                {t("game.passTurn")}
              </button>
            )}
          </div>
        )}

        {!isMyTurn && !amDefending && (
          <div className="py-2 text-center text-sm text-slate-400">
            {t("game.waitingFor")} {turnPlayer?.name ?? t("game.nextPlayer")}…
          </div>
        )}
      </div>
    </div>
  );
}
