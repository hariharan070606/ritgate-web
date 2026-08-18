import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle,
  Clock
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
import { formatDateShort, formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';

type ActiveTab = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function HODDashboard() {
  usePageTitle('Dashboard');
  const { isDesktop } = useAdaptive();
  const { user, getUserId } = useAuth();
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
      const vlist = (visitorRes || []).map((v: any) => {
        const isOwn = String(v.creatorStaffCode || v.requestedByStaffCode || v.staffCode || '').toLowerCase() === String(hodCode).toLowerCase() || v.isOwnRequest === true;
        return {
          ...v,
          id: `VISITOR-${v.id}`,
          passType: 'VISITOR',
          requestType: 'VISITOR',
          isOwnRequest: isOwn,
          studentName: v.visitorName || v.name || v.requesterName,
          reason: v.purpose
        };
      });

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
    const isOwn = r.isOwnRequest === true || r.userType === 'HOD' || String(r.requestedByStaffCode || r.creatorStaffCode || r.staffCode || r.regNo || '').toLowerCase() === String(hodCode).toLowerCase();
    if (isOwn) return false;
    // Only show today's requests (since 12:00 AM midnight today IST)
    const dateVal = r.createdAt || r.requestDate || r.visitDate || r.exitDateTime;
    return !dateVal || isToday(dateVal);
  });

  const isRequestApproved = (r: any) => {
    const s = String(r.status || r.hodApproval || '').toUpperCase();
    return s === 'APPROVED' || s === 'APPROVED_BY_HOD' || s === 'APPROVED_BY_HR' || r.hodApproval === 'APPROVED';
  };

  const isRequestRejected = (r: any) => {
    const s = String(r.status || r.hodApproval || r.staffApproval || '').toUpperCase();
    return s === 'REJECTED' || s === 'REJECTED_BY_STAFF' || s === 'REJECTED_BY_HOD' || r.hodApproval === 'REJECTED' || r.staffApproval === 'REJECTED';
  };

  const isRequestPending = (r: any) => {
    if (isRequestRejected(r) || isRequestApproved(r)) return false;
    const s = String(r.status || '').toUpperCase();
    const staffApp = String(r.staffApproval || '').toUpperCase();
    if (s === 'PENDING_STAFF' || staffApp === 'PENDING') return false;
    return s === 'PENDING_HOD' || (r.passType === 'VISITOR' && (s === 'PENDING' || s === 'PENDING_HOD'));
  };

  const getStats = () => {
    return {
      PENDING: dashboardRequests.filter(isRequestPending).length,
      APPROVED: dashboardRequests.filter(isRequestApproved).length,
      REJECTED: dashboardRequests.filter(isRequestRejected).length,
    };
  };

  const filteredRequests = dashboardRequests.filter(r => {
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      (r.studentName || r.requesterName || r.visitorName || '').toLowerCase().includes(searchLow) ||
      (r.purpose || r.reason || '').toLowerCase().includes(searchLow) ||
      r.id?.toString().includes(searchQuery);

    let matchesTab = false;
    if (activeTab === 'PENDING') {
      matchesTab = isRequestPending(r);
    } else if (activeTab === 'APPROVED') {
      matchesTab = isRequestApproved(r);
    } else if (activeTab === 'REJECTED') {
      matchesTab = isRequestRejected(r);
    }
    return matchesSearch && matchesTab;
  });

  const handleApprove = async (id: number, remark: string = '') => {
    const req = requests.find(r => r.id === id) || selectedRequest;
    if (!req) return;

    // Immediately update local state so request moves to APPROVED tab
    setRequests(prev => prev.map(item => {
      if (item.id === id || item.id === req.id) {
        return {
          ...item,
          status: 'APPROVED',
          hodApproval: 'APPROVED',
          hodRemark: remark,
        };
      }
      return item;
    }));

    setShowDetailModal(false);
    setShowBulkModal(false);
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
        } else {
          showToastError('Failed', res.message);
        }
      } catch {
        showToastError('Error', 'An internal error occurred');
      } finally {
        loadData();
      }
    }, 'Authorizing...');
  };

  const handleReject = async (id: number, remark: string) => {
    const req = requests.find(r => r.id === id) || selectedRequest;
    if (!req) return;
    if (!remark.trim()) return showToastError('Required', 'Please provide a reason for rejection');

    // Immediately update local state so request moves to REJECTED tab
    setRequests(prev => prev.map(item => {
      if (item.id === id || item.id === req.id) {
        return {
          ...item,
          status: 'REJECTED',
          hodApproval: 'REJECTED',
          hodRemark: remark,
        };
      }
      return item;
    }));

    setShowDetailModal(false);
    setShowBulkModal(false);
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
        } else {
          showToastError('Failed', res.message);
        }
      } catch {
        showToastError('Error', 'An internal error occurred');
      } finally {
        loadData();
      }
    }, 'Authorizing...');
  };

  const hodName = (user as any)?.hodName || (user as any)?.name || 'HOD Member';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING,';
    if (hour < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-4 lg:space-y-4">
      {!isDesktop && <TopMenuBar
        greeting={getGreeting()}
        title={hodName.toUpperCase()}
      />}

      {isDesktop && (
        <DesktopPageHeader
          eyebrow={getGreeting().replace(',', '')}
          title="Dashboard"
          subtitle="Authorize department requests, bulk passes, and visitor clearances"
        />
      )}

      <div className="px-4 sm:px-5 lg:px-0 space-y-4">
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
            searchPlaceholder="Search by student, visitor, purpose, or request ID..."
          />
        )}

        {isDesktop && (
          <div className="grid grid-cols-3 gap-4">
            <DesktopStatCard label="Pending" value={getStats().PENDING} icon={Clock} tone="amber" active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} />
            <DesktopStatCard label="Approved" value={getStats().APPROVED} icon={CheckCircle2} tone="emerald" active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')} />
            <DesktopStatCard label="Rejected" value={getStats().REJECTED} icon={XCircle} tone="rose" active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')} />
          </div>
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
                      <th>REQUESTER</th>
                      <th>TYPE</th>
                      <th>PURPOSE</th>
                      <th>EXIT DATE</th>
                      <th className="!text-center">STATUS</th>
                      <th className="!text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const isBulk = request.passType === 'BULK';
                      const isVisitor = request.passType === 'VISITOR';
                      return (
                        <tr key={request.id} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35">
                          <td>
                            <p className="font-bold text-slate-950 dark:text-white">{request.studentName || 'Unknown'}</p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {isBulk
                                ? `${request.requestedByStaffName || 'Staff'}${request.requestedByStaffCode ? ` • ID: ${request.requestedByStaffCode}` : ''}`
                                : isVisitor
                                ? `${request.visitorPhone || 'Guest'} • ${request.department || 'Department'}`
                                : `${request.regNo ? `${request.regNo}` : 'N/A'} • ${request.department || 'Dept'}`}
                            </p>
                          </td>
                          <td className="font-semibold">{isBulk ? 'Bulk Student Pass' : isVisitor ? (request.role || 'Visitor') : 'Single Gate Pass'}</td>
                          <td className="max-w-[320px] truncate">{request.purpose || request.reason || 'General'}</td>
                          <td className="font-medium text-slate-700 dark:text-slate-300">{formatDateShort(request.exitDateTime || request.requestDate || request.createdAt)}</td>
                          <td>
                            <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase',
                              (request.status === 'USED' || request.status === 'EXITED') ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700' :
                              (request.status === 'APPROVED' || request.status === 'APPROVED_BY_HOD') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                              request.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' :
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                            )}>
                              {(request.status === 'USED' || request.status === 'EXITED') ? request.status : (request.status === 'APPROVED' || request.status === 'APPROVED_BY_HOD') ? 'APPROVED' : (request.status === 'PENDING_HOD' || request.status === 'PENDING') ? 'PENDING' : request.status}
                            </span>
                          </td>
                          <td className="text-center py-5">
                            <div className="flex items-center justify-center">
                              <Button size="sm" variant="dark" onClick={() => { setSelectedRequest(request); if (isBulk) setShowBulkModal(true); else setShowDetailModal(true); }}>View</Button>
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
                           (request.status === 'USED' || request.status === 'EXITED') ? "bg-slate-500" :
                           (request.status === 'APPROVED' || request.status === 'APPROVED_BY_HOD') ? "bg-emerald-500" :
                           request.status === 'REJECTED' ? "bg-rose-500" : "bg-amber-500"
                         )} />
                         <span className={cn(
                           "text-[10px] font-black uppercase tracking-widest",
                           (request.status === 'USED' || request.status === 'EXITED') ? "text-slate-600 dark:text-slate-400" :
                           (request.status === 'APPROVED' || request.status === 'APPROVED_BY_HOD') ? "text-emerald-600" :
                           request.status === 'REJECTED' ? "text-rose-600" : "text-amber-600"
                         )}>
                           {(request.status === 'USED' || request.status === 'EXITED') ? request.status : (request.status === 'APPROVED' || request.status === 'APPROVED_BY_HOD') ? 'APPROVED' : (request.status === 'PENDING_HOD' || request.status === 'PENDING') ? 'PENDING' : request.status}
                         </span>
                      </div>
                      
                      <Button size="sm" variant="dark" onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); if (isBulk) setShowBulkModal(true); else setShowDetailModal(true); }}>View</Button>
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
            onApprove={(_req, remark) => handleApprove(selectedRequest.id, remark || '')}
            onReject={(_req, remark) => handleReject(selectedRequest.id, remark)}
            showActions={activeTab === 'PENDING'}
            processing={processing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
