"use client";

import { useT } from "@/store/i18n";

export function SetupScreen() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="panel max-w-md p-6">
        <h1 className="mb-2 text-2xl font-black text-neon-purple">{t("setup.title")}</h1>
        <p className="mb-4 text-slate-300">{t("setup.intro")}</p>
        <pre className="mb-4 overflow-x-auto rounded-xl bg-board-900 p-4 text-left text-sm text-neon-cyan">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`}
        </pre>
        <p className="mb-3 text-sm text-slate-400">{t("setup.create")}</p>
        <p className="text-sm text-slate-400">{t("setup.localVercel")}</p>
      </div>
    </div>
  );
}
