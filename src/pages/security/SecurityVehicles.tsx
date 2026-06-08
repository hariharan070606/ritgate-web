import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Search, 
  Plus, 
  Activity, 
  ShieldCheck, 
  RefreshCcw, 
  AlertCircle,
  ChevronRight,
  User,
  Phone,
  Tag
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getVehicles, searchVehicle, registerVehicle } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';

export default function SecurityVehicles() {
  usePageTitle('Vehicles');
  const { getUserId } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const securityId = getUserId();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [showRegModal, setShowRegModal] = useState(false);
  const [regData, setRegData] = useState({ licensePlate: '', ownerName: '', ownerPhone: '', ownerType: 'STUDENT', vehicleType: 'TWO_WHEELER' });
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await getVehicles();
      if (res.success) setVehicles(res.data || []);
      else setHasError(true);
    } catch (err) {
      console.error('Fetch vehicles error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleSearch = async () => {
    if (!query.trim()) { fetchVehicles(); return; }
    setIsSearching(true);
    try {
      const res = await searchVehicle(query.trim());
      if (res.success) setVehicles(res.data || []);
    } catch (err) {
      showError('Search Failed', 'Could not query vehicle database');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegister = async () => {
    if (!regData.licensePlate.trim() || !regData.ownerName.trim()) return;
    setIsRegistering(true);
    try {
      const res = await registerVehicle({ ...regData, registeredBy: securityId });
      if (res.success || res.message === 'Success') {
        showSuccess('Fleet Update', 'Vehicle successfully registered in system.');
        setRegData({ licensePlate: '', ownerName: '', ownerPhone: '', ownerType: 'STUDENT', vehicleType: 'TWO_WHEELER' });
        setShowRegModal(false);
        fetchVehicles();
      } else {
        showError('Registration Failed', res.message);
      }
    } catch (err) {
      showError('Endpoint Error', 'Could not commit registration to cloud.');
    } finally {
      setIsRegistering(false);
    }
  };

  // 1. Loading State
  if (isLoading && vehicles.length === 0) {
    return (
      <div className="space-y-8 animate-pulse text-left">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (hasError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase">Registry Link Failure</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">System failed to interface with vehicle database</p>
        </div>
        <Button onClick={fetchVehicles} variant="secondary" size="sm" className="rounded-xl px-6">Reconnect Registry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Context & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1 text-left">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-blue-400 mb-1 leading-none uppercase">
            <Tag className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest leading-none">Vehicle Registry</span>
          </div>
          <h2 className="text-[28px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight uppercase">
            Fleet Intelligence
          </h2>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide leading-relaxed">
            Real-time monitoring and temporary registration
          </p>
        </div>
        
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setShowRegModal(true)}
          icon={<Plus className="w-4 h-4" />}
          className="rounded-xl h-11 px-6 text-[10px] uppercase font-bold tracking-widest shadow-blue-100 dark:shadow-none"
        >
          LOG TEMPORARY VECH
        </Button>
      </div>

      {/* 2. Control Layout: Search */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
             <Search className="w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="ENTER LICENSE PLATE..."
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-11 pr-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-bold focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300 uppercase tracking-widest transition-all outline-none"
          />
        </div>
        <button 
           onClick={handleSearch}
           disabled={isSearching}
           className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {isSearching ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {/* 3. Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
             <Activity className="w-3.5 h-3.5 text-slate-400" />
             <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Registered Units</h3>
          </div>
          {!isLoading && vehicles.length > 0 && (
            <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tabular-nums tracking-widest">
              {vehicles.length} VEHICLES
            </span>
          )}
        </div>

        {vehicles.length === 0 ? (
          <EmptyState 
            title="Registry Clear" 
            description={query ? "No units found matching this criteria." : "No temporary vehicles logged in currently."} 
            icon={<Car className="w-12 h-12 text-slate-200" />} 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <AnimatePresence mode="popLayout">
                {vehicles.map((v, i) => (
                  <motion.div key={v.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                    <Card hover className="group active:scale-[0.99] transition-all border-slate-50 dark:border-slate-800 shadow-sm overflow-hidden p-5">
                       <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-100/50">
                             <Car className="w-7 h-7" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                             <h3 className="font-mono text-xl font-bold text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-2 tabular-nums">
                                {v.licensePlate}
                             </h3>
                             <div className="flex items-center gap-3">
                                <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest truncate">{v.ownerName}</p>
                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">{v.ownerType} • {v.vehicleType?.replace('_', ' ')}</p>
                             </div>
                          </div>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200">
                             <ChevronRight className="w-5 h-5" />
                          </div>
                       </div>
                    </Card>
                  </motion.div>
                ))}
             </AnimatePresence>
          </div>
        )}
      </div>

      {/* Registry Modal */}
      <Modal isOpen={showRegModal} onClose={() => setShowRegModal(false)} title="TEMPORARY REGISTRY ALPHA" size="sm">
        <div className="space-y-6 pt-2">
           <div className="space-y-4">
              <Input label="Registry Plate" value={regData.licensePlate} onChange={(e) => setRegData({...regData, licensePlate: e.target.value.toUpperCase()})} placeholder="E.G. TN 01 AB 1234" />
              <Input label="Owner Identity" value={regData.ownerName} onChange={(e) => setRegData({...regData, ownerName: e.target.value.toUpperCase()})} placeholder="FULL NAME" />
              <Input label="Contact Registry" value={regData.ownerPhone} onChange={(e) => setRegData({...regData, ownerPhone: e.target.value})} type="tel" placeholder="+91 ..." />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Owner Class</label>
                   <select 
                      value={regData.ownerType} 
                      onChange={(e) => setRegData({...regData, ownerType: e.target.value})} 
                      className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10"
                   >
                    <option value="STUDENT">STUDENT</option>
                    <option value="STAFF">STAFF</option>
                    <option value="VISITOR">VISITOR</option>
                  </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Unit Type</label>
                   <select 
                      value={regData.vehicleType} 
                      onChange={(e) => setRegData({...regData, vehicleType: e.target.value})} 
                      className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/10"
                   >
                    <option value="TWO_WHEELER">2 WHEELER</option>
                    <option value="FOUR_WHEELER">4 WHEELER</option>
                  </select>
                </div>
              </div>
           </div>
           
           <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase leading-relaxed tracking-wider">
                Temporary registration is valid for 24 hours. Systematic verification of license and identity is mandatory.
              </p>
           </div>
           
           <Button fullWidth size="lg" isLoading={isRegistering} onClick={handleRegister} className="h-14 rounded-2xl shadow-blue-100 font-black tracking-widest">
              COMMIT TO REGISTRY
           </Button>
        </div>
      </Modal>
    </div>
  );
}
