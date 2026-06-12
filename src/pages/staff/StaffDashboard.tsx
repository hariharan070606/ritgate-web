import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileText, 
  Calendar, 
  Users, 
  QrCode, 
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { 
  getStaffOwnRequests, 
  getStaffAllRequests, 
  getVisitorRequestsForStaff,
  getGatePassQRCode,
  approveGatePassByStaff,
  rejectGatePassByStaff,
  approveVisitorRequest,
  rejectVisitorRequest
} from '../../services/api.service';
import TopMenuBar from '../../components/common/TopMenuBar';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import { cn } from '../../utils/cn';
import type { Staff } from '../../types';
import { formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import { EMPTY_COPY } from '../../config/nativeCopy';

type ActiveTab = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function StaffDashboard() {
  usePageTitle('Dashboard');
  const { user: rawUser, logout, getUserId } = useAuth();
  const user = rawUser as Staff;
  const { refreshCount } = useRefresh();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const staffCode = getUserId();

  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('PENDING');
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshCount]);

  const loadData = async () => {
    if (!staffCode) return;
    try {
      const [ownRes, assignedRes, visitorRes] = await Promise.all([
        getStaffOwnRequests(staffCode),
        getStaffAllRequests(staffCode),
        getVisitorRequestsForStaff(staffCode)
      ]);

      let all: any[] = [];

      if (ownRes.success) {
        all = [...all, ...(ownRes.requests || []).map((r: any) => ({ ...r, isOwnRequest: true, requestType: 'GATEPASS' }))];
      }
      if (assignedRes.success) {
        all = [...all, ...(assignedRes.requests || []).map((r: any) => ({ ...r, isOwnRequest: false, requestType: 'GATEPASS' }))];
      }
      if (visitorRes.success) {
        all = [...all, ...(visitorRes.requests || []).map((r: any) => ({
          ...r,
          id: `VISITOR-${r.requestId}`,
          requestType: 'VISITOR',
          isOwnRequest: false,
          studentName: r.requesterName,
          reason: r.purpose,
          status: r.status,
          staffApproval: r.status,
          createdAt: r.createdAt
        }))];
      }

      // Filter for unique and sort
      const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      const sorted = unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRequests(sorted);
    } catch (err) {
      console.error('Failed to load staff dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const dashboardRequests = requests.filter(r => {
    // Basic dashboard rule: Don't show own requests on home (only in "My Requests")
    if (r.isOwnRequest) return false;
    // Only show today's requests on the dashboard
    return isToday(r.createdAt || r.requestDate || r.visitDate);
  });

  const getStats = () => {
    return {
      PENDING: dashboardRequests.filter(r => 
        r.status === 'PENDING_STAFF' || 
        (r.requestType === 'VISITOR' && (r.status === 'PENDING' || r.status === 'PENDING_STAFF'))
      ).length,
      APPROVED: dashboardRequests.filter(r => r.staffApproval === 'APPROVED').length,
      REJECTED: dashboardRequests.filter(r => r.staffApproval === 'REJECTED').length,
    };
  };

  const filteredRequests = dashboardRequests.filter(r => {
    const matchesSearch = searchQuery === '' || 
      r.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id?.toString().includes(searchQuery);

    let matchesTab = false;
    if (activeTab === 'PENDING') {
      matchesTab = r.status === 'PENDING_STAFF' || 
                   (r.requestType === 'VISITOR' && (r.status === 'PENDING' || r.status === 'PENDING_STAFF'));
    } else if (activeTab === 'APPROVED') {
      matchesTab = r.staffApproval === 'APPROVED';
    } else if (activeTab === 'REJECTED') {
      matchesTab = r.staffApproval === 'REJECTED';
    }
    return matchesSearch && matchesTab;
  });

  const handleApprove = async (id: number, remark: string) => {
    const req = requests.find(r => r.id === id) || selectedRequest;
    if (!req) return;
    setProcessing(true);
    await withLock(async () => {
       try {
         const res = req.requestType === 'VISITOR'
            ? await approveVisitorRequest(req.requestId || req.originalId, staffCode)
            : await approveGatePassByStaff(staffCode, id, remark);
         
         if (res.success) {
           showToastSuccess('Approved', 'Request authorized successfully');
           setShowDetailModal(false);
           loadData();
         } else showToastError('Failed', res.message);
       } catch (e) {
         showToastError('Error', 'An internal error occurred');
       }
    }, 'Authorizing...');
    setProcessing(false);
  };

  const handleReject = async (id: number, remark: string) => {
    const req = requests.find(r => r.id === id) || selectedRequest;
    if (!req) return;
    setProcessing(true);
    await withLock(async () => {
       try {
         const res = req.requestType === 'VISITOR'
            ? await rejectVisitorRequest(req.requestId || req.originalId, remark)
            : await rejectGatePassByStaff(staffCode, id, remark);
         
         if (res.success) {
           showToastSuccess('Rejected', 'Request has been rejected');
           setShowDetailModal(false);
           loadData();
         } else showToastError('Failed', res.message);
       } catch (e) {
         showToastError('Error', 'An internal error occurred');
       }
    }, 'Rejecting...');
    setProcessing(false);
  };

  const handleViewQR = async (request: any) => {
    setSelectedRequest(request);
    setShowQRModal(true);
    try {
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
    } catch {
      showToastError('Error', 'Network error');
      setShowQRModal(false);
    }
  };

  const staffName = (user as any)?.staffName || (user as any)?.name || (user as any)?.firstName || 'Staff Member';
  const initials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <TopMenuBar
        greeting={getGreeting()}
        title={staffName.toUpperCase()}
      />

      <div className="px-5 pt-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none"
          />
        </div>

        {/* Stats Tabs */}
        <div className="flex bg-white dark:bg-slate-900 rounded-[24px] p-2 shadow-sm border border-slate-50 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          {(['PENDING', 'APPROVED', 'REJECTED'] as ActiveTab[]).map((tab) => {
            const stats = getStats();
            const isActive = activeTab === tab;
            const labels = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' };
            const colors = { PENDING: 'text-amber-500', APPROVED: 'text-emerald-500', REJECTED: 'text-rose-500' };
            const borders = { PENDING: 'border-amber-500', APPROVED: 'border-emerald-500', REJECTED: 'border-rose-500' };

            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 flex flex-col items-center py-2 transition-all border-b-2",
                  isActive ? borders[tab] : "border-transparent"
                )}
              >
                <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isActive ? colors[tab] : "text-slate-400")}>{labels[tab]}</span>
                <span className={cn("text-[18px] font-black", isActive ? "text-slate-900 dark:text-white" : "text-slate-300")}>
                  {stats[tab]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-4 pb-28">
          {loading ? (
            <SkeletonList count={4} />
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const reqInitials = (request.studentName || 'ST').split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase();
                const isVisitor = request.requestType === 'VISITOR';
                return (
                  <motion.div 
                    key={request.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailModal(true);
                    }}
                    className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 transition-colors"
                  >
                    {/* Card Top Row */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-black text-[17px]">
                        {reqInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight">{request.studentName || 'Unknown'}</h5>
                           <div className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isVisitor ? (request.role || 'Visitor') : (request.passType === 'BULK' ? 'Bulk GatePass' : 'Single GatePass')}
                              </span>
                           </div>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tight">
                          {isVisitor ? `Visitor - ${request.visitorPhone || ''}` : `${request.regNo || 'N/A'} - ${request.department || 'Dept'}`}
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
                          {request.purpose || request.reason || 'General'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {isVisitor && request.visitDate ? `${request.visitDate} ${request.visitTime || ''}` : formatDateTime(request.requestDate || request.createdAt)}
                        </span>
                      </div>
                      {request.passType === 'BULK' && (
                        <div className="flex items-center gap-3">
                          <Users className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                            {request.participantCount || 0} Participants
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Badge */}
                    <div className={cn(
                      "inline-flex items-center px-4 py-1.5 rounded-full",
                      request.staffApproval === 'APPROVED' ? "bg-emerald-500" :
                      request.staffApproval === 'REJECTED' ? "bg-rose-500" : "bg-amber-500"
                    )}>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{request.staffApproval}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">{EMPTY_COPY.noRequestsFound}</h5>
              <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed italic">
                {EMPTY_COPY.requestsWillAppear}
              </p>
            </div>
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
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={activeTab === 'PENDING'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
