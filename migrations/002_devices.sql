-- ============================================================
-- autoflow — Migration 002: Device Tracking & Security
-- Run in Supabase SQL Editor AFTER 001_schema.sql
-- ============================================================

-- ── DEVICE SESSIONS ──────────────────────────────────────────
create table if not exists device_sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  fingerprint  text not null,
  browser      text,
  os           text,
  ip           text,
  user_agent   text,
  active       boolean default true,
  last_login   timestamptz default now(),
  created_at   timestamptz default now()
);
create index if not exists idx_ds_user        on device_sessions(user_id);
create index if not exists idx_ds_fingerprint on device_sessions(fingerprint);

-- ── DEVICE BANS ──────────────────────────────────────────────
create table if not exists device_bans (
  id          uuid primary key default uuid_generate_v4(),
  fingerprint text unique not null,
  reason      text,
  banned_by   uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists idx_db_fingerprint on device_bans(fingerprint);

-- ── USER BANS (separate from Supabase auth status) ───────────
create table if not exists user_bans (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid unique not null references auth.users(id) on delete cascade,
  reason     text,
  banned_by  uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ── OFFER REQUESTS ───────────────────────────────────────────
create table if not exists offer_requests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan        text not null,
  amount      numeric(12,2),
  currency    text default 'DZD',
  status      text default 'pending',
  notes       text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);
create index if not exists idx_or_user on offer_requests(user_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table device_sessions enable row level security;
alter table device_bans     enable row level security;
alter table user_bans       enable row level security;
alter table offer_requests  enable row level security;

-- Device sessions: own only
create policy "own_device_sessions" on device_sessions for all
  using (user_id = auth.uid());

-- Device bans: public read (for checking during login)
create policy "read_device_bans" on device_bans for select
  using (true);

-- User bans: admin only via service_role (server bypasses RLS)
create policy "own_ban_check" on user_bans for select
  using (user_id = auth.uid());

-- Offer requests: own
create policy "own_offer_requests" on offer_requests for all
  using (user_id = auth.uid());

-- ── REALTIME ─────────────────────────────────────────────────
alter publication supabase_realtime add table offer_requests;

-- ── FUNCTION: Check device ban ────────────────────────────────
create or replace function is_device_banned(fp text)
returns boolean language sql security definer stable as $$
  select exists(select 1 from device_bans where fingerprint = fp)
$$;

-- ── FUNCTION: Count active devices for user ───────────────────
create or replace function count_user_devices(uid uuid)
returns int language sql security definer stable as $$
  select count(*)::int from device_sessions
  where user_id = uid and active = true
$$;
