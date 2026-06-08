import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogOut, ArrowRight, Activity, Camera, ShieldCheck, MapPin, AlertCircle, ChevronRight, User } from 'lucide-react';
import Card from '../../components/ui/Card';
import KPICard from '../../components/common/KPICard';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { getSecurityStats, getRecentScans } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { transitions } from '../../design-system/animations';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function SecurityDashboard() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ active: 0, exited: 0, total: 0 });
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [statsRes, scansRes] = await Promise.all([
        getSecurityStats(),
        getRecentScans(),
      ]);
      if (statsRes.success && statsRes.data) {
        setStats({
          active: statsRes.data.active || 0,
          exited: statsRes.data.exited || 0,
          total: statsRes.data.total || 0,
        });
      }
      setRecentScans(scansRes || []);
    } catch (err) {
      console.error('Dash error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const secName = (user as any)?.securityName || (user as any)?.name || 'Personnel';
  const gate = (user as any)?.gateAssigned || 'Main Gate';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning,' : hour < 17 ? 'Good Afternoon,' : 'Good Evening,';

  // 1. Loading State
  if (isLoading && recentScans.length === 0) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="space-y-2 text-left">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-48 w-full rounded-[32px]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-[16px]" />
          <Skeleton className="h-24 w-full rounded-[16px]" />
        </div>
        <SkeletonList count={3} />
      </div>
    );
  }

  // 2. Error State
  if (hasError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-900 uppercase">Sync Failed</h3>
          <p className="text-xs font-medium text-slate-400 mt-1">Unable to fetch security dashboard data.</p>
        </div>
        <Button onClick={fetchDashboardData} variant="secondary" size="sm">Retry Sync</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Greeting & User Info */}
      <div className="text-left">
        <p className="text-[14px] font-semibold text-slate-400 leading-none">{greeting}</p>
        <h2 className="text-[28px] font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight uppercase">
          {secName}
        </h2>
        <div className="flex items-center gap-3 mt-2">
           <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-primary)] bg-blue-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100 dark:border-indigo-900/30">
            <MapPin className="w-3 h-3" />
            {gate}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
            <ShieldCheck className="w-3 h-3" />
            ON DUTY
          </div>
        </div>
      </div>

      {/* 2. Primary Action: Scanner */}
      <motion.div 
        whileTap={transitions.feedback.tap}
        onClick={() => navigate('/scanner')}
        className="group relative cursor-pointer overflow-hidden rounded-[32px] shadow-2xl shadow-blue-200 dark:shadow-none"
      >
        <div className="absolute inset-0 bg-[var(--color-primary)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
        <div className="relative p-8 flex items-center gap-6 overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
          
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-inner">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-tight">Launch Scanner</h3>
            <p className="text-blue-100 text-[11px] font-bold mt-1 uppercase tracking-widest opacity-80">SCAN QR FOR ENTRY / EXIT</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
        </div>
      </motion.div>

      {/* 3. Operational Metrics */}
      <div className="space-y-3 text-left">
        <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest px-1">Live Statistics</h3>
        <div className="grid grid-cols-3 gap-3">
          <KPICard title="Active" value={stats.active} icon={<Users className="w-5 h-5" />} color="blue" />
          <KPICard title="Entries" value={stats.total} icon={<Activity className="w-5 h-5" />} color="green" />
          <KPICard title="Exits" value={stats.exited} icon={<LogOut className="w-5 h-5" />} color="amber" />
        </div>
      </div>

      {/* 4. Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Recent Activity</h3>
          </div>
          <button 
            onClick={() => navigate('/scan-history')} 
            className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest hover:opacity-70 transition-opacity"
          >
            History
          </button>
        </div>

        <div className="space-y-3">
          {recentScans.length === 0 ? (
            <EmptyState title="Quiet Zone" description="No scan activity recorded today." icon={<Activity className="w-12 h-12 text-slate-200" />} />
          ) : (
            <AnimatePresence mode="popLayout">
              {recentScans.slice(0, 5).map((scan, i) => (
                <motion.div 
                  key={scan.id || i} 
                  initial={transitions.page.initial}
                  animate={transitions.page.animate}
                  layout
                >
                  <Card padding="sm" className="group active:scale-[0.99] transition-all border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg",
                          scan.accessGranted ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                        )}>
                          {(scan.personName || 'U').substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-1">
                             <p className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight uppercase leading-none">{scan.personName || 'UNKNOWN'}</p>
                             <span className="text-[9px] text-slate-400 font-bold tabular-nums uppercase leading-none">{scan.scanTime || 'NOW'}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold truncate uppercase tracking-widest">{scan.personType} <span className="text-slate-300 mx-1">|</span> {scan.scanType}</p>
                        </div>
                      </div>
                      <div className={cn(
                        'px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-widest uppercase border',
                        scan.accessGranted 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30' 
                          : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30'
                      )}>
                        {scan.accessGranted ? 'Granted' : 'Denied'}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
