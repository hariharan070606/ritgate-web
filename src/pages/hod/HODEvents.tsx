import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays, Plus, Users, MapPin,
  Calendar, Search, Trash2, UserCheck,
  Loader2, CheckCheck
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import {
  createEvent,
  getHODEvents,
  getEventCoordinators,
  assignCoordinators,
  removeCoordinator,
  getHODDepartmentStaff,
} from '../../services/api.service';
import PageHeader from '../../components/common/PageHeader';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { cn } from '../../utils/cn';
import type { RITGateEvent, EventCoordinator } from '../../types';

type View = 'list' | 'create' | 'coordinators';

export default function HODEvents() {
  usePageTitle('Events');
  const { getUserId } = useAuth();
  const hodCode = getUserId();
  const { success: toast, error: toastError } = useToast();
  const { withLock, isLocked } = useActionLock();

  const [view, setView] = useState<View>('list');
  const subViewHistoryPushed = useRef(false);
  const [events, setEvents] = useState<RITGateEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<RITGateEvent | null>(null);

  // Create form
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Coordinators view
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<EventCoordinator[]>([]);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [staffSearch, setStaffSearch] = useState('');
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const res = await getHODEvents(hodCode);
      setEvents(res.events as RITGateEvent[]);
    } catch { /* silent */ }
    finally { setLoadingEvents(false); setRefreshing(false); }
  }, [hodCode]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const loadCoordinators = async (event: RITGateEvent) => {
    setLoadingCoords(true);
    const [staffRes, coordRes] = await Promise.all([
      getHODDepartmentStaff(hodCode),
      getEventCoordinators(event.id),
    ]);
    if (staffRes.success) setAllStaff(staffRes.staff || []);
    if (coordRes.success) setCoordinators(coordRes.coordinators as EventCoordinator[]);
    setLoadingCoords(false);
  };

  const openSubView = (nextView: Exclude<View, 'list'>) => {
    if (!subViewHistoryPushed.current) {
      window.history.pushState({ ritgateHodEventsSubView: nextView }, '', window.location.href);
      subViewHistoryPushed.current = true;
    } else {
      window.history.replaceState({ ritgateHodEventsSubView: nextView }, '', window.location.href);
    }
    setView(nextView);
  };

  const returnToList = () => {
    if (subViewHistoryPushed.current) {
      window.history.back();
      return;
    }
    setView('list');
    setSelectedEvent(null);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (view !== 'list') {
        subViewHistoryPushed.current = false;
        setView('list');
        setSelectedEvent(null);
        resetCreate();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

  // The "New Event" button lives in the global header on this page; it fires a
  // custom event so we can open the create view from here.
  useEffect(() => {
    const handler = () => openSubView('create');
    window.addEventListener('ritgate:new-event', handler);
    return () => window.removeEventListener('ritgate:new-event', handler);
  }, []);

  // Tell the global header which sub-view is active so it can hide the
  // "New Event" button when we are not on the list (e.g. the create form).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ritgate:hod-events-view', { detail: view }));
    return () => {
      window.dispatchEvent(new CustomEvent('ritgate:hod-events-view', { detail: 'list' }));
    };
  }, [view]);

  const openCoordinators = (event: RITGateEvent) => {
    setSelectedEvent(event);
    setSelected(new Set());
    setStaffSearch('');
    openSubView('coordinators');
    loadCoordinators(event);
  };

  const resetCreate = () => { setEventName(''); setVenue(''); setEventDate(''); };

  const handleCreate = async () => {
    if (!eventName.trim()) return toastError('Validation Error', 'Please enter an event name');
    if (!venue.trim()) return toastError('Validation Error', 'Please enter a venue');
    if (!eventDate) return toastError('Validation Error', 'Please select an event date');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(eventDate) < today) return toastError('Invalid Date', 'Event date must be today or in the future');

    await withLock(async () => {
      try {
        const res = await createEvent(hodCode, eventName.trim(), eventDate, venue.trim());
        if (res?.success) {
          toast('Success', `Event "${eventName}" created successfully. Assign coordinators next.`);
          resetCreate();
          returnToList();
          await loadEvents();
        } else {
          toastError('Creation Failed', res?.message || 'Unable to create event. Please try again.');
        }
      } catch (err) {
        toastError('Error', 'An unexpected error occurred while creating the event.');
      }
    }, 'Creating event...');
  };

  const handleAssign = async () => {
    if (!selectedEvent) return;
    const assignedCodes = new Set(coordinators.map(c => c.staffCode));
    const toAssign = [...selected].filter(c => !assignedCodes.has(c));
    if (toAssign.length === 0) return toastError('No Selection', 'Please select at least one coordinator to assign');

    await withLock(async () => {
      try {
        const res = await assignCoordinators(selectedEvent.id, hodCode, toAssign);
        if (res?.success) {
          const count = toAssign.length;
          toast('Success', `${count} coordinator${count > 1 ? 's' : ''} assigned successfully.`);
          setSelected(new Set());
          await loadCoordinators(selectedEvent);
        } else {
          toastError('Assignment Failed', res?.message || 'Unable to assign coordinators. Please try again.');
        }
      } catch (err) {
        toastError('Error', 'An unexpected error occurred while assigning coordinators.');
      }
    }, 'Assigning coordinators...');
  };

  const handleRemove = async () => {
    if (!selectedEvent || !removeTarget) return;
    
    try {
      const res = await removeCoordinator(selectedEvent.id, removeTarget);
      if (res?.success) {
        toast('Success', 'Coordinator removed successfully.');
        await loadCoordinators(selectedEvent);
      } else {
        toastError('Removal Failed', res?.message || 'Unable to remove coordinator. Please try again.');
      }
    } catch (err) {
      toastError('Error', 'An unexpected error occurred while removing the coordinator.');
    } finally {
      setRemoveTarget(null);
    }
  };

  const statusConfig = (status: string) => {
    if (status === 'ACTIVE') return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' };
    if (status === 'COMPLETED') return { color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/30', dot: 'bg-slate-400', border: 'border-slate-200 dark:border-slate-700' };
    return { color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', dot: 'bg-rose-500', border: 'border-rose-200 dark:border-rose-800' };
  };

  // ─── Create View ─────────────────────────────────────────────────────────────
  if (view === 'create') {
    const todayStr = new Date().toISOString().split('T')[0];
    return (
      <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
        <PageHeader title="Create Event" onBack={() => { resetCreate(); returnToList(); }} />
        <div className="px-5 py-8 pb-32 space-y-6 max-w-2xl mx-auto lg:px-8 lg:py-10">
          {/* Header Section */}
          <div className="space-y-2">
            <h2 className="text-[22px] font-black text-slate-900 dark:text-white lg:text-[26px]">New Event Details</h2>
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Create a new event and assign coordinators to manage participant lists.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-6 space-y-6 shadow-lg lg:shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            {/* Event Name */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Name *</label>
              <input
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="e.g. National Level Symposium 2026"
                className="w-full h-13 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 text-[14px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 lg:focus:border-[var(--color-primary)]/80"
              />
            </div>
            {/* Venue */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Venue *</label>
              <input
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Seminar Hall, Block A"
                className="w-full h-13 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 text-[14px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 lg:focus:border-[var(--color-primary)]/80"
              />
            </div>
            {/* Date */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Date *</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={eventDate}
                  min={todayStr}
                  onChange={e => setEventDate(e.target.value)}
                  className="w-full h-13 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 text-[14px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 lg:focus:border-[var(--color-primary)]/80"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={isLocked || !eventName.trim() || !venue.trim() || !eventDate}
            className="w-full h-14 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:saturate-50 flex items-center justify-center gap-2 active:scale-[0.98] hover:brightness-110 transition-all lg:h-[52px] lg:text-[16px]"
          >
            {isLocked ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> Create Event</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── Coordinators View ───────────────────────────────────────────────────────
  if (view === 'coordinators' && selectedEvent) {
    const assignedCodes = new Set(coordinators.map(c => c.staffCode));
    const filtered = allStaff.filter(s => {
      const name = (s.staffName || s.name || '').toLowerCase();
      const code = (s.staffCode || '').toLowerCase();
      return !staffSearch || name.includes(staffSearch.toLowerCase()) || code.includes(staffSearch.toLowerCase());
    });

    return (
      <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
        <PageHeader
          title="Coordinators"
          onBack={returnToList}
        />
        <div className="px-4 py-3 pb-24 space-y-3.5 lg:px-8 xl:px-12 lg:py-4 lg:pb-6 lg:space-y-3">
          {/* Event info pill */}
          <div className="rounded-xl px-4 py-3.5 flex items-center gap-2.5 shadow-md shadow-slate-300/40 dark:shadow-none" style={{ background: 'var(--gradient-primary)' }}>
            <CalendarDays className="w-5 h-5 text-white/80 shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-black text-[14px] truncate lg:text-[16px]">{selectedEvent.eventName}</p>
              <p className="text-white/70 text-[11px] font-bold">{selectedEvent.eventDate} · {selectedEvent.venue || 'No venue'}</p>
            </div>
          </div>

          {loadingCoords ? (
            <SkeletonList count={4} />
          ) : (
            <>
              {/* Assigned coordinators */}
              {coordinators.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-md overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned ({coordinators.length})</p>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {coordinators.map(c => {
                      const displayName = c.staffName || c.staffCode;
                      const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <div key={c.id} className="flex items-center gap-2.5 px-4 py-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-black text-[var(--color-primary)]">{initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">{displayName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{c.staffCode}</p>
                          </div>
                          <button
                            onClick={() => setRemoveTarget(c.staffCode)}
                            className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 active:scale-90 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Staff search + select */}
              <div className="space-y-2.5 lg:space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Add Coordinators</p>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search staff by name or code..."
                    className="w-full h-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg pl-9.5 pr-3.5 text-[12px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[var(--color-primary)]/10 transition-all"
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 shadow-md overflow-hidden max-h-[320px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50 lg:max-h-[calc(100vh-340px)] xl:max-h-[calc(100vh-320px)]">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <Users className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-[12px] font-bold text-slate-400">No staff found</p>
                    </div>
                  ) : filtered.map(s => {
                    const code = s.staffCode || '';
                    const isAssigned = assignedCodes.has(code);
                    const isSel = selected.has(code);
                    return (
                      <button
                        key={code}
                        onClick={() => {
                          if (isAssigned) return;
                          setSelected(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
                        }}
                        disabled={isAssigned}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors lg:py-2.5',
                          isAssigned ? 'opacity-50 cursor-default' : isSel ? 'bg-[var(--color-primary)]/5' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        )}
                      >
                        <div className={cn(
                          'w-4.5 h-4.5 rounded-md border-1.5 flex items-center justify-center shrink-0 transition-all',
                          isAssigned ? 'border-emerald-500 bg-emerald-500' : isSel ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-slate-300 dark:border-slate-600'
                        )}>
                          {(isAssigned || isSel) && <CheckCheck className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-[13px] font-black truncate', isSel ? 'text-white' : 'text-slate-900 dark:text-white')}>{s.staffName || s.name || code}</p>
                          <p className={cn('text-[10px] font-bold uppercase', isSel ? 'text-white/70' : 'text-slate-400')}>{code} · {s.department || ''}</p>
                        </div>
                        {isAssigned && (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full uppercase">Assigned</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selected.size > 0 && (
                <button
                  onClick={handleAssign}
                  disabled={isLocked}
                  className="w-full h-12 bg-[var(--color-primary)] rounded-lg text-white font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:saturate-50 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  {isLocked ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4" /> Assign {selected.size} Coordinator{selected.size > 1 ? 's' : ''}</>}
                </button>
              )}
            </>
          )}
        </div>

        <ConfirmationModal
          visible={!!removeTarget}
          title="Remove Coordinator"
          message={`Remove ${removeTarget} as coordinator for this event?`}
          confirmText="Remove"
          onConfirm={handleRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      </div>
    );
  }

  // ─── List View ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <PageHeader
        title="Events"
        right={
          <button
            onClick={() => openSubView('create')}
            className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md shadow-blue-200 dark:shadow-none hover:brightness-110 active:scale-90 transition-transform"
            aria-label="New event"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <TopRefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }}>
        <div className="px-4 pt-4 pb-24 min-h-screen flex flex-col lg:px-8 xl:px-12 lg:pt-0 lg:pb-8 lg:min-h-0">
          {loadingEvents ? (
            <SkeletonList count={4} />
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-[var(--color-primary)]" />
              </div>
              <h5 className="text-[18px] font-black text-slate-900 dark:text-white mb-2">No Events Created Yet</h5>
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed mb-6">
                Get started by creating your first event and assigning staff coordinators.
              </p>
              <button
                onClick={() => openSubView('create')}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] rounded-xl text-white font-black text-[12px] uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" /> Create Event
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              <div className="grid gap-3.5 lg:grid-cols-2 2xl:grid-cols-3">
                {events.map(event => {
                  const cfg = statusConfig(event.status);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-100 dark:border-slate-800 shadow-md hover:shadow-lg dark:hover:shadow-slate-800/50 transition-shadow lg:p-5 lg:shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3.5 lg:mb-4">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center shrink-0 lg:w-12 lg:h-12">
                            <CalendarDays className="w-5 h-5 text-[var(--color-primary)]" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-[14px] font-black text-slate-900 dark:text-white truncate lg:text-[16px]">{event.eventName}</h5>
                            <p className="text-[11px] font-bold text-slate-400">ID: {event.id}</p>
                          </div>
                        </div>
                        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border shrink-0 text-[9px]', cfg.bg, cfg.border)}>
                          <div className={cn('w-1 h-1 rounded-full', cfg.dot)} />
                          <span className={cn('font-black uppercase tracking-widest', cfg.color)}>{event.status}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3 space-y-1.5 border border-slate-100/50 dark:border-slate-800/30 mb-3.5 lg:p-3.5 lg:mb-4">
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{event.eventDate}</span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-2.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate">{event.venue}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {event.status === 'ACTIVE' && (
                          <button
                            onClick={() => openCoordinators(event)}
                            className="flex-1 h-10 bg-[var(--color-primary)] rounded-lg text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-blue-200 dark:shadow-none hover:brightness-110 active:scale-95 transition-all lg:h-11"
                          >
                            <Users className="w-3.5 h-3.5" /> Coordinators
                          </button>
                        )}
                        {event.status !== 'ACTIVE' && (
                          <div className="flex-1 h-9 bg-slate-50 dark:bg-slate-800/30 rounded-lg flex items-center justify-center">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Event {event.status}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </TopRefreshControl>

    </div>
  );
}
