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
  '/new-pass':        'New Gate Pass',
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
  '/bulk-pass':       'Bulk Gate Pass',
  '/hod-events':      'Events',
  '/event-csv':       'Event CSV Upload',
  '/guest-register':  'Guest Registration',
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
    <header className="sticky top-0 z-30 h-[60px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex items-center shrink-0 overflow-visible">
      <div className="flex items-center justify-between w-full px-6 gap-4">

        {/* ── Left: Menu toggle + page title ──────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {!isDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <h1 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-none truncate">
            {title}
          </h1>
        </div>

        {/* ── Right: Notification bell only ───────────────── */}
        <NotificationBell />
      </div>
    </header>
  );
}
