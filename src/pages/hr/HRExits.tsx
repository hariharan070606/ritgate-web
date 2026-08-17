import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Download, Search, Clock, FileText, RefreshCw, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { SkeletonList } from '../../components/ui/Skeleton';
import PageHeader from '../../components/common/PageHeader';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { useToast } from '../../context/ToastContext';
import { getGateLogs } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { usePageTitle } from '../../hooks/usePageTitle';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import EmptyState from '../../components/ui/EmptyState';

const formatDateShort = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
};

const getInitials = (name: string) =>
  (name || 'NA').split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);

export default function HRExits() {
  usePageTitle('Exit Logs');
  const { success: showSuccess, error: showError } = useToast();

  const [gateLogs, setGateLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rangeLabel, setRangeLabel] = useState("Today's exits");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadLogs = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const res = await getGateLogs(from, to);
      if (res.success) {
        const exits = (res.logs || []).filter((l: any) => l.scanType === 'EXIT');
        setGateLogs(exits);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs(fromDate || undefined, toDate || undefined);
  };

  const handleApplyRange = () => {
    if (!fromDate || !toDate) return;
    setRangeLabel(`${fromDate} to ${toDate}`);
    loadLogs(fromDate, toDate);
    setShowDatePicker(false);
  };

  const handleClearRange = () => {
    setFromDate('');
    setToDate('');
    setRangeLabel("Today's exits");
    loadLogs();
    setShowDatePicker(false);
  };

  const handleExportCSV = () => {
    if (gateLogs.length === 0) {
      showError('No Data', 'No exit records to export.');
      return;
    }

    try {
      const headers = ['Role', 'ID', 'Name', 'Department', 'Purpose', 'Exit Time'];
      const rows = gateLogs.map((r) => [
        r.userType || '-',
        r.userId || '-',
        r.name || '-',
        r.department || '-',
        r.purpose || '-',
        formatDateShort(r.time),
      ]);
      const csv = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HR_Exits_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Exported', 'Exit records exported as CSV.');
    } catch {
      showError('Export Failed', 'Could not export records.');
    }
  };

  const filtered = gateLogs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.name || '').toLowerCase().includes(q) ||
      (log.userId || '').toLowerCase().includes(q) ||
      (log.department || '').toLowerCase().includes(q) ||
      (log.purpose || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <PageHeader title="Exit Logs" />

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="desktop-page px-5 pt-4 pb-28 space-y-4 lg:px-0 lg:pt-0 lg:space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[24px] px-6 py-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-5 lg:desktop-card">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6 text-rose-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[28px] font-black text-rose-500 leading-none">{loading ? '--' : filtered.length}</p>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">{rangeLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="shrink-0 w-11 h-11 rounded-full border border-slate-200 bg-white/80 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-[0_10px_24px_-18px_rgba(37,99,235,0.8)] dark:hover:text-blue-300"
              aria-label="Refresh exit logs"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>

          <div className="hidden lg:block">
            <DesktopToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by name, ID, department, purpose..."
            >
              <Button
                type="button"
                onClick={() => setShowDatePicker(true)}
                variant="secondary"
                icon={<Calendar className="w-4 h-4 text-slate-700 dark:text-slate-200 shrink-0" />}
                className="h-11 px-4 text-xs font-black uppercase tracking-wider whitespace-nowrap flex-row inline-flex items-center gap-2 rounded-xl shrink-0"
              >
                Date Range
              </Button>
              <Button
                type="button"
                onClick={handleExportCSV}
                disabled={gateLogs.length === 0}
                variant="success"
                icon={<Download className="w-4 h-4 shrink-0" />}
                className="h-11 px-4 text-xs font-black uppercase tracking-wider whitespace-nowrap flex-row inline-flex items-center gap-2 rounded-xl shrink-0"
              >
                Export CSV
              </Button>
            </DesktopToolbar>
          </div>

          <div className="flex flex-row items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="flex-1 h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-row items-center justify-center gap-2 text-[12px] font-black uppercase tracking-wider text-slate-700 dark:text-white shadow-sm whitespace-nowrap px-3"
            >
              <Calendar className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span>Date Range</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={gateLogs.length === 0}
              className="flex-1 h-11 bg-emerald-600 rounded-2xl flex flex-row items-center justify-center gap-2 text-[12px] font-black uppercase tracking-wider text-white shadow-sm disabled:opacity-40 whitespace-nowrap px-3"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="relative lg:hidden">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[14px] font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {loading ? (
            <SkeletonList count={6} />
          ) : filtered.length === 0 ? (
            <div className="lg:desktop-card lg:p-10">
              <div className="hidden lg:block">
                <EmptyState
                  title="No exit records"
                  description="No exits found for the selected period."
                  icon={<LogOut className="w-7 h-7" />}
                />
              </div>
              <div className="flex flex-col items-center py-20 gap-3 lg:hidden">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
                  <LogOut className="w-10 h-10 text-slate-200 dark:text-slate-800" />
                </div>
                <h3 className="text-[17px] font-black text-slate-900 dark:text-white">No Exit Records</h3>
                <p className="text-[13px] font-medium text-slate-400 text-center max-w-[200px] leading-relaxed italic">
                  No exits found for the selected period.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden lg:block desktop-card overflow-hidden">
                <table className="desktop-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Purpose</th>
                      <th>Exit Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log, i) => (
                      <tr key={log.id || i}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                              {getInitials(log.name || log.userId)}
                            </div>
                            <div>
                              <p className="font-bold">{log.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{log.userId || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td>{log.userType || '-'}</td>
                        <td>{log.department || '-'}</td>
                        <td>{log.purpose || '-'}</td>
                        <td>{formatDateShort(log.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 lg:hidden">
                <AnimatePresence mode="popLayout">
                  {filtered.map((log, i) => (
                    <motion.div
                      key={log.id || i}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-sm font-bold text-rose-700 dark:text-rose-400 shrink-0">
                          {getInitials(log.name || log.userId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">
                            {log.name || log.userId || 'Unknown'}
                          </p>
                          <p className="text-[12px] font-bold text-slate-400 truncate">
                            {log.userId}
                            {log.department ? ` - ${log.department}` : ''}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-900/20 text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                          EXIT
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 space-y-2">
                        {log.purpose && log.purpose !== '-' && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 truncate">{log.purpose}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400">{formatDateShort(log.time)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </TopRefreshControl>

      <Modal isOpen={showDatePicker} onClose={() => setShowDatePicker(false)} title="Select Date Range" size="sm">
        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleClearRange} variant="secondary" size="sm" className="flex-1">
              Clear
            </Button>
            <Button onClick={handleApplyRange} disabled={!fromDate || !toDate} size="sm" className="flex-[2]">
              Apply Range
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
