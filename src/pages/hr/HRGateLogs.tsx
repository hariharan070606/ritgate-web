import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Calendar, CheckCircle2, Download, Search, Clock, User, Building2, FileText, AlertCircle, RefreshCw, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getGateLogs } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { usePageTitle } from '../../hooks/usePageTitle';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import EmptyState from '../../components/ui/EmptyState';

const formatDateShort = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

const getInitials = (name: string) =>
  (name || 'NA').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

interface HRGateLogsProps {
  onBack?: () => void;
}

export default function HRGateLogs({ onBack }: HRGateLogsProps) {
  usePageTitle('Gate Logs');
  const { getUserId } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [gateLogs, setGateLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rangeLabel, setRangeLabel] = useState("Today's gate logs");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadGateLogs = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const res = await getGateLogs(from, to);
      if (res.success) setGateLogs(res.logs || []);
    } catch (e) {
      console.error('Error loading gate logs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGateLogs(); }, [loadGateLogs]);

  const handleApplyRange = () => {
    if (!fromDate || !toDate) return;
    setRangeLabel(`${fromDate} → ${toDate}`);
    loadGateLogs(fromDate, toDate);
    setShowDatePicker(false);
  };

  const handleClearRange = () => {
    setFromDate('');
    setToDate('');
    setRangeLabel("Today's gate logs");
    loadGateLogs();
    setShowDatePicker(false);
  };

  const handleExportCSV = () => {
    if (gateLogs.length === 0) {
      showError('No Data', 'No records to export. Please select a date range with records first.');
      return;
    }
    setIsDownloading(true);
    try {
      const headers = ['Type', 'Role', 'ID', 'Name', 'Department', 'Purpose', 'Time'];
      const rows = gateLogs.map(r => [
        r.scanType || '-', r.userType || '-', r.userId || '-',
        r.name || '-', r.department || '-', r.purpose || '-', formatDateShort(r.time)
      ]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Gate_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Exported', 'Gate logs exported as CSV.');
    } catch {
      showError('Export Failed', 'Could not export gate logs.');
    } finally {
      setIsDownloading(false);
    }
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
    <div className="desktop-page desktop-page-wide space-y-6 pb-10">
      <DesktopPageHeader
        title="Gate Logs"
        subtitle={`${rangeLabel} - ${loading ? 'Loading...' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}`}
        eyebrow="Gate Management"
        action={
          <Button onClick={() => loadGateLogs(fromDate || undefined, toDate || undefined)} variant="secondary" className="gap-2">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />
      {/* Header */}
      <div className="flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mr-1">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-blue-400 mb-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Gate Management</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gate Logs</h2>
            <p className="text-xs text-slate-400 mt-1">
              {rangeLabel} — {loading ? 'Loading…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button onClick={() => loadGateLogs(fromDate || undefined, toDate || undefined)} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="hidden lg:block">
        <DesktopToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, ID, department, purpose..."
        >
          <Button onClick={() => setShowDatePicker(true)} variant="secondary" className="gap-2">
            <Calendar className="w-4 h-4" /> Date Range
          </Button>
          <Button
            onClick={handleExportCSV}
            variant={gateLogs.length > 0 ? 'success' : 'secondary'}
            className="gap-2"
            disabled={isDownloading || gateLogs.length === 0}
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </DesktopToolbar>
      </div>

      <div className="flex gap-3 lg:hidden">
        <Button onClick={() => setShowDatePicker(true)} variant="primary" size="sm" className="flex-1 gap-2">
          <Calendar className="w-4 h-4" /> Date Range
        </Button>
        <Button
          onClick={handleExportCSV}
          variant={gateLogs.length > 0 ? 'success' : 'secondary'}
          size="sm"
          className="flex-1 gap-2"
          disabled={isDownloading || gateLogs.length === 0}
        >
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative lg:hidden">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, ID, department..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Log List */}
      {loading ? (
        <SkeletonList count={6} />
      ) : filtered.length === 0 ? (
        <div className="lg:desktop-card lg:p-10">
          <div className="hidden lg:block">
            <EmptyState title="No gate log records" description="No entry or exit records found for the selected period." icon={<ArrowUpDown className="w-7 h-7" />} />
          </div>
          <div className="flex flex-col items-center py-16 gap-3 lg:hidden">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
            <ArrowUpDown className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No gate log records</h3>
          <p className="text-sm text-slate-400 text-center max-w-xs">
            No entry or exit records found for the selected period. Use Date Range to filter by a specific date.
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
                <th>Type</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id || i}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold',
                        log.scanType === 'ENTRY'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      )}>
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
                  <td><Badge variant={log.scanType === 'ENTRY' ? 'green' : 'red'}>{log.scanType || '-'}</Badge></td>
                  <td>{formatDateShort(log.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 lg:hidden">
          <AnimatePresence mode="popLayout">
            {filtered.map((log, i) => {
              const isEntry = log.scanType === 'ENTRY';
              const badgeVariant = isEntry ? 'green' : 'red';
              return (
                <motion.div key={log.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        'w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        isEntry ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      )}>
                        {getInitials(log.name || log.userId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{log.name || log.userId || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {log.userId}{log.department ? ` • ${log.department}` : ''}
                        </p>
                      </div>
                      <Badge variant={badgeVariant}>{log.scanType || '-'}</Badge>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2">
                      {log.purpose && log.purpose !== '-' && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{log.purpose}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className={cn('w-3.5 h-3.5 shrink-0', isEntry ? 'text-emerald-500' : 'text-rose-500')} />
                        <span className={cn('text-xs font-semibold', isEntry ? 'text-emerald-600' : 'text-rose-600')}>{formatDateShort(log.time)}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        </>
      )}

      {/* Date Range Picker Modal */}
      <AnimatePresence>
        {showDatePicker && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-[7px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-[650px] overflow-hidden rounded-[22px] border border-blue-200/70 bg-white shadow-[0_28px_90px_-32px_rgba(37,99,235,0.75)] dark:border-blue-900/50 dark:bg-slate-950"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between px-7 pt-7">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Select Date Range</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100 transition hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"
                  aria-label="Close date range picker"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 px-7 py-7">
                <div>
                  <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">From Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-sm font-bold text-slate-700 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.55)] outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <Calendar className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-700" />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">To Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      min={fromDate}
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-sm font-bold text-slate-700 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.55)] outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    />
                    <Calendar className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-700" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 px-7 py-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClearRange}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white text-sm font-black text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-blue-900/60 dark:bg-slate-950 dark:text-slate-200"
                >
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleApplyRange}
                  disabled={!fromDate || !toDate}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow-[0_16px_30px_-16px_rgba(37,99,235,0.85)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Apply Range
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
