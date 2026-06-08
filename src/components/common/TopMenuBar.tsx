import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useProfile } from '../../context/ProfileContext';
import { useAdaptive } from '../../utils/useAdaptive';
import { useTheme } from '../../context/ThemeContext';

interface TopMenuBarProps {
  greeting: string;
  title: string;
  /** @deprecated */
  onNotificationPress?: () => void;
  /** @deprecated */
  onLogoutPress?: () => void;
  /** @deprecated */
  onProfilePress?: () => void;
  onBackPress?: () => void;
  notificationCount?: number;
  profileImage?: string | null;
  showBackButton?: boolean;
}

export default function TopMenuBar({
  greeting,
  title,
  onBackPress,
  showBackButton = false,
}: TopMenuBarProps) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { profileImage } = useProfile();
  const { isMobile } = useAdaptive();
  const { theme, toggleTheme } = useTheme();

  // Only render on mobile — desktop/tablet use the AppLayout Header
  if (!isMobile) return null;

  const initials = title
    ? title.split(' ').map(p => p.charAt(0)).join('').toUpperCase().substring(0, 2)
    : 'BK';

  return (
    <header
      className="sticky top-0 z-[80] bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 h-[72px]">

        {/* ── Left: avatar/back + greeting ──────────────── */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBackButton ? (
            <button
              onClick={onBackPress ?? (() => navigate(-1))}
              className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-white active:scale-90 transition-transform shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="w-12 h-12 rounded-full overflow-hidden shrink-0 active:scale-95 transition-transform shadow-sm"
            >
              {profileImage ? (
                <img src={profileImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--color-primary)] flex items-center justify-center text-white text-[14px] font-black">
                  {initials}
                </div>
              )}
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest leading-none mb-1 truncate">
              {greeting}
            </span>
            <h2 className="text-[17px] font-black text-slate-900 dark:text-white truncate tracking-tight leading-none">
              {title}
            </h2>
          </div>
        </div>

        {/* ── Right: theme toggle + notification bell ────── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center active:scale-90 transition-transform shrink-0"
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="w-5 h-5 text-amber-400" />
              : <Moon className="w-5 h-5 text-blue-700" />
            }
          </button>

          {/* Notification bell */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-white active:scale-90 transition-transform shrink-0"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center px-1">
                <span className="text-[10px] font-black text-white leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
