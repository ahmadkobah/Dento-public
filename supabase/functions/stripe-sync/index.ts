// Supabase Edge Function: stripe-sync
// Synchronizes SaaS plans and modules with Stripe Products & Prices
// Actions: sync-products, sync-prices, get-mapping, create-checkout-link
// Ensures Stripe catalog matches the DB plan/module configuration

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Stripe API helper
async function stripeRequest(
  method: string,
  endpoint: string,
  body?: Record<string, any>,
  stripeKey?: string
): Promise<any> {
  const key = stripeKey || Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = new URLSearchParams(flattenObject(body)).toString();
  }

  const url = `https://api.stripe.com/v1${endpoint}`;
  const resp = await fetch(url, options);
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(`Stripe API error: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data;
}

// Flatten nested objects for Stripe URL-encoding
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, fullKey));
      } else {
        result[fullKey] = String(value);
      }
    }
  }
  return result;
}

// Currency config for Stripe
const SUPPORTED_CURRENCIES = ['usd', 'egp', 'eur', 'gbp', 'sar', 'aed', 'try', 'kwd'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'sync-products';

    const body = await req.json().catch(() => ({}));

    // ═══════════════════════════════════════════════════════════════
    // ACTION: sync-products
    // Creates/updates Stripe Products for each plan and module
    // ═══════════════════════════════════════════════════════════════
    if (action === 'sync-products') {
      const results: any[] = [];

      // Pre-fetch exchange rates once (instead of per-plan per-currency)
      let exchangeRates: Record<string, number> = {};
      try {
        const rateResp = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const ratesData = await rateResp.json();
        exchangeRates = ratesData.rates || {};
      } catch {
        console.warn('Could not fetch exchange rates, will use USD amounts for non-USD currencies');
      }

      // 1. Sync Plans
      const { data: plans, error: plansErr } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      if (plansErr) throw plansErr;

      for (const plan of (plans || [])) {
        // Check if mapping exists
        const { data: existing } = await supabase
          .from('saas_stripe_products')
          .select('*')
          .eq('entity_type', 'plan')
          .eq('entity_id', plan.id)
          .eq('currency', 'usd')
          .limit(1);

        let stripeProductId = existing?.[0]?.stripe_product_id;

        if (!stripeProductId) {
          // Create Stripe Product
          const product = await stripeRequest('POST', '/products', {
            name: `Dento ${plan.name_en} Plan`,
            description: plan.description_en || `${plan.name_en} subscription plan for Dento dental platform`,
            metadata: {
              dento_entity_type: 'plan',
              dento_entity_id: plan.id,
              dento_plan_name: plan.name_en,
            },
          });
          stripeProductId = product.id;
        }

        // Create/update prices for each supported currency
        for (const currency of SUPPORTED_CURRENCIES) {
          const monthlyPrice = plan.price_monthly_usd || 0;
          const yearlyPrice = plan.price_yearly_usd || (monthlyPrice * 10); // 2 months free

          if (monthlyPrice <= 0) continue;

          // Get exchange rate for non-USD (using cached rates)
          let monthlyAmount = Math.round(monthlyPrice * 100); // cents
          let yearlyAmount = Math.round(yearlyPrice * 100);

          if (currency !== 'usd') {
            const rate = exchangeRates[currency.toUpperCase()] || 1;
            monthlyAmount = Math.round(monthlyPrice * rate * 100);
            yearlyAmount = Math.round(yearlyPrice * rate * 100);
          }

          // Check existing mapping
          const { data: currMapping } = await supabase
            .from('saas_stripe_products')
            .select('*')
            .eq('entity_type', 'plan')
            .eq('entity_id', plan.id)
            .eq('currency', currency)
            .limit(1);

          let monthlyPriceId = currMapping?.[0]?.stripe_price_id_monthly;
          let yearlyPriceId = currMapping?.[0]?.stripe_price_id_yearly;

          // Create monthly price if not exists
          if (!monthlyPriceId) {
            const price = await stripeRequest('POST', '/prices', {
              product: stripeProductId,
              unit_amount: monthlyAmount,
              currency: currency,
              recurring: { interval: 'month' },
              metadata: {
                dento_entity_type: 'plan',
                dento_entity_id: plan.id,
                dento_billing_cycle: 'monthly',
              },
            });
            monthlyPriceId = price.id;
          }

          // Create yearly price if not exists
          if (!yearlyPriceId) {
            const price = await stripeRequest('POST', '/prices', {
              product: stripeProductId,
              unit_amount: yearlyAmount,
              currency: currency,
              recurring: { interval: 'year' },
              metadata: {
                dento_entity_type: 'plan',
                dento_entity_id: plan.id,
                dento_billing_cycle: 'yearly',
              },
            });
            yearlyPriceId = price.id;
          }

          // Upsert mapping
          await supabase
            .from('saas_stripe_products')
            .upsert({
              entity_type: 'plan',
              entity_id: plan.id,
              stripe_product_id: stripeProductId,
              stripe_price_id_monthly: monthlyPriceId,
              stripe_price_id_yearly: yearlyPriceId,
              currency: currency,
            }, {
              onConflict: 'entity_type,entity_id,currency',
            });
        }

        results.push({
          type: 'plan',
          name: plan.name_en,
          stripeProductId,
          synced: true,
        });
      }

      // 2. Sync Modules
      const { data: modules, error: modsErr } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true);

      if (modsErr) throw modsErr;

      for (const mod of (modules || [])) {
        const { data: existing } = await supabase
          .from('saas_stripe_products')
          .select('*')
          .eq('entity_type', 'module')
          .eq('entity_id', mod.id)
          .eq('currency', 'usd')
          .limit(1);

        let stripeProductId = existing?.[0]?.stripe_product_id;

        if (!stripeProductId) {
          const product = await stripeRequest('POST', '/products', {
            name: `Dento Module: ${mod.name_en}`,
            description: mod.description_en || `${mod.name_en} add-on module for Dento`,
            metadata: {
              dento_entity_type: 'module',
              dento_entity_id: mod.id,
              dento_module_key: mod.slug,
            },
          });
          stripeProductId = product.id;
        }

        // Create prices for USD only (modules are simpler)
        const monthlyPrice = mod.base_price_monthly || 0;
        if (monthlyPrice > 0) {
          const { data: usdMapping } = await supabase
            .from('saas_stripe_products')
            .select('*')
            .eq('entity_type', 'module')
            .eq('entity_id', mod.id)
            .eq('currency', 'usd')
            .limit(1);

          let monthlyPriceId = usdMapping?.[0]?.stripe_price_id_monthly;

          if (!monthlyPriceId) {
            const price = await stripeRequest('POST', '/prices', {
              product: stripeProductId,
              unit_amount: Math.round(monthlyPrice * 100),
              currency: 'usd',
              recurring: { interval: 'month' },
              metadata: {
                dento_entity_type: 'module',
                dento_entity_id: mod.id,
              },
            });
            monthlyPriceId = price.id;
          }

          await supabase
            .from('saas_stripe_products')
            .upsert({
              entity_type: 'module',
              entity_id: mod.id,
              stripe_product_id: stripeProductId,
              stripe_price_id_monthly: monthlyPriceId,
              currency: 'usd',
            }, {
              onConflict: 'entity_type,entity_id,currency',
            });
        }

        results.push({
          type: 'module',
          name: mod.name_en,
          stripeProductId,
          synced: true,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Synced ${results.length} products to Stripe`,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: get-mapping
    // Returns current Stripe product mappings from DB
    // ═══════════════════════════════════════════════════════════════
    if (action === 'get-mapping') {
      const { data: mappings, error } = await supabase
        .from('saas_stripe_products')
        .select('*')
        .order('entity_type', { ascending: true })
        .order('currency', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: mappings,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: create-checkout-link
    // Creates a Stripe Checkout URL for a specific plan + billing cycle
    // ═══════════════════════════════════════════════════════════════
    if (action === 'create-checkout-link') {
      const { planId, billingCycle = 'monthly', currency = 'usd', tenantId, successUrl, cancelUrl } = body;

      if (!planId || !tenantId) {
        throw new Error('planId and tenantId are required');
      }

      // Get price ID from mapping
      const priceField = billingCycle === 'yearly' ? 'stripe_price_id_yearly' : 'stripe_price_id_monthly';
      const { data: mapping, error: mapErr } = await supabase
        .from('saas_stripe_products')
        .select('*')
        .eq('entity_type', 'plan')
        .eq('entity_id', planId)
        .eq('currency', currency.toLowerCase())
        .single();

      if (mapErr || !mapping) {
        throw new Error(`No Stripe price found for plan ${planId} in ${currency}`);
      }

      const stripePriceId = mapping[priceField];
      if (!stripePriceId) {
        throw new Error(`No ${billingCycle} price configured for this plan`);
      }

      // Get tenant's stripe customer ID
      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id, owner_email, name')
        .eq('id', tenantId)
        .single();

      const appUrl = Deno.env.get('APP_URL') || 'https://dento.app';

      const sessionParams: any = {
        mode: 'subscription',
        'line_items[0][price]': stripePriceId,
        'line_items[0][quantity]': '1',
        success_url: successUrl || `${appUrl}/admin/subscription?payment=success`,
        cancel_url: cancelUrl || `${appUrl}/admin/subscription?payment=cancelled`,
        metadata: {
          tenant_id: tenantId,
          plan_id: planId,
          billing_cycle: billingCycle,
        },
      };

      if (tenant?.stripe_customer_id) {
        sessionParams.customer = tenant.stripe_customer_id;
      } else if (tenant?.owner_email) {
        sessionParams.customer_email = tenant.owner_email;
      }

      const session = await stripeRequest('POST', '/checkout/sessions', sessionParams);

      return new Response(JSON.stringify({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Stripe sync error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
