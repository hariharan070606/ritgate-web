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
import GuestPreRequest from '../shared/GuestPreRequest';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';

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
        className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 lg:hidden"
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

      <main className="desktop-page flex-1 px-5 py-6 pb-28 lg:px-0 lg:pt-0 lg:pb-12">
        <DesktopPageHeader
          title={stage === 'SELECT' ? PASS_COPY.newRequest : stage === 'SINGLE' ? PASS_COPY.singleTitle : stage === 'BULK' ? PASS_COPY.bulkTitle : PASS_COPY.guestTitle}
          subtitle={stage === 'SELECT' ? PASS_COPY.selectSubtitle : 'Create department gate passes with HOD-level controls.'}
          eyebrow="HOD Gate Pass Control"
        />
        <AnimatePresence mode="wait">
          {stage === 'SELECT' && (
            <motion.div 
               key="stage-selection"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-6"
            >
               <div className="mb-8 lg:hidden">
                  <h2 className="text-[24px] font-black text-slate-900 dark:text-white leading-tight">{PASS_COPY.selectTitle}</h2>
                  <p className="text-[14px] font-bold text-slate-400 mt-1">{PASS_COPY.selectSubtitle}</p>
               </div>

               <div className="grid gap-6 lg:grid-cols-3 lg:gap-6">
                  {[
                    { id: 'SINGLE', title: PASS_COPY.singleTitle, sub: PASS_COPY.singleSubtitle, icon: UserPlus, accent: 'blue', restricted: true },
                    { id: 'BULK', title: PASS_COPY.bulkTitle, sub: PASS_COPY.bulkSubtitle, icon: Users, accent: 'violet', restricted: true },
                    { id: 'GUEST', title: PASS_COPY.guestTitle, sub: PASS_COPY.guestSubtitle, icon: FileText, accent: 'emerald', restricted: false },
                  ].map((card) => {
                    const Icon = card.icon;
                    const isDisabled = card.restricted && passDisabled;
                    const accentMap = {
                      blue: {
                        icon: 'bg-blue-50 text-blue-700 ring-blue-100 shadow-blue-100/70',
                        glow: 'from-blue-500/0 via-blue-500/0 to-blue-500/12',
                        line: 'bg-blue-700',
                        arrow: 'text-blue-700',
                      },
                      violet: {
                        icon: 'bg-violet-50 text-violet-600 ring-violet-100 shadow-violet-100/70',
                        glow: 'from-violet-500/0 via-violet-500/0 to-violet-500/12',
                        line: 'bg-violet-600',
                        arrow: 'text-violet-600',
                      },
                      emerald: {
                        icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100 shadow-emerald-100/70',
                        glow: 'from-emerald-500/0 via-emerald-500/0 to-emerald-500/12',
                        line: 'bg-emerald-500',
                        arrow: 'text-emerald-600',
                      },
                    };
                    const accent = accentMap[card.accent as keyof typeof accentMap] ?? accentMap.blue;
                    return (
                      <motion.button
                        key={card.id}
                        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          navigate(`/new-pass?stage=${card.id.toLowerCase()}`);
                        }}
                        className={cn(
                          "group relative w-full overflow-hidden rounded-[14px] border text-left transition-all",
                          "flex items-center gap-5 p-6 shadow-sm lg:min-h-[340px] lg:flex-col lg:items-start lg:justify-between lg:p-8 lg:shadow-[0_18px_48px_-30px_rgba(15,23,42,0.45)] lg:hover:-translate-y-1 lg:hover:shadow-[0_26px_60px_-34px_rgba(15,23,42,0.65)]",
                          isDisabled
                            ? "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 active:shadow-none"
                        )}
                      >
                         {!isDisabled && (
                           <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", accent.glow)} />
                         )}
                         <div className={cn(
                           "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-1 lg:h-[76px] lg:w-[76px] lg:shadow-xl",
                           isDisabled ? "bg-slate-200 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" : accent.icon,
                         )}>
                           <Icon className="h-7 w-7 lg:h-9 lg:w-9" />
                         </div>
                         <div className="relative z-10 flex-1 min-w-0 lg:w-full">
                            <h3 className={cn("text-[16px] font-black tracking-tight mb-2 lg:text-[19px]", isDisabled ? "text-slate-400" : "text-slate-900 dark:text-white")}>{card.title}</h3>
                            <div className={cn("mb-5 hidden h-0.5 w-8 rounded-full lg:block", isDisabled ? "bg-slate-200 dark:bg-slate-700" : accent.line)} />
                            <p className="text-[12px] font-bold leading-relaxed text-slate-500 dark:text-slate-400 lg:max-w-[220px] lg:text-[14px]">
                              {isDisabled ? PASS_COPY.unavailableAfterFive : card.sub}
                            </p>
                         </div>
                         {isDisabled ? (
                           <Ban className="relative z-10 h-5 w-5 text-rose-400" />
                         ) : (
                           <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.6)] ring-1 ring-slate-100 transition-all group-hover:translate-x-1 dark:bg-slate-950 dark:ring-slate-800 lg:mt-auto">
                             <ChevronRight className={cn("h-5 w-5", accent.arrow)} />
                           </span>
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

          {stage === 'GUEST' && (
             <motion.div 
               key="stage-guest"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="h-full"
             >
                <GuestPreRequest embedded onBack={() => navigate('/new-pass')} />
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
