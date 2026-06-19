import React, { useState, useEffect } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  CheckCircle2,
  Circle,
  Info,
  ChevronDown,
  ChevronRight,
  Send,
  ShieldCheck,
  LayoutGrid,
  Check,
  UserCircle2,
  GraduationCap,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { getHODDepartmentStudents, getHODDepartmentStaff, submitHODBulkPass } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { SkeletonList } from '../../components/ui/Skeleton';
import { nowIST, nowISTPlus } from '../../utils/dateUtils';
import AttachmentUpload from '../../components/common/AttachmentUpload';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Student {
  id: number;
  regNo: string;
  fullName: string;
  department: string;
  section?: string;
  year?: string;
}

interface Staff {
  id: number;
  staffCode: string;
  staffName: string;
  department: string;
  designation?: string;
}

interface HODBulkPassProps {
  onBack: () => void;
}

type ActiveTab = 'STUDENTS' | 'STAFF';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uniq(arr: (string | undefined)[]): string[] {
  return Array.from(new Set(arr.filter(Boolean) as string[])).sort();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HODBulkPass({ onBack }: HODBulkPassProps) {
  usePageTitle('Bulk Pass');
  const { getUserId } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const hodCode = getUserId();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('STUDENTS');

  // ── Selection (shared across both tabs) ───────────────────────────────────
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [includeStaff, setIncludeStaff] = useState(false);

  // ── Student filters ───────────────────────────────────────────────────────
  const [studentSearch, setStudentSearch] = useState('');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterStudentDept, setFilterStudentDept] = useState('ALL');

  // ── Staff filters ─────────────────────────────────────────────────────────
  const [staffSearch, setStaffSearch] = useState('');
  const [filterStaffDept, setFilterStaffDept] = useState('ALL');

  // ── Collapsed section groups ──────────────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // ── Form ──────────────────────────────────────────────────────────────────
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUri, setAttachmentUri] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, staffRes] = await Promise.all([
        getHODDepartmentStudents(hodCode),
        getHODDepartmentStaff(hodCode),
      ]);
      if (studentsRes.success) {
        setStudents((studentsRes.students || []).map((s: any) => ({
          ...s,
          fullName: s.fullName || s.studentName || s.name || '',
          year: s.year || s.currentYear || 'N/A',
          section: s.section || 'N/A',
        })));
      }
      if (staffRes.success) {
        setStaff((staffRes.staff || []).map((s: any) => ({
          ...s,
          staffName: s.staffName,
          designation: s.designation || s.role || 'Staff',
        })));
      }
    } catch {
      showToastError('Sync Error', 'Failed to pull department registry');
    } finally {
      setLoading(false);
    }
  };

  // ── Filter options ────────────────────────────────────────────────────────
  const availableYears    = ['ALL', ...uniq(students.map(s => s.year))];
  const availableSections = ['ALL', ...uniq(students.map(s => s.section))];
  const availableStudentDepts = ['ALL', ...uniq(students.map(s => s.department))];
  const availableStaffDepts   = ['ALL', ...uniq(staff.map(s => s.department))];

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredStudents = students.filter(s => {
    if (filterStudentDept !== 'ALL' && s.department !== filterStudentDept) return false;
    if (filterYear !== 'ALL' && s.year !== filterYear) return false;
    if (filterSection !== 'ALL' && s.section !== filterSection) return false;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      return s.fullName.toLowerCase().includes(q) ||
             s.regNo.toLowerCase().includes(q) ||
             s.department.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredStaff = staff.filter(s => {
    if (filterStaffDept !== 'ALL' && s.department !== filterStaffDept) return false;
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase();
      return s.staffName.toLowerCase().includes(q) ||
             s.staffCode.toLowerCase().includes(q) ||
             s.department.toLowerCase().includes(q) ||
             (s.designation || '').toLowerCase().includes(q);
    }
    return true;
  });

  // ── Student grouping: Year → Section ─────────────────────────────────────
  const studentGroups = (() => {
    const map = new Map<string, Student[]>();
    for (const s of filteredStudents) {
      const key = `Year ${s.year} — Sec ${s.section}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, list]) => ({ key, list }));
  })();

  // ── Staff grouping: Department ────────────────────────────────────────────
  const staffGroups = (() => {
    const map = new Map<string, Staff[]>();
    for (const s of filteredStaff) {
      const key = s.department || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, list]) => ({ key, list }));
  })();

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleSection = (key: string) =>
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleStudent = (regNo: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(regNo)) { next.delete(regNo); if (receiverId === regNo) setReceiverId(null); }
      else next.add(regNo);
      return next;
    });
  };

  const toggleStaff = (staffCode: string) => {
    setSelectedStaffIds(prev => {
      const next = new Set(prev);
      if (next.has(staffCode)) { next.delete(staffCode); if (receiverId === staffCode) setReceiverId(null); }
      else next.add(staffCode);
      return next;
    });
  };

  const toggleStudentGroup = (list: Student[]) => {
    const ids = list.map(s => s.regNo);
    const allSelected = ids.every(id => selectedStudentIds.has(id));
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (allSelected) { ids.forEach(id => { next.delete(id); if (receiverId === id) setReceiverId(null); }); }
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const toggleStaffGroup = (list: Staff[]) => {
    const ids = list.map(s => s.staffCode);
    const allSelected = ids.every(id => selectedStaffIds.has(id));
    setSelectedStaffIds(prev => {
      const next = new Set(prev);
      if (allSelected) { ids.forEach(id => { next.delete(id); if (receiverId === id) setReceiverId(null); }); }
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const selectAllStudents = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
      setReceiverId(null);
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.regNo)));
    }
  };

  const selectAllStaff = () => {
    if (selectedStaffIds.size === filteredStaff.length && filteredStaff.length > 0) {
      setSelectedStaffIds(new Set());
      setReceiverId(null);
    } else {
      setSelectedStaffIds(new Set(filteredStaff.map(s => s.staffCode)));
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalSelected = selectedStudentIds.size + selectedStaffIds.size;

  // ── All selected people for QR holder picker ─────────────────────────────
  const allSelectedPeople = [
    ...students.filter(s => selectedStudentIds.has(s.regNo)).map(s => ({ id: s.regNo, name: s.fullName, sub: `${s.regNo} • Yr ${s.year} ${s.section}`, type: 'STUDENT' as const })),
    ...staff.filter(s => selectedStaffIds.has(s.staffCode)).map(s => ({ id: s.staffCode, name: s.staffName || 'Unknown Staff', sub: `${s.staffCode} • ${s.designation}`, type: 'STAFF' as const })),
  ];

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitBulk = async () => {
    if (!purpose.trim() || !reason.trim()) return showToastError('Missing Fields', 'Please enter purpose and reason');
    if (totalSelected === 0) return showToastError('No Selection', 'Select at least one person');
    if (!includeStaff && !receiverId) return showToastError('Missing Receiver', 'Select a QR code holder');

    await withLock(async () => {
      try {
        const res = await submitHODBulkPass({
          hodCode,
          purpose: purpose.trim(),
          reason: reason.trim(),
          exitDateTime: nowIST(),
          returnDateTime: nowISTPlus(24),
          students: Array.from(selectedStudentIds),
          staff: Array.from(selectedStaffIds),
          includeStaff,
          receiverId: includeStaff ? undefined : (receiverId || undefined),
          attachmentUri: attachmentUri || undefined,
        });
        if (res.success) {
          showToastSuccess('Batch Sent', `Authorization for ${totalSelected} members submitted`);
          onBack();
        } else {
          showToastError('Submission Failed', res.message);
        }
      } catch {
        showToastError('Error', 'Network request failed');
      }
    }, 'Dispatching batch authorization...');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-[var(--color-primary)] rounded-[32px] p-6 text-white shadow-xl shadow-blue-100 dark:shadow-none">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-[18px] font-black leading-none mb-1">Bulk Student Pass</h3>
            <p className="text-[13px] font-bold text-blue-100 opacity-90 uppercase tracking-widest">HOD Control</p>
          </div>
        </div>
        <p className="text-[12px] font-medium leading-relaxed opacity-80">
          Create a unified gate pass for multiple department members. Assign a QR holder from the selected group.
        </p>
      </div>

      <div className="space-y-5">

        {/* Include Staff Toggle */}
        <button
          onClick={() => { setIncludeStaff(v => !v); if (!includeStaff) setReceiverId(null); }}
          className={cn(
            'w-full flex items-center justify-between p-5 rounded-[24px] border transition-all',
            includeStaff
              ? 'bg-blue-50 dark:bg-indigo-900/10 border-blue-200 dark:border-[var(--color-primary)]'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm',
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', includeStaff ? 'bg-[var(--color-primary)] shadow-lg shadow-blue-200' : 'bg-slate-100 dark:bg-slate-800')}>
              <ShieldCheck className={cn('w-5 h-5', includeStaff ? 'text-white' : 'text-slate-400')} />
            </div>
            <div className="text-left">
              <p className={cn('text-[14px] font-black', includeStaff ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white')}>Include HOD/Staff</p>
              <p className="text-[11px] font-bold text-slate-400">Staff will be the primary QR holder</p>
            </div>
          </div>
          <div className={cn('w-12 h-6 rounded-full relative transition-colors', includeStaff ? 'bg-[var(--color-primary)]' : 'bg-slate-200 dark:bg-slate-700')}>
            <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm', includeStaff ? 'left-7' : 'left-1')} />
          </div>
        </button>

        {/* ── TABS ─────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-[24px] p-1.5 flex gap-1.5 border border-slate-100 dark:border-slate-800 shadow-sm">
          {(['STUDENTS', 'STAFF'] as ActiveTab[]).map(tab => {
            const isActive = activeTab === tab;
            const count = tab === 'STUDENTS' ? selectedStudentIds.size : selectedStaffIds.size;
            const Icon = tab === 'STUDENTS' ? GraduationCap : UserCircle2;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] transition-all',
                  isActive
                    ? tab === 'STUDENTS'
                      ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-blue-100 dark:shadow-none'
                      : 'bg-violet-600 text-white shadow-lg shadow-violet-100 dark:shadow-none'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                )}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="text-[13px] font-black uppercase tracking-widest">{tab === 'STUDENTS' ? 'Students' : 'Staff'}</span>
                {count > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-black',
                    isActive ? 'bg-white/20 text-white' : tab === 'STUDENTS' ? 'bg-blue-100 text-[var(--color-primary)]' : 'bg-violet-100 text-violet-700',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── STUDENTS TAB ─────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'STUDENTS' && (
            <motion.div key="students" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">

              {/* Student Filters */}
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label>
                    <select value={filterStudentDept} onChange={e => setFilterStudentDept(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-[13px] font-bold text-slate-900 dark:text-white outline-none">
                      {availableStudentDepts.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Depts' : d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year</label>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-[13px] font-bold text-slate-900 dark:text-white outline-none">
                      {availableYears.map(y => <option key={y} value={y}>{y === 'ALL' ? 'All Years' : `Year ${y}`}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section</label>
                  <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
                    className="w-full h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-[13px] font-bold text-slate-900 dark:text-white outline-none">
                    {availableSections.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Sections' : `Section ${s}`}</option>)}
                  </select>
                </div>
              </div>

              {/* Student Search + Select All */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search name or reg no..."
                    className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 text-[13px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none" />
                </div>
                <button onClick={selectAllStudents}
                  className="shrink-0 text-[11px] font-black text-[var(--color-primary)] uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-indigo-900/20 px-3 py-2 rounded-xl transition-colors">
                  {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Student List */}
              <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[260px] max-h-[420px] overflow-y-auto">
                {loading ? <SkeletonList count={5} /> : studentGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <GraduationCap className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-[13px] font-bold text-slate-400">No students match your filters</p>
                    <button onClick={() => { setFilterStudentDept('ALL'); setFilterYear('ALL'); setFilterSection('ALL'); setStudentSearch(''); }}
                      className="mt-2 text-[12px] font-bold text-[var(--color-primary)] hover:underline">Clear filters</button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {studentGroups.map(({ key, list }) => {
                      const isCollapsed = collapsedSections.has(key);
                      const groupSelected = list.filter(s => selectedStudentIds.has(s.regNo)).length;
                      const allGroupSelected = groupSelected === list.length;
                      const someSelected = groupSelected > 0 && !allGroupSelected;
                      return (
                        <div key={key}>
                          {/* Group header */}
                          <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-50/50 dark:bg-indigo-900/10">
                            <button onClick={() => toggleStudentGroup(list)} className="shrink-0 p-0.5">
                              {allGroupSelected
                                ? <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)]" />
                                : someSelected
                                  ? <CheckCircle2 className="w-5 h-5 text-blue-400" />
                                  : <Circle className="w-5 h-5 text-slate-200" />}
                            </button>
                            <button onClick={() => toggleSection(key)} className="flex-1 flex items-center justify-between text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{key}</span>
                                <span className="px-2 py-0.5 bg-[var(--color-primary)] text-[10px] font-black text-white rounded-md">{groupSelected}/{list.length}</span>
                              </div>
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                            </button>
                          </div>
                          {/* Group rows */}
                          {!isCollapsed && (
                            <div className="bg-white dark:bg-slate-900">
                              {list.map(student => {
                                const isSelected = selectedStudentIds.has(student.regNo);
                                return (
                                  <button key={student.regNo} onClick={() => toggleStudent(student.regNo)}
                                    className={cn('w-full flex items-center gap-4 px-6 py-3.5 transition-all text-left',
                                      isSelected ? 'bg-blue-50/40 dark:bg-indigo-900/10' : 'active:bg-slate-50')}>
                                    {isSelected
                                      ? <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                                      : <Circle className="w-5 h-5 text-slate-200 shrink-0" />}
                                    <div className="min-w-0 flex-1">
                                      <p className={cn('text-[14px] font-black truncate leading-tight', isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white')}>
                                        {student.fullName}
                                      </p>
                                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                        {student.regNo} • {student.department}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STAFF TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'STAFF' && (
            <motion.div key="staff" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-3">

              {/* Staff Filters */}
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label>
                  <select value={filterStaffDept} onChange={e => setFilterStaffDept(e.target.value)}
                    className="w-full h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-[13px] font-bold text-slate-900 dark:text-white outline-none">
                    {availableStaffDepts.map(d => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
                  </select>
                </div>
              </div>

              {/* Staff Search + Select All */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search name or staff code..."
                    className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 text-[13px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none" />
                </div>
                <button onClick={selectAllStaff}
                  className="shrink-0 text-[11px] font-black text-violet-600 uppercase tracking-widest hover:bg-violet-50 dark:hover:bg-violet-900/20 px-3 py-2 rounded-xl transition-colors">
                  {selectedStaffIds.size === filteredStaff.length && filteredStaff.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Staff List */}
              <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[260px] max-h-[420px] overflow-y-auto">
                {loading ? <SkeletonList count={5} /> : staffGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <UserCircle2 className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-[13px] font-bold text-slate-400">No staff match your filters</p>
                    <button onClick={() => { setFilterStaffDept('ALL'); setStaffSearch(''); }}
                      className="mt-2 text-[12px] font-bold text-violet-600 hover:underline">Clear filters</button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {staffGroups.map(({ key, list }) => {
                      const isCollapsed = collapsedSections.has(`staff-${key}`);
                      const groupSelected = list.filter(s => selectedStaffIds.has(s.staffCode)).length;
                      const allGroupSelected = groupSelected === list.length;
                      const someSelected = groupSelected > 0 && !allGroupSelected;
                      return (
                        <div key={key}>
                          {/* Group header */}
                          <div className="flex items-center gap-3 px-5 py-3.5 bg-violet-50/50 dark:bg-violet-900/10">
                            <button onClick={() => toggleStaffGroup(list)} className="shrink-0 p-0.5">
                              {allGroupSelected
                                ? <CheckCircle2 className="w-5 h-5 text-violet-600" />
                                : someSelected
                                  ? <CheckCircle2 className="w-5 h-5 text-violet-400" />
                                  : <Circle className="w-5 h-5 text-slate-200" />}
                            </button>
                            <button onClick={() => toggleSection(`staff-${key}`)} className="flex-1 flex items-center justify-between text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{key}</span>
                                <span className="px-2 py-0.5 bg-violet-600 text-[10px] font-black text-white rounded-md">{groupSelected}/{list.length}</span>
                              </div>
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                            </button>
                          </div>
                          {/* Group rows */}
                          {!isCollapsed && (
                            <div className="bg-white dark:bg-slate-900">
                              {list.map(member => {
                                const isSelected = selectedStaffIds.has(member.staffCode);
                                return (
                                  <button key={member.staffCode} onClick={() => toggleStaff(member.staffCode)}
                                    className={cn('w-full flex items-center gap-4 px-6 py-3.5 transition-all text-left',
                                      isSelected ? 'bg-violet-50/40 dark:bg-violet-900/10' : 'active:bg-slate-50')}>
                                    {isSelected
                                      ? <CheckCircle2 className="w-5 h-5 text-violet-600 shrink-0" />
                                      : <Circle className="w-5 h-5 text-slate-200 shrink-0" />}
                                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                                      <UserCircle2 className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className={cn('text-[14px] font-black truncate leading-tight', isSelected ? 'text-violet-900 dark:text-white' : 'text-slate-900 dark:text-white')}>
                                        {member.staffName || 'Unknown Staff'}
                                      </p>
                                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                        {member.staffCode} • {member.department} • {member.designation}
                                      </p>
                                    </div>
                                    <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[9px] font-black rounded-md uppercase tracking-widest shrink-0">
                                      Staff
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SELECTION SUMMARY ─────────────────────────────────────────────── */}
        {totalSelected > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {selectedStudentIds.size > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-indigo-900/30 text-[var(--color-primary)] dark:text-indigo-300 rounded-full text-[12px] font-black">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {selectedStudentIds.size} Student{selectedStudentIds.size > 1 ? 's' : ''}
                </span>
              )}
              {selectedStaffIds.size > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-[12px] font-black">
                  <UserCircle2 className="w-3.5 h-3.5" />
                  {selectedStaffIds.size} Staff
                </span>
              )}
            </div>
            <button
              onClick={() => { setSelectedStudentIds(new Set()); setSelectedStaffIds(new Set()); setReceiverId(null); }}
              className="text-[11px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors shrink-0">
              Clear
            </button>
          </div>
        )}

        {/* ── QR HOLDER PICKER ─────────────────────────────────────────────── */}
        {!includeStaff && totalSelected > 0 && (
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign QR Holder</label>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-start gap-3">
              <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400/90 leading-relaxed italic">
                This person will carry the group QR code for scanning at the gate.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800/30 max-h-[240px] overflow-y-auto">
              {allSelectedPeople.map(person => {
                const isRcv = receiverId === person.id;
                return (
                  <button key={person.id} onClick={() => setReceiverId(person.id)}
                    className={cn('w-full flex items-center gap-4 px-6 py-4 transition-all text-left',
                      isRcv ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'active:bg-slate-50')}>
                    <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                      isRcv ? 'border-amber-500 bg-amber-500 shadow-md shadow-amber-100' : 'border-slate-200 bg-slate-50')}>
                      {isRcv && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                    </div>
                    {person.type === 'STAFF' && (
                      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                        <UserCircle2 className="w-5 h-5 text-violet-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[14px] font-black truncate', isRcv ? 'text-amber-900 dark:text-white' : 'text-slate-900 dark:text-white')}>
                        {person.name}
                      </p>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">{person.sub}</p>
                    </div>
                    {isRcv && <span className="px-2 py-0.5 bg-amber-500 text-[8px] font-black text-white rounded-md uppercase tracking-widest shrink-0">Receiver</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FORM FIELDS ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Purpose</label>
            <PurposeSelect value={purpose} onChange={setPurpose} />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Provide context for the group's exit authorization..."
              className="w-full min-h-[100px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[15px] font-bold text-slate-900 dark:text-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10 resize-none" />
          </div>

          <AttachmentUpload
            value={attachmentUri}
            fileName={attachmentName}
            onChange={(value, name) => {
              setAttachmentUri(value);
              setAttachmentName(name);
            }}
          />


        </div>

        {/* ── SUBMIT ────────────────────────────────────────────────────────── */}
        <div className="pt-2">
          <button onClick={submitBulk} disabled={totalSelected === 0}
            className="w-full h-14 bg-emerald-600 rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-xl shadow-emerald-100 dark:shadow-none hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3">
            <Send className="w-5 h-5" />
            Submit for {totalSelected} {totalSelected === 1 ? 'member' : 'members'}
          </button>
        </div>

      </div>
    </div>
  );
}
