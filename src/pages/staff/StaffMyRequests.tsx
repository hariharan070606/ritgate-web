import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
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
import { getStaffOwnRequests, getStaffBulkPassRequests, getGatePassQRCode } from '../../services/api.service';
import PageHeader from '../../components/common/PageHeader';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import MyRequestsBulkModal from '../../components/common/MyRequestsBulkModal';
import type { Staff } from '../../types';
import { cn } from '../../utils/cn';
import { formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

export default function StaffMyRequests() {
  usePageTitle('My Requests');
  const { isDesktop } = useAdaptive();
  const { user: rawUser, logout, getUserId } = useAuth();
  const user = rawUser as Staff;
  const { refreshCount } = useRefresh();
  const { error: showToastError } = useToast();
  const staffCode = getUserId();

  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);

  useEffect(() => {
    loadData();
  }, [refreshCount]);

  const loadData = async () => {
    if (!staffCode) return;
    try {
      const [singleRes, bulkRes] = await Promise.all([
        getStaffOwnRequests(staffCode),
        getStaffBulkPassRequests(staffCode)
      ]);

      let combined: any[] = [];
      if (singleRes.success) combined = [...(singleRes.requests || [])];
      if (bulkRes.success) combined = [...combined, ...(bulkRes.requests || [])];
      
      // Deduplicate and sort
      const uniqueMap = new Map();
      combined.forEach(req => {
        if (!uniqueMap.has(req.id) || req.staffCount != null) {
          uniqueMap.set(req.id, req);
        }
      });
      const unique = Array.from(uniqueMap.values());
      const sorted = unique.sort((a, b) => new Date(b.createdAt || b.requestDate).getTime() - new Date(a.createdAt || a.requestDate).getTime());
      
      setRequests(sorted);
    } catch (err) {
      console.error('Failed to load my requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = searchQuery === '' || 
      r.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id?.toString().includes(searchQuery);
    return matchesSearch;
  });

  const handleViewQR = async (request: any) => {
    if (request.status !== 'APPROVED' && request.status !== 'APPROVED_BY_HOD') return;
    setSelectedRequest(request);
    setShowQRModal(true);
    try {
      // Bulk passes might have QR data embedded, otherwise fetch
      if (request.passType === 'BULK' && request.qrCode) {
         setQrData({
            code: request.qrCode,
            manual: request.manualCode || null,
            expires: request.qrExpiresAt || null
         });
      } else {
        const res = await getGatePassQRCode(request.id, staffCode);
        if (res.success) {
          setQrData({
            code: res.qrCode || '',
            manual: res.manualCode,
            expires: res.qrExpiresAt
          });
        } else {
          showToastError('QR Error', res.message || 'Could not fetch QR code');
          setShowQRModal(false);
        }
      }
    } catch {
      showToastError('Error', 'Network error');
      setShowQRModal(false);
    }
  };

  const handleReviewRequest = (request: any) => {
    setSelectedRequest(request);
    if (request.passType === 'BULK') {
      setShowBulkModal(true);
    } else {
      setShowDetailModal(true);
    }
  };

  const staffName = (user as any)?.staffName || (user as any)?.name || 'Staff Member';
  const initials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const getStatusConfig = (status: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'APPROVED_BY_HOD') return { text: 'APPROVED', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/30' };
    if (s === 'REJECTED') return { text: 'REJECTED', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30' };
    if (s === 'PENDING_HOD') return { text: 'PENDING HOD', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/30' };
    if (s === 'PENDING_HR') return { text: 'PENDING HR', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/30' };
    if (s === 'USED') return { text: 'USED', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/50' };
    if (s === 'EXITED') return { text: 'EXITED', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/50' };
    return { text: 'PENDING', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30' };
  };

  return (
    <div className="min-h-screen md:bg-transparent md:min-h-0 bg-[#F8FAFC] dark:bg-slate-950">
      {/* Header */}
      <PageHeader title="My Requests" />
      {isDesktop && (
        <DesktopPageHeader
          title="My Requests"
          subtitle="View and track your gate pass request history"
        />
      )}

      <div className="px-4 sm:px-5 pt-4 space-y-4 md:px-0 md:pt-0 md:mb-5">
        {/* Search Bar */}
        <div className="relative md:hidden">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Search your requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[20px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none"
          />
        </div>
        {isDesktop && (
          <DesktopToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search your requests by purpose, reason, or ID..."
          />
        )}
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-4 sm:px-5 pt-4 pb-28 min-h-screen flex flex-col md:px-0 md:pt-6 md:pb-8 md:min-h-0">
          {loading ? (
            <SkeletonList count={4} />
          ) : isDesktop && filteredRequests.length > 0 ? (
            <section className="desktop-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">Request History</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Today&apos;s submitted requests</p>
                </div>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest">{filteredRequests.length} Records</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="desktop-table w-full min-w-[650px]">
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Date</th>
                      <th>Purpose</th>
                      <th className="!text-center">Status</th>
                      <th className="!text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const isBulk = request.passType === 'BULK';
                      const config = getStatusConfig(request.status);
                      return (
                        <tr key={request.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35 transition-colors">
                          <td>
                            <div>
                              <p className="font-bold text-slate-950 dark:text-white">{isBulk ? 'Bulk Student Pass' : 'Myself (Single Pass)'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ID: {request.id}</p>
                            </div>
                          </td>
                          <td>{formatDateTime(request.createdAt || request.requestDate)}</td>
                          <td className="max-w-[360px] truncate">{request.purpose || request.reason || 'Gate Pass Request'}</td>
                          <td>
                            <span className={cn(
                              'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase',
                              config.bg, config.color
                            )}>
                              {config.text}
                            </span>
                          </td>
                          <td className="text-center">
                            <Button size="sm" variant="dark" onClick={() => handleReviewRequest(request)}>View</Button>
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
                const isBulk = request.passType === 'BULK';
                const isApproved = request.status === 'APPROVED' || request.status === 'APPROVED_BY_HOD';
                
                return (
                  <motion.div 
                    key={request.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleReviewRequest(request)}
                    className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 transition-colors"
                  >
                    {/* Card Top Row */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 font-black text-[18px]">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight">{staffName}</h5>
                           <div className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isBulk ? 'Bulk Pass' : 'Single Pass'}
                              </span>
                           </div>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tight">
                          Staff • {user?.department || 'Dept'}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                        {relativeTime(request.createdAt || request.requestDate)}
                      </span>
                    </div>

                    {/* Info Box */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 space-y-2.5 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white truncate">
                          {request.purpose || request.reason || 'Gate Pass Request'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {formatDateTime(request.createdAt || request.requestDate)}
                        </span>
                      </div>
                      {isBulk && (
                        <div className="flex items-center gap-3">
                          <Users className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                            {(() => {
                              const sc = request.staffCount ?? 0;
                              const stc = request.studentCount ?? 0;
                              if (sc > 0 && stc > 0) return `Staff - ${sc}, Students - ${stc}`;
                              if (sc > 0) return `Staff - ${sc}`;
                              if (stc > 0) return `Students - ${stc}`;
                              return `${request.participantCount || 0} Participants`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between">
                       {(() => {
                         const config = getStatusConfig(request.status);
                         const isEmerald = config.text === 'APPROVED';
                         const isRose = config.text === 'REJECTED';
                         return (
                           <div className={cn(
                             "flex items-center gap-2 px-3 py-1.5 rounded-full",
                             isEmerald ? "bg-emerald-500/10" : isRose ? "bg-rose-500/10" : "bg-amber-500/10"
                           )}>
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isEmerald ? "bg-emerald-500" : isRose ? "bg-rose-500" : "bg-amber-500"
                              )} />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                isEmerald ? "text-emerald-600" : isRose ? "text-rose-600" : "text-amber-600"
                              )}>
                                {config.text}
                              </span>
                           </div>
                         );
                       })()}
                      
                      {isApproved && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewQR(request);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl active:scale-95 transition-transform"
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
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="No requests found"
              description="Your past gate pass requests will appear here."
            />
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
            personName={staffName}
            personId={staffCode}
            manualCode={qrData?.manual}
            validUntil={qrData?.expires || undefined}
          />
        )}

        {selectedRequest && showDetailModal && (
          <SinglePassDetailsModal 
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            request={selectedRequest}
          />
        )}

        {selectedRequest && showBulkModal && (
          <MyRequestsBulkModal 
            isOpen={showBulkModal}
            onClose={() => setShowBulkModal(false)}
            requestId={selectedRequest.id}
            currentUserId={staffCode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
