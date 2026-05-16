-- ============================================================
-- REVIEWZ – Setup Completo Database
-- Incolla tutto questo nel Supabase SQL Editor e clicca Run
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists pg_net;

-- ── TABLE: profiles ──────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null,
  bio              text,
  avatar_url       text,
  preferred_genres text[] not null default '{}',
  social_score     integer not null default 0,
  now_playing_title      text,
  now_playing_artist     text,
  now_playing_cover_url  text,
  now_playing_url        text,
  now_playing_updated_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── TABLE: posts ─────────────────────────────────────────────
create table if not exists public.posts (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  spotify_id     text not null,
  spotify_type   text not null check (spotify_type in ('track', 'album')),
  title          text not null,
  artist         text not null,
  cover_url      text,
  spotify_url    text not null,
  preview_url    text,
  review_text    text not null,
  rating         numeric(3,1) not null check (rating >= 1 and rating <= 10),
  likes_count    integer not null default 0,
  comments_count integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- ── TABLE: comments ──────────────────────────────────────────
create table if not exists public.comments (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  likes_count integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.comments enable row level security;

drop policy if exists "Comments are viewable by everyone" on public.comments;
create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);

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

drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.update_post_comments_count();

-- ── TABLE: likes ─────────────────────────────────────────────
create table if not exists public.likes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  constraint likes_unique_post    unique (user_id, post_id),
  constraint likes_unique_comment unique (user_id, comment_id)
);

alter table public.likes enable row level security;

drop policy if exists "Likes are viewable by everyone" on public.likes;
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

drop policy if exists "Authenticated users can like" on public.likes;
create policy "Authenticated users can like"
  on public.likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can unlike" on public.likes;
create policy "Users can unlike"
  on public.likes for delete using (auth.uid() = user_id);

create or replace function public.update_likes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.post_id is not null then
      update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
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

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.update_likes_count();

-- ── TABLE: follows ───────────────────────────────────────────
create table if not exists public.follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint follows_unique  unique (follower_id, following_id),
  constraint follows_no_self check  (follower_id <> following_id)
);

alter table public.follows enable row level security;

drop policy if exists "Follows are viewable by everyone" on public.follows;
create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

drop policy if exists "Authenticated users can follow" on public.follows;
create policy "Authenticated users can follow"
  on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

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

drop trigger if exists on_follow_change on public.follows;
create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.update_social_score_on_follow();

-- ── VIEW: profile_stats ───────────────────────────────────────
create or replace view public.profile_stats as
select
  p.id, p.username, p.bio, p.avatar_url, p.social_score, p.created_at,
  p.now_playing_title, p.now_playing_artist, p.now_playing_cover_url,
  p.now_playing_url, p.now_playing_updated_at,
  coalesce(f1.cnt, 0) as followers_count,
  coalesce(f2.cnt, 0) as following_count
from public.profiles p
left join (select following_id, count(*) as cnt from public.follows group by following_id) f1 on f1.following_id = p.id
left join (select follower_id,  count(*) as cnt from public.follows group by follower_id)  f2 on f2.follower_id  = p.id;

-- ── TABLE: notifications ──────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete cascade,
  type       text not null check (type in ('follow', 'like', 'comment', 'new_release')),
  post_id    uuid references public.posts(id) on delete cascade,
  metadata   jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications"
  on public.notifications for insert with check (true);

drop policy if exists "Users can mark their notifications as read" on public.notifications;
create policy "Users can mark their notifications as read"
  on public.notifications for update using (auth.uid() = user_id);

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (NEW.following_id, NEW.follower_id, 'follow');
  return NEW;
end;
$$;

drop trigger if exists on_follow_notify on public.follows;
create trigger on_follow_notify
  after insert on public.follows
  for each row execute function public.notify_on_follow();

create or replace function public.notify_on_like()
returns trigger language plpgsql security definer as $$
declare post_author uuid;
begin
  if NEW.post_id is null then return NEW; end if;
  select user_id into post_author from public.posts where id = NEW.post_id;
  if post_author = NEW.user_id then return NEW; end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (post_author, NEW.user_id, 'like', NEW.post_id);
  return NEW;
end;
$$;

drop trigger if exists on_like_notify on public.likes;
create trigger on_like_notify
  after insert on public.likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer as $$
declare post_author uuid;
begin
  select user_id into post_author from public.posts where id = NEW.post_id;
  if post_author = NEW.user_id then return NEW; end if;
  insert into public.notifications (user_id, actor_id, type, post_id)
  values (post_author, NEW.user_id, 'comment', NEW.post_id);
  return NEW;
end;
$$;

drop trigger if exists on_comment_notify on public.comments;
create trigger on_comment_notify
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ── TABLE: push_subscriptions ─────────────────────────────────
create table if not exists public.push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null,
  subscription jsonb not null,
  created_at   timestamptz not null default now(),
  constraint push_subscriptions_unique unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can manage their own push subscriptions" on public.push_subscriptions;
create policy "Users can manage their own push subscriptions"
  on public.push_subscriptions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.trigger_send_push_notification()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := current_setting('app.edge_url') || '/send-push',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', current_setting('app.webhook_secret')
    ),
    body    := row_to_json(NEW)::text
  );
  return NEW;
end;
$$;

drop trigger if exists on_notification_send_push on public.notifications;
create trigger on_notification_send_push
  after insert on public.notifications
  for each row execute function public.trigger_send_push_notification();

-- ── TABLE: followed_artists ───────────────────────────────────
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

drop policy if exists "Users can manage their own followed artists" on public.followed_artists;
create policy "Users can manage their own followed artists"
  on public.followed_artists for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── INDEXES ───────────────────────────────────────────────────
create index if not exists posts_user_id_idx              on public.posts(user_id);
create index if not exists posts_created_at_idx           on public.posts(created_at desc);
create index if not exists comments_post_id_idx           on public.comments(post_id);
create index if not exists likes_post_id_idx              on public.likes(post_id);
create index if not exists likes_comment_id_idx           on public.likes(comment_id);
create index if not exists follows_follower_id_idx        on public.follows(follower_id);
create index if not exists follows_following_id_idx       on public.follows(following_id);
create index if not exists notifications_user_id_idx      on public.notifications(user_id);
create index if not exists notifications_created_at_idx   on public.notifications(created_at desc);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists followed_artists_user_id_idx   on public.followed_artists(user_id);
create index if not exists followed_artists_artist_id_idx on public.followed_artists(spotify_artist_id);

-- ── STORAGE: avatars bucket ───────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

-- ── CONFIGURAZIONE EDGE FUNCTION ─────────────────────────────
-- Sostituisci i valori e de-commenta le due righe qui sotto:
-- alter database postgres set app.edge_url = 'https://tulptlzmskjuzuoztpvf.supabase.co/functions/v1';
-- alter database postgres set app.webhook_secret = 'la-tua-stringa-segreta';
