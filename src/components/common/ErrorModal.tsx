import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudOff, 
  Server, 
  AlertCircle, 
  Lock, 
  Clock, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type ErrorType = 'network' | 'api' | 'validation' | 'auth' | 'timeout' | 'general';

interface ErrorModalProps {
  visible: boolean;
  type: ErrorType;
  title?: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function ErrorModal({
  visible,
  type,
  title,
  message,
  onClose,
  onRetry,
  autoClose = true,
  autoCloseDelay = 3500,
}: ErrorModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.max(1, Math.ceil(autoCloseDelay / 1000))
  );

  useEffect(() => {
    if (visible && !onRetry) {
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
  }, [visible, autoClose, autoCloseDelay, onRetry, onClose]);

  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return { icon: CloudOff, color: '#F59E0B', defaultTitle: 'Network Connectivity Issue' };
      case 'api':
        return { icon: Server, color: '#EF4444', defaultTitle: 'Service Unavailable' };
      case 'validation':
        return { icon: AlertCircle, color: '#F59E0B', defaultTitle: 'Input Validation Required' };
      case 'auth':
        return { icon: Lock, color: '#EF4444', defaultTitle: 'Authorization Required' };
      case 'timeout':
        return { icon: Clock, color: '#F59E0B', defaultTitle: 'Request Timed Out' };
      default:
        return { icon: AlertTriangle, color: '#EF4444', defaultTitle: 'Something Went Wrong' };
    }
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0F172A]/60 backdrop-blur-sm pt-safe">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl overflow-hidden"
          >
            {/* Hero Section */}
            <div className="pt-4.5 pb-1.5 flex flex-col items-center">
              <div 
                className="h-1.5 w-full absolute top-0" 
                style={{ backgroundColor: config.color }}
              />
              
              <div className="mt-4 flex items-center justify-center">
                <div 
                  className="w-[82px] h-[82px] rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: `${config.color}55` }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}18` }}
                  >
                    <Icon className="w-8 h-8" style={{ color: config.color }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-7 pt-4.5 pb-2.5 flex flex-col items-center text-center">
              <h3 className="text-[22px] font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-2">
                {title || config.defaultTitle}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[260px]">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="p-5 pt-4 flex flex-col gap-3">
              {onRetry && (
                <button
                  onClick={() => {
                    onClose();
                    onRetry();
                  }}
                  className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest text-[13px] shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: config.color }}
                >
                  <RefreshCw className="w-5 h-5" />
                  Retry
                </button>
              )}
              
              <button
                onClick={onClose}
                className="w-full h-15 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {!onRetry && autoClose && (
                  <div className="w-[86%] h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
                      className="h-full"
                      style={{ backgroundColor: config.color }}
                    />
                  </div>
                )}
                <span className="text-[15px] font-extrabold text-slate-500 dark:text-slate-400">
                  {onRetry ? 'Cancel' : (autoClose ? `OK (${secondsRemaining}s)` : 'OK')}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
