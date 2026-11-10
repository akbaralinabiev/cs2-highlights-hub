# Clutch Archive — CS2 Highlights Hub

A React + Vite frontend prototype for a personal CS2 highlights website and admin dashboard.

## Current prototype features

- Dark responsive highlights gallery inspired by the supplied reference image
- Search, map/type filters, sort order
- Clip detail modal
- Public highlights gallery with no visitor-facing upload or dashboard controls
- Owner sign-in via Supabase Auth at `/#admin` (requires project configuration and an allowlisted account)

## Important: prototype vs production

This is a UI starter with a Supabase-authenticated owner gate, but it is **not a complete production publishing system yet**.

- Visitor pages have no upload or dashboard controls. The owner route is `/#admin`.
- The owner gate checks Supabase Auth and an explicit `admin_users` allowlist. The included SQL also applies row-level policies to highlight metadata and upload/delete operations in the `highlights` storage bucket.
- The dashboard and upload form are still a frontend prototype: clips are in memory, selected videos are not uploaded, and database/storage policies are not used by the UI yet.
- Added clips disappear when the page is refreshed.
- The player is a placeholder.
- Do not deploy as a complete private media-management tool until the Supabase setup below is complete and the UI is connected to database/storage.

## Configure owner authentication

1. Create a Supabase project and copy its Project URL and anon/public key.
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Do not put a service-role key in the frontend.
3. In Supabase Auth, disable public sign-ups and create/invite your owner account.
4. Run [`supabase/policies.sql`](./supabase/policies.sql) in the Supabase SQL Editor.
5. Add your account to the owner allowlist in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'your-owner-email@example.com'
   on conflict do nothing;
   ```

6. Add the same two public environment variables to your hosting provider and redeploy.

The login is password-based and the `admin_users` row—not a hidden `#admin` URL—determines access. Keep public sign-ups disabled and never expose a Supabase service-role key in Vite environment variables.

## Run locally

Requires Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite to view the public gallery. Once Supabase is configured, visit `/#admin` to sign in as the allowlisted owner.

Build for deployment:

```bash
npm run build
npm run preview
```

## Suggested production architecture

- **Frontend/hosting:** Vercel (or Netlify)
- **Database and auth:** Supabase Postgres + Supabase Auth
- **Video files:** Supabase Storage (or another object-storage provider)
- **Uploads:** browser uploads directly to storage with a short-lived signed URL; never send a 200 MB video through a Vercel/Netlify function
- **Metadata:** save title, map, round, score, tags, video object key, thumbnail object key, visibility, and timestamps in the database
- **Admin security:** real login + server-side authorization on every write operation. Hiding a dashboard link is not access control.

### Storage note

Supabase Storage's Free plan currently has a 50 MB maximum file size, so it does not meet a 200 MB-per-video requirement on Free. Check current plan limits before choosing a storage provider. Cloudflare R2 supports large objects and advertises no egress bandwidth fees, but storage and request charges still apply.

## Next production steps

1. Connect the owner dashboard to the `highlights` table and the `highlights` storage bucket.
2. Upload directly from the browser to storage, with the included row-level policies restricting writes to the allowlisted owner.
3. Save metadata in the database and use public playback URLs or signed URLs according to your privacy preference.
4. Add thumbnails/transcoding later if desired.
