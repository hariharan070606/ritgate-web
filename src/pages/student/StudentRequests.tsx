import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Users, 
  QrCode, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useToast } from '../../context/ToastContext';
import { getStudentGatePassRequests, getGatePassQRCode } from '../../services/api.service';
import PageHeader from '../../components/common/PageHeader';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import MyRequestsBulkModal from '../../components/common/MyRequestsBulkModal';
import { cn } from '../../utils/cn';
import type { Student } from '../../types';
import { formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

export default function StudentRequests() {
  usePageTitle('My Requests');
  const { user: rawUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useAdaptive();
  const user = rawUser as Student;
  const { refreshCount } = useRefresh();
  const { error: showError } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);

  useEffect(() => {
    loadData();
  }, [refreshCount]);

  useEffect(() => {
    const requestId = new URLSearchParams(location.search).get('requestId');
    if (!requestId || showSingleModal || requests.length === 0) return;

    const request = requests.find((item) => String(item.id) === requestId);
    if (request && request.passType !== 'BULK') {
      setSelectedRequest(request);
      setShowSingleModal(true);
    }
  }, [location.search, requests, showSingleModal]);

  const loadData = async () => {
    if (!user?.regNo) return;
    try {
      const response = await getStudentGatePassRequests(user.regNo);
      if (response.success) {
        // Core mobile logic: show only non-used requests that are from today for the primary list
        const filtered = response.requests
          .filter((r: any) => r.status !== 'USED' && r.status !== 'EXITED')
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

  const handleViewQR = async (request: any) => {
    if (request.status !== 'APPROVED') return;
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
      showError('Error', 'Network error');
      setShowQRModal(false);
    }
  };

  const openRequestDetails = (request: any) => {
    setSelectedRequest(request);
    if (request.passType === 'BULK') {
      setShowBulkModal(true);
      return;
    }

    setShowSingleModal(true);
    navigate(`/requests?requestId=${request.id}`, { replace: false });
  };

  const closeRequestDetails = () => {
    setShowSingleModal(false);
    if (new URLSearchParams(location.search).has('requestId')) {
      navigate('/requests', { replace: true });
    }
  };

  const filteredRequests = requests;

  const getStatusConfig = (status: string) => {
    if (status === 'APPROVED') return { text: 'ACTIVE', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' };
    if (status === 'REJECTED') return { text: 'REJECTED', color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-500' };
    if (status === 'PENDING_HOD') return { text: 'AWAITING HOD', color: 'text-[var(--color-primary)]', bg: 'bg-blue-50', dot: 'bg-blue-500' };
    return { text: 'AWAITING STAFF', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
  };

  const studentName = `${user?.firstName} ${user?.lastName || ''}`.trim();
  const initials = studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen lg:bg-transparent lg:min-h-0 bg-[#F8FAFC] dark:bg-slate-950">
      <PageHeader title="My Requests" />

      {isDesktop && (
        <DesktopPageHeader
          title="My Requests"
          subtitle="Track today's active gate pass requests"
        />
      )}
      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-4 pb-28 lg:px-0 lg:pt-6 lg:pb-8">
          {loading ? (
            <SkeletonList count={4} />
          ) : isDesktop && filteredRequests.length > 0 ? (
            <section className="desktop-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">Request Queue</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Today&apos;s active requests</p>
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
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const config = getStatusConfig(request.status);
                      const isBulk = request.passType === 'BULK';
                      return (
                        <tr
                          key={request.id}
                          className="cursor-pointer hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35"
                          onClick={() => openRequestDetails(request)}
                        >
                          <td>
                            <p className="font-bold text-slate-950 dark:text-white">{request.purpose || request.reason || 'Gate Pass Request'}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Request #{request.id}</p>
                          </td>
                          <td>{isBulk ? 'Bulk Pass' : 'Single Pass'}</td>
                          <td>{formatDateTime(request.requestDate || request.createdAt)}</td>
                          <td><span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase', config.bg, config.color)}>{config.text}</span></td>
                          <td className="text-center">
                            {request.status === 'APPROVED' && !isBulk ? (
                              <Button className="mx-auto" size="sm" onClick={(e) => { e.stopPropagation(); handleViewQR(request); }} icon={<QrCode className="w-4 h-4" />}>View QR</Button>
                            ) : (
                              <Button className="mx-auto" size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openRequestDetails(request); }}>View</Button>
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
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const config = getStatusConfig(request.status);
                const isBulk = request.passType === 'BULK';
                return (
                  <motion.div 
                    key={request.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openRequestDetails(request)}
                    className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 transition-colors"
                  >
                    {/* Card Top Row */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 font-black text-[18px]">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight">{studentName}</h5>
                           <div className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{isBulk ? 'Bulk Pass' : 'Single Pass'}</span>
                           </div>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400">Student • {user?.department || 'GEN'}</p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                        {relativeTime(request.createdAt)}
                      </span>
                    </div>

                    {/* Info Box */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 space-y-2.5 mb-4 border border-slate-100/50 dark:border-slate-800/30">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4.5 h-4.5 text-slate-400" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white truncate">
                          {request.purpose || request.reason || 'Gate Pass Request'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4.5 h-4.5 text-slate-400" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {formatDateTime(request.requestDate)}
                        </span>
                      </div>
                      {isBulk && (
                        <div className="flex items-center gap-3">
                          <Users className="w-4.5 h-4.5 text-slate-400" />
                          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                            {request.participantCount || 0} Participants
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between">
                      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full", config.bg)}>
                         <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                         <span className={cn("text-[11px] font-black uppercase tracking-wider", config.color)}>
                           {config.text}
                         </span>
                      </div>
                      
                      {request.status === 'APPROVED' && !isBulk && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewQR(request);
                          }}
                          className="flex items-center gap-2 px-4.5 py-2.5 bg-[var(--color-primary)] rounded-xl text-white shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-transform"
                        >
                          <QrCode className="w-4 h-4 text-white" />
                          <span className="text-[11px] font-black uppercase tracking-widest">View QR</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            isDesktop ? (
              <EmptyState
                title="No requests found"
                description="No active requests for today."
                icon={<FileText className="w-8 h-8" />}
              />
            ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <FileText className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">
                No requests found
              </h5>
              <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed italic">
                No active requests for today.
              </p>
            </div>
            )
          )}
        </div>
      </TopRefreshControl>

      {/* Modals */}
      <AnimatePresence>
        {selectedRequest && showQRModal && (
          <GatePassQRModal 
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            qrCodeData={qrData?.code || ''}
            personName={studentName}
            personId={user?.regNo || ''}
            manualCode={qrData?.manual}
            validUntil={qrData?.expires || 'Today'}
          />
        )}

        {selectedRequest && showSingleModal && (
          <SinglePassDetailsModal 
            isOpen={showSingleModal}
            onClose={closeRequestDetails}
            request={selectedRequest}
          />
        )}

        {selectedRequest && showBulkModal && (
          <MyRequestsBulkModal 
            isOpen={showBulkModal}
            onClose={() => setShowBulkModal(false)}
            requestId={selectedRequest.id}
            userRole="STAFF"
            currentUserId={user?.regNo || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
