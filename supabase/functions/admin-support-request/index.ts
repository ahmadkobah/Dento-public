// supabase/functions/admin-support-request/index.ts
// Edge function for admin users to request support sessions
// Creates a session with status: 'waiting' for developers to pick up

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface SupportRequestPayload {
  session_type: 'screen_share' | 'view_only' | 'chat';
  reason: string;
  priority?: 'urgent' | 'normal' | 'low';
  attachment_urls?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
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
      console.error('Auth failed: Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.error('Auth failed: getUser error', { 
        message: authError.message, 
        status: authError.status,
        tokenPrefix: token.substring(0, 20) + '...'
      });
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    
    if (!user) {
      console.error('Auth failed: No user returned from getUser');
      throw new Error('Unauthorized: No user found');
    }
    
    console.log('Auth success:', { userId: user.id, email: user.email });

    // Get user's role and tenant
    const { data: userRecord, error: userError } = await supabaseClient
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      console.error('User lookup failed:', { userId: user.id, email: user.email, error: userError });
      throw new Error(`User record not found for ${user.email}. Please ensure you have a user record in the system.`);
    }

    // Only admin, owner, receptionist can request support
    const allowedRoles = ['admin', 'owner', 'doctor', 'receptionist', 'staff'];
    if (!allowedRoles.includes(userRecord.role)) {
      throw new Error(`Role "${userRecord.role}" is not allowed to request support`);
    }

    // Check if user has a tenant assigned
    if (!userRecord.tenant_id) {
      console.error('User has no tenant:', { userId: user.id, email: user.email, role: userRecord.role });
      throw new Error(`No clinic/tenant assigned to your account. Please contact support.`);
    }

    // Get user profile for display name
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();

    const userName = userProfile 
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() 
      : user.email?.split('@')[0] || 'User';

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id, name')
      .eq('id', userRecord.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant lookup failed:', { tenantId: userRecord.tenant_id, error: tenantError });
      throw new Error(`Clinic not found for ID ${userRecord.tenant_id}`);
    }

    const method = req.method;

    switch (method) {
      case 'POST': {
        // Create new support request (waiting status)
        const payload: SupportRequestPayload = await req.json();

        if (!payload.reason?.trim()) {
          throw new Error('Reason is required');
        }

        if (!payload.session_type) {
          payload.session_type = 'chat'; // Default to chat
        }

        const validTypes = ['screen_share', 'view_only', 'chat'];
        if (!validTypes.includes(payload.session_type)) {
          throw new Error(`Invalid session type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Check for existing pending requests from this user
        const { data: existingSession } = await supabaseClient
          .from('support_sessions')
          .select('id, status')
          .eq('requester_id', user.id)
          .in('status', ['waiting', 'active'])
          .single();

        if (existingSession) {
          throw new Error(`You already have a ${existingSession.status} support request. Please wait for it to be resolved.`);
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min expiry for waiting

        // Create support session with waiting status
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .insert({
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            requester_id: user.id,
            impersonated_user_id: user.id,
            impersonated_user_email: user.email,
            user_name: userName,
            session_type: payload.session_type,
            status: 'waiting',
            reason: payload.reason.trim(),
            priority: payload.priority || 'normal',
            requested_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            notes: payload.attachment_urls?.length 
              ? `Attachments: ${payload.attachment_urls.join(', ')}` 
              : null,
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Session create error:', sessionError);
          throw new Error('Failed to create support request: ' + sessionError.message);
        }

        // Log to support_session_actions
        await supabaseClient.from('support_session_actions').insert({
          session_id: session.id,
          action_type: 'other',
          action: 'request_created',
          description: `Support request created: ${payload.reason.substring(0, 100)}`,
          details: {
            session_type: payload.session_type,
            priority: payload.priority || 'normal',
          },
        });

        // Log to audit trail
        await supabaseClient.from('saas_audit_trail').insert({
          tenant_id: tenant.id,
          actor_id: user.id,
          action: 'support.request_created',
          resource_type: 'support_session',
          resource_id: session.id,
          description: `Support request: ${payload.reason}`,
          metadata: {
            session_type: payload.session_type,
            reason: payload.reason,
            priority: payload.priority || 'normal',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          session: {
            id: session.id,
            status: session.status,
            session_type: session.session_type,
            reason: session.reason,
            expires_at: session.expires_at,
            queue_position: 1, // TODO: Calculate actual queue position
          },
          message: 'Support request submitted successfully',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      case 'GET': {
        const url = new URL(req.url);
        const includeHistory = url.searchParams.get('history') === 'true';
        const limit = parseInt(url.searchParams.get('limit') || '10', 10);

        // Get current user's active/waiting session (sessions they requested)
        const { data: requestedSessions, error: reqError } = await supabaseClient
          .from('support_sessions')
          .select('*')
          .eq('requester_id', user.id)
          .in('status', ['waiting', 'active'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (reqError) throw reqError;

        // Also get sessions where a developer is reaching out to this tenant's admin
        // (sessions created by developers for this user's tenant)
        const { data: devInitiatedSessions, error: devError } = await supabaseClient
          .from('support_sessions')
          .select('*')
          .eq('tenant_id', userRecord.tenant_id)
          .not('developer_id', 'is', null)
          .is('requester_id', null)
          .in('status', ['waiting', 'active'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (devError) {
          console.warn('Error fetching dev-initiated sessions:', devError);
        }

        // Prefer user's own requested session, otherwise show developer-initiated session
        const activeSession = requestedSessions?.[0] || devInitiatedSessions?.[0] || null;

        // If there's an active session, also get chat messages
        let messages = [];
        if (activeSession) {
          const { data: chatMessages } = await supabaseClient
            .from('support_chat_messages')
            .select('*')
            .eq('session_id', activeSession.id)
            .order('created_at', { ascending: true });
          
          messages = chatMessages || [];
        }

        // Optionally fetch history
        let history = [];
        if (includeHistory) {
          const { data: pastSessions } = await supabaseClient
            .from('support_sessions')
            .select('*')
            .eq('requester_id', user.id)
            .in('status', ['completed', 'cancelled', 'expired'])
            .order('ended_at', { ascending: false })
            .limit(limit);
          
          history = pastSessions || [];
        }

        return new Response(JSON.stringify({
          session: activeSession,
          messages,
          history: includeHistory ? history : undefined,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PUT': {
        // Update session (cancel request or add message)
        const body = await req.json();
        const { session_id, action, message } = body;

        console.log('PUT request:', { session_id, action, userId: user.id });

        if (!session_id) {
          throw new Error('session_id is required');
        }

        // First, get the session by ID only (using service role bypasses RLS)
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .select('*')
          .eq('id', session_id)
          .single();

        if (sessionError) {
          console.error('Session lookup error:', { 
            session_id, 
            error: sessionError.message,
            code: sessionError.code 
          });
          throw new Error(`Session not found: ${sessionError.message}`);
        }
        
        if (!session) {
          console.error('Session not found:', { session_id });
          throw new Error('Session not found');
        }
        
        // Verify user is authorized (requester, developer, impersonated user, or tenant member for dev-initiated sessions)
        const isRequester = session.requester_id === user.id;
        const isDeveloper = session.developer_id === user.id;
        const isImpersonatedUser = session.impersonated_user_id === user.id;
        // For developer-initiated sessions (no requester), allow any admin from the same tenant
        const isTenantMember = !session.requester_id && session.developer_id && session.tenant_id === userRecord.tenant_id;
        
        console.log('Session authorization check:', { 
          session_id: session.id,
          status: session.status,
          requester_id: session.requester_id,
          developer_id: session.developer_id,
          impersonated_user_id: session.impersonated_user_id,
          session_tenant_id: session.tenant_id,
          user_id: user.id,
          user_tenant_id: userRecord.tenant_id,
          isRequester,
          isDeveloper,
          isImpersonatedUser,
          isTenantMember
        });
        
        if (!isRequester && !isDeveloper && !isImpersonatedUser && !isTenantMember) {
          throw new Error('You are not authorized to access this session');
        }
        
        console.log('Session found:', { id: session.id, status: session.status });

        if (action === 'cancel') {
          // Cancel the waiting request or end active session
          if (session.status !== 'waiting' && session.status !== 'active') {
            throw new Error('Can only cancel waiting or active sessions');
          }

          const resolution = session.status === 'waiting' 
            ? 'Cancelled by user' 
            : 'Session ended by user';

          await supabaseClient
            .from('support_sessions')
            .update({
              status: session.status === 'waiting' ? 'cancelled' : 'completed',
              ended_at: new Date().toISOString(),
              resolution,
            })
            .eq('id', session_id);

          await supabaseClient.from('support_session_actions').insert({
            session_id,
            action_type: 'other',
            action: session.status === 'waiting' ? 'request_cancelled' : 'session_ended',
            description: resolution,
          });

          return new Response(JSON.stringify({ success: true, message: resolution }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (action === 'send_message' && message) {
          // Send a chat message
          console.log('send_message action:', { session_status: session.status, message_length: message?.length });
          
          if (session.status !== 'active') {
            console.error('Session not active:', { status: session.status, session_id: session.id });
            throw new Error(`Can only send messages in active sessions (current: ${session.status})`);
          }

          const insertPayload = {
            session_id,
            sender_id: user.id,
            sender_type: 'admin',
            sender_name: userName,
            message: message.trim(),
            message_type: 'text',
          };
          console.log('Inserting message:', insertPayload);

          const { data: chatMessage, error: msgError } = await supabaseClient
            .from('support_chat_messages')
            .insert(insertPayload)
            .select()
            .single();

          if (msgError) {
            console.error('Message insert failed:', { 
              error: msgError.message, 
              code: msgError.code,
              details: msgError.details,
              hint: msgError.hint
            });
            throw new Error(`Failed to insert message: ${msgError.message}`);
          }

          return new Response(JSON.stringify({ success: true, message: chatMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (action === 'rate') {
          // Rate a completed session
          if (session.status !== 'completed') {
            throw new Error('Can only rate completed sessions');
          }

          if (session.rating) {
            throw new Error('Session has already been rated');
          }

          const rating = body.rating;
          const comment = body.comment;

          if (!rating || rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
          }

          const { error: rateError } = await supabaseClient
            .from('support_sessions')
            .update({
              rating: rating,
              rating_comment: comment?.trim() || null,
              rated_at: new Date().toISOString(),
            })
            .eq('id', session_id);

          if (rateError) throw rateError;

          await supabaseClient.from('support_session_actions').insert({
            session_id,
            action_type: 'other',
            action: 'session_rated',
            description: `Session rated ${rating}/5 stars`,
            details: { rating, comment },
          });

          return new Response(JSON.stringify({ success: true, message: 'Thank you for your feedback!' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        throw new Error('Invalid action');
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        });
    }
  } catch (error) {
    console.error('Admin support request error:', {
      message: error.message,
      stack: error.stack,
    });
    
    let status = 400;
    if (error.message.startsWith('Unauthorized') || error.message === 'Missing authorization header') {
      status = 401;
    } else if (error.message.includes('not found')) {
      status = 404;
    } else if (error.message.includes('not allowed')) {
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
