// Supabase Edge Function: send-notification
// Handles sending notifications via WhatsApp, Email, or SMS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationPayload {
  type: string;
  channel: 'whatsapp' | 'email' | 'sms';
  recipient: string;
  template: string;
  variables: Record<string, string>;
  appointment_id?: string;
}

// Replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  return result;
}

// Send WhatsApp message via WhatsApp Business API
async function sendWhatsApp(recipient: string, message: string): Promise<{ success: boolean; error?: string }> {
  // WhatsApp Business API configuration
  const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
  const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID');

  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log('WhatsApp not configured, simulating send...');
    // Simulate success for development
    return { success: true };
  }

  try {
    // Format phone number (remove +, spaces, dashes)
    const formattedPhone = recipient.replace(/[\s\-\+]/g, '');

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: message }
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'WhatsApp API error');
    }

    return { success: true };
  } catch (error) {
    console.error('WhatsApp error:', error);
    return { success: false, error: error.message };
  }
}

// Send email via Resend or SMTP
async function sendEmail(
  recipient: string, 
  subject: string, 
  body: string
): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'notifications@dento.clinic';

  if (!RESEND_API_KEY) {
    console.log('Email not configured, simulating send...');
    return { success: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipient,
        subject: subject,
        text: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Email API error');
    }

    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error: error.message };
  }
}

// Send SMS via Twilio or other provider
async function sendSMS(recipient: string, message: string): Promise<{ success: boolean; error?: string }> {
  const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_PHONE) {
    console.log('SMS not configured, simulating send...');
    return { success: true };
  }

  try {
    const formattedPhone = recipient.replace(/[\s\-]/g, '');
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE,
          Body: message,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'SMS API error');
    }

    return { success: true };
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: NotificationPayload = await req.json();
    const { type, channel, recipient, template, variables, appointment_id } = payload;

    if (!recipient || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: recipient, template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Replace variables in template
    const message = replaceVariables(template, variables);

    let result: { success: boolean; error?: string };

    // Send based on channel
    switch (channel) {
      case 'whatsapp':
        result = await sendWhatsApp(recipient, message);
        break;
      case 'email':
        const emailSubject = variables.subject || 'Notification from Dento';
        result = await sendEmail(recipient, emailSubject, message);
        break;
      case 'sms':
        result = await sendSMS(recipient, message);
        break;
      default:
        result = { success: false, error: 'Invalid channel' };
    }

    // Log the notification attempt
    await supabase.from('notification_logs').insert({
      type,
      channel,
      recipient,
      message: message.substring(0, 500), // Truncate long messages
      status: result.success ? 'delivered' : 'failed',
      error: result.error || null,
      appointment_id: appointment_id || null,
      created_at: new Date().toISOString(),
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error, success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
