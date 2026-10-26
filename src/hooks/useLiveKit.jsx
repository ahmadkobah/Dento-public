// src/hooks/useLiveKit.js
// Shared hook for LiveKit room connections and screen sharing

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for managing LiveKit room connections
 * @param {Object} options
 * @param {string} options.sessionId - The support session ID
 * @param {string} options.role - Either 'admin' or 'developer'
 * @param {boolean} options.autoConnect - Whether to connect automatically
 */
export function useLiveKit({ sessionId, role, autoConnect = false }) {
  const [room, setRoom] = useState(null);
  const [token, setToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [localTracks, setLocalTracks] = useState([]);
  const [remoteTracks, setRemoteTracks] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const roomRef = useRef(null);
  const screenTrackRef = useRef(null);

  // Fetch LiveKit token from edge function
  const fetchToken = useCallback(async () => {
    if (!sessionId || !role) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('livekit-token', {
        method: 'POST',
        body: { session_id: sessionId, role },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { token, room_name, livekit_url, permissions } = response.data;
      setToken(token);
      setLivekitUrl(livekit_url);
      setPermissions(permissions);

      return { token, roomName: room_name, livekitUrl: livekit_url, permissions };
    } catch (err) {
      console.error('Error fetching LiveKit token:', err);
      setError(err.message);
      return null;
    }
  }, [sessionId, role]);

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get token if we don't have one
      const tokenData = token ? { token, livekitUrl } : await fetchToken();
      if (!tokenData) {
        throw new Error('Failed to get LiveKit token');
      }

      // Dynamic import of livekit-client
      const { Room, RoomEvent, Track } = await import('livekit-client');

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1920, height: 1080, frameRate: 30 },
        },
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        setIsConnected(true);
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        setRemoteTracks(prev => [...prev, { track, participant }]);
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        setRemoteTracks(prev => prev.filter(t => t.track !== track));
      });

      newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
        setLocalTracks(prev => [...prev, publication.track]);
      });

      newRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        setLocalTracks(prev => prev.filter(t => t !== publication.track));
      });

      newRoom.on(RoomEvent.RecordingStatusChanged, (isRecording) => {
        setIsRecording(isRecording);
      });

      // Connect to room
      await newRoom.connect(tokenData.livekitUrl || livekitUrl, tokenData.token || token);

      roomRef.current = newRoom;
      setRoom(newRoom);
      setIsConnecting(false);

      return newRoom;
    } catch (err) {
      console.error('Error connecting to LiveKit:', err);
      setError(err.message);
      setIsConnecting(false);
      return null;
    }
  }, [isConnecting, isConnected, token, livekitUrl, fetchToken]);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setLocalTracks([]);
      setRemoteTracks([]);
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!roomRef.current) {
      throw new Error('Not connected to room');
    }

    if (!permissions?.canPublish) {
      throw new Error('You do not have permission to share screen');
    }

    try {
      const { createLocalScreenTracks } = await import('livekit-client');
      
      const tracks = await createLocalScreenTracks({
        audio: true, // Include system audio if available
      });

      for (const track of tracks) {
        await roomRef.current.localParticipant.publishTrack(track, {
          simulcast: true,
          videoEncoding: {
            maxBitrate: 3_000_000,
            maxFramerate: 30,
          },
        });
      }

      screenTrackRef.current = tracks;
      return tracks;
    } catch (err) {
      console.error('Error starting screen share:', err);
      throw err;
    }
  }, [permissions]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!roomRef.current || !screenTrackRef.current) return;

    try {
      for (const track of screenTrackRef.current) {
        await roomRef.current.localParticipant.unpublishTrack(track);
        track.stop();
      }
      screenTrackRef.current = null;
    } catch (err) {
      console.error('Error stopping screen share:', err);
      throw err;
    }
  }, []);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (screenTrackRef.current) {
      await stopScreenShare();
      return false;
    } else {
      await startScreenShare();
      return true;
    }
  }, [startScreenShare, stopScreenShare]);

  // Start recording (developer only)
  const startRecording = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('livekit-token', {
        method: 'PUT',
        body: { session_id: sessionId, action: 'start_recording' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      setIsRecording(true);
      return response.data;
    } catch (err) {
      console.error('Error starting recording:', err);
      throw err;
    }
  }, [sessionId]);

  // Stop recording (developer only)
  const stopRecording = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('livekit-token', {
        method: 'PUT',
        body: { session_id: sessionId, action: 'stop_recording' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      setIsRecording(false);
      return response.data;
    } catch (err) {
      console.error('Error stopping recording:', err);
      throw err;
    }
  }, [sessionId]);

  // Get recordings for session
  const getRecordings = useCallback(async () => {
    if (!sessionId) return [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('livekit-token', {
        method: 'GET',
        body: null,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data.recordings || [];
    } catch (err) {
      console.error('Error fetching recordings:', err);
      return [];
    }
  }, [sessionId]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && sessionId && role) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, sessionId, role]);

  return {
    // State
    room,
    token,
    livekitUrl,
    isConnecting,
    isConnected,
    error,
    localTracks,
    remoteTracks,
    permissions,
    isRecording,
    isScreenSharing: !!screenTrackRef.current,

    // Actions
    connect,
    disconnect,
    fetchToken,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    startRecording,
    stopRecording,
    getRecordings,
  };
}

/**
 * Component for rendering a video track
 */
export function VideoTrack({ track, className = '' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !track) return;
    
    track.attach(videoEl);

    return () => {
      track.detach(videoEl);
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      className={className}
      autoPlay
      playsInline
      muted={track?.source === 'screen_share'}
    />
  );
}

/**
 * Component for rendering an audio track
 */
export function AudioTrack({ track }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !track) return;
    
    track.attach(audioEl);

    return () => {
      track.detach(audioEl);
    };
  }, [track]);

  return <audio ref={audioRef} autoPlay />;
}

export default useLiveKit;
