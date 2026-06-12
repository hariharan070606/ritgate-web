import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, UserPlus, ChevronRight, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { PASS_COPY } from '../../config/nativeCopy';

interface PassTypeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSingle?: () => void;
  onSelectBulk?: () => void;
  onSelectGuest?: () => void;
}

/** Returns current time in IST (UTC+5:30) as { hours, minutes } */
const getISTTime = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  return { hours: ist.getHours(), minutes: ist.getMinutes() };
};

/** Staff / HOD / NTF / NCI: gate pass disabled after 17:00 IST */
const isStaffPassDisabled = () => {
  const { hours } = getISTTime();
  return hours >= 17;
};

export default function PassTypeBottomSheet({ 
  isOpen, 
  onClose,
  onSelectSingle,
  onSelectBulk,
  onSelectGuest
}: PassTypeBottomSheetProps) {
  const navigate = useNavigate();
  const passDisabled = isStaffPassDisabled();

  const handleSelect = (path: string, disabled: boolean = false) => {
    if (disabled) return;
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 z-[150] backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 rounded-t-[32px] z-[160] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden pb-safe"
          >
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pt-2 pb-6">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">{PASS_COPY.selectTitle}</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {PASS_COPY.selectSubtitle}
              </p>
            </div>

            {/* Pass Type Cards */}
            <div className="px-6 space-y-4 mb-6">
              {/* Single Pass Card */}
              <button
                disabled={passDisabled}
                onClick={() => handleSelect('/new-pass?stage=single', passDisabled)}
                className={cn(
                  "w-full flex items-center p-4 rounded-[20px] border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.98] group relative",
                  passDisabled ? "bg-slate-50 dark:bg-slate-900/40 opacity-60" : "bg-white dark:bg-slate-900 hover:border-sky-200 dark:hover:border-sky-900"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105",
                  passDisabled ? "bg-slate-400" : "bg-gradient-to-br from-[#4facfe] to-[#00f2fe]"
                )}>
                  <User className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 ml-4 text-left">
                  <h3 className={cn(
                    "text-base font-bold mb-0.5",
                    passDisabled ? "text-slate-400" : "text-slate-900 dark:text-white"
                  )}>{PASS_COPY.singleTitle}</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {passDisabled ? PASS_COPY.unavailableAfterFive : PASS_COPY.singleSubtitle}
                  </p>
                </div>
                <div className="ml-2">
                  {passDisabled ? (
                    <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                       <Ban className="w-5 h-5 text-rose-500" />
                    </div>
                  ) : (
                    <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-sky-500 transition-colors" />
                  )}
                </div>
              </button>

              {/* Bulk Pass Card */}
              <button
                disabled={passDisabled}
                onClick={() => handleSelect('/new-pass?stage=bulk', passDisabled)}
                className={cn(
                  "w-full flex items-center p-4 rounded-[20px] border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.98] group relative",
                  passDisabled ? "bg-slate-50 dark:bg-slate-900/40 opacity-60" : "bg-white dark:bg-slate-900 hover:border-purple-200 dark:hover:border-purple-900"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105",
                  passDisabled ? "bg-slate-400" : "bg-gradient-to-br from-[#667eea] to-[#764ba2]"
                )}>
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 ml-4 text-left">
                  <h3 className={cn(
                    "text-base font-bold mb-0.5",
                    passDisabled ? "text-slate-400" : "text-slate-900 dark:text-white"
                  )}>{PASS_COPY.bulkTitle}</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {passDisabled ? PASS_COPY.unavailableAfterFive : PASS_COPY.bulkSubtitle}
                  </p>
                </div>
                <div className="ml-2">
                  {passDisabled ? (
                    <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                       <Ban className="w-5 h-5 text-rose-500" />
                    </div>
                  ) : (
                    <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-purple-500 transition-colors" />
                  )}
                </div>
              </button>

              {/* Guest Card */}
              <button
                onClick={() => handleSelect('/new-pass?stage=guest')}
                className="w-full flex items-center p-4 rounded-[20px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all active:scale-[0.98] group relative hover:border-teal-200 dark:hover:border-teal-900"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0d9488] to-[#14b8a6] flex items-center justify-center shrink-0 shadow-lg shadow-teal-100 dark:shadow-none transition-transform group-hover:scale-105">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 ml-4 text-left">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{PASS_COPY.guestTitle}</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {PASS_COPY.guestSubtitle}
                  </p>
                </div>
                <div className="ml-2">
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-teal-500 transition-colors" />
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="px-6 pb-8">
              <button
                onClick={onClose}
                className="w-full py-4.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-base font-bold text-slate-500 dark:text-slate-300 active:scale-95 transition-all text-center"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
