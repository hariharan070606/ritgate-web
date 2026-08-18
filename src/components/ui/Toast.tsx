import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils/cn';

const icons = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-cyan-500',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none p-4 pt-safe flex justify-center">
      <div className="w-full max-w-sm space-y-3">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const Icon = icons[toast.type];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -100, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={() => removeToast(toast.id)}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3.5 pointer-events-auto active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-black/5",
                  colors[toast.type]
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[16px] font-black text-slate-900 dark:text-white leading-tight mb-1">
                    {toast.title}
                  </h4>
                  <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {toast.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
