-- ============================================================
-- Migration 005: Automation Rules (كاملة)
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_rules (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  trigger_event      TEXT NOT NULL DEFAULT 'order_created',
  condition_field    TEXT,
  condition_operator TEXT DEFAULT 'equals',
  condition_value    TEXT,
  action_type        TEXT NOT NULL,
  action_value       TEXT,
  action_metadata    JSONB DEFAULT '{}',
  is_active          BOOLEAN DEFAULT TRUE,
  priority           INT DEFAULT 0,
  run_count          INT DEFAULT 0,
  last_run_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_tenant_active ON automation_rules(tenant_id, is_active, priority);
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tenant_automation_rules" ON automation_rules
  FOR ALL USING (tenant_id = get_my_tenant_id());

DO $$ BEGIN
  CREATE TRIGGER rules_updated_at BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END; $$;

-- Store sync config
CREATE TABLE IF NOT EXISTS store_sync_configs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sync_interval_minutes INT DEFAULT 15,
  last_sync_at     TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'never',
  last_order_synced TEXT,
  total_synced     INT DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_sync_store ON store_sync_configs(store_id);
ALTER TABLE store_sync_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tenant_sync" ON store_sync_configs FOR ALL USING (tenant_id = get_my_tenant_id());

-- إضافة external_order_id للـ orders لتجنب التكرار
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_store_id UUID REFERENCES stores(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_external ON orders(tenant_id, external_order_id)
  WHERE external_order_id IS NOT NULL;

COMMENT ON TABLE automation_rules IS 'Real-time automation rules evaluated on order events';
