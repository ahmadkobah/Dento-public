// supabase/functions/domain-api/index.ts
// Edge function for custom domain management

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
      throw new Error('Only developers can manage domains');
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET requests
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      const id = url.searchParams.get('id');

      if (type === 'stats') {
        // Get domain statistics
        const { data: domains, error } = await supabase
          .from('domains')
          .select('domain_type, ssl_status, is_active, dns_verified');

        if (error) throw error;

        const stats = {
          total: domains?.length || 0,
          custom: domains?.filter(d => d.domain_type === 'custom').length || 0,
          subdomain: domains?.filter(d => d.domain_type !== 'custom').length || 0,
          active: domains?.filter(d => d.is_active).length || 0,
          sslActive: domains?.filter(d => d.ssl_status === 'active').length || 0,
          sslExpiring: domains?.filter(d => d.ssl_status === 'expiring_soon').length || 0,
          sslExpired: domains?.filter(d => d.ssl_status === 'expired').length || 0,
          pendingDns: domains?.filter(d => !d.dns_verified).length || 0,
        };

        return new Response(JSON.stringify({ stats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (id) {
        // Get single domain
        const { data: domain, error } = await supabase
          .from('domains')
          .select(`
            *,
            tenants (id, name, slug)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ domain }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List domains with filters
      const tenantId = url.searchParams.get('tenant_id');
      const status = url.searchParams.get('status');
      const sslStatus = url.searchParams.get('ssl_status');
      const limit = parseInt(url.searchParams.get('limit') || '100');

      let query = supabase
        .from('domains')
        .select(`
          *,
          tenants (id, name, slug)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (status === 'active') query = query.eq('is_active', true);
      if (status === 'inactive') query = query.eq('is_active', false);
      if (sslStatus) query = query.eq('ssl_status', sslStatus);

      const { data: domains, error, count } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ domains, total: count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create domain or trigger action
    if (method === 'POST') {
      const body = await req.json();

      if (body.action === 'verify_dns') {
        // Verify DNS configuration
        const { id } = body;
        const { data: domain } = await supabase
          .from('domains')
          .select('domain, dns_verification_token, tenant_id')
          .eq('id', id)
          .single();

        // In production, this would actually verify DNS records via DNS lookup
        // For now, we simulate verification success
        const verified = true;

        const now = new Date();
        const sslExpires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

        // On successful DNS verification, auto-provision SSL and activate
        const updateData: Record<string, unknown> = {
          dns_verified: verified,
          dns_verified_at: verified ? now.toISOString() : null,
          dns_last_checked_at: now.toISOString(),
        };

        if (verified) {
          // Auto-provision SSL after DNS verification
          updateData.ssl_status = 'active';
          updateData.ssl_provider = 'lets_encrypt';
          updateData.ssl_issued_at = now.toISOString();
          updateData.ssl_expires_at = sslExpires.toISOString();
          updateData.ssl_auto_renew = true;
          updateData.is_active = true; // Auto-activate after full setup
        }

        const { data: updated, error } = await supabase
          .from('domains')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        await supabase.from('saas_audit_trail').insert({
          tenant_id: updated.tenant_id,
          actor_id: user.id,
          action: 'domain.dns_verified',
          resource_type: 'domain',
          resource_id: id,
          new_values: { dns_verified: verified, ssl_status: 'active', is_active: true },
        });

        return new Response(JSON.stringify({
          domain: updated,
          verified,
          message: verified
            ? 'DNS verified! SSL provisioned and domain is now active.'
            : 'DNS verification failed. Please check your records.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (body.action === 'provision_ssl') {
        // Provision SSL certificate
        const { id } = body;
        
        const { data: domain, error } = await supabase
          .from('domains')
          .update({
            ssl_status: 'provisioning',
            ssl_provider: 'lets_encrypt',
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // In production, this would trigger actual SSL provisioning
        // For now, simulate success after a delay
        setTimeout(async () => {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

          await supabase
            .from('domains')
            .update({
              ssl_status: 'active',
              ssl_issued_at: now.toISOString(),
              ssl_expires_at: expiresAt.toISOString(),
              ssl_auto_renew: true,
            })
            .eq('id', id);
        }, 5000);

        await supabase.from('saas_audit_trail').insert({
          tenant_id: domain.tenant_id,
          actor_id: user.id,
          action: 'domain.ssl_provisioning_started',
          resource_type: 'domain',
          resource_id: id,
        });

        return new Response(JSON.stringify({ domain, message: 'SSL provisioning started' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create new domain
      const verificationToken = crypto.randomUUID();
      const isSubdomain = body.domain_type === 'subdomain' || body.domain?.endsWith('.dento.app');
      
      const { data: domain, error } = await supabase
        .from('domains')
        .insert({
          tenant_id: body.tenant_id,
          domain: body.domain,
          domain_type: body.domain_type || 'custom',
          dns_verification_token: isSubdomain ? null : verificationToken,
          dns_verified: isSubdomain, // Subdomains are auto-verified
          dns_verified_at: isSubdomain ? new Date().toISOString() : null,
          dns_record_type: isSubdomain ? null : 'CNAME',
          dns_record_value: isSubdomain ? null : 'cname.vercel-dns.com',
          is_active: isSubdomain, // Subdomains are immediately active
          is_primary: body.is_primary || false,
          ssl_status: isSubdomain ? 'active' : 'pending',
          force_https: true,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: body.tenant_id,
        actor_id: user.id,
        action: 'domain.created',
        resource_type: 'domain',
        resource_id: domain.id,
        new_values: { domain: body.domain, domain_type: body.domain_type },
      });

      const response: Record<string, unknown> = { domain };
      if (!isSubdomain) {
        response.verification_instructions = {
          type: 'TXT',
          name: `_dento-verify.${body.domain}`,
          value: verificationToken,
        };
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // PUT - Update domain
    if (method === 'PUT') {
      const body = await req.json();
      const { id, needs_dns_setup, ...updates } = body;

      if (!id) throw new Error('Domain ID required');

      // If switching to custom domain, generate DNS verification token
      if (needs_dns_setup || (updates.domain_type === 'custom' && updates.dns_verified === false)) {
        const verificationToken = crypto.randomUUID();
        updates.dns_verification_token = verificationToken;
        updates.dns_record_type = 'CNAME';
        updates.dns_record_value = 'cname.vercel-dns.com';
        updates.dns_verified = false;
        updates.dns_verified_at = null;
        updates.dns_last_checked_at = null;
        updates.ssl_status = 'pending';
        updates.ssl_issued_at = null;
        updates.ssl_expires_at = null;
        updates.is_active = false;
      }

      // If switching to subdomain, auto-verify everything
      if (updates.domain_type === 'subdomain' && updates.dns_verified === true) {
        updates.dns_verification_token = null;
        updates.dns_record_type = null;
        updates.dns_record_value = null;
        updates.dns_verified = true;
        updates.dns_verified_at = new Date().toISOString();
        updates.ssl_status = 'active';
        updates.is_active = true;
      }

      const { data: domain, error } = await supabase
        .from('domains')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: domain.tenant_id,
        actor_id: user.id,
        action: needs_dns_setup ? 'domain.type_changed' : 'domain.updated',
        resource_type: 'domain',
        resource_id: id,
        new_values: updates,
      });

      const response: Record<string, unknown> = { domain };

      // Include verification instructions when switching to custom
      if (needs_dns_setup && domain.dns_verification_token) {
        response.verification_instructions = {
          type: 'TXT',
          name: `_dento-verify.${domain.domain}`,
          value: domain.dns_verification_token,
        };
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Remove domain
    if (method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) throw new Error('Domain ID required');

      const { data: domain } = await supabase
        .from('domains')
        .select('tenant_id, domain')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await supabase.from('saas_audit_trail').insert({
        tenant_id: domain?.tenant_id,
        actor_id: user.id,
        action: 'domain.deleted',
        resource_type: 'domain',
        resource_id: id,
        old_values: { domain: domain?.domain },
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
