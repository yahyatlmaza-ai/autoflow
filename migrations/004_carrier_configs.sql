-- ============================================================
-- Migration 004: Carrier Configurations (حقيقية)
-- ============================================================

-- جدول إعدادات شركات النقل
CREATE TABLE IF NOT EXISTS carrier_configs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  carrier_name  TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT FALSE,
  is_default    BOOLEAN DEFAULT FALSE,
  credentials   JSONB NOT NULL DEFAULT '{}',  -- مشفرة
  webhook_secret TEXT,
  last_tested_at TIMESTAMPTZ,
  test_status   TEXT DEFAULT 'untested',  -- connected | failed | untested
  test_message  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, carrier_name)
);

CREATE INDEX IF NOT EXISTS idx_carrier_configs_tenant ON carrier_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_carrier_configs_active ON carrier_configs(tenant_id, is_active);

ALTER TABLE carrier_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tenant_carrier_configs" ON carrier_configs
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- جدول سجلات API للناقلين
CREATE TABLE IF NOT EXISTS carrier_api_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  carrier     TEXT NOT NULL,
  action      TEXT NOT NULL,  -- submit | track | cancel | test
  request     JSONB,
  response    JSONB,
  status_code INT,
  success     BOOLEAN,
  error_msg   TEXT,
  duration_ms INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_carrier_logs_tenant ON carrier_api_logs(tenant_id, created_at DESC);
ALTER TABLE carrier_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tenant_carrier_logs" ON carrier_api_logs
  FOR SELECT USING (tenant_id = get_my_tenant_id());

-- جدول محاولات الإرسال (retry logic)
CREATE TABLE IF NOT EXISTS carrier_submit_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier     TEXT NOT NULL,
  attempts    INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_error  TEXT,
  status      TEXT DEFAULT 'pending',  -- pending | success | failed | abandoned
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submit_queue_pending ON carrier_submit_queue(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');
ALTER TABLE carrier_submit_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tenant_submit_queue" ON carrier_submit_queue
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- إضافة tracking_number و external_id للـ orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_carrier_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS submitted_to_carrier_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_response JSONB;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$ BEGIN
  CREATE TRIGGER carrier_configs_updated_at BEFORE UPDATE ON carrier_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

COMMENT ON TABLE carrier_configs IS 'Encrypted carrier API credentials per tenant';
