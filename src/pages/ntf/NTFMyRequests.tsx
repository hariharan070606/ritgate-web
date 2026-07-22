import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Search, FileText, Clock, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getNTFOwnRequests, getGatePassQRCode } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import type { GatePassRequest } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';
import { EMPTY_COPY } from '../../config/nativeCopy';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import EmptyState from '../../components/ui/EmptyState';

export default function NTFMyRequests() {
  usePageTitle('My Requests');
  const { isDesktop } = useAdaptive();
  const { getUserId, user } = useAuth();
  const { error: showError } = useToast();
  const staffCode = getUserId();
  const staffName = (user as any)?.staffName || (user as any)?.name || 'Staff';
  const initials = staffName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const [requests, setRequests] = useState<GatePassRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<GatePassRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getNTFOwnRequests(staffCode);
      if (res.success) {
        const sorted = (res.requests || [])
          .sort(
            (a: any, b: any) => new Date(b.createdAt || b.requestDate).getTime() - new Date(a.createdAt || a.requestDate).getTime()
          );
        setRequests(sorted);
      } else setHasError(true);
    } catch { setHasError(true); }
    finally { setIsLoading(false); }
  }, [staffCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = requests.filter(r =>
    searchQuery === '' ||
    (r.purpose || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.id || '').includes(searchQuery)
  );

  const handleViewQR = async (req: GatePassRequest) => {
    if (req.status !== 'APPROVED') return;
    setSelectedRequest(req);
    setShowQRModal(true);
    try {
      const res = await getGatePassQRCode(req.id!, staffCode);
      if (res.success && res.qrCode) {
        setQrData({ code: res.qrCode, manual: res.manualCode, expires: res.qrExpiresAt });
      } else {
        setShowQRModal(false);
        showError('Access Blocked', res.message || 'QR not ready.');
      }
    } catch {
      setShowQRModal(false);
      showError('Error', 'Network error while fetching QR');
    }
  };

  if (isLoading && requests.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SkeletonList count={4} />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center"><AlertCircle className="w-8 h-8 text-rose-500" /></div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Sync Failed</h3>
        <Button onClick={fetchData} variant="secondary" size="sm">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      {isDesktop && (
        <DesktopPageHeader
          eyebrow="My Requests"
          title="My Requests"
          subtitle="Track your non-teaching faculty gate pass requests"
          action={<Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}>Refresh</Button>}
        />
      )}

      <div className="flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-base shrink-0">{initials}</div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none">MY REQUESTS</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{staffName}</h2>
            <p className="text-xs text-slate-400">NTF - {(user as any)?.department || 'Department'}</p>
          </div>
        </div>
        <button onClick={fetchData} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <RefreshCw className={cn('w-4 h-4 text-slate-500', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Search */}
      {isDesktop ? (
        <DesktopToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search your requests by purpose, reason, or ID..."
        />
      ) : (
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search your requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300" />
      </div>
      )}

      {/* Request List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState title={EMPTY_COPY.noRequestsFound} description={EMPTY_COPY.requestsWillAppear} icon={<FileText className="w-8 h-8" />} />
        ) : isDesktop ? (
          <section className="desktop-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th className="!text-center">Status</th>
                    <th className="!text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req, i) => {
                    const dateStr = req.createdAt || req.requestDate || '';
                    const isApproved = req.status === 'APPROVED';
                    const isRejected = req.status === 'REJECTED';
                    return (
                      <tr key={req.id || i} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35" onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}>
                        <td>
                          <p className="font-bold text-slate-950 dark:text-white">{req.purpose || req.reason || 'Gate Pass Request'}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Request #{req.id || '-'}</p>
                        </td>
                        <td>Single Pass</td>
                        <td>{formatDateTime(dateStr)}</td>
                        <td>
                          <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase',
                            isApproved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' :
                            isRejected ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                          )}>{isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING'}</span>
                        </td>
                        <td className="text-center">
                          {isApproved ? (
                            <Button size="sm" variant="dark" onClick={(e) => { e.stopPropagation(); handleViewQR(req); }} icon={<QrCode className="w-4 h-4" />}>View QR</Button>
                          ) : (
                            <Button size="sm" variant="dark" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setShowDetailModal(true); }}>View</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((req, i) => {
              const dateStr = req.createdAt || req.requestDate || '';
              const isApproved = req.status === 'APPROVED';
              const isRejected = req.status === 'REJECTED';

              return (
                <motion.div key={req.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <Card hover onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">{initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{staffName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Single Pass</span>
                        </div>
                        <p className="text-xs text-slate-400">NTF - {(user as any)?.department || 'Department'}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{relativeTime(dateStr)}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{req.purpose || req.reason || 'Gate Pass Request'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500">{formatDateTime(dateStr)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full',
                        isApproved ? 'bg-emerald-500/10' : isRejected ? 'bg-rose-500/10' : 'bg-amber-500/10'
                      )}>
                        <div className={cn('w-1.5 h-1.5 rounded-full', isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500')} />
                        <span className={cn('text-[10px] font-black uppercase tracking-widest',
                          isApproved ? 'text-emerald-600' : isRejected ? 'text-rose-600' : 'text-amber-600'
                        )}>
                          {isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING'}
                        </span>
                      </div>
                      {isApproved && (
                        <button onClick={e => { e.stopPropagation(); handleViewQR(req); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-[11px] font-bold shadow-sm active:scale-95 transition-transform">
                          <QrCode className="w-3.5 h-3.5" /> VIEW QR
                        </button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedRequest && showDetailModal && (
          <SinglePassDetailsModal
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            request={selectedRequest}
          />
        )}

        {selectedRequest && showQRModal && (
          <GatePassQRModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            qrCodeData={qrData?.code || ''}
            personName={staffName}
            personId={staffCode}
            manualCode={qrData?.manual}
            validUntil={qrData?.expires}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
