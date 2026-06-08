import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Maximize2,
  FileIcon,
  Loader2
} from 'lucide-react';
import { apiService } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { formatDateShort } from '../../utils/date';
import Button from '../ui/Button';
import ConfirmationModal from './ConfirmationModal';
import Badge from '../ui/Badge';

interface BulkDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number;
  onApprove?: (id: number, remark: string) => void;
  onReject?: (id: number, remark: string) => void;
  showActions?: boolean;
}

export default function BulkDetailsModal({
  isOpen,
  onClose,
  requestId,
  onApprove,
  onReject,
  showActions = false,
}: BulkDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showRemarkError, setShowRemarkError] = useState(false);

  useEffect(() => {
    if (isOpen && requestId) {
      loadDetails();
      setRemark('');
    }
  }, [isOpen, requestId]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getBulkGatePassDetails(requestId);
      if (response.success) {
        const requestData = response.data || response.request || response;
        setDetails(requestData);
        setParticipants(requestData.participants || requestData.students || []);
      } else {
        setError(response.message || 'Failed to load details');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const status = details?.status || 'PENDING';
  const isApproved = status === 'APPROVED' || !!details?.qrCode;
  const isRejected = status === 'REJECTED';
  
  const attachmentUri = details?.attachmentUri || details?.fileUrl;
  const isPdf = attachmentUri?.toLowerCase().endsWith('.pdf');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col pt-safe"
      >
        {/* Header */}
        <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 h-16 flex items-center gap-3 z-10">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg font-extrabold text-slate-900 dark:text-white">Bulk Pass Details</h1>
          {!loading && !error && (
            <Badge 
              variant={isApproved ? 'success' : isRejected ? 'danger' : 'warning'}
              className="uppercase tracking-widest text-[10px] py-1 px-3"
            >
              {status}
            </Badge>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
              <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
              <p className="text-slate-500 text-sm animate-pulse">Loading details...</p>
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
            <div className="p-4 space-y-4">
              {/* Profile Row */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <div className="w-14 h-14 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-200 dark:shadow-none">
                  {(details?.requestedByStaffName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    {details?.requestedByStaffName || 'Staff Member'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {details?.department || 'RIT Staff'}
                  </p>
                </div>
                {participants.length > 0 && (
                  <div className="bg-blue-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors">
                    <Users className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span className="text-xs font-black text-[var(--color-primary)]">{participants.length}</span>
                  </div>
                )}
              </div>

              {/* Info Grid */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 grid grid-cols-2 shadow-sm">
                <div className="p-4 border-r border-slate-50 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Purpose</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">
                    {details?.purpose || 'N/A'}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {formatDateShort(details?.exitDateTime || details?.requestDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Reason</p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                  {details?.reason || 'No detailed reason provided.'}
                </p>
              </div>

              {/* Attachment */}
              {attachmentUri && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Attachment</p>
                  <div 
                    className="relative w-40 h-24 bg-slate-900 rounded-xl overflow-hidden cursor-pointer group"
                    onClick={() => window.open(attachmentUri, '_blank')}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-800">
                        <FileIcon className="w-8 h-8 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase">Open PDF</span>
                      </div>
                    ) : (
                      <>
                        <img src={attachmentUri} alt="Attachment" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {(details?.staffRemark || details?.hodRemark) && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</p>
                  {details?.staffRemark && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500 p-3 rounded-r-xl">
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Staff</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">"{details.staffRemark}"</p>
                    </div>
                  )}
                  {details?.hodRemark && (
                    <div className="bg-blue-50 dark:bg-indigo-900/10 border-l-4 border-blue-700 p-3 rounded-r-xl">
                      <p className="text-[10px] font-black text-[var(--color-primary)] uppercase mb-1">HOD</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">"{details.hodRemark}"</p>
                    </div>
                  )}
                </div>
              )}

              <div className="h-20" /> {/* Spacer for footer */}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && !error && showActions && !isApproved && !isRejected && (
          <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 pb-safe space-y-3 shadow-[0_-8px_24px_rgba(0,0,0,0.05)]">
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add review notes (optional)..."
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none"
              rows={2}
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
        )}

        {/* Confirmations */}
        <ConfirmationModal
          visible={showRemarkError}
          title="Remark Required"
          message="Please add a reason for rejection before proceeding."
          confirmText="OK"
          cancelText=""
          onConfirm={() => setShowRemarkError(false)}
          onCancel={() => setShowRemarkError(false)}
        />

        <ConfirmationModal
          visible={showApproveConfirm}
          title="Approve Bulk Pass"
          message="Are you sure you want to approve this gate pass request?"
          confirmText="Approve"
          onConfirm={async () => {
            setShowApproveConfirm(false);
            setProcessing(true);
            if (onApprove) await onApprove(requestId, remark);
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
            if (onReject) await onReject(requestId, remark);
            setProcessing(false);
            onClose();
          }}
          onCancel={() => setShowRejectConfirm(false)}
        />
      </motion.div>
    </AnimatePresence>
  );
}
