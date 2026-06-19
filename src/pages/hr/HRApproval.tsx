import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Paperclip, 
  Maximize2, 
  X, 
  ShieldCheck,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { formatDateTime } from '../../utils/dateUtils';
import { isPdfAttachment } from '../../utils/attachmentUtils';
import Badge from '../../components/ui/Badge';

interface HRApprovalProps {
  request: any;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function HRApproval({ request, onBack, onSuccess }: HRApprovalProps) {
  const { user } = useAuth();
  const { success: showToastSuccess, error: showToastError, info: showToastInfo } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const isPdf = isPdfAttachment(request?.attachmentUri);

  if (!request) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const staffCode = (user as any)?.staffCode || (user as any)?.hrCode;
      const result = await apiService.approveRequestAsHR(request.id, staffCode);
      if (result.success) {
        showToastSuccess('Approved', 'Gate pass request approved successfully.');
        onSuccess?.();
        onBack();
      } else {
        showToastError('Error', result.message || 'Failed to approve request.');
      }
    } catch (error: any) {
      showToastError('Error', error.message || 'Failed to approve request.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToastInfo('Reason Required', 'Please provide a reason for rejection.');
      return;
    }

    setLoading(true);
    setRejectModalVisible(false);

    try {
      const staffCode = (user as any)?.staffCode || (user as any)?.hrCode;
      const result = await apiService.rejectRequestAsHR(
        request.id,
        staffCode,
        rejectReason.trim()
      );
      if (result.success) {
        showToastSuccess('Rejected', 'Gate pass request has been rejected.');
        onSuccess?.();
        onBack();
      } else {
        showToastError('Error', result.message || 'Failed to reject request.');
      }
    } catch (error: any) {
      showToastError('Error', error.message || 'Failed to reject request.');
    } finally {
      setLoading(false);
      setRejectReason('');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col px-4 pb-12 overflow-y-auto lg:min-h-0 lg:bg-transparent bg-slate-50 dark:bg-slate-950"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 py-6 border-b border-slate-100 dark:border-slate-800 mb-8">
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 shadow-sm active:scale-90 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Request Review</h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">HR Decision Terminal</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Request Details Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Decision Required</h3>
                <p className="text-xs font-bold text-slate-400">ID: #{request.id}</p>
              </div>
            </div>
            <Badge variant="warning" className="px-4 py-2 font-black uppercase text-[10px] tracking-widest">
              Awaiting HR
            </Badge>
          </div>

          <div className="space-y-6">
            <InfoGrid label="Student Name" value={`${request.studentName || 'N/A'}`} />
            <InfoGrid label="Reg No" value={request.regNo || 'N/A'} />
            <InfoGrid label="Purpose" value={request.purpose || 'N/A'} />
            <InfoGrid label="Reason" value={request.reason || 'N/A'} />
            <InfoGrid label="Request Time" value={formatDateTime(request.requestDate)} />
            
            {request.attachmentUri && (
              <div className="pt-4">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Paperclip className="w-3 h-3" /> Supporting Document
                </p>
                <div 
                  className="relative rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 cursor-pointer group"
                  onClick={() => isPdf ? window.open(request.attachmentUri, '_blank') : setIsFullScreen(true)}
                >
                  {isPdf ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-3 bg-slate-900 text-white">
                      <FileText className="h-10 w-10" />
                      <span className="text-xs font-black uppercase tracking-widest">Open PDF</span>
                    </div>
                  ) : (
                    <>
                      <img 
                        src={request.attachmentUri} 
                        alt="Document Preview" 
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="w-8 h-8 text-white" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setRejectModalVisible(true)}
            disabled={loading}
            className="h-16 rounded-[24px] bg-rose-50 dark:bg-rose-900/10 text-rose-600 font-black text-[15px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-2 border-rose-100 dark:border-rose-900/30"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
          
          <button
            onClick={handleApprove}
            disabled={loading}
            className="h-16 rounded-[24px] bg-[var(--color-primary)] text-white font-black text-[15px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Approve
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalVisible && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setRejectModalVisible(false)}
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[40px] p-8 z-[210] shadow-2xl pb-safe"
            >
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Rejection Reason</h3>
              <p className="text-sm font-bold text-slate-500 mb-6">Please explain why this request is being rejected.</p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Mention valid points for rejection..."
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 text-[15px] font-bold text-slate-900 dark:text-white outline-none border-2 border-transparent focus:border-[var(--color-primary)] transition-colors resize-none mb-8"
              />

              <button
                onClick={handleReject}
                className="w-full h-16 bg-rose-600 text-white rounded-[24px] font-black text-[15px] uppercase tracking-widest shadow-xl shadow-rose-200 dark:shadow-none active:scale-[0.98] transition-all"
              >
                Confirm Rejection
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {isFullScreen && !isPdf && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6"
            onClick={() => setIsFullScreen(false)}
          >
            <button className="absolute top-10 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
              <X className="w-6 h-6" />
            </button>
            <img 
              src={request.attachmentUri} 
              alt="Full Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoGrid({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-800 pb-4 last:border-0 last:pb-0 grow">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug">{value}</span>
    </div>
  );
}
