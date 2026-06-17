import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, ShieldCheck, MapPin, Phone, User, Building2, Car, ChevronDown } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { registerVisitor, getDepartments, getStaffByDepartment } from '../../services/api.service';
import { useActionLock } from '../../context/ActionLockContext';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { usePageTitle } from '../../hooks/usePageTitle';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';

export default function SecurityVisitorReg() {
  usePageTitle('Visitor Registration');
  const { getUserId } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { withLock } = useActionLock();
  const securityId = getUserId();

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', numberOfPeople: 1, purpose: '',
    role: 'VISITOR' as "VISITOR" | "VENDOR", departmentId: '', staffCode: '',
    vehicleNumber: '', vehicleType: ''
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getDepartments();
      if (res.success) setDepartments(res.data);
    })();
  }, []);

  useEffect(() => {
    if (!formData.departmentId) { setStaffList([]); return; }
    (async () => {
      const res = await getStaffByDepartment(formData.departmentId);
      if (res.success) setStaffList(res.data);
    })();
  }, [formData.departmentId]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.departmentId || !formData.staffCode || !formData.purpose) {
      showError('Incomplete Form', 'Please fill all required fields marked with *');
      return;
    }
    
    await withLock(async () => {
      setIsSubmitting(true);
      try {
        const res = await registerVisitor({ ...formData, securityId });
        if (res.success) {
          showSuccess('Visitor Registered', 'Approval request sent to HOD/HR');
          setFormData({ name: '', phone: '', email: '', numberOfPeople: 1, purpose: '', role: 'VISITOR', departmentId: '', staffCode: '', vehicleNumber: '', vehicleType: '' });
        } else showError('Failed', res.message);
      } finally {
        setIsSubmitting(false);
      }
    }, 'Registering Visitor...');
  };

  return (
    <div className="desktop-page mx-auto space-y-8 pb-10">
      <DesktopPageHeader
        title="Visitor Registration"
        subtitle="Log manual entry for verified guests and route approval to the right official."
        eyebrow="Security Protocol"
      />
      {/* 1. Context & Title */}
      <div className="text-left px-1 lg:hidden">
        <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-blue-400 mb-1 leading-none">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Security Protocol</span>
        </div>
        <h2 className="text-[28px] font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight uppercase">
          Visitor Registration
        </h2>
        <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide leading-relaxed">
          Log manual entry for verified guests
        </p>
      </div>

      {/* 2. Registration Form Card */}
      <Card className="bg-white/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 p-6 sm:p-8 space-y-8 shadow-2xl shadow-slate-200/20 dark:shadow-none rounded-[32px]">
        {/* Visitor Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
             <User className="w-3.5 h-3.5 text-slate-400" />
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Identification</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="FULL NAME *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="E.G. JOHN DOE" className="font-bold uppercase tracking-wider" />
            <Input label="PHONE NUMBER *" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} type="tel" placeholder="10-DIGIT MOBILE" className="font-bold tabular-nums" />
            <Input label="EMAIL ADDRESS" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} type="email" placeholder="OPTIONAL" className="font-bold" />
            <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Total Persons</label>
               <input 
                 type="number" 
                 value={formData.numberOfPeople} 
                 onChange={(e) => setFormData({...formData, numberOfPeople: parseInt(e.target.value) || 1})} 
                 min="1"
                 className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all font-mono pl-4"
               />
            </div>
          </div>
        </div>

        {/* Visit Context Section */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 px-1">
             <Building2 className="w-3.5 h-3.5 text-slate-400" />
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visit Logistics</h3>
          </div>
          
          <Input label="REASON FOR VISIT *" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value.toUpperCase()})} placeholder="E.G. OFFICIAL MEETING" className="font-bold uppercase" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Department *</label>
                <div className="relative">
                  <select value={formData.departmentId} onChange={(e) => setFormData({...formData, departmentId: e.target.value, staffCode: ''})} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 appearance-none text-slate-900 dark:text-white uppercase tracking-wider transition-all">
                    <option value="">SELECT DEPT</option>
                    {departments.map(d => <option key={d.id || d.code || d} value={d.id || d.code || d}>{d.name || d.id || d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Authorized Official *</label>
                <div className="relative">
                  <select value={formData.staffCode} onChange={(e) => setFormData({...formData, staffCode: e.target.value})} disabled={!formData.departmentId} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 appearance-none text-slate-900 dark:text-white uppercase tracking-wider disabled:opacity-50 transition-all">
                    <option value="">CHOOSE PERSON</option>
                    {staffList.map(s => <option key={s.staffCode || s.id} value={s.staffCode || s.id}>{s.name || s.staffName || s.fullName}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>
        </div>

        {/* Transportation Section */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 px-1">
             <Car className="w-3.5 h-3.5 text-slate-400" />
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transportation (Optional)</h3>
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="VEHICLE NUMBER" value={formData.vehicleNumber} onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value.toUpperCase()})} placeholder="E.G. KA01AB1234" className="font-bold uppercase tabular-nums" />
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Vehicle Type</label>
                <div className="relative">
                  <select value={formData.vehicleType} onChange={(e) => setFormData({...formData, vehicleType: e.target.value})} className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 appearance-none text-slate-900 dark:text-white uppercase tracking-wider transition-all">
                    <option value="">SELECT TYPE</option>
                    <option value="TWO_WHEELER">2 WHEELER</option>
                    <option value="FOUR_WHEELER">4 WHEELER</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>
        </div>

        <Button fullWidth size="lg" onClick={handleSubmit} isLoading={isSubmitting} className="h-14 rounded-2xl shadow-blue-100">
          COMPLETE REGISTRATION
        </Button>
      </Card>
    </div>
  );
}
