import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Maximize2,
  FileIcon,
  Loader2,
  ChevronRight,
  Check,
  X,
  Clock,
  QrCode
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { isPdfAttachment } from '../../utils/attachmentUtils';
import { formatDate } from '../../utils/date';
import Button from '../ui/Button';
import ConfirmationModal from './ConfirmationModal';
import GatePassQRModal from './GatePassQRModal';
import Badge from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getGatePassQRCode } from '../../services/api.service';

interface TimelineStep {
  label: string;
  status: 'done' | 'rejected' | 'pending';
  remark?: string;
}

interface SinglePassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onApprove?: (id: number, remark: string) => void;
  onReject?: (id: number, remark: string) => void;
  showActions?: boolean;
  onViewQR?: (request: any) => void;
  timelineSteps?: TimelineStep[];
  viewerRole?: string;
  processing?: boolean;
}

export default function SinglePassDetailsModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  showActions = false,
  onViewQR,
  timelineSteps,
  viewerRole,
  processing: externalProcessing,
}: SinglePassDetailsModalProps) {
  const { getUserId } = useAuth();
  const [remark, setRemark] = useState('');
  const [processing, setProcessing] = useState(false);
  const isProcessing = externalProcessing ?? processing;
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRemarkError, setShowRemarkError] = useState(false);

  // Internal QR state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    if (isOpen && request?.id) {
      setRemark('');
      setQrData(null);
      setQrError('');
    }
  }, [isOpen, request?.id]);

  const handleViewQR = async () => {
    if (onViewQR) { onClose(); onViewQR(request); return; }
    setQrLoading(true);
    setQrError('');
    try {
      // Use the requester's own ID — the API only authorises the pass owner
      const requesterId =
        request.regNo ||
        request.staffCode ||
        request.hodCode ||
        request.hrCode ||
        request.requestedByStaffCode ||
        getUserId();
      const res = await getGatePassQRCode(request.id, requesterId);
      if (res.success && res.qrCode) {
        setQrData({ code: res.qrCode, manual: res.manualCode, expires: res.qrExpiresAt });
        setShowQRModal(true);
      } else {
        setQrError(res.message || 'QR not available yet.');
      }
    } catch {
      setQrError('Network error. Please try again.');
    } finally {
      setQrLoading(false);
    }
  };

  if (!request || !isOpen) return null;

  const status = (request.hrApproval || request.status || 'PENDING').toUpperCase();
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'APPROVED': return 'text-emerald-500 bg-emerald-500';
      case 'REJECTED': return 'text-rose-500 bg-rose-500';
      default: return 'text-amber-500 bg-amber-500';
    }
  };

  const statusColorClass = getStatusColor(status);
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  const attachmentUri = request.attachmentUri || request.fileUrl;
  const isPdf = isPdfAttachment(attachmentUri);

  const getInitials = (name: string) =>
    (name || 'ST').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[130] bg-[#F8FAFC] dark:bg-slate-950 flex flex-col pt-safe"
      >
        {/* Header */}
        <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 h-16 flex items-center gap-3 z-20">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg font-extrabold text-slate-900 dark:text-white">
            {!showActions ? 'Request Details' : 'Pass Verification'}
          </h1>
          <Badge 
            className={cn("uppercase tracking-widest text-[10px] py-1 px-3 border-none text-white", statusColorClass.split(' ')[1])}
          >
            {status}
          </Badge>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 pt-8 space-y-4">
            {/* Profile Row */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg",
                statusColorClass.split(' ')[1]
              )}>
                {getInitials(request.studentName || request.staffName || request.regNo || 'ST')}
              </div>
              <div className="flex-1 min-w-0">
                {request.requestType === 'VISITOR' && (
                  <div className="bg-[var(--color-primary)] inline-block px-2 py-0.5 rounded-md mb-1">
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">
                      {(request.role || 'VISITOR')}
                    </span>
                  </div>
                )}
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {request.studentName || request.staffName || request.regNo}
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate uppercase tracking-tighter">
                   {request.regNo || request.staffCode} • {request.department || 'N/A'}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 grid grid-cols-2 shadow-sm">
              <div className="p-4 border-r border-slate-50 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                  {request.requestType === 'VISITOR' ? 'PURPOSE OF VISIT' : 'PURPOSE'}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {request.purpose || 'General'}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                  {request.requestType === 'VISITOR' ? 'ENTRY DATE' : 'DATE'}
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {formatDate(request.visitDate || request.exitDateTime || request.requestDate)}
                </p>
              </div>
            </div>

            {/* Reason */}
            {request.requestType !== 'VISITOR' && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 leading-none">REASON</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {request.reason || 'No reason provided.'}
                </p>
              </div>
            )}

            {/* Attachment Preview */}
            {attachmentUri && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-none">PREVIEW</p>
                <div 
                  className="relative w-40 h-24 bg-slate-900 rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => isPdf ? window.open(attachmentUri, '_blank') : setIsFullScreen(true)}
                >
                  {isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-800">
                      <FileIcon className="w-8 h-8 text-white" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Open PDF</span>
                    </div>
                  ) : (
                    <>
                      <img src={attachmentUri} alt="Pass Attachment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Remarks */}
            {(request.staffRemark || request.hodRemark || request.hrRemark) && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">REMARKS</p>
                {request.staffRemark && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-3 rounded-r-xl">
                    <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Staff</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">"{request.staffRemark}"</p>
                  </div>
                )}
                {request.hodRemark && (
                  <div className="bg-blue-50 dark:bg-indigo-900/10 border-l-4 border-blue-700 p-3 rounded-r-xl">
                    <p className="text-[10px] font-black text-[var(--color-primary)] uppercase mb-1">HOD</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">"{request.hodRemark}"</p>
                  </div>
                )}
                {request.hrRemark && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-500 p-3 rounded-r-xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">HR</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">"{request.hrRemark}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Approval Timeline */}
            {!showActions && timelineSteps && timelineSteps.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">APPROVAL TIMELINE</p>
                <div className="space-y-0">
                  {timelineSteps.map((step, idx) => {
                    const isDone = step.status === 'done';
                    const isRejected = step.status === 'rejected';
                    const isLast = idx === timelineSteps.length - 1;

                    return (
                      <div key={idx} className="relative">
                        {!isLast && (
                          <div className={cn(
                            "absolute left-[17px] top-8 w-[2px] h-full",
                            isDone ? "bg-emerald-500" : "bg-slate-100 dark:bg-slate-800"
                          )} />
                        )}
                        <div className="flex gap-4 items-start pb-8 last:pb-0">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10",
                            isDone ? "bg-emerald-500 text-white" : 
                            isRejected ? "bg-rose-500 text-white" : 
                            "bg-slate-100 dark:bg-slate-800"
                          )}>
                            {isDone ? <Check className="w-5 h-5" /> : 
                             isRejected ? <X className="w-5 h-5" /> : 
                             <div className="w-2.5 h-2.5 rounded-full bg-slate-300 transition-colors" />}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">
                              {step.label}
                            </h4>
                            <p className={cn(
                              "text-xs font-bold uppercase tracking-wide",
                              isDone ? "text-emerald-500" : isRejected ? "text-rose-500" : "text-slate-400"
                            )}>
                              {isDone ? '✓ Completed' : isRejected ? '✗ Rejected' : 'Pending'}
                            </p>
                            {step.remark && (
                              <div className="mt-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border-l-2 border-amber-500">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-0.5">Remark:</p>
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">{step.remark}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="h-24" />
          </div>
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 pb-safe z-30 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
          {showActions ? (
            <div className="space-y-3">
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Add review notes (required for rejection)..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
                rows={2}
                disabled={processing}
              />
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  fullWidth
                  size="xl"
                  icon={<XCircle className="w-5 h-5" />}
                  onClick={() => {
                    if (!remark.trim()) setShowRemarkError(true);
                    else setShowRejectConfirm(true);
                  }}
                  disabled={processing}
                >
                  Reject
                </Button>
                <Button
                  variant="success"
                  fullWidth
                  size="xl"
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  onClick={() => setShowApproveConfirm(true)}
                  isLoading={processing}
                  disabled={processing}
                >
                  Approve
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {qrError && (
                <p className="text-xs font-bold text-rose-500 text-center">{qrError}</p>
              )}
              <div className="flex gap-3">
                {isApproved ? (
                  <>
                    <Button
                      variant="primary"
                      fullWidth
                      size="xl"
                      onClick={onClose}
                    >
                      Close
                    </Button>
                    <Button
                      variant="success"
                      fullWidth
                      size="xl"
                      icon={qrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                      onClick={handleViewQR}
                      disabled={qrLoading}
                    >
                      {qrLoading ? 'Loading...' : 'View QR'}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    fullWidth
                    size="xl"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </footer>

        {/* Confirmations */}
        <ConfirmationModal
          visible={showRemarkError}
          title="Remark Required"
          message="Please add a reason for rejection in the review notes before rejecting."
          confirmText="OK"
          cancelText=""
          onConfirm={() => setShowRemarkError(false)}
          onCancel={() => setShowRemarkError(false)}
        />

        <ConfirmationModal
          visible={showApproveConfirm}
          title="Approve Request"
          message="Are you sure you want to approve this gate pass request?"
          confirmText="Approve"
          onConfirm={async () => {
            setShowApproveConfirm(false);
            setProcessing(true);
            if (onApprove) await onApprove(request.id, remark);
            setProcessing(false);
            onClose();
          }}
          onCancel={() => setShowApproveConfirm(false)}
        />

        <ConfirmationModal
          visible={showRejectConfirm}
          title="Reject Request"
          message="Are you sure you want to reject this request?"
          confirmText="Reject"
          confirmColor="bg-rose-500 hover:bg-rose-600"
          onConfirm={async () => {
            setShowRejectConfirm(false);
            setProcessing(true);
            if (onReject) await onReject(request.id, remark);
            setProcessing(false);
            onClose();
          }}
          onCancel={() => setShowRejectConfirm(false)}
        />

        {/* Fullscreen Preview */}
        <AnimatePresence>
          {isFullScreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 pt-safe"
              onClick={() => setIsFullScreen(false)}
            >
              <button 
                className="absolute top-10 right-6 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={attachmentUri} 
                alt="Fullscreen Attachment" 
                className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Internal QR Modal */}
        {qrData && (
          <GatePassQRModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            qrCodeData={qrData.code}
            personName={request.studentName || request.staffName || request.regNo || ''}
            personId={request.regNo || request.staffCode || ''}
            manualCode={qrData.manual}
            validUntil={qrData.expires}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
