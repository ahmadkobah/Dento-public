// Supabase Edge Function: stripe-billing
// Handles Stripe payment processing for SaaS platform billing
// Routes: create-checkout, webhook, create-portal-session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Stripe API helper
async function stripeRequest(
  endpoint: string,
  method: string,
  body?: Record<string, any>,
  stripeKey?: string
): Promise<any> {
  const STRIPE_SECRET = stripeKey || Deno.env.get('STRIPE_SECRET_KEY');
  if (!STRIPE_SECRET) {
    throw new Error('Stripe not configured — set STRIPE_SECRET_KEY in Supabase secrets');
  }

  const url = `https://api.stripe.com/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${STRIPE_SECRET}`,
  };

  let fetchBody: string | undefined;
  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    fetchBody = new URLSearchParams(
      Object.entries(flattenObject(body)).map(([k, v]) => [k, String(v)])
    ).toString();
  }

  const response = await fetch(url, { method, headers, body: fetchBody });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe API error: ${response.status}`);
  }
  return data;
}

// Flatten nested objects for Stripe's form-encoded API
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}[${key}]` : key;
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[newKey] = String(value);
      }
    }
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'create-checkout';

    // ─── Stripe Webhook (no auth required) ───
    if (action === 'webhook') {
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      const body = await req.text();
      const sig = req.headers.get('stripe-signature');

      // In production, verify webhook signature
      // For now, parse the event directly
      let event;
      try {
        event = JSON.parse(body);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle webhook events
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const invoiceId = session.metadata?.invoice_id;
          const tenantId = session.metadata?.tenant_id;

          if (invoiceId) {
            // Mark invoice as paid
            await supabase
              .from('saas_invoices')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_method: 'stripe',
                stripe_payment_intent_id: session.payment_intent,
                updated_at: new Date().toISOString(),
              })
              .eq('id', invoiceId);

            // Record payment
            await supabase
              .from('saas_payments')
              .insert({
                tenant_id: tenantId,
                invoice_id: invoiceId,
                amount: (session.amount_total || 0) / 100,
                currency: (session.currency || 'usd').toUpperCase(),
                payment_method: 'stripe',
                payment_reference: session.payment_intent,
                status: 'completed',
                processed_at: new Date().toISOString(),
              });
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          // Handle recurring subscription payments
          const invoice = event.data.object;
          const tenantId = invoice.metadata?.tenant_id;

          if (tenantId && invoice.subscription) {
            // Update tenant subscription status
            await supabase
              .from('tenants')
              .update({
                subscription_status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', tenantId);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const tenantId = invoice.metadata?.tenant_id;

          if (tenantId) {
            await supabase
              .from('tenants')
              .update({
                subscription_status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('id', tenantId);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const tenantId = subscription.metadata?.tenant_id;

          if (tenantId) {
            await supabase
              .from('tenants')
              .update({
                subscription_status: 'cancelled',
                status: 'suspended',
                updated_at: new Date().toISOString(),
              })
              .eq('id', tenantId);
          }
          break;
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Authenticated routes ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // ─── Create Checkout Session ───
    if (action === 'create-checkout') {
      const { invoice_id, success_url, cancel_url } = body;

      if (!invoice_id) {
        return new Response(JSON.stringify({ error: 'invoice_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch invoice with items
      const { data: invoice, error: invError } = await supabase
        .from('saas_invoices')
        .select(`*, saas_invoice_items (*), tenants (id, name, owner_email, settings)`)
        .eq('id', invoice_id)
        .single();

      if (invError || !invoice) {
        return new Response(JSON.stringify({ error: 'Invoice not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (invoice.status === 'paid') {
        return new Response(JSON.stringify({ error: 'Invoice already paid' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build line items for Stripe
      const lineItems = (invoice.saas_invoice_items || []).map((item: any) => ({
        price_data: {
          currency: (invoice.currency || 'usd').toLowerCase(),
          product_data: {
            name: item.description,
          },
          unit_amount: Math.round((item.unit_price || 0) * 100),
        },
        quantity: item.quantity || 1,
      }));

      // Create Stripe Checkout Session
      const sessionParams: Record<string, any> = {
        mode: 'payment',
        'line_items': lineItems.reduce((acc: any, item: any, i: number) => {
          acc[`line_items[${i}][price_data][currency]`] = item.price_data.currency;
          acc[`line_items[${i}][price_data][product_data][name]`] = item.price_data.product_data.name;
          acc[`line_items[${i}][price_data][unit_amount]`] = item.price_data.unit_amount;
          acc[`line_items[${i}][quantity]`] = item.quantity;
          return acc;
        }, {}),
        customer_email: invoice.tenants?.owner_email,
        'metadata[invoice_id]': invoice_id,
        'metadata[tenant_id]': invoice.tenant_id,
        success_url: success_url || `${req.headers.get('origin')}/developer/tenants/${invoice.tenant_id}?payment=success`,
        cancel_url: cancel_url || `${req.headers.get('origin')}/developer/tenants/${invoice.tenant_id}?payment=cancelled`,
      };

      // Build form-encoded body manually for line items
      const formParts: string[] = [];
      formParts.push(`mode=payment`);
      formParts.push(`customer_email=${encodeURIComponent(invoice.tenants?.owner_email || '')}`);
      formParts.push(`metadata[invoice_id]=${encodeURIComponent(invoice_id)}`);
      formParts.push(`metadata[tenant_id]=${encodeURIComponent(invoice.tenant_id)}`);
      formParts.push(`success_url=${encodeURIComponent(sessionParams.success_url)}`);
      formParts.push(`cancel_url=${encodeURIComponent(sessionParams.cancel_url)}`);

      lineItems.forEach((item: any, i: number) => {
        formParts.push(`line_items[${i}][price_data][currency]=${item.price_data.currency}`);
        formParts.push(`line_items[${i}][price_data][product_data][name]=${encodeURIComponent(item.price_data.product_data.name)}`);
        formParts.push(`line_items[${i}][price_data][unit_amount]=${item.price_data.unit_amount}`);
        formParts.push(`line_items[${i}][quantity]=${item.quantity}`);
      });

      const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY');
      const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParts.join('&'),
      });

      const session = await stripeResp.json();
      if (!stripeResp.ok) {
        throw new Error(session.error?.message || 'Failed to create checkout session');
      }

      // Update invoice with Stripe reference
      await supabase
        .from('saas_invoices')
        .update({ stripe_invoice_id: session.id })
        .eq('id', invoice_id);

      return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Create Customer Portal Session ───
    if (action === 'create-portal') {
      const { tenant_id, return_url } = body;

      // Get tenant's Stripe customer ID
      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id, name, owner_email')
        .eq('id', tenant_id)
        .single();

      if (!tenant?.stripe_customer_id) {
        return new Response(JSON.stringify({ error: 'No Stripe customer found for this tenant. Process a payment first.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const portalSession = await stripeRequest('/billing_portal/sessions', 'POST', {
        customer: tenant.stripe_customer_id,
        return_url: return_url || `${req.headers.get('origin')}/developer/tenants/${tenant_id}`,
      });

      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Stripe billing error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
