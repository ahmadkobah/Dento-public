// Supabase Edge Function: billing-dunning
// Automated dunning (payment reminder) system for overdue SaaS invoices
// Sends escalating reminders: Level 1 (3 days), Level 2 (7 days), Level 3 (14 days = final warning)
// Can be called via cron or manually with ?action=run-dunning | check-status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Dunning levels with escalation rules
const DUNNING_LEVELS = [
  { level: 1, daysOverdue: 3, subject: 'Payment Reminder', urgency: 'friendly' },
  { level: 2, daysOverdue: 7, subject: 'Second Payment Reminder', urgency: 'firm' },
  { level: 3, daysOverdue: 14, subject: 'Final Payment Notice - Account Suspension Warning', urgency: 'urgent' },
];

function formatCurrency(amount: number, code: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$', EGP: 'E£', EUR: '€', GBP: '£',
    SAR: 'SAR ', AED: 'AED ', TRY: '₺', KWD: 'KD ',
  };
  return `${symbols[code] || code + ' '}${(amount || 0).toFixed(2)}`;
}

function getDunningEmailHTML(tenant: any, invoice: any, level: number): string {
  const curr = invoice.currency || 'USD';
  const amount = formatCurrency(invoice.total, curr);
  const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const levelConfig = DUNNING_LEVELS.find(l => l.level === level)!;

  const urgencyColors: Record<string, { bg: string; border: string; text: string }> = {
    friendly: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    firm: { bg: '#fed7aa', border: '#f97316', text: '#9a3412' },
    urgent: { bg: '#fecaca', border: '#ef4444', text: '#991b1b' },
  };
  const colors = urgencyColors[levelConfig.urgency];

  const bodyContent = level === 1
    ? `<p>This is a friendly reminder that your invoice <strong>${invoice.invoice_number}</strong> for <strong>${amount}</strong> was due on <strong>${dueDate}</strong>.</p>
       <p>If you've already made the payment, please disregard this email. Otherwise, please process the payment at your earliest convenience.</p>`
    : level === 2
    ? `<p>We notice that your invoice <strong>${invoice.invoice_number}</strong> for <strong>${amount}</strong> remains unpaid. The payment was due on <strong>${dueDate}</strong>.</p>
       <p>Please arrange payment promptly to avoid service interruptions. If you're experiencing any issues, please don't hesitate to reach out to our support team.</p>`
    : `<p><strong>FINAL NOTICE:</strong> Your invoice <strong>${invoice.invoice_number}</strong> for <strong>${amount}</strong> is significantly overdue (due ${dueDate}).</p>
       <p>Your account will be <strong>suspended within 24 hours</strong> if payment is not received. All clinic data and services will be temporarily inaccessible.</p>
       <p>To prevent service disruption, please make payment immediately.</p>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 40px;">
<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px 40px; text-align: center;">
    <h1 style="color: white; font-size: 24px; margin: 0;">Den<span style="color: #d1fae5;">to</span></h1>
    <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Dental Practice Management</p>
  </div>
  <div style="padding: 40px;">
    <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
      <h2 style="color: ${colors.text}; margin: 0 0 4px; font-size: 18px;">${levelConfig.subject}</h2>
      <p style="color: ${colors.text}; margin: 0; font-size: 13px;">Dunning Level ${level} of 3</p>
    </div>
    <p style="color: #374151; margin-bottom: 16px;">Dear <strong>${tenant.name || 'Valued Customer'}</strong>,</p>
    <div style="color: #4b5563; line-height: 1.7; margin-bottom: 24px;">${bodyContent}</div>
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7280;">Invoice:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${invoice.invoice_number}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Amount:</td><td style="padding: 6px 0; font-weight: 600; text-align: right; color: #ef4444;">${amount}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Due Date:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${dueDate}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7280;">Status:</td><td style="padding: 6px 0; font-weight: 600; text-align: right; color: #ef4444;">OVERDUE</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${Deno.env.get('APP_URL') || 'https://dento.app'}/admin/subscription" style="display: inline-block; background: #10B981; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Pay Now</a>
    </div>
    <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 20px;">
      If you believe this is an error or need assistance, please contact us at ${Deno.env.get('SUPPORT_EMAIL') || 'support@dento.app'}
    </p>
  </div>
  <div style="background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">Dento Platform &bull; Dental Practice Management</p>
  </div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'run-dunning';

    if (action === 'check-status') {
      // Return dunning log summary
      const body = await req.json().catch(() => ({}));
      const tenantId = body.tenantId;

      let query = supabase
        .from('saas_dunning_log')
        .select('*, saas_invoices(invoice_number, total, currency)')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data: logs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Run Dunning Process ───
    const results: any[] = [];
    const now = new Date();

    // Find all overdue invoices
    const { data: overdueInvoices, error: invError } = await supabase
      .from('saas_invoices')
      .select('*, tenants(id, name, owner_email, billing_email, settings)')
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });

    if (invError) throw invError;

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No overdue invoices found',
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const invoice of overdueInvoices) {
      const tenant = invoice.tenants;
      if (!tenant) continue;

      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Determine which dunning level applies
      let applicableLevel = 0;
      for (const dl of DUNNING_LEVELS) {
        if (daysOverdue >= dl.daysOverdue) {
          applicableLevel = dl.level;
        }
      }

      if (applicableLevel === 0) continue; // Not yet due for dunning

      // Check if this level was already sent for this invoice
      const { data: existingLog } = await supabase
        .from('saas_dunning_log')
        .select('id')
        .eq('invoice_id', invoice.id)
        .eq('dunning_level', applicableLevel)
        .eq('status', 'sent')
        .limit(1);

      if (existingLog && existingLog.length > 0) continue; // Already sent

      // Send dunning email
      const recipientEmail = tenant.billing_email || tenant.owner_email;
      if (!recipientEmail) continue;

      const emailHTML = getDunningEmailHTML(tenant, invoice, applicableLevel);
      const levelConfig = DUNNING_LEVELS.find(l => l.level === applicableLevel)!;

      // Try sending via send-notification edge function
      let sendStatus = 'sent';
      let errorMessage = null;

      try {
        const notifResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            type: 'billing_reminder',
            channel: 'email',
            recipient: recipientEmail,
            template: 'custom',
            variables: {
              subject: `${levelConfig.subject} - Invoice ${invoice.invoice_number}`,
              html: emailHTML,
            },
          }),
        });

        if (!notifResponse.ok) {
          const errBody = await notifResponse.text();
          console.warn(`Notification send failed for ${invoice.invoice_number}:`, errBody);
          // Fallback: try direct Resend API
          const resendKey = Deno.env.get('RESEND_API_KEY');
          const fromEmail = Deno.env.get('FROM_EMAIL') || 'billing@dento.app';

          if (resendKey) {
            const resendResp = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [recipientEmail],
                subject: `${levelConfig.subject} - Invoice ${invoice.invoice_number}`,
                html: emailHTML,
              }),
            });

            if (!resendResp.ok) {
              sendStatus = 'failed';
              errorMessage = `Resend API failed: ${await resendResp.text()}`;
            }
          } else {
            // Simulation mode - log but don't fail
            console.log(`[DUNNING SIMULATION] Would send level ${applicableLevel} email to ${recipientEmail} for invoice ${invoice.invoice_number}`);
            sendStatus = 'simulated';
          }
        }
      } catch (sendErr) {
        sendStatus = 'failed';
        errorMessage = (sendErr as Error).message;
        console.error(`Send error for ${invoice.invoice_number}:`, sendErr);
      }

      // Log to saas_dunning_log
      const { error: logError } = await supabase
        .from('saas_dunning_log')
        .insert({
          tenant_id: tenant.id,
          invoice_id: invoice.id,
          dunning_level: applicableLevel,
          channel: 'email',
          status: sendStatus === 'simulated' ? 'sent' : sendStatus,
          error_message: errorMessage || null,
        });

      if (logError) {
        console.error(`Failed to log dunning for ${invoice.invoice_number}:`, logError);
      }

      // Log to audit trail
      await supabase.from('saas_audit_trail').insert({
        tenant_id: tenant.id,
        action: 'dunning_reminder_sent',
        resource_type: 'invoice',
        resource_id: invoice.id,
        description: `Dunning level ${applicableLevel} sent for invoice ${invoice.invoice_number}`,
        metadata: {
          dunning_level: applicableLevel,
          days_overdue: daysOverdue,
          recipient: recipientEmail,
          invoice_number: invoice.invoice_number,
          status: sendStatus,
        },
      }).then(() => {}).catch(() => {});

      results.push({
        invoiceNumber: invoice.invoice_number,
        tenantName: tenant.name,
        dunningLevel: applicableLevel,
        daysOverdue,
        recipient: recipientEmail,
        status: sendStatus,
        error: errorMessage,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Dunning process completed. ${results.length} reminders processed.`,
      processed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dunning error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
