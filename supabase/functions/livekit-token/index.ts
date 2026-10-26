// supabase/functions/livekit-token/index.ts
// Edge function for generating LiveKit access tokens and managing rooms

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// LiveKit API configuration
const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY') || '';
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET') || '';
const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL') || 'wss://your-livekit-server.livekit.cloud';

// Generate LiveKit access token using JWT
async function generateLiveKitToken(
  identity: string,
  roomName: string,
  options: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    name?: string;
    metadata?: string;
  } = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiry

  // LiveKit JWT payload structure
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: identity,
    iat: now,
    exp,
    nbf: now,
    jti: crypto.randomUUID(),
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: options.canPublish ?? true,
      canSubscribe: options.canSubscribe ?? true,
      canPublishData: options.canPublishData ?? true,
    },
    name: options.name || identity,
    metadata: options.metadata || '',
  };

  // Sign JWT with HMAC-SHA256
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(LIVEKIT_API_SECRET),
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

// Generate room name from session ID
function generateRoomName(sessionId: string): string {
  return `support-${sessionId}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate LiveKit configuration
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      throw new Error('LiveKit not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.');
    }

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

    const method = req.method;
    const body = method !== 'GET' ? await req.json() : {};

    switch (method) {
      case 'POST': {
        // Generate token for joining a room
        const { session_id, role } = body;

        if (!session_id) {
          throw new Error('session_id is required');
        }

        // Validate role
        const validRoles = ['admin', 'developer'];
        if (!validRoles.includes(role)) {
          throw new Error('Invalid role. Must be admin or developer');
        }

        // Verify session exists and user has access
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .select('*')
          .eq('id', session_id)
          .single();

        if (sessionError || !session) {
          throw new Error('Session not found');
        }

        // Get user's tenant for authorization check
        const { data: userRecord } = await supabaseClient
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        // Check permissions
        const isDeveloper = session.developer_id === user.id;
        const isRequester = session.requester_id === user.id;
        const isImpersonatedUser = session.impersonated_user_id === user.id;
        // For developer-initiated sessions (no requester), allow any admin from the same tenant
        const isTenantMember = !session.requester_id && session.developer_id && 
          session.tenant_id === userRecord?.tenant_id;

        if (!isDeveloper && !isRequester && !isImpersonatedUser && !isTenantMember) {
          console.log('LiveKit access denied:', {
            session_id,
            user_id: user.id,
            requester_id: session.requester_id,
            developer_id: session.developer_id,
            impersonated_user_id: session.impersonated_user_id,
            session_tenant_id: session.tenant_id,
            user_tenant_id: userRecord?.tenant_id,
            isDeveloper,
            isRequester,
            isImpersonatedUser,
            isTenantMember
          });
          throw new Error('You do not have access to this session');
        }

        // Only allow screen_share or view_only session types
        if (!['screen_share', 'view_only'].includes(session.session_type)) {
          throw new Error('This session type does not support LiveKit');
        }

        // Generate room name
        const roomName = generateRoomName(session_id);

        // Determine permissions based on role
        const canPublish = role === 'admin' || 
          (role === 'developer' && session.session_type === 'screen_share');
        const canSubscribe = true;

        // Get user display name
        const { data: profile } = await supabaseClient
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();

        const displayName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
          : user.email?.split('@')[0] || 'User';

        // Generate token
        const token = await generateLiveKitToken(user.id, roomName, {
          canPublish,
          canSubscribe,
          canPublishData: true,
          name: displayName,
          metadata: JSON.stringify({
            role,
            session_id,
            user_id: user.id,
          }),
        });

        // Update session with room name if not already set
        if (!session.livekit_room_name) {
          await supabaseClient
            .from('support_sessions')
            .update({ livekit_room_name: roomName })
            .eq('id', session_id);
        }

        return new Response(JSON.stringify({
          token,
          room_name: roomName,
          livekit_url: LIVEKIT_URL,
          permissions: {
            canPublish,
            canSubscribe,
            canPublishData: true,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'PUT': {
        // Start/stop recording
        const { session_id, action } = body;

        if (!session_id) {
          throw new Error('session_id is required');
        }

        // Verify developer access
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .select('*')
          .eq('id', session_id)
          .eq('developer_id', user.id)
          .single();

        if (sessionError || !session) {
          throw new Error('Session not found or access denied');
        }

        if (action === 'start_recording') {
          // Start recording via LiveKit Egress API
          // Note: This requires LiveKit Cloud or self-hosted Egress service
          
          const roomName = session.livekit_room_name || generateRoomName(session_id);
          
          // Create recording record
          const { data: recording, error: recError } = await supabaseClient
            .from('support_recordings')
            .insert({
              session_id,
              room_name: roomName,
              status: 'recording',
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (recError) throw recError;

          // Update session
          await supabaseClient
            .from('support_sessions')
            .update({
              recording_enabled: true,
              recording_started_at: new Date().toISOString(),
            })
            .eq('id', session_id);

          // Note: In production, you would call LiveKit Egress API here
          // const egressResponse = await fetch(`${LIVEKIT_URL}/twirp/livekit.Egress/StartRoomCompositeEgress`, {...});

          return new Response(JSON.stringify({
            success: true,
            recording_id: recording.id,
            message: 'Recording started',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (action === 'stop_recording') {
          // Stop recording
          const { data: recording } = await supabaseClient
            .from('support_recordings')
            .select('*')
            .eq('session_id', session_id)
            .eq('status', 'recording')
            .single();

          if (!recording) {
            throw new Error('No active recording found');
          }

          // Update recording
          await supabaseClient
            .from('support_recordings')
            .update({
              status: 'processing',
              ended_at: new Date().toISOString(),
            })
            .eq('id', recording.id);

          // Update session
          await supabaseClient
            .from('support_sessions')
            .update({
              recording_enabled: false,
              recording_ended_at: new Date().toISOString(),
            })
            .eq('id', session_id);

          // Note: In production, you would call LiveKit Egress API to stop
          // and then update with the file URL when processing completes

          return new Response(JSON.stringify({
            success: true,
            message: 'Recording stopped and processing',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        throw new Error('Invalid action');
      }

      case 'GET': {
        // Get room info or recording status
        const url = new URL(req.url);
        const sessionId = url.searchParams.get('session_id');

        if (!sessionId) {
          throw new Error('session_id is required');
        }

        // Get session with recording info
        const { data: session, error: sessionError } = await supabaseClient
          .from('support_sessions')
          .select(`
            id, 
            livekit_room_name, 
            recording_enabled,
            session_type,
            status
          `)
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          throw new Error('Session not found');
        }

        // Get recordings for this session
        const { data: recordings } = await supabaseClient
          .from('support_recordings')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({
          session: {
            id: session.id,
            room_name: session.livekit_room_name,
            recording_enabled: session.recording_enabled,
            session_type: session.session_type,
            status: session.status,
          },
          recordings: recordings || [],
          livekit_url: LIVEKIT_URL,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        });
    }
  } catch (err) {
    const error = err as Error;
    let status = 400;
    if (error.message === 'Unauthorized' || error.message === 'Missing authorization header') {
      status = 401;
    } else if (error.message.includes('not found')) {
      status = 404;
    } else if (error.message.includes('access denied') || error.message.includes('do not have access')) {
      status = 403;
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      }
    );
  }
});
