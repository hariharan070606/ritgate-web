import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Calendar, Clock, CheckCircle, XCircle, QrCode } from 'lucide-react';
import { SkeletonList } from '../../components/ui/Skeleton';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getNTFOwnRequests, getGatePassQRCode } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { formatDateTime, relativeTime, isToday } from '../../utils/dateUtils';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function NCIMyRequests() {
  usePageTitle('My Requests');
  const { getUserId, user } = useAuth();
  const { error: showError } = useToast();
  const staffCode = getUserId();
  const staffName = (user as any)?.staffName || (user as any)?.name || 'Staff';
  const initials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        const res = await getNTFOwnRequests(staffCode);
        if (res.success) {
          const sorted = (res.requests || [])
            .filter((r: any) => isToday(r.createdAt || r.requestDate))
            .sort(
              (a: any, b: any) => new Date(b.createdAt || b.requestDate).getTime() - new Date(a.createdAt || a.requestDate).getTime()
            );
          setRequests(sorted);
        }
      } catch (error) {
        console.error('Failed to fetch NCI requests:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, [staffCode]);

  const handleViewQR = async (request: any) => {
    if (request.status !== 'APPROVED') return;
    setSelectedRequest(request);
    setShowQRModal(true);
    try {
      const res = await getGatePassQRCode(request.id, staffCode);
      if (res.success) {
        setQrData({ code: res.qrCode || '', manual: res.manualCode, expires: res.qrExpiresAt });
      } else {
        showError('QR Error', res.message || 'Could not fetch QR code');
        setShowQRModal(false);
      }
    } catch {
      showError('Error', 'Network error while fetching QR');
      setShowQRModal(false);
    }
  };

  const filtered = requests.filter(r => {
    const q = searchQuery.toLowerCase();
    return !q ||
      (r.purpose || '').toLowerCase().includes(q) ||
      (r.reason || '').toLowerCase().includes(q) ||
      String(r.id || '').includes(q);
  });

  if (isLoading) {
    return <div className="space-y-4 px-5 pt-4"><SkeletonList count={5} /></div>;
  }

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <div className="px-5 pt-4 space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Requests</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search your requests..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[20px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none"
          />
        </div>

        {/* List */}
        <div className="pb-28 space-y-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <FileText className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">No requests found</h5>
              <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed italic">
                Your past gate pass requests will appear here.
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map(request => {
                const isApproved = request.status === 'APPROVED';
                const isRejected = request.status === 'REJECTED';

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}
                    className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm active:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {/* Top row */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center text-teal-600 font-black text-[18px]">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight">{staffName}</h5>
                          <div className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Single Pass</span>
                          </div>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tight">
                          NCI Staff
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                        {relativeTime(request.createdAt || request.requestDate)}
                      </span>
                    </div>

                    {/* Info box */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 space-y-2.5 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white truncate">
                          {request.purpose || request.reason || 'Gate Pass Request'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {formatDateTime(request.createdAt || request.requestDate)}
                        </span>
                      </div>
                      {request.reason && request.reason !== request.purpose && (
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2">
                            {request.reason}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full',
                        isApproved ? 'bg-emerald-500/10' : isRejected ? 'bg-rose-500/10' : 'bg-amber-500/10'
                      )}>
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'
                        )} />
                        <span className={cn(
                          'text-[10px] font-black uppercase tracking-widest',
                          isApproved ? 'text-emerald-600' : isRejected ? 'text-rose-600' : 'text-amber-600'
                        )}>
                          {isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'PENDING'}
                        </span>
                      </div>

                      {isApproved && (
                        <button
                          onClick={e => { e.stopPropagation(); handleViewQR(request); }}
                          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] rounded-xl text-white shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-transform"
                        >
                          <QrCode className="w-4 h-4" />
                          <span className="text-[11px] font-black uppercase tracking-widest">View QR</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Detail Modal — full request info like staff */}
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
