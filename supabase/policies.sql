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

create table if not exists public.highlight_likes (
  highlight_id uuid not null references public.highlights (id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (highlight_id, visitor_id)
);

alter table public.highlight_likes enable row level security;

create or replace function public.get_highlight_like_stats(p_visitor_id uuid)
returns table (highlight_id uuid, like_count bigint, liked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id,
         count(l.visitor_id)::bigint,
         coalesce(bool_or(l.visitor_id = p_visitor_id), false)
  from public.highlights as h
  left join public.highlight_likes as l on l.highlight_id = h.id
  where h.is_published
  group by h.id;
$$;

revoke all on function public.get_highlight_like_stats(uuid) from public;
grant execute on function public.get_highlight_like_stats(uuid) to anon, authenticated;

create or replace function public.toggle_highlight_like(p_highlight_id uuid, p_visitor_id uuid)
returns table (like_count bigint, liked boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_visitor_id is null or not exists (
    select 1
    from public.highlights as h
    where h.id = p_highlight_id and h.is_published
  ) then
    raise exception 'Highlight is unavailable for liking';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_highlight_id::text || p_visitor_id::text, 0));

  if exists (
    select 1 from public.highlight_likes as l
    where l.highlight_id = p_highlight_id and l.visitor_id = p_visitor_id
  ) then
    delete from public.highlight_likes as l
    where l.highlight_id = p_highlight_id and l.visitor_id = p_visitor_id;
  else
    insert into public.highlight_likes (highlight_id, visitor_id)
    values (p_highlight_id, p_visitor_id);
  end if;

  return query
    select count(*)::bigint,
           exists (
             select 1 from public.highlight_likes as l
             where l.highlight_id = p_highlight_id and l.visitor_id = p_visitor_id
           )
    from public.highlight_likes as l
    where l.highlight_id = p_highlight_id;
end;
$$;

revoke all on function public.toggle_highlight_like(uuid, uuid) from public;
grant execute on function public.toggle_highlight_like(uuid, uuid) to anon, authenticated;
