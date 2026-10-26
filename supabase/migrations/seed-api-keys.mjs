// Script to seed API keys for development/testing
// Run with: node seed-api-keys.mjs
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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

// Generate a mock key hash (since real keys are only shown once on creation)
function generateKeyHash() {
  return crypto.createHash('sha256').update(crypto.randomUUID()).digest('hex');
}

async function seedApiKeys() {
  console.log('🔑 Seeding API Keys...\n');

  // 1. Get all active tenants
  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('status', 'active');

  if (tenantError) {
    console.error('❌ Failed to fetch tenants:', tenantError.message);
    return;
  }

  console.log(`Found ${tenants?.length || 0} active tenants\n`);

  // 2. Check existing API keys
  const { data: existingKeys } = await supabase
    .from('api_keys')
    .select('tenant_id, name');

  const existingSet = new Set(
    (existingKeys || []).map(k => `${k.tenant_id}:${k.name}`)
  );

  // 3. Seed API keys for each tenant
  for (const tenant of tenants || []) {
    console.log(`\n📦 Processing tenant: ${tenant.name} (${tenant.slug})`);

    const keysToCreate = [
      {
        tenant_id: tenant.id,
        name: 'Production API Key',
        description: 'Main production API key for live integrations',
        key_prefix: 'dk_live_',
        key_hash: generateKeyHash(),
        key_hint: 'PROD',
        key_type: 'live',
        environment: 'production',
        scopes: ['read', 'write'],
        rate_limit_per_minute: 100,
        rate_limit_per_hour: 2000,
        rate_limit_per_day: 20000,
        status: 'active'
      },
      {
        tenant_id: tenant.id,
        name: 'Test API Key',
        description: 'Sandbox key for testing integrations',
        key_prefix: 'dk_test_',
        key_hash: generateKeyHash(),
        key_hint: 'TEST',
        key_type: 'test',
        environment: 'development',
        scopes: ['read', 'write', 'delete'],
        rate_limit_per_minute: 30,
        rate_limit_per_hour: 500,
        rate_limit_per_day: 5000,
        status: 'active'
      },
      {
        tenant_id: tenant.id,
        name: 'Analytics Read-Only Key',
        description: 'Restricted read-only key for analytics dashboards',
        key_prefix: 'dk_ro_',
        key_hash: generateKeyHash(),
        key_hint: 'ANLZ',
        key_type: 'restricted',
        environment: 'production',
        scopes: ['read'],
        rate_limit_per_minute: 200,
        rate_limit_per_hour: 5000,
        rate_limit_per_day: 50000,
        status: 'active'
      }
    ];

    for (const keyData of keysToCreate) {
      const key = `${keyData.tenant_id}:${keyData.name}`;
      if (existingSet.has(key)) {
        console.log(`  ⏭️  Skipped (exists): ${keyData.name}`);
        continue;
      }

      const { error } = await supabase.from('api_keys').insert(keyData);
      if (error) {
        console.log(`  ❌ Failed: ${keyData.name} - ${error.message}`);
      } else {
        console.log(`  ✅ Created: ${keyData.name}`);
        existingSet.add(key);
      }
    }
  }

  // 4. Seed platform-wide API keys (tenant_id = null)
  console.log('\n🌐 Seeding platform-wide API keys...');

  const platformKeys = [
    {
      tenant_id: null,
      name: 'Platform Admin Key',
      description: 'Internal platform administration - full cross-tenant access',
      key_prefix: 'dk_admin_',
      key_hash: generateKeyHash(),
      key_hint: 'ADMN',
      key_type: 'live',
      environment: 'production',
      scopes: ['read', 'write', 'delete', 'admin'],
      rate_limit_per_minute: 500,
      rate_limit_per_hour: 10000,
      rate_limit_per_day: 100000,
      status: 'active'
    },
    {
      tenant_id: null,
      name: 'Platform Monitoring Key',
      description: 'Read-only key for monitoring and health checks',
      key_prefix: 'dk_mon_',
      key_hash: generateKeyHash(),
      key_hint: 'MNTR',
      key_type: 'restricted',
      environment: 'production',
      scopes: ['read'],
      rate_limit_per_minute: 1000,
      rate_limit_per_hour: 20000,
      rate_limit_per_day: 200000,
      status: 'active'
    }
  ];

  for (const keyData of platformKeys) {
    const { data: existing } = await supabase
      .from('api_keys')
      .select('id')
      .is('tenant_id', null)
      .eq('name', keyData.name)
      .single();

    if (existing) {
      console.log(`  ⏭️  Skipped (exists): ${keyData.name}`);
      continue;
    }

    const { error } = await supabase.from('api_keys').insert(keyData);
    if (error) {
      console.log(`  ❌ Failed: ${keyData.name} - ${error.message}`);
    } else {
      console.log(`  ✅ Created: ${keyData.name}`);
    }
  }

  // 5. Summary
  const { count } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total API keys in database: ${count}`);
  console.log('\n✨ API key seeding complete!');
  console.log('\nNote: These are seeded keys for development.');
  console.log('The actual key value is stored as a hash - only visible once on creation.');
}

seedApiKeys().catch(console.error);
