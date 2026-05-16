-- ============================================================
-- REVIEWZ – Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLE: profiles
-- Extends Supabase auth.users with public profile data
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  bio              text,
  avatar_url       text,
  preferred_genres text[] not null default '{}',
  social_score     integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- TABLE: posts
-- Music reviews created by users
-- ────────────────────────────────────────────────────────────
create table public.posts (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  -- Spotify data
  spotify_id       text not null,
  spotify_type     text not null check (spotify_type in ('track', 'album')),
  title            text not null,
  artist           text not null,
  cover_url        text,
  spotify_url      text not null,
  preview_url      text,
  -- Review data
  review_text      text not null,
  rating           numeric(3,1) not null check (rating >= 1 and rating <= 10),
  -- Counters (denormalized for performance)
  likes_count      integer not null default 0,
  comments_count   integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- TABLE: comments
-- ────────────────────────────────────────────────────────────
create table public.comments (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  content      text not null,
  likes_count  integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- Update post comment count on insert/delete
create or replace function public.update_post_comments_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set comments_count = greatest(0, comments_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.update_post_comments_count();

-- ────────────────────────────────────────────────────────────
-- TABLE: likes
-- Likes on posts; unique per user/post
-- ────────────────────────────────────────────────────────────
create table public.likes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Must like exactly one of post or comment
  constraint likes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  constraint likes_unique_post    unique (user_id, post_id),
  constraint likes_unique_comment unique (user_id, comment_id)
);

alter table public.likes enable row level security;

create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

create policy "Authenticated users can like"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

-- Update post/comment like counts and social score on like
create or replace function public.update_likes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.post_id is not null then
      update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
      -- Award social score to post author
      update public.profiles set social_score = social_score + 2
        where id = (select user_id from public.posts where id = NEW.post_id);
    elsif NEW.comment_id is not null then
      update public.comments set likes_count = likes_count + 1 where id = NEW.comment_id;
      update public.profiles set social_score = social_score + 1
        where id = (select user_id from public.comments where id = NEW.comment_id);
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.post_id is not null then
      update public.posts set likes_count = greatest(0, likes_count - 1) where id = OLD.post_id;
      update public.profiles set social_score = greatest(0, social_score - 2)
        where id = (select user_id from public.posts where id = OLD.post_id);
    elsif OLD.comment_id is not null then
      update public.comments set likes_count = greatest(0, likes_count - 1) where id = OLD.comment_id;
      update public.profiles set social_score = greatest(0, social_score - 1)
        where id = (select user_id from public.comments where id = OLD.comment_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.update_likes_count();

-- ────────────────────────────────────────────────────────────
-- TABLE: follows
-- Follower/following relationships
-- ────────────────────────────────────────────────────────────
create table public.follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint follows_unique unique (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Authenticated users can follow"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- Award social score on follow
create or replace function public.update_social_score_on_follow()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set social_score = social_score + 5 where id = NEW.following_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set social_score = greatest(0, social_score - 5) where id = OLD.following_id;
  end if;
  return null;
end;
$$;

create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.update_social_score_on_follow();

-- ────────────────────────────────────────────────────────────
-- VIEWS: follower/following counts per profile
-- ────────────────────────────────────────────────────────────
create or replace view public.profile_stats as
select
  p.id,
  p.username,
  p.bio,
  p.avatar_url,
  p.social_score,
  p.created_at,
  coalesce(f1.cnt, 0) as followers_count,
  coalesce(f2.cnt, 0) as following_count
from public.profiles p
left join (select following_id, count(*) as cnt from public.follows group by following_id) f1 on f1.following_id = p.id
left join (select follower_id,  count(*) as cnt from public.follows group by follower_id)  f2 on f2.follower_id  = p.id;

-- ────────────────────────────────────────────────────────────
-- MIGRATION: Now Playing columns on profiles
-- Run this if the DB already exists (skip on fresh install)
-- ────────────────────────────────────────────────────────────
-- ── Migration: run on existing databases ───────────────────────────
alter table public.profiles
  add column if not exists preferred_genres text[] not null default '{}';

alter table public.profiles
  add column if not exists now_playing_title     text,
  add column if not exists now_playing_artist    text,
  add column if not exists now_playing_cover_url text,
  add column if not exists now_playing_url       text,
  add column if not exists now_playing_updated_at timestamptz;

-- ────────────────────────────────────────────────────────────
-- TABLE: notifications
-- ────────────────────────────────────────────────────────────
create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,   -- recipient
  actor_id   uuid not null references public.profiles(id) on delete cascade,   -- who triggered it
  type       text not null check (type in ('follow', 'like', 'comment')),
  post_id    uuid references public.posts(id) on delete cascade,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "System can insert notifications"
  on public.notifications for insert with check (true);

create policy "Users can mark their notifications as read"
  on public.notifications for update using (auth.uid() = user_id);

-- Trigger: notify on follow
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (NEW.following_id, NEW.follower_id, 'follow');
  return NEW;
end;
$$;

create trigger on_follow_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- Trigger: notify on like (post only)
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer as $$
declare
  post_author uuid;
begin
  if NEW.post_id is null then return NEW; end if;
  select user_id into post_author from public.posts where id = NEW.post_id;
  -- Don't notify yourself
  if post_author = NEW.user_id then return NEW; end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (post_author, NEW.user_id, 'like', NEW.post_id);
  return NEW;
end;
$$;

create trigger on_like_notify
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- Trigger: notify on comment
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer as $$
declare
  post_author uuid;
begin
  select user_id into post_author from public.posts where id = NEW.post_id;
  -- Don't notify yourself
  if post_author = NEW.user_id then return NEW; end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (post_author, NEW.user_id, 'comment', NEW.post_id);
  return NEW;
end;
$$;

create trigger on_comment_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
create index posts_user_id_idx              on public.posts(user_id);
create index posts_created_at_idx           on public.posts(created_at desc);
create index comments_post_id_idx           on public.comments(post_id);
create index likes_post_id_idx              on public.likes(post_id);
create index likes_comment_id_idx           on public.likes(comment_id);
create index follows_follower_id_idx        on public.follows(follower_id);
create index follows_following_id_idx       on public.follows(following_id);
create index notifications_user_id_idx      on public.notifications(user_id);
create index notifications_created_at_idx   on public.notifications(created_at desc);

-- ────────────────────────────────────────────────────────────
-- STORAGE: avatars bucket
-- Run this in the Supabase SQL Editor after creating the
-- bucket named "avatars" (public) in the Storage dashboard
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to overwrite their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view avatars (public bucket)
create policy "Avatars are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
