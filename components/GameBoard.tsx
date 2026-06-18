"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BattleLog } from "./BattleLog";
import { CardView } from "./CardView";
import { OrbitBoard } from "./OrbitBoard";
import { RoomCode } from "./RoomCode";
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
    case "log.stellaDeclare":
      return { sfx: "stella", flash: target ? { id: target, kind: "super" } : undefined };
    case "log.pointOut":
    case "log.pointHit":
      return { sfx: "callout" };
    case "log.mispoint":
    case "log.stellaFail":
      return { sfx: "callout", flash: e.actorId ? { id: e.actorId, kind: "hit" } : undefined };
    case "log.guardHold":
      return { sfx: "reflect", flash: e.actorId ? { id: e.actorId, kind: "reflect" } : undefined };
    case "log.buffHeal":
    case "log.buffShield":
    case "log.buffCard":
      return { sfx: "heal", flash: e.actorId ? { id: e.actorId, kind: "heal" } : undefined };
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
  const [declareStella, setDeclareStella] = useState(false);
  // Default: double-tap a card to play it. Toggle to tap-then-confirm. Persisted.
  const [doubleTap, setDoubleTap] = useState(true);
  useEffect(() => {
    setDoubleTap(localStorage.getItem("sb_playmode") !== "confirm");
  }, []);
  const togglePlayMode = () =>
    setDoubleTap((v) => {
      const next = !v;
      localStorage.setItem("sb_playmode", next ? "double" : "confirm");
      return next;
    });
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<
    { id: string; kind: "hit" | "reflect" | "heal" | "super" } | null
  >(null);
  const lastEventId = useRef<string | null>(null);

  // Size the orbit board to the leftover space so the game stays on one screen,
  // but cap it: the star ring is low-information, so keep it compact. The cap
  // grows a little with player count so 5–8 stars stay legible without
  // overlapping; it still shrinks below the cap on short screens.
  const playerCount = roomState.players.length;
  const boardCap = playerCount <= 4 ? 184 : 184 + (playerCount - 4) * 22;
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const measure = () =>
      setBoardSize(Math.min(boardCap, Math.floor(Math.min(el.clientWidth, el.clientHeight))));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [boardCap]);

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
  // STELLA can only be declared on a single-target flare (not AOE).
  const canDeclareStella = Boolean(
    selectedCard && selectedCard.kind === "attack" && selectedCard.attackTarget !== "all",
  );
  const willDeclareStella = canDeclareStella && declareStella;

  const opponents = roomState.players.filter((p) => p.id !== myId);

  // --- STELLA finishing window ---
  const stella = roomState.stella;
  const inStella = roomState.phase === "stella" && Boolean(stella) && Boolean(pending);
  const iAmFinisher = Boolean(inStella && stella && stella.attackerId === myId);
  const iAmFinished = Boolean(inStella && stella && stella.targetId === myId && me?.alive);
  const iPointed = Boolean(inStella && stella && myId && stella.pointedBy.includes(myId));
  const iCanPoint = Boolean(
    inStella && stella && me?.alive && myId !== stella.attackerId && myId !== stella.targetId && !iPointed,
  );
  const finishTarget = stella ? roomState.players.find((p) => p.id === stella.targetId) : null;
  const secsLeft = stella ? Math.max(0, Math.ceil((stella.deadline - now) / 1000)) : 0;

  // Tick a clock while a STELLA window is open (drives the countdown).
  useEffect(() => {
    if (!inStella) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [inStella]);

  // Drop a stale STELLA toggle whenever the selection can't carry it.
  useEffect(() => {
    if (!canDeclareStella && declareStella) setDeclareStella(false);
  }, [canDeclareStella, declareStella]);

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

  // During a finish, pass-forwarding is disabled — only block/reflect cards help.
  const stellaShields = useMemo(() => {
    if (!iAmFinished || !pending || !me || !canUseDefense(me)) return [];
    return hand.filter(
      (c) =>
        c.kind === "defense" &&
        c.defense !== "pass" &&
        (pending.card.fatal || canDefend(pending.card, c)),
    );
  }, [iAmFinished, pending, me, hand]);

  function playCard(card: Card | null, targetId?: string) {
    if (!card) return;
    if (card.kind === "attack") {
      const stellaFlag = card.attackTarget !== "all" && declareStella;
      if (needsTarget(card)) {
        if (!targetId) return;
        sendGameAction({ type: "play_attack", cardId: card.id, targetId, stella: stellaFlag });
      } else {
        sendGameAction({ type: "play_attack", cardId: card.id, stella: stellaFlag });
      }
    } else if (card.special === "heal") {
      sendGameAction({ type: "play_heal", cardId: card.id });
    } else {
      sendGameAction({ type: "play_special", cardId: card.id });
    }
    setSelectedCardId(null);
    setDeclareStella(false);
  }

  function handleCardTap(card: Card) {
    if (!isMyTurn) return;
    // Double-tap mode: a second tap on the selected card plays it. (Target-pick
    // cards still need a star tap, so they only select here.)
    if (doubleTap && selectedCardId === card.id && !needsTarget(card)) {
      playCard(card);
      return;
    }
    setSelectedCardId((cur) => (cur === card.id ? null : card.id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* STELLA finishing window — centered popup, floats over the board/log */}
      {inStella && stella && finishTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
          <div className="panel relative w-full max-w-xs animate-pop border-neon-gold/70 bg-board-800/95 p-4 shadow-neon">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black tracking-widest text-neon-gold">
                🌟 {t("stella.windowTitle")}
              </div>
              <div className="text-2xl font-black tabular-nums text-neon-pink">{secsLeft}</div>
            </div>

            {iAmFinished ? (
              <>
                <p className="mt-1 text-sm font-bold text-neon-pink">{t("stella.youAreTarget")}</p>
                {stellaShields.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {stellaShields.map((c) => (
                      <CardView
                        key={c.id}
                        card={c}
                        compact
                        onClick={() => sendGameAction({ type: "defend", cardId: c.id })}
                      />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => sendGameAction({ type: "defend", cardId: null })}
                  className="btn-secondary mt-2 w-full"
                >
                  {t("game.takeHit")}
                </button>
              </>
            ) : iAmFinisher ? (
              <p className="mt-2 text-center text-sm text-slate-300">{t("stella.attackerWait")}</p>
            ) : iCanPoint ? (
              <>
                <button
                  onClick={() => sendGameAction({ type: "call_out" })}
                  className="btn-primary mt-2 w-full border-neon-pink/70 py-3 text-lg font-black"
                >
                  {t("stella.pointOutBtn")}
                </button>
                <p className="mt-1 text-center text-xs text-slate-400">{t("stella.bystanderHint")}</p>
              </>
            ) : (
              <p className="mt-2 text-center text-sm text-slate-400">
                {iPointed ? t("stella.pointedAlready") : t("stella.attackerWait")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Turn banner */}
      <div className="panel flex shrink-0 items-center justify-between p-3">
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
            <RoomCode code={roomState.code} />
          </div>
          <SfxToggle />
        </div>
      </div>

      {/* Star statuses on the orbit ring — flex-fills the leftover space and
          shrinks to keep everything on one screen. */}
      <div ref={boardWrapRef} className="flex min-h-0 flex-1 items-center justify-center">
        <OrbitBoard
          players={roomState.players}
          turnId={turnId}
          direction={roomState.direction}
          selfClientId={identity.id}
          sizePx={boardSize || undefined}
          selectableIds={
            targetingMode
              ? opponents.filter((p) => p.alive).map((p) => p.id)
              : []
          }
          selectedId={null}
          finishingId={inStella && stella ? stella.targetId : null}
          onSelect={(id) => playCard(selectedCard, id)}
          flash={flash}
        />
      </div>

      {/* Bottom cluster (defense → hand → log), kept compact and always visible */}
      <div className="flex shrink-0 flex-col gap-2">
        {/* Defense prompt — just above the hand */}
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
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-neon-gold">
              {targetingMode
                ? t("game.selectTarget")
                : isMyTurn && doubleTap && selectedCard && !needsTarget(selectedCard)
                  ? t("game.tapAgain")
                  : ""}
            </span>
            <button
              onClick={togglePlayMode}
              className="shrink-0 rounded border border-board-600 bg-board-800 px-2 py-0.5 text-[11px] text-slate-300"
              title={t("game.playMode")}
            >
              {t("game.playMode")}: {doubleTap ? t("game.modeDouble") : t("game.modeConfirm")}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {hand.map((c) => (
              <CardView
                key={c.id}
                card={c}
                selected={c.id === selectedCardId}
                disabled={!isMyTurn}
                direction={roomState.direction}
                onClick={() => handleCardTap(c)}
              />
            ))}
          </div>

          {isMyTurn && canDeclareStella && (
            <button
              onClick={() => setDeclareStella((v) => !v)}
              aria-pressed={declareStella}
              className={[
                "mb-2 w-full rounded-lg border px-3 py-2 text-sm font-bold tracking-wide transition",
                declareStella
                  ? "border-neon-gold bg-neon-gold/15 text-neon-gold shadow-neon"
                  : "border-board-600 text-slate-300",
              ].join(" ")}
            >
              🌟 {t("stella.toggle")} · {declareStella ? "ON" : "OFF"}
            </button>
          )}

          {isMyTurn && (
            <div className="flex gap-2">
              {selectedCard && !needsTarget(selectedCard) && (
                <button onClick={() => playCard(selectedCard)} className="btn-primary flex-1">
                  {willDeclareStella
                    ? t("stella.declareBtn")
                    : `${t("game.play")} ${localizeCardName(selectedCard, lang)}`}
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

        {/* Battle log — very bottom */}
        <BattleLog log={roomState.log} />
      </div>
    </div>
  );
}
