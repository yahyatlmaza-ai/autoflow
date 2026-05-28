-- ============================================================
-- OctoPlus / auto Flow — Complete Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Drop & recreate (idempotent) ─────────────────────────────────────────────
drop table if exists activity_logs cascade;
drop table if exists order_status_history cascade;
drop table if exists notifications cascade;
drop table if exists customers cascade;
drop table if exists stores cascade;
drop table if exists orders cascade;
drop table if exists subscriptions cascade;
drop table if exists plans cascade;
drop table if exists profiles cascade;
drop table if exists tenants cascade;
drop table if exists registration_intents cascade;
drop table if exists otp_codes cascade;
drop table if exists platform_settings cascade;

-- ── TENANTS ──────────────────────────────────────────────────────────────────
create table tenants (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  plan        text not null default 'trial',
  trial_end   timestamptz not null default (now() + interval '10 days'),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── PROFILES ─────────────────────────────────────────────────────────────────
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  tenant_id       uuid references tenants(id) on delete cascade,
  full_name       text,
  phone           text,
  company         text,
  wilaya          text,
  role            text not null default 'owner',
  auto_forward    boolean not null default false,
  onboarding_complete boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_profiles_tenant on profiles(tenant_id);

-- ── PLANS ────────────────────────────────────────────────────────────────────
create table plans (
  id            uuid primary key default uuid_generate_v4(),
  plan_key      text unique not null,
  name          text not null,
  price         numeric(12,2),
  amount        numeric(12,2),
  currency      text default 'DZD',
  orders_limit  int default -1,
  stores_limit  int default -1,
  features      jsonb,
  active        boolean default true,
  recommended   boolean default false,
  created_at    timestamptz default now()
);

insert into plans (plan_key, name, price, amount, currency, orders_limit, stores_limit, features, recommended) values
  ('basic',        'Basic',        20000, 20000, 'DZD', 2000, 5,  '["2,000 orders/mo","5 stores","All Algerian carriers","Analytics","CSV export","Email support"]', false),
  ('professional', 'Professional', 30000, 30000, 'DZD', -1,   -1, '["Unlimited orders","Unlimited stores","All carriers + API","Advanced analytics","COD management","Returns handling","Automation engine","Priority support"]', true),
  ('enterprise',   'Enterprise',   null,  null,  'DZD', -1,   -1, '["Custom limits","Dedicated infra","SLA guarantee","White-label","Dedicated manager","Custom integrations","On-site training"]', false);

-- ── ORDERS ───────────────────────────────────────────────────────────────────
create table orders (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  order_number     text not null,
  customer_name    text,
  customer_phone   text,
  customer_address text,
  wilaya           text,
  product_name     text,
  quantity         int default 1,
  total            numeric(12,2) default 0,
  shipping_cost    numeric(12,2) default 0,
  payment_method   text default 'COD',
  status           text not null default 'pending',
  carrier          text,
  tracking_number  text,
  store_id         uuid,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_orders_tenant      on orders(tenant_id);
create index idx_orders_status      on orders(status);
create index idx_orders_created_at  on orders(created_at desc);
create index idx_orders_carrier     on orders(carrier);
create index idx_orders_wilaya      on orders(wilaya);

-- ── ORDER STATUS HISTORY ─────────────────────────────────────────────────────
create table order_status_history (
  id         uuid primary key default uuid_generate_v4(),
  order_id   uuid not null references orders(id) on delete cascade,
  status     text not null,
  note       text,
  created_at timestamptz default now()
);
create index idx_osh_order on order_status_history(order_id);

-- ── STORES ───────────────────────────────────────────────────────────────────
create table stores (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  platform     text,
  url          text,
  webhook_url  text,
  active       boolean default true,
  orders_count int default 0,
  created_at   timestamptz default now()
);
create index idx_stores_tenant on stores(tenant_id);

-- ── CUSTOMERS ────────────────────────────────────────────────────────────────
create table customers (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  phone           text,
  email           text,
  wilaya          text,
  total_orders    int default 0,
  total_spent     numeric(12,2) default 0,
  last_order_date timestamptz,
  created_at      timestamptz default now()
);
create index idx_customers_tenant on customers(tenant_id);
create index idx_customers_phone  on customers(tenant_id, phone);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  message    text,
  type       text default 'system',
  read       boolean default false,
  order_id   uuid references orders(id) on delete set null,
  created_at timestamptz default now()
);
create index idx_notif_user    on notifications(user_id);
create index idx_notif_unread  on notifications(user_id, read) where read = false;

-- ── ACTIVITY LOGS ─────────────────────────────────────────────────────────────
create table activity_logs (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete set null,
  tenant_id  uuid references tenants(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  text,
  metadata   jsonb,
  ip_address text,
  created_at timestamptz default now()
);
create index idx_logs_user   on activity_logs(user_id);
create index idx_logs_tenant on activity_logs(tenant_id);
create index idx_logs_time   on activity_logs(created_at desc);

-- ── REGISTRATION INTENTS (OTP flow) ──────────────────────────────────────────
create table registration_intents (
  id               uuid primary key default uuid_generate_v4(),
  registration_id  text unique not null,
  email            text unique not null,
  password_hash    text not null,  -- stored temporarily, cleared after verification
  name             text,
  phone            text,
  company          text,
  fingerprint      text,
  otp_code         text not null,
  otp_expires_at   timestamptz not null,
  attempts         int default 0,
  used             boolean default false,
  created_at       timestamptz default now()
);
-- Auto-delete expired registration intents after 1 hour
create index idx_reg_intents_email on registration_intents(email);
create index idx_reg_intents_id    on registration_intents(registration_id);

-- ── PLATFORM SETTINGS ────────────────────────────────────────────────────────
create table platform_settings (
  id                     text primary key default 'global',
  platform_name          text default 'auto Flow',
  platform_tagline       text default 'Algeria''s #1 Logistics Platform',
  platform_logo_url      text,
  platform_primary_color text default '#6366f1',
  support_whatsapp       text default '213794157508',
  support_email          text,
  currency               text default 'DZD',
  auto_forward_global    text default 'false',
  updated_at             timestamptz default now()
);
insert into platform_settings (id) values ('global') on conflict do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

alter table orders           enable row level security;
alter table order_status_history enable row level security;
alter table stores           enable row level security;
alter table customers        enable row level security;
alter table notifications    enable row level security;
alter table activity_logs    enable row level security;
alter table profiles         enable row level security;
alter table tenants          enable row level security;

-- Helper function: get caller's tenant_id
create or replace function get_my_tenant_id()
returns uuid language sql security definer stable as $$
  select tenant_id from profiles where id = auth.uid() limit 1
$$;

-- Orders: users see only their tenant's orders
create policy "tenant_orders_select" on orders for select
  using (tenant_id = get_my_tenant_id());
create policy "tenant_orders_insert" on orders for insert
  with check (tenant_id = get_my_tenant_id());
create policy "tenant_orders_update" on orders for update
  using (tenant_id = get_my_tenant_id());
create policy "tenant_orders_delete" on orders for delete
  using (tenant_id = get_my_tenant_id());

-- Order status history: via orders tenant
create policy "tenant_osh" on order_status_history for all
  using (order_id in (select id from orders where tenant_id = get_my_tenant_id()));

-- Stores: tenant-scoped
create policy "tenant_stores" on stores for all
  using (tenant_id = get_my_tenant_id());

-- Customers: tenant-scoped
create policy "tenant_customers" on customers for all
  using (tenant_id = get_my_tenant_id());

-- Notifications: user-scoped
create policy "own_notifications" on notifications for all
  using (user_id = auth.uid());

-- Activity logs: user or tenant scoped
create policy "own_logs" on activity_logs for select
  using (user_id = auth.uid() or tenant_id = get_my_tenant_id());
create policy "own_logs_insert" on activity_logs for insert
  with check (user_id = auth.uid());

-- Profiles: own profile only
create policy "own_profile" on profiles for all
  using (id = auth.uid());

-- Tenants: own tenant only
create policy "own_tenant" on tenants for select
  using (id = get_my_tenant_id());
create policy "own_tenant_update" on tenants for update
  using (id = get_my_tenant_id());

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME SUBSCRIPTIONS
-- Enable for tables that need live updates
-- ═══════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table activity_logs;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at   before update on orders   for each row execute function update_updated_at();
create trigger tenants_updated_at  before update on tenants  for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();

-- Auto-insert initial status history when order is created
create or replace function on_order_created()
returns trigger language plpgsql as $$
begin
  insert into order_status_history (order_id, status, note)
  values (new.id, new.status, 'Order created');
  return new;
end;
$$;
create trigger order_created_history
  after insert on orders
  for each row execute function on_order_created();

-- Auto-insert status history when order status changes
create or replace function on_order_status_change()
returns trigger language plpgsql as $$
begin
  if new.status <> old.status then
    insert into order_status_history (order_id, status, note)
    values (new.id, new.status, 'Status updated');
  end if;
  return new;
end;
$$;
create trigger order_status_change_history
  after update on orders
  for each row when (old.status is distinct from new.status)
  execute function on_order_status_change();

-- Cleanup expired registration intents (called periodically)
create or replace function cleanup_expired_registrations()
returns void language plpgsql as $$
begin
  delete from registration_intents
  where otp_expires_at < now() - interval '1 hour';
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA (demo/test only — remove in production)
-- ═══════════════════════════════════════════════════════════════════════════

-- Seed platform settings
update platform_settings set
  platform_name = 'auto Flow',
  platform_tagline = 'Algeria''s #1 Logistics Platform',
  support_whatsapp = '213794157508',
  currency = 'DZD',
  platform_primary_color = '#6366f1'
where id = 'global';
