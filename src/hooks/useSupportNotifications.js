// src/hooks/useSupportNotifications.js
// Hook for support session notifications - toasts and browser notifications

import { useEffect, useCallback, useRef } from 'react';
import { useToast } from './useToast';

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Hook for managing support notifications
 * @param {Object} options
 * @param {Object} options.session - Current support session
 * @param {boolean} options.enableBrowserNotifications - Enable browser notifications
 */
export function useSupportNotifications({ 
  session = null, 
  messages = [],
  enableBrowserNotifications = true,
  role = 'admin' // 'admin' or 'developer'
}) {
  const toast = useToast();
  const prevSessionRef = useRef(null);
  const prevMessagesRef = useRef([]);
  const hasPermissionRef = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (enableBrowserNotifications) {
      requestNotificationPermission().then((granted) => {
        hasPermissionRef.current = granted;
      });
    }
  }, [enableBrowserNotifications]);

  // Show browser notification
  const showBrowserNotification = useCallback((title, body, icon = '/favicon.ico') => {
    if (!hasPermissionRef.current || !enableBrowserNotifications) return;
    if (document.visibilityState === 'visible') return; // Don't show if page is visible

    try {
      const notification = new Notification(title, {
        body,
        icon,
        tag: 'support-notification',
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error('Failed to show notification:', err);
    }
  }, [enableBrowserNotifications]);

  // Show toast notification
  const showToast = useCallback((type, message, title) => {
    if (toast[type]) {
      toast[type](message, { title });
    }
  }, [toast]);

  // Watch for session status changes
  useEffect(() => {
    if (!session) {
      prevSessionRef.current = null;
      return;
    }

    const prevSession = prevSessionRef.current;

    // First load - don't notify
    if (!prevSession) {
      prevSessionRef.current = session;
      return;
    }

    // Status changed
    if (prevSession.status !== session.status) {
      if (role === 'admin') {
        // Admin notifications
        switch (session.status) {
          case 'active':
            showToast('success', 'A developer has joined your session!', 'Support Connected');
            showBrowserNotification('Support Connected', 'A developer has joined your session');
            break;
          case 'completed':
            showToast('info', 'Your support session has ended', 'Session Completed');
            showBrowserNotification('Support Ended', 'Your support session has been completed');
            break;
          case 'cancelled':
            showToast('warning', 'Support session was cancelled', 'Session Cancelled');
            break;
        }
      } else {
        // Developer notifications
        switch (session.status) {
          case 'completed':
            showToast('info', 'The support session has ended', 'Session Completed');
            break;
          case 'cancelled':
            showToast('warning', 'Session was cancelled by the admin', 'Session Cancelled');
            break;
        }
      }
    }

    prevSessionRef.current = session;
  }, [session, role, showToast, showBrowserNotification]);

  // Watch for new messages
  useEffect(() => {
    if (messages.length === 0) {
      prevMessagesRef.current = [];
      return;
    }

    const prevMessages = prevMessagesRef.current;
    
    // First load - don't notify
    if (prevMessages.length === 0) {
      prevMessagesRef.current = messages;
      return;
    }

    // Check for new messages
    const newMessages = messages.filter(
      msg => !prevMessages.find(p => p.id === msg.id)
    );

    // Notify for messages from the other party
    newMessages.forEach(msg => {
      const isOwnMessage = 
        (role === 'admin' && msg.sender_type === 'admin') ||
        (role === 'developer' && msg.sender_type === 'developer');

      if (!isOwnMessage) {
        const senderLabel = msg.sender_type === 'admin' ? 'Admin' : 'Developer';
        const truncatedMessage = msg.message?.length > 50 
          ? msg.message.substring(0, 50) + '...' 
          : msg.message;

        showToast('info', truncatedMessage, `New message from ${senderLabel}`);
        showBrowserNotification(`New message from ${senderLabel}`, msg.message || 'New message');
      }
    });

    prevMessagesRef.current = messages;
  }, [messages, role, showToast, showBrowserNotification]);

  // Manual notification methods
  return {
    // Notify when a new support request comes in (for developer)
    notifyNewSession: useCallback((session) => {
      const typeLabel = {
        chat: 'Chat',
        screen_share: 'Screen Share',
        view_only: 'View Only',
      };
      showToast('info', `${typeLabel[session.session_type] || 'Support'} request received`, 'New Support Request');
      showBrowserNotification('New Support Request', `${session.reason || 'A user needs help'}`);
    }, [showToast, showBrowserNotification]),

    // Notify when someone joins
    notifyJoined: useCallback((participant) => {
      showToast('success', `${participant} has joined the session`, 'Participant Joined');
    }, [showToast]),

    // Notify when someone leaves
    notifyLeft: useCallback((participant) => {
      showToast('warning', `${participant} has left the session`, 'Participant Left');
    }, [showToast]),

    // Notify recording started
    notifyRecordingStarted: useCallback(() => {
      showToast('info', 'The session is now being recorded', 'Recording Started');
      showBrowserNotification('Recording Started', 'The support session is now being recorded');
    }, [showToast, showBrowserNotification]),

    // Notify recording stopped
    notifyRecordingStopped: useCallback(() => {
      showToast('info', 'Recording has been stopped', 'Recording Stopped');
    }, [showToast]),

    // Generic notification methods
    showToast,
    showBrowserNotification,
  };
}

export default useSupportNotifications;
