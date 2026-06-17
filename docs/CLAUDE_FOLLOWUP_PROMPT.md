# CLAUDE_FOLLOWUP_PROMPT.md

Paste this into Claude Code after adding these files to the repository.

---

Please read `CLAUDE.md`, `PROJECT_CONTEXT.md`, and `SUPABASE_SETUP.md`.

Implement the StellarBurst MVP according to those files.

Use:

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Zustand
- Supabase Realtime

Important:

- Use `NEXT_PUBLIC_SUPABASE_URL`.
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Do not use service_role or secret keys.
- Do not require login for MVP.
- Generate `client_id` in localStorage.
- Use `rooms`, `players`, and `game_events`.
- Card artwork must be original pixel art / dot art, not emoji.
- Run build/lint/tests and fix issues.

At the end, report:

1. What files were created or modified.
2. What commands were run.
3. Whether Supabase schema assumptions match the app.
4. What I should set in Vercel environment variables.
5. Remaining TODOs.
