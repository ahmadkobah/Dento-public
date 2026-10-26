// supabase/functions/audit-api/index.ts
// Edge function for audit log queries

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Escape special characters for PostgreSQL LIKE/ILIKE queries
const escapeSearchTerm = (term: string | null): string => {
  if (!term || typeof term !== 'string') return '';
  return term
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
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
      throw new Error('Only developers can access audit logs');
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET requests only
    if (method === 'GET') {
      const id = url.searchParams.get('id');
      const exportFormat = url.searchParams.get('export');

      if (id) {
        // Get single audit log entry
        const { data: log, error } = await supabase
          .from('saas_audit_trail')
          .select(`
            *,
            tenants (id, name, slug)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ log }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // List audit logs with filters
      const tenantId = url.searchParams.get('tenant_id');
      const actorId = url.searchParams.get('actor_id');
      const action = url.searchParams.get('action');
      const resourceType = url.searchParams.get('resource_type');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const search = url.searchParams.get('search');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('saas_audit_trail')
        .select(`
          *,
          tenants (id, name, slug)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (actorId) query = query.eq('actor_id', actorId);
      if (action) {
        const safeAction = escapeSearchTerm(action);
        query = query.ilike('action', `%${safeAction}%`);
      }
      if (resourceType) query = query.eq('resource_type', resourceType);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      if (search) {
        const safeSearch = escapeSearchTerm(search);
        query = query.or(`action.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%,actor_email.ilike.%${safeSearch}%`);
      }

      // Export mode - no pagination
      if (exportFormat === 'true') {
        query = query.limit(10000); // Max export limit
      } else {
        query = query.range(offset, offset + limit - 1);
      }

      const { data: logs, error, count } = await query;
      if (error) throw error;

      // Export as CSV
      if (exportFormat === 'csv') {
        const headers = ['Timestamp', 'Action', 'Actor', 'Tenant', 'Resource Type', 'Resource ID', 'Status', 'IP Address'];
        const rows = logs?.map(log => [
          log.created_at,
          log.action,
          log.actor_email || log.actor_id,
          log.tenants?.name || '',
          log.resource_type,
          log.resource_id,
          log.status,
          log.ip_address,
        ]);

        const csv = [
          headers.join(','),
          ...(rows || []).map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n');

        return new Response(csv, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      }

      // Get unique actions for filter dropdown
      const { data: actionsData } = await supabase
        .from('saas_audit_trail')
        .select('action')
        .limit(1000);
      
      const uniqueActions = [...new Set(actionsData?.map(a => a.action) || [])].sort();

      // Get unique resource types
      const { data: resourceTypesData } = await supabase
        .from('saas_audit_trail')
        .select('resource_type')
        .not('resource_type', 'is', null)
        .limit(1000);
      
      const uniqueResourceTypes = [...new Set(resourceTypesData?.map(r => r.resource_type) || [])].sort();

      return new Response(JSON.stringify({ 
        logs,
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        filters: {
          actions: uniqueActions,
          resourceTypes: uniqueResourceTypes,
        }
      }), {
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
