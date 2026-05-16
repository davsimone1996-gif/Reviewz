-- ============================================================
-- Migration: Followed Artists + New Release Notifications
-- Run in the Supabase SQL Editor
-- ============================================================

-- ── 1. Allow actor_id to be nullable (for system notifications) ──
alter table public.notifications
  alter column actor_id drop not null;

-- ── 2. Add new_release type + metadata column ────────────────────
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
    check (type in ('follow', 'like', 'comment', 'new_release'));

alter table public.notifications
  add column if not exists metadata jsonb;

-- ── 3. followed_artists table ────────────────────────────────────
create table if not exists public.followed_artists (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  spotify_artist_id  text not null,
  artist_name        text not null,
  artist_image_url   text,
  last_release_id    text,
  last_release_title text,
  created_at         timestamptz not null default now(),
  constraint followed_artists_unique unique (user_id, spotify_artist_id)
);

alter table public.followed_artists enable row level security;

-- Users manage their own followed artists
create policy "Users can manage their own followed artists"
  on public.followed_artists for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Edge Function (service role) needs to read all rows to find new releases
-- Service role bypasses RLS automatically — no extra policy needed.

create index if not exists followed_artists_user_id_idx
  on public.followed_artists(user_id);

create index if not exists followed_artists_spotify_artist_id_idx
  on public.followed_artists(spotify_artist_id);
