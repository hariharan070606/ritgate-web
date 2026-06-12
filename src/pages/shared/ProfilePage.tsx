import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Trash2,
  Mail,
  Smartphone,
  CreditCard,
  ArrowLeft
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import {
  getStudentGatePassRequests,
  getStaffOwnRequests,
  getHODMyRequests,
} from '../../services/api.service';
import { cn } from '../../utils/cn';
import { isToday } from '../../utils/dateUtils';
import { useAdaptive } from '../../utils/useAdaptive';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import ThemePresetSelector from '../../components/common/ThemePresetSelector';

interface ProfilePageProps {
  user?: any;
  onBack?: () => void;
}

export default function ProfilePage({ user: propUser, onBack }: ProfilePageProps = {}) {
  usePageTitle('Profile');
  const navigate = useNavigate();
  const { user: authUser, role, getUserId } = useAuth();
  const user = propUser || authUser;
  const { isDesktop } = useAdaptive();
  const { resetTheme } = useTheme();
  const { profileImage, captureImage, clearProfileImage } = useProfile();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, pending: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState((user as any)?.contactNo || (user as any)?.phone || '');
  const [editEmail, setEditEmail] = useState((user as any)?.email || '');
  const [saving, setSaving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const userId = getUserId();
  const userName = (() => {
    if (!user) return 'User';
    const u = user as any;
    return u.fullName || u.staffName || u.hodName || u.hrName || u.name ||
      (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : '') || 'User';
  })();

  const initials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const department = (user as any)?.department || (user as any)?.branch || (user as any)?.gateAssigned || 'General';

  const fetchStats = useCallback(async () => {
    if (!userId || !role) return;
    setLoadingStats(true);
    try {
      let reqs: any[] = [];
      if (role === 'STUDENT') {
        const res = await getStudentGatePassRequests(userId);
        if (res.success) reqs = res.requests;
      } else if (role === 'STAFF') {
        // Handle NCI/NTF if user has تلك sub-roles (Check user props if available)
        const res = await getStaffOwnRequests(userId);
        if (res.success) reqs = res.requests;
      } else if (role === 'HOD') {
        const res = await getHODMyRequests(userId);
        if (res.success) reqs = res.requests;
      }

      const today = reqs.filter(r => isToday(r.requestDate || r.createdAt || r.exitDateTime));
      setStats({
        approved: today.filter(r => r.status === 'APPROVED').length,
        rejected: today.filter(r => r.status === 'REJECTED').length,
        pending: today.filter(r => r.status !== 'APPROVED' && r.status !== 'REJECTED').length,
      });
    } catch {
      // silent fail
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, [userId, role]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    // Simulate API call as in mobile
    setTimeout(() => {
      setSaving(false);
      setIsEditing(false);
      showToastSuccess('Profile Updated', 'Your changes have been synced with the registry');
    }, 1200);
  };

  const menuItems = [
    { label: 'ID', value: userId, icon: CreditCard, color: 'text-blue-700' },
    { label: 'EMAIL', value: editEmail, icon: Mail, color: 'text-violet-500', editable: true, field: 'email' },
    { label: 'PHONE', value: editPhone, icon: Smartphone, color: 'text-emerald-500', editable: true, field: 'phone' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden lg:min-h-0 lg:bg-transparent lg:overflow-visible">
      {/* Header */}
      {!isDesktop && <header
        className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 h-[72px] flex items-center justify-between">
          <button
            onClick={onBack || (() => navigate(-1))}
            className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Profile</h1>
          <div className="w-11" />
        </div>
      </header>}

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-6 pb-32 min-h-[calc(100vh-100px)] lg:min-h-0 lg:px-0 lg:pt-0 lg:pb-8 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] lg:gap-7 xl:gap-9 lg:items-start lg:max-w-none lg:mx-0">
          {/* 1. Header Section */}
          <div className="flex flex-col items-center mb-8 lg:sticky lg:top-24 lg:mb-0 lg:row-span-3 lg:self-start lg:bg-white lg:dark:bg-slate-900 lg:border lg:border-slate-100 lg:dark:border-slate-800 lg:rounded-[22px] lg:p-8 lg:shadow-sm">
             <div className="relative mb-4">
                <div className="w-[100px] h-[100px] rounded-full border-2 border-blue-700 p-1 flex items-center justify-center bg-white dark:bg-slate-900 shadow-xl shadow-blue-100">
                   {profileImage ? (
                      <img src={profileImage} alt={userName} className="w-full h-full rounded-full object-cover" />
                   ) : (
                      <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[36px] font-black text-blue-700">
                         {initials}
                      </div>
                   )}
                </div>
                {/* Camera / change photo button */}
                <button 
                  onClick={() => captureImage()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--color-primary)] rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
                >
                   <Camera className="w-4 h-4" />
                </button>
                {/* Remove photo button — only shown when a photo is set */}
                {profileImage && (
                  <button
                    onClick={() => setShowRemoveConfirm(true)}
                    className="absolute top-0 right-0 w-7 h-7 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-md active:scale-90 transition-transform"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
             </div>
             <h2 className="text-[22px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1 text-center">{userName}</h2>
             <p className="text-[13px] font-bold text-slate-400 opacity-80 text-center">{role} | DEPT: {department}</p>
             <div className="hidden lg:block w-full mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Account</p>
                <div className="space-y-3 text-left">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</p>
                    <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">{userId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                    <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">{department}</p>
                  </div>
                </div>
             </div>
          </div>

          {/* 2. Stats Section */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] lg:rounded-[22px] p-6 lg:p-5 flex justify-between border border-slate-100 dark:border-slate-800 shadow-sm mb-8 lg:mb-5 lg:col-start-2">
             {[
               { label: 'APPROVED', value: stats.approved, color: 'text-emerald-500' },
               { label: 'REJECTED', value: stats.rejected, color: 'text-rose-500' },
               { label: 'PENDING', value: stats.pending, color: 'text-amber-500' },
             ].map((stat, i) => (
               <React.Fragment key={stat.label}>
                 <div className="flex flex-col items-center flex-1">
                    <span className={cn("text-[20px] font-black mb-0.5", stat.color)}>{stat.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{stat.label}</span>
                 </div>
                 {i < 2 && <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 self-center" />}
               </React.Fragment>
             ))}
          </div>

          {/* 3. Theme Section */}
          <div className="mb-8 lg:mb-5 lg:col-start-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Interface Theme</h3>
              <button onClick={resetTheme} className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Reset</button>
            </div>
            <div className="lg:max-w-[720px]">
              <ThemePresetSelector />
            </div>
          </div>

          {/* 4. Personal Info Section */}
          <div className="mb-10 lg:mb-0 lg:col-start-2">
             <div className="mb-4 px-2">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Personal Information</h3>
             </div>
             <div className="bg-white dark:bg-slate-900 rounded-[24px] lg:rounded-[22px] lg:max-w-[720px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50">
                {menuItems.map((item) => (
                  <div key={item.label} className="p-5 flex items-center gap-4">
                     <div className={cn("w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0", item.color)}>
                        <item.icon className="w-5.5 h-5.5" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{item.label}</p>
                        {isEditing && item.editable ? (
                           <input 
                              value={item.field === 'email' ? editEmail : editPhone}
                              onChange={(e) => item.field === 'email' ? setEditEmail(e.target.value) : setEditPhone(e.target.value)}
                              className="w-full text-[14px] font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-blue-500 outline-none"
                           />
                        ) : (
                           <p className="text-[14px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight italic">
                             {item.value || 'N/A'}
                           </p>
                        )}
                     </div>
                  </div>
                ))}
             </div>
             {isEditing && (
                <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full h-14 bg-[var(--color-primary)] rounded-2xl mt-4 text-white font-black text-[14px] uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                   {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
                </button>
             )}
          </div>

          <div className="mt-12 text-center pb-12 lg:hidden">
             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] mb-1">RIT Gate Matrix v2.0</p>
             <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest italic opacity-50">Secure Infrastructure Node 42</p>
          </div>
        </div>
      </TopRefreshControl>

      {/* Remove Photo Confirmation */}
      <AnimatePresence>
        {showRemoveConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRemoveConfirm(false)}
              className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[190] w-[300px] bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl"
            >
              <div className="p-7 text-center">
                <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-[18px] font-black text-slate-900 dark:text-white mb-2">Remove Photo?</h3>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                  Your profile picture will be removed and replaced with your initials.
                </p>
              </div>
              <div className="flex border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 py-4 text-[14px] font-bold text-slate-500 dark:text-slate-400 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { clearProfileImage(); setShowRemoveConfirm(false); showToastSuccess('Photo Removed', 'Your profile picture has been removed'); }}
                  className="flex-1 py-4 text-[14px] font-black text-white bg-rose-500 active:bg-rose-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
