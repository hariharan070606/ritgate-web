import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle,
  Clock,
  RefreshCw,
  LayoutGrid,
  Check,
  X
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { 
  getHODAllRequests, 
  getHODVisitorRequests, 
  approveGatePassByHOD, 
  rejectGatePassByHOD,
  approveVisitorByHOD,
  rejectVisitorByHOD
} from '../../services/api.service';
import TopMenuBar from '../../components/common/TopMenuBar';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import MyRequestsBulkModal from '../../components/common/MyRequestsBulkModal';
import { cn } from '../../utils/cn';
import { formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import DesktopSegmentedTabs from '../../components/desktop/DesktopSegmentedTabs';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

type ActiveTab = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function HODDashboard() {
  usePageTitle('Dashboard');
  const { isDesktop } = useAdaptive();
  const { user, logout, getUserId } = useAuth();
  const { refreshCount } = useRefresh();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const hodCode = getUserId();

  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('PENDING');
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshCount]);

  const loadData = async () => {
    if (!hodCode) return;
    try {
      const [gpRes, visitorRes] = await Promise.all([
        getHODAllRequests(hodCode),
        getHODVisitorRequests(hodCode)
      ]);

      const gplist = gpRes.success ? (gpRes.requests || []) : [];
      const vlist = (visitorRes || []).map((v: any) => ({
        ...v,
        id: `VISITOR-${v.id}`,
        passType: 'VISITOR',
        requestType: 'VISITOR',
        studentName: v.visitorName || v.name,
        reason: v.purpose
      }));

      const combined = [...gplist, ...vlist];
      
      // Deduplicate and sort
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      const sorted = unique.sort((a, b) => new Date(b.createdAt || b.requestDate || b.timestamp).getTime() - new Date(a.createdAt || a.requestDate || a.timestamp).getTime());
      
      setRequests(sorted);
    } catch (err) {
      console.error('Failed to load HOD dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const dashboardRequests = requests.filter(r => {
    // Exclude HOD's own requests from home
    const isOwn = r.userType === 'HOD' || r.requestedByStaffCode === hodCode || r.regNo === hodCode;
    if (isOwn) return false;
    // Only show today's requests
    return isToday(r.createdAt || r.requestDate || r.visitDate || r.exitDateTime);
  });

  const getStats = () => {
    return {
      PENDING: dashboardRequests.filter(r => 
        r.status === 'PENDING_HOD' || (r.passType === 'VISITOR' && r.status === 'PENDING')
      ).length,
      APPROVED: dashboardRequests.filter(r => r.status === 'APPROVED').length,
      REJECTED: dashboardRequests.filter(r => r.status === 'REJECTED').length,
    };
  };

  const filteredRequests = dashboardRequests.filter(r => {
    const matchesSearch = searchQuery === '' || 
      r.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id?.toString().includes(searchQuery);

    let matchesTab = false;
    if (activeTab === 'PENDING') {
      matchesTab = r.status === 'PENDING_HOD' || (r.passType === 'VISITOR' && r.status === 'PENDING');
    } else if (activeTab === 'APPROVED') {
      matchesTab = r.status === 'APPROVED';
    } else if (activeTab === 'REJECTED') {
      matchesTab = r.status === 'REJECTED';
    }
    return matchesSearch && matchesTab;
  });

  const handleApprove = async (id: number, remark: string = '') => {
    const req = requests.find(r => r.id === id) || selectedRequest;
    if (!req) return;
    setProcessing(true);
    await withLock(async () => {
       try {
         const numericId = typeof req.id === 'string' && req.id.startsWith('VISITOR-')
           ? parseInt(req.id.replace('VISITOR-', ''), 10)
           : req.id;
         const res = req.passType === 'VISITOR'
            ? await approveVisitorByHOD(numericId, hodCode)
            : await approveGatePassByHOD(hodCode, numericId, remark);
         
         if (res.success) {
           showToastSuccess('Authorized', 'Request has been approved');
           setShowDetailModal(false); setShowBulkModal(false);
           loadData();
         } else showToastError('Failed', res.message);
       } catch { showToastError('Error', 'An internal error occurred'); }
    }, 'Authorizing...');
    setProcessing(false);
  };

  const handleReject = async (id: number, remark: string) => {
    const req = requests.find(r => r.id === id) || selectedRequest;
    if (!req) return;
    if (!remark.trim()) return showToastError('Required', 'Please provide a reason for rejection');
    setProcessing(true);
    await withLock(async () => {
       try {
         const numericId = typeof req.id === 'string' && req.id.startsWith('VISITOR-')
           ? parseInt(req.id.replace('VISITOR-', ''), 10)
           : req.id;
         const res = req.passType === 'VISITOR'
            ? await rejectVisitorByHOD(numericId, remark)
            : await rejectGatePassByHOD(hodCode, numericId, remark);
         
         if (res.success) {
           showToastSuccess('Rejected', 'Request has been rejected');
           setShowDetailModal(false); setShowBulkModal(false);
           loadData();
         } else showToastError('Failed', res.message);
       } catch { showToastError('Error', 'An internal error occurred'); }
    }, 'Rejecting...');
    setProcessing(false);
  };

  const hodName = (user as any)?.hodName || (user as any)?.name || 'HOD Member';
  const initials = hodName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen lg:bg-transparent lg:min-h-0">
      {!isDesktop && <TopMenuBar
        greeting={getGreeting()}
        title={hodName.toUpperCase()}
      />}

      {isDesktop && (
        <DesktopPageHeader
          eyebrow={getGreeting().replace(',', '')}
          title="HOD Dashboard"
          subtitle="Authorize department requests, bulk passes, and visitor clearances"
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
          <div className="grid grid-cols-3 gap-4">
            <DesktopStatCard label="Pending" value={getStats().PENDING} icon={Clock} tone="amber" active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} />
            <DesktopStatCard label="Approved" value={getStats().APPROVED} icon={CheckCircle2} tone="emerald" active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')} />
            <DesktopStatCard label="Rejected" value={getStats().REJECTED} icon={XCircle} tone="rose" active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')} />
          </div>
        )}

        {isDesktop && (
          <DesktopToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by student, visitor, purpose, or request ID..."
          >
            <DesktopSegmentedTabs
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: 'PENDING', label: 'Pending', count: getStats().PENDING },
                { value: 'APPROVED', label: 'Approved', count: getStats().APPROVED },
                { value: 'REJECTED', label: 'Rejected', count: getStats().REJECTED },
              ]}
            />
          </DesktopToolbar>
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
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }}>
        <div className="px-5 pt-4 pb-28 lg:px-0 lg:pt-6 lg:pb-8">
          {loading ? (
            <SkeletonList count={4} />
          ) : isDesktop && filteredRequests.length > 0 ? (
            <section className="desktop-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">Department Requests</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Today&apos;s {activeTab.toLowerCase()} approvals</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{filteredRequests.length} Requests</span>
              </div>
              <div className="overflow-x-auto">
                <table className="desktop-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Type</th>
                      <th>Purpose</th>
                      <th>Requested</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const isBulk = request.passType === 'BULK';
                      const isVisitor = request.passType === 'VISITOR';
                      const isPending = activeTab === 'PENDING';
                      return (
                        <tr key={request.id} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35">
                          <td>
                            <p className="font-bold text-slate-950 dark:text-white">{request.studentName || 'Unknown'}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {isBulk ? (request.requestedByStaffName || 'Staff') : isVisitor ? request.visitorPhone || 'Guest' : `${request.regNo || 'N/A'} - ${request.department || 'Dept'}`}
                            </p>
                          </td>
                          <td>{isBulk ? 'Bulk Student Pass' : isVisitor ? (request.role || 'Visitor') : 'Single Pass'}</td>
                          <td className="max-w-[320px] truncate">{request.purpose || request.reason || 'General'}</td>
                          <td>{formatDateTime(request.exitDateTime || request.requestDate || request.createdAt)}</td>
                          <td>
                            <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase',
                              request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                              request.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' :
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                            )}>
                              {(request.status === 'PENDING_HOD' || request.status === 'PENDING') ? 'PENDING' : request.status}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              {isPending && <Button size="sm" variant="success" onClick={() => handleApprove(request.id)}>Approve</Button>}
                              <Button size="sm" variant="secondary" onClick={() => { setSelectedRequest(request); if (isBulk) setShowBulkModal(true); else setShowDetailModal(true); }}>View</Button>
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
                const reqInitials = (request.studentName || 'NA').split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase();
                const isBulk = request.passType === 'BULK';
                const isVisitor = request.passType === 'VISITOR';
                const isPending = activeTab === 'PENDING';
                
                return (
                  <motion.div 
                    key={request.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedRequest(request);
                      if (isBulk) setShowBulkModal(true);
                      else setShowDetailModal(true);
                    }}
                    className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 transition-colors"
                  >
                    {/* Card Top Row */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-black text-[16px]">
                        {reqInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h5 className="text-[15px] font-black text-slate-900 dark:text-white truncate tracking-tight">{request.studentName || 'Unknown'}</h5>
                           <div className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700 shrink-0">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isBulk ? 'Bulk Pass' : isVisitor ? (request.role || 'Visitor') : 'Single Pass'}
                              </span>
                           </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                          {isBulk ? (request.requestedByStaffName || 'Staff') : isVisitor ? request.visitorPhone || 'Guest' : `${request.regNo || 'N/A'} • ${request.department || 'Dept'}`}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap shrink-0">
                        {relativeTime(request.createdAt || request.requestDate)}
                      </span>
                    </div>

                    {/* Info Box */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 space-y-2.5 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-[13px] font-bold text-slate-900 dark:text-white truncate">
                          {request.purpose || request.reason || 'General'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                          {formatDateTime(request.exitDateTime || request.requestDate || request.createdAt)}
                        </span>
                      </div>
                      {isBulk && (
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                            {request.participantCount || 0} Participants
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className={cn(
                           "w-1.5 h-1.5 rounded-full",
                           request.status === 'APPROVED' ? "bg-emerald-500" :
                           request.status === 'REJECTED' ? "bg-rose-500" : "bg-amber-500"
                         )} />
                         <span className={cn(
                           "text-[10px] font-black uppercase tracking-widest",
                           request.status === 'APPROVED' ? "text-emerald-600" :
                           request.status === 'REJECTED' ? "text-rose-600" : "text-amber-600"
                         )}>
                           {(request.status === 'PENDING_HOD' || request.status === 'PENDING') ? 'PENDING' : request.status}
                         </span>
                      </div>
                      
                      {isPending && (
                        <div className="flex gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleApprove(request.id); }}
                             className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                           >
                             Approve
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setShowDetailModal(true); }}
                             className="px-3.5 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                           >
                             Reject
                           </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            isDesktop ? (
              <EmptyState
                icon={<CheckCircle2 className="w-8 h-8" />}
                title={`No ${activeTab.toLowerCase()} requests`}
                description="Any incoming gate passes for your department will appear here."
              />
            ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <CheckCircle2 className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">No {activeTab.toLowerCase()} requests</h5>
              <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed italic">
                Any incoming gate passes for your department will appear here.
              </p>
            </div>
            )
          )}
        </div>
      </TopRefreshControl>

      {/* Modals */}
      <AnimatePresence>
        {selectedRequest && showDetailModal && (
          <SinglePassDetailsModal 
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            request={selectedRequest}
            viewerRole="hod"
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
            userRole="HOD"
            viewerRole="HOD"
            currentUserId={hodCode}
            requesterInfo={{
              name: selectedRequest.requestedByStaffName || 'Staff',
              role: selectedRequest.userType || 'Staff',
              department: selectedRequest.department || ''
            }}
            onApprove={(req, remark) => handleApprove(selectedRequest.id, remark || '')}
            onReject={(req, remark) => handleReject(selectedRequest.id, remark)}
            showActions={activeTab === 'PENDING'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
