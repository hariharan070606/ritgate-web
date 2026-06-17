import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Clock } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from '../components/navigation/MobileBottomNav';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useAdaptive } from '../utils/useAdaptive';
import { useScrollInputIntoView } from '../hooks/useScrollIntoView';

export default function AppLayout() {
  const { isMobile, isTablet, isDesktop } = useAdaptive();
  const { sessionExpiringSoon, logout } = useAuth();
  useScrollInputIntoView();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [dismissedExpiry, setDismissedExpiry] = useState(false);
  const location = useLocation();
  const { pushEnabled, requestPushPermission } = useNotifications();
  const isProfileRoute = location.pathname === '/profile';
  const isWideRoute = [
    '/gate-logs',
    '/exits',
    '/scan-history',
    '/active-persons',
    '/vehicles',
  ].some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`));

  // Auto-collapse sidebar on tablet, expand on desktop
  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true);
    else if (isDesktop) setSidebarCollapsed(false);
  }, [isTablet, isDesktop]);

  // Push notification prompt — only on desktop/tablet
  useEffect(() => {
    if (!isMobile && !pushEnabled && 'Notification' in window && Notification.permission === 'default') {
      const t = setTimeout(() => setShowNotifPrompt(true), 6000);
      return () => clearTimeout(t);
    }
  }, [pushEnabled, isMobile]);

  const handleEnablePush = async () => {
    const ok = await requestPushPermission();
    if (ok) setShowNotifPrompt(false);
  };

  // Sidebar width for margin offset
  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 76 : 280;

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>

        {/* Session expiring soon — mobile */}
        <AnimatePresence>
          {sessionExpiringSoon && !dismissedExpiry && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="fixed bottom-[72px] left-4 right-4 z-40 bg-amber-500 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <p className="text-[12px] font-bold flex-1">Session expires in 5 min</p>
              <button onClick={() => setDismissedExpiry(true)} className="p-1">
                <X className="w-3.5 h-3.5 text-white/80" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <MobileBottomNav />
      </div>
    );
  }

  // ── TABLET / DESKTOP LAYOUT ────────────────────────────────────────────────
  return (
    <div className="min-full-height desktop-shell-bg flex">
      {/* Fixed sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      {/* Main area — offset by sidebar width */}
      <div
        className="flex flex-col flex-1 min-h-screen transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Sticky top header */}
        <Header
          onMenuClick={() => setSidebarCollapsed(c => !c)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Session expiring soon banner */}
        <AnimatePresence>
          {sessionExpiringSoon && !dismissedExpiry && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden shrink-0"
            >
              <div className="border-b border-amber-200/80 bg-amber-50 px-7 py-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-medium">Your session expires in 5 minutes. Save your work.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={logout} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors">
                    Log out now
                  </button>
                  <button onClick={() => setDismissedExpiry(true)} className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                    <X className="w-4 h-4 text-amber-700 dark:text-amber-200" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Push notification banner */}
        <AnimatePresence>
          {showNotifPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden shrink-0"
            >
              <div className="border-b border-blue-100 bg-white px-7 py-3 text-slate-700 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    <Bell className="w-4 h-4 shrink-0" />
                  </span>
                  <p className="text-sm font-semibold">
                    Enable push notifications to get gate pass updates instantly.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleEnablePush}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-bold hover:bg-blue-800 transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={() => setShowNotifPrompt(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page content */}
        <main className="main-area flex-1 min-w-0">
          <div
            className={`page-content desktop-page ${isProfileRoute ? 'profile-page-content' : ''} ${
              isWideRoute ? 'page-content-wide' : ''
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                className="native-page-enter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
