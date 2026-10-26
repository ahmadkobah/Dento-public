// supabase/functions/dashboard-stats/index.ts
// Edge function for aggregated dashboard statistics

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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

    const token = authHeader.replace('Bearer ', '');
    
    // Check if using service role key (for Developer Portal)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isServiceRole = token === serviceRoleKey;
    
    if (!isServiceRole) {
      // Validate user token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error('Unauthorized');

      // For Developer Portal: allow any authenticated user
      // The portal itself handles access control via login
      // If stricter role checking is needed later, enable this:
      /*
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'developer') {
        throw new Error('Only developers can access dashboard stats');
      }
      */
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const period = url.searchParams.get('period') || '30d';
    const days = parseInt(period.replace('d', '')) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Activity feed
    if (type === 'activity') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      const { data: activity, error } = await supabase
        .from('saas_audit_trail')
        .select(`
          id, action, created_at, actor_email,
          tenants (name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(JSON.stringify({ activity }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Health summary
    if (type === 'health') {
      const { data: checks, error } = await supabase
        .from('health_checks')
        .select('check_name, check_type, status, response_time_ms')
        .order('check_name');

      if (error) throw error;

      const healthy = checks?.filter(c => c.status === 'healthy').length || 0;
      const degraded = checks?.filter(c => c.status === 'degraded').length || 0;
      const unhealthy = checks?.filter(c => c.status === 'unhealthy').length || 0;
      const total = checks?.length || 0;

      const overall = unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';

      return new Response(JSON.stringify({ 
        health: {
          overall,
          healthy,
          degraded,
          unhealthy,
          total,
          checks,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Full dashboard stats
    // Tenant stats
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, status, subscription_status, created_at');

    if (tenantsError) throw tenantsError;

    const totalTenants = tenants?.length || 0;
    const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
    const trialTenants = tenants?.filter(t => t.status === 'trial').length || 0;
    const newTenants = tenants?.filter(t => 
      new Date(t.created_at) >= new Date(since)
    ).length || 0;

    // Module stats
    const { data: modules } = await supabase
      .from('modules')
      .select('id, status')
      .eq('status', 'active');

    const totalModules = modules?.length || 0;

    // Active module instances
    const { data: tenantModules } = await supabase
      .from('tenant_modules')
      .select('id, status')
      .eq('status', 'active');

    const activeModuleInstances = tenantModules?.length || 0;

    // Error stats
    const { data: errors } = await supabase
      .from('error_logs')
      .select('id, severity, status')
      .gte('created_at', since);

    const totalErrors = errors?.length || 0;
    const unresolvedErrors = errors?.filter(e => e.status === 'unresolved').length || 0;
    const criticalErrors = errors?.filter(e => e.severity === 'critical').length || 0;

    // API key stats
    const { data: apiKeys } = await supabase
      .from('api_keys')
      .select('id, status, total_requests')
      .eq('status', 'active');

    const activeApiKeys = apiKeys?.length || 0;
    const totalApiRequests = apiKeys?.reduce((sum, k) => sum + (k.total_requests || 0), 0) || 0;

    // Webhook stats
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('id, status, total_deliveries, successful_deliveries')
      .eq('status', 'active');

    const activeWebhooks = webhooks?.length || 0;
    const totalWebhookDeliveries = webhooks?.reduce((sum, w) => sum + (w.total_deliveries || 0), 0) || 0;
    const successfulWebhookDeliveries = webhooks?.reduce((sum, w) => sum + (w.successful_deliveries || 0), 0) || 0;

    // Domain stats
    const { data: domains } = await supabase
      .from('domains')
      .select('id, is_active, ssl_status');

    const totalDomains = domains?.length || 0;
    const activeDomains = domains?.filter(d => d.is_active).length || 0;
    const sslIssues = domains?.filter(d => 
      ['expiring_soon', 'expired', 'failed'].includes(d.ssl_status || '')
    ).length || 0;

    // Health check stats
    const { data: healthChecks } = await supabase
      .from('health_checks')
      .select('status');

    const healthyServices = healthChecks?.filter(h => h.status === 'healthy').length || 0;
    const totalServices = healthChecks?.length || 0;

    // MRR calculation (includes plan + paid module prices, respects price_override)
    const { data: activeSubscriptions } = await supabase
      .from('tenants')
      .select(`
        subscription_plans (price_monthly_usd),
        tenant_modules (
          status,
          license_type,
          price_override,
          modules (base_price_monthly, is_free)
        )
      `)
      .eq('subscription_status', 'active');

    const mrr = activeSubscriptions?.reduce((sum, t) => {
      // Add plan price
      let tenantMrr = t.subscription_plans?.price_monthly_usd || 0;
      // Add paid module prices
      (t as any).tenant_modules?.forEach((tm: any) => {
        if (tm.status === 'active' && !tm.modules?.is_free
            && !['included', 'lifetime'].includes(tm.license_type)) {
          tenantMrr += tm.price_override ?? tm.modules?.base_price_monthly ?? 0;
        }
      });
      return sum + tenantMrr;
    }, 0) || 0;

    const stats = {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: trialTenants,
        new: newTenants,
      },
      modules: {
        total: totalModules,
        activeInstances: activeModuleInstances,
      },
      errors: {
        total: totalErrors,
        unresolved: unresolvedErrors,
        critical: criticalErrors,
      },
      apiKeys: {
        active: activeApiKeys,
        totalRequests: totalApiRequests,
      },
      webhooks: {
        active: activeWebhooks,
        totalDeliveries: totalWebhookDeliveries,
        successRate: totalWebhookDeliveries > 0 
          ? Math.round((successfulWebhookDeliveries / totalWebhookDeliveries) * 100)
          : 100,
      },
      domains: {
        total: totalDomains,
        active: activeDomains,
        sslIssues,
      },
      health: {
        healthy: healthyServices,
        total: totalServices,
        percentage: totalServices > 0 
          ? Math.round((healthyServices / totalServices) * 100)
          : 100,
      },
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
      },
      period: {
        days,
        since,
      },
    };

    return new Response(JSON.stringify({ stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
