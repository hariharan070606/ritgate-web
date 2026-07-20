import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, UserCircle, QrCode, X, Search, Maximize2, Loader2, AlertCircle, CheckCircle2, XCircle, FileText, Target, CalendarDays, StickyNote, Paperclip, ListChecks } from 'lucide-react';
import { apiService } from '../../services/api.service';
import SectionLabel from './SectionLabel';
import { cn } from '../../utils/cn';
import { formatDateShort } from '../../utils/date';
import { isPdfAttachment } from '../../utils/attachmentUtils';
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
  viewerRole,
  requesterInfo,
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
  const isPdf = isPdfAttachment(details?.attachmentUri);
  const [participants, setParticipants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [remark, setRemark] = useState('');
  const [processing, setProcessing] = useState(false);
  const isProcessing = externalProcessing ?? processing;
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRemarkError, setShowRemarkError] = useState(false);

  useEffect(() => {
    if (isOpen && requestId) {
      loadDetails();
      setShowQR(false);
      setRemark('');
    }
  }, [isOpen, requestId]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getBulkGatePassDetails(requestId);
      if (response.success) {
        const data = response.request || response.data || response;
        setDetails(data);
        setParticipants(
          (data.participants) || (data.students) || []
        );
      } else {
        setError(response.message || 'Failed to load details');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) =>
    (name || 'BK').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const status = details?.status || 'PENDING';
  const isApproved = status === 'APPROVED' || !!details?.qrCode;
  const isRejected = status === 'REJECTED';
  const hasQR = !!(details?.qrCode || details?.qrData?.qrString);
  
  const isQROwner = currentUserId
    ? (
        String(currentUserId).trim() === String(details?.qrOwnerId || '').trim() ||
        (details?.includeStaff && String(currentUserId).trim() === String(details?.requestedByStaffCode || details?.staffCode || '').trim()) ||
        (!details?.qrOwnerId && String(currentUserId).trim() === String(details?.requestedByStaffCode || details?.staffCode || '').trim())
      )
    : true;

  const appliedByName = details?.requestedByStaffName || null;
  const viewerIsReceiver = currentUserId
    ? String(currentUserId).trim() === String(details?.qrOwnerId || '').trim()
    : false;
  const showAppliedBy = viewerIsReceiver && appliedByName && 
    String(currentUserId || '').trim() !== String(details?.requestedByStaffCode || details?.staffCode || '').trim();

  const statusVariant = isRejected ? 'danger' : isApproved ? 'success' : 'warning';

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[120] bg-[#F8FAFC] dark:bg-slate-950 flex flex-col pt-safe"
      >
        <div className="flex min-h-0 w-full flex-1 flex-col bg-[#F8FAFC] dark:bg-slate-950">
        {/* Header */}
        <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 h-16 flex items-center gap-3 z-20 lg:px-6">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg font-extrabold text-slate-900 dark:text-white">Bulk Pass Details</h1>
          {!loading && !error && (
            <Badge variant={statusVariant} className="px-3 py-1 text-[10px] uppercase font-black tracking-widest">
              {status}
            </Badge>
          )}
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
            <div className="p-4 pt-8 space-y-4 lg:p-6 lg:space-y-5">
              {/* Profile Row */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3 lg:rounded-[22px] lg:p-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg",
                  isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-amber-500"
                )}>
                  {getInitials(details?.requestedByStaffName || 'BK')}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {details?.requestedByStaffName || 'N/A'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium truncate uppercase tracking-tighter">
                   {userRole} • {details?.department || 'N/A'}
                  </p>
                </div>
                {participants.length > 0 && (
                  <div className="bg-[var(--color-primary)] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white shadow-md active:scale-95 transition-transform cursor-pointer" onClick={() => setShowParticipants(true)}>
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
                  <SectionLabel icon={Target} className="mb-2">Purpose</SectionLabel>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {details?.purpose || 'N/A'}
                  </p>
                </div>
                <div className="p-4">
                  <SectionLabel icon={CalendarDays} className="mb-2">Date</SectionLabel>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {formatDateShort(details?.exitDateTime || details?.requestDate)}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:rounded-[22px] lg:p-5">
                <SectionLabel icon={StickyNote} className="mb-2.5">Reason</SectionLabel>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {details?.reason || 'No reason provided.'}
                </p>
              </div>

              {/* Attachment Preview */}
              {details?.attachmentUri && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <SectionLabel icon={Paperclip} className="mb-3">Preview</SectionLabel>
                  <div 
                    className="relative w-40 h-24 bg-slate-900 rounded-xl overflow-hidden cursor-pointer group"
                    onClick={() => isPdf ? window.open(details.attachmentUri, '_blank') : setShowFullscreen(true)}
                  >
                    {isPdf ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-800">
                        <FileText className="h-8 w-8 text-white" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-white">Open PDF</span>
                      </div>
                    ) : (
                      <>
                        <img src={details.attachmentUri} alt="Pass Attachment" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Approval Timeline */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <SectionLabel icon={ListChecks}>Approval Timeline</SectionLabel>
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
                      {details?.hodRemark && (
                         <div className="mt-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border-l-2 border-amber-500 italic">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Remark:</p>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{details.hodRemark}</p>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-24 lg:h-4" />
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 pb-safe space-y-3 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] lg:p-5">
            {showActions ? (
              <>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add review notes (required for rejection)..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
                  rows={2}
                  disabled={isProcessing}
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
                    disabled={isProcessing}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    fullWidth
                    size="xl"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                    onClick={() => setShowApproveConfirm(true)}
                    isLoading={isProcessing}
                    disabled={isProcessing}
                  >
                    Approve
                  </Button>
                </div>
              </>
            ) : (
              <>
                {isApproved && hasQR && isQROwner && (
                  <Button
                    variant="success"
                    fullWidth
                    size="xl"
                    icon={<QrCode className="w-5 h-5" />}
                    onClick={() => setShowQR(true)}
                  >
                    View QR & Manual Code
                  </Button>
                )}
                {participants.length > 0 && (
                  <Button
                    variant="primary"
                    fullWidth
                    size="xl"
                    icon={<Users className="w-5 h-5" />}
                    onClick={() => setShowParticipants(true)}
                    className="text-white"
                  >
                    View Participants ({participants.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  fullWidth
                  size="xl"
                  onClick={onClose}
                  className="border-slate-200 bg-white/85 text-slate-700 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                >
                  Close
                </Button>
              </>
            )}
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
