-- ============================================================
-- Migration 007: Admin Panel + Offer Requests
-- ============================================================

-- جدول طلبات العروض
CREATE TABLE IF NOT EXISTS offer_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  message     TEXT,
  status      TEXT DEFAULT 'pending',  -- pending | approved | rejected
  admin_note  TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE offer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_own_offers" ON offer_requests
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY IF NOT EXISTS "service_manage_offers" ON offer_requests
  FOR ALL USING (false);

-- جدول حظر المستخدمين
CREATE TABLE IF NOT EXISTS user_bans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL UNIQUE,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  banned_by   UUID,
  reason      TEXT,
  banned_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ
);
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "service_bans" ON user_bans FOR ALL USING (false);

-- جدول تذاكر الدعم
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT DEFAULT 'open',  -- open | in_progress | resolved | closed
  priority    TEXT DEFAULT 'medium',
  category    TEXT DEFAULT 'general',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "user_tickets" ON support_tickets
  FOR ALL USING (user_id = auth.uid());

-- إضافة suspend_at لـ profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes         TEXT;

-- إضافة admin role إذا لم يكن موجوداً
-- NOTE: نفّذ هذا يدوياً بعد إنشاء حساب admin@autoflow.dz
-- UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@autoflow.dz');

ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;

COMMENT ON TABLE offer_requests IS 'User requests for special plans/offers';
COMMENT ON TABLE user_bans IS 'Suspended/banned users';
