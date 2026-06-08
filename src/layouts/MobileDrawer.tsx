import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Sun, Moon, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROLE_LABELS } from '../config/api.config';
import RITLogo from '../components/common/RITLogo';
import { cn } from '../utils/cn';
import {
  Home, History, User, Plus, ClipboardList, BookOpen, ScanLine, Users, Car
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { role, user, logout, getUserId } = useAuth();
  const { theme, setTheme } = useTheme();

  const userName = (() => {
    if (!user) return '';
    const u = user as any;
    return u.fullName || u.staffName || u.hodName || u.hrName || u.name ||
      (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : '') || 'User';
  })();

  const navItems = getDrawerNav(role || 'STUDENT');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl safe-area"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <RITLogo size={32} />
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                    RIT <span className="text-blue-600">Gate</span>
                  </h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">Gate Pass System</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-500 active:scale-95 transition-transform"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User info */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] text-gray-400">{ROLE_LABELS[role || ''] || role}</span>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{userName}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{getUserId()}</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto scroll-momentum p-3 space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 min-h-[48px] rounded-xl transition-colors duration-150',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800',
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Bottom controls */}
            <div className="border-t border-gray-100 dark:border-slate-800 p-3 space-y-0.5">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center gap-3 px-3 min-h-[48px] rounded-xl w-full text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-700" />}
                <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button
                onClick={() => { logout(); onClose(); }}
                className="flex items-center gap-3 px-3 min-h-[48px] rounded-xl w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Log Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getDrawerNav(role: string) {
  switch (role) {
    case 'STUDENT':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/requests', label: 'My Requests', icon: ClipboardList },
        { path: '/history', label: 'History', icon: History },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'STAFF':
    case 'NON_TEACHING':
    case 'NON_CLASS_INCHARGE':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/new-pass', label: 'New Pass', icon: Plus },
        { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'HOD':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/new-pass', label: 'New Pass', icon: Plus },
        { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'HR':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
        { path: '/gate-logs', label: 'Gate Logs', icon: BookOpen },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'SECURITY':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/scanner', label: 'Scanner', icon: ScanLine },
        { path: '/active-persons', label: 'Active', icon: Users },
        { path: '/vehicles', label: 'Vehicles', icon: Car },
        { path: '/scan-history', label: 'History', icon: History },
        { path: '/visitor-register', label: 'Visitors', icon: Plus },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'ADMIN_OFFICER':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/gate-logs', label: 'Gate Logs', icon: BookOpen },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    default:
      return [{ path: '/dashboard', label: 'Dashboard', icon: Home }];
  }
}
