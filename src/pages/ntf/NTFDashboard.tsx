import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, FileText, Users, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getVisitorRequestsForStaff, approveVisitorRequest, rejectVisitorRequest
} from '../../services/api.service';
import { usePageTitle } from '../../hooks/usePageTitle';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { relativeTime } from '../../utils/dateUtils';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

const getInitials = (name: string) => (name || 'NF').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function NTFDashboard() {
  usePageTitle('Dashboard');
  const { getUserId, user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const staffId = getUserId();
  const staffName = (user as any)?.staffName || (user as any)?.name || 'NTF Staff';

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getVisitorRequestsForStaff(staffId);
      if (res.success) {
        const all = res.requests || [];
        const websiteOnly = all.filter((r: any) => {
          const rb = (r.registeredBy || r.registered_by || '').toString();
          return rb === 'WEBSITE' || rb.toUpperCase().startsWith('WEB-');
        });
        setRequests(websiteOnly);
      } else setHasError(true);
    } catch { setHasError(true); }
    finally { setIsLoading(false); }
  }, [staffId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  const filtered = requests.filter(r => {
    const matchTab = r.status === activeTab;
    if (!matchTab) return false;
    const q = searchQuery.toLowerCase();
    return !q || 
      (r.requesterName || r.name || '').toLowerCase().includes(q) || 
      (r.purpose || '').toLowerCase().includes(q);
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const handleApprove = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    setRequests(prev => prev.filter(r => (r.requestId || r.id) !== id));
    try {
      const res = await approveVisitorRequest(id, staffId);
      if (res.success) showSuccess('Approved', 'Visitor approved.');
      else { fetchData(); showError('Failed', res.message || 'Failed to approve.'); }
    } catch (e: any) { fetchData(); showError('Error', e.message || 'Error.'); }
    finally { setProcessing(null); }
  };

  const handleReject = async (req: any) => {
    const id = req.requestId || req.id;
    setProcessing(id);
    setRequests(prev => prev.filter(r => (r.requestId || r.id) !== id));
    try {
      const res = await rejectVisitorRequest(id, 'Rejected by staff');
      if (res.success) showSuccess('Rejected', 'Visitor rejected.');
      else { fetchData(); showError('Failed', res.message || 'Failed to reject.'); }
    } catch (e: any) { fetchData(); showError('Error', e.message || 'Error.'); }
    finally { setProcessing(null); }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';

  if (isLoading && requests.length === 0) {
    return (
      <div className="space-y-8 animate-pulse text-left">
        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-64" /></div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" />
        </div>
        <SkeletonList count={5} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-900 uppercase">Sync Failed</h3>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest text-center">Unable to fetch visitor requests</p>
        </div>
        <Button onClick={fetchData} variant="secondary" size="sm" className="rounded-xl px-6">Retry Sync</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="text-left px-1">
        <p className="text-[14px] font-semibold text-slate-400 leading-none">{greeting}</p>
        <h2 className="text-[28px] font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight uppercase">
          {staffName}
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
            <Users className="w-3 h-3" />
            NON-TEACHING FACULTY
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'PENDING', value: stats.pending, icon: Clock, color: 'amber' },
          { label: 'APPROVED', value: stats.approved, icon: CheckCircle, color: 'emerald' },
          { label: 'REJECTED', value: stats.rejected, icon: XCircle, color: 'rose' }
        ].map(stat => (
          <Card key={stat.label} onClick={() => setActiveTab(stat.label as Tab)} className={cn(
            "p-6 transition-all cursor-pointer",
            activeTab === stat.label ? `ring-2 ring-${stat.color}-500/20 bg-${stat.color}-50 dark:bg-${stat.color}-950/20` : "bg-white dark:bg-slate-900"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", `text-${stat.color}-600`)}>{stat.label}</p>
                <p className={cn("text-3xl font-black tabular-nums", `text-${stat.color}-700 dark:text-${stat.color}-500`)}>{stat.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${stat.color}-100 dark:bg-${stat.color}-900/30`)}>
                <stat.icon className={cn("w-6 h-6", `text-${stat.color}-600`)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10"><Search className="w-4 h-4" /></div>
        <input 
          type="text" 
          placeholder="SEARCH VISITOR REQUESTS..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          className="w-full pl-11 pr-4 h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-bold focus:ring-2 focus:ring-amber-500/10 placeholder:text-slate-300 uppercase tracking-widest transition-all outline-none"
        />
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Visitor Queue</h3>
          </div>
          <button onClick={fetchData} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline flex items-center gap-1">
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} /> Refresh
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState 
            title="Empty Queue" 
            description={searchQuery ? "No matches found." : `No ${activeTab.toLowerCase()} requests.`}
            icon={<Users className="w-12 h-12 text-slate-200" />} 
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((req, i) => {
                const id = req.requestId || req.id;
                const name = req.requesterName || req.name || 'Visitor';
                const isProcessing = processing === id;
                return (
                  <motion.div key={id} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                    <Card className="p-4 border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-100 dark:border-slate-700 text-sm uppercase shrink-0">
                          {getInitials(name)}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate">{name}</p>
                            <Badge status={req.status} size="sm" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {req.purpose || 'Campus Visit'}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-2 uppercase tabular-nums">
                            {relativeTime(req.createdAt)} • {req.visitorPhone || 'No Phone'}
                          </p>
                          {req.status === 'PENDING' && (
                            <div className="flex gap-2 mt-4">
                              <Button variant="success" size="sm" fullWidth onClick={() => handleApprove(req)} disabled={isProcessing} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest">Approve</Button>
                              <Button variant="secondary" size="sm" fullWidth onClick={() => handleReject(req)} disabled={isProcessing} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest">Reject</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
