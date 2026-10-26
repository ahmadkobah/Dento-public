// src/admin/components/ScreenShareSession.jsx
// Component for admin to share their screen with developer during support sessions

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
  AlertCircle
} from 'lucide-react';
import { useLiveKit, VideoTrack } from '../../hooks/useLiveKit';

export default function ScreenShareSession({ 
  sessionId, 
  onClose, 
  sessionType: _sessionType = 'screen_share' 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [localError, setLocalError] = useState(null);
  
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const {
    isConnecting,
    isConnected,
    error,
    localTracks,
    remoteTracks,
    isScreenSharing,
    isRecording,
    connect,
    disconnect,
    toggleScreenShare,
    permissions,
  } = useLiveKit({
    sessionId,
    role: 'admin',
    autoConnect: true,
  });
  
  // Combine errors from hook and local errors
  const connectionError = error || localError;

  // Show/hide controls on mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        if (isScreenSharing) {
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
  }, [isScreenSharing]);

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

  const handleStartScreenShare = async () => {
    try {
      setLocalError(null);
      await toggleScreenShare();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setLocalError('Screen sharing was cancelled or denied');
      } else {
        setLocalError(err.message);
      }
    }
  };

  // Get screen share track
  const screenTrack = localTracks.find(t => t.source === 'screen_share');
  const developerVideoTrack = remoteTracks.find(t => t.track?.kind === 'video');

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
              {isConnecting ? 'Connecting...' : isConnected ? 'Live Session' : 'Disconnected'}
            </span>
            {isRecording && (
              <div className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-white text-sm">
                <Circle className="w-3 h-3 fill-current animate-pulse" />
                Recording
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
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

      {/* Main Content */}
      <div className="relative h-[400px] flex items-center justify-center bg-gray-800">
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
            <h3 className="text-white text-lg font-medium mb-2">Screen Share Session</h3>
            <p className="text-gray-400 mb-6">
              Share your screen with the support developer
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

        {/* Connected - Not Sharing */}
        {isConnected && !isScreenSharing && (
          <div className="text-center p-8">
            <MonitorOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">You're Connected</h3>
            <p className="text-gray-400 mb-6">
              Click below to start sharing your screen with the developer
            </p>
            <button
              onClick={handleStartScreenShare}
              disabled={!permissions?.canPublish}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              <Monitor className="w-5 h-5" />
              Start Screen Share
            </button>
            {!permissions?.canPublish && (
              <p className="text-yellow-400 text-sm mt-2">
                You don't have permission to share screen
              </p>
            )}
          </div>
        )}

        {/* Screen Share Preview */}
        {isScreenSharing && screenTrack && (
          <div className="w-full h-full">
            <VideoTrack 
              track={screenTrack} 
              className="w-full h-full object-contain"
            />
            
            {/* Developer video thumbnail */}
            {developerVideoTrack && (
              <div className="absolute bottom-20 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-lg">
                <VideoTrack 
                  track={developerVideoTrack.track} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-2 text-white text-xs bg-black/50 px-1 rounded">
                  Developer
                </div>
              </div>
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
          {/* Screen Share Toggle */}
          <button
            onClick={handleStartScreenShare}
            disabled={!isConnected || !permissions?.canPublish}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-6 h-6 text-white" />
            ) : (
              <Monitor className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={() => {
              disconnect();
              onClose();
            }}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
            title="End session"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Session Info */}
        <div className="flex items-center justify-center gap-4 mt-3 text-gray-400 text-sm">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {remoteTracks.length > 0 ? '1 viewer' : 'No viewers yet'}
          </span>
          {isScreenSharing && (
            <span className="flex items-center gap-1">
              <Monitor className="w-4 h-4" />
              Sharing screen
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
