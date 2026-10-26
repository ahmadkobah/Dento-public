// supabase/functions/deployment-api/index.ts
// Edge function for deployment management and version tracking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      throw new Error('Only developers can manage deployments');
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET requests
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      const id = url.searchParams.get('id');

      if (id) {
        // Get single deployment
        const { data: deployment, error } = await supabase
          .from('deployments')
          .select(`
            *,
            tenant_deployments (
              tenant_id,
              status,
              previous_version,
              current_version,
              health_check_passed,
              tenants (name, slug)
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ deployment }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (type === 'tenant_versions') {
        // Get current versions for all tenants
        const { data: tenants, error } = await supabase
          .from('tenants')
          .select(`
            id, name, slug, status,
            tenant_deployments (
              current_version,
              status,
              deployment_id,
              deployments (version, version_name, deployed_at: completed_at)
            )
          `)
          .eq('status', 'active')
          .order('name');

        if (error) throw error;

        // Transform to get latest version for each tenant
        // Get latest deployment version for comparison
        const { data: latestDeployment } = await supabase
          .from('deployments')
          .select('version')
          .eq('status', 'deployed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();

        const latestVersion = latestDeployment?.version || null;

        const versions = tenants?.map(t => {
          const latestDeploy = t.tenant_deployments
            ?.filter((td: any) => td.status === 'deployed')
            .sort((a: any, b: any) => 
              new Date(b.deployments?.deployed_at || 0).getTime() - 
              new Date(a.deployments?.deployed_at || 0).getTime()
            )[0];

          const currentVersion = latestDeploy?.current_version || null;
          
          return {
            tenant_id: t.id,
            tenant_name: t.name,
            tenant_slug: t.slug,
            current_version: currentVersion || 'unknown',
            version_name: latestDeploy?.deployments?.version_name || 'Unknown',
            deployed_at: latestDeploy?.deployments?.deployed_at,
            is_latest: !latestVersion || currentVersion === latestVersion,
          };
        });

        return new Response(JSON.stringify({ versions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List deployments with filters
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const page = parseInt(url.searchParams.get('page') || '1');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('deployments')
        .select(`
          *,
          tenant_deployments (count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);

      const { data: deployments, error, count } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ 
        deployments, 
        total: count,
        page,
        limit
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create deployment or trigger action
    if (method === 'POST') {
      const body = await req.json();

      if (body.action === 'rollback') {
        // Trigger rollback
        const { deployment_id, tenant_ids } = body;
        
        const { data: originalDeployment } = await supabase
          .from('deployments')
          .select('version, version_name')
          .eq('id', deployment_id)
          .single();

        // Create rollback deployment
        const { data: rollback, error } = await supabase
          .from('deployments')
          .insert({
            version: `rollback-${Date.now()}`,
            version_name: `Rollback to ${originalDeployment?.version_name}`,
            deployment_type: 'rollback',
            rollback_deployment_id: deployment_id,
            target_type: tenant_ids ? 'tenants' : 'all',
            target_tenants: tenant_ids,
            status: 'pending',
            deployed_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Log action
        await supabase.from('saas_audit_trail').insert({
          actor_id: user.id,
          action: 'deployment.rollback_initiated',
          resource_type: 'deployment',
          resource_id: rollback.id,
          new_values: { original_deployment_id: deployment_id, tenant_ids },
        });

        return new Response(JSON.stringify({ deployment: rollback }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      // Create new deployment
      const { data: deployment, error } = await supabase
        .from('deployments')
        .insert({
          version: body.version,
          version_name: body.version_name,
          commit_sha: body.commit_sha,
          branch: body.branch || 'main',
          release_notes: body.release_notes,
          changelog: body.changelog,
          deployment_type: body.deployment_type || 'standard',
          target_type: body.target_type || 'all',
          target_tenants: body.target_tenants,
          target_tiers: body.target_tiers,
          rollout_percentage: body.rollout_percentage || 100,
          status: body.scheduled_at ? 'pending' : 'building',
          scheduled_at: body.scheduled_at,
          deployed_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log action
      await supabase.from('saas_audit_trail').insert({
        actor_id: user.id,
        action: 'deployment.created',
        resource_type: 'deployment',
        resource_id: deployment.id,
        new_values: { version: deployment.version },
      });

      return new Response(JSON.stringify({ deployment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    // PUT - Update deployment status
    if (method === 'PUT') {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) throw new Error('Deployment ID required');

      const updateData: any = { ...updates };
      
      // Handle status transitions
      if (updates.status === 'deploying') {
        updateData.started_at = new Date().toISOString();
      } else if (updates.status === 'deployed') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: deployment, error } = await supabase
        .from('deployments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log action
      await supabase.from('saas_audit_trail').insert({
        actor_id: user.id,
        action: `deployment.${updates.status || 'updated'}`,
        resource_type: 'deployment',
        resource_id: id,
        new_values: updates,
      });

      return new Response(JSON.stringify({ deployment }), {
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
