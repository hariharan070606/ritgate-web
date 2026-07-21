// ── API Configuration ─────────────────────────────────────────────────────────
const PRODUCTION_URL = 'https://rit-gate.onrender.com/api';

export const API_CONFIG = {
  BASE_URL: PRODUCTION_URL,
  TIMEOUT: 120000,
  RETRY_ATTEMPTS: 4,
  RETRY_DELAY: 1500,
  RETRY_MAX_DELAY: 8000,
};

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  RESEND_DELAY_SECONDS: 30,
};

export const QR_CONFIG = {
  SCAN_DELAY: 2000,
  EXPIRY_HOURS: 24,
};

export const POLL_INTERVAL = 15000; // 15s notification poll

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  STAFF: 'Staff',
  HOD: 'Head of Department',
  HR: 'Human Resources',
  SECURITY: 'Security',
  NON_TEACHING: 'Non-Teaching Faculty',
  NON_CLASS_INCHARGE: 'Non-Class Incharge',
  ADMIN_OFFICER: 'Admin Officer',
};

export const ROLE_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  STUDENT: { bg: 'bg-cyan-500', text: 'text-cyan-500', gradient: 'from-cyan-500 to-cyan-600' },
  STAFF: { bg: 'bg-violet-500', text: 'text-violet-500', gradient: 'from-violet-500 to-violet-600' },
  HOD: { bg: 'bg-amber-500', text: 'text-amber-500', gradient: 'from-amber-500 to-amber-600' },
  HR: { bg: 'bg-emerald-500', text: 'text-emerald-500', gradient: 'from-emerald-500 to-emerald-600' },
  SECURITY: { bg: 'bg-blue-700', text: 'text-blue-700', gradient: 'from-blue-700 to-blue-800' },
  NON_TEACHING: { bg: 'bg-rose-500', text: 'text-rose-500', gradient: 'from-rose-500 to-rose-600' },
  NON_CLASS_INCHARGE: { bg: 'bg-orange-500', text: 'text-orange-500', gradient: 'from-orange-500 to-orange-600' },
  ADMIN_OFFICER: { bg: 'bg-blue-500', text: 'text-blue-700', gradient: 'from-blue-700 to-blue-800' },
};

export const STATUS_MAP: Record<string, { label: string; className: string; color: string }> = {
  PENDING: { label: 'Pending Staff', className: 'badge-pending-staff', color: 'amber' },
  PENDING_STAFF: { label: 'Pending Staff', className: 'badge-pending-staff', color: 'amber' },
  APPROVED_BY_STAFF: { label: 'Pending HOD', className: 'badge-pending-hod', color: 'orange' },
  PENDING_HOD: { label: 'Pending HOD', className: 'badge-pending-hod', color: 'orange' },
  PENDING_HR: { label: 'Pending HR', className: 'badge-pending-hr', color: 'blue' },
  APPROVED_BY_HOD: { label: 'Pending HR', className: 'badge-pending-hr', color: 'blue' },
  APPROVED: { label: 'Approved', className: 'badge-approved', color: 'green' },
  REJECTED: { label: 'Rejected', className: 'badge-rejected', color: 'red' },
  USED: { label: 'Used', className: 'badge-used', color: 'gray' },
  EXITED: { label: 'Exited', className: 'badge-used', color: 'gray' },
};

export const STORAGE_KEYS = {
  SESSION: 'ritgate_session',
  DEVICE_ID: 'ritgate_device_id',
  THEME: 'ritgate_theme',
  SHOWN_NOTIF_IDS: 'ritgate_shown_notif_ids',
  DISMISSED_NOTIF_IDS: 'ritgate_dismissed_notif_ids',
};
