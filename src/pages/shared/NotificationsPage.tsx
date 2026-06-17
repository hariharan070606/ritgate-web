import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  BellOff,
  X,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNotifications } from '../../context/NotificationContext';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import { cn } from '../../utils/cn';
import { relativeTime } from '../../utils/dateUtils';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';

export default function NotificationsPage() {
  usePageTitle('Notifications');
  const navigate = useNavigate();
  const {
    notifications,
    isLoading,
    markAsRead,
    clearAllNotifications,
    fetchNotifications,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
      case 'APPROVAL':
        return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
      case 'ERROR':
      case 'REJECTION':
        return { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' };
      case 'WARNING':
      case 'URGENT':
        return { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' };
      case 'ENTRY':
      case 'EXIT':
        return { icon: Clock, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' };
      default:
        return { icon: Bell, color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-indigo-950/30' };
    }
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[17px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Notifications
              </h1>
              {notifications.length > 0 && (
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  {notifications.filter(n => !n.isRead).length > 0
                    ? `${notifications.filter(n => !n.isRead).length} unread`
                    : 'All caught up'}
                </p>
              )}
            </div>
          </div>

          {/* Clear all button — only show when there are notifications */}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-500 active:scale-95 transition-transform"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-wide">Clear</span>
            </button>
          )}
        </div>
      </header>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="desktop-page px-4 pt-4 pb-28 lg:px-0 lg:pt-0 lg:pb-12">
          <DesktopPageHeader
            title="Notifications"
            subtitle={notifications.filter(n => !n.isRead).length > 0 ? `${notifications.filter(n => !n.isRead).length} unread updates` : 'All caught up'}
            eyebrow="Alerts"
            action={notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-500 font-bold"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
          />
          {isLoading && notifications.length === 0 ? (
            <SkeletonList count={6} />
          ) : notifications.length > 0 ? (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              <AnimatePresence mode="popLayout">
                {notifications.map((notif) => {
                  const { icon: Icon, color, bg } = getNotifIcon(notif.type);
                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        'relative p-4 rounded-2xl border transition-all',
                        !notif.isRead
                          ? 'bg-white dark:bg-slate-900 border-blue-100 dark:border-indigo-900/30 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800',
                      )}
                    >
                      {/* Unread dot */}
                      {!notif.isRead && (
                        <div className="absolute top-4 left-4 w-2 h-2 bg-[var(--color-primary)] rounded-full" />
                      )}

                      <div className="flex gap-3 pl-4">
                        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', bg)}>
                          <Icon className={cn('w-5 h-5', color)} />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <h4 className={cn(
                            'text-[14px] font-black truncate mb-0.5 tracking-tight',
                            !notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400',
                          )}>
                            {notif.title}
                          </h4>
                          <p className={cn(
                            'text-[12px] leading-relaxed mb-2',
                            !notif.isRead
                              ? 'text-slate-600 dark:text-slate-300 font-medium'
                              : 'text-slate-400 font-medium',
                          )}>
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {relativeTime(notif.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 active:scale-90 transition-all"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <BellOff className="w-10 h-10 text-slate-200 dark:text-slate-700" />
              </div>
              <h3 className="text-[17px] font-black text-slate-900 dark:text-white mb-2">
                No Notifications
              </h3>
              <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed">
                Gate pass updates and alerts will appear here.
              </p>
            </div>
          )}
        </div>
      </TopRefreshControl>
    </div>
  );
}
