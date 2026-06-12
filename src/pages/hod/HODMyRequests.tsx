import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileText, 
  Calendar, 
  Users, 
  QrCode, 
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../services/api.service';
import PageHeader from '../../components/common/PageHeader';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import SinglePassDetailsModal from '../../components/common/SinglePassDetailsModal';
import MyRequestsBulkModal from '../../components/common/MyRequestsBulkModal';
import { cn } from '../../utils/cn';
import { formatDateTimeShort, getRelativeTime, isToday } from '../../utils/dateUtils';

export default function HODMyRequests() {
  usePageTitle('My Requests');
  const { user, logout, getUserId } = useAuth();
  const { refreshCount } = useRefresh();
  const { error: showToastError } = useToast();
  const navigate = useNavigate();
  const hodCode = getUserId();

  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; manual: string | null; expires: string | null } | null>(null);

  useEffect(() => {
    loadData();
  }, [refreshCount]);

  const loadData = async () => {
    if (!hodCode) return;
    try {
      const res = await apiService.getHODMyGatePassRequests(hodCode);
      if (res.success) {
        const list = res.requests || [];
        // Same logic as mobile: filter out used and not today
        const filtered = list.filter((r: any) => {
            const isUsed = r.qrUsed === true || r.status === 'USED' || r.status === 'EXITED';
            return !isUsed && isToday(r.createdAt || r.requestDate);
        });
        const sorted = filtered.sort((a: any, b: any) => new Date(b.createdAt || b.requestDate).getTime() - new Date(a.createdAt || a.requestDate).getTime());
        setRequests(sorted);
      }
    } catch (err) {
      console.error('Failed to load my requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = searchQuery === '' || 
      r.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id?.toString().includes(searchQuery);
    return matchesSearch;
  });

  const handleViewQR = async (request: any) => {
    if (request.status !== 'APPROVED') return;
    setSelectedRequest(request);
    setShowQRModal(true);
    try {
      if (request.passType === 'BULK' && request.qrCode) {
         setQrData({ code: request.qrCode, manual: request.manualCode || null, expires: request.qrExpiresAt || null });
      } else {
        const res = await apiService.getHODGatePassQRCode(request.id, hodCode);
        if (res.success) {
          setQrData({ code: res.qrCode || '', manual: res.manualCode || null, expires: (res as any).qrExpiresAt || null });
        } else {
          showToastError('QR Error', res.message || 'Could not fetch QR code');
          setShowQRModal(false);
        }
      }
    } catch {
      showToastError('Error', 'Network error');
      setShowQRModal(false);
    }
  };

  const hodName = (user as any)?.hodName || (user as any)?.name || 'HOD Member';
  const initials = hodName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      {/* Header */}
      <PageHeader title="My Requests" />

      <div className="px-5 pt-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Search your requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[20px] text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none"
          />
        </div>
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-4 pb-28">
          {loading ? (
            <SkeletonList count={4} />
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const isBulk = request.passType === 'BULK';
                const isApproved = request.status === 'APPROVED';
                const isRejected = request.status === 'REJECTED';
                
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
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 font-black text-[18px]">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight">{hodName}</h5>
                           <div className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {isBulk ? 'Bulk Pass' : 'Single Pass'}
                              </span>
                           </div>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-tight">
                          HOD • {(user as any)?.department || 'Dept'}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                        {getRelativeTime(request.createdAt || request.requestDate)}
                      </span>
                    </div>

                    {/* Info Box */}
                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 space-y-2.5 mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white truncate">
                          {request.purpose || request.reason || 'Gate Pass Request'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {formatDateTimeShort(request.createdAt || request.requestDate)}
                        </span>
                      </div>
                      {isBulk && (
                        <div className="flex items-center gap-3">
                          <Users className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                          <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                            {request.participantCount || 0} Participants
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full",
                        isApproved ? "bg-emerald-500/10" : isRejected ? "bg-rose-500/10" : "bg-amber-500/10"
                      )}>
                         <div className={cn(
                           "w-1.5 h-1.5 rounded-full",
                           isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-amber-500"
                         )} />
                         <span className={cn(
                           "text-[10px] font-black uppercase tracking-widest",
                           isApproved ? "text-emerald-600" : isRejected ? "text-rose-600" : "text-amber-600"
                         )}>
                           {isApproved ? 'ACTIVE' : isRejected ? 'REJECTED' : 'PENDING'}
                         </span>
                      </div>
                      
                      {isApproved && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewQR(request);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-600 rounded-xl text-white shadow-lg shadow-amber-100 dark:shadow-none active:scale-95 transition-transform"
                        >
                          <QrCode className="w-4 h-4 text-white" />
                          <span className="text-[11px] font-black uppercase tracking-widest">View QR</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <FileText className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">No requests found</h5>
              <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed italic">
                Any gate passes you create for yourself will appear here.
              </p>
            </div>
          )}
        </div>
      </TopRefreshControl>

      {/* Modals */}
      <AnimatePresence>
        {selectedRequest && showQRModal && (
          <GatePassQRModal 
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            qrCodeData={qrData?.code || ''}
            personName={hodName}
            personId={hodCode}
            manualCode={qrData?.manual}
            qrExpiresAt={qrData?.expires}
          />
        )}

        {selectedRequest && showDetailModal && (
          <SinglePassDetailsModal 
            isOpen={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            request={selectedRequest}
            viewerRole="hod"
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
              name: hodName,
              role: 'HOD',
              department: (user as any)?.department || ''
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
