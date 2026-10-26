// src/developer/components/ScreenShareViewer.jsx
// Component for developers to view and interact with admin's shared screen

import { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  MonitorOff, 
  X, 
  Maximize2, 
  Minimize2,
  Circle,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  AlertCircle,
  Download,
  Play,
  StopCircle
} from 'lucide-react';
import { useLiveKit, VideoTrack, AudioTrack } from '../../hooks/useLiveKit';

export default function ScreenShareViewer({ 
  sessionId, 
  onClose,
  canRecord = true
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [localError, setLocalError] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [showRecordings, setShowRecordings] = useState(false);
  
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const {
    isConnecting,
    isConnected,
    error,
    remoteTracks,
    isRecording,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    getRecordings,
  } = useLiveKit({
    sessionId,
    role: 'developer',
    autoConnect: true,
  });
  
  // Combine errors from hook and local errors
  const connectionError = error || localError;

  // Fetch recordings on mount
  useEffect(() => {
    if (sessionId) {
      getRecordings().then(setRecordings);
    }
  }, [sessionId, getRecordings]);

  // Show/hide controls on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        if (remoteTracks.length > 0) {
          setShowControls(false);
        }
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [remoteTracks.length]);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Handle recording toggle
  const handleRecordingToggle = async () => {
    try {
      setLocalError(null);
      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (err) {
      setLocalError(err.message);
    }
  };

  // Get admin's screen share track
  const adminScreenTrack = remoteTracks.find(t => t.track?.source === 'screen_share' || t.track?.kind === 'video');
  const adminAudioTrack = remoteTracks.find(t => t.track?.kind === 'audio');

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-gray-900 rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'relative'
      }`}
    >
      {/* Header */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-white font-medium">
              {isConnecting ? 'Connecting...' : isConnected ? 'Viewing Screen Share' : 'Disconnected'}
            </span>
            {isRecording && (
              <div className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-white text-sm">
                <Circle className="w-3 h-3 fill-current animate-pulse" />
                Recording
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {recordings.length > 0 && (
              <button
                onClick={() => setShowRecordings(!showRecordings)}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors relative"
                title="View recordings"
              >
                <Download className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-blue-500 text-xs text-white w-4 h-4 rounded-full flex items-center justify-center">
                  {recordings.length}
                </span>
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recordings Panel */}
      {showRecordings && (
        <div className="absolute top-16 right-4 z-20 bg-gray-800 rounded-lg shadow-xl w-72 max-h-80 overflow-y-auto">
          <div className="p-3 border-b border-gray-700">
            <h4 className="text-white font-medium">Session Recordings</h4>
          </div>
          <div className="p-2">
            {recordings.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No recordings yet</p>
            ) : (
              <div className="space-y-2">
                {recordings.map((rec, i) => (
                  <div 
                    key={rec.id}
                    className="p-2 bg-gray-700/50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white text-sm">Recording {i + 1}</p>
                      <p className="text-gray-400 text-xs">
                        {formatDuration(rec.duration_seconds)} • {rec.status}
                      </p>
                    </div>
                    {rec.file_url && (
                      <a
                        href={rec.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4 text-white" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative h-[500px] flex items-center justify-center bg-gray-800">
        {/* Connection Error */}
        {connectionError && (
          <div className="absolute top-16 left-4 right-4 z-20">
            <div className="bg-red-500/90 text-white px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{connectionError}</span>
            </div>
          </div>
        )}

        {/* Not Connected State */}
        {!isConnected && !isConnecting && (
          <div className="text-center p-8">
            <Monitor className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">Screen Share Viewer</h3>
            <p className="text-gray-400 mb-6">
              Connect to view the admin's shared screen
            </p>
            <button
              onClick={connect}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect to Session
            </button>
          </div>
        )}

        {/* Connecting State */}
        {isConnecting && (
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Connecting to session...</p>
          </div>
        )}

        {/* Connected - Waiting for Screen Share */}
        {isConnected && !adminScreenTrack && (
          <div className="text-center p-8">
            <MonitorOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">Waiting for Screen Share</h3>
            <p className="text-gray-400">
              The admin hasn't started sharing their screen yet
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Screen Share View */}
        {adminScreenTrack && (
          <div className="w-full h-full">
            <VideoTrack 
              track={adminScreenTrack.track} 
              className="w-full h-full object-contain"
            />
            
            {/* Audio track (hidden) */}
            {adminAudioTrack && (
              <AudioTrack track={adminAudioTrack.track} />
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Recording Toggle */}
          {canRecord && isConnected && (
            <button
              onClick={handleRecordingToggle}
              className={`p-3 rounded-full transition-colors ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? (
                <StopCircle className="w-6 h-6 text-white" />
              ) : (
                <Circle className="w-6 h-6 text-white" />
              )}
            </button>
          )}

          {/* End Call */}
          <button
            onClick={() => {
              disconnect();
              onClose();
            }}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
            title="Leave session"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Session Info */}
        <div className="flex items-center justify-center gap-4 mt-3 text-gray-400 text-sm">
          {adminScreenTrack && (
            <span className="flex items-center gap-1 text-green-400">
              <Monitor className="w-4 h-4" />
              Screen sharing active
            </span>
          )}
          {isRecording && (
            <span className="flex items-center gap-1 text-red-400">
              <Circle className="w-3 h-3 fill-current" />
              Recording in progress
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
