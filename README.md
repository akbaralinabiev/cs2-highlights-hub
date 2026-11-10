# thefear14 — CS2 Highlights Hub

A responsive Counter-Strike 2 highlights site built with React, Vite, and Supabase. Visitors can browse and like published videos; the allowlisted owner can upload and manage highlights.

## Features

### Public site

- Full landing page and highlights gallery at `/#highlights` (also the default route)
- Separate About page at `/#about`, with Steam and FACEIT profile links
- Search, map and highlight-type filters, and newest/oldest sorting
- Video playback, highlight details, and persistent like counts
- Responsive layout for phone, tablet, and desktop screen sizes
- No visitor-facing dashboard or upload controls

### Owner dashboard

- Owner sign-in at `/#admin` via Supabase Auth and the `admin_users` allowlist
- Upload videos directly to Supabase Storage with resumable transfer and progress
- Save title, map, highlight type, publication state, and video path in Supabase Postgres
- Edit highlight title, map, and type, or replace the video
- Edits preserve likes by updating the existing highlight record
- Feature or delete highlights
- Upload, edit, and delete operations are protected by Supabase row-level security (RLS)

## Stack

- React 18
- Vite 6
- Supabase Auth, Postgres, and Storage
- `tus-js-client` for resumable video uploads

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set your project URL and publishable key:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   Never put a Supabase secret or service-role key in frontend environment variables or commit them.

3. In Supabase Auth, disable public sign-ups and create or invite your owner account.
4. Run the complete [`supabase/policies.sql`](./supabase/policies.sql) file in the Supabase SQL Editor. It creates the owner allowlist, highlights and likes tables, Storage bucket, RLS policies, and like RPC functions. It also removes the old `round` and `score` columns from an existing highlights table.
5. Add your owner account to the allowlist. Replace the email with the exact email used for your Supabase Auth account:

   ```sql
   insert into public.admin_users (user_id)
   select id
   from auth.users
   where lower(email) = lower('your-owner-email@example.com')
   on conflict (user_id) do nothing;
   ```

6. Confirm the allowlist entry:

   ```sql
   select u.email, (a.user_id is not null) as owner_allowlisted
   from auth.users as u
   left join public.admin_users as a on a.user_id = u.id
   where lower(u.email) = lower('your-owner-email@example.com');
   ```

   `owner_allowlisted` should be `true`.

The hidden `#admin` route is not the security mechanism: authorization is checked against Supabase Auth and the owner allowlist, while database and Storage writes are enforced by RLS. Re-run the setup SQL after pulling changes that update its schema or policies.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Public routes:

- `/#highlights` — landing page and video gallery
- `/#about` — Steam and FACEIT profile links

Owner route:

- `/#admin` — sign in, then manage highlights

## Upload and storage notes

- Uploads go directly from the browser to the `highlights` Supabase Storage bucket using the signed-in owner session.
- New uploads are published to the public gallery.
- The bucket is public for playback; its write operations are restricted to allowlisted owners by RLS.
- Check the current Supabase plan and bucket upload-size limit before uploading large videos. Resumable uploads improve reliability but do not override those limits.
- Visitor likes are stored in Supabase and are limited to one per browser profile. Because visitors do not sign in, clearing browser storage or changing browsers can allow another like; this is lightweight engagement tracking, not fraud-resistant voting.

## Build and preview

```bash
npm run build
npm run preview
```

## Deployment

Deploy the Vite app to a static host such as Vercel or Netlify. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the host's environment settings, configure the production site URL in Supabase Auth, and redeploy. Never expose a Supabase secret or service-role key in the browser.
