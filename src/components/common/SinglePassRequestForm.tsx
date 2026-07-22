import type { ReactNode } from 'react';
import { AlignLeft, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import PurposeSelect from './PurposeSelect';
import AttachmentUpload from './AttachmentUpload';
import { cn } from '../../utils/cn';

interface SinglePassRequestFormProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  profileName: string;
  profileMeta?: string;
  initials: string;
  purpose: string;
  onPurposeChange: (value: string) => void;
  purposeError?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onReasonBlur?: () => void;
  reasonError?: string;
  reasonPlaceholder?: string;
  attachmentUri: string;
  attachmentName?: string;
  onAttachmentChange: (value: string, name?: string) => void;
  submitText: string;
  submitting?: boolean;
  disabled?: boolean;
  onSubmit: () => void;
  submitDesktopOnly?: boolean;
  buttonIcon?: ReactNode;
  className?: string;
}

export default function SinglePassRequestForm({
  eyebrow = 'Single Pass Request',
  title = 'Gate Pass Request',
  subtitle = 'Provide the purpose, reason, and optional attachment for this request.',
  profileName,
  profileMeta,
  initials,
  purpose,
  onPurposeChange,
  purposeError,
  reason,
  onReasonChange,
  onReasonBlur,
  reasonError,
  reasonPlaceholder = 'Please provide specific details for this request...',
  attachmentUri,
  attachmentName,
  onAttachmentChange,
  submitText,
  submitting = false,
  disabled = false,
  onSubmit,
  submitDesktopOnly = false,
  buttonIcon,
  className,
}: SinglePassRequestFormProps) {
  return (
    <section className={cn('mx-auto w-full max-w-3xl space-y-5 lg:max-w-4xl', className)}>
      <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] dark:border-slate-800/70 dark:bg-slate-900">
        <div className="space-y-5 px-5 py-6 lg:px-7 lg:py-7">
          <div>
            {eyebrow && (
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {eyebrow}
              </p>
            )}
            <h3 className="text-[20px] font-black leading-tight tracking-tight text-slate-950 dark:text-white lg:text-[24px]">
              {title}
            </h3>
            <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400 lg:text-[14px]">
              {subtitle}
            </p>
          </div>

          <div className="grid gap-5">
            <div className="space-y-2.5">
              <label className="block px-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Purpose of Visit
              </label>
              <PurposeSelect
                value={purpose}
                onChange={onPurposeChange}
                error={purposeError}
                variant="outlined"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block px-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Detailed Reason
              </label>
              <div className="group relative">
                <AlignLeft
                  className={cn(
                    'absolute left-4 top-4 h-5 w-5 transition-colors',
                    reasonError ? 'text-rose-400' : 'text-slate-300 group-focus-within:text-blue-600'
                  )}
                />
                <textarea
                  rows={4}
                  placeholder={reasonPlaceholder}
                  value={reason}
                  onChange={event => onReasonChange(event.target.value)}
                  onBlur={onReasonBlur}
                  className={cn(
                    'min-h-[128px] w-full resize-none rounded-2xl border bg-white/90 py-4 pl-12 pr-4 text-[15px] font-bold text-slate-950 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:ring-4 dark:bg-slate-950 dark:text-white',
                    reasonError
                      ? 'border-rose-400 focus:ring-rose-300/25'
                      : 'border-slate-200/80 focus:border-blue-400 focus:ring-blue-500/10 dark:border-slate-800'
                  )}
                />
              </div>
              {reasonError && (
                <p className="px-1 text-[11px] font-bold text-rose-500">{reasonError}</p>
              )}
            </div>

            <AttachmentUpload
              value={attachmentUri}
              fileName={attachmentName}
              onChange={onAttachmentChange}
            />
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || submitting}
            className={cn(
              'group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black px-6 text-[14px] uppercase tracking-[0.16em] shadow-lg shadow-blue-600/30 border border-blue-500 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:ml-auto sm:max-w-[18rem]',
              (disabled || submitting) && 'cursor-not-allowed opacity-55 shadow-none hover:translate-y-0',
              submitDesktopOnly && 'hidden lg:flex'
            )}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              buttonIcon || <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            )}
            <span>{submitting ? 'Submitting request' : submitText}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
