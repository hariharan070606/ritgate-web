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

  const openCoordinators = (event: RITGateEvent) => {
    setSelectedEvent(event);
    setSelected(new Set());
    setStaffSearch('');
    openSubView('coordinators');
    loadCoordinators(event);
  };

  const resetCreate = () => { setEventName(''); setVenue(''); setEventDate(''); };

  const handleCreate = async () => {
    if (!eventName.trim()) return toastError('Required', 'Event name is required');
    if (!venue.trim()) return toastError('Required', 'Venue is required');
    if (!eventDate) return toastError('Required', 'Event date is required');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(eventDate) < today) return toastError('Invalid Date', 'Event date must be today or in the future');

    await withLock(async () => {
      const res = await createEvent(hodCode, eventName.trim(), eventDate, venue.trim());
      if (res.success) {
        toast('Event Created', `"${eventName}" created. You can now assign coordinators.`);
        resetCreate();
        returnToList();
        loadEvents();
      } else {
        toastError('Failed', res.message || 'Could not create event');
      }
    }, 'Creating event...');
  };

  const handleAssign = async () => {
    if (!selectedEvent) return;
    const assignedCodes = new Set(coordinators.map(c => c.staffCode));
    const toAssign = [...selected].filter(c => !assignedCodes.has(c));
    if (toAssign.length === 0) return toastError('No Selection', 'No new staff selected to assign');

    await withLock(async () => {
      const res = await assignCoordinators(selectedEvent.id, hodCode, toAssign);
      if (res.success) {
        toast('Assigned', `${toAssign.length} coordinator(s) assigned`);
        setSelected(new Set());
        await loadCoordinators(selectedEvent);
      } else {
        toastError('Failed', res.message || 'Could not assign coordinators');
      }
    }, 'Assigning coordinators...');
  };

  const handleRemove = async () => {
    if (!selectedEvent || !removeTarget) return;
    setRemoveTarget(null);
    const res = await removeCoordinator(selectedEvent.id, removeTarget);
    if (res.success) {
      toast('Removed', 'Coordinator removed');
      await loadCoordinators(selectedEvent);
    } else {
      toastError('Failed', res.message || 'Could not remove coordinator');
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
        <div className="px-5 py-6 pb-28 space-y-5 max-w-lg mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 p-5 space-y-5 shadow-sm">
            {/* Event Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Event Name *</label>
              <input
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="e.g. National Level Symposium 2026"
                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            {/* Venue */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Venue *</label>
              <input
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Seminar Hall, Block A"
                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            {/* Date */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Event Date *</label>
              <input
                type="date"
                value={eventDate}
                min={todayStr}
                onChange={e => setEventDate(e.target.value)}
                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={isLocked || !eventName.trim() || !venue.trim() || !eventDate}
            className="w-full h-14 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
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
        <div className="px-5 py-4 pb-28 space-y-4 lg:px-10 xl:px-14 lg:py-3 lg:pb-6 lg:space-y-3">
          {/* Event info pill */}
          <div className="bg-[var(--color-primary)] rounded-[24px] px-5 py-4 flex items-center gap-3 lg:rounded-[22px] lg:px-6 lg:py-3.5">
            <CalendarDays className="w-6 h-6 text-white/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-black text-[15px] truncate lg:text-[17px]">{selectedEvent.eventName}</p>
              <p className="text-white/70 text-[12px] font-bold">{selectedEvent.eventDate} · {selectedEvent.venue || 'No venue'}</p>
            </div>
          </div>

          {loadingCoords ? (
            <SkeletonList count={4} />
          ) : (
            <>
              {/* Assigned coordinators */}
              {coordinators.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Assigned ({coordinators.length})</p>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {coordinators.map(c => {
                      const displayName = c.staffName || c.staffCode;
                      const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                      return (
                        <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                            <span className="text-[12px] font-black text-[var(--color-primary)]">{initials}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">{displayName}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">{c.staffCode}</p>
                          </div>
                          <button
                            onClick={() => setRemoveTarget(c.staffCode)}
                            className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 active:scale-90 transition-transform"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Staff search + select */}
              <div className="space-y-3 lg:space-y-2.5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Add Coordinators</p>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search staff by name or code..."
                    className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-10 pr-4 text-[13px] font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden max-h-[340px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50 lg:max-h-[calc(100vh-330px)] xl:max-h-[calc(100vh-310px)]">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="w-8 h-8 text-slate-200 mb-2" />
                      <p className="text-[13px] font-bold text-slate-400">No staff found</p>
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
                          'w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors lg:py-3',
                          isAssigned ? 'opacity-60 cursor-default' : isSel ? 'bg-[var(--color-primary)]/5' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        )}
                      >
                        <div className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                          isAssigned ? 'border-emerald-500 bg-emerald-500' : isSel ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-slate-200 dark:border-slate-700'
                        )}>
                          {(isAssigned || isSel) && <CheckCheck className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-black text-slate-900 dark:text-white truncate">{s.staffName || s.name || code}</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase">{code} · {s.department || ''}</p>
                        </div>
                        {isAssigned && (
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full uppercase">Assigned</span>
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
                  className="w-full h-14 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[14px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  {isLocked ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserCheck className="w-5 h-5" /> Assign {selected.size} Coordinator{selected.size > 1 ? 's' : ''}</>}
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
            className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg shadow-blue-100 active:scale-90 transition-transform"
            aria-label="New event"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <TopRefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEvents(); }}>
        <div className="px-5 pt-6 pb-28 lg:px-10 xl:px-14">
          {loadingEvents ? (
            <SkeletonList count={4} />
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-5">
                <CalendarDays className="w-10 h-10 text-slate-200 dark:text-slate-800" />
              </div>
              <h5 className="text-[17px] font-black text-slate-900 dark:text-white mb-1.5">No Events Yet</h5>
              <p className="text-[13px] font-medium text-slate-400 max-w-[220px] leading-relaxed italic mb-6">
                Create an event and assign staff coordinators who can upload participant lists.
              </p>
              <button
                onClick={() => openSubView('create')}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[13px] uppercase tracking-widest shadow-lg"
              >
                <Plus className="w-4 h-4" /> New Event
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="hidden md:flex items-center justify-end">
                <button
                  onClick={() => openSubView('create')}
                  className="flex items-center gap-2 h-11 px-5 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[12px] uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4" /> New Event
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {events.map(event => {
                  const cfg = statusConfig(event.status);
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm lg:p-6 lg:shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4 lg:mb-5">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center shrink-0 lg:w-14 lg:h-14">
                            <CalendarDays className="w-6 h-6 text-[var(--color-primary)]" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-[16px] font-black text-slate-900 dark:text-white truncate lg:text-[18px]">{event.eventName}</h5>
                            <p className="text-[12px] font-bold text-slate-400">ID: {event.id}</p>
                          </div>
                        </div>
                        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border shrink-0', cfg.bg, cfg.border)}>
                          <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                          <span className={cn('text-[10px] font-black uppercase tracking-widest', cfg.color)}>{event.status}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3.5 space-y-2 border border-slate-100/50 dark:border-slate-800/30 mb-4 lg:p-4 lg:mb-5">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{event.eventDate}</span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 truncate">{event.venue}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {event.status === 'ACTIVE' && (
                          <button
                            onClick={() => openCoordinators(event)}
                            className="flex-1 h-11 bg-[var(--color-primary)] rounded-xl text-white text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-transform lg:h-12"
                          >
                            <Users className="w-4 h-4" /> Coordinators
                          </button>
                        )}
                        {event.status !== 'ACTIVE' && (
                          <div className="flex-1 h-10 bg-slate-50 dark:bg-slate-800/30 rounded-xl flex items-center justify-center">
                            <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Event {event.status}</span>
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
