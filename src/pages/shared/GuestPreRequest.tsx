import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  CheckCircle, 
  Info, 
  Loader2, 
  Copy, 
  Check, 
  ArrowLeft,
  Smartphone,
  Users,
  ShieldCheck,
  Calendar,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { createInstantGuestPass, getStaffDirectory } from '../../services/api.service';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import VisitorPhotoUpload from '../../components/common/VisitorPhotoUpload';
import { cn } from '../../utils/cn';

interface GuestPreRequestProps {
  onBack?: () => void;
  embedded?: boolean;
}

export default function GuestPreRequest({ onBack, embedded = false }: GuestPreRequestProps = {}) {
  const navigate = useNavigate();
  const { getUserId, user, role } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const staffCode = getUserId();

  const creatorName = (() => {
    const u = user as any;
    return u?.staffName || u?.hodName || u?.hrName || u?.name || 'Staff Member';
  })();
  const creatorDeptProp = (user as any)?.department || (user as any)?.branch || '';

  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState('1');
  const [purpose, setPurpose] = useState('');
  const [visitorPhoto, setVisitorPhoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creatorDepartment, setCreatorDepartment] = useState(creatorDeptProp);
  const [loadingCreator, setLoadingCreator] = useState(!creatorDeptProp);

  // QR result state
  const [qrData, setQrData] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);

  // Load department if not provided
  useEffect(() => {
    if (creatorDeptProp) { setCreatorDepartment(creatorDeptProp); setLoadingCreator(false); return; }
    (async () => {
      setLoadingCreator(true);
      try {
        const dir = await getStaffDirectory();
        const list = Array.isArray(dir) ? dir : [];
        const creator = list.find((s: any) => {
          const id = s.staffId ?? s.staffCode ?? s.staff_id ?? s.id ?? '';
          return String(id) === String(staffCode);
        });
        if (creator?.department) {
          setCreatorDepartment(creator.department);
        }
      } catch {
        showToastError('System Error', 'Could not load staff directory');
      } finally {
        setLoadingCreator(false);
      }
    })();
  }, [staffCode, creatorDeptProp]);

  const handleSubmit = async () => {
    if (!visitorName.trim() || !phone.trim() || phone.replace(/\D/g, '').length < 10 || !purpose.trim()) {
      showToastError('Missing Fields', 'Please enter valid guest details and purpose');
      return;
    }
    if (!visitorPhoto) {
      showToastError('Photo Required', 'Please upload the guest’s photograph before submitting.');
      return;
    }

    await withLock(async () => {
      setIsSubmitting(true);
      try {
        const res = await createInstantGuestPass({
          name: visitorName.trim(),
          email: `${phone.replace(/\D/g, '')}@rit.guest`,
          phone: phone.trim(),
          department: creatorDepartment || 'GENERAL',
          staffCode,
          purpose: purpose.trim(),
          creatorStaffCode: staffCode,
          creatorRole: role || 'STAFF',
          visitorPhoto,
        });
        if (res.success) {
          showToastSuccess('Pass Generated', 'Visitor pass has been provisioned successfully');
          setQrData({
            qrCode: res.qrCode,
            manualCode: res.manualCode,
            name: visitorName,
            id: res.id
          });
          setShowQR(true);
          resetForm();
        } else showToastError('Failed', res.message);
      } catch { showToastError('Error', 'Network propagation failed'); }
      finally { setIsSubmitting(false); }
    }, 'Provisioning Credentials...');
  };

  const resetForm = () => {
    setVisitorName(''); setPhone(''); setNumberOfPeople('1'); setPurpose(''); setVisitorPhoto('');
  };

  return (
    <div className={embedded ? "contents" : "flex flex-col min-h-screen lg:min-h-0 lg:bg-transparent bg-[#F8FAFC] dark:bg-slate-950"}>
      {/* Header — mobile only (dashboard uses the AppLayout header) */}
      {!embedded && (
        <header
          className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 lg:hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="px-4 h-[72px] flex items-center justify-between">
            <button
              onClick={onBack ?? (() => navigate(-1))}
              className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[16px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Guest Registration</h1>
            <div className="w-10 h-10" />
          </div>
        </header>
      )}

      <main className={embedded ? "w-full" : "flex-1 overflow-y-auto px-5 py-6 lg:px-0 lg:py-0"}>
        <div className={cn(
          "space-y-5 pb-32 lg:mx-auto lg:max-w-4xl lg:pb-12",
          embedded ? "w-full" : "max-w-xl mx-auto"
        )}>
           {/* Form Section */}
           <div className="space-y-5 rounded-[28px] border border-slate-200/90 bg-white/90 p-6 sm:p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/90">
              <div>
                 <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Guest Pre-Request</p>
                 <h3 className="mt-1 text-[22px] font-black tracking-tight text-slate-950 dark:text-white lg:text-[24px]">Visitor Details</h3>
                 <p className="mt-1 text-[13px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                    Enter the guest details and authorize clearance in one clean request.
                 </p>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Full Name</label>
                 <input 
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value.toUpperCase())}
                    placeholder="FULL NAME"
                    className="w-full h-14 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold text-slate-900 dark:text-white outline-none uppercase shadow-sm transition-all focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 dark:focus:border-slate-400"
                 />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative">
                       <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                       <input 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="9876543210"
                          className="w-full h-14 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-12 pr-4 text-[15px] font-bold text-slate-900 dark:text-white outline-none shadow-sm transition-all focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 dark:focus:border-slate-400"
                       />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Guests</label>
                    <div className="relative">
                       <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                       <input 
                          type="number"
                          value={numberOfPeople}
                          onChange={(e) => setNumberOfPeople(e.target.value)}
                          placeholder="1"
                          className="w-full h-14 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-12 pr-4 text-[15px] font-bold text-slate-900 dark:text-white outline-none shadow-sm transition-all focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 dark:focus:border-slate-400"
                       />
                    </div>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Objective Detail</label>
                 <div className="relative">
                    <LayoutGrid className="absolute left-4 top-4 w-4.5 h-4.5 text-slate-400" />
                    <textarea
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value.toUpperCase())}
                        placeholder="PURPOSE OF VISIT..."
                        className="w-full h-28 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none shadow-sm resize-none uppercase transition-all lg:min-h-[140px] focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 dark:focus:border-slate-400"
                    />
                 </div>
              </div>

              <VisitorPhotoUpload value={visitorPhoto} onChange={setVisitorPhoto} label="Visitor Photograph" required />

              <div className="pt-4">
                 <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || loadingCreator || !visitorPhoto}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[14px] uppercase tracking-[0.16em] shadow-lg shadow-blue-600/30 border border-blue-500 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2.5 sm:ml-auto sm:max-w-[18rem] disabled:opacity-55"
                 >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-current" /> : (
                       <>
                          <ShieldCheck className="w-5 h-5" />
                          Register & Generate Pass
                       </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      </main>

      {/* QR Modal */}
      <AnimatePresence>
         {showQR && qrData && (
            <GatePassQRModal 
              isOpen={showQR}
              onClose={() => setShowQR(false)}
              qrCodeData={qrData.qrCode}
              manualCode={qrData.manualCode}
              personName={qrData.name}
              personId={`ID: ${qrData.id}`}
            />
         )}
      </AnimatePresence>
    </div>
  );
}
