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
import { EMPTY_COPY } from '../../config/nativeCopy';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import DesktopSegmentedTabs from '../../components/desktop/DesktopSegmentedTabs';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

const getInitials = (name: string) => (name || 'NF').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function NTFDashboard() {
  usePageTitle('Dashboard');
  const { getUserId, user } = useAuth();
  const { isDesktop } = useAdaptive();
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
  const statCards = [
    {
      label: 'PENDING' as Tab,
      value: stats.pending,
      icon: Clock,
      card: 'ring-amber-500/20 bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-600',
      valueText: 'text-amber-700 dark:text-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconText: 'text-amber-600',
    },
    {
      label: 'APPROVED' as Tab,
      value: stats.approved,
      icon: CheckCircle,
      card: 'ring-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20',
      text: 'text-emerald-600',
      valueText: 'text-emerald-700 dark:text-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: 'text-emerald-600',
    },
    {
      label: 'REJECTED' as Tab,
      value: stats.rejected,
      icon: XCircle,
      card: 'ring-rose-500/20 bg-rose-50 dark:bg-rose-950/20',
      text: 'text-rose-600',
      valueText: 'text-rose-700 dark:text-rose-500',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconText: 'text-rose-600',
    },
  ];

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
      {isDesktop && (
        <DesktopPageHeader
          eyebrow={greeting.replace(',', '')}
          title="NTF Dashboard"
          subtitle="Manage visitor approvals and non-teaching faculty clearances"
        />
      )}

      {/* Header */}
      <div className="text-left px-1 lg:hidden">
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
      {isDesktop ? (
        <div className="grid grid-cols-3 gap-4">
          <DesktopStatCard label="Pending" value={stats.pending} icon={Clock} tone="amber" active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} />
          <DesktopStatCard label="Approved" value={stats.approved} icon={CheckCircle} tone="emerald" active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')} />
          <DesktopStatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="rose" active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')} />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(stat => (
          <Card key={stat.label} onClick={() => setActiveTab(stat.label as Tab)} className={cn(
            "p-6 transition-all cursor-pointer",
            activeTab === stat.label ? `ring-2 ${stat.card}` : "bg-white dark:bg-slate-900"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", stat.text)}>{stat.label}</p>
                <p className={cn("text-3xl font-black tabular-nums", stat.valueText)}>{stat.value}</p>
              </div>
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.iconBg)}>
                <stat.icon className={cn("w-6 h-6", stat.iconText)} />
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}

      {/* Search */}
      {isDesktop ? (
        <DesktopToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search visitor requests..."
        >
          <DesktopSegmentedTabs
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'PENDING', label: 'Pending', count: stats.pending },
              { value: 'APPROVED', label: 'Approved', count: stats.approved },
              { value: 'REJECTED', label: 'Rejected', count: stats.rejected },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}>Refresh</Button>
        </DesktopToolbar>
      ) : (
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
      )}

      {/* Requests List */}
      {isDesktop ? (
        <section className="desktop-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white">Visitor Queue</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Website visitor requests assigned to you</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{filtered.length} Requests</span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title={EMPTY_COPY.noRequestsFound}
              description={searchQuery ? 'No matches found.' : `No ${activeTab.toLowerCase()} requests.`}
              icon={<Users className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Purpose</th>
                    <th>Phone</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(req => {
                    const id = req.requestId || req.id;
                    const name = req.requesterName || req.name || 'Visitor';
                    const isProcessing = processing === id;
                    return (
                      <tr key={id} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35">
                        <td>
                          <p className="font-bold text-slate-950 dark:text-white">{name}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{req.email || req.visitorEmail || 'Website visitor'}</p>
                        </td>
                        <td className="max-w-[360px] truncate">{req.purpose || 'Campus Visit'}</td>
                        <td>{req.visitorPhone || 'No Phone'}</td>
                        <td>{relativeTime(req.createdAt)}</td>
                        <td><Badge status={req.status} size="sm" /></td>
                        <td className="text-right">
                          {req.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="success" size="sm" onClick={() => handleApprove(req)} disabled={isProcessing}>Approve</Button>
                              <Button variant="secondary" size="sm" onClick={() => handleReject(req)} disabled={isProcessing}>Reject</Button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">Reviewed</span>
                          )}
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
            title={EMPTY_COPY.noRequestsFound} 
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
                            {relativeTime(req.createdAt)} - {req.visitorPhone || 'No Phone'}
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
      )}
    </div>
  );
}
