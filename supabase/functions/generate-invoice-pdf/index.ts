// Supabase Edge Function: generate-invoice-pdf
// Generates HTML invoices for SaaS platform billing AND clinic patient invoices
// Use ?type=saas for platform billing invoices (saas_invoices table)
// Use ?type=clinic for patient invoices (invoices table) - default for backward compat

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Currency symbols
const currencySymbols: Record<string, string> = {
  USD: '$', EGP: 'E£', EUR: '€', GBP: '£',
  SAR: 'SAR ', AED: 'AED ', TRY: '₺', KWD: 'KD ',
};

function formatCurrency(amount: number, code: string = 'USD'): string {
  const sym = currencySymbols[code] || `${code} `;
  return `${sym}${(amount || 0).toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ═══════════════════════════════════════════════════════════════
// SaaS Platform Invoice HTML (for tenant billing)
// ═══════════════════════════════════════════════════════════════
function generateSaasInvoiceHTML(invoice: any, tenant: any): string {
  const items = invoice.saas_invoice_items || [];
  const curr = invoice.currency || 'USD';
  const fmt = (v: number) => formatCurrency(v, curr);

  const statusColors: Record<string, string> = {
    paid: '#22c55e', pending: '#f59e0b', overdue: '#ef4444',
    draft: '#6b7280', cancelled: '#9ca3af',
  };
  const statusColor = statusColors[invoice.status] || '#6b7280';

  const itemRows = items
    .filter((i: any) => i.item_type !== 'tax')
    .map((item: any, idx: number) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151;">${idx + 1}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827;">${item.description}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${item.quantity || 1}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">${fmt(item.unit_price || 0)}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">${fmt(item.total || (item.unit_price * (item.quantity || 1)))}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    body { background: #fff; color: #111827; font-size: 14px; line-height: 1.5; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #10B981; }
    .logo { font-size: 32px; font-weight: 800; color: #10B981; letter-spacing: -1px; }
    .logo span { color: #374151; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #111827; margin-bottom: 4px; }
    .invoice-title .number { font-size: 16px; color: #6b7280; }
    .status { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase; color: white; background: ${statusColor}; margin-top: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
    .info-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
    .info-block p { color: #374151; margin-bottom: 4px; }
    .info-block .value { font-weight: 600; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead th { background: #f9fafb; padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
    thead th:nth-child(3) { text-align: center; }
    thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; }
    .totals-table .row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-table .row.subtotal { border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .totals-table .row .label { color: #6b7280; }
    .totals-table .row .amount { font-weight: 600; color: #111827; }
    .totals-table .row.grand-total { border-top: 2px solid #10B981; margin-top: 8px; padding-top: 12px; }
    .totals-table .row.grand-total .label { font-size: 16px; font-weight: 700; color: #111827; }
    .totals-table .row.grand-total .amount { font-size: 18px; font-weight: 800; color: #10B981; }
    .notes { margin-top: 30px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #10B981; }
    .notes h4 { color: #374151; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .notes p { color: #6b7280; font-size: 13px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin-bottom: 4px; }
    .footer .brand { font-weight: 700; color: #10B981; }
    @media print { body { background: white; } .container { padding: 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">Den<span>to</span></div>
        <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Dental Practice Management Platform</p>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="number">${invoice.invoice_number}</div>
        <div class="status">${invoice.status}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-block">
        <h3>Bill To</h3>
        <p class="value">${tenant?.name || 'Tenant'}</p>
        <p>${tenant?.owner_email || ''}</p>
        <p>${tenant?.billing_email || ''}</p>
        ${tenant?.address ? `<p>${tenant.address}</p>` : ''}
      </div>
      <div class="info-block" style="text-align: right;">
        <h3>Invoice Details</h3>
        <p><strong>Issue Date:</strong> ${formatDate(invoice.issue_date)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
        <p><strong>Period:</strong> ${formatDate(invoice.billing_period_start)} – ${formatDate(invoice.billing_period_end)}</p>
        <p><strong>Currency:</strong> ${curr}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 120px;">Unit Price</th>
          <th style="text-align: right; width: 120px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-table">
        <div class="row subtotal">
          <span class="label">Subtotal</span>
          <span class="amount">${fmt(invoice.subtotal || 0)}</span>
        </div>
        ${(invoice.discount_amount || 0) > 0 ? `
        <div class="row">
          <span class="label">Discount</span>
          <span class="amount" style="color: #ef4444;">-${fmt(invoice.discount_amount)}</span>
        </div>` : ''}
        ${(invoice.tax_amount || 0) > 0 ? `
        <div class="row">
          <span class="label">Tax/VAT</span>
          <span class="amount">${fmt(invoice.tax_amount)}</span>
        </div>` : ''}
        <div class="row grand-total">
          <span class="label">Total Due</span>
          <span class="amount">${fmt(invoice.total || 0)}</span>
        </div>
      </div>
    </div>

    ${invoice.notes ? `
    <div class="notes">
      <h4>Notes</h4>
      <p>${invoice.notes}</p>
    </div>` : ''}

    ${invoice.status === 'paid' ? `
    <div style="margin-top: 30px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
      <h4 style="color: #166534; margin-bottom: 4px;">✓ Payment Received</h4>
      <p style="color: #15803d; font-size: 13px;">Paid on ${formatDate(invoice.paid_at)} via ${invoice.payment_method || 'N/A'}</p>
    </div>` : ''}

    ${['pending', 'overdue'].includes(invoice.status) ? `
    <div style="margin-top: 30px; padding: 16px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
      <h4 style="color: #991b1b; margin-bottom: 4px;">⚠ Payment ${invoice.status === 'overdue' ? 'Overdue' : 'Due'}</h4>
      <p style="color: #b91c1c; font-size: 13px;">Please make payment by ${formatDate(invoice.due_date)}</p>
    </div>` : ''}

    <div class="footer">
      <p class="brand">Dento Platform</p>
      <p>This is a computer-generated invoice. No signature required.</p>
      <p>For questions, contact ${Deno.env.get('SUPPORT_EMAIL') || 'support@dento.app'}</p>
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// Clinic Patient Invoice HTML (original functionality preserved)
// ═══════════════════════════════════════════════════════════════
function generateClinicInvoiceHTML(invoice: any, clinic: any): string {
  const items = invoice.invoice_items || [];
  const patient = invoice.patients;
  const doctor = invoice.doctors;
  const branch = invoice.branches;
  const curr = clinic?.currency || 'SAR';
  const fmt = (v: number) => formatCurrency(v, curr);

  const itemRows = items.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description || item.services?.name_en || 'Service'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${fmt(item.unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.discount_percent || 0}%</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${fmt(item.total_amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice #${invoice.invoice_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Helvetica Neue', Arial, sans-serif; }
  body { background: #f3f4f6; padding: 40px; }
  .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
  .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 40px; }
  .header h1 { font-size: 28px; margin-bottom: 8px; }
  .info { display: flex; justify-content: space-between; padding: 30px 40px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .info-block h3 { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .info-block p { color: #111827; font-size: 14px; line-height: 1.6; }
  .info-block strong { font-size: 16px; color: #10B981; }
  .content { padding: 40px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #374151; border-bottom: 2px solid #e5e7eb; }
  .totals { border-top: 2px solid #e5e7eb; padding-top: 20px; }
  .total-row { display: flex; justify-content: flex-end; margin-bottom: 8px; }
  .total-row .label { width: 150px; text-align: right; padding-right: 20px; color: #6b7280; }
  .total-row .value { width: 150px; text-align: right; font-weight: 600; color: #111827; }
  .total-row.grand { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
  .total-row.grand .label, .total-row.grand .value { font-size: 18px; color: #10B981; }
  .footer { text-align: center; padding: 30px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
  .footer p { color: #6b7280; font-size: 13px; margin-bottom: 5px; }
  @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
</style></head><body>
<div class="container">
  <div class="header">
    <h1>${clinic?.name || 'Dental Clinic'}</h1>
    <p>${branch?.name_en || ''}</p>
    <p>${branch?.address || clinic?.address || ''}</p>
  </div>
  <div class="info">
    <div class="info-block">
      <h3>Invoice To</h3>
      <p><strong>${patient?.full_name || 'Patient'}</strong></p>
      <p>${patient?.email || ''}</p>
      <p>${patient?.phone || ''}</p>
    </div>
    <div class="info-block">
      <h3>Invoice Details</h3>
      <p><strong>#${invoice.invoice_number}</strong></p>
      <p>Date: ${formatDate(invoice.created_at)}</p>
      ${invoice.due_date ? `<p>Due: ${formatDate(invoice.due_date)}</p>` : ''}
    </div>
    ${doctor ? `<div class="info-block"><h3>Attending Doctor</h3><p><strong>Dr. ${doctor?.users?.full_name || 'N/A'}</strong></p><p>${doctor?.specialization_en || ''}</p></div>` : ''}
  </div>
  <div class="content">
    <table><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Discount</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
    <div class="totals">
      <div class="total-row"><span class="label">Subtotal</span><span class="value">${fmt(invoice.subtotal || invoice.total_amount)}</span></div>
      ${invoice.discount_amount > 0 ? `<div class="total-row"><span class="label">Discount</span><span class="value">-${fmt(invoice.discount_amount)}</span></div>` : ''}
      ${invoice.tax_amount > 0 ? `<div class="total-row"><span class="label">VAT (${invoice.tax_rate || 15}%)</span><span class="value">${fmt(invoice.tax_amount)}</span></div>` : ''}
      <div class="total-row grand"><span class="label">Total</span><span class="value">${fmt(invoice.total_amount || invoice.total)}</span></div>
      ${invoice.paid_amount > 0 ? `
      <div class="total-row"><span class="label">Paid</span><span class="value" style="color: #22c55e;">-${fmt(invoice.paid_amount)}</span></div>
      <div class="total-row"><span class="label">Balance</span><span class="value" style="color: ${(invoice.total_amount - invoice.paid_amount) > 0 ? '#ef4444' : '#22c55e'};">${fmt(invoice.total_amount - invoice.paid_amount)}</span></div>` : ''}
    </div>
    <div style="margin-top:30px;padding:20px;background:${invoice.status === 'paid' ? '#f0fdf4' : '#fef2f2'};border-radius:8px;border-left:4px solid ${invoice.status === 'paid' ? '#22c55e' : '#ef4444'}">
      <h4 style="color:${invoice.status === 'paid' ? '#166534' : '#991b1b'};margin-bottom:8px">${invoice.status === 'paid' ? '✓ Payment Received' : '⚠ Payment Due'}</h4>
      <p style="color:${invoice.status === 'paid' ? '#166534' : '#991b1b'};font-size:14px">${invoice.status === 'paid' ? 'Thank you for your payment!' : `Please make payment by ${invoice.due_date ? formatDate(invoice.due_date) : 'the due date'}.`}</p>
    </div>
    ${invoice.notes ? `<div style="margin-top:20px;padding:15px;background:#f9fafb;border-radius:8px"><h4 style="color:#374151;margin-bottom:8px">Notes</h4><p style="color:#6b7280;font-size:14px">${invoice.notes}</p></div>` : ''}
  </div>
  <div class="footer"><p><strong>${clinic?.name || 'Dental Clinic'}</strong></p><p>${clinic?.phone || ''} | ${clinic?.email || ''}</p><p>Thank you for choosing us!</p></div>
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const invoiceType = url.searchParams.get('type') || 'clinic';

    const body = await req.json();
    const { invoiceId, format = 'html' } = body;

    if (!invoiceId) {
      throw new Error('invoiceId is required');
    }

    let html: string;

    if (invoiceType === 'saas') {
      // ─── SaaS Platform Invoice ───
      const { data: invoice, error: invError } = await supabase
        .from('saas_invoices')
        .select(`
          *,
          saas_invoice_items (*),
          tenants (id, name, owner_email, billing_email, address, currency_code, settings)
        `)
        .eq('id', invoiceId)
        .single();

      if (invError || !invoice) throw new Error(`SaaS invoice not found: ${invError?.message || 'no data'}`);

      html = generateSaasInvoiceHTML(invoice, invoice.tenants);

    } else {
      // ─── Clinic Patient Invoice (backward compatible) ───
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select(`
          *,
          patients (id, full_name, email, phone, address),
          doctors (id, specialization_en, users (full_name)),
          branches (id, name_en, name_ar, address, phone),
          invoice_items (id, description, quantity, unit_price, discount_percent, total_amount, services (id, name_en, name_ar))
        `)
        .eq('id', invoiceId)
        .single();

      if (invError || !invoice) throw new Error(`Clinic invoice not found: ${invError?.message || 'no data'}`);

      const { data: settings } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['clinic_name', 'clinic_address', 'clinic_phone', 'clinic_email', 'currency']);

      const clinic = {
        name: settings?.find((s: any) => s.key === 'clinic_name')?.value || 'Dental Clinic',
        address: settings?.find((s: any) => s.key === 'clinic_address')?.value || '',
        phone: settings?.find((s: any) => s.key === 'clinic_phone')?.value || '',
        email: settings?.find((s: any) => s.key === 'clinic_email')?.value || '',
        currency: settings?.find((s: any) => s.key === 'currency')?.value || 'SAR',
      };

      html = generateClinicInvoiceHTML(invoice, clinic);
    }

    if (format === 'pdf') {
      // Return HTML with print-ready styles for client-side PDF generation via window.print()
      return new Response(JSON.stringify({
        success: true,
        html,
        instructions: 'Use window.print() or a PDF conversion service to generate PDF from this HTML',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return raw HTML
    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
