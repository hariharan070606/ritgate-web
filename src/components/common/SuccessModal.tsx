import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function SuccessModal({
  visible,
  title = 'Completed Successfully',
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 2500,
}: SuccessModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.max(1, Math.ceil(autoCloseDelay / 1000))
  );

  useEffect(() => {
    if (visible) {
      const initialSeconds = Math.max(1, Math.ceil(autoCloseDelay / 1000));
      setSecondsRemaining(initialSeconds);
      
      if (autoClose) {
        const countdownTimer = setInterval(() => {
          setSecondsRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
        
        return () => {
          clearTimeout(timer);
          clearInterval(countdownTimer);
        };
      }
    }
  }, [visible, autoClose, autoCloseDelay, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md pt-safe">
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/30 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(16,185,129,0.25)] overflow-hidden w-full max-w-[420px]"
          >
            {/* Top Emerald Gradient Strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            
            {/* Animated Icon & Badge */}
            <div className="pt-7 pb-2 flex flex-col items-center justify-center relative">
              <div className="relative flex items-center justify-center">
                {/* Outer pulsing ring */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: [0.95, 1.25, 0.95], opacity: [0.6, 0.15, 0.6] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-emerald-500/30 blur-sm"
                />
                {/* Middle ring */}
                <div className="w-[88px] h-[88px] rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center relative z-10 shadow-inner">
                  {/* Inner check icon badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.1 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/40"
                  >
                    <Check className="w-9 h-9 stroke-[3]" />
                  </motion.div>
                </div>
              </div>

              {/* Status Badge */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="mt-4 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Status: Dispatched
                </span>
              </motion.div>
            </div>

            {/* Content */}
            <div className="px-7 pt-3 pb-4 flex flex-col items-center text-center">
              <motion.h3
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[23px] font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-2"
              >
                {title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="text-[14px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed max-w-[320px]"
              >
                {message}
              </motion.p>
            </div>

            {/* Actions & Progress Button */}
            <div className="p-6 pt-2">
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                className="relative overflow-hidden w-full h-14 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-2xl font-black text-[15px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 dark:shadow-emerald-900/30"
              >
                {/* Background Auto-close progress bar */}
                {autoClose && (
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
                    className="absolute inset-y-0 left-0 bg-emerald-500/30 dark:bg-white/20 pointer-events-none"
                  />
                )}
                
                <span className="relative z-10 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 dark:text-emerald-200" />
                  <span>{autoClose ? `OK (${secondsRemaining}s)` : 'OK'}</span>
                </span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
