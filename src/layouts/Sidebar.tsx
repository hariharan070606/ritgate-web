import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, LogOut, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getNavItems } from '../config/navigation';
import RITLogo from '../components/common/RITLogo';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { cn } from '../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();

  const navItems = getNavItems(role || 'STUDENT');

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 304 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col overflow-hidden border-r border-slate-200/70 bg-white/78 shadow-[18px_0_54px_-46px_rgba(15,23,42,0.75)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#0b1120]/90"
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className={cn(
        'relative flex items-center border-b border-slate-200/70 dark:border-white/[0.07] shrink-0',
        collapsed ? 'h-[82px] justify-center px-0' : 'h-[82px] gap-3 px-6 pr-16',
      )}>
        <div className="shrink-0">
          <RITLogo size={collapsed ? 36 : 44} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex min-w-0 items-center overflow-hidden"
            >
              <span className="whitespace-nowrap text-[24px] font-black uppercase leading-none tracking-tight text-black dark:text-white">
                RIT GATE
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className={cn(
            "absolute right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/82 text-slate-500 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.65)] backdrop-blur-xl transition-all hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:shadow-none dark:hover:bg-white/[0.1] dark:hover:text-white",
            collapsed && "right-1/2 translate-x-1/2",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* ── User Card ─────────────────────────────────────── */}
      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-5 px-3.5 space-y-1.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              style={isActive ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl min-h-[44px] border transition-all duration-150 relative select-none',
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3.5 py-2.5',
                isActive
                  ? 'text-white border-slate-700/40 shadow-[0_8px_18px_-12px_rgba(15,23,42,0.55)]'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-[var(--color-primary-subtle)] dark:hover:bg-white/[0.06] hover:text-[var(--color-primary)] dark:hover:text-[var(--color-primary)]',
              )}
            >
              <item.icon className={cn(
                'shrink-0 transition-transform duration-150',
                collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                isActive ? 'text-white' : 'group-hover:text-[var(--color-primary)]',
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
      <div className="shrink-0 border-t border-slate-200/70 dark:border-white/[0.07] py-4 px-3.5 space-y-1.5">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          className={cn(
            'group flex items-center gap-3 rounded-lg min-h-[40px] w-full transition-all duration-150',
            'text-slate-500 dark:text-slate-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
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
