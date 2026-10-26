import { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  X,
  Loader2,
  Send,
  Monitor,
  Eye,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Minimize2,
  Maximize2,
  XCircle,
  Star,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Floating support session widget
 * Shows when admin has an active/waiting support session
 */
export default function SupportSessionWidget({
  session,
  messages,
  sending,
  onSendMessage,
  onCancel,
  onRate,
  error,
}) {
  const [minimized, setMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (!minimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, minimized]);

  // Focus input when expanded
  useEffect(() => {
    if (!minimized && session?.session_type === 'chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [minimized, session?.session_type]);

  // Show rating prompt when session completes
  useEffect(() => {
    if (session?.status === 'completed' && !session?.rating) {
      setShowRating(true);
    }
  }, [session?.status, session?.rating]);

  if (!session) return null;

  const isWaiting = session.status === 'waiting';
  const isActive = session.status === 'active';
  const isCompleted = session.status === 'completed';
  const isChat = session.session_type === 'chat';

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;
    
    const success = await onSendMessage(messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  const handleSubmitRating = async () => {
    if (!rating || submittingRating) return;
    
    setSubmittingRating(true);
    try {
      const success = await onRate(session.id, rating, ratingComment);
      if (success) {
        setShowRating(false);
      }
    } finally {
      setSubmittingRating(false);
    }
  };

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

  // Minimized floating button
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className={clsx(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all',
          isWaiting
            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
            : 'bg-green-500 text-white hover:bg-green-600'
        )}
      >
        <Headphones className="h-5 w-5" />
        <span className="font-medium">
          {isWaiting ? 'Waiting for support...' : 'Support Active'}
        </span>
        {isWaiting && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        <Maximize2 className="h-4 w-4 ml-1" />
      </button>
    );
  }

  // Expanded widget
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[500px]">
      {/* Header */}
      <div
        className={clsx(
          'px-4 py-3 flex items-center justify-between gap-3',
          isWaiting ? 'bg-yellow-50' : 'bg-green-50'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'p-2 rounded-lg',
              isWaiting ? 'bg-yellow-100' : 'bg-green-100'
            )}
          >
            <TypeIcon
              className={clsx(
                'h-5 w-5',
                isWaiting ? 'text-yellow-600' : 'text-green-600'
              )}
            />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">
              {typeLabel[session.session_type]} Support
            </h4>
            <div className="flex items-center gap-1.5 text-xs">
              {isWaiting ? (
                <>
                  <Clock className="h-3 w-3 text-yellow-600" />
                  <span className="text-yellow-700">Waiting for developer...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-green-700">Connected</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cancel Session"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Waiting state */}
        {isWaiting && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="h-10 w-10 text-yellow-500 animate-spin mb-4" />
            <p className="text-gray-600 text-sm mb-2">
              Your request has been submitted
            </p>
            <p className="text-gray-500 text-xs">
              A developer will join shortly to assist you
            </p>
            <div className="mt-4 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              <strong>Reason:</strong> {session.reason}
            </div>
          </div>
        )}

        {/* Chat interface for active chat sessions */}
        {isActive && isChat && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No messages yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Start the conversation below
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_type === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={clsx(
                        'flex',
                        isAdmin ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={clsx(
                          'max-w-[80%] px-3 py-2 rounded-lg text-sm',
                          isAdmin
                            ? 'bg-primary-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-900 rounded-bl-none'
                        )}
                      >
                        <p className="break-words">{msg.message}</p>
                        <p
                          className={clsx(
                            'text-[10px] mt-1',
                            isAdmin ? 'text-primary-200' : 'text-gray-400'
                          )}
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
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-gray-100 bg-gray-50"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Active non-chat session */}
        {isActive && !isChat && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mb-4" />
            <p className="text-gray-600 text-sm mb-2">
              Developer is connected!
            </p>
            <p className="text-gray-500 text-xs mb-4">
              {session.session_type === 'screen_share'
                ? 'Click below to start sharing your screen'
                : 'They can now view your screen'}
            </p>
            {session.session_type === 'screen_share' && (
              <button
                onClick={() => {
                  // Open screen share in a new modal/window
                  window.dispatchEvent(new CustomEvent('open-screen-share', {
                    detail: { sessionId: session.id }
                  }));
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                Start Screen Share
              </button>
            )}
          </div>
        )}

        {/* Completed session - Rating UI */}
        {isCompleted && showRating && !session.rating && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle className="h-10 w-10 text-blue-500 mb-4" />
            <p className="text-gray-900 font-medium mb-2">Session Completed</p>
            <p className="text-gray-500 text-sm mb-4">How was your support experience?</p>
            
            {/* Star rating */}
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  className="p-1 transition-colors"
                >
                  <Star
                    className={clsx(
                      'h-8 w-8 transition-colors',
                      (ratingHover || rating) >= star
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Comment input */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Tell us more about your experience (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
            />

            {/* Submit button */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowRating(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={!rating || submittingRating}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {submittingRating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Already rated or rating skipped */}
        {isCompleted && (!showRating || session.rating) && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <CheckCircle className="h-10 w-10 text-blue-500 mb-4" />
            <p className="text-gray-900 font-medium mb-2">Session Completed</p>
            {session.rating && (
              <div className="flex gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={clsx(
                      'h-5 w-5',
                      session.rating >= star
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
            )}
            <p className="text-gray-500 text-sm">Thank you for your feedback!</p>
          </div>
        )}
      </div>
    </div>
  );
}
