import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calendar, Download, Search, Clock, FileText, RefreshCw, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { SkeletonList } from '../../components/ui/Skeleton';
import PageHeader from '../../components/common/PageHeader';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { useToast } from '../../context/ToastContext';
import { getGateLogs } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { usePageTitle } from '../../hooks/usePageTitle';

const formatDateShort = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

const getInitials = (name: string) =>
  (name || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

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
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleRefresh = () => { setRefreshing(true); loadLogs(fromDate || undefined, toDate || undefined); };

  const handleApplyRange = () => {
    if (!fromDate || !toDate) return;
    setRangeLabel(`${fromDate} → ${toDate}`);
    loadLogs(fromDate, toDate);
    setShowDatePicker(false);
  };

  const handleClearRange = () => {
    setFromDate(''); setToDate('');
    setRangeLabel("Today's exits");
    loadLogs();
    setShowDatePicker(false);
  };

  const handleExportCSV = () => {
    if (gateLogs.length === 0) { showError('No Data', 'No exit records to export.'); return; }
    try {
      const headers = ['Role', 'ID', 'Name', 'Department', 'Purpose', 'Exit Time'];
      const rows = gateLogs.map(r => [r.userType || '-', r.userId || '-', r.name || '-', r.department || '-', r.purpose || '-', formatDateShort(r.time)]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `HR_Exits_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      showSuccess('Exported', 'Exit records exported as CSV.');
    } catch { showError('Export Failed', 'Could not export records.'); }
  };

  const filtered = gateLogs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (log.name || '').toLowerCase().includes(q) ||
      (log.userId || '').toLowerCase().includes(q) ||
      (log.department || '').toLowerCase().includes(q) ||
      (log.purpose || '').toLowerCase().includes(q);
  });

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <PageHeader title="Exit Logs" />

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-4 pb-28 space-y-4">
          {/* Stats bar */}
          <div className="bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center shrink-0">
              <LogOut className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <p className="text-[28px] font-black text-rose-500 leading-none">{loading ? '—' : filtered.length}</p>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{rangeLabel}</p>
            </div>
            <button
              onClick={() => loadLogs(fromDate || undefined, toDate || undefined)}
              className="ml-auto w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center"
            >
              <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowDatePicker(true)}
              className="flex-1 h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black text-slate-700 dark:text-white shadow-sm"
            >
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" /> Date Range
            </button>
            <button
              onClick={handleExportCSV}
              disabled={gateLogs.length === 0}
              className="flex-1 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black text-white shadow-sm disabled:opacity-40"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[14px] font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <SkeletonList count={6} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
                <LogOut className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h3 className="text-[17px] font-black text-slate-900 dark:text-white">No Exit Records</h3>
              <p className="text-[13px] font-medium text-slate-400 text-center max-w-[200px] leading-relaxed italic">
                No exits found for the selected period.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
                        <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">{log.name || log.userId || 'Unknown'}</p>
                        <p className="text-[12px] font-bold text-slate-400 truncate">
                          {log.userId}{log.department ? ` • ${log.department}` : ''}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-900/20 text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">EXIT</span>
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
          )}
        </div>
      </TopRefreshControl>

      <Modal isOpen={showDatePicker} onClose={() => setShowDatePicker(false)} title="Select Date Range" size="sm">
        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleClearRange} variant="secondary" size="sm" className="flex-1">Clear</Button>
            <Button onClick={handleApplyRange} disabled={!fromDate || !toDate} size="sm" className="flex-[2]">Apply Range</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
