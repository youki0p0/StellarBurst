"use client";

import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";
import { CardView } from "@/components/CardView";
import { useT } from "@/store/i18n";
import type { Card } from "@/lib/types";

let n = 0;
function mk(c: Omit<Card, "id" | "name" | "description">): Card {
  n += 1;
  return { id: `tut${n}`, name: "", description: "", ...c };
}

const ATK = mk({ kind: "attack", color: "colorless", damage: 20, attackTarget: "next" });
const DEF = mk({ kind: "defense", color: "colorless", defense: "block" });
const SPC = mk({ kind: "special", color: "colorless", special: "reverse" });
const RED_ATK = mk({ kind: "attack", color: "red", damage: 20, attackTarget: "next" });
const RED_DEF = mk({ kind: "defense", color: "red", defense: "block" });
const FATAL = mk({ kind: "attack", color: "red", damage: 30, attackTarget: "next", fatal: true });

/** One visual step: a big glyph/visual on the left, a short caption on the right. */
function Step({
  visual,
  title,
  body,
}: {
  visual: React.ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <section className="panel flex items-center gap-4 p-4">
      <div className="flex shrink-0 items-center justify-center">{visual}</div>
      <div className="min-w-0">
        <h2 className="font-black text-neon-purple">{title}</h2>
        {body && <p className="mt-0.5 text-sm leading-snug text-slate-300">{body}</p>}
      </div>
    </section>
  );
}

export default function TutorialPage() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neon-cyan hover:underline">
          {t("cards.back")}
        </Link>
        <LangToggle />
      </div>

      <header className="text-center">
        <h1 className="text-3xl font-black text-neon-gold">{t("tutorial.title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("tutorial.subtitle")}</p>
      </header>

      {/* Goal: be the last star */}
      <Step
        visual={
          <div className="flex items-end gap-1">
            <span className="text-2xl text-board-600">✦</span>
            <span className="animate-floaty text-5xl text-neon-gold drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">★</span>
            <span className="text-2xl text-board-600">✦</span>
          </div>
        }
        title={t("tutorial.goalTitle")}
        body={t("tutorial.goalBody")}
      />

      {/* Orbit order */}
      <Step
        visual={
          <div className="flex items-center gap-1 text-2xl">
            <span className="text-neon-purple">★</span>
            <span className="text-neon-cyan">➜</span>
            <span className="text-neon-purple">★</span>
            <span className="animate-[spin_5s_linear_infinite] text-neon-cyan">↻</span>
          </div>
        }
        title={t("tutorial.orbitTitle")}
        body={t("tutorial.orbitBody")}
      />

      {/* Three card kinds */}
      <section className="panel p-4">
        <h2 className="mb-3 text-center font-black text-neon-purple">{t("tutorial.cardsTitle")}</h2>
        <div className="flex items-start justify-center gap-3">
          <figure className="flex flex-col items-center gap-1">
            <CardView card={ATK} />
            <figcaption className="max-w-24 text-center text-[11px] text-slate-300">{t("tutorial.atk")}</figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-1">
            <CardView card={DEF} />
            <figcaption className="max-w-24 text-center text-[11px] text-slate-300">{t("tutorial.def")}</figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-1">
            <CardView card={SPC} />
            <figcaption className="max-w-24 text-center text-[11px] text-slate-300">{t("tutorial.spc")}</figcaption>
          </figure>
        </div>
      </section>

      {/* Color matching */}
      <Step
        visual={
          <div className="flex items-center gap-1">
            <CardView card={RED_ATK} compact />
            <span className="text-xl text-neon-cyan">↔</span>
            <CardView card={RED_DEF} compact />
          </div>
        }
        title={t("tutorial.defColorTitle")}
        body={t("tutorial.defColorBody")}
      />

      {/* Fatal */}
      <Step
        visual={<CardView card={FATAL} compact />}
        title={t("tutorial.fatalTitle")}
        body={t("tutorial.fatalBody")}
      />

      {/* STELLA */}
      <Step
        visual={<span className="text-4xl">🌟</span>}
        title={t("tutorial.stellaTitle")}
        body={t("tutorial.stellaBody")}
      />

      <Link href="/" className="btn-primary mt-1 w-full text-center">
        {t("tutorial.start")}
      </Link>
    </div>
  );
}
