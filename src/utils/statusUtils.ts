import {
  CheckCircle2,
  Clock3,
  CircleDashed,
  CircleSlash2,
  LogOut,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export interface StatusMeta {
  key: string;
  label: string;
  variant: 'amber' | 'orange' | 'blue' | 'green' | 'red' | 'gray' | 'emerald' | 'success' | 'warning' | 'danger';
  icon: LucideIcon;
  dotClass: string;
  textClass: string;
  bgClass: string;
}

const cleanStatus = (value: unknown) => String(value || '').trim().toUpperCase();

export function normalizeRequestStatus(requestOrStatus: unknown): string {
  if (!requestOrStatus || typeof requestOrStatus !== 'object') {
    const s = cleanStatus(requestOrStatus);
    if (!s) return 'PENDING';
    if (s.startsWith('REJECTED')) return 'REJECTED';
    return s;
  }

  const request = requestOrStatus as Record<string, unknown>;
  const status = cleanStatus(request.status || request.approvalStatus);
  const staffApproval = cleanStatus(request.staffApproval || request.staff_approval);
  const hodApproval = cleanStatus(request.hodApproval || request.hod_approval);
  const hrApproval = cleanStatus(request.hrApproval || request.hr_approval);

  // 1. Rejections take top priority
  if (
    status.startsWith('REJECTED') ||
    hrApproval === 'REJECTED' ||
    hodApproval === 'REJECTED' ||
    staffApproval === 'REJECTED'
  ) {
    return 'REJECTED';
  }

  // 2. Terminal states
  if (['USED', 'EXITED', 'CANCELLED', 'COMPLETED'].includes(status)) {
    return status;
  }

  // 3. Fully Approved
  if (status === 'APPROVED' || hrApproval === 'APPROVED') {
    return 'APPROVED';
  }

  // 4. Pending HR (HOD approved, awaiting HR)
  if (status === 'PENDING_HR' || status === 'APPROVED_BY_HOD') {
    return 'PENDING_HR';
  }

  // 5. Pending HOD (Staff approved, awaiting HOD)
  if (status === 'PENDING_HOD' || status === 'APPROVED_BY_STAFF') {
    return 'PENDING_HOD';
  }

  // 6. Pending Staff
  if (status === 'PENDING_STAFF') {
    return 'PENDING_STAFF';
  }

  return status || 'PENDING';
}

export function getStatusMeta(requestOrStatus: unknown): StatusMeta {
  const key = normalizeRequestStatus(requestOrStatus);

  switch (key) {
    case 'APPROVED':
      return {
        key,
        label: 'Approved',
        variant: 'emerald',
        icon: CheckCircle2,
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
      };
    case 'REJECTED':
      return {
        key,
        label: 'Rejected',
        variant: 'red',
        icon: XCircle,
        dotClass: 'bg-rose-500',
        textClass: 'text-rose-700 dark:text-rose-300',
        bgClass: 'bg-rose-50 dark:bg-rose-950/30',
      };
    case 'USED':
      return {
        key,
        label: 'Used',
        variant: 'gray',
        icon: CircleSlash2,
        dotClass: 'bg-slate-500',
        textClass: 'text-slate-600 dark:text-slate-300',
        bgClass: 'bg-slate-50 dark:bg-slate-800/50',
      };
    case 'EXITED':
      return {
        key,
        label: 'Exited',
        variant: 'gray',
        icon: LogOut,
        dotClass: 'bg-slate-500',
        textClass: 'text-slate-600 dark:text-slate-300',
        bgClass: 'bg-slate-50 dark:bg-slate-800/50',
      };
    case 'PENDING_HR':
      return {
        key,
        label: 'Pending HR',
        variant: 'blue',
        icon: Clock3,
        dotClass: 'bg-blue-500',
        textClass: 'text-blue-700 dark:text-blue-300',
        bgClass: 'bg-blue-50 dark:bg-blue-950/30',
      };
    case 'PENDING_HOD':
      return {
        key,
        label: 'Pending HOD',
        variant: 'orange',
        icon: Clock3,
        dotClass: 'bg-orange-500',
        textClass: 'text-orange-700 dark:text-orange-300',
        bgClass: 'bg-orange-50 dark:bg-orange-950/30',
      };
    case 'PENDING_STAFF':
      return {
        key,
        label: 'Pending Staff',
        variant: 'amber',
        icon: Clock3,
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-700 dark:text-amber-300',
        bgClass: 'bg-amber-50 dark:bg-amber-950/30',
      };
    default:
      return {
        key,
        label: key === 'PENDING' ? 'Pending' : key.replace(/_/g, ' '),
        variant: 'amber',
        icon: CircleDashed,
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-700 dark:text-amber-300',
        bgClass: 'bg-amber-50 dark:bg-amber-950/30',
      };
  }
}
