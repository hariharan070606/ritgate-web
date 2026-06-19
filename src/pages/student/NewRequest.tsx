import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PurposeSelect from '../../components/common/PurposeSelect';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlignLeft,
  Loader2
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { useFieldValidation } from '../../hooks/useFieldValidation';
import { submitStudentGatePass } from '../../services/api.service';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import SuccessModal from '../../components/common/SuccessModal';
import ErrorModal from '../../components/common/ErrorModal';
import AttachmentUpload from '../../components/common/AttachmentUpload';
import { cn } from '../../utils/cn';
import { getRequestDate } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import type { Student } from '../../types';

/** Returns current hour in IST (UTC+5:30) */
const getISTHour = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 60 * 60 * 1000).getHours();
};

export default function NewRequest() {
  usePageTitle('New Request');
  const navigate = useNavigate();
  const { user: rawUser } = useAuth();
  const user = rawUser as Student;
  const { isDesktop } = useAdaptive();
  const { error: showToastError } = useToast();
  const { withLock, isLocked } = useActionLock();

  // Block access after 15:00 IST
  useEffect(() => {
    if (getISTHour() >= 15) {
      navigate('/dashboard', { replace: true });
    }
  }, []);

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUri, setAttachmentUri] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();

  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { errors, validateAll, fieldProps } = useFieldValidation({
    purpose: v => !v.trim() ? 'Purpose is required' : undefined,
    reason:  v => !v.trim() ? 'Please describe your reason' : v.trim().length < 10 ? 'Too short — add more detail' : undefined,
  });

  const isFormValid = purpose.trim() && reason.trim();

  const handleSubmit = async () => {
    if (!validateAll({ purpose, reason })) return;
    
    await withLock(async () => {
      try {
        const response = await submitStudentGatePass({
          regNo: user?.regNo || '',
          purpose: purpose.trim(),
          reason: reason.trim(),
          requestDate: getRequestDate(),
          attachmentUri: attachmentUri || undefined,
        });

        if (response.success) {
          setShowSuccess(true);
        } else {
          setErrorMessage(response.message || 'Could not submit request');
          setShowError(true);
        }
      } catch (err) {
        setErrorMessage('Network error occurred. Please try again.');
        setShowError(true);
      }
    }, 'Submitting Request...');
  };

  const handleGoBack = () => {
    if (purpose || reason || attachmentUri) {
      if (window.confirm('Discard changes and go back?')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:min-h-0 lg:bg-transparent bg-[#F8FAFC] dark:bg-slate-950">
      {/* Header — mobile only (dashboard uses the AppLayout header) */}
      <header
        className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-[64px] flex items-center">
          <button
            onClick={handleGoBack}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-90 transition-transform mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[16px] font-black text-slate-900 dark:text-white tracking-tight leading-none">
            Apply for Gate Pass
          </h1>
        </div>
      </header>

      <main className="desktop-page flex-1 px-5 pt-6 pb-32 lg:px-0 lg:pt-0 lg:pb-12">
        <div className="max-w-md mx-auto space-y-6 lg:max-w-2xl">
          {isDesktop && (
            <DesktopPageHeader
              eyebrow="Gate Pass"
              title="New Gate Pass Request"
              subtitle="Provide your purpose and details, then submit for staff authorization"
            />
          )}
          {/* Profile Banner */}
          <div className="bg-[var(--color-primary)] rounded-[28px] p-5 flex items-center gap-4 shadow-lg shadow-blue-200 dark:shadow-none">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white text-[22px] font-black">
              {user?.firstName?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
               <h2 className="text-white text-[17px] font-black tracking-tight leading-none mb-1.5 truncate">
                 {user?.firstName} {user?.lastName}
               </h2>
               <div className="flex items-center gap-2">
                 <span className="px-2 py-0.5 bg-white/10 rounded-lg text-white/80 text-[10px] font-bold uppercase tracking-wider">
                   {user?.department}
                 </span>
                 <span className="text-white/60 text-[11px] font-bold tracking-widest">{user?.regNo}</span>
               </div>
            </div>
            <ShieldCheck className="w-8 h-8 text-white/30" />
          </div>

          <div className="space-y-6">
            {/* Purpose Input */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] px-1">
                PURPOSE OF VISIT
              </label>
              <PurposeSelect
                value={purpose}
                onChange={v => { setPurpose(v); fieldProps('purpose', v).onChange({ target: { value: v } } as any); }}
                error={errors.purpose}
                variant="outlined"
              />
            </div>

            {/* Detailed Reason */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] px-1">
                DETAILED REASON
              </label>
              <div className="relative group">
                <div className={cn("absolute left-4 top-5 transition-colors", errors.reason ? "text-rose-400" : "text-slate-300 group-focus-within:text-[var(--color-primary)]")}>
                  <AlignLeft className="w-5 h-5" />
                </div>
                <textarea
                  rows={4}
                  placeholder="Please provide specific details for your outing..."
                  value={reason}
                  onChange={e => { setReason(e.target.value); fieldProps('reason', e.target.value).onChange(e); }}
                  onBlur={fieldProps('reason', reason).onBlur}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 rounded-2xl text-[15px] font-bold text-slate-900 dark:text-white placeholder:text-slate-300 shadow-sm outline-none transition-all resize-none border",
                    errors.reason ? "border-rose-400 focus:ring-2 focus:ring-rose-300/30" : "border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/10"
                  )}
                />
              </div>
              {errors.reason && <p className="text-[11px] font-bold text-rose-500 px-1 mt-1">{errors.reason}</p>}
            </div>

            <AttachmentUpload
              value={attachmentUri}
              fileName={attachmentName}
              onChange={(value, name) => {
                setAttachmentUri(value);
                setAttachmentName(name);
              }}
            />
          </div>

          {/* Desktop submit — inline (mobile uses the fixed bottom bar) */}
          {isDesktop && (
            <div className="pt-2">
              <button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={!isFormValid || isLocked}
                className={cn(
                  "group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-950 bg-slate-950 px-5 text-white shadow-[0_14px_32px_-22px_rgba(15,23,42,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.95)] dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500",
                  (!isFormValid || isLocked) && "cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400 shadow-none hover:translate-y-0 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-800"
                )}
              >
                <span className={cn(
                  "absolute inset-y-0 left-0 w-1 bg-blue-500 transition-opacity",
                  (!isFormValid || isLocked) && "opacity-0"
                )} />
                {isLocked ? (
                  <span className="flex items-center gap-3 text-sm font-bold">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting request
                  </span>
                ) : (
                  <span className="flex items-center gap-3 text-sm font-bold tracking-wide">
                    Review & Submit Request
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Submit Button — mobile fixed bar */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-40 lg:hidden">
        <button 
          onClick={() => setShowConfirmSubmit(true)}
          disabled={!isFormValid || isLocked}
          className={cn(
            "w-full h-15 bg-slate-950 dark:bg-[var(--color-primary)] rounded-2xl flex items-center justify-center gap-3 text-white active:scale-95 transition-all shadow-xl shadow-slate-200 dark:shadow-none",
            (!isFormValid || isLocked) && "opacity-60 saturate-50 cursor-not-allowed"
          )}
        >
          {isLocked ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <span className="text-[16px] font-black uppercase tracking-[0.2em]">Submit Request</span>
          )}
        </button>
      </div>

      {/* Modals */}
      <ConfirmationModal 
        visible={showConfirmSubmit}
        onCancel={() => setShowConfirmSubmit(false)}
        onConfirm={() => {
          setShowConfirmSubmit(false);
          handleSubmit();
        }}
        title="Submit Request"
        message="Are you sure you want to submit this gate pass request for authorization?"
        confirmText="Yes, Submit"
        confirmColor="bg-blue-600 hover:bg-blue-700"
      />

      <SuccessModal 
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigate('/dashboard');
        }}
        title="Request Dispatched"
        message="Your gate pass request has been successfully submitted and is awaiting staff authorization."
      />

      <ErrorModal 
        visible={showError}
        type="general"
        onClose={() => setShowError(false)}
        title="Submission Failed"
        message={errorMessage}
      />
    </div>
  );
}
