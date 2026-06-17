import React, { useState, useRef, useEffect } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Users, 
  UserPlus, 
  ArrowLeft, 
  ChevronRight,
  Ban
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { submitStaffGatePass } from '../../services/api.service';
import type { Staff } from '../../types';
import { cn } from '../../utils/cn';
import { getRequestDate } from '../../utils/dateUtils';
import { PASS_COPY } from '../../config/nativeCopy';
import StaffBulkPass from './StaffBulkPass';
import HRNewPass from '../hr/HRNewPass';
import AdminNewPass from '../admin/AdminNewPass';
import GuestPreRequest from '../shared/GuestPreRequest';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';

/** Returns current hour in IST (UTC+5:30) */
const getISTHour = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 60 * 60 * 1000).getHours();
};

type Stage = 'SELECT' | 'SINGLE' | 'BULK' | 'GUEST';

export default function StaffNewPass() {
  usePageTitle('New Pass');
  const navigate = useNavigate();
  const location = useLocation();
  const { user: rawUser, getUserId, role } = useAuth();
  const user = rawUser as Staff;
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const staffCode = getUserId();

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

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');

  const staffName = (user as any)?.staffName || (user as any)?.name || 'Staff Member';
  const initials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleBack = () => {
    if (stage === 'SELECT') navigate('/dashboard');
    else navigate('/new-pass');
  };

  const submitSingle = async () => {
     if (!purpose.trim() || !reason.trim()) return showToastError('Missing Fields', 'Please fill all required fields');
     await withLock(async () => {
        try {
          const res = await submitStaffGatePass({
            staffCode,
            purpose: purpose.trim(),
            reason: reason.trim(),
            requestDate: getRequestDate()
          });
          if (res.success) {
            showToastSuccess('Request Sent', 'Your gate pass authorization has been submitted');
            navigate('/new-pass');
            setPurpose(''); setReason('');
          } else showToastError('Failed', res.message);
        } catch { showToastError('Error', 'An internal error occurred'); }
     }, 'Dispatching authorization...');
  };

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
            className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[16px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {stage === 'SELECT' ? PASS_COPY.newRequest : stage === 'SINGLE' ? PASS_COPY.singleTitle : stage === 'BULK' ? PASS_COPY.bulkTitle : PASS_COPY.guestTitle}
          </h1>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="desktop-page flex-1 px-5 py-6 pb-28 lg:px-0 lg:pt-0 lg:pb-12">
        <DesktopPageHeader
          title={stage === 'SELECT' ? PASS_COPY.newRequest : stage === 'SINGLE' ? PASS_COPY.singleTitle : stage === 'BULK' ? PASS_COPY.bulkTitle : PASS_COPY.guestTitle}
          subtitle={stage === 'SELECT' ? PASS_COPY.selectSubtitle : 'Create and manage gate pass clearance with the app wording and desktop spacing.'}
          eyebrow="Gate Pass Control"
        />
        <AnimatePresence mode="wait">
          {stage === 'SELECT' && (
            <motion.div 
               key="selection"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-6"
            >
               <div className="mb-4 lg:hidden">
                  <h2 className="text-[24px] font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight">{PASS_COPY.selectTitle}</h2>
                  <p className="text-[14px] font-bold text-slate-400">{PASS_COPY.selectSubtitle}</p>
               </div>

               <div className="grid gap-6 lg:grid-cols-3 lg:gap-6 lg:pt-2">
                  {[
                    { id: 'SINGLE', title: PASS_COPY.singleTitle, sub: PASS_COPY.singleSubtitle, icon: UserPlus, accent: 'blue', restricted: true },
                    { id: 'BULK', title: PASS_COPY.bulkTitle, sub: PASS_COPY.bulkSubtitle, icon: Users, accent: 'violet', restricted: true },
                    { id: 'GUEST', title: PASS_COPY.guestTitle, sub: PASS_COPY.guestSubtitle, icon: FileText, accent: 'emerald', restricted: false },
                  ].filter(item => {
                    // HR, NCI, NTF, and Admin Officer only get Single + Guest — no bulk
                    if (item.id === 'BULK' && ['HR', 'NON_CLASS_INCHARGE', 'NON_TEACHING', 'ADMIN_OFFICER'].includes(role || '')) return false;
                    return true;
                  }).map((item) => {
                    const isDisabled = item.restricted && passDisabled;
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
                    const accent = accentMap[item.accent as keyof typeof accentMap] ?? accentMap.blue;
                    return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && navigate(`/new-pass?stage=${item.id.toLowerCase()}`)}
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
                          <item.icon className="h-7 w-7 lg:h-9 lg:w-9" />
                       </div>
                       <div className="relative z-10 flex-1 min-w-0 lg:w-full">
                          <h3 className={cn("text-[16px] font-black tracking-tight mb-2 lg:text-[19px]", isDisabled ? "text-slate-400" : "text-slate-900 dark:text-white")}>{item.title}</h3>
                          <div className={cn("mb-5 hidden h-0.5 w-8 rounded-full lg:block", isDisabled ? "bg-slate-200 dark:bg-slate-700" : accent.line)} />
                          <p className="text-[12px] font-bold leading-relaxed text-slate-500 dark:text-slate-400 lg:max-w-[220px] lg:text-[14px]">
                            {isDisabled ? PASS_COPY.unavailableAfterFive : item.sub}
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
               key="single"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="space-y-6"
             >
               {/* HR and ADMIN get their own instant-approval forms */}
               {role === 'HR' ? (
                 <HRNewPass />
               ) : role === 'ADMIN_OFFICER' ? (
                 <AdminNewPass />
               ) : (
                <div className="space-y-5">
                   {/* Staff banner */}
                   <div className="bg-violet-600 rounded-[32px] p-6 text-white flex items-center gap-5 shadow-xl shadow-violet-100 dark:shadow-none">
                     <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center font-black text-[24px]">
                       {initials}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h3 className="text-[18px] font-black leading-none mb-1 truncate">{staffName}</h3>
                       <p className="text-[13px] font-bold text-violet-100 opacity-90 uppercase tracking-widest leading-none truncate">
                         Staff • {user?.department || 'RIT'}
                       </p>
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose of Exit</label>
                     <PurposeSelect value={purpose} onChange={setPurpose} />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Reason</label>
                     <textarea 
                       value={reason}
                       onChange={(e) => setReason(e.target.value)}
                       placeholder="Please provide more context..."
                       className="w-full h-28 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[15px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none resize-none"
                     />
                   </div>

                   <div className="pt-2 pb-10">
                     <button 
                       onClick={submitSingle}
                       className="w-full h-14 bg-violet-600 rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-xl shadow-violet-100 dark:shadow-none transition-all active:scale-[0.98]"
                     >
                       {PASS_COPY.sendRequest}
                     </button>
                   </div>
                </div>
               )}
             </motion.div>
          )}

          {stage === 'BULK' && (
             <motion.div key="bulk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               <StaffBulkPass onBack={() => navigate('/new-pass')} />
             </motion.div>
          )}

          {stage === 'GUEST' && (
             <motion.div 
               key="guest"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="space-y-6"
             >
                <GuestPreRequest embedded onBack={() => navigate('/new-pass')} />
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
