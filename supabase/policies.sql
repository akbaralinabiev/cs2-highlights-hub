create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;

drop policy if exists "Owners can read their own allowlist entry" on public.admin_users;
create policy "Owners can read their own allowlist entry"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  map text not null,
  tags text[] not null default '{}',
  video_path text,
  featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.highlights drop column if exists round;
alter table public.highlights drop column if exists score;

alter table public.highlights enable row level security;
grant select on public.highlights to anon, authenticated;
grant insert, update, delete on public.highlights to authenticated;

drop policy if exists "Public can read published highlights" on public.highlights;
create policy "Public can read published highlights"
  on public.highlights
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "Only owners can add highlights" on public.highlights;
create policy "Only owners can add highlights"
  on public.highlights
  for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Only owners can edit highlights" on public.highlights;
create policy "Only owners can edit highlights"
  on public.highlights
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Only owners can delete highlights" on public.highlights;
create policy "Only owners can delete highlights"
  on public.highlights
  for delete
  to authenticated
  using ((select public.is_admin()));

insert into storage.buckets (id, name, public)
values ('highlights', 'highlights', true)
on conflict (id) do update set public = true;

drop policy if exists "Only owners can upload highlight videos" on storage.objects;
create policy "Only owners can upload highlight videos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'highlights' and (select public.is_admin()));

drop policy if exists "Only owners can update highlight videos" on storage.objects;
create policy "Only owners can update highlight videos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'highlights' and (select public.is_admin()))
  with check (bucket_id = 'highlights' and (select public.is_admin()));

drop policy if exists "Only owners can delete highlight videos" on storage.objects;
create policy "Only owners can delete highlight videos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'highlights' and (select public.is_admin()));
