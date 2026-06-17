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
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
        </pre>
        <p className="text-sm text-slate-400">
          Create a free project at{" "}
          <span className="text-neon-pink">supabase.com</span>, copy the values
          from Project Settings → API into a <code>.env.local</code> file (see{" "}
          <code>.env.example</code>), then restart. No database tables required.
        </p>
      </div>
    </div>
  );
}
