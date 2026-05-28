import { createClient } from '@supabase/supabase-js';

// استخدم متغيرات البيئة أولاً، وإلا استخدم القيم الافتراضية للمشروع الجديد
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://jkfhgslintpiogiorfyg.supabase.co';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SLkz-0xzXGFiXleD1fzSXA_GaXTteug9';

export const supabase = createClient(URL, ANON, { 
  auth: { autoRefreshToken: true, persistSession: true, storageKey: 'af_supabase_session' }, 
  realtime: { params: { eventsPerSecond: 10 } } 
});

export default supabase;