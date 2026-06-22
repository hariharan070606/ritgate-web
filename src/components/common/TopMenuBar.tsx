import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useProfile } from '../../context/ProfileContext';
import { useAdaptive } from '../../utils/useAdaptive';

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

  // Only render on mobile — desktop/tablet use the AppLayout Header
  if (!isMobile) return null;

  const initials = title
    ? title.split(' ').map(p => p.charAt(0)).join('').toUpperCase().substring(0, 2)
    : 'BK';

  return (
    <header
      className="sticky inset-x-0 top-0 z-[90] bg-white/82 dark:bg-[#0b1120]/90 border-b border-white/55 dark:border-white/[0.08] shadow-[0_14px_34px_-30px_rgba(15,23,42,0.72)] dark:shadow-none backdrop-blur-2xl shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 h-[72px]">

        {/* ── Left: avatar/back + greeting ──────────────── */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBackButton ? (
            <button
              onClick={onBackPress ?? (() => navigate(-1))}
              className="w-11 h-11 rounded-full bg-white/72 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-all shadow-sm dark:shadow-none shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="w-12 h-12 rounded-full overflow-hidden shrink-0 active:scale-95 transition-all shadow-sm ring-1 ring-white/60"
            >
              {profileImage ? (
                <img src={profileImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-[14px] font-black">
                  {initials}
                </div>
              )}
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest leading-none mb-1 truncate">
              {greeting}
            </span>
            <h2 className="text-[19px] font-black text-slate-900 dark:text-white truncate tracking-tight leading-none">
              {title}
            </h2>
          </div>
        </div>

        {/* ── Right: notification bell ────── */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notification bell */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-11 h-11 rounded-full bg-white/72 dark:bg-white/[0.05] border border-white/60 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-all shadow-sm dark:shadow-none shrink-0"
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
