import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Supabase config — loaded from environment variables ONLY ──────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL  || '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY || '';
const ANON_KEY      = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL)  console.error('[db] ⚠️  SUPABASE_URL not set in environment');
if (!SERVICE_KEY)   console.error('[db] ⚠️  SUPABASE_SERVICE_KEY not set in environment');

// Admin client — server only, bypasses RLS (service_role)
export const adminDb: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Public client — respects RLS (anon key)
export const publicDb: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export { SUPABASE_URL };
