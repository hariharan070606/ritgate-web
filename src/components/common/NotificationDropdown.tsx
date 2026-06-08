import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Users, 
  AlertCircle, 
  LogIn, 
  LogOut, 
  Bell, 
  BellOff, 
  X,
  Loader2
} from 'lucide-react';
import { apiService } from '../../services/api.service';
import { useNotifications } from '../../context/NotificationContext';
import { formatRelativeTime } from '../../utils/date';
import { cn } from '../../utils/cn';

interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  timestamp: string;
  createdAt: string;
}

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userType: 'student' | 'staff' | 'hod' | 'hr' | 'security';
}

export default function NotificationDropdown({
  visible,
  onClose,
  userId,
  userType,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, userId, userType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications(userType, userId);
      const notifArray = Array.isArray(response) ? response : [];
      const today = new Date().setHours(0,0,0,0);
      const todaysOnly = notifArray.filter((n: any) => new Date(n.timestamp || n.createdAt).setHours(0,0,0,0) === today);
      setNotifications(todaysOnly.slice(0, 10));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      refreshNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'APPROVAL': return { icon: CheckCircle2, color: '#10b981' };
      case 'REJECTION': return { icon: XCircle, color: '#ef4444' };
      case 'GATE_PASS': return { icon: FileText, color: '#3b82f6' };
      case 'BULK_PASS': return { icon: Users, color: '#8b5cf6' };
      case 'URGENT': return { icon: AlertCircle, color: '#f59e0b' };
      case 'ENTRY': return { icon: LogIn, color: '#06b6d4' };
      case 'EXIT': return { icon: LogOut, color: '#ec4899' };
      default: return { icon: Bell, color: '#6b7280' };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/20"
          />

          {/* Dropdown Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 70 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="fixed left-1/2 -translate-x-1/2 z-[110] w-[360px] max-w-[92vw] max-h-[560px] bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications</h3>
              <div className="flex items-center gap-2.5">
                {unreadCount > 0 && (
                  <>
                    <div className="bg-rose-500 rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5 shadow-sm">
                      <span className="text-[11px] font-black text-white">{unreadCount}</span>
                    </div>
                    <button 
                      onClick={markAllRead}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider active:scale-95 transition-transform"
                    >
                      Mark all read
                    </button>
                  </>
                )}
                <button 
                  onClick={onClose}
                  className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                    <BellOff className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest tracking-tighter">No notifications today</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => {
                    const config = getTypeConfig(notif.notificationType || notif.type);
                    const Icon = config.icon;
                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          "relative flex gap-4 px-5 py-4 border-b border-slate-50 dark:border-slate-800/50 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors",
                          !notif.isRead && "bg-blue-50/40 dark:bg-indigo-900/10"
                        )}
                      >
                        {/* Unread indicator */}
                        {!notif.isRead && (
                          <div className="absolute left-2 top-11 -translate-y-1/2 w-1.5 h-6 bg-blue-500 rounded-full" />
                        )}

                        <div 
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${config.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {notif.title && (
                            <h4 className="text-[13px] font-black text-slate-900 dark:text-white leading-tight mb-0.5 truncate">
                              {notif.title}
                            </h4>
                          )}
                          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                             {notif.message}
                          </p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1 block">
                            {formatRelativeTime(notif.createdAt || notif.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
