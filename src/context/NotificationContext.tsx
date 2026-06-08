import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getNotifications, markNotificationRead } from '../services/api.service';
import { storage } from '../utils/storage';
import { POLL_INTERVAL } from '../config/api.config';
import type { AppNotification } from '../types';

interface NotifContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  pushEnabled: boolean;
  fetchNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  requestPushPermission: () => Promise<boolean>;
}

const NotifContext = createContext<NotifContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getUserId, role } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle = useRef(document.title);

  // Check initial permission
  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !role) return;
    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = await getNotifications(userId, role);
      const notifs = (data || []).map((n: any) => ({
        id: n.id,
        userId: n.userId || userId,
        userType: n.userType || role,
        title: n.title || '',
        message: n.message || n.body || '',
        type: n.type || 'INFO',
        isRead: n.isRead || n.is_read || false,
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        actionRoute: n.actionRoute,
      })) as AppNotification[];

      setNotifications(notifs);

      // Browser notifications for new unread
      const unread = notifs.filter((n) => !n.isRead);
      const shownIds = storage.getShownNotifIds();

      const newUnread = unread.filter(n => !shownIds.has(n.id));
      if (newUnread.length > 0) {
        // Show only the most recent one to avoid spamming
        const latest = newUnread[0];
        showBrowserNotification(latest.title, latest.message);
        newUnread.forEach(n => storage.addShownNotifId(n.id));
      }

      // Update tab title
      const count = unread.length;
      if (count > 0) {
        document.title = `(${count}) ${originalTitle.current}`;
      } else {
        document.title = originalTitle.current;
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getUserId, role]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.title = originalTitle.current;
    };
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = useCallback(async (id: number) => {
    // Dismiss on view — remove from list immediately
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try { await markNotificationRead(id); } catch { /* silent */ }
  }, []);

  const markAllAsRead = useCallback(() => {
    notifications.filter((n) => !n.isRead).forEach((n) => markNotificationRead(n.id).catch(() => {}));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [notifications]);

  const clearAllNotifications = useCallback(() => {
    // Mark all as read on the server, then clear locally
    notifications.forEach((n) => markNotificationRead(n.id).catch(() => {}));
    setNotifications([]);
  }, [notifications]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showError('System Incompatible', 'This browser does not support protocol notifications.');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      const isGranted = permission === 'granted';
      setPushEnabled(isGranted);
      
      if (isGranted) {
        showSuccess('Notifications Enabled', 'You will now receive gate pass updates.');
      } else if (permission === 'denied') {
        showWarning('Action Required', 'Please enable notifications in your browser settings.');
      }
      
      return isGranted;
    } catch (err) {
      showError('Permission Refused', 'An system error occurred while requesting notification access.');
      return false;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotifContext.Provider value={{ 
      notifications, 
      unreadCount, 
      isLoading, 
      pushEnabled,
      fetchNotifications,
      refreshNotifications: fetchNotifications,
      markAsRead, 
      markAllAsRead,
      clearAllNotifications,
      requestPushPermission
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

// ── Browser Notifications ─────────────────────────────────────────────────────
function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // If Service Worker is active, use it (allows background notifications)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        (registration as any).showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [100, 50, 100],
          tag: 'ritgate-notification',
          renotify: true
        });
      });
    } else {
      // Fallback to standard Notification API
      new Notification(title, { body, icon: '/pwa-192x192.png' });
    }
  }
}
