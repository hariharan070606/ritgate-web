import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  QrCode, 
  MapPin, 
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
import { EMPTY_COPY } from '../../config/nativeCopy';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopStatCard from '../../components/desktop/DesktopStatCard';
import EmptyState from '../../components/ui/EmptyState';

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
  const { user: rawUser } = useAuth();
  const { isDesktop } = useAdaptive();
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
        const entryTimestamp = item.entryTime || item.entry_time || item.entryDateTime || item.entry_date_time;
        if (entryTimestamp) {
          const isLate = !!(item.lateEntry || item.late_entry || item.isLate || item.is_late || item.late);
          combinedHistory.push({
            id: `entry-${item.id || Date.now()}-${Math.random()}`,
            type: isLate ? 'LATE_ENTRY' : 'ENTRY',
            timestamp: entryTimestamp,
            reason: item.lateReason || item.reason || undefined,
            location: 'Main Gate',
          });
        }
        const exitTimestamp = item.exitTime || item.exit_time || item.exitDateTime || item.exit_date_time;
        if (exitTimestamp) {
          combinedHistory.push({
            id: `exit-${item.id || Date.now()}-${Math.random()}`,
            type: 'EXIT',
            timestamp: exitTimestamp,
            location: 'Main Gate',
          });
        }
      });

      // Process used gate passes
      if (gatePasses && Array.isArray(gatePasses)) {
        gatePasses
          .filter((pass: any) => {
            const status = String(pass.status || '').toUpperCase();
            const hasTime = pass.usedAt || pass.exitTime || pass.exit_time || pass.scannedAt || pass.entryTime || pass.entry_time || pass.exitDateTime;
            return ['APPROVED', 'USED', 'EXITED', 'ENTERED', 'COMPLETED'].includes(status) && hasTime;
          })
          .forEach((pass: any) => {
            combinedHistory.push({
              id: `gatepass-${pass.id}`,
              type: 'GATE_PASS',
              timestamp: pass.exitTime || pass.exit_time || pass.usedAt || pass.scannedAt || pass.entryTime || pass.entry_time || pass.exitDateTime,
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
        exits: combinedHistory.filter(i => i.type === 'EXIT' || i.type === 'GATE_PASS').length
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
    <div className="min-h-screen lg:bg-transparent lg:min-h-0 bg-[#F8FAFC] dark:bg-slate-950">
      <PageHeader title="History" />

      {isDesktop && (
        <DesktopPageHeader
          title="History"
          subtitle="Review your entry, exit, and gate pass movement records"
        />
      )}

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pb-28 lg:px-0 lg:pb-8">
          {/* Summary Stats Card */}
          {isDesktop ? (
            <div className="grid grid-cols-2 gap-4">
              <DesktopStatCard label="Entries" value={stats.entries} icon={LogIn} tone="emerald" />
              <DesktopStatCard label="Exits" value={stats.exits} icon={LogOut} tone="rose" />
            </div>
          ) : (
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
          )}

          {/* List Section */}
          <div className="mt-8 space-y-4 min-h-[50vh] flex flex-col lg:mt-6 lg:min-h-0">
            {loading ? (
              <SkeletonList count={5} />
            ) : isDesktop && historyData.length > 0 ? (
              <section className="desktop-card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-950 dark:text-white">Movement Records</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Latest gate activity for {studentName || user?.regNo}</p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{historyData.length} Records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="desktop-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Pass</th>
                        <th>Reason</th>
                        <th>Location</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((item) => {
                        const config = getItemConfig(item.type);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35">
                            <td>
                              <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase', config.bg, config.color)}>
                                {config.label}
                              </span>
                            </td>
                            <td>{item.passId || '-'}</td>
                            <td className="max-w-[360px] truncate">{item.reason || '-'}</td>
                            <td>{item.location || 'Main Gate'}</td>
                            <td>{formatDateTime(item.timestamp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
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
              isDesktop ? (
                <EmptyState
                  title={EMPTY_COPY.noRecordsFound}
                  description="Your gate movement history will appear here."
                  icon={<History className="w-8 h-8" />}
                />
              ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                    <History className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                 </div>
                 <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">{EMPTY_COPY.noRecordsFound}</h5>
                 <p className="text-[13px] font-medium text-slate-400 max-w-[180px] leading-relaxed italic">
                    Your gate movement history will appear here.
                 </p>
              </div>
              )
            )}
          </div>
        </div>
      </TopRefreshControl>
    </div>
  );
}
