import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../contexts/TenantContext';

// Session timeout in milliseconds (default: 30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Activity check interval (every 5 minutes)
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000;

/**
 * Hook for managing user sessions with timeout and device tracking
 */
export const useSessionManager = (options = {}) => {
  const {
    timeout = SESSION_TIMEOUT,
    onTimeout = null,
    onSessionExpired = null,
    trackActivity = true
  } = options;

  const { tenantId } = useTenant();

  const [currentSession, setCurrentSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [loading, setLoading] = useState(true);

  // Get device information
  const getDeviceInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    let deviceType = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      deviceType = /iPad|Tablet/i.test(userAgent) ? 'Tablet' : 'Mobile';
    }

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) browser = 'IE';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return {
      deviceType,
      browser,
      os,
      userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language,
    };
  }, []);

  // Create a new session
  const createSession = useCallback(async (userId) => {
    try {
      const deviceInfo = getDeviceInfo();
      const sessionToken = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          device_info: deviceInfo,
          user_agent: navigator.userAgent,
          is_active: true,
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + timeout).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Store session token in localStorage
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('session_id', data.id);
      
      setCurrentSession(data);
      return data;
    } catch (err) {
      console.error('Error creating session:', err);
      return null;
    }
  }, [getDeviceInfo, timeout]);

  // Update session activity
  const updateActivity = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + timeout).toISOString()
        })
        .eq('id', sessionId);

      setLastActivity(Date.now());
    } catch (err) {
      console.error('Error updating activity:', err);
    }
  }, [timeout]);

  // End current session
  const endSession = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      localStorage.removeItem('session_token');
      localStorage.removeItem('session_id');
      setCurrentSession(null);
      setIsSessionActive(false);
    } catch (err) {
      console.error('Error ending session:', err);
    }
  }, []);

  // End specific session (for remote logout)
  const endRemoteSession = useCallback(async (sessionId) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Refresh sessions list
      fetchAllSessions();
      return true;
    } catch (err) {
      console.error('Error ending remote session:', err);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // End all other sessions
  const endAllOtherSessions = useCallback(async () => {
    const currentSessionId = localStorage.getItem('session_id');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !currentSessionId) return 0;

    try {
      const { data } = await supabase.rpc('end_other_sessions', {
        p_user_id: user.id,
        p_current_session_id: currentSessionId
      });

      fetchAllSessions();
      return data || 0;
    } catch (err) {
      console.error('Error ending other sessions:', err);
      return 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all sessions for current user
  const fetchAllSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setAllSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  }, []);

  // Log user activity
  const logActivity = useCallback(async (actionType, details = {}, resourceType = null, resourceId = null) => {
    if (!trackActivity) return;
    
    const sessionId = localStorage.getItem('session_id');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    try {
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          action_type: actionType,
          action_details: details,
          resource_type: resourceType,
          resource_id: resourceId,
          tenant_id: tenantId
        });
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  }, [trackActivity]);

  // Check session validity
  const checkSession = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      setIsSessionActive(false);
      setLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data || !data.is_active) {
        setIsSessionActive(false);
        localStorage.removeItem('session_token');
        localStorage.removeItem('session_id');
        onSessionExpired?.();
        return false;
      }

      // Check if session has timed out
      const timeSinceActivity = Date.now() - new Date(data.last_activity).getTime();
      if (timeSinceActivity > timeout) {
        setIsSessionActive(false);
        onTimeout?.();
        await endSession();
        return false;
      }

      setCurrentSession(data);
      setIsSessionActive(true);
      return true;
    } catch (err) {
      console.error('Error checking session:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [timeout, onTimeout, onSessionExpired, endSession]);

  // Initialize session on mount
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isValid = await checkSession();
        if (!isValid && localStorage.getItem('session_id') === null) {
          // No session exists, create one
          await createSession(user.id);
        }
        fetchAllSessions();
      }
      setLoading(false);
    };

    init();
  }, [checkSession, createSession, fetchAllSessions]);

  // Track user activity
  useEffect(() => {
    if (!trackActivity) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [trackActivity]);

  // Periodically update session activity
  useEffect(() => {
    if (!isSessionActive) return;

    const interval = setInterval(() => {
      updateActivity();
    }, ACTIVITY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [isSessionActive, updateActivity]);

  // Check for session timeout
  useEffect(() => {
    const checkTimeout = () => {
      const timeSinceActivity = Date.now() - lastActivity;
      if (timeSinceActivity > timeout) {
        setIsSessionActive(false);
        onTimeout?.();
        endSession();
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [lastActivity, timeout, onTimeout, endSession]);

  return {
    currentSession,
    allSessions,
    isSessionActive,
    loading,
    lastActivity,
    createSession,
    endSession,
    endRemoteSession,
    endAllOtherSessions,
    updateActivity,
    logActivity,
    fetchAllSessions,
    checkSession,
    getDeviceInfo
  };
};

export default useSessionManager;
