# SUPABASE_SETUP.md

## Purpose

This file explains the Supabase setup for StellarBurst.

The MVP uses:

- Supabase Postgres
- Supabase Realtime
- Browser-safe publishable key
- RLS enabled with temporary development policies

## Environment Variables

Use these variables in Vercel and `.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not use these in frontend code:

```env
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The service role / secret key must never be committed to GitHub or exposed in browser code.

## Vercel Setup

In Vercel:

1. Open the project.
2. Go to Settings.
3. Open Environment Variables.
4. Add:

```env
NEXT_PUBLIC_SUPABASE_URL=your Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your sb_publishable_ key
```

Enable them for:

- Production
- Preview
- Development

## Local Setup

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your sb_publishable_ key
```

Do not commit `.env.local`.

## Database Setup

Run `supabase/schema.sql` in Supabase SQL Editor.

It creates:

- `public.rooms`
- `public.players`
- `public.game_events`

It also:

- Enables RLS.
- Adds MVP development policies.
- Adds the tables to `supabase_realtime` publication.

## Realtime Check

Run this query in SQL Editor:

```sql
select
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
```

Expected result:

```text
public | rooms
public | players
public | game_events
```

## Security Note

The included RLS policies are intentionally loose for MVP testing.

Before public release, replace them with stricter policies:

- Use anonymous auth or login.
- Link players to `auth.uid()`.
- Allow players to update only their own player row.
- Allow room members to read only their room.
- Validate important game actions server-side or through safe RPC functions.
