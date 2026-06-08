import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Search, Activity, ShieldCheck, User, Clock, AlertCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getActivePersons, manualExit } from '../../services/api.service';
import { formatTime } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';
import { usePageTitle } from '../../hooks/usePageTitle';

export default function SecurityActivePersons() {
  usePageTitle('Active Persons');
  const { getUserId } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const securityId = getUserId();

  const [activeList, setActiveList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState('');

  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [isExiting, setIsExiting] = useState(false);

  const fetchActive = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getActivePersons();
      if (res.success) setActiveList(res.data || []);
      else setHasError(true);
    } catch (err) {
      console.error('Active fetch error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  const handleManualExit = async () => {
    if (!selectedPerson) return;
    setIsExiting(true);
    try {
      const name = selectedPerson.name || selectedPerson.personName;
      const res = await manualExit(name, securityId, selectedPerson.userId, selectedPerson.scanId, selectedPerson.purpose);
      if (res.success) {
        showSuccess('Exited', `${name} logged out successfully`);
        setShowExitModal(false);
        fetchActive();
      } else {
        showError('Verification Failed', res.message);
      }
    } catch (err) {
      showError('System Error', 'Unable to process manual exit.');
    } finally {
      setIsExiting(false);
    }
  };

  const filtered = activeList.filter(p =>
    (p.name || p.personName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.type || p.personType || '').toLowerCase().includes(search.toLowerCase())
  );

  // 1. Loading State
  if (isLoading && activeList.length === 0) {
    return (
      <div className="space-y-8 animate-pulse text-left">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <SkeletonList count={5} />
      </div>
    );
  }

  // 2. Error State
  if (hasError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-900 uppercase">Synchronization Error</h3>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Unable to reach operational manifest</p>
        </div>
        <Button onClick={fetchActive} variant="secondary" size="sm" className="rounded-xl px-6">Retry Sync</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Context & Title */}
      <div className="text-left px-1">
        <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-blue-400 mb-1 leading-none uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold tracking-widest leading-none">Operations Management</span>
        </div>
        <h2 className="text-[28px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight uppercase">
          Dynamic Manifest
        </h2>
        <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide leading-relaxed">
          Real-time registry of subjects inside campus
        </p>
      </div>

      {/* 2. Search Filter */}
      <div className="relative px-1">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10">
           <Search className="w-4 h-4" />
        </div>
        <input 
          type="text" 
          placeholder="SEARCH BY NAME OR SUBJECT TYPE..."
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          className="w-full pl-12 pr-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300 uppercase tracking-widest transition-all outline-none"
        />
      </div>

      {/* 3. Active Subject Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-2">
             <Activity className="w-3.5 h-3.5 text-slate-400" />
             <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Live Subjects</h3>
           </div>
           {!isLoading && filtered.length > 0 && (
             <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tabular-nums tracking-widest">{filtered.length} ACTIVE</span>
           )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Sector Clear" description={search ? 'No subjects matching audit criteria.' : 'No personnel currently inside secure zone.'} icon={<Users className="w-12 h-12 text-slate-200" />} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((person, i) => (
                <motion.div key={person.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                  <Card hover className="group active:scale-[0.99] transition-all border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-100 dark:border-slate-700">
                           {person.profileImage ? (
                             <img src={person.profileImage} alt="" className="w-full h-full object-cover rounded-xl" />
                           ) : (
                             <User className="w-5 h-5" />
                           )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none truncate">{person.name || person.personName}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold text-[var(--color-primary)] dark:text-blue-400 bg-blue-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100/50">
                              {person.type || person.personType}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                               <Clock className="w-2.5 h-2.5" />
                               {formatTime(person.inTime || person.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => { setSelectedPerson(person); setShowExitModal(true); }} 
                        icon={<LogOut className="w-3.5 h-3.5" />}
                        className="rounded-[12px] px-4 text-[10px] font-bold uppercase tracking-widest border-slate-200"
                      >
                        MANUAL EXIT
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Modal isOpen={showExitModal} onClose={() => setShowExitModal(false)} title="AUTHENTICATION OVERRIDE" size="sm">
        {selectedPerson && (
          <div className="space-y-6 text-center pt-2">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500 border border-rose-100 mb-2">
               <LogOut className="w-7 h-7" />
            </div>
            <div className="space-y-2">
               <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Confirm Manual Termination</h3>
               <p className="text-xs font-medium text-slate-400 leading-relaxed uppercase tracking-widest">
                 Terminate session for <span className="text-[var(--color-primary)] font-bold">{selectedPerson.name || selectedPerson.personName}</span>? This action is irrevocable.
               </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button fullWidth variant="ghost" onClick={() => setShowExitModal(false)} className="rounded-xl text-[10px] font-bold uppercase tracking-widest">Cancel</Button>
              <Button fullWidth variant="danger" isLoading={isExiting} onClick={handleManualExit} className="rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-rose-100">CONFIRM EXIT</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
