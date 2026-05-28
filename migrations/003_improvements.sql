-- ============================================================
-- autoflow — Migration 003: Security & Performance Improvements
-- Run AFTER 001_schema.sql and 002_devices.sql
-- ============================================================

-- ── Soft delete on orders ─────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted ON orders(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS to exclude soft-deleted orders
DROP POLICY IF EXISTS "tenant_orders_select" ON orders;
CREATE POLICY "tenant_orders_select" ON orders FOR SELECT
  USING (tenant_id = get_my_tenant_id() AND deleted_at IS NULL);

-- ── UNIQUE constraint on order_number per tenant ──────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_number ON orders(tenant_id, order_number);

-- ── Missing indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_total ON orders(total);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- ── RLS on previously unprotected tables ─────────────────────────────────────
ALTER TABLE registration_intents ENABLE ROW LEVEL SECURITY;
-- No public access — service_role only
CREATE POLICY IF NOT EXISTS "service_only_reg_intents" ON registration_intents
  FOR ALL USING (false);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_plans" ON plans
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "no_public_write_plans" ON plans
  FOR INSERT WITH CHECK (false);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_settings" ON platform_settings
  FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "no_public_write_settings" ON platform_settings
  FOR ALL USING (false);

-- ── Automation rules table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  trigger            TEXT NOT NULL DEFAULT 'order_created',
  condition_field    TEXT,
  condition_operator TEXT DEFAULT 'equals',
  condition_value    TEXT,
  action_type        TEXT NOT NULL DEFAULT 'set_carrier',
  action_value       TEXT,
  enabled            BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rules_tenant ON automation_rules(tenant_id);
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tenant_rules" ON automation_rules FOR ALL
  USING (tenant_id = get_my_tenant_id());

-- ── last_sync column for stores ───────────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS webhook_secret TEXT DEFAULT NULL;

-- ── Notification grouping (reference count) ───────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_key TEXT DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_count INT DEFAULT 1;

-- ── Supabase Realtime for automation_rules ────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE automation_rules;

-- ── pg_cron: cleanup expired registrations hourly ────────────────────────────
-- (requires pg_cron extension — enable in Supabase Dashboard → Extensions)
-- SELECT cron.schedule('cleanup-reg-intents', '0 * * * *', $$SELECT cleanup_expired_registrations()$$);

-- ── Analytics RPC for fast aggregates ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_tenant_analytics(p_tenant_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_orders',   COUNT(*),
    'delivered',      COUNT(*) FILTER (WHERE status = 'delivered'),
    'pending',        COUNT(*) FILTER (WHERE status = 'pending'),
    'cancelled',      COUNT(*) FILTER (WHERE status = 'cancelled'),
    'returned',       COUNT(*) FILTER (WHERE status = 'returned'),
    'revenue',        COALESCE(SUM(total) FILTER (WHERE status = 'delivered'), 0),
    'delivery_rate',  ROUND(
      COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1
    )
  ) INTO result
  FROM orders
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  RETURN result;
END;
$$;

-- ── Seed default automation rules for existing tenants ────────────────────────
INSERT INTO automation_rules (tenant_id, name, trigger, condition_field, condition_operator, condition_value, action_type, action_value, enabled)
SELECT id, 'Auto-assign Yalidine for Alger', 'order_created', 'wilaya', 'equals', 'Alger', 'set_carrier', 'Yalidine', true
FROM tenants ON CONFLICT DO NOTHING;

COMMENT ON TABLE automation_rules IS 'Per-tenant automation workflow rules';
COMMENT ON TABLE orders IS 'Orders with soft-delete support (deleted_at)';

-- ── تنظيف التسجيلات المنتهية كل ساعة (يتطلب pg_cron) ─────────────────────
-- قم بتفعيل pg_cron من Supabase Dashboard → Extensions أولاً
-- ثم شغّل هذا الأمر:
-- SELECT cron.schedule('cleanup-reg', '0 * * * *', $$
--   DELETE FROM registration_intents
--   WHERE (used = true OR otp_expires_at < NOW() - INTERVAL '1 hour')
--   AND created_at < NOW() - INTERVAL '2 hours';
-- $$);

-- حذف فوري للسجلات القديمة جداً (أكثر من 24 ساعة)
DELETE FROM registration_intents
WHERE created_at < NOW() - INTERVAL '24 hours';

CREATE INDEX IF NOT EXISTS idx_reg_expires ON registration_intents(otp_expires_at);
