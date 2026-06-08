import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Search, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Activity, 
  QrCode, 
  ChevronRight, 
  Calendar,
  AlertCircle,
  Plus,
  User,
  ArrowLeft,
  Mail,
  Smartphone,
  Car,
  Users,
  CheckCircle2,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { 
  getHRAllRequests, 
  createInstantGuestPass,
  getDepartments,
  getStaffByDepartment
} from '../../services/api.service';
import { cn } from '../../utils/cn';
import { formatDateTime } from '../../utils/dateUtils';
import GatePassQRModal from '../../components/common/GatePassQRModal';
import { SkeletonList } from '../../components/ui/Skeleton';

export default function VisitorManagementPage() {
  const navigate = useNavigate();
  const { getUserId, role, user } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const userId = getUserId();
  
  const [stage, setStage] = useState<'LIST' | 'REGISTER'>('LIST');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  
  // Registration Form
  const [numVisitors, setNumVisitors] = useState('1');
  const [visitorNames, setVisitorNames] = useState<string[]>(['']);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [purpose, setPurpose] = useState('');
  const [visitorRole, setVisitorRole] = useState<'VISITOR' | 'VENDOR'>('VISITOR');

  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState<any>(null);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        getHRAllRequests(userId),
        getDepartments()
      ]);
      if (vRes.success) setVisitors(vRes.requests.filter((r: any) => r.isGuest || r.purpose?.toLowerCase().includes('guest')));
      if (dRes.success) setDepartments(dRes.data || []);
    } catch { showToastError('Registry Error', 'Failed to sync with gate logs'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (selectedDept) {
       getStaffByDepartment(selectedDept).then(res => {
         if (res.success) setStaffMembers(res.data || []);
         else setStaffMembers([]);
       });
    } else setStaffMembers([]);
  }, [selectedDept]);

  useEffect(() => {
    const num = parseInt(numVisitors) || 1;
    setVisitorNames(prev => Array(num).fill('').map((_, i) => prev[i] || ''));
  }, [numVisitors]);

  const handleSubmit = async () => {
    if (visitorNames.some(n => !n.trim()) || !phone.trim() || !purpose.trim() || !selectedDept || !selectedStaff) {
       return showToastError('Missing Data', 'Please complete all required fields');
    }

    await withLock(async () => {
      setIsSubmitting(true);
      try {
        const res = await createInstantGuestPass({
          name: visitorNames[0],
          phone,
          email: email || `${phone}@rit.guest`,
          department: selectedDept,
          staffCode: selectedStaff,
          purpose,
          vehicleNumber: vehicleNo || undefined,
          creatorStaffCode: userId,
          creatorRole: role || 'STAFF'
        });

        if (res.success) {
          showToastSuccess('Guest Provisioned', 'Visitor pass has been successfully registered');
          setQrData({
            qrCode: res.qrCode,
            manualCode: res.manualCode,
            name: visitorNames[0],
            id: res.id
          });
          setShowQR(true);
          setStage('LIST');
          loadInitialData();
          resetForm();
        } else showToastError('Provisioning Failed', res.message);
      } catch { showToastError('Error', 'Network propagation error'); }
      finally { setIsSubmitting(false); }
    }, 'Authorizing Point Entry...');
  };

  const resetForm = () => {
    setNumVisitors('1'); setVisitorNames(['']); setEmail(''); setPhone(''); 
    setVehicleNo(''); setVehicleType(''); setSelectedDept(''); setSelectedStaff(''); 
    setPurpose(''); setVisitorRole('VISITOR');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-[72px] flex items-center justify-between">
          <button
            onClick={() => stage === 'LIST' ? navigate(-1) : setStage('LIST')}
            className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[16px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {stage === 'LIST' ? 'Visitor Hub' : 'Guest Pre-Registration'}
          </h1>
          {stage === 'LIST' ? (
            <button
              onClick={() => setStage('REGISTER')}
              className="w-10 h-10 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : <div className="w-10 h-10" />}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6">
        <AnimatePresence mode="wait">
          {stage === 'LIST' ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                     <div className="w-12 h-12 bg-blue-50 dark:bg-indigo-900/10 rounded-2xl flex items-center justify-center text-[var(--color-primary)]">
                        <ShieldCheck className="w-7 h-7" />
                     </div>
                     <div>
                        <h3 className="text-[18px] font-black text-slate-900 dark:text-white leading-none mb-1">Active Perimeter</h3>
                        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Security Control Hub</p>
                     </div>
                  </div>
                  <p className="text-[12px] font-medium text-slate-400 italic">
                    Monitor and pre-register guests for seamless institutional access verified at the main perimeter gates.
                  </p>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Recent Pre-Registrations</h4>
                     <span className="text-[10px] font-bold text-[var(--color-primary)] bg-blue-50 px-2 py-0.5 rounded-md uppercase">{visitors.length} Logs</span>
                  </div>

                  {isLoading ? <SkeletonList count={3} /> : visitors.length === 0 ? (
                    <div className="py-20 text-center">
                       <UserPlus className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                       <p className="text-[14px] font-bold text-slate-400 italic">No guests currently registered</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-20">
                       {visitors.map((v, i) => (
                         <div key={v.id || i} className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4 min-w-0">
                               <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                  <User className="w-6 h-6" />
                               </div>
                               <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                     <div className={cn("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest", v.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                                        {v.status}
                                     </div>
                                     <span className="text-[9px] font-bold text-slate-300 uppercase shrink-0">{formatDateTime(v.createdAt).split(',')[0]}</span>
                                  </div>
                                  <h4 className="text-[14px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{v.name || 'GUEST VISITOR'}</h4>
                                  <p className="text-[11px] font-bold text-slate-400 truncate opacity-80">{v.purpose || 'Institutional Visit'}</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => {
                                setQrData({ qrCode: v.qrCode, manualCode: v.manualCode, name: v.name, id: v.id });
                                setShowQR(true);
                              }}
                              className="w-11 h-11 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center active:scale-95 transition-transform"
                            >
                               <QrCode className="w-5.5 h-5.5" />
                            </button>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-32">
               <div className="space-y-5">
                  {/* Visitor Info */}
                  <div className="space-y-4">
                     <h3 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Visitor Credentials</h3>
                     
                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Visitors</label>
                        <div className="relative">
                           <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                           <input 
                              type="number"
                              value={numVisitors}
                              onChange={(e) => setNumVisitors(e.target.value)}
                              className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 text-[15px] font-bold outline-none"
                              placeholder="1"
                           />
                        </div>
                     </div>

                     {visitorNames.map((name, i) => (
                       <div key={i} className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            {i === 0 ? 'Primary Visitor Name' : `Visitor ${i+1} Name`}
                          </label>
                          <input 
                              value={name}
                              onChange={(e) => {
                                const next = [...visitorNames];
                                next[i] = e.target.value.toUpperCase();
                                setVisitorNames(next);
                              }}
                              className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold outline-none"
                              placeholder="FULL LEGAL NAME"
                          />
                       </div>
                     ))}

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                           <input 
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold outline-none"
                              placeholder="+91..."
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicle No (Opt)</label>
                           <input 
                              value={vehicleNo}
                              onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                              className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[15px] font-bold outline-none uppercase"
                              placeholder="KLO-1234"
                           />
                        </div>
                     </div>

                     {vehicleNo && (
                       <div className="flex flex-wrap gap-2 pt-1">
                          {['Two Wheeler', 'Four Wheeler', 'Auto', 'Bus'].map(vt => (
                            <button
                               key={vt}
                               onClick={() => setVehicleType(vt)}
                               className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all", vehicleType === vt ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white" : "bg-white border-slate-100 text-slate-400")}
                            >
                               {vt}
                            </button>
                          ))}
                       </div>
                     )}
                  </div>

                  {/* Visit details */}
                  <div className="space-y-4">
                     <h3 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Access Objectives</h3>
                     
                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Department to Visit</label>
                        <select 
                           value={selectedDept}
                           onChange={(e) => setSelectedDept(e.target.value)}
                           className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[14px] font-black outline-none appearance-none"
                        >
                           <option value="">Select Department</option>
                           {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Point of Contact</label>
                        <select 
                           value={selectedStaff}
                           disabled={!selectedDept}
                           onChange={(e) => setSelectedStaff(e.target.value)}
                           className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[14px] font-black outline-none appearance-none disabled:opacity-50"
                        >
                           <option value="">{selectedDept ? 'Select Staff' : 'Select Dept First'}</option>
                           {staffMembers.map(s => <option key={s.id} value={s.id}>{s.name || s.staffName}</option>)}
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Purpose</label>
                        <textarea 
                           value={purpose}
                           onChange={(e) => setPurpose(e.target.value.toUpperCase())}
                           className="w-full h-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[14px] font-bold outline-none resize-none uppercase"
                           placeholder="PURPOSE OF VISIT..."
                        />
                     </div>
                  </div>

                  <button 
                     onClick={handleSubmit}
                     disabled={isSubmitting}
                     className="w-full h-15 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                     {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                        <>
                           <CheckCircle2 className="w-5 h-5" />
                           Authorize Access
                        </>
                     )}
                  </button>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
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
