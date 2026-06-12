import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, ChevronLeft } from 'lucide-react';
import NotificationBell from '../components/common/NotificationBell';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

const pageTitles: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/requests':        'My Requests',
  '/history':         'History',
  '/profile':         'Profile',
  '/notifications':   'Notifications',
  '/new-pass':        'New Request',
  '/my-requests':     'My Requests',
  '/gate-logs':       'Gate Logs',
  '/exits':           'Exit Logs',
  '/scanner':         'QR Scanner',
  '/active-persons':  'Active Persons',
  '/vehicles':        'Vehicles',
  '/scan-history':    'Scan History',
  '/visitor-register':'Visitor Register',
  '/visitor-qr':      'Visitor QR',
  '/hod-contacts':    'HOD Directory',
  '/users':           'Unit Directory',
  '/bulk-pass':       'Bulk Student Pass',
  '/hod-events':      'Events',
  '/event-csv':       'Event CSV Upload',
  '/guest-register':  'Pre-register guest',
  '/new-request':     'New Request',
  '/qr-codes':        'My QR Codes',
  '/participants':    'Participants',
};

export default function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'RIT Gate';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-30 h-[68px] lg:h-[60px] bg-white/82 dark:bg-[#050b16]/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 flex items-center shrink-0 overflow-visible shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between w-full px-7 xl:px-10 gap-4">

        {/* ── Left: Menu toggle + page title ──────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="w-10 h-10 lg:w-9 lg:h-9 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {!isDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <h1 className="text-[18px] font-bold text-slate-950 dark:text-white leading-none truncate tracking-tight lg:hidden">
            {title}
          </h1>
        </div>

        {/* ── Right: Notification bell only ───────────────── */}
        <NotificationBell />
      </div>
    </header>
  );
}
