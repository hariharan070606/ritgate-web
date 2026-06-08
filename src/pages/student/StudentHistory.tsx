import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  QrCode, 
  MapPin, 
  Calendar,
  Clock,
  History
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';
import { getUserEntryHistory, getStudentGatePassRequests } from '../../services/api.service';
import PageHeader from '../../components/common/PageHeader';
import type { Student } from '../../types';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import { formatDateTime } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

interface HistoryItem {
  id: string;
  type: 'ENTRY' | 'EXIT' | 'LATE_ENTRY' | 'GATE_PASS';
  timestamp: string;
  reason?: string;
  passId?: string;
  location?: string;
}

export default function StudentHistory() {
  usePageTitle('History');
  const { user: rawUser, logout } = useAuth();
  const user = rawUser as Student;
  const { refreshCount } = useRefresh();

  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ entries: 0, exits: 0 });

  useEffect(() => {
    loadData();
  }, [refreshCount]);

  const loadData = async () => {
    if (!user?.regNo) return;
    try {
      const [entryHistory, gatePassResponse] = await Promise.all([
        getUserEntryHistory(user.regNo),
        getStudentGatePassRequests(user.regNo),
      ]);

      const gatePasses = gatePassResponse.success ? (gatePassResponse.requests || []) : [];
      const combinedHistory: HistoryItem[] = [];

      // Process raw gate logs
      entryHistory.forEach((item: any) => {
        if (item.entryTime) {
          combinedHistory.push({
            id: `entry-${item.id || Date.now()}-${Math.random()}`,
            type: item.lateEntry ? 'LATE_ENTRY' : 'ENTRY',
            timestamp: item.entryTime,
            reason: item.lateReason || undefined,
            location: 'Main Gate',
          });
        }
        if (item.exitTime) {
          combinedHistory.push({
            id: `exit-${item.id || Date.now()}-${Math.random()}`,
            type: 'EXIT',
            timestamp: item.exitTime,
            location: 'Main Gate',
          });
        }
      });

      // Process used gate passes
      if (gatePasses && Array.isArray(gatePasses)) {
        gatePasses
          .filter((pass: any) => (pass.status === 'APPROVED' || pass.status === 'USED') && pass.usedAt)
          .forEach((pass: any) => {
            combinedHistory.push({
              id: `gatepass-${pass.id}`,
              type: 'GATE_PASS',
              timestamp: pass.usedAt,
              passId: `GP-${pass.id}`,
              reason: pass.purpose || pass.reason,
              location: 'Main Gate',
            });
          });
      }

      combinedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistoryData(combinedHistory);
      
      setStats({
        entries: combinedHistory.filter(i => i.type === 'ENTRY' || i.type === 'LATE_ENTRY').length,
        exits: combinedHistory.filter(i => i.type === 'EXIT').length
      });
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getItemConfig = (type: string) => {
    switch (type) {
      case 'ENTRY': return { label: 'Entry', icon: LogIn, color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'EXIT': return { label: 'Exit', icon: LogOut, color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'LATE_ENTRY': return { label: 'Late Entry', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' };
      case 'GATE_PASS': return { label: 'Gate Pass Used', icon: QrCode, color: 'text-blue-700', bg: 'bg-blue-50' };
      default: return { label: 'Unknown', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' };
    }
  };

  const studentName = `${user?.firstName} ${user?.lastName || ''}`.trim();

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <PageHeader title="History" />

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pb-28">
          {/* Summary Stats Card */}
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-[28px] p-6 flex items-center justify-around shadow-sm border border-slate-50 dark:border-slate-800">
            <div className="flex flex-col items-center">
               <span className="text-[32px] font-black text-[var(--color-primary)] leading-none mb-2">{stats.entries}</span>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Entries</span>
            </div>
            <div className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800" />
            <div className="flex flex-col items-center">
               <span className="text-[32px] font-black text-[var(--color-primary)] leading-none mb-2">{stats.exits}</span>
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Exits</span>
            </div>
          </div>

          {/* List Section */}
          <div className="mt-8 space-y-4">
            {loading ? (
              <SkeletonList count={5} />
            ) : historyData.length > 0 ? (
              historyData.map((item) => {
                const config = getItemConfig(item.type);
                const Icon = config.icon;
                return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[24px] p-4 flex gap-4 border border-slate-100 dark:border-slate-800 shadow-sm"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      config.bg
                    )}>
                      <Icon className={cn("w-6 h-6", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                         <h6 className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">
                           {config.label}
                         </h6>
                         <span className="text-[11px] font-bold text-slate-300">
                           {formatDateTime(item.timestamp)}
                         </span>
                      </div>

                      {item.passId && (
                        <p className="text-[12px] font-black text-[var(--color-primary)] uppercase tracking-tight">
                          Pass ID: {item.passId}
                        </p>
                      )}

                      {item.reason && (
                        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.reason}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-3 h-3 text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                          {item.location || 'Main Gate'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                    <History className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                 </div>
                 <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">No Records Found</h5>
                 <p className="text-[13px] font-medium text-slate-400 max-w-[180px] leading-relaxed italic">
                    Your gate movement history will appear here.
                 </p>
              </div>
            )}
          </div>
        </div>
      </TopRefreshControl>
    </div>
  );
}
