-- ============================================================
-- Migration 006: Enable Supabase Realtime
-- ============================================================

-- تفعيل Realtime على الجداول الأساسية
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE carrier_configs;

-- جدول للحضور الحي (من هو متصل؟)
CREATE TABLE IF NOT EXISTS presence_sessions (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  meta      JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_presence_tenant ON presence_sessions(tenant_id, last_seen DESC);
ALTER TABLE presence_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "own_presence" ON presence_sessions FOR ALL USING (user_id = auth.uid());

-- تنظيف الجلسات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_presence() RETURNS void LANGUAGE sql AS $$
  DELETE FROM presence_sessions WHERE last_seen < NOW() - INTERVAL '5 minutes';
$$;
