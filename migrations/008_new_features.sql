-- ============================================================
-- autoflow — Migration 008: New Features
-- Push Notifications, 2FA, AI Routing, Automation Settings
-- ============================================================

-- ── Push Subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth_key     TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_push" ON push_subscriptions FOR ALL USING (user_id = auth.uid());

-- ── Two-Factor Authentication ─────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret     TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled    BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_verified   BOOLEAN DEFAULT FALSE;

-- ── Automation Settings (per tenant) ─────────────────────────────────────────
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS auto_generate_labels    BOOLEAN DEFAULT FALSE;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS auto_send_sms           BOOLEAN DEFAULT FALSE;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS auto_retry_failed       BOOLEAN DEFAULT FALSE;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS ai_routing_enabled      BOOLEAN DEFAULT FALSE;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS sms_provider            TEXT DEFAULT 'none';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS sms_api_key             TEXT DEFAULT NULL;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS sms_sender_id           TEXT DEFAULT 'autoflow';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS language                TEXT DEFAULT 'en';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS inactivity_timeout_min  INT DEFAULT 60;

-- ── AI Routing Log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_routing_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id      UUID,
  wilaya        TEXT NOT NULL,
  assigned_carrier TEXT NOT NULL,
  confidence    FLOAT DEFAULT 0,
  reason        TEXT,
  method        TEXT DEFAULT 'ai', -- 'ai' | 'rule' | 'manual'
  data          JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_log_tenant ON ai_routing_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_wilaya ON ai_routing_log(wilaya);
ALTER TABLE ai_routing_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_ai_log" ON ai_routing_log FOR ALL USING (tenant_id = get_my_tenant_id());

-- ── Carrier Configurations (per tenant) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS carrier_configs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  carrier     TEXT NOT NULL,
  enabled     BOOLEAN DEFAULT FALSE,
  api_key     TEXT,
  api_secret  TEXT,
  webhook_url TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, carrier)
);
ALTER TABLE carrier_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_carrier_configs" ON carrier_configs FOR ALL USING (tenant_id = get_my_tenant_id());

-- ── User Preferences (language, theme, etc.) ─────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language       TEXT DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url     TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone       TEXT DEFAULT 'Africa/Algiers';

-- ── Login Alerts Log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip         TEXT,
  browser    TEXT,
  os         TEXT,
  location   TEXT,
  is_new_device BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE login_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_alerts" ON login_alerts FOR ALL USING (user_id = auth.uid());

-- ── Realtime for push_subscriptions ──────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE carrier_configs;

COMMENT ON TABLE push_subscriptions IS 'Web Push VAPID subscriptions per user';
COMMENT ON TABLE ai_routing_log IS 'AI carrier assignment decisions log';
COMMENT ON TABLE carrier_configs IS 'Per-tenant carrier API credentials';
