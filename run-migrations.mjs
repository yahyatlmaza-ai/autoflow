/**
 * run-migrations.mjs
 * شغّل هذا الملف مرة واحدة لإنشاء كل الجداول في Supabase
 * node run-migrations.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// مشروع Supabase الجديد + service_role key
const SUPABASE_URL = 'https://jkfhgslintpiogiorfyg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZmhnc2xpbnRwaW9naW9yZnlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI5MTUzMywiZXhwIjoyMDk0ODY3NTMzfQ.8-dD-KgZQvDCC85qD5pboSFItsIFY3WmESf5DLxa4C4';

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('🔌 Connecting to Supabase...');

// Test connection
const { error: pingErr } = await db.from('profiles').select('id').limit(1);
if (pingErr && !pingErr.message.includes('does not exist')) {
  console.error('❌ Connection failed:', pingErr.message);
  process.exit(1);
}
console.log('✅ Connected!');

// Run SQL migrations
const sql = readFileSync('./migrations/001_schema.sql', 'utf8');
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 10 && !s.startsWith('--'));

console.log(`📋 Running ${statements.length} SQL statements...`);

let ok = 0, failed = 0;
for (const stmt of statements) {
  try {
    const { error } = await db.rpc('exec_sql', { sql: stmt + ';' }).single();
    if (error) throw error;
    ok++;
  } catch (e) {
    failed++;
  }
}

console.log(`✅ Done! ${ok} succeeded, ${failed} skipped`);
console.log('🎉 Database ready! You can now deploy the project.');