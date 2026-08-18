import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'bg-blue-500 hover:bg-[var(--color-primary)]',
  icon,
  onConfirm,
  onCancel,
}) => {
  const [confirming, setConfirming] = useState(false);

  // Lock body scroll to prevent double scrollbars
  useEffect(() => {
    if (visible) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [visible]);

  if (!visible) return null;

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try { await onConfirm(); }
    finally { setConfirming(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9980] flex items-center justify-center p-7 bg-slate-950/45 backdrop-blur-[7px] animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={confirming ? undefined : onCancel} />
      <div
        className="relative rounded-[24px] border border-white/55 bg-white/88 p-9 shadow-[0_28px_90px_-32px_rgba(37,99,235,0.65)] backdrop-blur-2xl animate-in zoom-in-95 duration-300 dark:border-slate-700/70 dark:bg-slate-900/90"
        style={{ width: 'min(470px, calc(100vw - 48px))' }}
      >
        <div className="flex justify-center mb-5">
          <div className="w-22 h-22 rounded-full bg-blue-50/80 ring-1 ring-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
            <div className="w-17 h-17 rounded-full bg-blue-100/90 dark:bg-blue-900/40 flex items-center justify-center">
              {icon || <AlertCircle className="w-9 h-9 text-blue-700" />}
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2.5 text-center tracking-tight">
          {title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed text-center mb-8 px-2">
          {message}
        </p>

        <div className="flex gap-3">
          {cancelText && (
            <button
              onClick={onCancel}
              disabled={confirming}
              className="flex-1 h-13 rounded-2xl border border-slate-200/80 bg-white/72 text-slate-600 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-blue-50/70 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className={`flex-1 h-13 rounded-2xl ${confirmColor} text-white font-extrabold text-base transition-all shadow-[0_16px_34px_-18px_rgba(37,99,235,0.8)] hover:-translate-y-0.5 hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70`}
          >
            {confirming
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
