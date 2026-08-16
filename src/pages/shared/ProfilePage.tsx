import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Smartphone,
  CreditCard,
  ArrowLeft,
  Building2,
  ShieldCheck,
  UserCheck,
  Sun,
  Moon,
  LogOut
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAuth } from "../../context/AuthContext";
import { useProfile } from "../../context/ProfileContext";
import { useTheme } from "../../context/ThemeContext";
import { cn } from "../../utils/cn";
import { useAdaptive } from "../../utils/useAdaptive";
import TopRefreshControl from "../../components/common/TopRefreshControl";
import VisitorAvatar from "../../components/common/VisitorAvatar";
import ConfirmationModal from "../../components/common/ConfirmationModal";

interface ProfilePageProps {
  user?: any;
  onBack?: () => void;
}

export default function ProfilePage({
  user: propUser,
  onBack,
}: ProfilePageProps = {}) {
  usePageTitle("Profile");
  const navigate = useNavigate();
  const { user: authUser, role, getUserId, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const user = propUser || authUser;
  const { isDesktop } = useAdaptive();
  const { profileImage } = useProfile();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const userId = getUserId();
  const email = (user as any)?.email || (user as any)?.mail || "";
  const phone = (user as any)?.contactNo || (user as any)?.phone || (user as any)?.mobile || "";
  
  const userName = (() => {
    if (!user) return "User";
    const u = user as any;
    return (
      u.fullName ||
      u.staffName ||
      u.hodName ||
      u.hrName ||
      u.name ||
      (u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "") ||
      "User"
    );
  })();

  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const department =
    (user as any)?.department ||
    (user as any)?.branch ||
    (user as any)?.gateAssigned ||
    "General";

  const roleLabel = (() => {
    switch (role) {
      case "NON_TEACHING":
        return "Non Teaching";
      case "NON_CLASS_INCHARGE":
        return "Non Class Incharge";
      case "ADMIN_OFFICER":
        return "Admin Officer";
      case "STUDENT":
        return "Student";
      case "STAFF":
        return "Faculty Staff";
      case "HOD":
        return "Head of Department";
      case "HR":
        return "Human Resources";
      case "SECURITY":
        return "Security Officer";
      default:
        return role || "User";
    }
  })();

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="flex flex-col min-h-screen lg:min-h-0 bg-transparent">
      {/* Mobile Header */}
      {!isDesktop && (
        <header
          className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 lg:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="px-4 h-[64px] flex items-center justify-between">
            <button
              onClick={onBack || (() => navigate(-1))}
              className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[17px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
              My Profile
            </h1>
            <div className="w-10" />
          </div>
        </header>
      )}

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-4 pt-4 pb-28 lg:px-0 lg:pt-0 lg:pb-8 max-w-5xl mx-auto w-full">
          
          {/* Main Desktop/Mobile Profile Container */}
          <div className="space-y-6">
            
            {/* Header Profile Hero Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
              {/* Top Gradient Banner */}
              <div className="h-32 sm:h-44 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
              </div>

              {/* Avatar & User Details Overlap */}
              <div className="px-6 sm:px-8 pb-6 flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 sm:-mt-20 relative z-10">
                {/* Avatar */}
                <div className="relative group shrink-0">
                  <VisitorAvatar
                    name={userName}
                    photoUrl={profileImage}
                    size="auto"
                    className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-white dark:border-slate-900 bg-white dark:bg-slate-900 shadow-2xl"
                    fallback={
                      <div className="w-full h-full bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-black">
                        {initials}
                      </div>
                    }
                  />
                </div>

                {/* User Info Title */}
                <div className="flex-1 text-center sm:text-left min-w-0">


                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {userName}
                  </h1>
                  
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    {department} • ID: <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{userId || "N/A"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2-Column Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Personal & Contact Details Card */}
              <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                        Contact Information
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Primary communication channels
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* ID Field */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Identification ID
                          </p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white font-mono truncate">
                            {userId || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Email Address
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {email || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Phone Number
                          </p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white font-mono truncate">
                            {phone || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic & Access Information Card */}
              <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                        Institutional Details
                      </h3>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Department & campus access rights
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Department */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Department / Branch
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {department}
                        </p>
                      </div>
                    </div>

                    {/* System Role */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Assigned System Role
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {roleLabel}
                        </p>
                      </div>
                    </div>

                    {/* Campus Verification */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Gate Pass Access Status
                        </p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1.5">
                          <span>Verified Campus Credentials</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* App Theme & Appearance Settings Card — Hidden on Desktop */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm lg:hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    {isDark ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                      App Theme Mode
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Currently using <span className="font-bold text-slate-800 dark:text-slate-200">{isDark ? "Dark Mode" : "Light Mode (White Mode)"}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={toggleTheme}
                  aria-label="Toggle theme mode"
                  className={cn(
                    "relative inline-flex h-10 w-18 shrink-0 items-center cursor-pointer rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none shadow-inner",
                    isDark ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out text-slate-700",
                      isDark ? "translate-x-8" : "translate-x-0"
                    )}
                  >
                    {isDark ? <Moon className="w-4 h-4 text-blue-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  </span>
                </button>
              </div>
            </div>

            {/* Phone View Only Logout Button */}
            <div className="lg:hidden pt-2">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center justify-center gap-2.5 p-4 rounded-[24px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-extrabold text-sm transition-all active:scale-[0.98] shadow-sm"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </div>

          </div>

        </div>
      </TopRefreshControl>

      {/* Confirmation modal for phone view logout */}
      <ConfirmationModal
        visible={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
        title="Log Out"
        message="Are you sure you want to log out of RIT Gate?"
        confirmText="Log Out"
        confirmColor="bg-rose-500 hover:bg-rose-600"
      />
    </div>
  );
}

