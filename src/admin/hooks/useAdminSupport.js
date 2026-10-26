import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Hook for managing admin support sessions
 * - Fetches active session on mount (after auth is ready)
 * - Subscribes to real-time updates
 * - Provides functions to cancel, send messages
 * 
 * IMPORTANT: This hook relies on Supabase's automatic auth header handling.
 * DO NOT manually add Authorization headers - it causes race conditions.
 * 
 * @param {string} tenantId - Optional tenant ID for subscribing to incoming sessions
 * @param {boolean} enabled - Whether the support module is active (default: true)
 */
export function useAdminSupport(tenantId = null, enabled = true) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [incomingSession, setIncomingSession] = useState(null);
  
  const subscriptionRef = useRef(null);
  const messagesSubscriptionRef = useRef(null);
  const incomingSubscriptionRef = useRef(null);
  const hasInitialized = useRef(false);
  const isMounted = useRef(true);
  const isFetching = useRef(false);

  // Fetch active session
  // accessToken parameter is passed from auth state change for guaranteed freshness
  const fetchActiveSession = useCallback(async (forceRefresh = false, accessToken = null) => {
    // Skip if support module is not enabled
    if (!enabled) {
      if (isMounted.current) setLoading(false);
      return;
    }

    // Skip if already initialized and not forcing
    if (hasInitialized.current && !forceRefresh) {
      if (isMounted.current) setLoading(false);
      return;
    }
    
    // Prevent concurrent fetches to avoid race conditions
    if (isFetching.current) {
      return;
    }
    isFetching.current = true;
    
    try {
      if (isMounted.current) setError(null);
      
      // Use passed token directly - DO NOT call refreshSession() here
      // as it triggers TOKEN_REFRESHED events causing infinite loops
      let token = accessToken;
      let session = null;
      
      if (!token) {
        // Only get session if no token was passed - no refresh
        const { data: { session: authSession } } = await supabase.auth.getSession();
        session = authSession;
        token = authSession?.access_token;
      }
      
      // Check if token is about to expire (within 60 seconds)
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000; // Convert to ms
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry < 60000) {
          // Token is about to expire, get fresh session
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          if (freshSession?.access_token) {
            token = freshSession.access_token;
          }
        }
      }
      
      if (!token) {
        // Not authenticated - skip silently
        if (isMounted.current) {
          setSession(null);
          setMessages([]);
          setLoading(false);
        }
        isFetching.current = false;
        return;
      }

      // Validate JWT before making the request to avoid 401 console noise
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now();
        const expiresAt = (payload.exp || 0) * 1000;
        
        // Token expired OR will expire within 30 seconds - refresh first
        if (expiresAt - now < 30000) {
          const { data: { session: refreshed } } = await supabase.auth.getSession();
          if (refreshed?.access_token) {
            // Verify the refreshed token is actually valid
            const newPayload = JSON.parse(atob(refreshed.access_token.split('.')[1]));
            if (newPayload.exp && newPayload.exp * 1000 > now) {
              token = refreshed.access_token;
            } else {
              // Refreshed token also expired - user needs to re-login
              if (isMounted.current) {
                setSession(null);
                setMessages([]);
                setLoading(false);
              }
              isFetching.current = false;
              return;
            }
          } else {
            // No valid token available - skip silently
            if (isMounted.current) {
              setSession(null);
              setMessages([]);
              setLoading(false);
            }
            isFetching.current = false;
            return;
          }
        }
      } catch {
        // Token decode failed - skip request to avoid 401 noise
        if (isMounted.current) {
          setSession(null);
          setMessages([]);
          setLoading(false);
        }
        isFetching.current = false;
        return;
      }
      
      // Use fetch directly to ensure auth header is sent correctly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Helper function to make the request
      const makeRequest = async (authToken) => {
        return fetch(`${supabaseUrl}/functions/v1/admin-support-request`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });
      };
      
      let response = await makeRequest(token);

      // If 401, try refreshing the token once and retry
      if (response.status === 401) {
        // Log at debug level - 401 on initial load is expected when session is stale
        try {
          const errorData = await response.clone().json();
          console.debug('useAdminSupport: 401 (token stale, retrying):', errorData.message);
        } catch {
          // no JSON body
        }
        
        const { data: refreshedSession } = await supabase.auth.getSession();
        if (refreshedSession?.session?.access_token && refreshedSession.session.access_token !== token) {
          // Got a different token, retry
          response = await makeRequest(refreshedSession.session.access_token);
        }
      }

      if (!isMounted.current) return;

      if (!response.ok) {
        // Log error for debugging
        if (response.status !== 401) {
          console.warn('useAdminSupport: Request failed with status', response.status);
        }
        setSession(null);
        setMessages([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();

      // Success - mark as initialized
      hasInitialized.current = true;

      if (data?.error) {
        setSession(null);
        setMessages([]);
        setLoading(false);
        return;
      }

      if (data?.session) {
        setSession(data.session);
        // Use messages from the edge function response (bypasses RLS)
        if (data.session.session_type === 'chat' && data.messages) {
          setMessages(data.messages);
        }
      } else {
        setSession(null);
        setMessages([]);
      }
    } catch (_err) {
      if (!isMounted.current) return;
      setSession(null);
      setMessages([]);
    } finally {
      isFetching.current = false;
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [enabled]);

  // Send a chat message
  const sendMessage = useCallback(async (content) => {
    if (!session || !content.trim()) return false;

    setSending(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) throw new Error('Not authenticated');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-support-request`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_message',
          session_id: session.id,
          message: content.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      const data = await response.json();
      if (data?.error) throw new Error(data.error);

      // Add the sent message to state immediately (don't rely on real-time which may be blocked by RLS)
      if (data?.message && isMounted.current) {
        setMessages((prev) => {
          // Avoid duplicates if real-time also delivers it
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      if (isMounted.current) setError(err.message);
      return false;
    } finally {
      if (isMounted.current) setSending(false);
    }
  }, [session]);

  // Cancel the support request
  const cancelSession = useCallback(async () => {
    if (!session) return false;

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) throw new Error('Not authenticated');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-support-request`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          session_id: session.id,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Cancel session failed:', { status: response.status, data });
        
        // If session is already ended (cancelled/completed by developer), clear it from UI anyway
        if (data?.error?.includes('Can only cancel waiting or active sessions')) {
          if (isMounted.current) {
            setSession(null);
            setMessages([]);
          }
          return true; // Consider this a success - session is gone
        }
        
        throw new Error(data?.error || 'Failed to cancel session');
      }
      
      if (data?.error) throw new Error(data.error);

      if (isMounted.current) {
        setSession(null);
        setMessages([]);
      }
      return true;
    } catch (err) {
      console.error('Failed to cancel session:', err);
      
      // Also handle the case where the error message indicates session already ended
      if (err.message?.includes('Can only cancel waiting or active sessions')) {
        if (isMounted.current) {
          setSession(null);
          setMessages([]);
        }
        return true;
      }
      
      if (isMounted.current) setError(err.message);
      return false;
    }
  }, [session]);

  // Fetch support history - defined before rateSession which uses it
  const fetchHistory = useCallback(async () => {
    if (isMounted.current) {
      setLoadingHistory(true);
      setError(null);
    }
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (!authSession?.access_token) {
        if (isMounted.current) setHistory([]);
        return [];
      }
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-support-request?action=history`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      
      const historyData = await response.json();
      if (isMounted.current) setHistory(historyData.history || []);
      return historyData.history || [];
    } catch (err) {
      console.error('Failed to fetch history:', err);
      if (isMounted.current) setError(err.message);
      return [];
    } finally {
      if (isMounted.current) setLoadingHistory(false);
    }
  }, []);

  // Rate a completed session
  const rateSession = useCallback(async (sessionId, rating, comment) => {
    if (!rating || rating < 1 || rating > 5) return false;

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) throw new Error('Not authenticated');
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-support-request`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rate',
          session_id: sessionId,
          rating,
          comment,
        }),
      });

      if (!response.ok) throw new Error('Failed to rate session');
      const data = await response.json();
      if (data?.error) throw new Error(data.error);

      // Refresh history after rating
      fetchHistory();
      return true;
    } catch (err) {
      console.error('Failed to rate session:', err);
      if (isMounted.current) setError(err.message);
      return false;
    }
  }, [fetchHistory]);

  // Setup auth listener and initial fetch
  useEffect(() => {
    isMounted.current = true;

    // Skip auth listener if support module is not enabled
    if (!enabled) {
      setLoading(false);
      return () => { isMounted.current = false; };
    }
    
    // Listen for auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, authSession) => {
        // Only fetch on INITIAL_SESSION and SIGNED_IN - NOT TOKEN_REFRESHED
        // TOKEN_REFRESHED happens frequently and we don't need to re-fetch data
        // The existing session data remains valid when token refreshes
        // IMPORTANT: Check both access_token and user to ensure valid authenticated session
        const isValidSession = authSession?.access_token && authSession?.user;
        
        if (isValidSession && ['SIGNED_IN', 'INITIAL_SESSION'].includes(event)) {
          // Pass the token directly from the callback - guaranteed fresh
          const token = authSession.access_token;
          
          // Small delay for INITIAL_SESSION to let Supabase client fully initialize
          if (event === 'INITIAL_SESSION') {
            setTimeout(() => {
              if (isMounted.current) fetchActiveSession(true, token);
            }, 100);
          } else {
            fetchActiveSession(true, token);
          }
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !isValidSession)) {
          // Clear session on sign out OR if initial session shows no valid auth
          if (isMounted.current) {
            setSession(null);
            setMessages([]);
            setLoading(false);
            hasInitialized.current = false;
          }
        }
      }
    );

    // Cleanup
    return () => {
      isMounted.current = false;
      authSubscription?.unsubscribe();
      hasInitialized.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
      }
      if (incomingSubscriptionRef.current) {
        incomingSubscriptionRef.current.unsubscribe();
      }
    };
  }, [fetchActiveSession, enabled]);

  // Subscribe to incoming sessions for this tenant (developer-initiated)
  useEffect(() => {
    if (!tenantId || !enabled) return;

    const incomingChannel = supabase
      .channel(`admin-incoming-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_sessions',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          // Check if this is a developer-initiated session
          if (payload.new && payload.new.developer_id && !payload.new.requester_id) {
            if (isMounted.current) {
              setIncomingSession(payload.new);
              fetchActiveSession(true);
            }
          }
        }
      )
      .subscribe();

    incomingSubscriptionRef.current = incomingChannel;

    return () => {
      if (incomingSubscriptionRef.current) {
        incomingSubscriptionRef.current.unsubscribe();
        incomingSubscriptionRef.current = null;
      }
    };
  }, [tenantId, fetchActiveSession, enabled]);

  // Poll for new messages every 3 seconds (fallback since real-time may be blocked by RLS)
  useEffect(() => {
    if (!enabled || !session?.id || session.session_type !== 'chat' || session.status !== 'active') return;

    const pollMessages = async () => {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.access_token) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/admin-support-request`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (isMounted.current) {
            // Check if session has ended (developer closed it)
            if (!data.session || ['completed', 'cancelled', 'expired'].includes(data.session.status)) {
              setSession(null);
              setMessages([]);
              return;
            }
            // Update messages
            if (data?.messages) {
              setMessages(data.messages);
            }
          }
        }
      } catch (err) {
        // Silent fail for polling
        console.warn('Message poll failed:', err);
      }
    };

    // Poll every 3 seconds
    const intervalId = setInterval(pollMessages, 3000);

    return () => clearInterval(intervalId);
  }, [session?.id, session?.session_type, session?.status]);

  // Subscribe to session updates when we have an active session
  useEffect(() => {
    if (!session?.id) return;

    const sessionChannel = supabase
      .channel(`admin-session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          if (!isMounted.current) return;
          
          if (payload.eventType === 'UPDATE') {
            setSession(payload.new);
            if (['completed', 'cancelled', 'expired'].includes(payload.new.status)) {
              setSession(null);
              setMessages([]);
            }
          } else if (payload.eventType === 'DELETE') {
            setSession(null);
            setMessages([]);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = sessionChannel;

    // Subscribe to chat messages if chat session
    if (session.session_type === 'chat') {
      const messagesChannel = supabase
        .channel(`admin-messages-${session.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_chat_messages',
            filter: `session_id=eq.${session.id}`,
          },
          (payload) => {
            if (isMounted.current) {
              setMessages((prev) => [...prev, payload.new]);
            }
          }
        )
        .subscribe();

      messagesSubscriptionRef.current = messagesChannel;
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
        messagesSubscriptionRef.current = null;
      }
    };
  }, [session?.id, session?.session_type]);

  return {
    session,
    messages,
    history,
    loading,
    loadingHistory,
    error,
    sending,
    sendMessage,
    cancelSession,
    rateSession,
    fetchHistory,
    refreshSession: fetchActiveSession,
    setSession,
    incomingSession,
    clearIncomingSession: () => setIncomingSession(null),
  };
}

export default useAdminSupport;
