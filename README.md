# Clutch Archive — CS2 Highlights Hub

A React + Vite frontend prototype for a personal CS2 highlights website and admin dashboard.

## Current prototype features

- Dark responsive highlights gallery inspired by the supplied reference image
- Search, map/type filters, sort order
- Clip detail modal
- Public highlights gallery with no visitor-facing upload or dashboard controls
- Owner sign-in via Supabase Auth at `/#admin` (requires project configuration and an allowlisted account)

## Important: prototype vs production

The app uses Supabase Auth, Postgres and Storage for owner-managed video publishing.

- Visitor pages have no upload or dashboard controls. The owner route is `/#admin`.
- The owner gate checks Supabase Auth and an explicit `admin_users` allowlist.
- Highlights and video files persist in the `highlights` table and Storage bucket. Uploads use resumable transfers directly from the browser.
- New uploads are published to the public gallery. The bucket is public for playback, while upload/update/delete operations are restricted by RLS to allowlisted owners.
- Video upload size limits are controlled by your Supabase project plan and Storage settings; check those limits before uploading large files.
- Run the SQL below before using database-backed gallery or uploads. Do not deploy without applying it.

## Configure owner authentication

1. Create a Supabase project and copy its Project URL and anon/public key.
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put a secret or service-role key in the frontend.
3. In Supabase Auth, disable public sign-ups and create/invite your owner account.
4. Run the complete [`supabase/policies.sql`](./supabase/policies.sql) in the Supabase SQL Editor. Re-run it if the app previously reported that `admin_users` was missing; it is safe to re-run. It also removes the old `round` and `score` columns from an existing highlights table.
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

Open the local URL printed by Vite to view the public gallery. Visit `/#admin` to sign in as the allowlisted owner, then use **Add highlight** to upload a video and its metadata. New uploads appear in the public gallery. If your Supabase Storage bucket rejects a large video, increase the project/bucket upload-size limit or use a plan that supports that size.

Build for deployment:

```bash
npm run build
npm run preview
```

## Suggested production architecture

- **Frontend/hosting:** Vercel (or Netlify)
- **Database and auth:** Supabase Postgres + Supabase Auth
- **Video files:** Supabase Storage (or another object-storage provider)
- **Uploads:** browser uploads directly with the signed-in owner session and resumable transfers; never send large videos through a Vercel/Netlify function
- **Metadata:** save title, map, highlight type, video object key, visibility, and timestamps in the database
- **Admin security:** Supabase Auth plus RLS authorization on every database and storage write. Hiding a dashboard link is not access control.

### Storage note

Check the current Supabase plan and bucket upload-size limits before uploading large clips. Resumable uploads improve reliability but do not override the project’s configured maximum file size.

## Next production steps

1. Configure production environment variables and redirect URLs in Supabase Auth.
2. Set Storage size limits based on your video requirements.
3. Add thumbnails/transcoding later if desired.
