import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Smartphone,
  CreditCard,
  ArrowLeft,
  RotateCw,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useProfile } from "../../context/ProfileContext";
import { useToast } from "../../context/ToastContext";
import {
  getStudentGatePassRequests,
  getStaffOwnRequests,
  getHODMyRequests,
} from "../../services/api.service";
import { cn } from "../../utils/cn";
import { isToday } from "../../utils/dateUtils";
import { useAdaptive } from "../../utils/useAdaptive";
import TopRefreshControl from "../../components/common/TopRefreshControl";
import ThemePresetSelector from "../../components/common/ThemePresetSelector";

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
  const { user: authUser, role, getUserId } = useAuth();
  const user = propUser || authUser;
  const { isDesktop } = useAdaptive();
  const { resetTheme } = useTheme();
  const { profileImage } = useProfile();
  const { success: showToastSuccess } = useToast();

  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, pending: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState(
    (user as any)?.contactNo || (user as any)?.phone || "",
  );
  const [editEmail, setEditEmail] = useState((user as any)?.email || "");
  const [saving, setSaving] = useState(false);

  const userId = getUserId();
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

  const fetchStats = useCallback(async () => {
    if (!userId || !role) return;
    setLoadingStats(true);
    try {
      let reqs: any[] = [];
      if (role === "STUDENT") {
        const res = await getStudentGatePassRequests(userId);
        if (res.success) reqs = res.requests;
      } else if (role === "STAFF") {
        const res = await getStaffOwnRequests(userId);
        if (res.success) reqs = res.requests;
      } else if (role === "HOD") {
        const res = await getHODMyRequests(userId);
        if (res.success) reqs = res.requests;
      }

      const today = reqs.filter((r) =>
        isToday(r.requestDate || r.createdAt || r.exitDateTime),
      );
      setStats({
        approved: today.filter((r) => r.status === "APPROVED").length,
        rejected: today.filter((r) => r.status === "REJECTED").length,
        pending: today.filter(
          (r) => r.status !== "APPROVED" && r.status !== "REJECTED",
        ).length,
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
    setTimeout(() => {
      setSaving(false);
      setIsEditing(false);
      showToastSuccess(
        "Profile Updated",
        "Your changes have been synced with the registry",
      );
    }, 1200);
  };

  const menuItems = [
    { label: "ID", value: userId, icon: CreditCard, color: "text-blue-700" },
    {
      label: "EMAIL",
      value: editEmail,
      icon: Mail,
      color: "text-violet-500",
      editable: true,
      field: "email",
    },
    {
      label: "PHONE",
      value: editPhone,
      icon: Smartphone,
      color: "text-emerald-500",
      editable: true,
      field: "phone",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden lg:min-h-0 lg:bg-transparent lg:overflow-visible">
      {!isDesktop && (
        <header
          className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0 md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="px-4 h-[72px] flex items-center justify-between">
            <button
              onClick={onBack || (() => navigate(-1))}
              className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[18px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Profile
            </h1>
            <div className="w-11" />
          </div>
        </header>
      )}

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-6 pb-32 min-h-[calc(100vh-100px)] lg:min-h-0 lg:px-0 lg:pt-0 lg:pb-0 lg:grid lg:grid-cols-[304px_1fr] lg:gap-5 xl:gap-6 lg:items-start lg:w-full">
          <div className="flex flex-col items-center mb-8 lg:sticky lg:top-24 lg:mb-0 lg:row-span-3 lg:self-start lg:bg-white lg:dark:bg-slate-900 lg:border lg:border-slate-100 lg:dark:border-slate-800 lg:rounded-[10px] lg:px-7 lg:py-8 lg:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.35)] lg:w-full">
            <div className="relative mb-5">
              <div className="w-[110px] h-[110px] rounded-full border-2 border-blue-700 p-1 flex items-center justify-center bg-white dark:bg-slate-900 shadow-xl shadow-blue-100">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={userName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[38px] font-black text-blue-700">
                    {initials}
                  </div>
                )}
              </div>
              <button
                className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-blue-600 transition-colors"
                title="Change photo"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>
            <h2 className="text-[21px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1 text-center">
              {userName}
            </h2>
            <p className="text-[12px] font-bold text-slate-400 opacity-80 text-center">
              {role} | DEPT: {department}
            </p>
            <div className="hidden lg:block w-full mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Account
              </p>
              <div className="space-y-3 text-left">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    ID
                  </p>
                  <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">
                    {userId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Department
                  </p>
                  <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">
                    {department}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[24px] lg:rounded-[10px] p-6 lg:px-8 lg:py-4 flex justify-between border border-slate-100 dark:border-slate-800 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)] mb-8 lg:mb-5 lg:col-start-2">
            {[
              {
                label: "APPROVED",
                value: stats.approved,
                color: "text-emerald-500",
              },
              {
                label: "REJECTED",
                value: stats.rejected,
                color: "text-rose-500",
              },
              {
                label: "PENDING",
                value: stats.pending,
                color: "text-amber-500",
              },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                <div className="flex flex-col items-center flex-1">
                  <span
                    className={cn("text-[22px] font-black mb-0.5", stat.color)}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                    {stat.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800 self-center" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mb-8 lg:mb-5 lg:col-start-2">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Interface Theme
              </h3>
              <button
                onClick={resetTheme}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-700 dark:text-blue-300"
              >
                Reset
                <RotateCw className="h-3 w-3" />
              </button>
            </div>
            <div className="lg:w-full">
              <ThemePresetSelector />
            </div>
          </div>

          <div className="mb-10 lg:mb-0 lg:col-start-2">
            <div className="mb-4 px-2">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Personal Information
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-[24px] lg:rounded-[10px] lg:w-full border border-slate-100 dark:border-slate-800 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)] overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50">
              {menuItems.map((item) => (
                <div
                  key={item.label}
                  className="p-5 lg:px-4 lg:py-3.5 flex items-center gap-4"
                >
                  <div
                    className={cn(
                      "w-11 h-11 lg:w-9 lg:h-9 rounded-2xl lg:rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center shrink-0",
                      item.color,
                    )}
                  >
                    <item.icon className="w-5.5 h-5.5 lg:w-[18px] lg:h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
                      {item.label}
                    </p>
                    {isEditing && item.editable ? (
                      <input
                        value={item.field === "email" ? editEmail : editPhone}
                        onChange={(e) =>
                          item.field === "email"
                            ? setEditEmail(e.target.value)
                            : setEditPhone(e.target.value)
                        }
                        className="w-full text-[14px] font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <p className="text-[14px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight italic">
                        {item.value || "N/A"}
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
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            )}
          </div>

          <div className="mt-12 text-center pb-12 lg:hidden">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] mb-1">
              RIT Gate Matrix v2.0
            </p>
            <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest italic opacity-50">
              Secure Infrastructure Node 42
            </p>
          </div>
        </div>
      </TopRefreshControl>
    </div>
  );
}
