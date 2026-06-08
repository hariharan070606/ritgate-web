import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, LogOut, Sun, Moon, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { ROLE_LABELS } from '../config/api.config';
import { getMobileNavItems } from '../config/navigation';
import RITLogo from '../components/common/RITLogo';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { cn } from '../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { role, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { profileImage } = useProfile();
  const location = useLocation();

  const navItems = getMobileNavItems(role || 'STUDENT');

  const userName = (() => {
    if (!user) return 'User';
    const u = user as any;
    return (
      u.fullName || u.staffName || u.hodName || u.hrName || u.name ||
      (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : '') ||
      'User'
    );
  })();

  const initials = userName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel = ROLE_LABELS[role || ''] || role || 'User';

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-hidden"
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center border-b border-slate-100 dark:border-slate-800 shrink-0',
        collapsed ? 'h-[60px] justify-center px-0' : 'h-[60px] px-4 gap-3',
      )}>
        <div className="shrink-0">
          <RITLogo size={collapsed ? 30 : 32} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col min-w-0 overflow-hidden"
            >
              <span className="text-[15px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">
                RIT <span className="text-[var(--color-primary)]">Gate</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5 tracking-wide">
                Gate Pass System
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── User Card ─────────────────────────────────────── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-[var(--color-primary)] flex items-center justify-center">
                  {profileImage
                    ? <img src={profileImage} alt={userName} className="w-full h-full object-cover" />
                    : <span className="text-white font-bold text-sm">{initials}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate leading-tight">
                    {userName}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-[11px] text-slate-400 truncate">{roleLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed avatar */}
      {collapsed && (
        <div className="flex justify-center py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-[var(--color-primary)] flex items-center justify-center">
            {profileImage
              ? <img src={profileImage} alt={userName} className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-sm">{initials}</span>
            }
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg min-h-[40px] transition-all duration-150 relative select-none',
                collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
                isActive
                  ? 'bg-blue-50 dark:bg-indigo-950/50 text-[var(--color-primary)] dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {/* Active left bar */}
              {isActive && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--color-primary)] rounded-r-full" />
              )}

              <item.icon className={cn(
                'shrink-0 transition-transform duration-150',
                collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                isActive ? 'text-[var(--color-primary)] dark:text-blue-400' : '',
                !isActive && 'group-hover:scale-110',
              )} />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    className={cn(
                      'text-[13px] font-medium truncate',
                      isActive ? 'font-semibold' : '',
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Bottom Controls ───────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 py-2 px-2 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          className={cn(
            'group flex items-center gap-3 rounded-lg min-h-[40px] w-full transition-all duration-150',
            'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
            collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
          )}
        >
          {theme === 'dark'
            ? <Sun className="w-[18px] h-[18px] text-amber-500 shrink-0" />
            : <Moon className="w-[18px] h-[18px] text-blue-400 shrink-0" />
          }
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="text-[13px] font-medium"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutModal(true)}
          title={collapsed ? 'Log Out' : undefined}
          className={cn(
            'group flex items-center gap-3 rounded-lg min-h-[40px] w-full transition-all duration-150',
            'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20',
            collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="text-[13px] font-medium"
              >
                Log Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      <ConfirmationModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => { setShowLogoutModal(false); logout(); }}
        title="Log Out"
        message="Are you sure you want to log out of RIT Gate?"
        confirmText="Log Out"
        confirmColor="bg-rose-500 hover:bg-rose-600"
      />
    </motion.aside>
  );
}
