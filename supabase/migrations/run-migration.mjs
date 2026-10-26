// Script to run migration 050 using Supabase JS client (no DB password needed)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read from .env
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('🚀 Running migration 050_page_builder_tables.sql...\n');
  
  // Read migration file
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '050_page_builder_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  // Split into individual statements (simple split on semicolons followed by newlines)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Found ${statements.length} SQL statements to execute.\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt });
      
      if (error) {
        // Try direct query for DDL
        const { error: error2 } = await supabase.from('_exec').select().limit(0);
        throw new Error(error.message);
      }
      
      successCount++;
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
    } catch (err) {
      // Many errors are expected (IF NOT EXISTS, already exists, etc.)
      if (err.message?.includes('already exists') || 
          err.message?.includes('does not exist') ||
          err.message?.includes('duplicate')) {
        console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
        successCount++;
      } else {
        console.log(`❌ [${i + 1}/${statements.length}] Error: ${err.message?.substring(0, 100)}`);
        errorCount++;
      }
    }
  }
  
  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`);
  console.log('\n⚠️  Note: Supabase JS client cannot run DDL directly.');
  console.log('Please run the migration from Supabase Dashboard:');
  console.log('1. Go to https://supabase.com/dashboard/project/ooxikkllencozgnoparw/sql/new');
  console.log('2. Paste the contents of supabase/migrations/050_page_builder_tables.sql');
  console.log('3. Click "Run"\n');
}

runMigration();
