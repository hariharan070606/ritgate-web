import React, { useState, useEffect, useCallback } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, Users, ChevronDown, ChevronRight,
  CheckCircle2, Circle, X, Send, Paperclip, Search,
  Clock, FileText, Check, UserCheck
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import {
  getHODDepartmentStudents,
  getHODDepartmentStaff,
  submitHODBulkPass,
  getHODBulkPassRequests,
} from '../../services/api.service';
import PageHeader from '../../components/common/PageHeader';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import { cn } from '../../utils/cn';
import { nowIST, nowISTPlus, formatDateTime } from '../../utils/dateUtils';

type View = 'list' | 'create';
type SelectionTab = 'STUDENTS' | 'STAFF';

interface Student { id: number; regNo: string; fullName: string; department: string; section?: string; year?: string; }
interface Staff { id: number; staffCode: string; staffName: string; department: string; }

export default function HODEvents() {
  usePageTitle('Events');
  const { getUserId } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const hodCode = getUserId();

  const [view, setView] = useState<View>('list');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create form state
  const [eventName, setEventName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [selTab, setSelTab] = useState<SelectionTab>('STUDENTS');
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [coordinatorId, setCoordinatorId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await getHODBulkPassRequests(hodCode);
      setEvents(Array.isArray(res) ? res : []);
    } catch { /* silent */ }
    finally { setLoadingEvents(false); setRefreshing(false); }
  }, [hodCode]);

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const [studRes, staffRes] = await Promise.all([
        getHODDepartmentStudents(hodCode),
        getHODDepartmentStaff(hodCode),
      ]);
      if (studRes.success) setStudents(studRes.students || []);
      if (staffRes.success) setStaff(staffRes.staff || []);
    } catch { showToastError('Registry Error', 'Failed to load department roster'); }
    finally { setLoadingRoster(false); }
  }, [hodCode]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const openCreate = () => {
    setEventName(''); setPurpose(''); setReason('');
    setAttachmentUri(null); setSelectedStudents(new Set());
    setSelectedStaff(new Set()); setCoordinatorId(null);
    setCollapsedSections(new Set()); setSearchQuery('');
    setView('create');
    loadRoster();
  };

  const getSectionKey = (s: Student) => s.section?.trim() || s.year?.trim() || 'General';

  const getGroupedStudents = () => {
    const q = searchQuery.toLowerCase();
    const filtered = students.filter(s =>
      !q || s.fullName.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q)
    );
    const map = new Map<string, Student[]>();
    for (const s of filtered) {
      const key = getSectionKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, students]) => ({ key, students }));
  };

  const getFilteredStaff = () => {
    const q = searchQuery.toLowerCase();
    return !q ? staff : staff.filter(s => s.staffName.toLowerCase().includes(q) || s.staffCode.toLowerCase().includes(q));
  };

  const toggleStudent = (regNo: string) => {
    const next = new Set(selectedStudents);
    next.has(regNo) ? next.delete(regNo) : next.add(regNo);
    setSelectedStudents(next);
  };

  const toggleStaff = (staffCode: string) => {
    const next = new Set(selectedStaff);
    if (next.has(staffCode)) { next.delete(staffCode); if (coordinatorId === staffCode) setCoordinatorId(null); }
    else next.add(staffCode);
    setSelectedStaff(next);
  };

  const toggleSectionAll = (sectionStudents: Student[]) => {
    const regNos = sectionStudents.map(s => s.regNo);
    const allSelected = regNos.every(r => selectedStudents.has(r));
    const next = new Set(selectedStudents);
    allSelected ? regNos.forEach(r => next.delete(r)) : regNos.forEach(r => next.add(r));
    setSelectedStudents(next);
  };

  const totalSelected = selectedStudents.size + selectedStaff.size;

  const submitEvent = async () => {
    if (!eventName.trim() || !purpose.trim()) return showToastError('Missing Fields', 'Event name and purpose are required');
    if (totalSelected === 0) return showToastError('No Selection', 'Select at least one participant');

    await withLock(async () => {
      try {
        const res = await submitHODBulkPass({
          hodCode,
          eventName: eventName.trim(),
          purpose: purpose.trim(),
          reason: reason.trim() || purpose.trim(),
          exitDateTime: nowIST(),
          returnDateTime: nowISTPlus(24),
          students: Array.from(selectedStudents),
          staff: Array.from(selectedStaff),
          coordinatorId: coordinatorId || undefined,
          attachmentUri: attachmentUri || undefined,
        });
        if (res.success) {
          showToastSuccess('Event Created', `Pass dispatched for ${totalSelected} participants`);
          setView('list');
          loadEvents();
        } else showToastError('Failed', res.message);
      } catch { showToastError('Error', 'Network request failed'); }
    }, 'Creating event pass...');
  };

  const getStatusConfig = (status: string) => {
    if (status === 'APPROVED') return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500' };
    if (status === 'REJECTED') return { color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', dot: 'bg-rose-500' };
    return { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-500' };
  };

  if (view === 'create') {
    const groups = getGroupedStudents();
    const filteredStaff = getFilteredStaff();

    return (
      <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
        <PageHeader title="New Event" onBack={() => setView('list')} />
        <div className="px-5 py-6 pb-28 space-y-5">
          {/* Event Name */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Name</label>
            <input
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="Ex: Tech Symposium 2025, Industrial Visit..."
              className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose</label>
            <PurposeSelect value={purpose} onChange={setPurpose} />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Notes <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Any additional context..."
              className="w-full h-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none resize-none"
            />
          </div>

          {/* Participant Selection Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Participants</label>
              <span className="text-[11px] font-black text-[var(--color-primary)] uppercase tracking-widest">
                {selectedStudents.size}S + {selectedStaff.size}T selected
              </span>
            </div>

            {/* Tab toggle */}
            <div className="flex bg-white dark:bg-slate-900 rounded-[20px] p-1.5 border border-slate-100 dark:border-slate-800 shadow-sm">
              {(['STUDENTS', 'STAFF'] as SelectionTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setSelTab(tab); setSearchQuery(''); }}
                  className={cn(
                    'flex-1 py-2.5 rounded-[16px] text-[11px] font-black uppercase tracking-widest transition-all',
                    selTab === tab ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-slate-400'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${selTab.toLowerCase()}...`}
                className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-11 pr-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[200px] max-h-[360px] overflow-y-auto">
              {loadingRoster ? (
                <SkeletonList count={4} />
              ) : selTab === 'STUDENTS' ? (
                groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <Users className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-[13px] font-bold text-slate-400">No students found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {groups.map(({ key, students: sectionStudents }) => {
                      const isCollapsed = collapsedSections.has(key);
                      const allSelected = sectionStudents.every(s => selectedStudents.has(s.regNo));
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/30">
                            <button onClick={() => toggleSectionAll(sectionStudents)}>
                              {allSelected ? <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)]" /> : <Circle className="w-5 h-5 text-slate-200" />}
                            </button>
                            <button
                              onClick={() => setCollapsedSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}
                              className="flex-1 flex items-center justify-between"
                            >
                              <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase">Section {key}</span>
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                            </button>
                          </div>
                          {!isCollapsed && sectionStudents.map(student => {
                            const isSel = selectedStudents.has(student.regNo);
                            return (
                              <button
                                key={student.regNo}
                                onClick={() => toggleStudent(student.regNo)}
                                className={cn('w-full flex items-center gap-4 px-6 py-3.5', isSel ? 'bg-blue-50/30 dark:bg-blue-900/10' : '')}
                              >
                                {isSel ? <CheckCircle2 className="w-5 h-5 text-[var(--color-primary)] shrink-0" /> : <Circle className="w-5 h-5 text-slate-100 shrink-0" />}
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="text-[14px] font-black truncate text-slate-900 dark:text-white">{student.fullName}</p>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase">{student.regNo}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                filteredStaff.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <UserCheck className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-[13px] font-bold text-slate-400">No staff found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {filteredStaff.map(member => {
                      const isSel = selectedStaff.has(member.staffCode);
                      return (
                        <button
                          key={member.staffCode}
                          onClick={() => toggleStaff(member.staffCode)}
                          className={cn('w-full flex items-center gap-4 px-6 py-3.5', isSel ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : '')}
                        >
                          {isSel ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-slate-100 shrink-0" />}
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-[14px] font-black truncate text-slate-900 dark:text-white">{member.staffName}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">{member.staffCode}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Coordinator picker — shown when staff selected */}
          {selectedStaff.size > 0 && (
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Coordinator (QR Holder)</label>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800/30 max-h-[200px] overflow-y-auto">
                {Array.from(selectedStaff).map(code => {
                  const member = staff.find(s => s.staffCode === code);
                  if (!member) return null;
                  const isCoord = coordinatorId === code;
                  return (
                    <button
                      key={code}
                      onClick={() => setCoordinatorId(code)}
                      className={cn('w-full flex items-center gap-4 px-6 py-3.5', isCoord ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : '')}
                    >
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', isCoord ? 'border-emerald-500 bg-emerald-500' : 'border-slate-100')}>
                        {isCoord && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[14px] font-black truncate text-slate-900 dark:text-white">{member.staffName}</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">{member.staffCode}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attachment */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Supporting Document <span className="text-slate-300 normal-case font-bold">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setAttachmentUri(reader.result as string);
                reader.readAsDataURL(file);
              }}
              className="hidden"
            />
            {attachmentUri ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <Paperclip className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span className="text-[13px] font-bold text-blue-700 dark:text-blue-300 flex-1 truncate">
                  {fileInputRef.current?.files?.[0]?.name || 'Document attached'}
                </span>
                <button
                  onClick={() => { setAttachmentUri(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                <Paperclip className="w-4 h-4 shrink-0" />
                <span className="text-[13px] font-bold">Attach event circular, permission letter...</span>
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={submitEvent}
            disabled={totalSelected === 0}
            className="w-full h-14 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Create Event — {totalSelected} Participant{totalSelected !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <PageHeader
        title="Events"
        right={
          <button
            onClick={openCreate}
            className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <TopRefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }}>
        <div className="px-5 pt-6 pb-28">
          {loadingEvents ? (
            <SkeletonList count={4} />
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <CalendarDays className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">No Events Yet</h5>
              <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed italic mb-6">
                Create an event to issue bulk gate passes for your department.
              </p>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[13px] uppercase tracking-widest shadow-lg"
              >
                <Plus className="w-4 h-4" /> New Event
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map(event => {
                const config = getStatusConfig(event.status);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center shrink-0">
                          <CalendarDays className="w-6 h-6 text-[var(--color-primary)]" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight">
                            {event.eventName || event.purpose || 'Event'}
                          </h5>
                          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wide">
                            {event.participantCount || (event.students?.length || 0)} participants
                          </p>
                        </div>
                      </div>
                      <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0', config.bg)}>
                        <div className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
                        <span className={cn('text-[10px] font-black uppercase tracking-widest', config.color)}>
                          {event.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3.5 space-y-2 border border-slate-100/50 dark:border-slate-800/30">
                      {event.purpose && (
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 truncate">{event.purpose}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                          {formatDateTime(event.exitDateTime || event.createdAt)}
                        </span>
                      </div>
                      {event.coordinator && (
                        <div className="flex items-center gap-3">
                          <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 truncate">
                            Coordinator: {event.coordinator}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </TopRefreshControl>
    </div>
  );
}
