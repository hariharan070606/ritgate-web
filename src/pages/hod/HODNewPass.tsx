import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Users, 
  UserPlus, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Plus,
  Ban
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { PASS_COPY } from '../../config/nativeCopy';
import HODNewPassRequest from './HODNewPassRequest';
import HODBulkPass from './HODBulkPass';

/** Returns current hour in IST (UTC+5:30) */
const getISTHour = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 60 * 60 * 1000).getHours();
};

type Stage = 'SELECT' | 'SINGLE' | 'BULK' | 'GUEST';

export default function HODNewPass() {
  usePageTitle('New Pass');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Derive stage from URL query param
  const params = new URLSearchParams(location.search);
  const stageParam = params.get('stage')?.toUpperCase() as Stage | null;
  const stage: Stage = (stageParam && ['SINGLE', 'BULK', 'GUEST'].includes(stageParam)) ? stageParam : 'SELECT';

  const passDisabled = getISTHour() >= 17;

  // Redirect if trying to access SINGLE or BULK after 17:00 IST
  useEffect(() => {
    if (passDisabled && (stage === 'SINGLE' || stage === 'BULK')) {
      navigate('/new-pass', { replace: true });
    }
  }, [stage, passDisabled]);

  const handleBack = () => {
    if (stage === 'SELECT') navigate('/dashboard');
    else navigate('/new-pass');
  };

  const hodName = (user as any)?.hodName || (user as any)?.name || 'HOD Member';

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-[72px] flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-90 transition-transform border border-slate-100 dark:border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[16px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {stage === 'SELECT' ? PASS_COPY.newRequest : stage === 'SINGLE' ? PASS_COPY.singleTitle : stage === 'BULK' ? PASS_COPY.bulkTitle : PASS_COPY.guestTitle}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 pb-28">
        <AnimatePresence mode="wait">
          {stage === 'SELECT' && (
            <motion.div 
               key="stage-selection"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-6"
            >
               <div className="mb-8">
                  <h2 className="text-[24px] font-black text-slate-900 dark:text-white leading-tight">{PASS_COPY.selectTitle}</h2>
                  <p className="text-[14px] font-bold text-slate-400 mt-1">{PASS_COPY.selectSubtitle}</p>
               </div>

               <div className="grid gap-4">
                  {[
                    { id: 'SINGLE', title: PASS_COPY.singleTitle, sub: PASS_COPY.singleSubtitle, icon: UserPlus, color: 'text-white', bg: 'bg-gradient-to-br from-[#4facfe] to-[#00f2fe]', restricted: true },
                    { id: 'BULK', title: PASS_COPY.bulkTitle, sub: PASS_COPY.bulkSubtitle, icon: Users, color: 'text-white', bg: 'bg-gradient-to-br from-[#667eea] to-[#764ba2]', restricted: true },
                    { id: 'GUEST', title: PASS_COPY.guestTitle, sub: PASS_COPY.guestSubtitle, icon: FileText, color: 'text-white', bg: 'bg-gradient-to-br from-[#0d9488] to-[#14b8a6]', restricted: false },
                  ].map((card) => {
                    const Icon = card.icon;
                    const isDisabled = card.restricted && passDisabled;
                    return (
                      <motion.button
                        key={card.id}
                        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          if (card.id === 'GUEST') navigate('/guest-register');
                          else navigate(`/new-pass?stage=${card.id.toLowerCase()}`);
                        }}
                        className={cn(
                          "w-full p-6 rounded-[32px] border flex items-center gap-5 text-left shadow-sm transition-all",
                          isDisabled
                            ? "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 active:shadow-none"
                        )}
                      >
                         <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg", isDisabled ? "bg-slate-200 dark:bg-slate-800" : card.bg)}>
                            <Icon className={cn("w-7 h-7", isDisabled ? "text-slate-400" : card.color)} />
                         </div>
                         <div className="flex-1">
                            <h3 className={cn("text-[17px] font-black tracking-tight leading-none mb-1.5", isDisabled ? "text-slate-400" : "text-slate-900 dark:text-white")}>{card.title}</h3>
                            <p className="text-[13px] font-bold text-slate-400">
                              {isDisabled ? PASS_COPY.unavailableAfterFive : card.sub}
                            </p>
                         </div>
                         {isDisabled ? (
                           <Ban className="w-5 h-5 text-rose-400 shrink-0" />
                         ) : (
                           <ChevronRight className="w-5 h-5 text-slate-200" />
                         )}
                      </motion.button>
                    );
                  })}
               </div>
            </motion.div>
          )}

          {stage === 'SINGLE' && (
            <motion.div 
               key="stage-single"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="h-full"
            >
               <HODNewPassRequest user={user} onBack={() => navigate('/new-pass')} />
            </motion.div>
          )}

          {stage === 'BULK' && (
             <motion.div 
               key="stage-bulk"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="h-full"
             >
                <HODBulkPass onBack={() => navigate('/new-pass')} />
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
