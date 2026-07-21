import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Activity,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText
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
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import { relativeTime } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { EMPTY_COPY } from '../../config/nativeCopy';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import TopMenuBar from '../../components/common/TopMenuBar';

type TabType = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AdminDashboardProps {
  onNavigate?: (tag: string) => void;
  onLogout?: () => void;
}

export default function AdminDashboard({ onNavigate, onLogout }: AdminDashboardProps = {}) {
  usePageTitle('Dashboard');
  const { getUserId, user } = useAuth();
  const { isDesktop, isMobile } = useAdaptive();
  const { error: showError } = useToast();
  const adminId = getUserId();

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const openDetail = (req: any) => {
    setSelectedRequest({
      id: req.requestId || req.id,
      studentName: req.requesterName || req.name || 'Visitor',
      regNo: req.visitorPhone || req.phone || '',
      department: req.department || '',
      purpose: req.purpose || '',
      reason: req.purpose || '',
      requestDate: req.visitDate || req.createdAt,
      visitDate: req.visitDate,
      status: req.status,
      requestType: 'VISITOR',
      role: req.role || req.type || 'VISITOR',
      staffApproval: req.status,
    });
    setShowDetailModal(true);
  };

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
    <div className="min-h-screen lg:bg-transparent lg:min-h-0 bg-[#F8FAFC] dark:bg-slate-950">
      {isMobile && (
        <TopMenuBar
          greeting={greeting.toUpperCase()}
          title={adminName.toUpperCase()}
        />
      )}

      <div className="px-5 pt-4 space-y-4 pb-28 lg:px-0 lg:pt-0 lg:pb-0 lg:space-y-8">
      {/* 1. Greeting & User Info */}
      <div className="hidden lg:block" />

      {/* 2. Search & Filter */}
      {!isDesktop && (
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
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
      </div>
      )}

      {isDesktop && (
        <DesktopToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search visitor requests..."
        />
      )}

      {/* 3. Stats Cards */}
      {isDesktop ? (
        <div className="grid grid-cols-3 gap-4">
          <DesktopStatCard label="Pending" value={stats.pending} icon={Clock} tone="amber" active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} />
          <DesktopStatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="emerald" active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')} />
          <DesktopStatCard label="Rejected" value={stats.rejected} icon={XCircle} tone="rose" active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')} />
        </div>
      ) : (
        <div className="flex bg-white dark:bg-slate-900 rounded-[24px] p-2 shadow-sm border border-slate-50 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all lg:hidden">
          {(['PENDING', 'APPROVED', 'REJECTED'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const colors = { PENDING: 'text-amber-500', APPROVED: 'text-emerald-500', REJECTED: 'text-rose-500' };
            const borders = { PENDING: 'border-amber-500', APPROVED: 'border-emerald-500', REJECTED: 'border-rose-500' };
            const values = { PENDING: stats.pending, APPROVED: stats.approved, REJECTED: stats.rejected };

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 flex flex-col items-center py-2 transition-all border-b-2',
                  isActive ? borders[tab] : 'border-transparent',
                )}
              >
                <span className={cn('text-[10px] font-black uppercase tracking-widest mb-1', isActive ? colors[tab] : 'text-slate-400')}>
                  {tab}
                </span>
                <span className={cn('text-[18px] font-black', isActive ? 'text-slate-900 dark:text-white' : 'text-slate-300')}>
                  {values[tab]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Requests List */}
      {isDesktop ? (
        <section className="desktop-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white">Visitor Requests</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{activeTab.toLowerCase()} requests registered through the website</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{filtered.length} Requests</span>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title={EMPTY_COPY.noRequestsFound}
              description={searchQuery ? 'No requests matching your search.' : `No ${activeTab.toLowerCase()} visitor requests.`}
              icon={<FileText className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Purpose</th>
                    <th>Requested</th>
                    <th className="!text-center">Status</th>
                    <th className="!text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req, i) => (
                    <tr key={req.requestId || req.id || i} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35">
                      <td>
                        <p className="font-bold text-slate-950 dark:text-white">{req.requesterName || req.name || 'Visitor'}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{req.visitorPhone || req.email || 'Website visitor'}</p>
                      </td>
                      <td className="max-w-[360px] truncate">{req.purpose || 'Campus Visit'}</td>
                      <td>{relativeTime(req.createdAt)}</td>
                      <td><Badge status={req.status} size="sm" /></td>
                      <td className="text-center"><Button size="sm" variant="dark" onClick={() => openDetail(req)}>View</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
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
          <div className="flex min-h-[42vh] items-center justify-center">
            <EmptyState
              title={EMPTY_COPY.noRequestsFound}
              description={searchQuery ? "No requests matching your search." : `No ${activeTab.toLowerCase()} visitor requests.`}
              icon={<FileText className="w-12 h-12 text-slate-200" />}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((req, i) => (
                <motion.div key={req.requestId || req.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <Card
                    hover
                    onClick={() => openDetail(req)}
                    className="group active:scale-[0.99] transition-all border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer"
                  >
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
      )}
      </div>

      {selectedRequest && (
        <SinglePassDetailsModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          request={selectedRequest}
          showActions={false}
          viewerRole="admin"
        />
      )}
    </div>
  );
}
