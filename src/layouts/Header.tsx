import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import AppHeader from '../components/common/AppHeader';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

interface HeaderCopy {
  label?: string;
  title: string;
  subtitle: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'GOOD MORNING,';
  if (hour < 17) return 'GOOD AFTERNOON,';
  return 'GOOD EVENING,';
};

const getUserName = (user: any) => {
  if (!user) return 'User';
  return (
    user.fullName ||
    user.staffName ||
    user.hodName ||
    user.hrName ||
    user.name ||
    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '') ||
    'User'
  );
};

const roleDashboardSubtitle: Record<string, string> = {
  STUDENT: 'Request, track, and access your gate pass approvals from one clean workspace.',
  STAFF: 'Create gate passes, review activity, and keep request movement clear.',
  NON_TEACHING: 'Manage visitor passes, exits, and request activity from one workspace.',
  NON_CLASS_INCHARGE: 'Monitor visitor movement, gate logs, and department activity.',
  HOD: 'Review approvals, manage requests, and track department gate pass activity.',
  HR: 'Oversee gate logs, exits, approvals, and staff request operations.',
  ADMIN_OFFICER: 'Manage administrative passes, scan history, and operational activity.',
  SECURITY: 'Monitor entries, scan passes, and keep campus movement visible.',
};

const routeCopy: Record<string, Omit<HeaderCopy, 'label'>> = {
  '/requests': {
    title: 'My Requests',
    subtitle: "Track today's active gate pass requests from one clean workspace.",
  },
  '/my-requests': {
    title: 'My Requests',
    subtitle: "Track today's active gate pass requests from one clean workspace.",
  },
  '/history': {
    title: 'History',
    subtitle: 'Review your past gate pass requests, approvals, and activity.',
  },
  '/profile': {
    title: 'Profile',
    subtitle: 'Manage your student information and gate pass account details.',
  },
  '/notifications': {
    title: 'Notifications',
    subtitle: 'Review gate pass alerts, approvals, and system updates.',
  },
  '/new-request': {
    title: 'Gate Pass Request',
    subtitle: 'Create a new student gate pass request with the required details.',
  },
  '/new-pass': {
    title: 'New Pass',
    subtitle: 'Create and submit a gate pass request for approval.',
  },
  '/gate-logs': {
    title: 'Gate Logs',
    subtitle: 'Audit campus movement and verified gate pass scan activity.',
  },
  '/exits': {
    title: 'Exit Logs',
    subtitle: 'Track exit activity and visitor movement from one clean workspace.',
  },
  '/scanner': {
    title: 'QR Scanner',
    subtitle: 'Scan passes quickly and verify campus access in real time.',
  },
  '/active-persons': {
    title: 'Active Persons',
    subtitle: 'Monitor people currently inside campus with live gate status.',
  },
  '/vehicles': {
    title: 'Vehicles',
    subtitle: 'Register, review, and manage temporary vehicle movement.',
  },
  '/scan-history': {
    title: 'Scan History',
    subtitle: 'Review verified scans, entry records, and security activity.',
  },
  '/visitor-register': {
    title: 'Visitor Register',
    subtitle: 'Create visitor entries and keep guest access records organized.',
  },
  '/visitor-qr': {
    title: 'Visitor QR',
    subtitle: 'Find and verify visitor QR passes for campus access.',
  },
  '/hod-contacts': {
    title: 'HOD Directory',
    subtitle: 'Access department contacts for gate pass coordination.',
  },
  '/bulk-pass': {
    title: 'Bulk Student Pass',
    subtitle: 'Create and manage gate passes for multiple students at once.',
  },
  '/hod-events': {
    title: 'Events',
    subtitle: 'Manage event access, participants, and visitor pass workflows.',
  },
  '/event-csv': {
    title: 'Event CSV',
    subtitle: 'Upload and review participant data for event visitor passes.',
  },
  '/guest-register': {
    title: 'Pre-register Guest',
    subtitle: 'Prepare guest access details before visitors arrive at the gate.',
  },
  '/qr-codes': {
    title: 'My QR Codes',
    subtitle: 'Access approved QR passes ready for gate verification.',
  },
  '/participants': {
    title: 'Participants',
    subtitle: 'Review participant records and related event access details.',
  },
  '/pass-verification': {
    title: 'Pass Verification',
    subtitle: 'Review request details and authorize gate pass movement.',
  },
};

export default function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const userName = getUserName(user);
  const staticRoute = routeCopy[location.pathname];
  const dynamicRoute = location.pathname.startsWith('/pass-verification/')
    ? routeCopy['/pass-verification']
    : undefined;

  const copy: HeaderCopy = location.pathname === '/dashboard'
    ? {
      label: getGreeting(),
      title: userName.toUpperCase(),
      subtitle: roleDashboardSubtitle[role || ''] || 'Manage your gate pass workspace with clarity and control.',
    }
    : {
      ...(staticRoute || dynamicRoute || {
        title: 'RIT Gate',
        subtitle: 'Manage gate pass activity from one clean workspace.',
      }),
    };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  const showBack = location.pathname !== '/dashboard';
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <AppHeader
      label={copy.label}
      title={copy.title}
      subtitle={copy.subtitle}
      onMenuClick={onMenuClick}
      sidebarCollapsed={sidebarCollapsed}
      showBack={showBack}
      onBack={handleBack}
      actions={(
        <>
          <div className="hidden items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:shadow-none lg:flex">
            <CalendarDays className="h-4 w-4 text-[var(--color-primary)]" />
            {currentDate}
          </div>
          <NotificationBell />
        </>
      )}
    />
  );
}
