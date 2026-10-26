// Developer Portal Support Notifications Hook
// Real-time subscriptions for support session updates

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Hook for real-time support session notifications
 * Subscribes to support_sessions table for new waiting requests
 * 
 * @param {Object} options Configuration options
 * @param {boolean} options.enabled Whether to enable real-time subscription
 * @param {Function} options.onNewRequest Callback when new waiting request arrives
 * @param {Function} options.onSessionUpdate Callback when session status changes
 * @param {boolean} options.playSound Whether to play sound for new requests
 * @returns {Object} { waitingCount, newRequests, clearNewRequests }
 */
export function useSupportNotifications({
  enabled = true,
  onNewRequest = null,
  onSessionUpdate = null,
  playSound = true,
} = {}) {
  const [waitingCount, setWaitingCount] = useState(0);
  const [newRequests, setNewRequests] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef(null);
  const channelRef = useRef(null);
  
  // Use refs for callbacks to avoid re-subscribing when they change
  const onNewRequestRef = useRef(onNewRequest);
  const onSessionUpdateRef = useRef(onSessionUpdate);
  
  // Keep refs updated
  useEffect(() => {
    onNewRequestRef.current = onNewRequest;
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onNewRequest, onSessionUpdate]);

  // Initialize notification sound
  useEffect(() => {
    if (playSound && typeof Audio !== 'undefined') {
      // Use a simple notification sound (you can replace with a custom URL)
      audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
        'tvT19///////////////////////////////////////////////////////////////////' +
        '//////////////////////////////////////////////////////////////////8=');
      audioRef.current.volume = 0.3;
    }
  }, [playSound]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current && playSound) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay restrictions
      });
    }
  }, [playSound]);

  // Fetch initial waiting count
  const fetchWaitingCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('support_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      if (!error && count !== null) {
        setWaitingCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch waiting count:', err);
    }
  }, []);

  // Clear new requests (called when user views them)
  const clearNewRequests = useCallback(() => {
    setNewRequests([]);
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!enabled) return;

    // Use IIFE for initial fetch to avoid sync setState in effect lint error
    const initFetch = async () => {
      try {
        const { count, error } = await supabase
          .from('support_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'waiting');

        if (!error && count !== null) {
          setWaitingCount(count);
        }
      } catch (err) {
        console.error('Failed to fetch waiting count:', err);
      }
    };
    initFetch();

    // Create channel for real-time updates
    const channel = supabase
      .channel('support_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_sessions',
          filter: 'status=eq.waiting',
        },
        (payload) => {
          
          // Update waiting count
          setWaitingCount((prev) => prev + 1);
          
          // Add to new requests list
          setNewRequests((prev) => [payload.new, ...prev]);
          
          // Play notification sound
          playNotificationSound();
          
          // Call custom callback
          if (onNewRequestRef.current) {
            onNewRequestRef.current(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_sessions',
        },
        (payload) => {
          
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          // Update waiting count based on status changes
          if (oldStatus === 'waiting' && newStatus !== 'waiting') {
            // Session is no longer waiting (accepted, cancelled, expired)
            setWaitingCount((prev) => Math.max(0, prev - 1));
            
            // Remove from new requests if present
            setNewRequests((prev) => 
              prev.filter((r) => r.id !== payload.new.id)
            );
          }
          
          // Call custom callback
          if (onSessionUpdateRef.current) {
            onSessionUpdateRef.current(payload.new, payload.old);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          // Successfully subscribed to realtime channel
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, playNotificationSound]);

  // Refetch waiting count periodically as backup
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(fetchWaitingCount, 60000); // Every minute
    return () => clearInterval(interval);
  }, [enabled, fetchWaitingCount]);

  return {
    waitingCount,
    newRequests,
    clearNewRequests,
    isConnected,
    refetch: fetchWaitingCount,
  };
}

/**
 * Hook for subscribing to a specific support session
 * Used when actively viewing/participating in a session
 * 
 * @param {string} sessionId The session ID to subscribe to
 * @param {Object} options Configuration options
 * @returns {Object} { session, messages, isLoading, error }
 */
export function useSupportSession(sessionId, _options = {}) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // Fetch session and messages
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('support_sessions')
        .select(`
          *,
          tenants (name, slug),
          support_session_actions (id, action, description, created_at)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch chat messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('support_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId) return;

    fetchSession();

    // Subscribe to session changes
    const channel = supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            setSession(payload.new || null);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, fetchSession]);

  // Send message function
  const sendMessage = useCallback(async (content, metadata = {}) => {
    if (!sessionId || !content.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile for name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const senderName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : 'Support Agent';

      const { data, error } = await supabase
        .from('support_chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: user.id,
          sender_type: 'developer',
          sender_name: senderName,
          message: content.trim(),
          message_type: 'text',
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [sessionId]);

  return {
    session,
    messages,
    isLoading,
    error,
    sendMessage,
    refetch: fetchSession,
  };
}

export default useSupportNotifications;
