import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  AlertCircle,
  FileText,
  Ban,
  ArrowRight,
  Clock3,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useToast } from '../../context/ToastContext';
import { getStudentGatePassRequests, getGatePassQRCode } from '../../services/api.service';
import TopMenuBar from '../../components/common/TopMenuBar';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import RequestDetailsModal from '../../components/common/RequestDetailsModal';
import { cn } from '../../utils/cn';
import type { Student } from '../../types';
import { formatDateTime, isToday } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';

/** Returns current time in IST (UTC+5:30) */
const getISTTime = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  return { hours: ist.getHours(), minutes: ist.getMinutes() };
};

/** Students: gate pass disabled after 15:00 IST */
const isStudentPassDisabled = () => {
  const { hours } = getISTTime();
  return hours >= 15;
};

function GatePassIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 180"
      role="img"
      aria-label="Gate pass verification"
      className={className}
    >
      <defs>
        <linearGradient id="gate-pass-card" x1="28" y1="24" x2="146" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DBEAFE" />
        </linearGradient>
        <linearGradient id="gate-pass-blue" x1="58" y1="20" x2="125" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="gate-pass-shield" x1="95" y1="84" x2="156" y2="156" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.55" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id="gate-pass-soft-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#2563EB" floodOpacity="0.22" />
        </filter>
      </defs>

      <rect x="18" y="18" width="144" height="144" rx="34" fill="#EFF6FF" stroke="#FFFFFF" strokeWidth="6" />
      <rect x="25" y="25" width="130" height="130" rx="28" fill="none" stroke="#BFDBFE" strokeWidth="2" opacity="0.8" />
      <g filter="url(#gate-pass-soft-shadow)">
        <rect x="50" y="48" width="82" height="92" rx="14" fill="url(#gate-pass-card)" stroke="#FFFFFF" strokeWidth="4" />
        <rect x="75" y="34" width="30" height="34" rx="6" fill="url(#gate-pass-blue)" />
        <rect x="70" y="63" width="40" height="10" rx="5" fill="#93C5FD" opacity="0.75" />
        <circle cx="74" cy="88" r="22" fill="url(#gate-pass-blue)" opacity="0.9" />
        <circle cx="74" cy="80" r="8" fill="#FFFFFF" />
        <path d="M60 104c3-11 25-11 28 0 1 4-2 7-6 7H66c-4 0-7-3-6-7Z" fill="#FFFFFF" />
        <rect x="98" y="78" width="26" height="6" rx="3" fill="#94A3B8" opacity="0.42" />
        <rect x="98" y="92" width="32" height="6" rx="3" fill="#94A3B8" opacity="0.42" />
        <rect x="62" y="116" width="48" height="6" rx="3" fill="#94A3B8" opacity="0.36" />
        <rect x="62" y="130" width="36" height="6" rx="3" fill="#94A3B8" opacity="0.3" />
        <path
          d="M118 86c11 8 23 12 36 12v30c0 20-14 34-36 42-22-8-36-22-36-42V98c13 0 25-4 36-12Z"
          fill="url(#gate-pass-shield)"
          stroke="#67E8F9"
          strokeWidth="4"
        />
        <path d="m101 126 11 11 24-27" fill="none" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default function StudentHome() {
  usePageTitle('Dashboard');
  const { user: rawUser, logout } = useAuth();
  const { isDesktop } = useAdaptive();
  const user = rawUser as Student;
  const { refreshCount } = useRefresh();
  const { success: showSuccess, error: showError } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);

  useEffect(() => {
    loadData();
  }, [refreshCount]);

  const loadData = async () => {
    if (!user?.regNo) return;
    try {
      const response = await getStudentGatePassRequests(user.regNo);
      if (response.success) {
        // Filter for today's requests for the dashboard
        const filtered = response.requests
          .filter((r: any) => isToday(r.requestDate || r.createdAt))
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(filtered);
      }
    } catch (err) {
      console.error('Failed to load student requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'APPROVED': case 'APPROVED_BY_HOD':
        return { label: 'APPROVED', color: 'bg-emerald-500' };
      case 'REJECTED':
        return { label: 'REJECTED', color: 'bg-rose-500' };
      case 'PENDING_HOD':
        return { label: 'AWAITING HOD', color: 'bg-blue-500' };
      case 'PENDING_STAFF':
        return { label: 'AWAITING STAFF', color: 'bg-orange-500' };
      case 'USED':
        return { label: 'USED', color: 'bg-slate-400' };
      default:
        return { label: status || 'PENDING', color: 'bg-amber-500' };
    }
  };

  const handleViewQR = async (request: any) => {
    if (request.status !== 'APPROVED') {
       showError('Wait for Approval', 'This request is not fully approved yet');
       return;
    }
    setSelectedRequest(request);
    setShowQRModal(true);
    try {
      const res = await getGatePassQRCode(request.id, user?.regNo || '');
      if (res.success) {
        setQrData({
          code: res.qrCode || '',
          manual: res.manualCode,
          expires: res.qrExpiresAt
        });
      } else {
        showError('QR Error', res.message || 'Could not fetch QR code');
        setShowQRModal(false);
      }
    } catch {
      showError('Error', 'Network error while fetching QR');
      setShowQRModal(false);
    }
  };

  const filteredRequests = requests;

  const gatePassDisabled = isStudentPassDisabled();
  const displayName = `${user?.firstName || 'Student'} ${user?.lastName || ''}`.trim();

  const renderModals = () => (
    selectedRequest ? (
      <>
        <GatePassQRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          qrCodeData={qrData?.code || ''}
          personName={displayName}
          personId={user?.regNo || ''}
          manualCode={qrData?.manual}
          validUntil={qrData?.expires}
        />
        <RequestDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          request={selectedRequest}
          student={user}
        />
      </>
    ) : null
  );

  if (isDesktop) {
    return (
      <div className="student-desktop-dashboard">
        <DesktopPageHeader
          eyebrow={getGreeting().replace(',', '')}
          title={displayName}
          subtitle="Request, track, and access your gate pass approvals from one clean workspace."
        />

        <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
          <div className="space-y-5">
            <section>
              <div className="desktop-card overflow-hidden text-left">
                <div className="flex min-h-[136px] flex-col justify-between gap-5 p-5 xl:flex-row xl:items-center xl:p-6">
                  <div className="flex min-w-0 items-start gap-5">
                    <GatePassIllustration className={cn('h-14 w-14 shrink-0', gatePassDisabled && 'opacity-50 grayscale')} />
                    <div className="min-w-0">
                      <div className={cn(
                        'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold',
                        gatePassDisabled
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
                      )}>
                        <span className={cn(
                          'h-2 w-2 rounded-full',
                          gatePassDisabled ? 'bg-rose-500' : 'bg-emerald-500',
                        )} />
                        {gatePassDisabled ? 'Request window closed' : 'Request window open'}
                      </div>
                      <h3 className="text-[22px] font-bold tracking-tight text-slate-950 dark:text-white">
                        Gate Pass Request
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
                        {gatePassDisabled
                          ? 'Student gate pass requests are not available after 3:00 PM IST. You can still review your request history.'
                          : 'Create a new student gate pass request and follow each approval stage without leaving the dashboard.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 xl:inline-flex">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      Closes at 3:00 PM
                    </span>
                    <button
                      type="button"
                      disabled={gatePassDisabled}
                      onClick={() => !gatePassDisabled && (window.location.href = '/new-request')}
                      className={cn(
                        'group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
                        gatePassDisabled
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          : 'bg-blue-700 text-white shadow-sm shadow-blue-700/20 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md active:scale-95',
                      )}
                    >
                      {gatePassDisabled ? (
                        <Ban className="h-5 w-5" />
                      ) : (
                        <>
                          Apply Now
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="desktop-card overflow-hidden">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Recent Requests
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                      Today&apos;s gate pass activity
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { window.location.href = '/requests'; }}
                    iconRight={<ArrowRight className="h-4 w-4" />}
                    className="h-9 rounded-lg border-blue-200 bg-white px-4 text-xs shadow-sm shadow-blue-900/5 hover:border-blue-500 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/25"
                  >
                    View All
                  </Button>
                </div>

                {loading ? (
                  <div className="p-6">
                    <SkeletonList count={3} />
                  </div>
                ) : filteredRequests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="desktop-table">
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequests.map((request) => {
                          const status = getStatusConfig(request.status);
                          return (
                            <tr
                              key={request.id}
                              className="cursor-pointer hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35"
                              onClick={() => { setSelectedRequest(request); setShowDetailsModal(true); }}
                            >
                              <td>
                                <p className="font-bold text-slate-950 dark:text-white">{request.purpose || 'Gate Pass Request'}</p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Request #{request.id}</p>
                              </td>
                              <td>{request.passType === 'BULK' ? 'Bulk Pass' : 'Single Pass'}</td>
                              <td>{formatDateTime(request.requestDate || request.createdAt)}</td>
                              <td>
                                <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase text-white', status.color)}>
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No recent requests"
                    description="Requests created today will appear here with approval status."
                    icon={<FileText className="w-7 h-7" />}
                    className="border-0 shadow-none lg:rounded-none lg:py-14"
                  />
                )}
              </div>
            </section>
          </div>
        </TopRefreshControl>

        {renderModals()}
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:bg-transparent lg:min-h-0 bg-[#F8FAFC] dark:bg-slate-950">
      <TopMenuBar
        greeting={getGreeting()}
        title={`${user?.firstName} ${user?.lastName || ''}`.toUpperCase()}
      />

      <div className="px-4 pt-4 lg:px-0 lg:pt-0 lg:space-y-5">
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-4 pt-4 pb-28 lg:px-0 lg:pt-6 lg:pb-8">
          {/* Main Action Card */}
          <motion.div 
            whileTap={{ scale: gatePassDisabled ? 1 : 0.98 }}
            onClick={() => !gatePassDisabled && (window.location.href = '/new-request')}
            className="rounded-[24px] overflow-hidden shadow-md shadow-indigo-500/10 border border-slate-100 dark:border-indigo-900/20 lg:desktop-card lg:grid lg:grid-cols-[minmax(260px,420px)_1fr] lg:rounded-[28px]"
          >
            <div className={cn(
              "h-40 flex items-center justify-center relative overflow-hidden lg:h-56",
              gatePassDisabled ? "bg-slate-400" : "bg-[var(--color-primary)]"
            )}>
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-40 h-40 bg-white/10 rounded-full blur-3xl absolute"
              />
              <GatePassIllustration className={cn(
                "relative z-10 h-32 w-32 drop-shadow-[0_18px_28px_rgba(15,23,42,0.18)]",
                gatePassDisabled && "grayscale opacity-75",
              )} />
            </div>
            
            <div className="bg-white dark:bg-slate-900 px-5 py-4 flex items-center justify-between lg:p-8">
              <div className="flex-1">
                <h3 className="text-[17px] font-black text-slate-900 dark:text-white leading-tight lg:text-2xl">
                  Request Gate Pass
                </h3>
                {gatePassDisabled && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">
                      Not available after 3:00 PM
                    </span>
                  </div>
                )}
              </div>
              <button 
                disabled={gatePassDisabled}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all lg:h-12 lg:px-7",
                  gatePassDisabled ? "bg-slate-100 text-slate-400" : "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
                )}
              >
                {gatePassDisabled ? <Ban className="w-5 h-5" /> : 'Apply Now'}
              </button>
            </div>
          </motion.div>

          {/* Section Header */}
          <div className="mt-8 mb-3 px-1 lg:mt-0">
            <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Recent Requests
            </h4>
          </div>

          {/* Requests List */}
          {loading ? (
            <SkeletonList count={3} />
          ) : isDesktop && filteredRequests.length > 0 ? (
            <section className="desktop-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">Recent Requests</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Today&apos;s gate pass activity</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{filteredRequests.length} Requests</span>
              </div>
              <div className="overflow-x-auto">
                <table className="desktop-table">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const status = getStatusConfig(request.status);
                      return (
                        <tr key={request.id} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35" onClick={() => { setSelectedRequest(request); setShowDetailsModal(true); }}>
                          <td>
                            <p className="font-bold text-slate-950 dark:text-white">{request.purpose || 'Gate Pass Request'}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Request #{request.id}</p>
                          </td>
                          <td>{request.passType === 'BULK' ? 'Bulk Pass' : 'Single Pass'}</td>
                          <td>{formatDateTime(request.requestDate || request.createdAt)}</td>
                          <td>
                            <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase text-white', status.color)}>
                              {status.label}
                            </span>
                          </td>
                          <td className="text-right">
                            {request.status === 'APPROVED' && request.passType !== 'BULK' ? (
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleViewQR(request); }} icon={<QrCode className="w-4 h-4" />}>View QR</Button>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setShowDetailsModal(true); }}>View</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const status = getStatusConfig(request.status);
                return (
                  <motion.div
                    key={request.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailsModal(true);
                    }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn(
                        "px-2.5 py-1 rounded-md",
                        request.passType === 'BULK'
                          ? "bg-blue-50 dark:bg-indigo-900/20"
                          : "bg-emerald-50 dark:bg-emerald-900/20"
                      )}>
                        <span className={cn(
                          "text-[10px] font-bold",
                          request.passType === 'BULK'
                            ? "text-[var(--color-primary)] dark:text-blue-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {request.passType === 'BULK' ? 'Bulk Pass' : 'Single Pass'}
                        </span>
                      </div>
                      <div className={cn("px-2.5 py-1 rounded-md", status.color)}>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <h5 className="text-[14px] font-bold text-slate-900 dark:text-white mb-1 truncate">
                      {request.purpose || 'Gate Pass Request'}
                    </h5>
                    <p className="text-[12px] text-slate-400 mb-3">
                      {formatDateTime(request.requestDate || request.createdAt)}
                    </p>

                    {request.status === 'APPROVED' && request.passType !== 'BULK' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewQR(request); }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-[var(--color-primary)] rounded-xl text-white active:scale-95 transition-transform"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span className="text-[12px] font-bold">View QR Code</span>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-8 h-8 text-slate-200 dark:text-slate-700" />
              </div>
              <h5 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">No recent requests</h5>
            </div>
          )}
        </div>
      </TopRefreshControl>

      {renderModals()}
    </div>
  );
}
