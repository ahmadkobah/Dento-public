// supabase/functions/subscription-api/index.ts
// Edge function for subscription and billing management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    // Check developer role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'developer') {
      throw new Error('Only developers can access subscription data');
    }

    const url = new URL(req.url);
    const method = req.method;
    const type = url.searchParams.get('type') || 'stats';

    // GET requests
    if (method === 'GET') {
      switch (type) {
        case 'stats': {
          // Get subscription statistics
          const { data: tenants, error } = await supabase
            .from('tenants')
            .select(`
              id, 
              subscription_status, 
              subscription_plan_id,
              currency_code,
              billing_cycle,
              subscription_plans (
                price_monthly_usd,
                price_yearly_usd,
                price_monthly_egp,
                price_yearly_egp
              ),
              tenant_modules (
                status,
                license_type,
                price_override,
                modules (
                  base_price_monthly,
                  is_free
                )
              )
            `)
            .in('status', ['active', 'trial']);

          if (error) throw error;

          // Calculate MRR (normalized to USD for platform-level reporting)
          let mrr = 0;
          let activeSubscriptions = 0;
          const planCounts: Record<string, number> = {};

          tenants?.forEach(t => {
            if (t.subscription_status === 'active') {
              activeSubscriptions++;
              // Add plan price (use USD for MRR normalization)
              mrr += t.subscription_plans?.price_monthly_usd || 0;
              
              // Add module prices (respecting price_override and license_type)
              t.tenant_modules?.forEach((tm: any) => {
                if (tm.status === 'active' && !tm.modules?.is_free
                    && !['included', 'lifetime'].includes(tm.license_type)) {
                  mrr += tm.price_override ?? tm.modules?.base_price_monthly ?? 0;
                }
              });

              // Count by plan
              const planId = t.subscription_plan_id || 'none';
              planCounts[planId] = (planCounts[planId] || 0) + 1;
            }
          });

          const trialCount = tenants?.filter(t => t.subscription_status === 'trialing').length || 0;

          const stats = {
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(mrr * 12 * 100) / 100,
            activeSubscriptions,
            trialSubscriptions: trialCount,
            totalTenants: tenants?.length || 0,
            planDistribution: planCounts,
            conversionRate: activeSubscriptions > 0 
              ? Math.round((activeSubscriptions / (activeSubscriptions + trialCount)) * 100) 
              : 0,
          };

          return new Response(JSON.stringify({ stats }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'revenue': {
          // Get revenue breakdown
          const groupBy = url.searchParams.get('group_by') || 'plan';

          const { data: tenants, error } = await supabase
            .from('tenants')
            .select(`
              subscription_plan_id,
              currency_code,
              billing_cycle,
              subscription_plans (
                id, slug, name_en, price_monthly_usd, price_monthly_egp
              ),
              tenant_modules (
                status,
                license_type,
                price_override,
                modules (
                  id, slug, name_en, base_price_monthly, is_free
                )
              )
            `)
            .eq('subscription_status', 'active');

          if (error) throw error;

          if (groupBy === 'plan') {
            // Group by subscription plan
            const byPlan: Record<string, { name: string; revenue: number; count: number }> = {};
            
            tenants?.forEach(t => {
              const plan = t.subscription_plans;
              const planKey = plan?.slug || 'none';
              
              if (!byPlan[planKey]) {
                byPlan[planKey] = { name: plan?.name_en || 'No Plan', revenue: 0, count: 0 };
              }
              byPlan[planKey].revenue += plan?.price_monthly_usd || 0;
              byPlan[planKey].count++;
            });

            return new Response(JSON.stringify({ 
              revenue: Object.entries(byPlan).map(([slug, data]) => ({
                slug,
                ...data
              }))
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            // Group by module
            const byModule: Record<string, { name: string; revenue: number; count: number }> = {};
            
            tenants?.forEach(t => {
              t.tenant_modules?.forEach((tm: any) => {
                if (tm.status === 'active' && !tm.modules?.is_free
                    && !['included', 'lifetime'].includes(tm.license_type)) {
                  const moduleKey = tm.modules?.slug || 'unknown';
                  
                  if (!byModule[moduleKey]) {
                    byModule[moduleKey] = { name: tm.modules?.name_en || 'Unknown', revenue: 0, count: 0 };
                  }
                  byModule[moduleKey].revenue += tm.price_override ?? tm.modules?.base_price_monthly ?? 0;
                  byModule[moduleKey].count++;
                }
              });
            });

            return new Response(JSON.stringify({ 
              revenue: Object.entries(byModule).map(([slug, data]) => ({
                slug,
                ...data
              }))
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        case 'renewals': {
          // Get upcoming renewals
          const days = parseInt(url.searchParams.get('days') || '30');
          const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

          const { data: tenants, error } = await supabase
            .from('tenants')
            .select(`
              id, name, slug, owner_email,
              subscription_status,
              subscription_ends_at,
              subscription_plans (
                name_en, price_monthly_usd
              )
            `)
            .eq('subscription_status', 'active')
            .lte('subscription_ends_at', futureDate)
            .order('subscription_ends_at');

          if (error) throw error;

          const renewals = tenants?.map(t => ({
            tenant_id: t.id,
            tenant_name: t.name,
            tenant_slug: t.slug,
            owner_email: t.owner_email,
            plan_name: t.subscription_plans?.name_en,
            amount: t.subscription_plans?.price_monthly_usd,
            renewal_date: t.subscription_ends_at,
          }));

          return new Response(JSON.stringify({ renewals }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'transactions': {
          // Get recent transactions (from audit trail)
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const tenantId = url.searchParams.get('tenant_id');

          let query = supabase
            .from('saas_audit_trail')
            .select(`
              *,
              tenants (name, slug)
            `)
            .in('action', [
              'subscription.created',
              'subscription.renewed',
              'subscription.upgraded',
              'subscription.downgraded',
              'subscription.cancelled',
              'payment.completed',
              'payment.failed'
            ])
            .order('created_at', { ascending: false })
            .limit(limit);

          if (tenantId) query = query.eq('tenant_id', tenantId);

          const { data: transactions, error } = await query;
          if (error) throw error;

          return new Response(JSON.stringify({ transactions }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        default:
          throw new Error(`Unknown type: ${type}`);
      }
    }

    // PUT - Update subscription
    if (method === 'PUT') {
      const body = await req.json();
      const { tenant_id, ...updates } = body;

      if (!tenant_id) throw new Error('Tenant ID required');

      const { data: tenant, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenant_id)
        .select()
        .single();

      if (error) throw error;

      // Log action
      await supabase.from('saas_audit_trail').insert({
        tenant_id,
        actor_id: user.id,
        action: 'subscription.updated',
        resource_type: 'tenant',
        resource_id: tenant_id,
        new_values: updates,
      });

      return new Response(JSON.stringify({ tenant }), {
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
