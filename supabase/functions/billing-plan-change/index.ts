// Supabase Edge Function: billing-plan-change
// Handles self-service plan upgrades and downgrades
// Actions: request-change, approve-change, list-changes, get-available-plans
// Supports proration calculation and immediate or end-of-cycle changes

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get-available-plans';
    const body = await req.json().catch(() => ({}));

    // ═══════════════════════════════════════════════════════════
    // ACTION: get-available-plans
    // Returns all active plans with pricing for plan selection UI
    // ═══════════════════════════════════════════════════════════
    if (action === 'get-available-plans') {
      const { tenantId } = body;

      // Get all active plans
      const { data: plans, error: plansErr } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly_usd', { ascending: true });

      if (plansErr) throw plansErr;

      // Get tenant's current plan
      let currentPlan = null;
      if (tenantId) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('subscription_plan_id, billing_cycle, subscription_status, subscription_started_at, subscription_ends_at, next_billing_date')
          .eq('id', tenantId)
          .single();

        currentPlan = tenant;
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          plans: plans || [],
          currentPlan,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ACTION: request-change
    // Tenant requests a plan change (upgrade or downgrade)
    // ═══════════════════════════════════════════════════════════
    if (action === 'request-change') {
      const { tenantId, newPlanId, billingCycle, requestedBy, immediate = true } = body;

      if (!tenantId || !newPlanId) {
        throw new Error('tenantId and newPlanId are required');
      }

      // Check for existing pending plan changes (prevent race condition / duplicates)
      const { data: existingChanges } = await supabase
        .from('saas_plan_changes')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'approved'])
        .limit(1);

      if (existingChanges && existingChanges.length > 0) {
        throw new Error('A pending plan change already exists. Please wait for it to complete or cancel it first.');
      }

      // Get current tenant info
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('*, subscription_plans!subscription_plan_id(*)')
        .eq('id', tenantId)
        .single();

      if (tenantErr || !tenant) throw new Error('Tenant not found');

      const currentPlanId = tenant.subscription_plan_id;
      if (currentPlanId === newPlanId && (!billingCycle || billingCycle === tenant.billing_cycle)) {
        throw new Error('New plan is the same as current plan');
      }

      // Get new plan details
      const { data: newPlan, error: newPlanErr } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', newPlanId)
        .single();

      if (newPlanErr || !newPlan) throw new Error('New plan not found');

      // Determine change type
      const oldPrice = tenant.subscription_plans?.price_monthly_usd || 0;
      const newPrice = newPlan.price_monthly_usd || 0;
      const changeType = newPrice > oldPrice ? 'upgrade' : newPrice < oldPrice ? 'downgrade' : 'lateral';

      // Calculate proration (if upgrading mid-cycle)
      let prorationAmount = 0;
      if (immediate && tenant.next_billing_date && changeType === 'upgrade') {
        const now = new Date();
        const nextBilling = new Date(tenant.next_billing_date);
        const totalDays = tenant.billing_cycle === 'yearly' ? 365 : 30;
        const remainingDays = Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        if (remainingDays > 0 && remainingDays < totalDays) {
          const dailyOld = oldPrice / totalDays;
          const dailyNew = newPrice / totalDays;
          prorationAmount = Math.round(((dailyNew - dailyOld) * remainingDays) * 100) / 100;
        }
      }

      // For upgrades: auto-approve and apply immediately
      // For downgrades: schedule for end of billing period
      const effectiveDate = (changeType === 'downgrade' && !immediate)
        ? tenant.next_billing_date || new Date().toISOString()
        : new Date().toISOString();

      const status = changeType === 'upgrade' ? 'approved' : 'pending';

      // Insert plan change record
      const { data: planChange, error: changeErr } = await supabase
        .from('saas_plan_changes')
        .insert({
          tenant_id: tenantId,
          old_plan_id: currentPlanId,
          new_plan_id: newPlanId,
          change_type: changeType,
          proration_amount: prorationAmount,
          effective_date: effectiveDate,
          status,
          requested_by: requestedBy || null,
          approved_by: null,
          metadata: {
            old_plan_name: tenant.subscription_plans?.name_en,
            new_plan_name: newPlan.name_en,
            old_price: oldPrice,
            new_price: newPrice,
            billing_cycle: billingCycle || tenant.billing_cycle,
            immediate,
          },
        })
        .select()
        .single();

      if (changeErr) throw changeErr;

      // If upgrade and immediate, apply the change now
      if (changeType === 'upgrade' && immediate) {
        const updateData: any = {
          subscription_plan_id: newPlanId,
        };
        if (billingCycle) {
          updateData.billing_cycle = billingCycle;
        }

        const { error: updateErr } = await supabase
          .from('tenants')
          .update(updateData)
          .eq('id', tenantId);

        if (updateErr) throw updateErr;

        // Update plan change status to applied
        await supabase
          .from('saas_plan_changes')
          .update({ status: 'applied' })
          .eq('id', planChange.id);

        // Create proration invoice if applicable
        if (prorationAmount > 0) {
          const invoiceNumber = `PRO-${tenantId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
          const now = new Date();

          const { data: proInvoice } = await supabase
            .from('saas_invoices')
            .insert({
              tenant_id: tenantId,
              invoice_number: invoiceNumber,
              status: 'pending',
              subtotal: prorationAmount,
              tax_amount: 0,
              total: prorationAmount,
              currency: tenant.currency_code || 'USD',
              issue_date: now.toISOString(),
              due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              billing_period_start: now.toISOString(),
              billing_period_end: tenant.next_billing_date,
              notes: `Proration charge for plan upgrade: ${tenant.subscription_plans?.name_en} → ${newPlan.name_en}`,
            })
            .select()
            .single();

          if (proInvoice) {
            await supabase.from('saas_invoice_items').insert({
              invoice_id: proInvoice.id,
              item_type: 'other',
              description: `Plan upgrade proration: ${tenant.subscription_plans?.name_en} → ${newPlan.name_en}`,
              quantity: 1,
              unit_price: prorationAmount,
              total: prorationAmount,
            });
          }
        }

        // Audit trail
        await supabase.from('saas_audit_trail').insert({
          tenant_id: tenantId,
          action: 'plan_upgraded',
          resource_type: 'subscription',
          resource_id: planChange.id,
          description: `Plan upgraded from ${tenant.subscription_plans?.name_en} to ${newPlan.name_en}`,
          metadata: {
            old_plan: tenant.subscription_plans?.name_en,
            new_plan: newPlan.name_en,
            proration_amount: prorationAmount,
            change_type: changeType,
          },
        }).then(() => {}).catch(() => {});
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          planChange,
          changeType,
          prorationAmount,
          appliedImmediately: changeType === 'upgrade' && immediate,
          effectiveDate,
          message: changeType === 'upgrade'
            ? `Plan upgraded to ${newPlan.name_en}${prorationAmount > 0 ? `. Proration charge: $${prorationAmount.toFixed(2)}` : ''}`
            : `Plan downgrade to ${newPlan.name_en} scheduled for ${new Date(effectiveDate).toLocaleDateString()}`,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ACTION: approve-change (admin only)
    // Approves a pending plan change (typically downgrades)
    // ═══════════════════════════════════════════════════════════
    if (action === 'approve-change') {
      const { changeId, approvedBy } = body;

      if (!changeId) throw new Error('changeId is required');

      const { data: change, error: changeErr } = await supabase
        .from('saas_plan_changes')
        .select('*')
        .eq('id', changeId)
        .eq('status', 'pending')
        .single();

      if (changeErr || !change) throw new Error('Pending plan change not found');

      // Apply the change
      const updateData: any = {
        subscription_plan_id: change.new_plan_id,
      };
      if (change.metadata?.billing_cycle) {
        updateData.billing_cycle = change.metadata.billing_cycle;
      }

      const { error: updateErr } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', change.tenant_id);

      if (updateErr) throw updateErr;

      // Update change status
      await supabase
        .from('saas_plan_changes')
        .update({
          status: 'applied',
          approved_by: approvedBy || null,
        })
        .eq('id', changeId);

      // Audit trail
      await supabase.from('saas_audit_trail').insert({
        tenant_id: change.tenant_id,
        action: 'plan_change_approved',
        resource_type: 'subscription',
        resource_id: changeId,
        description: `Plan change approved by ${approvedBy || 'admin'}`,
        metadata: {
          change_type: change.change_type,
          approved_by: approvedBy || 'admin',
        },
      }).then(() => {}).catch(() => {});

      return new Response(JSON.stringify({
        success: true,
        message: 'Plan change approved and applied',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ACTION: list-changes
    // Lists plan change history for a tenant
    // ═══════════════════════════════════════════════════════════
    if (action === 'list-changes') {
      const { tenantId } = body;
      if (!tenantId) throw new Error('tenantId is required');

      const { data: changes, error } = await supabase
        .from('saas_plan_changes')
        .select(`
          *,
          old_plan:subscription_plans!old_plan_id(id, name_en, price_monthly_usd),
          new_plan:subscription_plans!new_plan_id(id, name_en, price_monthly_usd)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: changes || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Plan change error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
