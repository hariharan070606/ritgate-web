import {
  Home,
  History,
  User,
  Car,
  Users,
  ClipboardList,
  Plus,
  BookOpen,
  ScanLine,
  Bell,
  Clock,
  UserPlus,
  Contact2,
  FileSpreadsheet,
  CalendarDays,
  LogOut,
  QrCode,
  Upload
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export function getNavItems(role: string): NavItem[] {
  switch (role) {
    case 'STUDENT':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/requests', label: 'My Requests', icon: ClipboardList },
        { path: '/history', label: 'History', icon: History },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'STAFF':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/new-pass', label: 'New Pass', icon: Plus },
        { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
        { path: '/event-csv', label: 'Event CSV', icon: Upload },
        { path: '/guest-register', label: 'Guest Pass', icon: UserPlus },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'NON_TEACHING':
    case 'NON_CLASS_INCHARGE':
      return [
        { path: '/dashboard', label: 'Visitor Hub', icon: Home },
        { path: '/new-pass', label: 'New Pass', icon: Plus },
        { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
        { path: '/exits', label: 'Exits', icon: LogOut },
        { path: '/guest-register', label: 'Guest Pass', icon: UserPlus },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'HOD':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/new-pass', label: 'New Pass', icon: Plus },
        { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
        { path: '/hod-events', label: 'Events', icon: CalendarDays },
        { path: '/guest-register', label: 'Guest Pass', icon: UserPlus },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    case 'HR':
    case 'ADMIN_OFFICER':
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/new-pass', label: 'New Pass', icon: Plus },
        { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
        { path: '/exits', label: 'Exits', icon: LogOut },
        { path: '/gate-logs', label: 'Gate Logs', icon: BookOpen },
        { path: '/guest-register', label: 'Guest Pass', icon: UserPlus },
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
        { path: '/visitor-qr', label: 'Visitor QR', icon: QrCode },
        { path: '/hod-contacts', label: 'HOD Contacts', icon: Contact2 },
        { path: '/profile', label: 'Profile', icon: User },
      ];
    default:
      return [{ path: '/dashboard', label: 'Dashboard', icon: Home }];
  }
}

export function getMobileNavItems(role: string): NavItem[] {
  const allItems = getNavItems(role);

  if (role === 'STAFF') {
    return [
      { path: '/dashboard', label: 'Home', icon: Home },
      { path: '/new-pass', label: 'New Pass', icon: Plus },
      { path: '/my-requests', label: 'Requests', icon: Clock },
      { path: '/profile', label: 'Profile', icon: User },
    ];
  }

  if (role === 'NON_TEACHING' || role === 'NON_CLASS_INCHARGE') {
    return [
      { path: '/dashboard', label: 'Home', icon: Home },
      { path: '/new-pass', label: 'New Pass', icon: Plus },
      { path: '/my-requests', label: 'Requests', icon: Clock },
      { path: '/profile', label: 'Profile', icon: User },
    ];
  }

  if (role === 'HOD') {
     return [
       { path: '/dashboard', label: 'Home', icon: Home },
       { path: '/new-pass', label: 'New Pass', icon: Plus },
       { path: '/hod-events', label: 'Events', icon: CalendarDays },
       { path: '/my-requests', label: 'Requests', icon: Clock },
       { path: '/profile', label: 'Profile', icon: User },
     ];
  }

  if (role === 'HR') {
     return [
       { path: '/dashboard', label: 'Home', icon: Home },
       { path: '/new-pass', label: 'New Pass', icon: Plus },
       { path: '/my-requests', label: 'Requests', icon: Clock },
       { path: '/exits', label: 'Exits', icon: LogOut },
       { path: '/profile', label: 'Profile', icon: User },
     ];
  }

  if (role === 'ADMIN_OFFICER') {
     return [
       { path: '/dashboard', label: 'Home', icon: Home },
       { path: '/new-pass', label: 'New Pass', icon: Plus },
       { path: '/my-requests', label: 'Requests', icon: Clock },
       { path: '/gate-logs', label: 'Gate Logs', icon: BookOpen },
       { path: '/profile', label: 'Profile', icon: User },
     ];
  }

  return allItems.slice(0, 5);
}
