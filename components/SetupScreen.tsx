export function SetupScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="panel max-w-md p-6">
        <h1 className="mb-2 text-2xl font-black text-neon-purple">Setup needed</h1>
        <p className="mb-4 text-slate-300">
          StellarBurst needs Supabase Realtime credentials to sync multiplayer
          rooms. Add these environment variables and reload:
        </p>
        <pre className="mb-4 overflow-x-auto rounded-xl bg-board-900 p-4 text-left text-sm text-neon-cyan">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`}
        </pre>
        <p className="mb-3 text-sm text-slate-400">
          Create a free project at{" "}
          <span className="text-neon-pink">supabase.com</span> and copy these from
          Project Settings → API (use the browser-safe{" "}
          <code>publishable</code> key — never a service&nbsp;role / secret key).
        </p>
        <p className="text-sm text-slate-400">
          <span className="font-semibold text-slate-200">Local:</span> put them in{" "}
          <code>.env.local</code> (see <code>.env.example</code>) and restart.{" "}
          <span className="font-semibold text-slate-200">Vercel:</span> add them in
          Project&nbsp;Settings → Environment&nbsp;Variables (Production / Preview /
          Development) and redeploy. Then run <code>supabase/schema.sql</code> once
          in the Supabase SQL editor to create the tables.
        </p>
      </div>
    </div>
  );
}
