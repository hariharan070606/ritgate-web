import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, UserCircle, QrCode, X, Search, Maximize2, Loader2, AlertCircle, CheckCircle2, XCircle, FileText, Target, CalendarDays, StickyNote, Paperclip, ListChecks, Download, ExternalLink } from 'lucide-react';
import { apiService } from '../../services/api.service';
import SectionLabel from './SectionLabel';
import { cn } from '../../utils/cn';
import { formatDateTime } from '../../utils/dateUtils';
import { isPdfAttachment, openAttachment, downloadAttachment } from '../../utils/attachmentUtils';
import Badge from '../ui/Badge';
import GatePassQRModal from './GatePassQRModal';
import Button from '../ui/Button';
import ConfirmationModal from './ConfirmationModal';

interface MyRequestsBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  userRole?: 'STAFF' | 'HOD';
  currentUserId?: string;
  viewerRole?: string;
  requesterInfo?: { name: string; role: string; department: string };
  onApprove?: (req: any, remark?: string) => Promise<void>;
  onReject?: (req: any, remark: string) => Promise<void>;
  showActions?: boolean;
  processing?: boolean;
}

export default function MyRequestsBulkModal({
  isOpen,
  onClose,
  requestId,
  userRole = 'STAFF',
  currentUserId,
  viewerRole: _viewerRole,
  requesterInfo: _requesterInfo,
  onApprove,
  onReject,
  showActions,
  processing: externalProcessing,
}: MyRequestsBulkModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const isPdf = isPdfAttachment(details?.attachmentUri);
  const [remark, setRemark] = useState('');
  const [showRemarkError, setShowRemarkError] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const isProcessing = externalProcessing ?? false;

  const loadDetails = async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getBulkGatePassDetails(requestId);
      if (res.success && (res.details || res.request || res.data)) {
        setDetails(res.details || res.request || res.data);
      } else {
        setError(res.message || 'Failed to fetch bulk request details.');
      }
    } catch {
      setError('An error occurred while loading details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && requestId) {
      loadDetails();
      setShowQR(false);
      setShowParticipants(false);
      setRemark('');
      setShowRemarkError(false);
      setShowApproveConfirm(false);
      setShowRejectConfirm(false);
    }
  }, [isOpen, requestId]);

  // Lock body scroll to prevent double scrollbars
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  const getInitials = (name: string) =>
    (name || 'BK').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const participants = details?.students || details?.participants || [];
  const status = (details?.status || 'PENDING_HOD').toUpperCase();
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED' || status === 'REJECTED_BY_HOD';
  const hasQR = Boolean(details?.qrCode || details?.qrData?.qrString);

  const isQROwner = currentUserId
    ? String(currentUserId).trim().toLowerCase() === String(details?.qrOwnerId || details?.requestedByStaffCode || details?.staffCode || '').trim().toLowerCase()
    : true;

  const appliedByName = details?.requestedByStaffName || null;
  const viewerIsReceiver = currentUserId
    ? String(currentUserId).trim() === String(details?.qrOwnerId || '').trim()
    : false;
  const showAppliedBy = viewerIsReceiver && appliedByName && 
    String(currentUserId || '').trim() !== String(details?.requestedByStaffCode || details?.staffCode || '').trim();

  const statusVariant = isRejected ? 'danger' : isApproved ? 'success' : 'warning';

  const cleanRemark = (r: unknown) => {
    if (!r) return undefined;
    const s = String(r).trim();
    const l = s.toLowerCase();
    if (['authorization granted', 'approved', 'authorized', 'n/a', 'na'].includes(l)) return undefined;
    return s;
  };
  const hodRemark = cleanRemark(details?.hodRemark);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[120] bg-[#F8FAFC] dark:bg-slate-950 flex flex-col pt-safe h-full overflow-hidden"
      >
        <div className="flex min-h-0 w-full flex-1 flex-col bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between z-30 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 max-w-3xl lg:max-w-4xl mx-auto w-full justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {!showActions ? 'Bulk Pass Details' : 'Pass Verification'}
              </h1>
            </div>
            {!loading && !error && (
              <Badge variant={statusVariant} className="px-3 py-1 text-[10px] uppercase font-black tracking-widest">
                {status}
              </Badge>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto lg:bg-slate-50/70 lg:dark:bg-slate-950">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
              <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
              <p className="text-slate-500 text-sm animate-pulse">Loading request details...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <p className="text-slate-900 dark:text-white font-bold">{error}</p>
              <Button variant="outline" onClick={loadDetails}>Retry</Button>
            </div>
          ) : (
            <div className="max-w-3xl lg:max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 space-y-4 sm:space-y-5">
              {/* Profile Row */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3 lg:rounded-[22px] lg:p-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg shrink-0",
                  isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-amber-500"
                )}>
                  {getInitials(details?.requestedByStaffName || 'BK')}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {details?.requestedByStaffName || 'N/A'}
                  </h2>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-tighter flex items-center flex-wrap gap-1">
                    {(() => {
                      const reqId = details?.requestedByStaffCode || details?.staffCode || details?.qrOwnerId || (details?.id ? `#${details.id}` : '');
                      const dept = details?.department;
                      return (
                        <>
                          {reqId && <span className="font-extrabold text-slate-700 dark:text-slate-200">ID: {reqId}</span>}
                          {userRole && ` • ${userRole}`}
                          {dept && ` • ${dept}`}
                        </>
                      );
                    })()}
                  </p>
                </div>
                {participants.length > 0 && (
                  <div className="bg-[var(--color-primary)] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white shadow-md active:scale-95 transition-transform cursor-pointer shrink-0" onClick={() => setShowParticipants(true)}>
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-xs font-black">{participants.length}</span>
                  </div>
                )}
              </div>

              {/* Applied By (Receiver View) */}
              {showAppliedBy && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white text-xs font-black">
                    {getInitials(appliedByName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Applied By</p>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{appliedByName}</h3>
                  </div>
                  <div className="bg-blue-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg flex items-center gap-1">
                    <UserCircle className="w-3 h-3 text-[var(--color-primary)]" />
                    <span className="text-[9px] font-black text-[var(--color-primary)] tracking-tighter uppercase">Organiser</span>
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 grid grid-cols-2 shadow-sm lg:rounded-[22px]">
                <div className="p-4 border-r border-slate-50 dark:border-slate-800">
                  <SectionLabel icon={Target} className="mb-2">PURPOSE</SectionLabel>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {details?.purpose || 'N/A'}
                  </p>
                </div>
                <div className="p-4">
                  <SectionLabel icon={CalendarDays} className="mb-2">DATE & TIME</SectionLabel>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {formatDateTime(details?.exitDateTime || details?.requestDate || details?.createdAt)}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:rounded-[22px] lg:p-5">
                <SectionLabel icon={StickyNote} className="mb-2.5">REASON / NOTES</SectionLabel>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {details?.reason || 'No reason provided.'}
                </p>
              </div>

              {/* View Participants Button Box (Below Reason Box) */}
              {participants.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3 lg:rounded-[22px]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PARTICIPANTS LIST</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{participants.length} Registered Students</p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowParticipants(true)}
                    icon={<Users className="w-4 h-4" />}
                    className="text-white text-xs font-bold uppercase tracking-wider px-4 shrink-0"
                  >
                    View Participants ({participants.length})
                  </Button>
                </div>
              )}

              {/* Attachment Preview */}
              {details?.attachmentUri && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionLabel icon={Paperclip}>ATTACHMENT PREVIEW</SectionLabel>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAttachment(details.attachmentUri, `bulk-pass-attachment-${details.id || 'doc'}.${isPdf ? 'pdf' : 'png'}`);
                        }}
                        className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAttachment(details.attachmentUri, `bulk-pass-attachment-${details.id || 'doc'}.${isPdf ? 'pdf' : 'png'}`);
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open in New Tab</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isPdf ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/80">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            PDF Attachment Document
                          </p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Click to view in browser or download
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openAttachment(details.attachmentUri, `bulk-pass-attachment-${details.id || 'doc'}.pdf`)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Document</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadAttachment(details.attachmentUri, `bulk-pass-attachment-${details.id || 'doc'}.pdf`)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition-all active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="relative w-40 h-24 bg-slate-900 rounded-xl overflow-hidden cursor-pointer group"
                      onClick={() => setShowFullscreen(true)}
                    >
                      <img src={details.attachmentUri} alt="Pass Attachment" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Approval Timeline (Hidden in Pass Verification / Review Mode) */}
              {!showActions && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <SectionLabel icon={ListChecks}>APPROVAL TIMELINE</SectionLabel>
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="w-[2px] h-10 bg-emerald-500 my-1 rounded-full" />
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-slate-100 dark:bg-slate-800"
                      )}>
                        {isApproved ? <CheckCircle2 className="w-5 h-5 text-white" /> : 
                         isRejected ? <XCircle className="w-5 h-5 text-white" /> : 
                         <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />}
                      </div>
                    </div>
                    <div className="flex-1 pt-1.5 space-y-9">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Request Submitted</h4>
                        <p className="text-xs font-bold text-emerald-500 uppercase mt-1">✓ Completed</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">HOD Approval</h4>
                        <p className={cn(
                          "text-xs font-bold uppercase mt-1",
                           isApproved ? "text-emerald-500" : isRejected ? "text-rose-500" : "text-slate-400"
                        )}>
                          {isApproved ? '✓ Completed' : isRejected ? '✗ Rejected' : 'Pending'}
                        </p>
                        {hodRemark && (
                           <div className="mt-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border-l-2 border-amber-500 italic">
                              <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Remark:</p>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{hodRemark}</p>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="h-12 lg:h-4" />
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 z-30 shrink-0 shadow-lg mt-auto">
            <div className="max-w-3xl lg:max-w-4xl mx-auto w-full flex items-center justify-end gap-3">
              {showActions ? (
                <div className="w-full flex flex-col space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">REVIEW NOTES / REMARKS</label>
                  <div className="flex items-center gap-3 w-full flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Add optional notes or mandatory rejection reason..."
                      className="flex-1 min-w-[200px] h-11 px-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      disabled={isProcessing}
                    />
                    <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                      <Button
                        variant="danger"
                        size="md"
                        className="h-11 px-5 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shrink-0"
                        icon={<XCircle className="w-4 h-4" />}
                        onClick={() => {
                          if (!remark.trim()) setShowRemarkError(true);
                          else setShowRejectConfirm(true);
                        }}
                        disabled={isProcessing}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="success"
                        size="md"
                        className="h-11 px-5 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shrink-0"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => setShowApproveConfirm(true)}
                        isLoading={isProcessing}
                        disabled={isProcessing}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5 justify-end w-full sm:w-auto flex-wrap sm:flex-nowrap">
                  {isApproved && hasQR && isQROwner && (
                    <Button
                      variant="success"
                      size="md"
                      className="w-full sm:w-auto px-4 text-xs font-black uppercase tracking-wider"
                      icon={<QrCode className="w-4 h-4" />}
                      onClick={() => setShowQR(true)}
                    >
                      View QR & Code
                    </Button>
                  )}
                  {participants.length > 0 && (
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full sm:w-auto px-4 text-xs font-black uppercase tracking-wider text-white"
                      icon={<Users className="w-4 h-4" />}
                      onClick={() => setShowParticipants(true)}
                    >
                      Participants ({participants.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="md"
                    onClick={onClose}
                    className="w-full sm:w-28 text-xs font-black uppercase tracking-wider border-slate-200 bg-white/85 text-slate-700 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </footer>
        )}
        </div>

        {/* Integrated QR Modal */}
        <GatePassQRModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          personName={appliedByName || details?.requestedByStaffName || 'N/A'}
          personId={String(details?.qrOwnerId || '')}
          qrCodeData={details?.qrCode || details?.qrData?.qrString || null}
          manualCode={details?.manualCode || details?.qrData?.manualEntryCode}
          reason={details?.purpose}
          validUntil="Today only"
          showShare={true}
        />

        {/* Participants Modal (Simulated ParticipantsScreen) */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-0 z-[130] bg-white dark:bg-slate-950 flex flex-col pt-safe"
            >
              <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 h-16 flex items-center gap-3">
                <button 
                  onClick={() => setShowParticipants(false)}
                  className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="flex-1 text-lg font-extrabold text-slate-900 dark:text-white">Participants</h1>
              </header>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name or reg no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {participants.filter(p => 
                  (p.name || p.fullName || p.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (p.id || p.regNo || p.staffCode || '').toLowerCase().includes(searchTerm.toLowerCase())
                ).map((p, idx) => {
                  const isReceiver = String(details?.qrOwnerId).trim() === String(p.id || p.regNo || p.staffCode).trim();
                  return (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 shadow-sm active:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black">
                        {getInitials(p.name || p.fullName || p.studentName)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{p.name || p.fullName || p.studentName || 'N/A'}</h4>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-tighter">{p.id || p.regNo || p.staffCode || '---'}</p>
                      </div>
                      {isReceiver && (
                         <Badge variant="success" className="text-[8px] py-0.5 px-2">RECEIVER</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Preview */}
        <AnimatePresence>
          {showFullscreen && !isPdf && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] bg-black/95 flex items-center justify-center p-4 pt-safe"
              onClick={() => setShowFullscreen(false)}
            >
              <button className="absolute top-10 right-6 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
              <img src={details?.attachmentUri} className="max-w-full max-h-full rounded-xl object-contain shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remark required */}
        <ConfirmationModal
          visible={showRemarkError}
          title="Remark Required"
          message="Please add a reason for rejection in the review notes before rejecting."
          confirmText="OK"
          cancelText=""
          onConfirm={() => setShowRemarkError(false)}
          onCancel={() => setShowRemarkError(false)}
        />

        {/* Approve confirmation */}
        <ConfirmationModal
          visible={showApproveConfirm}
          title="Approve Bulk Pass"
          message="Are you sure you want to approve this bulk gate pass request?"
          confirmText="Approve"
          onConfirm={async () => {
            setShowApproveConfirm(false);
            onClose();
            if (onApprove) await onApprove(requestId, remark);
          }}
          onCancel={() => setShowApproveConfirm(false)}
        />

        {/* Reject confirmation */}
        <ConfirmationModal
          visible={showRejectConfirm}
          title="Reject Bulk Pass"
          message="Are you sure you want to reject this bulk gate pass request?"
          confirmText="Reject"
          confirmColor="bg-rose-500 hover:bg-rose-600"
          onConfirm={async () => {
            setShowRejectConfirm(false);
            onClose();
            if (onReject) await onReject(requestId, remark);
          }}
          onCancel={() => setShowRejectConfirm(false)}
        />
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
