import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Search, AlertCircle, FileText, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import RequestTimeline from '../../components/common/RequestTimeline';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import TopMenuBar from '../../components/common/TopMenuBar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getHRAllRequests,
  getHRVisitorRequests,
  approveGatePassByHR,
  rejectGatePassByHR,
  approveVisitorByHR,
  rejectVisitorByHR,
} from '../../services/api.service';
import { useActionLock } from '../../context/ActionLockContext';
import { isToday } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { useAdaptive } from '../../utils/useAdaptive';
import type { GatePassRequest } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import EmptyState from '../../components/ui/EmptyState';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } };
const relTime = (d: string) => { try { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; } catch { return ''; } };

interface HRDashboardProps {
  onNavigate?: (tag: string) => void;
}

export default function HRDashboard({ onNavigate }: HRDashboardProps = {}) {
  usePageTitle('Dashboard');
  const { getUserId, user, logout } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { withLock } = useActionLock();
  const { isMobile, isDesktop } = useAdaptive();
  const hrCode = getUserId();
  const hrName = (user as any)?.hrName || (user as any)?.name || 'HR Executive';
  const initials = hrName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING,' : hour < 17 ? 'GOOD AFTERNOON,' : 'GOOD EVENING,';

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showBulkDetail, setShowBulkDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [processing, setProcessing] = useState(false);
  const actionInFlight = useRef(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [gpRes, visitorRequests] = await Promise.all([
        getHRAllRequests(hrCode),
        getHRVisitorRequests(hrCode),
      ]);
      if (gpRes.success) {
        const gpList = gpRes.requests || [];
        const vList = (visitorRequests || []).map((v: any) => ({
          ...v,
          id: `VISITOR-${v.id}`,
          passType: 'VISITOR',
          requestType: 'VISITOR',
          studentName: v.visitorName || v.name,
          reason: v.purpose,
        }));
        const combined = [...gpList, ...vList];
        setRequests(combined.filter((r: any) => isToday(r.requestDate || r.createdAt || r.exitDateTime || '')));
      } else setHasError(true);
    } catch { setHasError(true); }
    finally { setIsLoading(false); }
  }, [hrCode]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const stats = {
    pending: requests.filter(r => r.hrApproval === 'PENDING_HR' || r.status === 'PENDING_HR' || (r.passType === 'VISITOR' && r.status === 'PENDING')).length,
    approved: requests.filter(r => r.hrApproval === 'APPROVED' || (r.passType === 'VISITOR' && r.status === 'APPROVED')).length,
    rejected: requests.filter(r => r.hrApproval === 'REJECTED' || (r.passType === 'VISITOR' && r.status === 'REJECTED')).length,
  };

  const filtered = requests.filter(r => {
    const matchSearch = searchQuery === '' ||
      (r.purpose || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.hodCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.id || '').includes(searchQuery);
    const s = r.passType === 'VISITOR' ? r.status : (r.hrApproval || r.status);
    let matchTab = false;
    if (activeTab === 'PENDING') matchTab = s === 'PENDING_HR' || s === 'PENDING';
    else if (activeTab === 'APPROVED') matchTab = s === 'APPROVED';
    else if (activeTab === 'REJECTED') matchTab = s === 'REJECTED';
    return matchSearch && matchTab;
  });

  const toNumericId = (req: any) =>
    typeof req.id === 'string' && req.id.startsWith('VISITOR-')
      ? parseInt(req.id.replace('VISITOR-', ''), 10)
      : req.id;

  const handleApprove = async (req: any) => {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setProcessing(true);
    try {
      const numericId = toNumericId(req);
      const res = req.passType === 'VISITOR'
        ? await approveVisitorByHR(numericId, hrCode)
        : await approveGatePassByHR(hrCode, numericId);
      if (res.success) { showSuccess('Approved', 'Request approved successfully.'); setShowDetail(false); setShowBulkDetail(false); fetchRequests(); }
      else showError('Failed', res.message);
    } catch {
      showError('Error', 'An internal error occurred');
    } finally {
      setProcessing(false);
      actionInFlight.current = false;
    }
  };

  const handleReject = async (req: any) => {
    if (!rejectReason.trim()) { showError('Required', 'Please provide a reason'); return; }
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    setProcessing(true);
    try {
      const numericId = toNumericId(req);
      const res = req.passType === 'VISITOR'
        ? await rejectVisitorByHR(numericId, rejectReason.trim())
        : await rejectGatePassByHR(hrCode, numericId, rejectReason.trim());
      if (res.success) { showSuccess('Rejected', 'Request has been rejected.'); setShowReject(false); setShowDetail(false); setShowBulkDetail(false); setRejectReason(''); fetchRequests(); }
      else showError('Failed', res.message);
    } catch {
      showError('Error', 'An internal error occurred');
    } finally {
      setProcessing(false);
      actionInFlight.current = false;
    }
  };

  const getInitials = (name: string) => (name || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (isLoading && requests.length === 0) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-center gap-3"><Skeleton className="w-12 h-12 rounded-full" /><div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-40" /></div></div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <SkeletonList count={4} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center"><AlertCircle className="w-8 h-8 text-rose-500" /></div>
        <h3 className="text-base font-bold text-slate-900">Sync Failed</h3>
        <Button onClick={fetchRequests} variant="secondary" size="sm">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Mobile header with notification bell */}
      {isMobile && (
        <TopMenuBar
          greeting={greeting}
          title={hrName.toUpperCase()}
        />
      )}

      {isDesktop && (
        <DesktopPageHeader
          eyebrow={greeting.replace(',', '')}
          title="Dashboard"
          subtitle="Review today's gate pass approvals and visitor clearances"
        />
      )}

      {isDesktop && (
        <div className="grid grid-cols-3 gap-4">
          <DesktopStatCard label="Pending" value={stats.pending} icon={Clock} tone="amber" active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} />
          <DesktopStatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="emerald" active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')} />
          <DesktopStatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="rose" active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')} />
        </div>
      )}

      {/* Search */}
      <div className="relative lg:hidden">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300" />
      </div>

      {isDesktop && (
        <DesktopToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by purpose, HOD code, requester, or ID..."
        />
      )}

      {/* Stats Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 lg:hidden">
        {(['PENDING', 'APPROVED', 'REJECTED'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={cn('flex-1 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors',
              activeTab === t ? t === 'PENDING' ? 'border-amber-500 text-amber-600' : t === 'APPROVED' ? 'border-emerald-500 text-emerald-600' : 'border-rose-500 text-rose-600' : 'border-transparent text-slate-400')}>
            <div>{t}</div>
            <div className={cn('text-xl font-bold mt-0.5', activeTab === t ? '' : 'text-slate-600 dark:text-white')}>
              {t === 'PENDING' ? stats.pending : t === 'APPROVED' ? stats.approved : stats.rejected}
            </div>
          </button>
        ))}
      </div>

      {/* Request List */}
      {isDesktop ? (
        <section className="desktop-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white">Approval Queue</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Today&apos;s {activeTab.toLowerCase()} requests</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{filtered.length} Requests</span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title={`No ${activeTab.toLowerCase()} requests`}
              description="Requests that need HR attention will appear here."
              icon={<FileText className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Exit Date</th>
                    <th className="!text-center">Status</th>
                    <th className="!text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(req => {
                    const isBulk = req.passType === 'BULK';
                    const isVisitor = req.passType === 'VISITOR';
                    const name = isBulk ? (req.requestedByStaffName || req.hodCode || 'Staff') : isVisitor ? (req.visitorName || req.studentName || 'Visitor') : (req.requestedByStaffName || req.studentName || req.regNo || `Request #${req.id}`);
                    const sub = isBulk ? `${req.userType || 'HOD'} - ${req.department || 'N/A'}` : isVisitor ? `${req.visitorPhone || ''} - ${req.department || 'Department'}` : `${req.requestedByStaffCode || req.regNo || 'N/A'} - ${req.department || 'Department'}`;
                    const statusVal = isVisitor ? req.status : (req.hrApproval || req.status);
                    const isPending = statusVal === 'PENDING_HR' || statusVal === 'PENDING';
                    return (
                      <tr key={`${req.passType}-${req.id}`} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35">
                        <td>
                          <p className="font-bold text-slate-950 dark:text-white">{name}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>
                        </td>
                        <td>{isBulk ? 'Bulk Gate Pass' : isVisitor ? 'Visitor Request' : 'Single Gate Pass'}</td>
                        <td className="max-w-[320px] truncate">{req.purpose || req.reason || 'General'}</td>
                        <td>{fmtDate(req.exitDateTime || req.requestDate || req.createdAt || '')}</td>
                        <td>
                          <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase',
                            statusVal === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                            statusVal === 'REJECTED' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                          )}>
                            {(statusVal === 'PENDING_HR' || statusVal === 'PENDING' || !statusVal) ? 'PENDING' : statusVal}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center gap-2">
                            {isPending && <Button size="sm" variant="success" onClick={() => handleApprove(req)} disabled={processing}>Approve</Button>}
                            <Button size="sm" variant="secondary" onClick={() => { setSelectedRequest(req); isBulk ? setShowBulkDetail(true) : setShowDetail(true); }}>View</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <FileText className="w-12 h-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No {activeTab.toLowerCase()} requests</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map(req => {
              const isBulk = req.passType === 'BULK';
              const isVisitor = req.passType === 'VISITOR';
              const name = isBulk ? (req.requestedByStaffName || req.hodCode || 'Staff') : isVisitor ? (req.visitorName || req.studentName || 'Visitor') : (req.requestedByStaffName || req.studentName || req.regNo || `Request #${req.id}`);
              const sub = isBulk ? `${req.userType || 'HOD'} • ${req.department || 'N/A'}` : isVisitor ? `${req.visitorPhone || ''} • ${req.department || 'Department'}` : `${req.requestedByStaffCode || req.regNo || 'N/A'} • ${req.department || 'Department'}`;
              const typeLabel = isBulk ? 'Bulk Gatepass' : isVisitor ? `${(req.role || 'VISITOR').toUpperCase()} Request` : 'Single Gatepass';
              const statusVal = isVisitor ? req.status : (req.hrApproval || req.status);
              const isPending = statusVal === 'PENDING_HR' || statusVal === 'PENDING';
              const dateStr = req.exitDateTime || req.requestDate || req.createdAt || '';

              return (
                <motion.div key={`${req.passType}-${req.id}`} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => { setSelectedRequest(req); isBulk ? setShowBulkDetail(true) : setShowDetail(true); }}>
                    {/* Top row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">{getInitials(name)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{typeLabel}</span>
                        </div>
                        <p className="text-xs text-slate-400">{sub}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{relTime(req.requestDate || req.createdAt || '')}</span>
                    </div>

                    {/* Info box */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{req.purpose || 'General'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">📅</span>
                        <span className="text-xs text-slate-500">Exit: {fmtDate(dateStr)}</span>
                      </div>
                      {isBulk && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-500">
                            {(() => { const total = req.participantCount || 0; const students = req.studentCount || 0; const staff = Math.max(0, total - students); const parts: string[] = []; if (staff > 0) parts.push(`Staff - ${staff}`); if (students > 0) parts.push(`Students - ${students}`); return parts.join(', ') || `${total} Participants`; })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', statusVal === 'APPROVED' ? 'bg-emerald-500' : statusVal === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500')} />
                        <span className={cn('text-xs font-bold uppercase', statusVal === 'APPROVED' ? 'text-emerald-600' : statusVal === 'REJECTED' ? 'text-rose-600' : 'text-amber-600')}>
                          {(statusVal === 'PENDING_HR' || statusVal === 'PENDING' || !statusVal) ? 'PENDING' : statusVal}
                        </span>
                      </div>
                      {isBulk && <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" />Bulk Gatepass</span>}
                      {isPending && (
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); setSelectedRequest(req); handleApprove(req); }} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold border border-emerald-100">Approve</button>
                          <button onClick={e => { e.stopPropagation(); setSelectedRequest(req); setShowReject(true); }} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold border border-rose-100">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      )}

      {/* Single Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Request Details" size="lg" presentation="page">
        {selectedRequest && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requester</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 uppercase">{selectedRequest.requestedByStaffName || selectedRequest.studentName || selectedRequest.regNo}</p>
                {selectedRequest.department && <p className="text-[10px] text-[var(--color-primary)] font-bold mt-1 uppercase">{selectedRequest.department}</p>}
              </div>
              <Badge status={selectedRequest.status} size="md" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
              <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Purpose</span><span className="text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.purpose}</span></div>
              <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reason</span><span className="text-sm text-slate-600 dark:text-slate-300">{selectedRequest.reason}</span></div>
              {selectedRequest.hodRemark && <div><span className="text-[10px] font-bold text-emerald-500 uppercase block mb-1">HOD Remark</span><span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">"{selectedRequest.hodRemark}"</span></div>}
            </div>
            <RequestTimeline request={selectedRequest} />
            {(selectedRequest.hrApproval === 'PENDING_HR' || selectedRequest.status === 'PENDING_HR' || (selectedRequest.passType === 'VISITOR' && selectedRequest.status === 'PENDING')) && (
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button fullWidth variant="success" size="lg" onClick={() => handleApprove(selectedRequest)} disabled={processing}>Approve Request</Button>
                <Button fullWidth variant="danger" size="lg" onClick={() => setShowReject(true)} disabled={processing}>Reject Request</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Bulk Detail Modal */}
      <Modal isOpen={showBulkDetail} onClose={() => setShowBulkDetail(false)} title="Bulk Student Pass Details" size="lg" presentation="page">
        {selectedRequest && (
          <div className="space-y-5 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-3">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Batch Purpose</p><p className="text-base font-bold text-slate-900 dark:text-white uppercase">{selectedRequest.purpose}</p></div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-[var(--color-primary)]" /><span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">{selectedRequest.participantCount || 0} Participants</span></div>
                <Badge status={selectedRequest.status} size="sm" />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4"><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reason</span><span className="text-sm text-slate-600 dark:text-slate-300">{selectedRequest.reason}</span></div>
            <RequestTimeline request={selectedRequest} />
            {(selectedRequest.hrApproval === 'PENDING_HR' || selectedRequest.status === 'PENDING_HR') && (
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button fullWidth variant="success" size="lg" onClick={() => handleApprove(selectedRequest)} disabled={processing}>Authorize Batch</Button>
                <Button fullWidth variant="danger" size="lg" onClick={() => setShowReject(true)} disabled={processing}>Deny Batch</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Reject Request" size="md">
        <div className="space-y-4 pt-2">
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (required)..." className="w-full min-h-[100px] px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-300" />
          <Button fullWidth variant="danger" size="lg" onClick={() => selectedRequest && handleReject(selectedRequest)} disabled={!rejectReason.trim() || processing}>Confirm Rejection</Button>
        </div>
      </Modal>
    </div>
  );
}
