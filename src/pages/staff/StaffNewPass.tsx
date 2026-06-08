import React, { useState, useRef, useEffect } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Users, 
  UserPlus, 
  ArrowLeft, 
  X,
  Plus,
  ChevronRight,
  LayoutGrid,
  Ban
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { submitStaffGatePass, createInstantGuestPass } from '../../services/api.service';
import type { Staff } from '../../types';
import { cn } from '../../utils/cn';
import { getRequestDate } from '../../utils/dateUtils';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import StaffBulkPass from './StaffBulkPass';
import HRNewPass from '../hr/HRNewPass';
import AdminNewPass from '../admin/AdminNewPass';

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
  const [attachment, setAttachment] = useState<{ name: string; uri: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guest Fields
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPurpose, setGuestPurpose] = useState('');
  const [guestQRModal, setGuestQRModal] = useState(false);
  const [guestQRData, setGuestQRData] = useState<any>(null);

  const staffName = (user as any)?.staffName || (user as any)?.name || 'Staff Member';
  const initials = staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return showToastError('Limit Exceeded', 'Maximum file size is 5MB');
      const reader = new FileReader();
      reader.onload = () => setAttachment({ name: file.name, uri: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

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
            attachmentUri: attachment?.uri || undefined
          });
          if (res.success) {
            showToastSuccess('Request Sent', 'Your gate pass authorization has been submitted');
            navigate('/new-pass');
            setPurpose(''); setReason(''); setAttachment(null);
          } else showToastError('Failed', res.message);
        } catch { showToastError('Error', 'An internal error occurred'); }
     }, 'Dispatching authorization...');
  };

  const submitGuest = async () => {
    if (!guestName.trim() || !guestPurpose.trim()) return showToastError('Missing Fields', 'Name and Purpose are required');
    await withLock(async () => {
       try {
         const res = await createInstantGuestPass({
            name: guestName.trim(),
            email: guestEmail.trim(),
            phone: guestPhone.trim(),
            purpose: guestPurpose.trim(),
            staffCode: staffCode,
            department: user?.department || '',
            creatorStaffCode: staffCode,
            creatorRole: 'STAFF'
         });
         if (res.success) {
           showToastSuccess('Guest Registered', 'QR code generated successfully');
           setGuestQRData({
              qrCode: res.qrCode,
              manualCode: res.manualCode,
              name: guestName,
              id: res.id
           });
           setGuestQRModal(true);
           setGuestName(''); setGuestPhone(''); setGuestEmail(''); setGuestPurpose('');
         } else showToastError('Failed', res.message);
       } catch { showToastError('Error', 'System sync failed'); }
    }, 'Provisioning Guest Pass...');
  };

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
            className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[16px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {stage === 'SELECT' ? 'New Request' : stage === 'SINGLE' ? 'Personal Pass' : stage === 'BULK' ? 'Group Movement' : 'Guest Pass'}
          </h1>
          <div className="w-10 h-10" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 pb-28">
        <AnimatePresence mode="wait">
          {stage === 'SELECT' && (
            <motion.div 
               key="selection"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, x: -20 }}
               className="space-y-6"
            >
               <div className="mb-4">
                  <h2 className="text-[24px] font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight">Gate Pass Control</h2>
                  <p className="text-[14px] font-bold text-slate-400">Select the type of exit authorization required</p>
               </div>

               <div className="grid gap-4">
                  {[
                    { id: 'SINGLE', title: 'Personal Pass', sub: 'For your official/private exit', icon: UserPlus, color: 'text-violet-600', bg: 'bg-violet-50', restricted: true },
                    { id: 'BULK', title: 'Batch Authorization', sub: 'Group exit for department students', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', restricted: true },
                    { id: 'GUEST', title: 'Guest Pass', sub: 'Pre-register visitors for entry', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', restricted: false },
                  ].filter(item => {
                    // HR, NCI, NTF, and Admin Officer only get Single + Guest — no bulk
                    if (item.id === 'BULK' && ['HR', 'NON_CLASS_INCHARGE', 'NON_TEACHING', 'ADMIN_OFFICER'].includes(role || '')) return false;
                    return true;
                  }).map((item) => {
                    const isDisabled = item.restricted && passDisabled;
                    return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && navigate(`/new-pass?stage=${item.id.toLowerCase()}`)}
                      className={cn(
                        "w-full p-6 rounded-[32px] border flex items-center gap-5 text-left shadow-sm transition-all",
                        isDisabled
                          ? "bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed"
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 active:shadow-none"
                      )}
                    >
                       <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", isDisabled ? "bg-slate-200 dark:bg-slate-800" : item.bg)}>
                          <item.icon className={cn("w-7 h-7 font-black", isDisabled ? "text-slate-400" : item.color)} />
                       </div>
                       <div className="flex-1">
                          <h3 className={cn("text-[16px] font-black tracking-tight mb-1", isDisabled ? "text-slate-400" : "text-slate-900 dark:text-white")}>{item.title}</h3>
                          <p className="text-[12px] font-bold text-slate-400 italic leading-tight">
                            {isDisabled ? 'Not available after 5:00 PM' : item.sub}
                          </p>
                       </div>
                       {isDisabled ? (
                         <Ban className="w-5 h-5 text-rose-400" />
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

                   <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Attachment (Optional)</label>
                     <div 
                       onClick={() => fileInputRef.current?.click()}
                       className="w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer"
                     >
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf" />
                       {attachment ? (
                         <div className="flex items-center gap-2">
                           <FileText className="w-5 h-5 text-emerald-600" />
                           <span className="text-[12px] font-bold text-slate-600 truncate max-w-[200px]">{attachment.name}</span>
                           <button onClick={(e) => { e.stopPropagation(); setAttachment(null); }} className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center">
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                       ) : (
                         <span className="text-[13px] font-bold text-slate-400">Tap to upload</span>
                       )}
                     </div>
                   </div>

                   <div className="pt-2 pb-10">
                     <button 
                       onClick={submitSingle}
                       className="w-full h-14 bg-violet-600 rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-xl shadow-violet-100 dark:shadow-none transition-all active:scale-[0.98]"
                     >
                       Send Request
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
                <div className="bg-emerald-600 rounded-[32px] p-6 text-white flex items-center gap-5 shadow-xl shadow-emerald-100 dark:shadow-none">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center font-black">
                     <UserPlus className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-black leading-none mb-1">Guest Registration</h3>
                    <p className="text-[13px] font-bold text-emerald-100 uppercase tracking-widest opacity-80">Instant Pass Generation</p>
                  </div>
                </div>

                <div className="space-y-5">
                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Full Name</label>
                      <input 
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold text-slate-900 dark:text-white shadow-sm outline-none"
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                         <input 
                           value={guestPhone}
                           onChange={(e) => setGuestPhone(e.target.value)}
                           placeholder="9876543210"
                           className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold text-slate-900 dark:text-white shadow-sm outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose</label>
                         <input 
                           value={guestPurpose}
                           onChange={(e) => setGuestPurpose(e.target.value)}
                           placeholder="Meeting"
                           className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold text-slate-900 dark:text-white shadow-sm outline-none"
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Optional)</label>
                      <input 
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="guest@example.com"
                        className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold text-slate-900 dark:text-white shadow-sm outline-none"
                      />
                   </div>

                   <div className="pt-4 pb-10">
                      <button 
                        onClick={submitGuest}
                        className="w-full h-15 bg-emerald-600 rounded-2xl text-white font-black text-[16px] uppercase tracking-widest shadow-xl shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98]"
                      >
                         Generate Guest Pass
                      </button>
                   </div>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Guest QR Modal */}
      <AnimatePresence>
         {guestQRModal && guestQRData && (
            <GatePassQRModal 
              isOpen={guestQRModal}
              onClose={() => setGuestQRModal(false)}
              qrCodeData={guestQRData.qrCode}
              manualCode={guestQRData.manualCode}
              personName={guestQRData.name}
              personId={`ID: ${guestQRData.id}`}
            />
         )}
      </AnimatePresence>
    </div>
  );
}
