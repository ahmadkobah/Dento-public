// supabase/functions/webhooks-api/index.ts
// Edge function for webhook management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Issue #5: SSRF Prevention - Validate webhook URLs
function isValidWebhookUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Must use HTTPS
    if (url.protocol !== 'https:') {
      return { valid: false, error: 'Webhook URL must use HTTPS' };
    }
    
    // Block localhost and loopback
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { valid: false, error: 'Localhost URLs are not allowed' };
    }
    
    // Block private/internal IP ranges
    const ipParts = hostname.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every(n => !isNaN(n))) {
      // 10.0.0.0/8
      if (ipParts[0] === 10) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
      // 172.16.0.0/12
      if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
      // 192.168.0.0/16
      if (ipParts[0] === 192 && ipParts[1] === 168) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
      // 169.254.0.0/16 (link-local)
      if (ipParts[0] === 169 && ipParts[1] === 254) {
        return { valid: false, error: 'Link-local addresses are not allowed' };
      }
    }
    
    // Block internal service names
    const blockedHostnames = ['internal', 'metadata', 'kubernetes', 'docker', 'host.docker.internal'];
    if (blockedHostnames.some(h => hostname.includes(h))) {
      return { valid: false, error: 'Internal hostnames are not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Issue #8: Hash webhook secrets before storage
async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    // Check developer or admin role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['developer', 'admin'].includes(profile.role)) {
      throw new Error('Only developers and admins can manage webhooks');
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET requests
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      const id = url.searchParams.get('id');
      const webhookId = url.searchParams.get('webhook_id');

      if (type === 'logs' && webhookId) {
        // Get delivery logs for a webhook
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        let query = supabase
          .from('webhook_logs')
          .select('*')
          .eq('webhook_id', webhookId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (status) query = query.eq('status', status);

        const { data: logs, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ logs }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (type === 'event_types') {
        // Get available event types
        const { data: eventTypes, error } = await supabase
          .from('webhook_event_types')
          .select('*')
          .eq('is_active', true)
          .order('category, event_name');

        if (error) throw error;

        // Group by category
        const byCategory: Record<string, any[]> = {};
        eventTypes?.forEach(et => {
          if (!byCategory[et.category]) byCategory[et.category] = [];
          byCategory[et.category].push(et);
        });

        return new Response(JSON.stringify({ eventTypes, byCategory }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (id) {
        // Get single webhook
        const { data: webhook, error } = await supabase
          .from('webhooks')
          .select(`
            *,
            tenants (id, name, slug)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ webhook }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List webhooks
      const tenantId = url.searchParams.get('tenant_id');
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('webhooks')
        .select(`
          *,
          tenants (id, name, slug)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (status) query = query.eq('status', status);

      const { data: webhooks, error, count } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ webhooks, total: count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create webhook or trigger action
    if (method === 'POST') {
      const body = await req.json();

      if (body.action === 'test') {
        // Test webhook by sending a test event
        const { id } = body;
        
        const { data: webhook } = await supabase
          .from('webhooks')
          .select('*')
          .eq('id', id)
          .single();

        if (!webhook) throw new Error('Webhook not found');

        // Send test request
        const testPayload = {
          event: 'test',
          timestamp: new Date().toISOString(),
          data: {
            message: 'This is a test webhook delivery from Dento',
            webhook_id: id,
          }
        };

        const startTime = Date.now();
        let responseStatus = 0;
        let responseBody = '';
        let errorMessage = '';

        try {
          const response = await fetch(webhook.url, {
            method: webhook.http_method || 'POST',
            headers: {
              'Content-Type': webhook.content_type || 'application/json',
              'X-Webhook-Event': 'test',
              'X-Webhook-Signature': 'test-signature',
              ...webhook.headers,
            },
            body: JSON.stringify(testPayload),
          });

          responseStatus = response.status;
          responseBody = await response.text();
        } catch (err: any) {
          errorMessage = err.message;
        }

        const responseTime = Date.now() - startTime;
        const success = responseStatus >= 200 && responseStatus < 300;

        // Log the test
        await supabase.from('webhook_logs').insert({
          webhook_id: id,
          tenant_id: webhook.tenant_id,
          event_type: 'test',
          event_id: `test-${Date.now()}`,
          request_url: webhook.url,
          request_method: webhook.http_method || 'POST',
          request_body: testPayload,
          response_status: responseStatus,
          response_body: responseBody,
          response_time_ms: responseTime,
          status: success ? 'success' : 'failed',
          error_message: errorMessage,
        });

        return new Response(JSON.stringify({ 
          success,
          responseStatus,
          responseTime,
          responseBody: responseBody.substring(0, 1000),
          error: errorMessage
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (body.action === 'retry') {
        // Retry a failed delivery
        const { log_id } = body;
        
        const { data: log } = await supabase
          .from('webhook_logs')
          .select(`
            *,
            webhooks (*)
          `)
          .eq('id', log_id)
          .single();

        if (!log) throw new Error('Log not found');
        if (!log.webhooks) throw new Error('Webhook not found');

        const webhook = log.webhooks;
        const startTime = Date.now();
        let responseStatus = 0;
        let responseBody = '';
        let errorMessage = '';

        try {
          const response = await fetch(webhook.url, {
            method: webhook.http_method || 'POST',
            headers: {
              'Content-Type': webhook.content_type || 'application/json',
              'X-Webhook-Event': log.event_type,
              ...webhook.headers,
            },
            body: JSON.stringify(log.request_body),
          });

          responseStatus = response.status;
          responseBody = await response.text();
        } catch (err: any) {
          errorMessage = err.message;
        }

        const responseTime = Date.now() - startTime;
        const success = responseStatus >= 200 && responseStatus < 300;

        // Create new log entry for retry
        const { data: newLog, error } = await supabase
          .from('webhook_logs')
          .insert({
            webhook_id: log.webhook_id,
            tenant_id: log.tenant_id,
            event_type: log.event_type,
            event_id: log.event_id,
            request_url: webhook.url,
            request_method: webhook.http_method || 'POST',
            request_body: log.request_body,
            response_status: responseStatus,
            response_body: responseBody,
            response_time_ms: responseTime,
            status: success ? 'success' : 'failed',
            attempt_number: (log.attempt_number || 1) + 1,
            error_message: errorMessage,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success,
          log: newLog
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create new webhook
      // Issue #5: Validate webhook URL to prevent SSRF
      const urlValidation = isValidWebhookUrl(body.url);
      if (!urlValidation.valid) {
        throw new Error(urlValidation.error || 'Invalid webhook URL');
      }
      
      // Generate secret and hash it for storage
      const secret = crypto.randomUUID();
      const secretHash = await hashSecret(secret);
      
      const { data: webhook, error } = await supabase
        .from('webhooks')
        .insert({
          tenant_id: body.tenant_id,
          name: body.name,
          description: body.description,
          url: body.url,
          secret: secretHash, // Issue #8: Store hashed secret
          auth_type: body.auth_type || 'signature',
          events: body.events,
          http_method: body.http_method || 'POST',
          content_type: body.content_type || 'application/json',
          headers: body.headers || {},
          timeout_seconds: body.timeout_seconds || 30,
          retry_enabled: body.retry_enabled !== false,
          max_retries: body.max_retries || 3,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: body.tenant_id,
        actor_id: user.id,
        action: 'webhook.created',
        resource_type: 'webhook',
        resource_id: webhook.id,
        new_values: { name: body.name, url: body.url, events: body.events },
      });

      return new Response(JSON.stringify({ 
        webhook,
        secret, // Only returned once
        warning: 'Store this secret securely. It will not be shown again.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // PUT - Update webhook
    if (method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) throw new Error('Webhook ID required');

      // Don't allow updating secret through regular update
      delete updates.secret;

      // Issue #5: Validate new URL if being updated
      if (updates.url) {
        const urlValidation = isValidWebhookUrl(updates.url);
        if (!urlValidation.valid) {
          throw new Error(urlValidation.error || 'Invalid webhook URL');
        }
      }

      // If re-enabling, reset failure counters
      if (updates.status === 'active') {
        updates.consecutive_failures = 0;
        updates.disabled_at = null;
        updates.disabled_reason = null;
      }

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: webhook.tenant_id,
        actor_id: user.id,
        action: 'webhook.updated',
        resource_type: 'webhook',
        resource_id: id,
        new_values: updates,
      });

      return new Response(JSON.stringify({ webhook }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete webhook
    if (method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) throw new Error('Webhook ID required');

      const { data: webhook } = await supabase
        .from('webhooks')
        .select('tenant_id, name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: webhook?.tenant_id,
        actor_id: user.id,
        action: 'webhook.deleted',
        resource_type: 'webhook',
        resource_id: id,
        old_values: { name: webhook?.name },
      });

      return new Response(JSON.stringify({ success: true }), {
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
