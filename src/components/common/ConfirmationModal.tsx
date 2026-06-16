import React, { useState } from 'react';
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

  if (!visible) return null;

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try { await onConfirm(); }
    finally { setConfirming(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9980] flex items-center justify-center p-7 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={confirming ? undefined : onCancel} />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-9 animate-in zoom-in-95 duration-300"
        style={{ width: 'min(470px, calc(100vw - 48px))' }}
      >
        <div className="flex justify-center mb-5">
          <div className="w-22 h-22 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <div className="w-17 h-17 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
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
              className="flex-1 h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-base transition-all hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className={`flex-1 h-13 rounded-2xl ${confirmColor} text-white font-extrabold text-base transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70`}
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
