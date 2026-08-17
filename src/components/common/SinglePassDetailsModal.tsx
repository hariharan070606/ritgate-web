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
  CircleSlash2,
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
import { formatDateTime, isToday } from '../../utils/dateUtils';
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
  status: 'done' | 'rejected' | 'pending' | 'cancelled';
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
  const isUsedOrExited = status === 'USED' || status === 'EXITED' || Boolean(request.isUsed);
  const dateVal = request.requestDate || request.createdAt || request.visitDate;
  const isTodayRequest = isToday(dateVal);

  const currentUserId = String(getUserId() || '').trim().toLowerCase();
  const reqRegNo = String(request.regNo || request.studentRegNo || '').trim().toLowerCase();
  const reqStaffCode = String(request.staffCode || request.requestedByStaffCode || '').trim().toLowerCase();
  const reqUserId = String(request.userId || request.createdBy || '').trim().toLowerCase();

  const isOwner = Boolean(
    currentUserId &&
    (
      (reqRegNo && currentUserId === reqRegNo) ||
      (reqStaffCode && currentUserId === reqStaffCode) ||
      (reqUserId && currentUserId === reqUserId)
    )
  );

  // VIEW QR button is ONLY shown to the actual requester (isOwner) when status is APPROVED, pass is NOT USED/EXITED, and request date is TODAY!
  const canShowQR = isOwner && isApproved && !isUsedOrExited && isTodayRequest;

  const attachmentUri = request.attachmentUri || request.fileUrl;
  const isPdf = isPdfAttachment(attachmentUri);

  const getInitials = (name: string) =>
    (name || 'ST').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const requesterDisplayName =
    request.studentName || request.requesterName || request.visitorName || 'Gate Pass Requester';
  const requesterPhoto = resolveProfilePhoto(request) || fetchedPhoto;

  const canTakeAction = Boolean(showActions && status !== 'APPROVED' && status !== 'REJECTED' && status !== 'USED' && status !== 'EXITED');
  
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
    const staffApproval = (request?.staffApproval || '').toUpperCase();
    const hodApproval = (request?.hodApproval || '').toUpperCase();
    const hrApproval = (request?.hrApproval || '').toUpperCase();

    const isStaffDone =
      rawStatus === 'APPROVED' ||
      rawStatus === 'PENDING_HOD' ||
      rawStatus === 'APPROVED_BY_STAFF' ||
      rawStatus === 'PENDING_HR' ||
      rawStatus === 'APPROVED_BY_HOD' ||
      rawStatus === 'USED' ||
      rawStatus === 'EXITED' ||
      staffApproval === 'APPROVED';

    const isStaffRejected =
      rawStatus === 'REJECTED_BY_STAFF' ||
      staffApproval === 'REJECTED' ||
      (rawStatus === 'REJECTED' && !isStaffDone && !hodApproval && !request?.hodStatus);

    const isHodDone =
      rawStatus === 'APPROVED' ||
      rawStatus === 'PENDING_HR' ||
      rawStatus === 'APPROVED_BY_HOD' ||
      rawStatus === 'USED' ||
      rawStatus === 'EXITED' ||
      hodApproval === 'APPROVED';

    const isHodRejected =
      rawStatus === 'REJECTED_BY_HOD' ||
      hodApproval === 'REJECTED' ||
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

    const staffStatus = isStaffDone ? 'done' : isStaffRejected ? 'rejected' : 'pending';

    const hodStatus = isStaffRejected
      ? 'cancelled'
      : isHodDone
      ? 'done'
      : isHodRejected
      ? 'rejected'
      : 'pending';

    const gateStatus = (isStaffRejected || isHodRejected || rawStatus === 'REJECTED')
      ? 'cancelled'
      : isGateUsed
      ? 'done'
      : 'pending';

    return [
      {
        label: 'Staff Authorization',
        status: staffStatus,
        remark: cleanRemark(request?.staffRemark),
      },
      {
        label: 'HOD Authorization',
        status: hodStatus,
        remark: cleanRemark(request?.hodRemark),
      },
      {
        label: 'Campus Gate Access',
        status: gateStatus,
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
          <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 h-16 sm:h-18 flex items-center justify-between z-40 shrink-0 shadow-xs">
            <div className="flex items-center gap-4 max-w-3xl lg:max-w-4xl mx-auto w-full justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {!showActions ? 'Request Details' : 'Pass Verification'}
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge status={status} className="scale-100" />
              </div>
            </div>
          </header>

          {/* Content Body Container */}
          <div className="flex-1 overflow-y-auto w-full max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-5">
            {/* Student Info Card */}
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-7 rounded-2xl lg:rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4 sm:gap-5">
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
                  className="w-14 h-14 sm:w-16 sm:h-16 shadow-md ring-3 ring-slate-100 dark:ring-slate-800"
                  fallback={
                    <div className="w-full h-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-black text-lg sm:text-xl">
                      {getInitials(requesterDisplayName)}
                    </div>
                  }
                />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {requesterDisplayName}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-tighter flex items-center flex-wrap gap-1">
                  {(() => {
                    const reqId = request.rollNo || request.regNo || request.staffCode || request.requestedByStaffCode || request.userId || (request.id ? `#${request.id}` : '');
                    const dept = request.department || request.dept;
                    const role = request.role || request.userType || (request.passType === 'VISITOR' ? 'VISITOR' : '');
                    return (
                      <>
                        {reqId && <span className="font-extrabold text-slate-700 dark:text-slate-200">ID: {reqId}</span>}
                        {role && ` • ${role}`}
                        {dept && ` • ${dept}`}
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>

            {/* Purpose & Date Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl lg:rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <SectionLabel icon={Target} className="mb-2">PURPOSE</SectionLabel>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {request.purpose || request.reason || 'Campus Gate Access'}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl lg:rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <SectionLabel icon={CalendarDays} className="mb-2">DATE & TIME</SectionLabel>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {formatDateTime(request.requestDate || request.createdAt)}
                </p>
              </div>
            </div>

            {/* Reason Box */}
            {request.reason && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl lg:rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5">
                <SectionLabel icon={FileText} className="mb-1">REASON / NOTES</SectionLabel>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                    "{request.reason}"
                  </p>
                </div>
              </div>
            )}

            {/* Attachment Preview */}
            {attachmentUri && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl lg:rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <SectionLabel icon={Paperclip}>ATTACHMENT PREVIEW</SectionLabel>
                  <a
                    href={attachmentUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Open Original</span>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </a>
                </div>
                {isPdf ? (
                  <a
                    href={attachmentUri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline"
                  >
                    <FileText className="w-6 h-6 shrink-0" />
                    <span>View PDF Attachment Document</span>
                  </a>
                ) : (
                  <div 
                    onClick={() => setIsFullScreen(true)}
                    className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-80 bg-slate-950 flex items-center justify-center group cursor-pointer hover:border-blue-500/50 transition-all shadow-sm"
                  >
                    <img 
                      src={attachmentUri} 
                      alt="Attachment Preview" 
                      className="max-h-80 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-[2px]">
                      <Maximize2 className="w-4 h-4" />
                      <span>Click to View Fullscreen</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Remarks Section if available */}
            {(request.staffRemark || request.hodRemark || request.hrRemark) && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl lg:rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <SectionLabel icon={StickyNote} className="mb-1">AUTHORIZATION REMARKS</SectionLabel>
                <div className="space-y-3">
                  {request.staffRemark && (
                    <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 p-3.5 rounded-xl">
                      <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">Staff Note</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">"{request.staffRemark}"</p>
                    </div>
                  )}
                  {request.hodRemark && (
                    <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80 p-3.5 rounded-xl">
                      <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-0.5">HOD Note</p>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">"{request.hodRemark}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approval & Tracking Status Timeline */}
            {!showActions && activeTimeline && activeTimeline.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 lg:p-7 rounded-2xl lg:rounded-[24px] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <SectionLabel icon={ListChecks} className="mb-2">APPROVAL & TRACKING STATUS</SectionLabel>
                <div className="space-y-0 pt-2">
                  {activeTimeline.map((step, idx) => {
                    const isDone = step.status === 'done';
                    const isRejected = step.status === 'rejected';
                    const isCancelled = step.status === 'cancelled';
                    const isLast = idx === activeTimeline.length - 1;

                    return (
                      <div key={idx} className="flex gap-4 sm:gap-5 items-stretch min-h-[80px]">
                        {/* Left Column: Icon + Line */}
                        <div className="flex flex-col items-center shrink-0 w-11 sm:w-12">
                          <div className={cn(
                            "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 z-10 font-bold transition-all shadow-md",
                            isDone ? "bg-emerald-500 text-white shadow-emerald-500/25" : 
                            isRejected ? "bg-rose-500 text-white shadow-rose-500/25" : 
                            isCancelled ? "bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                          )}>
                            {isDone ? <Check className="w-6 h-6 stroke-[2.5]" /> : 
                             isRejected ? <X className="w-6 h-6 stroke-[2.5]" /> : 
                             isCancelled ? <CircleSlash2 className="w-5 h-5 text-slate-400 dark:text-slate-500" /> :
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
                              isCancelled ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700" :
                              "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                            )}>
                              {isDone ? '✓ Completed' : isRejected ? '✗ Rejected' : isCancelled ? '— Terminated' : '● Pending'}
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
          <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 z-30 shrink-0 shadow-lg mt-auto">
            <div className="max-w-3xl lg:max-w-4xl mx-auto w-full flex items-center justify-end gap-3">
              {canTakeAction ? (
                <div className="w-full flex flex-col space-y-2.5">
                  <div className="w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Review Notes / Remarks</label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Add optional notes or mandatory rejection reason..."
                      rows={2}
                      className="w-full h-14 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2.5 justify-end">
                    <Button
                      variant="danger"
                      size="md"
                      className="w-28 sm:w-32 text-xs font-black uppercase tracking-wider"
                      icon={<XCircle className="w-4 h-4" />}
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
                      size="md"
                      className="w-28 sm:w-32 text-xs font-black uppercase tracking-wider"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => setShowApproveConfirm(true)}
                      isLoading={processing}
                      disabled={processing}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5 justify-end w-full sm:w-auto">
                  {canShowQR ? (
                    <>
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full sm:w-28 text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0"
                        onClick={onClose}
                      >
                        Close
                      </Button>
                      <Button
                        variant="success"
                        size="md"
                        className="w-full sm:w-auto px-5 text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0"
                        icon={qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                        onClick={handleViewQR}
                        disabled={qrLoading}
                      >
                        {qrLoading ? 'Loading...' : 'View QR'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full sm:w-28 text-xs font-black uppercase tracking-wider"
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
