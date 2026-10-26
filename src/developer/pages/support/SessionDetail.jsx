import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Monitor,
  Eye,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
  AlertCircle,
  User,
  Building2,
  Calendar,
  Activity,
  Square,
  Play,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { supportApi } from '../../services/devApi';
import ScreenShareViewer from '../../components/ScreenShareViewer';
import { useSupportNotifications } from '../../../hooks/useSupportNotifications';
import { useDevAuth } from '../../contexts/DevAuthContext';

/**
 * Session Detail Page - Developer view of an active support session
 * Provides chat interface, session info, and controls
 */
export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useDevAuth();
  
  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  
  // End session state
  const [showEndModal, setShowEndModal] = useState(false);
  const [endingSummary, setEndingSummary] = useState('');
  const [ending, setEnding] = useState(false);
  
  // Screen share viewer state
  const [showScreenViewer, setShowScreenViewer] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Support notifications (toasts and browser notifications)
  useSupportNotifications({
    session,
    messages,
    enableBrowserNotifications: true,
    role: 'developer',
  });

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      setError(null);
      const data = await supportApi.get(sessionId);
      
      if (data?.session) {
        setSession(data.session);
      } else if (data?.sessions?.[0]) {
        setSession(data.sessions[0]);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Session not found');
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Fetch chat messages
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const { data, error: msgError } = await supabase
        .from('support_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [sessionId]);

  // Send a chat message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || sending || !session) return;

    setSending(true);
    try {
      const { error: insertError } = await supabase
        .from('support_chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: user?.id,
          sender_type: 'developer',
          sender_name: user?.email?.split('@')[0] || 'Developer',
          message: messageInput.trim(),
        });

      if (insertError) throw insertError;
      setMessageInput('');
      // Message will arrive via real-time subscription
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // End the session
  const handleEndSession = async () => {
    if (ending) return;
    
    setEnding(true);
    try {
      await supportApi.end(sessionId, endingSummary);
      setShowEndModal(false);
      navigate('/support');
    } catch (err) {
      console.error('Failed to end session:', err);
      setError(err.message || 'Failed to end session');
    } finally {
      setEnding(false);
    }
  };

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus chat input when session loads
  useEffect(() => {
    if (session?.session_type === 'chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [session?.session_type]);

  // Initial data fetch
  useEffect(() => {
    fetchSession();
    fetchMessages();
  }, [fetchSession, fetchMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`dev-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSession(payload.new);
            // If session ended, navigate back
            if (['completed', 'cancelled', 'expired'].includes(payload.new.status)) {
              setTimeout(() => navigate('/support'), 2000);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`dev-messages-${sessionId}`)
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

    return () => {
      sessionChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, [sessionId, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-300 mb-2">Error Loading Session</h3>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-red-400 hover:text-red-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Session not found</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mt-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  const isActive = session.status === 'active';
  const isChat = session.session_type === 'chat';
  const isEnded = ['completed', 'cancelled', 'expired'].includes(session.status);

  const typeIcon = {
    screen_share: Monitor,
    view_only: Eye,
    chat: MessageCircle,
  };
  const TypeIcon = typeIcon[session.session_type] || MessageCircle;

  const typeLabel = {
    screen_share: 'Screen Share',
    view_only: 'View Only',
    chat: 'Chat',
  };

  const statusColor = {
    waiting: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    active: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    completed: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    expired: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-3">
              <TypeIcon className="h-6 w-6 text-emerald-500" />
              {typeLabel[session.session_type]} Support Session
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor[session.status]}`}>
                {session.status}
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Session ID: {sessionId}
            </p>
          </div>
        </div>

        {isActive && (
          <button
            onClick={() => setShowEndModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Square className="h-4 w-4" />
            End Session
          </button>
        )}
      </div>

      {/* Session ended notice */}
      {isEnded && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-blue-300 font-medium">Session has ended</p>
            <p className="text-blue-400 text-sm">
              {session.resolution || 'No resolution notes provided'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Chat or Session Info */}
        <div className="lg:col-span-2">
          {isChat ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-[500px]">
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-emerald-500" />
                <h2 className="font-semibold text-white">Chat</h2>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full border border-emerald-500/30">
                    <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
                {isEnded && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                    History
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900/50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                    <p>{isEnded ? 'No chat messages in this session' : 'No messages yet'}</p>
                    {!isEnded && (
                      <p className="text-sm text-gray-500 mt-1">Start the conversation below</p>
                    )}
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isDev = msg.sender_type === 'developer';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isDev ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-xl text-sm ${
                            isDev
                              ? 'bg-emerald-600 text-white rounded-br-none'
                              : 'bg-gray-700 text-gray-100 rounded-bl-none'
                          }`}
                        >
                          <p className="break-words">{msg.message}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isDev ? 'text-emerald-200' : 'text-gray-400'
                            }`}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              {isActive && (
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-700 bg-gray-800"
                >
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-600 bg-gray-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-500"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sending}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </form>
              )}
              {/* Session ended footer */}
              {isEnded && messages.length > 0 && (
                <div className="p-4 border-t border-gray-700 bg-gray-800 text-center text-sm text-gray-400">
                  Session ended • {messages.length} message{messages.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ) : (
            // Non-chat session view
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <TypeIcon className="h-8 w-8 text-emerald-500" />
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {typeLabel[session.session_type]} Session
                  </h2>
                  <p className="text-sm text-gray-400">
                    {session.session_type === 'screen_share'
                      ? 'You can view and interact with the admin\'s shared screen'
                      : 'You can observe the user\'s screen (view-only mode)'}
                  </p>
                </div>
              </div>

              {isActive ? (
                <>
                  {showScreenViewer ? (
                    <ScreenShareViewer
                      sessionId={sessionId}
                      onClose={() => setShowScreenViewer(false)}
                      canRecord={true}
                    />
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
                      <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                      <p className="text-emerald-300 font-medium mb-2">Session is active</p>
                      <p className="text-emerald-400 text-sm mb-4">
                        Click below to connect and view the admin's screen
                      </p>
                      <button
                        onClick={() => setShowScreenViewer(true)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Play className="h-4 w-4" />
                        Open Screen Viewer
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 text-center">
                  <Clock className="h-10 w-10 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Session is not active</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Session details */}
        <div className="space-y-4">
          {/* Session Info Card */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-400" />
              Session Details
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-gray-500">Tenant</p>
                  <p className="font-medium text-white">{session.tenant?.name || session.tenant_name || 'Unknown Clinic'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-gray-500">Requested by</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{session.requester?.name || session.requester_name || 'Unknown'}</p>
                    {session.requester?.role && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-700 text-gray-300 capitalize">
                        {session.requester.role}
                      </span>
                    )}
                  </div>
                  {session.requester?.email && (
                    <p className="text-xs text-gray-500">{session.requester.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-gray-500">Started</p>
                  <p className="font-medium text-white">
                    {session.started_at
                      ? new Date(session.started_at).toLocaleString()
                      : session.requested_at
                      ? new Date(session.requested_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              {session.ended_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Ended</p>
                    <p className="font-medium text-white">
                      {new Date(session.ended_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reason Card */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h3 className="font-semibold text-white mb-3">Reason</h3>
            <p className="text-gray-400 text-sm">{session.reason || 'No reason provided'}</p>
          </div>

          {/* Resolution Card (if ended) */}
          {session.resolution && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="font-semibold text-white mb-3">Resolution</h3>
              <p className="text-gray-400 text-sm">{session.resolution}</p>
            </div>
          )}
        </div>
      </div>

      {/* End Session Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">End Support Session</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Resolution Summary (optional)
              </label>
              <textarea
                value={endingSummary}
                onChange={(e) => setEndingSummary(e.target.value)}
                placeholder="Describe what was accomplished..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                disabled={ending}
                className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {ending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ending...
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    End Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
