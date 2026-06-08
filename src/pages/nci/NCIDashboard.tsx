import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, FileText, Users, RefreshCw, QrCode } from 'lucide-react';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import QRCodeModal from '../../components/common/QRCodeModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getVisitorRequestsForStaff, approveVisitorRequest, rejectVisitorRequest,
  getNTFOwnRequests, getGatePassQRCode
} from '../../services/api.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

const relTime = (d: string) => { try { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; } catch { return ''; } };
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } };
const getInitials = (name: string) => (name || 'NF').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function NCIDashboard() {
  usePageTitle('Dashboard');
  const { getUserId, user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const staffCode = getUserId();
  const staffName = (user as any)?.staffName || (user as any)?.name || 'Staff';
  const initials = getInitials(staffName);

  const [visitorRequests, setVisitorRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getVisitorRequestsForStaff(staffCode);
      if (res.success) {
        // Only show website-registered visitors
        const websiteOnly = (res.requests || []).filter((r: any) => {
          const rb = (r.registeredBy || r.registered_by || '').toString();
          return rb === 'WEBSITE' || rb.toUpperCase().startsWith('WEB-');
        });
        setVisitorRequests(websiteOnly);
      } else setHasError(true);
    } catch { setHasError(true); }
    finally { setIsLoading(false); }
  }, [staffCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    pending: visitorRequests.filter(r => r.status === 'PENDING').length,
    approved: visitorRequests.filter(r => r.status === 'APPROVED').length,
    rejected: visitorRequests.filter(r => r.status === 'REJECTED').length,
  };

  const filtered = visitorRequests.filter(r => {
    const matchTab = activeTab === 'PENDING' ? r.status === 'PENDING' : activeTab === 'APPROVED' ? r.status === 'APPROVED' : r.status === 'REJECTED';
    if (!matchTab) return false;
    const q = searchQuery.toLowerCase();
    return !q || (r.requesterName || r.name || '').toLowerCase().includes(q) || (r.purpose || '').toLowerCase().includes(q) || (r.visitorEmail || '').toLowerCase().includes(q) || (r.visitorPhone || '').toLowerCase().includes(q);
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const handleApprove = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    setVisitorRequests(prev => prev.filter(r => (r.requestId || r.id) !== id));
    try {
      const res = await approveVisitorRequest(id, staffCode);
      if (res.success) showSuccess('Approved', 'Visitor approved.');
      else { fetchData(); showError('Failed', res.message || 'Failed to approve.'); }
    } catch (e: any) { fetchData(); showError('Error', e.message || 'Error.'); }
    finally { setProcessing(null); }
  };

  const handleReject = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    setVisitorRequests(prev => prev.filter(r => (r.requestId || r.id) !== id));
    try {
      const res = await rejectVisitorRequest(id, 'Rejected by staff');
      if (res.success) showSuccess('Rejected', 'Visitor rejected.');
      else { fetchData(); showError('Failed', res.message || 'Failed to reject.'); }
    } catch (e: any) { fetchData(); showError('Error', e.message || 'Error.'); }
    finally { setProcessing(null); }
  };

  if (isLoading && visitorRequests.length === 0) {
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
        <Button onClick={fetchData} variant="secondary" size="sm">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-base shrink-0">{initials}</div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none">
              {new Date().getHours() < 12 ? 'GOOD MORNING,' : new Date().getHours() < 17 ? 'GOOD AFTERNOON,' : 'GOOD EVENING,'}
            </p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight uppercase">{staffName}</h2>
          </div>
        </div>
        <button onClick={fetchData} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
          <RefreshCw className={cn('w-4 h-4 text-slate-500', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300" />
      </div>

      {/* Stats Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
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

      {/* Visitor Request List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Users className="w-12 h-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No {activeTab.toLowerCase()} visitor requests</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map(req => {
              const id = req.requestId || req.id;
              const name = req.requesterName || req.name || 'Visitor';
              const isPending = req.status === 'PENDING';
              const isProcessing = processing === id;
              const typeLabel = (req.role || req.type || 'Visitor').charAt(0).toUpperCase() + (req.role || req.type || 'Visitor').slice(1).toLowerCase();

              return (
                <motion.div key={id} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => { setSelectedRequest(req); setShowDetail(true); }}>
                    {/* Top row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">{getInitials(name)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{typeLabel}</span>
                        </div>
                        <p className="text-xs text-slate-400">{req.visitorEmail || req.email || ''}{req.visitorPhone ? ` • ${req.visitorPhone}` : ''}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{relTime(req.createdAt || '')}</span>
                    </div>

                    {/* Info box */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3 space-y-2">
                      {req.purpose && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{req.purpose}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">📅</span>
                        <span className="text-xs text-slate-500">
                          {req.visitDate ? `${req.visitDate}${req.visitTime ? ` at ${req.visitTime}` : ''}` : fmtDate(req.createdAt || '')}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', req.status === 'APPROVED' ? 'bg-emerald-500' : req.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500')} />
                        <span className={cn('text-xs font-bold uppercase', req.status === 'APPROVED' ? 'text-emerald-600' : req.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600')}>{req.status}</span>
                      </div>
                      {isPending && (
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); handleApprove(req); }} disabled={isProcessing}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold border border-emerald-100 disabled:opacity-50">Approve</button>
                          <button onClick={e => { e.stopPropagation(); handleReject(req); }} disabled={isProcessing}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold border border-rose-100 disabled:opacity-50">Reject</button>
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

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Visitor Request Details" size="md">
        {selectedRequest && (
          <div className="space-y-5 pt-2">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-white text-base">{getInitials(selectedRequest.requesterName || selectedRequest.name || 'VR')}</div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{selectedRequest.requesterName || selectedRequest.name || 'Visitor'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedRequest.visitorEmail || selectedRequest.email || ''}</p>
                {selectedRequest.visitorPhone && <p className="text-xs text-slate-400">{selectedRequest.visitorPhone}</p>}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
              {selectedRequest.purpose && <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Purpose</span><span className="text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.purpose}</span></div>}
              <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Visit Date</span><span className="text-sm text-slate-600 dark:text-slate-300">{selectedRequest.visitDate ? `${selectedRequest.visitDate}${selectedRequest.visitTime ? ` at ${selectedRequest.visitTime}` : ''}` : fmtDate(selectedRequest.createdAt || '')}</span></div>
              <div><span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</span><span className={cn('text-sm font-bold uppercase', selectedRequest.status === 'APPROVED' ? 'text-emerald-600' : selectedRequest.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600')}>{selectedRequest.status}</span></div>
            </div>
            {selectedRequest.status === 'PENDING' && (
              <div className="flex gap-3">
                <Button fullWidth variant="success" size="lg" onClick={() => { setShowDetail(false); handleApprove(selectedRequest); }} disabled={processing === (selectedRequest.requestId || selectedRequest.id)}>Approve</Button>
                <Button fullWidth variant="danger" size="lg" onClick={() => { setShowDetail(false); handleReject(selectedRequest); }} disabled={processing === (selectedRequest.requestId || selectedRequest.id)}>Reject</Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
