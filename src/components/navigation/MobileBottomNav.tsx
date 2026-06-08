import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getMobileNavItems } from '../../config/navigation';

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps = {}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { unreadCount } = useNotifications();

  const items = getMobileNavItems(role || 'STUDENT');

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -1px 0 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-stretch h-[64px]">
          {items.map((item) => {
            const Icon = item.icon;
            const isNewPass = item.path === '/new-pass';
            const isActive =
              pathname === item.path ||
              (isNewPass && pathname.startsWith('/new-pass'));
            const isNotif = item.path === '/notifications';

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 gap-1 relative',
                  'active:opacity-70 transition-opacity duration-100',
                  isActive
                    ? 'text-[var(--color-primary)] dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500',
                )}
              >
                <div className="relative">
                  <Icon className={cn(
                    'transition-transform duration-150',
                    isNewPass ? 'w-6 h-6' : 'w-[22px] h-[22px]',
                    isActive && !isNewPass && 'scale-110',
                  )} />

                  {isNotif && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 border border-white dark:border-slate-900 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>

                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-wide leading-none',
                  isActive
                    ? 'text-[var(--color-primary)] dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500',
                )}>
                  {item.label}
                </span>

                {isActive && !isNewPass && (
                  <motion.span
                    layoutId="bottomNavDot"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--color-primary)] dark:bg-blue-400"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
