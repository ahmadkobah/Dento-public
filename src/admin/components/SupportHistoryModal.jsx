import { useEffect } from 'react';
import {
  X,
  History,
  Monitor,
  Eye,
  MessageCircle,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Modal showing admin's support session history
 */
export default function SupportHistoryModal({
  isOpen,
  onClose,
  history,
  loading,
  onRefresh,
}) {
  useEffect(() => {
    if (isOpen && onRefresh) {
      onRefresh();
    }
  }, [isOpen, onRefresh]);

  if (!isOpen) return null;

  const typeIcon = {
    screen_share: Monitor,
    view_only: Eye,
    chat: MessageCircle,
  };

  const typeLabel = {
    screen_share: 'Screen Share',
    view_only: 'View Only',
    chat: 'Chat',
  };

  const statusConfig = {
    completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    expired: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (start, end) => {
    if (!start || !end) return '—';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate - startDate;
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Support Session History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No past support sessions</p>
              <p className="text-gray-400 text-sm mt-1">
                Your completed sessions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((session) => {
                const TypeIcon = typeIcon[session.session_type] || MessageCircle;
                const StatusConfig = statusConfig[session.status] || statusConfig.completed;
                const StatusIcon = StatusConfig.icon;

                return (
                  <div
                    key={session.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <TypeIcon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {typeLabel[session.session_type]}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1',
                                StatusConfig.color
                              )}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {session.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {session.reason}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(session.ended_at || session.created_at)}
                            </span>
                            {session.started_at && session.ended_at && (
                              <span>
                                Duration: {getDuration(session.started_at, session.ended_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rating display */}
                      {session.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={clsx(
                                'h-4 w-4',
                                session.rating >= star
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resolution */}
                    {session.resolution && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Resolution:</span>{' '}
                          {session.resolution}
                        </p>
                      </div>
                    )}

                    {/* Rating comment */}
                    {session.rating_comment && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        "{session.rating_comment}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
