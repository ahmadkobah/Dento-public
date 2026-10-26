// Supabase Edge Function: calculate-commission
// Securely calculates and records doctor commissions server-side
// This prevents client-side manipulation of commission amounts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommissionRequest {
  invoice_id: string;
  payment_id?: string;
  force_recalculate?: boolean;
}

interface CommissionResult {
  success: boolean;
  commission_id?: string;
  doctor_id?: string;
  doctor_name?: string;
  invoice_amount: number;
  commission_rate: number;
  commission_amount: number;
  error?: string;
}

// Rate limiting check
async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_endpoint: 'calculate-commission',
    p_max_requests: 50,
    p_window_minutes: 15
  });
  
  if (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow on error (fail open for this non-critical check)
  }
  
  return data;
}

// Audit log entry
async function logAudit(
  supabase: any, 
  action: string, 
  details: Record<string, any>,
  userId: string
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      table_name: 'edge_function',
      action: action,
      new_data: details,
      user_id: userId,
      user_role: 'edge_function'
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Also create client with user's JWT to verify permissions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user role - only financial staff can calculate commissions
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['admin', 'developer', 'receptionist', 'manager'];
    if (!allowedRoles.includes(userData.role)) {
      await logAudit(supabaseAdmin, 'COMMISSION_DENIED', { 
        user_id: user.id, 
        role: userData.role,
        reason: 'Insufficient permissions'
      }, user.id);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const withinLimit = await checkRateLimit(supabaseAdmin, user.id);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CommissionRequest = await req.json();
    const { invoice_id, payment_id, force_recalculate } = body;

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'invoice_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice with doctor and service info
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id,
        total_amount,
        paid_amount,
        status,
        doctor_id,
        patient_id,
        branch_id,
        doctors!invoices_doctor_id_fkey (
          id,
          name,
          commission_rate
        ),
        invoice_items (
          id,
          service_id,
          quantity,
          unit_price,
          total,
          services (
            id,
            name,
            commission_rate
          )
        )
      `)
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if commission already exists (unless forcing recalculation)
    if (!force_recalculate) {
      const { data: existingCommission } = await supabaseAdmin
        .from('doctor_commissions')
        .select('id')
        .eq('invoice_id', invoice_id)
        .maybeSingle();

      if (existingCommission) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Commission already calculated for this invoice. Use force_recalculate=true to override.' 
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Calculate commission
    const doctor = invoice.doctors;
    if (!doctor) {
      return new Response(
        JSON.stringify({ success: false, error: 'No doctor assigned to this invoice' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate commission based on service-specific rates or doctor's default rate
    let totalCommission = 0;
    const commissionDetails: any[] = [];

    for (const item of invoice.invoice_items || []) {
      // Use service-specific commission rate if available, otherwise doctor's default
      const commissionRate = item.services?.commission_rate ?? doctor.commission_rate ?? 0;
      const itemCommission = (item.total * commissionRate) / 100;
      
      totalCommission += itemCommission;
      commissionDetails.push({
        service_id: item.service_id,
        service_name: item.services?.name,
        amount: item.total,
        rate: commissionRate,
        commission: itemCommission
      });
    }

    // Round to 2 decimal places
    totalCommission = Math.round(totalCommission * 100) / 100;

    // Determine commission status based on invoice payment status
    let commissionStatus = 'pending';
    if (invoice.status === 'paid' || invoice.paid_amount >= invoice.total_amount) {
      commissionStatus = 'approved';
    }

    // Delete existing commission if force_recalculate
    if (force_recalculate) {
      await supabaseAdmin
        .from('doctor_commissions')
        .delete()
        .eq('invoice_id', invoice_id);
    }

    // Insert commission record
    const { data: commission, error: insertError } = await supabaseAdmin
      .from('doctor_commissions')
      .insert({
        doctor_id: doctor.id,
        invoice_id: invoice_id,
        payment_id: payment_id || null,
        amount: totalCommission,
        rate: doctor.commission_rate || 0,
        status: commissionStatus,
        calculation_details: {
          invoice_total: invoice.total_amount,
          items: commissionDetails,
          calculated_by: user.id,
          calculated_at: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Commission insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save commission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful calculation
    await logAudit(supabaseAdmin, 'COMMISSION_CALCULATED', {
      commission_id: commission.id,
      invoice_id: invoice_id,
      doctor_id: doctor.id,
      amount: totalCommission,
      status: commissionStatus,
      calculated_by: user.id
    }, user.id);

    const result: CommissionResult = {
      success: true,
      commission_id: commission.id,
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      invoice_amount: invoice.total_amount,
      commission_rate: doctor.commission_rate || 0,
      commission_amount: totalCommission
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Commission calculation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
