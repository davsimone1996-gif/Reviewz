-- ============================================================
-- Migration: Push Notification Subscriptions
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. push_subscriptions table ─────────────────────────────
create table if not exists public.push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null,
  subscription jsonb not null,
  created_at   timestamptz not null default now(),
  constraint push_subscriptions_unique unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
  on public.push_subscriptions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- ── 2. pg_net extension (already enabled in Supabase) ───────
create extension if not exists pg_net;

-- ── 3. DB settings for the webhook call ─────────────────────
-- Replace the two values below with your real project data:
--   SUPABASE_URL  → Settings → API → Project URL
--   WEBHOOK_SECRET → any random string you also set in Edge Function secrets
--
-- Run once in SQL Editor:
--   alter database postgres
--     set app.edge_url    = 'https://<project-ref>.supabase.co/functions/v1';
--   alter database postgres
--     set app.webhook_secret = '<your-random-secret>';

-- ── 4. Trigger function that calls the Edge Function ────────
create or replace function public.trigger_send_push_notification()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url     := current_setting('app.edge_url') || '/send-push',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-webhook-secret', current_setting('app.webhook_secret')
    ),
    body    := row_to_json(NEW)::text
  );
  return NEW;
end;
$$;

-- ── 5. Attach trigger to notifications table ─────────────────
drop trigger if exists on_notification_send_push on public.notifications;

create trigger on_notification_send_push
  after insert on public.notifications
  for each row execute function public.trigger_send_push_notification();
