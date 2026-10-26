import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Square,
  RefreshCw,
  Search,
  ChevronDown,
  Eye,
  ShieldAlert,
  User,
  Video,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Plus,
  X,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupportSessions, useEndSupportSession, useCreateSupportSession, useJoinSupportSession } from '../../hooks/useDevApi';
import { useTenants } from '../../hooks/useDevApi';
import { useSupportNotifications } from '../../hooks/useSupportNotifications';
import { useToast } from '../../../hooks/useToast';

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Play },
  waiting: { label: 'Waiting', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock },
  completed: { label: 'Completed', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
};

const typeConfig = {
  screen_share: { label: 'Screen Share', icon: Monitor, color: 'text-blue-400' },
  view_only: { label: 'View Only', icon: Eye, color: 'text-purple-400' },
  chat: { label: 'Chat Support', icon: MessageSquare, color: 'text-emerald-400' },
};

export default function SupportSessions() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedSession, setExpandedSession] = useState(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    tenant_id: '',
    type: 'screen_share',
    reason: '',
    duration_minutes: 60,
  });
  const [actionLoading, setActionLoading] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const navigate = useNavigate();

  // API hooks
  const { data: sessionsData, loading: isLoading, error: apiError, refetch } = useSupportSessions({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { mutate: endSession, loading: _endingSession } = useEndSupportSession();
  const { mutate: createSession, loading: creatingSession } = useCreateSupportSession();
  const { mutateAsync: joinSession, loading: _joiningSession } = useJoinSupportSession();
  const { data: tenantsData } = useTenants();

  // Real-time notifications for new support requests
  const { 
    _waitingCount, 
    newRequests, 
    clearNewRequests, 
    isConnected 
  } = useSupportNotifications({
    enabled: true,
    playSound: soundEnabled,
    onNewRequest: (_request) => {
      // Auto-refetch to get the new session in the list
      refetch();
    },
    onSessionUpdate: (_newSession, _oldSession) => {
      // Refetch when session status changes
      refetch();
    },
  });

  // Get tenants for the dropdown
  const tenants = tenantsData?.tenants || [];

  // Use API data only - no mock fallback
  const sessions = (sessionsData?.sessions || []).map(s => ({
    id: s.id,
    tenant: s.tenant_name || s.tenants?.name || 'Unknown Tenant',
    tenantId: s.tenant_id,
    user: s.user_name || s.users?.full_name || 'Unknown User',
    userEmail: s.user_email || s.users?.email || '',
    type: s.session_type || 'screen_share',
    status: s.status,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    expiresAt: s.expires_at,
    requestedAt: s.requested_at || s.created_at,
    agent: s.agent_name || s.agent?.full_name || '',
    reason: s.reason || '',
    resolution: s.resolution || '',
    notes: s.notes || '',
    actions: s.actions || [],
  }));

  // Stats
  const activeSessions = sessions.filter((s) => s.status === 'active').length;
  const waitingSessions = sessions.filter((s) => s.status === 'waiting').length;
  const completedToday = sessions.filter(
    (s) => s.status === 'completed' && s.endedAt && new Date(s.endedAt).toDateString() === new Date().toDateString()
  ).length;
  const expiredSessions = sessions.filter((s) => s.status === 'expired').length;

  // Filter sessions
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesType = typeFilter === 'all' || session.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle ending a session
  const handleEndSession = async (sessionId) => {
    setActionLoading(sessionId);
    try {
      await endSession(sessionId, 'Session ended by agent');
      await refetch();
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle creating a new session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionData.tenant_id || !newSessionData.reason) return;
    
    try {
      await createSession(newSessionData);
      setShowNewSessionModal(false);
      setNewSessionData({
        tenant_id: '',
        type: 'screen_share',
        reason: '',
        duration_minutes: 60,
      });
      await refetch();
    } catch (err) {
      console.error('Failed to create session:', err);
      toast.error(`Failed to create session: ${err.message}`);
    }
  };

  // Handle joining a waiting session
  const handleJoinSession = async (sessionId) => {
    setActionLoading(sessionId);
    try {
      // Call API to join the session (sets status to active, assigns developer)
      const result = await joinSession(sessionId);
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      // Clear new requests badge since we're handling it
      clearNewRequests();
      // Navigate to the session detail page
      navigate(`${sessionId}`);
    } catch (err) {
      console.error('Failed to join session:', err);
      toast.error(`Failed to join session: ${err.message}`);
      // Refetch to show latest state in case of race condition
      await refetch();
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (diff < 0) {
      // Future date (expires at)
      const futureMins = Math.floor(-diff / (1000 * 60));
      return `in ${futureMins}m`;
    }
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getDuration = (start, end) => {
    if (!start) return '—';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diff = endDate - startDate;
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Support Sessions</h1>
            {/* Real-time connection indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-800 border border-gray-700">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">
                {isConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
            {/* New requests badge */}
            {newRequests.length > 0 && (
              <button
                onClick={clearNewRequests}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/30 transition-colors"
              >
                <Bell className="w-3 h-3" />
                {newRequests.length} new
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Remote support and screen sharing sessions with tenants
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                : 'border-gray-600 bg-gray-800 text-gray-500 hover:bg-gray-700'
            }`}
            title={soundEnabled ? 'Sound notifications on' : 'Sound notifications off'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button 
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => setShowNewSessionModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Error message */}
      {apiError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">Failed to load sessions: {apiError.message || 'Unknown error'}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-emerald-400">Active Sessions</p>
            <Play className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{activeSessions}</p>
          <p className="mt-1 text-xs text-emerald-500">Currently in progress</p>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-amber-400">Waiting</p>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{waitingSessions}</p>
          <p className="mt-1 text-xs text-amber-500">Pending agent</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Completed Today</p>
            <CheckCircle className="h-5 w-5 text-gray-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{completedToday}</p>
          <p className="mt-1 text-xs text-gray-500">Sessions resolved</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Expired</p>
            <XCircle className="h-5 w-5 text-gray-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{expiredSessions}</p>
          <p className="mt-1 text-xs text-gray-500">Not attended</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by tenant, user, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="waiting">Waiting</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="screen_share">Screen Share</option>
            <option value="view_only">View Only</option>
            <option value="chat">Chat Support</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filteredSessions.map((session) => {
          const StatusIcon = statusConfig[session.status].icon;
          const TypeIcon = typeConfig[session.type].icon;
          const isExpanded = expandedSession === session.id;

          return (
            <div
              key={session.id}
              className={`rounded-lg border overflow-hidden transition-all ${
                session.status === 'active'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : session.status === 'waiting'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${statusConfig[session.status].color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/tenants/${session.tenantId}`}
                          className="font-medium text-white hover:text-emerald-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {session.tenant}
                        </Link>
                        <span className={`inline-flex items-center gap-1 text-xs ${typeConfig[session.type].color}`}>
                          <TypeIcon className="h-3.5 w-3.5" />
                          {typeConfig[session.type].label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[session.status].color}`}>
                          {statusConfig[session.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{session.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="h-4 w-4" />
                        {session.user}
                      </div>
                      <p className="text-xs text-gray-500">{session.userEmail}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white">
                        {session.status === 'active' || session.status === 'completed'
                          ? getDuration(session.startedAt, session.endedAt)
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.startedAt
                          ? formatTime(session.startedAt)
                          : formatTime(session.requestedAt)}
                      </p>
                    </div>
                    {session.status === 'active' && (
                      <>
                        <Link
                          to={session.id}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white transition-colors ${
                            session.type === 'chat' 
                              ? 'bg-blue-600 hover:bg-blue-500' 
                              : session.type === 'screen_share'
                              ? 'bg-purple-600 hover:bg-purple-500'
                              : 'bg-indigo-600 hover:bg-indigo-500'
                          }`}
                        >
                          {session.type === 'chat' ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : session.type === 'screen_share' ? (
                            <Monitor className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          {session.type === 'chat' ? 'Chat' : session.type === 'screen_share' ? 'Screen' : 'View'}
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndSession(session.id);
                          }}
                          disabled={actionLoading === session.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          End
                        </button>
                      </>
                    )}
                    {session.status === 'waiting' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinSession(session.id);
                        }}
                        disabled={actionLoading === session.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-700 bg-gray-900/50 p-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Session Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-gray-500">Agent:</span>{' '}
                          <span className="text-white">{session.agent || 'Unassigned'}</span>
                        </p>
                        <p>
                          <span className="text-gray-500">Started:</span>{' '}
                          <span className="text-white">
                            {session.startedAt
                              ? new Date(session.startedAt).toLocaleString()
                              : 'Not started'}
                          </span>
                        </p>
                        {session.endedAt && (
                          <p>
                            <span className="text-gray-500">Ended:</span>{' '}
                            <span className="text-white">
                              {new Date(session.endedAt).toLocaleString()}
                            </span>
                          </p>
                        )}
                        <p>
                          <span className="text-gray-500">Expires:</span>{' '}
                          <span className="text-white">
                            {new Date(session.expiresAt).toLocaleString()}
                          </span>
                        </p>
                      </div>
                      {session.resolution && (
                        <div className="mt-4 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-300">
                          <strong>Resolution:</strong> {session.resolution}
                        </div>
                      )}
                      {session.notes && (
                        <div className="mt-4 rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-400">
                          <strong className="text-white">Notes:</strong> {session.notes}
                        </div>
                      )}
                    </div>

                    {session.actions && session.actions.length > 0 && (
                      <div>
                        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Activity Log
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {session.actions.map((action, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 text-sm border-l-2 border-gray-700 pl-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-white">{action.action}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(action.time).toLocaleTimeString()} • {action.agent}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {session.status === 'active' && (
                    <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <ShieldAlert className="h-5 w-5" />
                        Remember: All actions are logged for security compliance
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Session type specific action button */}
                        <Link
                          to={session.id}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                            session.type === 'chat' 
                              ? 'bg-blue-600 hover:bg-blue-500' 
                              : session.type === 'screen_share'
                              ? 'bg-purple-600 hover:bg-purple-500'
                              : 'bg-indigo-600 hover:bg-indigo-500'
                          }`}
                        >
                          {session.type === 'chat' ? (
                            <>
                              <MessageSquare className="h-4 w-4" />
                              Open Chat
                            </>
                          ) : session.type === 'screen_share' ? (
                            <>
                              <Monitor className="h-4 w-4" />
                              View Screen
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              View Only
                            </>
                          )}
                        </Link>
                        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
                          <Video className="h-4 w-4" />
                          Record Session
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View chat history for completed chat sessions */}
                  {session.status === 'completed' && session.type === 'chat' && (
                    <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-end">
                      <Link
                        to={session.id}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" />
                        View Chat History
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSessions.length === 0 && !isLoading && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 py-12 text-center">
          <Monitor className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-gray-400">No support sessions found</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or create a new session</p>
        </div>
      )}

      {isLoading && filteredSessions.length === 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 py-12 text-center">
          <Loader2 className="mx-auto h-12 w-12 text-emerald-500 animate-spin" />
          <p className="mt-2 text-gray-400">Loading sessions...</p>
        </div>
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Start Support Session</h2>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Tenant *
                </label>
                <select
                  value={newSessionData.tenant_id}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, tenant_id: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2 px-3 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Choose a tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Session Type *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'screen_share', label: 'Screen Share', icon: Monitor },
                    { value: 'view_only', label: 'View Only', icon: Eye },
                    { value: 'chat', label: 'Chat Support', icon: MessageSquare },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewSessionData(prev => ({ ...prev, type: option.value }))}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                        newSessionData.type === option.value
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <option.icon className="h-5 w-5" />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason / Description *
                </label>
                <textarea
                  value={newSessionData.reason}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Describe the reason for this support session..."
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2 px-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={newSessionData.duration_minutes}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2 px-3 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-800 py-2 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSession || !newSessionData.tenant_id || !newSessionData.reason}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {creatingSession ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Session
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
