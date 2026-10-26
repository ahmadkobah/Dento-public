// supabase/functions/vercel-domain/index.ts
// Edge function to manage custom domains on Vercel
//
// Environment variables required:
//   VERCEL_TOKEN       – A Vercel personal access token
//   VERCEL_PROJECT_ID  – The Vercel project ID for the Dento frontend
//   VERCEL_TEAM_ID     – (optional) Vercel team/org ID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const VERCEL_API = 'https://api.vercel.com';

function vercelHeaders() {
  const token = Deno.env.get('VERCEL_TOKEN');
  if (!token) throw new Error('VERCEL_TOKEN not configured');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function teamQuery(): string {
  const teamId = Deno.env.get('VERCEL_TEAM_ID');
  return teamId ? `?teamId=${teamId}` : '';
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

    // Check developer role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'developer') {
      throw new Error('Only developers can manage Vercel domains');
    }

    const projectId = Deno.env.get('VERCEL_PROJECT_ID');
    if (!projectId) throw new Error('VERCEL_PROJECT_ID not configured');

    const body = req.method !== 'GET' ? await req.json() : {};
    const url = new URL(req.url);

    // ── POST: Add domain to Vercel project ──
    if (req.method === 'POST') {
      const { domain_id } = body;
      if (!domain_id) throw new Error('domain_id is required');

      // Get domain from DB
      const { data: domainRecord, error: dbErr } = await supabase
        .from('domains')
        .select('*')
        .eq('id', domain_id)
        .single();
      if (dbErr || !domainRecord) throw new Error('Domain not found');

      // Add to Vercel
      const vercelRes = await fetch(
        `${VERCEL_API}/v10/projects/${projectId}/domains${teamQuery()}`,
        {
          method: 'POST',
          headers: vercelHeaders(),
          body: JSON.stringify({ name: domainRecord.domain }),
        }
      );

      const vercelData = await vercelRes.json();

      if (!vercelRes.ok) {
        // If domain already exists, treat as success
        if (vercelData?.error?.code === 'domain_already_exists') {
          // Domain is already on the project, skip
        } else {
          throw new Error(
            `Vercel API error: ${vercelData?.error?.message || vercelRes.statusText}`
          );
        }
      }

      // Update DB with Vercel status
      await supabase
        .from('domains')
        .update({
          vercel_project_id: projectId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', domain_id);

      // Log audit
      await supabase.from('saas_audit_trail').insert({
        tenant_id: domainRecord.tenant_id,
        actor_id: user.id,
        action: 'domain.vercel_added',
        resource_type: 'domain',
        resource_id: domain_id,
        new_values: { domain: domainRecord.domain, vercel_project_id: projectId },
      });

      return new Response(
        JSON.stringify({
          success: true,
          domain: domainRecord.domain,
          vercel: vercelData,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // ── GET: Check domain config on Vercel ──
    if (req.method === 'GET') {
      const domain = url.searchParams.get('domain');
      if (!domain) throw new Error('domain query param required');

      const vercelRes = await fetch(
        `${VERCEL_API}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`,
        { headers: vercelHeaders() }
      );

      const vercelData = await vercelRes.json();

      return new Response(JSON.stringify({ domain, vercel: vercelData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DELETE: Remove domain from Vercel project ──
    if (req.method === 'DELETE') {
      const { domain_id } = body;
      if (!domain_id) throw new Error('domain_id is required');

      const { data: domainRecord } = await supabase
        .from('domains')
        .select('domain, tenant_id')
        .eq('id', domain_id)
        .single();
      if (!domainRecord) throw new Error('Domain not found');

      const vercelRes = await fetch(
        `${VERCEL_API}/v9/projects/${projectId}/domains/${domainRecord.domain}${teamQuery()}`,
        { method: 'DELETE', headers: vercelHeaders() }
      );

      if (!vercelRes.ok && vercelRes.status !== 404) {
        const err = await vercelRes.json();
        throw new Error(`Vercel API error: ${err?.error?.message || vercelRes.statusText}`);
      }

      // Update DB
      await supabase
        .from('domains')
        .update({
          vercel_project_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', domain_id);

      // Audit
      await supabase.from('saas_audit_trail').insert({
        tenant_id: domainRecord.tenant_id,
        actor_id: user.id,
        action: 'domain.vercel_removed',
        resource_type: 'domain',
        resource_id: domain_id,
        new_values: { domain: domainRecord.domain },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Method not allowed');
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    );
  }
});
