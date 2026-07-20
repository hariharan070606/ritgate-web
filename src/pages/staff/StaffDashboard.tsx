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
import { useNavigate } from 'react-router-dom';
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
import MyRequestsBulkModal from '../../components/common/MyRequestsBulkModal';
import { cn } from '../../utils/cn';
import type { Staff } from '../../types';
import { formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import { EMPTY_COPY } from '../../config/nativeCopy';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

type ActiveTab = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function StaffDashboard() {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const { isDesktop } = useAdaptive();
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
  const [showBulkModal, setShowBulkModal] = useState(false);
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
    try {
      const res = req.requestType === 'VISITOR'
        ? await approveVisitorRequest(req.requestId || req.originalId, staffCode)
        : await approveGatePassByStaff(staffCode, id, remark);
      
      if (res.success) {
        showToastSuccess('Approved', 'Request authorized successfully');
        setShowDetailModal(false);
        setShowBulkModal(false);
        loadData();
      } else {
        showToastError('Failed', res.message);
      }
    } catch (e) {
      showToastError('Error', 'An internal error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: number, remark: string) => {
    const req = requests.find(r => r.id === id) || selectedRequest;
    if (!req) return;
    setProcessing(true);
    try {
      const res = req.requestType === 'VISITOR'
        ? await rejectVisitorRequest(req.requestId || req.originalId, remark)
        : await rejectGatePassByStaff(staffCode, id, remark);
      
      if (res.success) {
        showToastSuccess('Rejected', 'Request has been rejected');
        setShowDetailModal(false);
        setShowBulkModal(false);
        loadData();
      } else {
        showToastError('Failed', res.message);
      }
    } catch (e) {
      showToastError('Error', 'An internal error occurred');
    } finally {
      setProcessing(false);
    }
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

  const closeRequestDetails = () => {
    setShowDetailModal(false);
  };

  const staffName = (user as any)?.staffName || (user as any)?.name || (user as any)?.firstName || 'Staff Member';
  const initials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const getRequesterName = (request: any) =>
    request.studentName || request.requesterName || request.visitorName || request.name || 'Unknown';

  const getRequesterPhoto = (request: any) =>
    request.profilePhoto ||
    request.profileImage ||
    request.photoUrl ||
    request.studentPhoto ||
    request.studentProfilePhoto ||
    request.requesterPhoto ||
    request.requesterProfilePhoto ||
    request.visitorPhoto ||
    '';

  const getRequesterInitials = (request: any) =>
    getRequesterName(request)
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const isPendingRequest = (request: any) =>
    request.status === 'PENDING_STAFF' ||
    (request.requestType === 'VISITOR' && (request.status === 'PENDING' || request.status === 'PENDING_STAFF'));

  const openReview = (request: any) => {
    setSelectedRequest(request);
    if (request.passType === 'BULK') setShowBulkModal(true);
    else setShowDetailModal(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  return (
    <div className="min-h-screen lg:bg-transparent lg:min-h-0 bg-[#F8FAFC] dark:bg-slate-950">
      {!isDesktop && <TopMenuBar
        greeting={getGreeting()}
        title={staffName.toUpperCase()}
      />}

      {isDesktop && (
        <DesktopPageHeader
          eyebrow={getGreeting().replace(',', '')}
          title="Dashboard"
          subtitle="Track and manage your gate pass requests"
        />
      )}

      <div className="px-5 pt-4 space-y-4 lg:px-0 lg:pt-0 lg:space-y-5">
        {/* Search Bar */}
        <div className="relative lg:hidden">
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

        {isDesktop && (
          <DesktopToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search requests by name, purpose, or ID..."
          />
        )}

        {/* Stats Tabs */}
        <div className="flex bg-white dark:bg-slate-900 rounded-[24px] p-2 shadow-sm border border-slate-50 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all lg:hidden">
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

        {isDesktop && (
          <div className="grid grid-cols-3 gap-4">
            <DesktopStatCard label="Pending" value={getStats().PENDING} icon={Clock} tone="amber" active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} />
            <DesktopStatCard label="Approved" value={getStats().APPROVED} icon={CheckCircle2} tone="emerald" active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')} />
            <DesktopStatCard label="Rejected" value={getStats().REJECTED} icon={AlertCircle} tone="rose" active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')} />
          </div>
        )}
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-4 pb-28 min-h-screen flex flex-col lg:px-0 lg:pt-6 lg:pb-8 lg:min-h-0">
          {loading ? (
            <SkeletonList count={4} />
          ) : isDesktop && filteredRequests.length > 0 ? (
            <section className="desktop-card overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <h3 className="text-[18px] font-black text-slate-950 dark:text-white tracking-tight">Requests Overview</h3>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-[0.18em] whitespace-nowrap">
                  {filteredRequests.length} {filteredRequests.length === 1 ? 'Request' : 'Requests'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="desktop-table">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/60">
                    <tr>
                      <th className="w-[300px]">Requester</th>
                      <th className="w-[160px]">Type</th>
                      <th className="w-[230px]">Purpose</th>
                      <th className="w-[190px]">Date</th>
                      <th className="w-[130px] !text-center">Status</th>
                      <th className="w-[180px] !text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const isVisitor = request.requestType === 'VISITOR';
                      const requesterName = getRequesterName(request);
                      const requesterPhoto = getRequesterPhoto(request);
                      const isPending = isPendingRequest(request);
                      return (
                        <tr 
                          key={request.id} 
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35 transition-colors"
                        >
                          <td>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 bg-blue-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                                {requesterPhoto ? (
                                  <img src={requesterPhoto} alt={requesterName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[13px] font-black text-blue-700 dark:text-blue-300">
                                    {getRequesterInitials(request)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-slate-950 dark:text-white truncate">{requesterName}</p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {isVisitor ? request.visitorPhone || 'Visitor' : `${request.regNo || 'N/A'} - ${request.department || 'Dept'}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="font-bold text-slate-700 dark:text-slate-200">{isVisitor ? 'Visitor' : request.passType === 'BULK' ? 'Bulk Gate Pass' : 'Single Gate Pass'}</td>
                          <td className="max-w-[320px] truncate font-bold text-slate-800 dark:text-slate-100">{request.purpose || request.reason || 'General'}</td>
                          <td className="font-semibold text-slate-700 dark:text-slate-300">{formatDateTime(request.requestDate || request.createdAt)}</td>
                          <td>
                            <span className={cn(
                              'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase',
                              request.staffApproval === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                              request.staffApproval === 'REJECTED' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' :
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                            )}>
                              {request.staffApproval || 'PENDING'}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="flex justify-center">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={(e) => { e.stopPropagation(); openReview(request); }}
                                className="h-9 rounded-xl px-4 text-[11px] font-extrabold uppercase tracking-widest"
                              >
                                View
                              </Button>
                            </div>
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
                const isVisitor = request.requestType === 'VISITOR';
                const requesterName = getRequesterName(request);
                const requesterPhoto = getRequesterPhoto(request);
                const isPending = isPendingRequest(request);
                return (
                  <motion.div 
                    key={request.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openReview(request)}
                    className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 transition-colors"
                  >
                    {/* Card Top Row */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden flex items-center justify-center text-slate-400 font-black text-[17px]">
                        {requesterPhoto ? (
                          <img src={requesterPhoto} alt={requesterName} className="w-full h-full object-cover" />
                        ) : (
                          getRequesterInitials(request)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight">{requesterName}</h5>
                           <div className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isVisitor ? (request.role || 'Visitor') : (request.passType === 'BULK' ? 'Bulk Gate Pass' : 'Single Gate Pass')}
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

                    {/* Badge & Action */}
                    <div className="flex items-center justify-between mt-4">
                      <div className={cn(
                        "inline-flex items-center px-4 py-1.5 rounded-full",
                        request.staffApproval === 'APPROVED' ? "bg-emerald-500" :
                        request.staffApproval === 'REJECTED' ? "bg-rose-500" : "bg-amber-500"
                      )}>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{request.staffApproval}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => { e.stopPropagation(); openReview(request); }}
                        className="h-9 rounded-xl px-4 text-[11px] font-extrabold uppercase tracking-widest"
                      >
                        View
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="w-8 h-8" />}
              title={EMPTY_COPY.noRequestsFound}
              description={EMPTY_COPY.requestsWillAppear}
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
            onClose={closeRequestDetails}
            request={selectedRequest}
            onApprove={handleApprove}
            onReject={handleReject}
            showActions={activeTab === 'PENDING'}
            processing={processing}
          />
        )}

        {selectedRequest && showBulkModal && (
          <MyRequestsBulkModal
            isOpen={showBulkModal}
            onClose={() => setShowBulkModal(false)}
            requestId={selectedRequest.id}
            userRole="STAFF"
            viewerRole="STAFF"
            currentUserId={staffCode}
            requesterInfo={{
              name: selectedRequest.requestedByStaffName || 'Staff',
              role: selectedRequest.userType || 'Staff',
              department: selectedRequest.department || ''
            }}
            onApprove={(req, remark) => handleApprove(selectedRequest.id, remark || '')}
            onReject={(req, remark) => handleReject(selectedRequest.id, remark)}
            showActions={activeTab === 'PENDING'}
            processing={processing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
