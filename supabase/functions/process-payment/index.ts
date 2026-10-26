// Supabase Edge Function: process-payment
// Securely processes payments server-side
// Handles: payment recording, invoice updates, installment tracking, commission triggers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PaymentRequest {
  invoice_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'insurance' | 'cheque';
  reference_number?: string;
  notes?: string;
  installment_plan_id?: string;
  installment_number?: number;
  received_by?: string;
}

interface PaymentResult {
  success: boolean;
  payment_id?: string;
  invoice_id: string;
  amount_paid: number;
  invoice_status: string;
  remaining_balance: number;
  commission_calculated?: boolean;
  installment_updated?: boolean;
  error?: string;
}

// Rate limiting check
async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_endpoint: 'process-payment',
    p_max_requests: 30, // Stricter limit for payments
    p_window_minutes: 15
  });
  
  if (error) {
    console.error('Rate limit check failed:', error);
    return true;
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

// Validate payment amount
function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Invalid amount format' };
  }
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  if (amount > 1000000) {
    return { valid: false, error: 'Amount exceeds maximum allowed (1,000,000)' };
  }
  // Check for reasonable decimal places
  if (Math.round(amount * 100) / 100 !== amount) {
    return { valid: false, error: 'Amount cannot have more than 2 decimal places' };
  }
  return { valid: true };
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

    // Verify user authorization
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

    // Check user role - only financial staff can process payments
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role, name, branch_id')
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
      await logAudit(supabaseAdmin, 'PAYMENT_DENIED', { 
        user_id: user.id, 
        role: userData.role,
        reason: 'Insufficient permissions'
      }, user.id);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to process payments' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const withinLimit = await checkRateLimit(supabaseAdmin, user.id);
    if (!withinLimit) {
      await logAudit(supabaseAdmin, 'PAYMENT_RATE_LIMITED', { 
        user_id: user.id
      }, user.id);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait before processing more payments.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { 
      invoice_id, 
      amount, 
      payment_method, 
      reference_number, 
      notes,
      installment_plan_id,
      installment_number 
    } = body;

    // Validate required fields
    if (!invoice_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'invoice_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payment_method) {
      return new Response(
        JSON.stringify({ success: false, error: 'payment_method is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: amountValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment method
    const validMethods = ['cash', 'card', 'bank_transfer', 'insurance', 'cheque'];
    if (!validMethods.includes(payment_method)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payment method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check invoice status
    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      return new Response(
        JSON.stringify({ success: false, error: `Cannot process payment for ${invoice.status} invoice` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate current balance
    const currentBalance = invoice.total_amount - (invoice.paid_amount || 0);
    
    // Warn if overpayment
    if (amount > currentBalance) {
      await logAudit(supabaseAdmin, 'PAYMENT_OVERPAYMENT_WARNING', {
        invoice_id,
        amount,
        balance: currentBalance,
        user_id: user.id
      }, user.id);
      // Allow overpayment but log it
    }

    // Start transaction-like operations
    // 1. Insert payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        invoice_id: invoice_id,
        amount: amount,
        payment_method: payment_method,
        payment_date: new Date().toISOString(),
        reference_number: reference_number || null,
        notes: notes || null,
        received_by: user.id,
        status: 'completed',
        branch_id: invoice.branch_id || userData.branch_id
      })
      .select('id')
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Update invoice paid_amount and status
    const newPaidAmount = (invoice.paid_amount || 0) + amount;
    let newStatus = invoice.status;
    
    if (newPaidAmount >= invoice.total_amount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partially_paid';
    }

    const { error: invoiceUpdateError } = await supabaseAdmin
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice_id);

    if (invoiceUpdateError) {
      console.error('Invoice update error:', invoiceUpdateError);
      // Payment was recorded but invoice update failed - log this critical issue
      await logAudit(supabaseAdmin, 'PAYMENT_INVOICE_UPDATE_FAILED', {
        payment_id: payment.id,
        invoice_id,
        error: invoiceUpdateError.message
      }, user.id);
    }

    // 3. Handle installment payment if applicable
    let installmentUpdated = false;
    if (installment_plan_id) {
      // Fetch the installment plan
      const { data: plan, error: planError } = await supabaseAdmin
        .from('installment_plans')
        .select('*')
        .eq('id', installment_plan_id)
        .single();

      if (!planError && plan) {
        // Record installment payment
        const { error: installmentPaymentError } = await supabaseAdmin
          .from('installment_payments')
          .insert({
            installment_plan_id: installment_plan_id,
            payment_id: payment.id,
            installment_number: installment_number || null,
            amount: amount,
            payment_date: new Date().toISOString(),
            status: 'paid'
          });

        if (!installmentPaymentError) {
          // Update plan's paid amount
          const newPlanPaidAmount = (plan.paid_amount || 0) + amount;
          let planStatus = plan.status;
          
          if (newPlanPaidAmount >= plan.total_amount) {
            planStatus = 'completed';
          } else if (newPlanPaidAmount > 0) {
            planStatus = 'active';
          }

          await supabaseAdmin
            .from('installment_plans')
            .update({
              paid_amount: newPlanPaidAmount,
              status: planStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', installment_plan_id);

          installmentUpdated = true;
        }
      }
    }

    // 4. Trigger commission calculation if invoice is now paid
    let commissionCalculated = false;
    if (newStatus === 'paid' && invoice.doctor_id) {
      try {
        // Call the commission calculation function directly
        const { data: commission, error: commissionError } = await supabaseAdmin
          .from('doctor_commissions')
          .insert({
            doctor_id: invoice.doctor_id,
            invoice_id: invoice_id,
            payment_id: payment.id,
            status: 'approved',
            calculation_details: {
              triggered_by: 'process-payment',
              triggered_at: new Date().toISOString(),
              user_id: user.id
            }
          })
          .select('id')
          .maybeSingle();

        // Note: The actual commission amount calculation should be done 
        // by calling the calculate-commission Edge Function or a DB trigger
        // This is just a placeholder record
        
        if (!commissionError) {
          commissionCalculated = true;
        }
      } catch (e) {
        console.error('Commission trigger failed:', e);
        // Non-fatal error, continue
      }
    }

    // 5. Log successful payment
    await logAudit(supabaseAdmin, 'PAYMENT_PROCESSED', {
      payment_id: payment.id,
      invoice_id: invoice_id,
      amount: amount,
      payment_method: payment_method,
      new_invoice_status: newStatus,
      remaining_balance: invoice.total_amount - newPaidAmount,
      processed_by: user.id,
      processed_by_name: userData.name
    }, user.id);

    const result: PaymentResult = {
      success: true,
      payment_id: payment.id,
      invoice_id: invoice_id,
      amount_paid: amount,
      invoice_status: newStatus,
      remaining_balance: Math.max(0, invoice.total_amount - newPaidAmount),
      commission_calculated: commissionCalculated,
      installment_updated: installmentUpdated
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
