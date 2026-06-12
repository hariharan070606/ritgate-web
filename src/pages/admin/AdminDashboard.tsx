import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  Activity, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Plus
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getVisitorRequestsForStaff } from '../../services/api.service';
import { formatDateTime, relativeTime } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { EMPTY_COPY } from '../../config/nativeCopy';

type TabType = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AdminDashboardProps {
  onNavigate?: (tag: string) => void;
  onLogout?: () => void;
}

export default function AdminDashboard({ onNavigate, onLogout }: AdminDashboardProps = {}) {
  usePageTitle('Dashboard');
  const { getUserId, user } = useAuth();
  const { error: showError } = useToast();
  const adminId = getUserId();

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  const adminName = (user as any)?.staffName || (user as any)?.name || 'Admin Officer';

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getVisitorRequestsForStaff(adminId);
      if (res.success) {
        const all = res.requests || [];
        const websiteOnly = all.filter((r: any) => {
          const rb = (r.registeredBy || r.registered_by || '').toString();
          return rb === 'WEBSITE' || rb.toUpperCase().startsWith('WEB-');
        });
        setRequests(websiteOnly);
      } else {
        setHasError(true);
      }
    } catch (err) {
      console.error('Admin requests error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [adminId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = requests.filter(r => {
    const matchesTab = r.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (r.requesterName || r.name || '').toLowerCase().includes(q) ||
      (r.purpose || '').toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const stats = {
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';

  if (isLoading && requests.length === 0) {
    return (
      <div className="space-y-8 animate-pulse text-left">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
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
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Unable to fetch visitor requests</p>
        </div>
        <Button onClick={fetchRequests} variant="secondary" size="sm" className="rounded-xl px-6">Retry Sync</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Greeting & User Info */}
      <div className="text-left px-1">
        <p className="text-[14px] font-semibold text-slate-400 leading-none">{greeting}</p>
        <h2 className="text-[28px] font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight uppercase">
          {adminName}
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-primary)] bg-blue-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100 dark:border-indigo-900/30">
            <ShieldCheck className="w-3 h-3" />
            ADMINISTRATIVE OFFICER
          </div>
        </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">PENDING</p>
              <p className="text-3xl font-black text-amber-700 dark:text-amber-500 tabular-nums">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">APPROVED</p>
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-500 tabular-nums">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-2">REJECTED</p>
              <p className="text-3xl font-black text-rose-700 dark:text-rose-500 tabular-nums">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filter */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="SEARCH VISITOR REQUESTS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            className="w-full pl-11 pr-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-bold focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300 uppercase tracking-widest transition-all outline-none"
          />
        </div>

        <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl w-full border border-slate-200 dark:border-slate-800">
          {(['PENDING', 'APPROVED', 'REJECTED'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-white dark:bg-slate-800 text-[var(--color-primary)] shadow-sm border border-slate-100 dark:border-slate-700" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Visitor Requests</h3>
          </div>
          {filtered.length > 0 && (
            <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tabular-nums tracking-widest">
              {filtered.length} REQUESTS
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState 
            title={EMPTY_COPY.noRequestsFound} 
            description={searchQuery ? "No requests matching your search." : `No ${activeTab.toLowerCase()} visitor requests.`}
            icon={<FileText className="w-12 h-12 text-slate-200" />} 
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((req, i) => (
                <motion.div key={req.requestId || req.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <Card hover className="group active:scale-[0.99] transition-all border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-100 dark:border-slate-700 text-sm uppercase">
                          {(req.requesterName || req.name || 'V').substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none truncate">
                            {req.requesterName || req.name || 'Visitor'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                              {req.purpose || 'Campus Visit'}
                            </span>
                            <span className="text-slate-200">-</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {relativeTime(req.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge status={req.status} size="sm" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
