import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Calendar, Download, Search, Clock, FileText, RefreshCw, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
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

export default function NCIGateLogs() {
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
    setFromDate(''); setToDate('');
    setRangeLabel("Today's gate logs");
    loadGateLogs();
    setShowDatePicker(false);
  };

  const handleExportCSV = () => {
    if (gateLogs.length === 0) { showError('No Data', 'No records to export.'); return; }
    try {
      const headers = ['Type', 'Role', 'ID', 'Name', 'Department', 'Purpose', 'Time'];
      const rows = gateLogs.map(r => [r.scanType || '-', r.userType || '-', r.userId || '-', r.name || '-', r.department || '-', r.purpose || '-', formatDateShort(r.time)]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `NCI_Gate_Logs_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      showSuccess('Exported', 'Gate logs exported as CSV.');
    } catch { showError('Export Failed', 'Could not export gate logs.'); }
  };

  const filtered = gateLogs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (log.name || '').toLowerCase().includes(q) || (log.userId || '').toLowerCase().includes(q) || (log.department || '').toLowerCase().includes(q);
  });

  return (
    <div className="desktop-page desktop-page-wide space-y-6 pb-10">
      <DesktopPageHeader
        title="Gate Logs"
        subtitle={`${rangeLabel} - ${loading ? 'Loading...' : `${filtered.length} records`}`}
        eyebrow="NCI Gate Management"
        action={
          <Button onClick={() => loadGateLogs(fromDate || undefined, toDate || undefined)} variant="secondary" className="gap-2">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />
      <div className="flex items-center justify-between lg:hidden">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">NCI Gate Management</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gate Logs</h2>
          <p className="text-xs text-slate-400 mt-1">{rangeLabel} — {loading ? 'Loading…' : `${filtered.length} records`}</p>
        </div>
        <button onClick={() => loadGateLogs(fromDate || undefined, toDate || undefined)} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="hidden lg:block">
        <DesktopToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, ID, department..."
        >
          <Button onClick={() => setShowDatePicker(true)} variant="secondary" className="gap-2">
            <Calendar className="w-4 h-4" /> Date Range
          </Button>
          <Button onClick={handleExportCSV} variant={gateLogs.length > 0 ? 'success' : 'secondary'} className="gap-2" disabled={gateLogs.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </DesktopToolbar>
      </div>

      <div className="flex gap-3 lg:hidden">
        <Button onClick={() => setShowDatePicker(true)} variant="primary" size="sm" className="flex-1 gap-2">
          <Calendar className="w-4 h-4" /> Date Range
        </Button>
        <Button onClick={handleExportCSV} variant={gateLogs.length > 0 ? 'success' : 'secondary'} size="sm" className="flex-1 gap-2" disabled={gateLogs.length === 0}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="relative lg:hidden">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search by name, ID, department..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/10 placeholder:text-slate-300" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button>}
      </div>

      {loading ? <SkeletonList count={6} /> : filtered.length === 0 ? (
        <div className="lg:desktop-card lg:p-10">
          <div className="hidden lg:block">
            <EmptyState title="No gate log records" description="No records found for the selected period." icon={<ArrowUpDown className="w-7 h-7" />} />
          </div>
          <div className="flex flex-col items-center py-16 gap-3 lg:hidden">
          <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center"><ArrowUpDown className="w-8 h-8 text-slate-300" /></div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No gate log records</h3>
          <p className="text-sm text-slate-400 text-center max-w-xs">No records found for the selected period.</p>
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
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold',
                        log.scanType === 'ENTRY' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')}>
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
              return (
                <motion.div key={log.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <Card className="overflow-hidden">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn('w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        isEntry ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400')}>
                        {getInitials(log.name || log.userId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{log.name || log.userId || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 truncate">{log.userId}{log.department ? ` • ${log.department}` : ''}</p>
                      </div>
                      <Badge variant={isEntry ? 'green' : 'red'}>{log.scanType || '-'}</Badge>
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

      <Modal isOpen={showDatePicker} onClose={() => setShowDatePicker(false)} title="Select Date Range" size="sm">
        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20" />
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
