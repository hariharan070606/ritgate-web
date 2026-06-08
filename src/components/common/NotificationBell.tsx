import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { cn } from '../../utils/cn';
import { relativeTime } from '../../utils/dateUtils';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);

  // Recalculate position every time the dropdown opens
  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,                        // 8px gap below the bell
        right: window.innerWidth - rect.right,       // align right edge with bell
      });
    }
  }, [open]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => setOpen(v => !v)}
        className="relative w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-900 dark:text-white" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-[9px] font-black px-1 border-2 border-white dark:border-slate-900"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Portal — renders outside every stacking context */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Invisible full-screen backdrop — catches outside clicks */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0"
                style={{ zIndex: 9990 }}
              />

              {/* Dropdown panel */}
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  top: dropdownPos.top,
                  right: dropdownPos.right,
                  zIndex: 9991,
                  width: 320,
                  maxWidth: 'calc(100vw - 16px)',
                }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[480px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[10px] font-black text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="flex items-center gap-1 text-[12px] text-[var(--color-primary)] dark:text-blue-400 font-semibold hover:underline"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => { clearAllNotifications(); setOpen(false); }}
                        className="flex items-center gap-1 text-[12px] text-rose-500 dark:text-rose-400 font-semibold hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear all
                      </button>
                    </div>
                  )}
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 20).map(n => (
                      <button
                        key={n.id}
                        onClick={() => { markAsRead(n.id); setOpen(false); }}
                        className={cn(
                          'w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors',
                          !n.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-700 mt-1.5 shrink-0" />
                          )}
                          <div className={cn('flex-1 min-w-0', n.isRead && 'pl-[18px]')}>
                            <p className={cn(
                              'text-[13px] leading-snug',
                              n.isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white font-semibold',
                            )}>
                              {n.title}
                            </p>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">
                              {relativeTime(n.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
