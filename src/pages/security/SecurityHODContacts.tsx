import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Phone, Mail, Users, RefreshCw, X } from 'lucide-react';
import Card from '../../components/ui/Card';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { getHODContacts } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAdaptive } from '../../utils/useAdaptive';
import DesktopPageHeader from '../../components/desktop/DesktopPageHeader';
import DesktopToolbar from '../../components/desktop/DesktopToolbar';
import EmptyState from '../../components/ui/EmptyState';

const DEPARTMENTS = ['ALL', 'CSE', 'ECE', 'IT', 'AIDS', 'AIML', 'MECH', 'EEE', 'CCE', 'CSBS', 'VLSI', 'ADMIN'];

const getInitials = (name: string | null | undefined) => {
  if (!name || typeof name !== 'string' || name.trim() === '') return 'HD';
  const parts = name.trim().split(' ').filter(p => p.length > 0);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
  return 'HD';
};

export default function SecurityHODContacts() {
  usePageTitle('HOD Contacts');
  const { isDesktop } = useAdaptive();
  const { error: showError } = useToast();
  const [hods, setHods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const fetchHODs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHODContacts();
      if (res.success && res.data) setHods(res.data);
      else showError('Load Failed', 'Could not fetch HOD contacts.');
    } catch {
      showError('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHODs(); }, [fetchHODs]);

  const filtered = hods.filter(hod => {
    // Department filter
    if (selectedDept !== 'ALL') {
      const dept = (hod.department || '').toUpperCase();
      if (!dept.includes(selectedDept.toUpperCase())) return false;
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (hod.name || '').toLowerCase().includes(q) || (hod.department || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      {isDesktop && (
        <DesktopPageHeader
          eyebrow="Security Directory"
          title="HOD Contacts"
          subtitle={loading ? 'Loading contacts...' : `${filtered.length} contact${filtered.length !== 1 ? 's' : ''} available`}
          action={<button onClick={fetchHODs} className="h-10 px-4 rounded-xl bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Refresh</button>}
        />
      )}

      <div className="flex items-center justify-between lg:hidden">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Security Directory</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">HOD Contacts</h2>
          <p className="text-xs text-slate-400 mt-1">{loading ? 'Loading…' : `${filtered.length} contact${filtered.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button onClick={fetchHODs} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Search */}
      {isDesktop ? (
        <DesktopToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by HOD name or department..."
        />
      ) : (
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by HOD name or department..."
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
      )}

      {/* Department Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border',
              selectedDept === dept
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:bg-slate-50'
            )}
          >
            {dept === 'ALL' ? 'All Depts' : dept}
          </button>
        ))}
      </div>

      {/* HOD List */}
      {loading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No contacts found"
          description={searchQuery || selectedDept !== 'ALL' ? 'Try adjusting your search or filter.' : 'No HOD contacts available.'}
          icon={<Users className="w-8 h-8" />}
        />
      ) : isDesktop ? (
        <section className="desktop-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="desktop-table">
              <thead>
                <tr>
                  <th>HOD</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th className="!text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((hod, i) => (
                  <tr key={hod.id || i} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/35">
                    <td>
                      <p className="font-bold text-slate-950 dark:text-white">{hod.name || 'Unknown HOD'}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Head of Department</p>
                    </td>
                    <td>{hod.department || 'N/A'}</td>
                    <td>{hod.phone || 'N/A'}</td>
                    <td className="max-w-[320px] truncate">{hod.email || 'N/A'}</td>
                    <td><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((hod, i) => (
              <motion.div key={hod.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                <Card className="overflow-hidden">
                  {/* Top: Avatar + Info */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {getInitials(hod.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-900 dark:text-white truncate">{hod.name || 'Unknown HOD'}</p>
                      <p className="text-xs text-slate-400 mb-1.5">{hod.department || 'N/A'}</p>
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md">Head of Department</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-medium text-blue-600">Active</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{hod.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{hod.email || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <a
                      href={`tel:${hod.phone || ''}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </a>
                    <a
                      href={`mailto:${hod.email || ''}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                    >
                      <Mail className="w-4 h-4" /> Email
                    </a>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
