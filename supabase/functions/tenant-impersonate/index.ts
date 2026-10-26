// supabase/functions/tenant-impersonate/index.ts
// Edge function for secure tenant impersonation (support sessions)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Generate HMAC-SHA256 signature for JWT
async function signJWT(payload: object, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Verify JWT signature
async function verifyJWT(token: string, secret: string): Promise<object | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Decode signature
    const sigB64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(`${headerB64}.${payloadB64}`)
    );
    
    if (!valid) return null;
    
    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    
    // Check expiry
    if (payload.exp && Date.now() > payload.exp * 1000) return null;
    
    return payload;
  } catch {
    return null;
  }
}

interface ImpersonatePayload {
  tenant_id: string;
  user_id?: string; // Optional - impersonate specific user, otherwise admin
  reason: string;
  type: 'screen_share' | 'view_only' | 'chat';
  duration_minutes?: number; // Default 60 minutes
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

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify developer role - query users table and join with user_profiles
    const { data: userRecord, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();

    const profile = {
      role: userRecord?.role,
      full_name: userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'Support Agent'
    };

    // Allow both developer and admin roles to use support sessions
    if (!userRecord || !['developer', 'admin'].includes(userRecord.role)) {
      console.error('Role check failed:', { 
        userId: user.id, 
        userRecord, 
        userError,
        email: user.email 
      });
      throw new Error(`Only developers and admins can manage support sessions. Current role: ${userRecord?.role || 'not found'}`);
    }

    const method = req.method;

    switch (method) {
      case 'POST': {
        // Start impersonation session
        const payload: ImpersonatePayload = await req.json();

        if (!payload.tenant_id || !payload.reason) {
          throw new Error('tenant_id and reason are required');
        }

        // Verify tenant exists
        const { data: tenant, error: tenantError } = await supabaseClient
          .from('tenants')
          .select('id, name, status')
          .eq('id', payload.tenant_id)
          .single();

        if (tenantError || !tenant) {
          throw new Error('Tenant not found');
        }

        // Get target user (if specified, otherwise get admin)
        let targetUserId = payload.user_id;
        if (!targetUserId) {
          const { data: adminUser } = await supabaseClient
            .from('tenant_users')
            .select('user_id')
            .eq('tenant_id', payload.tenant_id)
            .eq('role', 'owner')
            .single();
          
          targetUserId = adminUser?.user_id;
        }

        const now = new Date();
        const duration = payload.duration_minutes || 60;
        const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

        // Get target user email if specified
        let targetUserEmail = null;
        if (targetUserId) {
          const { data: targetUser } = await supabaseClient
            .from('users')
            .select('email')
            .eq('id', targetUserId)
            .single();
          targetUserEmail = targetUser?.email;
        }

        // Create support session (using correct column names from schema)
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .insert({
            tenant_id: payload.tenant_id,
            developer_id: user.id,
            developer_email: user.email,
            impersonated_user_id: targetUserId,
            impersonated_user_email: targetUserEmail,
            session_type: payload.type,
            status: 'active',
            reason: payload.reason,
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            agent_name: profile.full_name,
            tenant_name: tenant.name,
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // Log the initial action
        await supabaseClient.from('support_session_actions').insert({
          session_id: session.id,
          action_type: 'other',
          action: 'session_started',
          description: `Support session started: ${payload.reason}`,
          details: {
            type: payload.type,
            reason: payload.reason,
            duration_minutes: duration,
          },
        });

        // Log to audit trail
        await supabaseClient.from('saas_audit_trail').insert({
          tenant_id: payload.tenant_id,
          actor_id: user.id,
          action: 'support.session_started',
          resource_type: 'support_session',
          resource_id: session.id,
          description: `Support session started: ${payload.reason}`,
          metadata: {
            type: payload.type,
            reason: payload.reason,
            expires_at: expiresAt.toISOString(),
          },
        });

        // Generate signed JWT access token for the session
        const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || '';
        if (!jwtSecret) {
          throw new Error('JWT secret not configured');
        }
        
        const accessToken = await signJWT({
          session_id: session.id,
          tenant_id: payload.tenant_id,
          agent_id: user.id,
          agent_name: profile.full_name,
          type: payload.type,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(expiresAt.getTime() / 1000),
        }, jwtSecret);

        return new Response(JSON.stringify({
          session,
          access_token: accessToken,
          tenant: {
            id: tenant.id,
            name: tenant.name,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      case 'PUT': {
        // Log action during session, join session, or end session
        const body = await req.json();
        const { session_id, action, details, id } = body;

        // Handle join session request (developer joining a waiting session)
        if (body.action === 'join' && (session_id || id)) {
          const targetId = session_id || id;
          
          // Fetch the waiting session
          const { data: session, error: sessionError } = await supabaseClient
            .from('support_sessions')
            .select('*')
            .eq('id', targetId)
            .eq('status', 'waiting')
            .single();

          if (sessionError || !session) {
            throw new Error('Session not found or already taken');
          }

          // Update session to active and assign developer
          const { error: updateError } = await supabaseClient
            .from('support_sessions')
            .update({
              status: 'active',
              developer_id: user.id,
              agent_name: user.email || 'Support Agent',
              started_at: new Date().toISOString(),
            })
            .eq('id', targetId)
            .eq('status', 'waiting'); // Double-check to prevent race conditions

          if (updateError) {
            throw new Error('Failed to join session: ' + updateError.message);
          }

          // Log the join action
          await supabaseClient.from('support_session_actions').insert({
            session_id: targetId,
            action_type: 'other',
            action: 'session_joined',
            description: `Developer ${user.email} joined the session`,
            details: { developer_id: user.id },
          });

          // Audit trail
          await supabaseClient.from('saas_audit_trail').insert({
            tenant_id: session.tenant_id,
            actor_id: user.id,
            action: 'support.session_joined',
            resource_type: 'support_session',
            resource_id: targetId,
            description: `Developer ${user.email || user.id} joined session`,
            metadata: { developer_id: user.id },
          });

          // Fetch updated session
          const { data: updatedSession } = await supabaseClient
            .from('support_sessions')
            .select('*')
            .eq('id', targetId)
            .single();

          return new Response(JSON.stringify({ 
            success: true, 
            session: updatedSession,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Handle end session request (from devApi.js)
        if (body.action === 'end' && (session_id || id)) {
          const targetId = session_id || id;
          
          const { data: session, error: sessionError } = await supabaseClient
            .from('support_sessions')
            .select('*')
            .eq('id', targetId)
            .eq('developer_id', user.id)
            .single();

          if (sessionError || !session) {
            throw new Error('Session not found');
          }

          await supabaseClient
            .from('support_sessions')
            .update({
              status: 'completed',
              ended_at: new Date().toISOString(),
              resolution: body.summary || 'Session ended by agent',
            })
            .eq('id', targetId);

          await supabaseClient.from('support_session_actions').insert({
            session_id: targetId,
            action_type: 'other',
            action: 'session_ended',
            description: body.summary || 'Session ended by agent',
            details: { resolution: body.summary },
          });

          await supabaseClient.from('saas_audit_trail').insert({
            tenant_id: session.tenant_id,
            actor_id: user.id,
            action: 'support.session_ended',
            resource_type: 'support_session',
            resource_id: targetId,
            description: body.summary || 'Session ended by agent',
            metadata: { resolution: body.summary },
          });

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Otherwise, log an action during the session
        if (!session_id || !action) {
          throw new Error('session_id and action are required');
        }

        // Verify session is active and belongs to this agent
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .select('*')
          .eq('id', session_id)
          .eq('developer_id', user.id)
          .eq('status', 'active')
          .single();

        if (sessionError || !session) {
          throw new Error('Session not found or expired');
        }

        // Check if session has expired
        if (new Date(session.expires_at) < new Date()) {
          await supabaseClient
            .from('support_sessions')
            .update({ status: 'expired' })
            .eq('id', session_id);
          throw new Error('Session has expired');
        }

        // Log the action
        const { data: actionLog, error: actionError } = await supabaseClient
          .from('support_session_actions')
          .insert({
            session_id,
            action_type: 'other',
            action,
            description: action,
            details,
          })
          .select()
          .single();

        if (actionError) throw actionError;

        return new Response(JSON.stringify({ action: actionLog }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'DELETE': {
        // End session
        const { session_id, resolution } = await req.json();

        if (!session_id) {
          throw new Error('session_id is required');
        }

        // Verify session belongs to this agent (use developer_id)
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .select('*')
          .eq('id', session_id)
          .eq('developer_id', user.id)
          .single();

        if (sessionError || !session) {
          throw new Error('Session not found');
        }

        // End the session
        const { error: updateError } = await supabaseClient
          .from('support_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            resolution,
          })
          .eq('id', session_id);

        if (updateError) throw updateError;

        // Log end action
        await supabaseClient.from('support_session_actions').insert({
          session_id,
          action_type: 'other',
          action: 'session_ended',
          description: resolution || 'Session ended',
          details: { resolution },
        });

        // Log to audit trail
        await supabaseClient.from('saas_audit_trail').insert({
          tenant_id: session.tenant_id,
          actor_id: user.id,
          action: 'support.session_ended',
          resource_type: 'support_session',
          resource_id: session_id,
          description: resolution || 'Session ended',
          metadata: { resolution },
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'GET': {
        // Get active sessions or session details
        const url = new URL(req.url);
        const sessionId = url.searchParams.get('session_id');
        const tenantId = url.searchParams.get('tenant_id');
        const status = url.searchParams.get('status');

        if (sessionId) {
          // Get specific session with actions
          const { data: session, error } = await supabaseClient
            .from('support_sessions')
            .select(`
              *,
              tenants (name, slug),
              support_session_actions (
                id, action_type, action, description, details, created_at
              )
            `)
            .eq('id', sessionId)
            .single();

          if (error) throw error;

          // Fetch requester info
          let requesterInfo = null;
          if (session.requester_id) {
            const { data: requesterProfile } = await supabaseClient
              .from('user_profiles')
              .select('first_name, last_name')
              .eq('user_id', session.requester_id)
              .single();
            
            const { data: requesterUser } = await supabaseClient
              .from('users')
              .select('email, role')
              .eq('id', session.requester_id)
              .single();

            if (requesterProfile || requesterUser) {
              const fullName = requesterProfile 
                ? `${requesterProfile.first_name || ''} ${requesterProfile.last_name || ''}`.trim()
                : null;
              requesterInfo = {
                id: session.requester_id,
                name: fullName || session.requester_name || 'User',
                email: requesterUser?.email || null,
                role: requesterUser?.role || null,
              };
            }
          }
          
          // Transform to match frontend expectations
          const transformedSession = {
            ...session,
            tenant_name: session.tenant_name || session.tenants?.name,
            tenant: session.tenants ? { name: session.tenants.name, slug: session.tenants.slug } : null,
            requester: requesterInfo || { name: session.requester_name || 'Unknown', email: null },
            agent_id: session.developer_id,
            target_user_id: session.impersonated_user_id,
            actions: session.support_session_actions?.map((a: any) => ({
              time: a.created_at,
              action: a.description || a.action,
              agent: session.agent_name || 'Agent',
            })) || [],
          };

          return new Response(JSON.stringify({ session: transformedSession }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get all sessions (optionally filtered by tenant and status)
        let query = supabaseClient
          .from('support_sessions')
          .select(`
            *,
            tenants (name, slug),
            support_session_actions (
              id, action_type, action, description, details, created_at
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        // Filter by status (support 'waiting' mapped to relevant statuses)
        if (status && status !== 'all') {
          if (status === 'waiting') {
            // Waiting means session exists but not yet started
            query = query.is('started_at', null);
          } else if (status === 'completed') {
            // Match both 'completed' and 'ended' status
            query = query.in('status', ['completed', 'ended']);
          } else {
            query = query.eq('status', status);
          }
        }

        const { data: sessions, error } = await query;

        if (error) throw error;
        
        // Transform sessions to match frontend expectations
        const transformedSessions = sessions?.map((s: any) => ({
          ...s,
          tenant_name: s.tenant_name || s.tenants?.name,
          agent_id: s.developer_id,
          target_user_id: s.impersonated_user_id,
          // Map 'ended' status to 'completed' for frontend
          status: s.status === 'ended' ? 'completed' : s.status,
          actions: s.support_session_actions?.map((a: any) => ({
            time: a.created_at,
            action: a.description || a.action,
            agent: s.agent_name || 'Agent',
          })) || [],
        })) || [];

        return new Response(JSON.stringify({ sessions: transformedSessions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        });
    }
  } catch (error) {
    console.error('Tenant impersonate error:', {
      message: error.message,
      stack: error.stack,
    });
    
    // Determine appropriate status code based on error type
    let status = 400;
    if (error.message === 'Unauthorized' || error.message === 'Missing authorization header') {
      status = 401;
    } else if (error.message.includes('not found')) {
      status = 404;
    } else if (error.message.includes('Only developers and admins')) {
      status = 403;
    }
    
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack?.split('\n')[0] }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      }
    );
  }
});
