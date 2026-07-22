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
import { resolveProfilePhoto } from '../../utils/profilePhoto';
import VisitorAvatar from './VisitorAvatar';
import ImageLightbox from './ImageLightbox';
import Button from '../ui/Button';
import ConfirmationModal from './ConfirmationModal';
import GatePassQRModal from './GatePassQRModal';
import Badge from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getGatePassQRCode, getProfilePhoto } from '../../services/api.service';

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
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRemarkError, setShowRemarkError] = useState(false);

  // Internal QR state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; manual: string | undefined; expires: string | undefined } | null>(null);
  const [qrError, setQrError] = useState('');
  const [fetchedPhoto, setFetchedPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen && request?.id) {
      setRemark('');
      setQrData(null);
      setQrError('');
      setFetchedPhoto(undefined);
    }
  }, [isOpen, request?.id]);

  useEffect(() => {
    if (!isOpen || !request) return;
    if (request.requestType === 'VISITOR' || request.passType === 'VISITOR') return;
    
    // If it's already resolved from payload, no need to fetch
    const preResolved = resolveProfilePhoto(request);
    if (preResolved) return;

    const code = request.regNo || request.staffCode || request.requestedByStaffCode;
    if (!code) return;

    let active = true;
    getProfilePhoto(String(code)).then(url => {
      if (active && url) {
        setFetchedPhoto(url);
      }
    });

    return () => { active = false; };
  }, [isOpen, request]);

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

  const requesterDisplayName =
    request.studentName || request.requesterName || request.visitorName || 'Gate Pass Requester';
  const requesterPhoto = resolveProfilePhoto(request) || fetchedPhoto;

  const isApproverRole = ['hod', 'hr', 'admin', 'security', 'ntf', 'nci'].includes((viewerRole || '').toLowerCase());
  const isOwner = !isApproverRole && (getUserId() === request.regNo || getUserId() === request.staffCode || getUserId() === request.requestedByStaffCode);
  
  const getComputedTimeline = (): TimelineStep[] => {
    if (timelineSteps && timelineSteps.length > 0) return timelineSteps;

    const cleanRemark = (r: unknown) => {
      if (!r) return undefined;
      const s = String(r).trim();
      const l = s.toLowerCase();
      if (['authorization granted', 'approved', 'authorized', 'n/a', 'na'].includes(l)) return undefined;
      return s;
    };

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
      rawStatus === 'APPROVED_BY_HOD' ||
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

    return [
      {
        label: 'Staff Authorization',
        status: isStaffDone ? 'done' : isStaffRejected ? 'rejected' : 'pending',
        remark: cleanRemark(request?.staffRemark),
      },
      {
        label: 'HOD Authorization',
        status: isHodDone ? 'done' : isHodRejected ? 'rejected' : 'pending',
        remark: cleanRemark(request?.hodRemark),
      },
      {
        label: 'Campus Gate Access',
        status: isGateUsed ? 'done' : 'pending',
        remark: undefined,
      },
    ];
  };

  const activeTimeline = getComputedTimeline();

  return createPortal(
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[130] bg-[#F8FAFC] dark:bg-slate-950 flex flex-col w-full h-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950 relative overflow-hidden"
        >
          {/* Fixed Top Header Bar */}
          <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 sm:px-10 lg:px-12 h-18 sm:h-22 flex items-center justify-between z-40 shrink-0 shadow-xs">
            <div className="flex items-center gap-4 max-w-5xl lg:max-w-6xl mx-auto w-full justify-between">
              <div className="flex items-center gap-3.5">
                <button 
                  onClick={onClose}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {!showActions ? 'Request Details' : 'Pass Verification'}
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge status={status} className="scale-110" />
              </div>
            </div>
          </header>

          {/* Content Body Container */}
          <div className="flex-1 overflow-y-auto w-full max-w-5xl lg:max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 py-8 lg:py-10 space-y-6 sm:space-y-8">
            {/* Student Info Card */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-9 rounded-[28px] lg:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-5 sm:gap-6">
              <button
                type="button"
                onClick={() => { if (requesterPhoto) setShowPhotoPreview(true); }}
                className={cn('shrink-0 rounded-full transition-transform', requesterPhoto ? 'cursor-zoom-in active:scale-95' : 'cursor-default')}
                aria-label="View photo"
              >
                <VisitorAvatar
                  name={requesterDisplayName}
                  photoUrl={requesterPhoto}
                  size="auto"
                  className="w-16 h-16 sm:w-20 sm:h-20 shadow-md ring-4 ring-slate-100 dark:ring-slate-800"
                  fallback={
                    <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-black text-xl sm:text-2xl">
                      {getInitials(requesterDisplayName)}
                    </div>
                  }
                />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {requesterDisplayName}
                </h3>
                <p className="text-xs sm:text-base font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {request.rollNo || request.regNo || request.id ? `${request.rollNo || request.regNo || `#${request.id}`}` : ''}
                  {(request.department || request.dept) ? ` • ${request.department || request.dept}` : ''}
                </p>
              </div>
            </div>

            {/* Purpose & Date Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <SectionLabel icon={Target} className="mb-2">PURPOSE</SectionLabel>
                <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                  {request.purpose || request.reason || 'Campus Gate Access'}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <SectionLabel icon={CalendarDays} className="mb-2">DATE & TIME</SectionLabel>
                <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                  {formatDateTime(request.requestDate || request.createdAt)}
                </p>
              </div>
            </div>

            {/* Reason Box */}
            {request.reason && (
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-9 rounded-[28px] lg:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <SectionLabel icon={FileText} className="mb-1">REASON / NOTES</SectionLabel>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <p className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{request.reason}"
                  </p>
                </div>
              </div>
            )}

            {/* Attachment Preview */}
            {attachmentUri && (
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-9 rounded-[28px] lg:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <SectionLabel icon={Paperclip}>ATTACHMENT PREVIEW</SectionLabel>
                  <a
                    href={attachmentUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Open Original</span>
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </div>
                {isPdf ? (
                  <a
                    href={attachmentUri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3.5 p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-sm sm:text-base hover:underline"
                  >
                    <FileText className="w-7 h-7 shrink-0" />
                    <span>View PDF Attachment Document</span>
                  </a>
                ) : (
                  <div 
                    onClick={() => setIsFullScreen(true)}
                    className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-96 bg-slate-950 flex items-center justify-center group cursor-pointer hover:border-blue-500/50 transition-all shadow-sm"
                  >
                    <img 
                      src={attachmentUri} 
                      alt="Attachment Preview" 
                      className="max-h-96 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-sm backdrop-blur-[2px]">
                      <Maximize2 className="w-5 h-5" />
                      <span>Click to View Fullscreen</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Remarks Section if available */}
            {(request.staffRemark || request.hodRemark || request.hrRemark) && (
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-9 rounded-[28px] lg:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <SectionLabel icon={StickyNote} className="mb-1">AUTHORIZATION REMARKS</SectionLabel>
                <div className="space-y-4">
                  {request.staffRemark && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 p-4 rounded-2xl">
                      <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Staff Note</p>
                      <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">"{request.staffRemark}"</p>
                    </div>
                  )}
                  {request.hodRemark && (
                    <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 p-4 rounded-2xl">
                      <p className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">HOD Note</p>
                      <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">"{request.hodRemark}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approval & Tracking Status Timeline */}
            {!showActions && activeTimeline && activeTimeline.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-10 rounded-[28px] lg:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                <SectionLabel icon={ListChecks} className="mb-3">APPROVAL & TRACKING STATUS</SectionLabel>
                <div className="space-y-0 pt-2">
                  {activeTimeline.map((step, idx) => {
                    const isDone = step.status === 'done';
                    const isRejected = step.status === 'rejected';
                    const isLast = idx === activeTimeline.length - 1;

                    return (
                      <div key={idx} className="flex gap-4 sm:gap-5 items-stretch min-h-[80px]">
                        {/* Left Column: Icon + Line */}
                        <div className="flex flex-col items-center shrink-0 w-11 sm:w-12">
                          <div className={cn(
                            "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 z-10 font-bold transition-all shadow-md",
                            isDone ? "bg-emerald-500 text-white shadow-emerald-500/25" : 
                            isRejected ? "bg-rose-500 text-white shadow-rose-500/25" : 
                            "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                          )}>
                            {isDone ? <Check className="w-6 h-6 stroke-[2.5]" /> : 
                             isRejected ? <X className="w-6 h-6 stroke-[2.5]" /> : 
                             <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
                          </div>
                          {!isLast && (
                            <div className={cn(
                              "w-[2.5px] flex-1 my-2 rounded-full transition-colors min-h-[20px]",
                              isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                            )} />
                          )}
                        </div>

                        {/* Right Column: Content */}
                        <div className="flex-1 min-w-0 pt-1 pb-8 sm:pb-9 last:pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                              {step.label}
                            </h4>
                            <span className={cn(
                              "text-[10px] sm:text-xs font-extrabold uppercase px-3 py-1.5 rounded-full tracking-wider shrink-0 shadow-2xs whitespace-nowrap",
                              isDone ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50" : 
                              isRejected ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50" : 
                              "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                            )}>
                              {isDone ? '✓ Completed' : isRejected ? '✗ Rejected' : '● Pending'}
                            </span>
                          </div>
                          {step.remark && (
                            <div className="mt-3 bg-slate-50 dark:bg-slate-800/70 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 w-full shadow-xs">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                <p className="text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Note / Status:</p>
                              </div>
                              <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed italic">"{step.remark}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer Action Bar */}
          <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-5 sm:px-10 lg:px-12 py-5 z-30 shrink-0 shadow-lg mt-auto">
            <div className="max-w-5xl lg:max-w-6xl mx-auto w-full flex items-center justify-end gap-4">
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
                  {isApproved && (onViewQR || isOwner) ? (
                    <>
                      <Button
                        variant="primary"
                        size="xl"
                        className="w-full sm:w-36 whitespace-nowrap shrink-0"
                        onClick={onClose}
                      >
                        Close
                      </Button>
                      <Button
                        variant="success"
                        size="xl"
                        className="w-full sm:w-auto px-6 whitespace-nowrap shrink-0"
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

          {/* Requester / visitor photo preview */}
          <ImageLightbox
            open={showPhotoPreview}
            src={requesterPhoto}
            alt={`${requesterDisplayName} photo`}
            onClose={() => setShowPhotoPreview(false)}
          />

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
