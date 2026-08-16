import React, { useState, useRef, useEffect } from 'react';
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
import SinglePassRequestForm from '../../components/common/SinglePassRequestForm';

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
  const [attachmentUri, setAttachmentUri] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();

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
            requestDate: getRequestDate(),
            attachmentUri: attachmentUri || undefined,
          });
          if (res.success) {
            showToastSuccess('Request Sent', 'Your gate pass authorization has been submitted');
            navigate('/new-pass');
            setPurpose(''); setReason(''); setAttachmentUri(''); setAttachmentName(undefined);
          } else showToastError('Failed', res.message);
        } catch { showToastError('Error', 'An internal error occurred'); }
     }, 'Dispatching authorization...');
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen w-full max-w-full overflow-x-hidden flex flex-col box-border">
      {/* Header */}
      <header
        className="sticky inset-x-0 top-0 z-[90] bg-white/94 dark:bg-slate-950/95 border-b border-slate-100 dark:border-slate-800 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl shrink-0 lg:hidden box-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="relative flex items-center h-[64px] px-4 w-full max-w-full box-border">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-90 transition-transform shrink-0 z-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="absolute left-16 right-16 text-center text-[20px] font-black text-slate-900 dark:text-white tracking-tight leading-none truncate uppercase">
            {stage === 'SELECT' ? PASS_COPY.newRequest : stage === 'SINGLE' ? PASS_COPY.singleTitle : stage === 'BULK' ? PASS_COPY.bulkTitle : PASS_COPY.guestTitle}
          </h1>
        </div>
      </header>

      <main className="desktop-page flex-1 w-full max-w-full px-4 sm:px-5 py-4 sm:py-6 pb-24 lg:px-0 lg:pt-0 lg:pb-0 box-border overflow-x-hidden flex flex-col">
        <DesktopPageHeader
          title={stage === 'SELECT' ? PASS_COPY.newRequest : stage === 'SINGLE' ? PASS_COPY.singleTitle : stage === 'BULK' ? PASS_COPY.bulkTitle : PASS_COPY.guestTitle}
          subtitle={stage === 'SELECT' ? PASS_COPY.selectSubtitle : 'Create and manage gate pass clearance with the app wording and desktop spacing.'}
          eyebrow="Gate Pass Control"
        />
        <AnimatePresence mode="wait">
          {stage === 'SELECT' && (
            <motion.div 
               key="selection"
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="w-full flex-1 flex flex-col justify-between"
               style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
               {/* Container Box with 4 Curved Corners — Stretches till bottom */}
               <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm w-full flex-1 flex flex-col justify-between space-y-6">
                 
                 {/* Section Header */}
                 <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
                   <h2 className="text-[20px] sm:text-[24px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                     {PASS_COPY.selectTitle}
                   </h2>
                   <p className="text-[13px] sm:text-[14px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                     {PASS_COPY.selectSubtitle}
                   </p>
                 </div>

                 {/* Cards Responsive Grid — 1 Single Line for Desktop (md:grid-cols-3) */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 w-full items-stretch flex-1 my-auto">
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
                          glow: 'from-blue-500/0 via-blue-500/0 to-blue-500/10',
                          line: 'bg-blue-600',
                          arrow: 'text-blue-700',
                        },
                        violet: {
                          icon: 'bg-violet-50 text-violet-600 ring-violet-100 shadow-violet-100/70',
                          glow: 'from-violet-500/0 via-violet-500/0 to-violet-500/10',
                          line: 'bg-violet-600',
                          arrow: 'text-violet-600',
                        },
                        emerald: {
                          icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100 shadow-emerald-100/70',
                          glow: 'from-emerald-500/0 via-emerald-500/0 to-emerald-500/10',
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
                          "group relative w-full overflow-hidden rounded-[24px] border text-left transition-all duration-300",
                          "flex flex-col justify-between p-6 sm:p-7 shadow-xs hover:shadow-md min-h-[220px] sm:min-h-[260px]",
                          isDisabled
                            ? "bg-slate-50/70 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800 opacity-60 cursor-not-allowed"
                            : "bg-slate-50/60 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 active:shadow-none"
                        )}
                      >
                         {!isDisabled && (
                           <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", accent.glow)} />
                         )}
                         
                         {/* Top Row Icon */}
                         <div className="flex items-center justify-between w-full relative z-10 mb-6">
                           <div className={cn(
                             "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-md transition-transform duration-300 group-hover:scale-105",
                             isDisabled ? "bg-slate-200 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700" : accent.icon,
                           )}>
                              <item.icon className="h-7 w-7" />
                           </div>

                           {isDisabled ? (
                             <Ban className="h-6 w-6 text-rose-400" />
                           ) : (
                             <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 shadow-sm group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-all duration-300">
                               <ChevronRight className="h-5 w-5" />
                             </span>
                           )}
                         </div>

                         {/* Content Section */}
                         <div className="relative z-10 w-full mt-auto">
                            <h3 className={cn("text-[17px] sm:text-[19px] font-black tracking-tight mb-2", isDisabled ? "text-slate-400" : "text-slate-900 dark:text-white")}>
                              {item.title}
                            </h3>
                            <div className={cn("mb-3 h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-12", isDisabled ? "bg-slate-200 dark:bg-slate-700" : accent.line)} />
                            <p className="text-[13px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                              {isDisabled ? PASS_COPY.unavailableAfterFive : item.sub}
                            </p>
                         </div>
                      </motion.button>
                      );
                    })}
                 </div>

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
                <SinglePassRequestForm
                  eyebrow="Single Pass Request"
                  title={PASS_COPY.singleTitle}
                  subtitle="Provide the purpose, reason, and optional attachment for this request."
                  profileName={staffName}
                  profileMeta={`Staff - ${user?.department || 'RIT'}`}
                  initials={initials}
                  purpose={purpose}
                  onPurposeChange={setPurpose}
                  reason={reason}
                  onReasonChange={setReason}
                  reasonPlaceholder="Please provide more context..."
                  attachmentUri={attachmentUri}
                  attachmentName={attachmentName}
                  onAttachmentChange={(value, name) => {
                    setAttachmentUri(value);
                    setAttachmentName(name);
                  }}
                  submitText={PASS_COPY.sendRequest}
                  disabled={!purpose.trim() || !reason.trim()}
                  onSubmit={submitSingle}
                />
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
