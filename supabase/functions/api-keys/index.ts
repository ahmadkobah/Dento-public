// supabase/functions/api-keys/index.ts
// Edge function for API key management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

// Generate a cryptographically secure API key
function generateApiKey(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(randomBytes[i] % chars.length);
  }
  return key;
}

// Hash the API key
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    // Check developer or admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['developer', 'admin'].includes(profile.role)) {
      throw new Error('Only developers and admins can manage API keys');
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET requests
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      const id = url.searchParams.get('id');
      const keyId = url.searchParams.get('key_id');

      if (type === 'usage' && keyId) {
        // Get usage stats for an API key
        const period = url.searchParams.get('period') || '30d';
        const days = parseInt(period.replace('d', '')) || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: usage, error } = await supabase
          .from('api_key_usage')
          .select('endpoint, method, status_code, response_time_ms, created_at')
          .eq('api_key_id', keyId)
          .gte('created_at', since)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Aggregate stats
        const totalRequests = usage?.length || 0;
        const successRequests = usage?.filter(u => u.status_code && u.status_code < 400).length || 0;
        const errorRequests = usage?.filter(u => u.status_code && u.status_code >= 400).length || 0;
        const avgResponseTime = usage?.length 
          ? Math.round(usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / usage.length)
          : 0;

        // Group by endpoint
        const byEndpoint: Record<string, number> = {};
        usage?.forEach(u => {
          byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] || 0) + 1;
        });

        // Group by day
        const byDay: Record<string, number> = {};
        usage?.forEach(u => {
          const day = u.created_at.split('T')[0];
          byDay[day] = (byDay[day] || 0) + 1;
        });

        return new Response(JSON.stringify({
          usage: {
            totalRequests,
            successRequests,
            errorRequests,
            successRate: totalRequests ? Math.round((successRequests / totalRequests) * 100) : 0,
            avgResponseTime,
            byEndpoint: Object.entries(byEndpoint).map(([endpoint, count]) => ({ endpoint, count })),
            byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (type === 'api_definitions') {
        // Get all API definitions with categories
        const { data: apis, error: apisError } = await supabase
          .from('api_definitions')
          .select('*')
          .eq('is_active', true)
          .order('category, display_order');

        if (apisError) throw apisError;

        const { data: categories, error: catError } = await supabase
          .from('api_categories')
          .select('*')
          .order('display_order');

        if (catError) throw catError;

        // Group APIs by category
        const byCategory: Record<string, any> = {};
        categories?.forEach(cat => {
          byCategory[cat.name] = {
            ...cat,
            apis: apis?.filter(api => api.category === cat.name) || []
          };
        });

        return new Response(JSON.stringify({ apis, categories, byCategory }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (id) {
        // Get single API key with tenant isolation check
        const { data: apiKey, error } = await supabase
          .from('api_keys')
          .select(`
            id, tenant_id, name, description, key_prefix, key_hint,
            key_type, environment, scopes, allowed_ips, allowed_origins,
            rate_limit_per_minute, rate_limit_per_hour, rate_limit_per_day,
            total_requests, last_used_at, last_used_ip,
            status, expires_at, created_at, updated_at,
            tenants (id, name, slug)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        // Issue #10: Verify tenant access for non-admin users
        if (profile.role !== 'admin' && apiKey) {
          const { data: hasAccess } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('tenant_id', apiKey.tenant_id)
            .eq('is_active', true)
            .single();
          
          if (!hasAccess) {
            throw new Error('Access denied to this API key');
          }
        }
        
        return new Response(JSON.stringify({ apiKey }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List API keys
      const tenantId = url.searchParams.get('tenant_id');
      const status = url.searchParams.get('status');
      const keyType = url.searchParams.get('key_type');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      // Issue #10: Get developer's accessible tenants for isolation
      // Admins can see all, developers only see their assigned tenants
      let accessibleTenantIds: string[] | null = null;
      if (profile.role !== 'admin') {
        const { data: tenantAccess } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        accessibleTenantIds = tenantAccess?.map(t => t.tenant_id) || [];
        
        // If developer has no tenant access, return empty
        if (accessibleTenantIds.length === 0) {
          return new Response(JSON.stringify({ apiKeys: [], total: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      let query = supabase
        .from('api_keys')
        .select(`
          id, tenant_id, name, description, key_prefix, key_hint,
          key_type, environment, scopes, status, expires_at,
          total_requests, last_used_at, created_at,
          tenants (id, name, slug)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply tenant isolation for non-admin developers
      if (accessibleTenantIds) {
        if (tenantId) {
          // Verify requested tenant is accessible
          if (!accessibleTenantIds.includes(tenantId)) {
            throw new Error('Access denied to this tenant');
          }
          query = query.eq('tenant_id', tenantId);
        } else {
          // Filter to only accessible tenants
          query = query.in('tenant_id', accessibleTenantIds);
        }
      } else if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      if (status) query = query.eq('status', status);
      if (keyType) query = query.eq('key_type', keyType);

      const { data: apiKeys, error, count } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ apiKeys, total: count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create API key or regenerate
    if (method === 'POST') {
      const body = await req.json();

      if (body.action === 'regenerate') {
        // Regenerate API key
        const { id } = body;
        
        const { data: existing } = await supabase
          .from('api_keys')
          .select('key_type, environment')
          .eq('id', id)
          .single();

        if (!existing) throw new Error('API key not found');

        const prefix = `dk_${existing.key_type === 'test' ? 'test' : 'live'}_`;
        const newKey = generateApiKey(prefix);
        const keyHash = await hashKey(newKey);

        const { data: apiKey, error } = await supabase
          .from('api_keys')
          .update({
            key_hash: keyHash,
            key_hint: newKey.slice(-4),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        await supabase.from('saas_audit_trail').insert({
          tenant_id: apiKey.tenant_id,
          actor_id: user.id,
          action: 'api_key.regenerated',
          resource_type: 'api_key',
          resource_id: id,
        });

        // Return the full key only on regeneration (won't be stored)
        return new Response(JSON.stringify({ 
          apiKey,
          key: newKey, // Full key - only returned once
          warning: 'Store this key securely. It will not be shown again.'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create new API key
      const prefix = `dk_${body.key_type === 'test' ? 'test' : 'live'}_`;
      const newKey = generateApiKey(prefix);
      const keyHash = await hashKey(newKey);

      const { data: apiKey, error } = await supabase
        .from('api_keys')
        .insert({
          tenant_id: body.tenant_id,
          name: body.name,
          description: body.description,
          key_prefix: prefix,
          key_hash: keyHash,
          key_hint: newKey.slice(-4),
          key_type: body.key_type || 'live',
          environment: body.environment || 'production',
          scopes: body.scopes || ['read'],
          allowed_ips: body.allowed_ips,
          allowed_origins: body.allowed_origins,
          rate_limit_per_minute: body.rate_limit_per_minute || 60,
          rate_limit_per_hour: body.rate_limit_per_hour || 1000,
          rate_limit_per_day: body.rate_limit_per_day || 10000,
          expires_at: body.expires_at,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: body.tenant_id,
        actor_id: user.id,
        action: 'api_key.created',
        resource_type: 'api_key',
        resource_id: apiKey.id,
        new_values: { name: body.name, scopes: body.scopes },
      });

      // Return the full key only on creation (won't be stored)
      return new Response(JSON.stringify({ 
        apiKey,
        key: newKey, // Full key - only returned once
        warning: 'Store this key securely. It will not be shown again.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // PUT - Update API key
    if (method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) throw new Error('API key ID required');

      // Don't allow updating sensitive fields
      delete updates.key_hash;
      delete updates.key_prefix;
      delete updates.key_hint;

      const { data: apiKey, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: apiKey.tenant_id,
        actor_id: user.id,
        action: 'api_key.updated',
        resource_type: 'api_key',
        resource_id: id,
        new_values: updates,
      });

      return new Response(JSON.stringify({ apiKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Revoke API key
    if (method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) throw new Error('API key ID required');

      const { data: apiKey, error } = await supabase
        .from('api_keys')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revoked_reason: body.reason || 'Manually revoked',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: apiKey.tenant_id,
        actor_id: user.id,
        action: 'api_key.revoked',
        resource_type: 'api_key',
        resource_id: id,
        new_values: { reason: body.reason },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
