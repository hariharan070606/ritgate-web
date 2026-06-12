import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Search,
  QrCode,
  AlertCircle,
  FileText
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useToast } from '../../context/ToastContext';
import { getStudentGatePassRequests, getGatePassQRCode } from '../../services/api.service';
import TopMenuBar from '../../components/common/TopMenuBar';
import MobileBottomNav from '../../components/navigation/MobileBottomNav';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import RequestDetailsModal from '../../components/common/RequestDetailsModal';
import { cn } from '../../utils/cn';
import type { Student } from '../../types';
import { formatDateTime, isToday } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
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
  const [searchQuery, setSearchQuery] = useState('');
  
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
        return { label: 'AWAITING STAFF', color: 'bg-amber-500' };
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

  const filteredRequests = requests.filter(r => 
    r.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id?.toString().includes(searchQuery)
  );

  const gatePassDisabled = isStudentPassDisabled();
  const stats = {
    pending: requests.filter(r => String(r.status || '').startsWith('PENDING')).length,
    approved: requests.filter(r => r.status === 'APPROVED' || r.status === 'APPROVED_BY_HOD').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen lg:bg-transparent lg:min-h-0">
      {!isDesktop && <TopMenuBar 
        greeting={getGreeting()}
        title={`${user?.firstName} ${user?.lastName || ''}`.toUpperCase()}
      />}

      {isDesktop && (
        <DesktopPageHeader
          eyebrow={getGreeting().replace(',', '')}
          title="Student Dashboard"
          subtitle="Request, track, and access your gate pass approvals"
          action={<Button disabled={gatePassDisabled} onClick={() => (window.location.href = '/new-request')} icon={<ShieldCheck className="w-4 h-4" />}>Request Gate Pass</Button>}
        />
      )}

      <div className="px-4 pt-4 lg:px-0 lg:pt-0 lg:space-y-5">
        {isDesktop && (
          <div className="grid grid-cols-3 gap-4">
            <DesktopStatCard label="Pending" value={stats.pending} icon={AlertCircle} tone="amber" />
            <DesktopStatCard label="Approved" value={stats.approved} icon={ShieldCheck} tone="emerald" />
            <DesktopStatCard label="Rejected" value={stats.rejected} icon={FileText} tone="rose" />
          </div>
        )}

        {/* Search Bar */}
        {isDesktop ? (
          <DesktopToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search recent requests by purpose or ID..."
          />
        ) : (
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text"
            placeholder="Search recent requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
          />
        </div>
        )}
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-4 pt-4 pb-28 lg:px-0 lg:pt-6 lg:pb-8">
          {/* Main Action Card */}
          <motion.div 
            whileTap={{ scale: gatePassDisabled ? 1 : 0.98 }}
            onClick={() => !gatePassDisabled && (window.location.href = '/new-request')}
            className="rounded-[24px] overflow-hidden shadow-md shadow-indigo-500/10 border border-slate-100 dark:border-indigo-900/20 lg:hidden"
          >
            <div className={cn(
              "h-40 flex items-center justify-center relative overflow-hidden",
              gatePassDisabled ? "bg-slate-400" : "bg-[var(--color-primary)]"
            )}>
              <ShieldCheck className="w-24 h-24 text-white/20 absolute" />
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-40 h-40 bg-white/10 rounded-full blur-3xl absolute"
              />
              <ShieldCheck className="w-10 h-10 text-white relative z-10" />
            </div>
            
            <div className="bg-white dark:bg-slate-900 px-5 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-[17px] font-black text-slate-900 dark:text-white leading-tight">
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
                  "px-5 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all",
                  gatePassDisabled ? "bg-slate-100 text-slate-400" : "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
                )}
              >
                Apply Now
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
            isDesktop ? (
              <EmptyState
                title="No requests found"
                description="Your recent gate pass activity will appear here."
                icon={<FileText className="w-8 h-8" />}
                action={<Button disabled={gatePassDisabled} onClick={() => (window.location.href = '/new-request')}>Request Gate Pass</Button>}
              />
            ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-8 h-8 text-slate-200 dark:text-slate-700" />
              </div>
              <h5 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">No requests found</h5>
              <p className="text-[12px] font-medium text-slate-400">Your recent gate pass activity will appear here.</p>
            </div>
            )
          )}
        </div>
      </TopRefreshControl>

      {/* Modals */}
      {selectedRequest && (
        <>
          <GatePassQRModal 
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            qrCodeData={qrData?.code || ''}
            personName={`${user?.firstName} ${user?.lastName || ''}`}
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
      )}
    </div>
  );
}
