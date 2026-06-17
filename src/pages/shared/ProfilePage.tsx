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
import {
  getStudentGatePassRequests,
  getStaffOwnRequests,
  getHODMyRequests,
  getHRAllRequests,
  getNCIOwnRequests,
  getNTFOwnRequests,
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

  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, pending: 0 });

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
        return "NON TEACHING";
      case "NON_CLASS_INCHARGE":
        return "NON CLASS INCHARGE";
      case "ADMIN_OFFICER":
        return "ADMIN OFFICER";
      default:
        return role || "USER";
    }
  })();

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
      } else if (role === "HR") {
        const res = await getHRAllRequests(userId);
        if (res.success) reqs = res.requests;
      } else if (role === "NON_CLASS_INCHARGE") {
        const res = await getNCIOwnRequests(userId);
        if (res.success) reqs = res.requests;
      } else if (role === "NON_TEACHING" || role === "ADMIN_OFFICER") {
        const res = await getNTFOwnRequests(userId);
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

  const menuItems = [
    { label: "ID", value: userId, icon: CreditCard, color: "text-blue-700" },
    {
      label: "EMAIL",
      value: email,
      icon: Mail,
      color: "text-violet-500",
    },
    {
      label: "PHONE",
      value: phone,
      icon: Smartphone,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden lg:h-[calc(100vh-160px)] lg:min-h-0 lg:bg-transparent">
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
        <div className="px-5 pt-6 pb-32 min-h-[calc(100vh-100px)] lg:mx-auto lg:grid lg:h-full lg:min-h-0 lg:w-full lg:max-w-none lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[74px_auto_auto] lg:items-start lg:gap-x-6 lg:gap-y-3 lg:overflow-hidden lg:px-0 lg:pt-0 lg:pb-0 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-x-7">
          <div className="flex flex-col items-center mb-8 lg:mb-0 lg:row-span-3 lg:h-[440px] xl:h-[460px] lg:self-start lg:bg-white/78 lg:dark:bg-slate-900/80 lg:border lg:border-white/60 lg:dark:border-slate-800/80 lg:rounded-[18px] lg:px-6 lg:py-5 lg:shadow-[0_24px_60px_-38px_rgba(15,23,42,0.62)] lg:backdrop-blur-2xl lg:w-full lg:overflow-hidden">
            <div className="relative mb-3">
              <div className="w-[110px] h-[110px] rounded-full border-2 border-blue-700 p-1 flex items-center justify-center bg-white dark:bg-slate-900 shadow-xl shadow-blue-100 lg:h-[92px] lg:w-[92px] lg:border-[3px]">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={userName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[38px] font-black text-blue-700 lg:text-[32px]">
                    {initials}
                  </div>
                )}
              </div>
            </div>
            <h2 className="text-[21px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1 text-center lg:text-[20px]">
              {userName}
            </h2>
            <p className="text-[12px] font-bold text-slate-400 opacity-80 text-center lg:text-[11px] lg:tracking-[0.08em]">
              {roleLabel} | DEPT: {department}
            </p>
            <div className="hidden lg:block w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.18em] mb-3">
                Account
              </p>
              <div className="space-y-3 text-left">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-2">
                    ID
                  </p>
                  <p className="text-[15px] font-black text-slate-900 dark:text-white truncate">
                    {userId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em] mb-2">
                    Department
                  </p>
                  <p className="text-[15px] font-black text-slate-900 dark:text-white truncate">
                    {department}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[24px] lg:rounded-[18px] p-6 lg:h-[74px] lg:px-9 lg:py-2 flex justify-between border border-slate-100 dark:border-slate-800 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.5)] mb-8 lg:mb-0 lg:col-start-2 lg:row-start-1 lg:bg-white/78 lg:border-white/60 lg:backdrop-blur-2xl">
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
                <div className="flex flex-col items-center justify-center flex-1">
                  <span
                    className={cn("text-[22px] font-black mb-0.5 lg:text-[21px]", stat.color)}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] leading-none mt-1">
                    {stat.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800 self-center lg:h-12" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mb-8 lg:mb-0 lg:col-start-2 lg:row-start-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest lg:text-[12px] lg:tracking-[0.18em]">
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
            <div className="lg:w-full [&>*]:lg:mb-0 [&>*]:lg:rounded-[18px]">
              <ThemePresetSelector />
            </div>
          </div>

          <div className="mb-10 lg:mb-0 lg:col-start-2 lg:row-start-3 lg:min-h-0">
            <div className="mb-2 px-2 lg:px-1">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest lg:text-[12px] lg:tracking-[0.18em]">
                Personal Information
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-[24px] lg:rounded-[18px] lg:w-full border border-slate-100 dark:border-slate-800 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.5)] overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/50 lg:bg-white/78 lg:border-white/60 lg:backdrop-blur-2xl">
              {menuItems.map((item) => (
                <div
                  key={item.label}
                  className="p-5 lg:min-h-[60px] lg:px-5 lg:py-2.5 flex items-center gap-4"
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
                    <p className="text-[14px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight italic lg:text-[15px]">
                      {item.value || "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
