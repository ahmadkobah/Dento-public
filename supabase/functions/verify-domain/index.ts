// supabase/functions/verify-domain/index.ts
// Edge function for custom domain DNS verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface DomainVerification {
  domain: string;
  type: 'cname' | 'txt';
  expected_value: string;
  verified: boolean;
  verified_at?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !authData?.user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');
    const domain = url.searchParams.get('domain');

    if (!tenantId) {
      throw new Error('Tenant ID required');
    }

    // Verify user has access to tenant
    const { data: membership } = await supabaseClient
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', authData.user.id)
      .single();

    if (!membership || !['owner', 'admin', 'developer'].includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    switch (req.method) {
      case 'GET': {
        // Get current domain verification status
        const { data: tenant } = await supabaseClient
          .from('tenants')
          .select('slug')
          .eq('id', tenantId)
          .single();

        if (!tenant) throw new Error('Tenant not found');

        // Get all domains for this tenant
        const { data: domains } = await supabaseClient
          .from('domains')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('created_at');

        const primaryDomain = domains?.find(d => d.is_primary);

        return new Response(JSON.stringify({
          subdomain: `${tenant.slug}.dento.app`,
          domains: domains || [],
          primary_domain: primaryDomain?.domain || null,
          verified: primaryDomain?.dns_verified || false,
          dns_instructions: primaryDomain 
            ? getDnsInstructions(primaryDomain.domain, primaryDomain.dns_verification_token)
            : null,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'POST': {
        // Initiate domain verification
        if (!domain) throw new Error('Domain required');

        // Validate domain format
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
        if (!domainRegex.test(domain)) {
          throw new Error('Invalid domain format');
        }

        // Check if domain is already in use by another tenant
        const { data: existing } = await supabaseClient
          .from('domains')
          .select('id, tenant_id')
          .eq('domain', domain)
          .neq('tenant_id', tenantId)
          .single();

        if (existing) {
          throw new Error('This domain is already in use by another clinic');
        }

        // Generate verification token
        const verificationToken = `dento-verify-${crypto.randomUUID()}`;

        // Check if domain already exists for this tenant (re-adding)
        const { data: existingForTenant } = await supabaseClient
          .from('domains')
          .select('id')
          .eq('domain', domain)
          .eq('tenant_id', tenantId)
          .single();

        let data;
        if (existingForTenant) {
          // Update existing domain record
          const { data: updated, error } = await supabaseClient
            .from('domains')
            .update({
              dns_verified: false,
              dns_verification_token: verificationToken,
              dns_last_checked_at: null,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingForTenant.id)
            .select()
            .single();
          if (error) throw error;
          data = updated;
        } else {
          // Insert new domain record
          const { data: inserted, error } = await supabaseClient
            .from('domains')
            .insert({
              tenant_id: tenantId,
              domain,
              domain_type: 'custom',
              dns_verified: false,
              dns_verification_token: verificationToken,
              dns_record_type: 'CNAME',
              dns_record_value: 'websites.dento.app',
              ssl_status: 'pending',
              is_active: true,
              is_primary: false,
            })
            .select()
            .single();
          if (error) throw error;
          data = inserted;
        }

        // Also update tenants.custom_domain for backward compatibility
        await supabaseClient
          .from('tenants')
          .update({
            custom_domain: domain,
            domain_verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenantId);

        return new Response(JSON.stringify({
          domain_id: data.id,
          domain,
          verification_token: verificationToken,
          dns_instructions: getDnsInstructions(domain, verificationToken),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PATCH': {
        // Verify domain DNS
        const domainId = url.searchParams.get('domain_id');
        
        let domainRecord;
        if (domainId) {
          const { data } = await supabaseClient
            .from('domains')
            .select('*')
            .eq('id', domainId)
            .eq('tenant_id', tenantId)
            .single();
          domainRecord = data;
        } else if (domain) {
          const { data } = await supabaseClient
            .from('domains')
            .select('*')
            .eq('domain', domain)
            .eq('tenant_id', tenantId)
            .single();
          domainRecord = data;
        } else {
          // Fallback: get the first unverified domain
          const { data } = await supabaseClient
            .from('domains')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('dns_verified', false)
            .eq('is_active', true)
            .order('created_at')
            .limit(1)
            .single();
          domainRecord = data;
        }

        if (!domainRecord) {
          throw new Error('No domain configured');
        }

        // Perform DNS verification
        const verification = await verifyDomain(
          domainRecord.domain,
          domainRecord.dns_verification_token
        );

        // Update domain record
        await supabaseClient
          .from('domains')
          .update({
            dns_verified: verification.verified,
            dns_verified_at: verification.verified ? new Date().toISOString() : null,
            dns_last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', domainRecord.id);

        // Also update tenants table for backward compatibility
        if (verification.verified) {
          await supabaseClient
            .from('tenants')
            .update({
              domain_verified: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenantId);
        }

        return new Response(JSON.stringify(verification), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        // Remove custom domain
        const deleteDomainId = url.searchParams.get('domain_id');
        
        if (deleteDomainId) {
          await supabaseClient
            .from('domains')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', deleteDomainId)
            .eq('tenant_id', tenantId);
        } else if (domain) {
          await supabaseClient
            .from('domains')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('domain', domain)
            .eq('tenant_id', tenantId);
        }

        // Check if this was the tenants.custom_domain
        const { data: remainingDomains } = await supabaseClient
          .from('domains')
          .select('domain')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .eq('dns_verified', true)
          .limit(1);

        // Update tenants table
        await supabaseClient
          .from('tenants')
          .update({
            custom_domain: remainingDomains?.[0]?.domain || null,
            domain_verified: (remainingDomains?.length || 0) > 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenantId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Method not allowed');
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    });
  }
});

async function verifyDomain(domain: string, token: string): Promise<DomainVerification> {
  const results: DomainVerification = {
    domain,
    type: 'cname',
    expected_value: 'websites.dento.app',
    verified: false,
  };

  try {
    // Check CNAME record
    const cnameResponse = await fetch(
      `https://dns.google/resolve?name=${domain}&type=CNAME`
    );
    const cnameData = await cnameResponse.json();

    if (cnameData.Answer) {
      const cnameRecord = cnameData.Answer.find(
        (a: any) => a.type === 5 && a.data.includes('dento.app')
      );
      if (cnameRecord) {
        results.verified = true;
        results.verified_at = new Date().toISOString();
      }
    }

    // Check TXT record for verification token if CNAME not found
    if (!results.verified) {
      results.type = 'txt';
      results.expected_value = token;

      const txtResponse = await fetch(
        `https://dns.google/resolve?name=_dento-verification.${domain}&type=TXT`
      );
      const txtData = await txtResponse.json();

      if (txtData.Answer) {
        const txtRecord = txtData.Answer.find(
          (a: any) => a.type === 16 && a.data.includes(token)
        );
        if (txtRecord) {
          results.verified = true;
          results.verified_at = new Date().toISOString();
        }
      }
    }
  } catch (err) {
    console.error('DNS verification error:', err);
  }

  return results;
}

function getDnsInstructions(domain: string, token?: string) {
  return {
    cname: {
      type: 'CNAME',
      name: domain,
      value: 'websites.dento.app',
      description: 'Point your domain to Dento websites',
    },
    txt: {
      type: 'TXT',
      name: `_dento-verification.${domain}`,
      value: token || 'Will be generated',
      description: 'Verify domain ownership',
    },
    note: 'DNS changes can take up to 48 hours to propagate',
  };
}
