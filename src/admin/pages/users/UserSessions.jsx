import { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  Clock, 
  LogOut, 
  AlertTriangle,
  RefreshCw,
  Shield,
  User,
  Search
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

const UserSessions = () => {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'ended'
  const [endingSession, setEndingSession] = useState(null);
  const [_currentUserId, setCurrentUserId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
      setCurrentSessionId(localStorage.getItem('session_id'));

      // Fetch all sessions with user info
      let query = supabase
        .from('user_sessions')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('last_activity', { ascending: false });

      if (filterActive === 'active') {
        query = query.eq('is_active', true);
      } else if (filterActive === 'ended') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [filterActive]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const endSession = async (sessionId) => {
    if (sessionId === currentSessionId) {
      toast.warning("You cannot end your current session from here. Please logout instead.");
      return;
    }

    setEndingSession(sessionId);
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      // Refresh list
      fetchSessions();
    } catch (err) {
      console.error('Error ending session:', err);
      toast.error('Failed to end session');
    } finally {
      setEndingSession(null);
    }
  };

  const _endAllSessionsForUser = async (userId) => {
    if (!confirm('Are you sure you want to end all sessions for this user?')) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true)
        .neq('id', currentSessionId); // Don't end current session if it's ours

      if (error) throw error;
      fetchSessions();
    } catch (err) {
      console.error('Error ending sessions:', err);
      toast.error('Failed to end sessions');
    }
  };

  const getDeviceIcon = (deviceInfo) => {
    const type = deviceInfo?.deviceType?.toLowerCase();
    if (type === 'mobile') return <Smartphone className="w-5 h-5" />;
    if (type === 'tablet') return <Tablet className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filteredSessions = sessions.filter(session => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = `${session.profiles?.first_name || ''} ${session.profiles?.last_name || ''}`.toLowerCase();
    const email = (session.profiles?.email || '').toLowerCase();
    const ip = (session.ip_address || '').toLowerCase();
    return name.includes(search) || email.includes(search) || ip.includes(search);
  });

  // Group sessions by user
  const groupedSessions = filteredSessions.reduce((acc, session) => {
    const userId = session.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        profile: session.profiles,
        sessions: [],
        activeSessions: 0
      };
    }
    acc[userId].sessions.push(session);
    if (session.is_active) acc[userId].activeSessions++;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-500" />
            Session Management
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor and manage active user sessions across all devices
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Sessions' },
              { id: 'active', label: 'Active' },
              { id: 'ended', label: 'Ended' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setFilterActive(filter.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterActive === filter.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.is_active).length}
              </p>
              <p className="text-sm text-gray-500">Active Sessions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(groupedSessions).filter(g => g.activeSessions > 0).length}
              </p>
              <p className="text-sm text-gray-500">Users Online</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Monitor className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.is_active && s.device_info?.deviceType === 'Desktop').length}
              </p>
              <p className="text-sm text-gray-500">Desktop Sessions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {sessions.filter(s => s.is_active && s.device_info?.deviceType === 'Mobile').length}
              </p>
              <p className="text-sm text-gray-500">Mobile Sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No sessions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSessions.map(session => (
                <tr 
                  key={session.id} 
                  className={`hover:bg-gray-50 ${session.id === currentSessionId ? 'bg-primary-50' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {session.profiles?.first_name} {session.profiles?.last_name}
                          {session.id === currentSessionId && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{session.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(session.device_info)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.device_info?.browser || 'Unknown'} on {session.device_info?.os || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.device_info?.deviceType || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{session.ip_address || 'Unknown'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatTimeAgo(session.last_activity)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {session.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Ended
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {session.is_active && session.id !== currentSessionId && (
                      <button
                        onClick={() => endSession(session.id)}
                        disabled={endingSession === session.id}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 ml-auto"
                      >
                        {endingSession === session.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800">Security Notice</p>
          <p className="text-sm text-yellow-700 mt-1">
            Ending a session will immediately log out the user from that device. They will need to log in again to continue.
            This action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserSessions;
