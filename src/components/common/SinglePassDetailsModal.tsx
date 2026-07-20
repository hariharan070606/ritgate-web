import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  Maximize2,
  FileIcon,
  Loader2,
  ChevronRight,
  Check,
  X,
  Clock,
  QrCode,
  Target,
  CalendarDays,
  StickyNote,
  Paperclip,
  MessageSquare,
  ListChecks
} from 'lucide-react';
import SectionLabel from './SectionLabel';
import { cn } from '../../utils/cn';
import { isPdfAttachment } from '../../utils/attachmentUtils';
import { formatDate } from '../../utils/date';
import { formatDateTime } from '../../utils/dateUtils';
import { getStatusMeta, normalizeRequestStatus } from '../../utils/statusUtils';
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

  const status = normalizeRequestStatus(request);
  const statusMeta = getStatusMeta(request);
  const isApproved = status === 'APPROVED';
  const attachmentUri = request.attachmentUri || request.fileUrl;
  const isPdf = isPdfAttachment(attachmentUri);

  const getInitials = (name: string) =>
    (name || 'ST').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const getComputedTimeline = (): TimelineStep[] => {
    if (timelineSteps && timelineSteps.length > 0) return timelineSteps;

    const rawStatus = (request?.status || request?.approvalStatus || '').toUpperCase();

    const isStaffDone =
      rawStatus === 'APPROVED' ||
      rawStatus === 'PENDING_HOD' ||
      rawStatus === 'APPROVED_BY_HOD' ||
      rawStatus === 'USED' ||
      rawStatus === 'EXITED' ||
      request?.staffStatus === 'APPROVED';

    const isStaffRejected =
      rawStatus === 'REJECTED_BY_STAFF' ||
      (rawStatus === 'REJECTED' && !request?.staffStatus && !request?.hodStatus);

    const isHodDone =
      rawStatus === 'APPROVED' ||
      rawStatus === 'USED' ||
      rawStatus === 'EXITED' ||
      request?.hodStatus === 'APPROVED';

    const isHodRejected =
      rawStatus === 'REJECTED_BY_HOD' ||
      (rawStatus === 'REJECTED' && isStaffDone);

    const isGateUsed =
      rawStatus === 'USED' ||
      rawStatus === 'EXITED' ||
      rawStatus === 'SCANNED' ||
      rawStatus === 'ENTERED' ||
      Boolean(request?.isUsed) ||
      Boolean(request?.scannedAt) ||
      Boolean(request?.entryTime) ||
      Boolean(request?.scannedBy);

    const gateScanTime = request?.scannedAt || request?.entryTime || request?.exitTime || request?.usedAt;

    const gateRemark = isGateUsed
      ? `Gate Entry Verified by Security${gateScanTime ? ` (${formatDateTime(gateScanTime)})` : ''}`
      : (isHodDone || isApproved)
      ? 'QR Code ready — awaiting gate scan at campus entrance'
      : 'Awaiting prior authorizations';

    return [
      {
        label: 'Staff Authorization',
        status: isStaffDone ? 'done' : isStaffRejected ? 'rejected' : 'pending',
        remark: request?.staffRemark,
      },
      {
        label: 'HOD Authorization',
        status: isHodDone ? 'done' : isHodRejected ? 'rejected' : 'pending',
        remark: request?.hodRemark,
      },
      {
        label: 'Campus Gate Access',
        status: isGateUsed ? 'done' : 'pending',
        remark: gateRemark,
      },
    ];
  };

  const activeTimeline = getComputedTimeline();

  return createPortal(
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[130] bg-[#F8FAFC] dark:bg-slate-950 flex flex-col overflow-y-auto w-full min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 relative"
        >
          {/* Fixed Top Header Bar */}
          <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between z-30 shrink-0 shadow-sm">
            <div className="flex items-center gap-3.5 max-w-4xl mx-auto w-full justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {!showActions ? 'Request Details' : 'Pass Verification'}
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge status={status} className="scale-105" />
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Content Body Container */}
          <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
            {/* Student Info Card */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-md">
                {getInitials(request.studentName || request.requesterName || request.visitorName)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {request.studentName || request.requesterName || request.visitorName || 'Gate Pass Requester'}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {request.rollNo || request.regNo || request.id ? `${request.rollNo || request.regNo || `#${request.id}`}` : ''}
                  {(request.department || request.dept) ? ` • ${request.department || request.dept}` : ''}
                </p>
              </div>
            </div>

            {/* Purpose & Date Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <SectionLabel icon={Target} className="mb-1.5">PURPOSE</SectionLabel>
                <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {request.purpose || request.reason || 'Campus Gate Access'}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <SectionLabel icon={CalendarDays} className="mb-1.5">DATE & TIME</SectionLabel>
                <p className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {formatDateTime(request.requestDate || request.createdAt)}
                </p>
              </div>
            </div>

            {/* Reason Box */}
            {request.reason && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
                <SectionLabel icon={FileText} className="mb-1">REASON / NOTES</SectionLabel>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{request.reason}"
                  </p>
                </div>
              </div>
            )}

            {/* Attachment Preview */}
            {attachmentUri && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <SectionLabel icon={Paperclip} className="mb-1">ATTACHMENT PREVIEW</SectionLabel>
                {isPdf ? (
                  <a
                    href={attachmentUri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline"
                  >
                    <FileText className="w-6 h-6 shrink-0" />
                    <span>View PDF Attachment Document</span>
                  </a>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-72 bg-slate-950 flex items-center justify-center group">
                    <img 
                      src={attachmentUri} 
                      alt="Attachment Preview" 
                      className="max-h-72 w-auto object-contain transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Remarks Section if available */}
            {(request.staffRemark || request.hodRemark || request.hrRemark) && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <SectionLabel icon={StickyNote} className="mb-1">AUTHORIZATION REMARKS</SectionLabel>
                <div className="space-y-3">
                  {request.staffRemark && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-3.5 rounded-r-2xl">
                      <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase mb-1">Staff Note</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">"{request.staffRemark}"</p>
                    </div>
                  )}
                  {request.hodRemark && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 p-3.5 rounded-r-2xl">
                      <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase mb-1">HOD Note</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">"{request.hodRemark}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approval & Tracking Status Timeline */}
            {!showActions && activeTimeline && activeTimeline.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <SectionLabel icon={ListChecks} className="mb-2">APPROVAL & TRACKING STATUS</SectionLabel>
                <div className="space-y-0 pt-1">
                  {activeTimeline.map((step, idx) => {
                    const isDone = step.status === 'done';
                    const isRejected = step.status === 'rejected';
                    const isLast = idx === activeTimeline.length - 1;

                    return (
                      <div key={idx} className="relative">
                        {!isLast && (
                          <div className={cn(
                            "absolute left-[17px] top-9 w-[2px] h-[calc(100%-12px)] transition-colors",
                            isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                          )} />
                        )}
                        <div className="flex gap-4 items-start pb-6 last:pb-0">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 font-bold transition-all shadow-sm",
                            isDone ? "bg-emerald-500 text-white shadow-emerald-500/20" : 
                            isRejected ? "bg-rose-500 text-white shadow-rose-500/20" : 
                            "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                          )}>
                            {isDone ? <Check className="w-5 h-5 stroke-[2.5]" /> : 
                             isRejected ? <X className="w-5 h-5 stroke-[2.5]" /> : 
                             <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                {step.label}
                              </h4>
                              <span className={cn(
                                "text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider shrink-0",
                                isDone ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" : 
                                isRejected ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50" : 
                                "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                              )}>
                                {isDone ? '✓ Completed' : isRejected ? '✗ Rejected' : '● Pending'}
                              </span>
                            </div>
                            {step.remark && (
                              <div className="mt-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border-l-4 border-amber-500 max-w-xl">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-0.5">Note / Status:</p>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">"{step.remark}"</p>
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
          </div>

          {/* Fixed Footer Action Bar */}
          <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 sm:px-8 py-4 z-30 shrink-0 shadow-lg mt-auto">
            <div className="max-w-4xl mx-auto w-full flex items-center justify-end gap-3">
              {showActions ? (
                <div className="w-full flex flex-col space-y-3">
                  <div className="w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Review Notes / Remarks</label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Add optional notes or mandatory rejection reason..."
                      className="w-full h-20 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="danger"
                      size="xl"
                      className="lg:w-36"
                      icon={<XCircle className="w-5 h-5" />}
                      onClick={() => {
                        if (!remark.trim()) {
                          setShowRemarkError(true);
                          return;
                        }
                        setShowRejectConfirm(true);
                      }}
                      isLoading={processing}
                      disabled={processing}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      size="xl"
                      className="lg:w-36"
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
                <div className="flex gap-3 justify-end w-full sm:w-auto">
                  {isApproved ? (
                    <>
                      <Button
                        variant="primary"
                        size="xl"
                        className="w-full sm:w-36"
                        onClick={onClose}
                      >
                        Close
                      </Button>
                      <Button
                        variant="success"
                        size="xl"
                        className="w-full sm:w-44"
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
                      size="xl"
                      className="w-full sm:w-36"
                      onClick={onClose}
                    >
                      Close
                    </Button>
                  )}
                </div>
              )}
            </div>
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
              onClose();
              if (onApprove) await onApprove(request.id, remark);
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
              onClose();
              if (onReject) await onReject(request.id, remark);
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
      </div>
    </AnimatePresence>,
    document.body,
  );
}
