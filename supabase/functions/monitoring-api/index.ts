// supabase/functions/monitoring-api/index.ts
// Edge function for error monitoring, health checks, and alerts

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
      throw new Error('Only developers can access monitoring data');
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'error_stats';
    const method = req.method;

    // GET requests
    if (method === 'GET') {
      switch (type) {
        case 'error_stats': {
          // Get error statistics
          const tenantId = url.searchParams.get('tenant_id');
          const days = parseInt(url.searchParams.get('days') || '7');
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

          let query = supabase
            .from('error_logs')
            .select('severity, status, error_type', { count: 'exact' })
            .gte('created_at', since);

          if (tenantId) query = query.eq('tenant_id', tenantId);

          const { data: errors, count } = await query;

          // Aggregate stats
          const stats = {
            total: count || 0,
            unresolved: errors?.filter(e => e.status === 'unresolved').length || 0,
            critical: errors?.filter(e => e.severity === 'critical').length || 0,
            byType: {},
            bySeverity: {},
          };

          errors?.forEach(e => {
            stats.byType[e.error_type] = (stats.byType[e.error_type] || 0) + 1;
            stats.bySeverity[e.severity] = (stats.bySeverity[e.severity] || 0) + 1;
          });

          return new Response(JSON.stringify({ stats }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'errors': {
          // List errors with pagination
          const tenantId = url.searchParams.get('tenant_id');
          const status = url.searchParams.get('status');
          const severity = url.searchParams.get('severity');
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const offset = (page - 1) * limit;

          let query = supabase
            .from('error_logs')
            .select(`
              *,
              tenants (name, slug)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (tenantId) query = query.eq('tenant_id', tenantId);
          if (status) query = query.eq('status', status);
          if (severity) query = query.eq('severity', severity);

          const { data: errors, error, count } = await query;
          if (error) throw error;

          return new Response(JSON.stringify({ 
            errors, 
            total: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'error': {
          // Get single error details
          const id = url.searchParams.get('id');
          if (!id) throw new Error('Error ID required');

          const { data: error, error: dbError } = await supabase
            .from('error_logs')
            .select(`
              *,
              tenants (name, slug, owner_email)
            `)
            .eq('id', id)
            .single();

          if (dbError) throw dbError;

          return new Response(JSON.stringify({ error }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'health': {
          // Get system health status
          const { data: checks, error } = await supabase
            .from('health_checks')
            .select('*')
            .order('check_name');

          if (error) throw error;

          // Calculate overall health
          const overall = checks?.every(c => c.status === 'healthy') 
            ? 'healthy' 
            : checks?.some(c => c.status === 'unhealthy') 
              ? 'unhealthy' 
              : 'degraded';

          return new Response(JSON.stringify({ 
            overall,
            checks,
            lastUpdated: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'health_history': {
          // Get health check history
          const checkName = url.searchParams.get('check_name');
          const days = parseInt(url.searchParams.get('days') || '7');
          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

          let query = supabase
            .from('health_checks')
            .select('*')
            .gte('created_at', since)
            .order('created_at', { ascending: false });

          if (checkName) query = query.eq('check_name', checkName);

          const { data: history, error } = await query;
          if (error) throw error;

          return new Response(JSON.stringify({ history }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'alerts': {
          // List alerts
          const status = url.searchParams.get('status');
          const severity = url.searchParams.get('severity');
          const limit = parseInt(url.searchParams.get('limit') || '50');

          let query = supabase
            .from('alerts')
            .select(`
              *,
              tenants (name, slug)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (status) query = query.eq('status', status);
          if (severity) query = query.eq('severity', severity);

          const { data: alerts, error } = await query;
          if (error) throw error;

          return new Response(JSON.stringify({ alerts }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        case 'incidents': {
          // List incidents (from alerts with severity critical)
          const status = url.searchParams.get('status');
          const limit = parseInt(url.searchParams.get('limit') || '20');

          let query = supabase
            .from('alerts')
            .select(`
              *,
              tenants (name, slug)
            `)
            .eq('severity', 'critical')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (status) query = query.eq('status', status);

          const { data: incidents, error } = await query;
          if (error) throw error;

          return new Response(JSON.stringify({ incidents }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        default:
          throw new Error(`Unknown type: ${type}`);
      }
    }

    // PUT - Update error or alert status
    if (method === 'PUT') {
      const body = await req.json();
      const { id, type: entityType, ...updates } = body;

      if (!id) throw new Error('ID required');

      if (entityType === 'alert') {
        // Update alert
        const updateData: any = { ...updates };
        if (updates.status === 'acknowledged') {
          updateData.acknowledged_by = user.id;
          updateData.acknowledged_at = new Date().toISOString();
        } else if (updates.status === 'resolved') {
          updateData.resolved_by = user.id;
          updateData.resolved_at = new Date().toISOString();
        }

        const { data: alert, error } = await supabase
          .from('alerts')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ alert }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Update error
        const updateData: any = { ...updates };
        if (updates.status === 'resolved') {
          updateData.resolved_by = user.id;
          updateData.resolved_at = new Date().toISOString();
        }
        if (updates.assigned_to) {
          updateData.assigned_to = updates.assigned_to;
        }

        const { data: error, error: dbError } = await supabase
          .from('error_logs')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (dbError) throw dbError;
        return new Response(JSON.stringify({ error }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // POST - Create alert or log error
    if (method === 'POST') {
      const body = await req.json();
      
      if (body.type === 'alert') {
        const { data: alert, error } = await supabase
          .from('alerts')
          .insert({
            tenant_id: body.tenant_id,
            alert_type: body.alert_type,
            severity: body.severity || 'warning',
            title: body.title,
            description: body.description,
            status: 'active',
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ alert }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      } else {
        // Log error
        const { data: errorLog, error } = await supabase
          .from('error_logs')
          .insert({
            tenant_id: body.tenant_id,
            error_type: body.error_type || 'unknown',
            error_message: body.message,
            error_stack: body.stack,
            severity: body.severity || 'error',
            url: body.url,
            user_id: body.user_id,
            environment: body.environment || 'production',
            status: 'unresolved',
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ error: errorLog }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }
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
