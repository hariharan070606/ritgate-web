import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../../utils/cn';

interface GatePassQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  personId: string;
  qrCodeData: string | null;
  manualCode?: string | null;
  reason?: string;
  validUntil?: string;
  qrExpiresAt?: string | null;
  showShare?: boolean;
}

export default function GatePassQRModal({
  isOpen,
  onClose,
  personName,
  personId,
  qrCodeData,
  manualCode,
  reason,
  validUntil = 'One time',
  qrExpiresAt,
  showShare = false,
}: GatePassQRModalProps) {
  const [copied, setCopied] = React.useState(false);

  const formatValidUntil = (val: string) => {
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return val; }
  };

  const handleCopy = () => {
    if (manualCode) {
      navigator.clipboard.writeText(manualCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm pt-safe">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ maxWidth: '440px' }}
            className="relative w-full max-w-md gate-pass-qr-card mx-auto bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/90 dark:border-slate-800 shadow-[0_24px_60px_rgba(15,23,42,0.25)] overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Gate Pass QR Code</h3>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 flex flex-col items-center">
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                {personName.toUpperCase()}
              </h4>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-6">
                {personId}
              </p>

              {/* QR Code */}
              <div className="p-6 bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] mb-6 border border-slate-50">
                {qrCodeData ? (
                  <QRCodeSVG
                    value={qrCodeData}
                    size={200}
                    level="H"
                    fgColor="#0F172A"
                    bgColor="#FFFFFF"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Loading...</span>
                  </div>
                )}
              </div>

              {/* Manual Entry Code */}
              {manualCode && (
                <div 
                  className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 flex flex-col items-center gap-1 mb-4 cursor-pointer active:bg-slate-50 transition-colors"
                  onClick={handleCopy}
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Manual Entry Code</span>
                  <div className="flex items-center gap-3">
                    <code className="text-3xl font-black text-slate-900 dark:text-white tracking-[0.3em] ml-4">
                      {manualCode}
                    </code>
                    {copied ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-300" />}
                  </div>
                </div>
              )}

              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                Scan at Main Gate · One-time Use
              </p>

              {/* Details Column */}
              <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Reason:</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white text-right leading-tight truncate">
                    {reason || 'Gate Pass'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Valid Until:</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {formatValidUntil(validUntil)}
                  </span>
                </div>
              </div>

              {/* Share actions */}
              {showShare && (
                <div className="flex gap-3 mt-6 w-full">
                  <button className="flex-1 h-14 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest text-[13px] shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-transform">
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
