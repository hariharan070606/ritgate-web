import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Car, 
  User, 
  ArrowDownCircle, 
  ArrowUpCircle,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Activity,
  ShieldCheck,
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { SkeletonList, Skeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { getScanHistory, getVehicles } from '../../services/api.service';
import { formatDateTime, formatTime } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';
import { exportToPdf, exportToCsv } from '../../utils/reportUtils';
import { transitions } from '../../design-system/animations';
import { EMPTY_COPY } from '../../config/nativeCopy';

type TabType = 'PERSONS' | 'VEHICLES';

export default function SecurityHistory() {
  usePageTitle('Scan History');
  const [activeTab, setActiveTab] = useState<TabType>('PERSONS');
  const [history, setHistory] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [scanRes, vehicleRes] = await Promise.all([
        getScanHistory(),
        getVehicles()
      ]);
      if (scanRes.success) setHistory(scanRes.data || []);
      if (vehicleRes.success) setVehicles(vehicleRes.data || []);
    } catch (err) {
      console.error('History load error:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSearch = 
        (item.personName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.personType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.purpose || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const ts = item.timestamp || item.createdAt || new Date().toISOString();
      const itemDate = ts.split('T')[0];
      const matchesStart = !startDate || itemDate >= startDate;
      const matchesEnd = !endDate || itemDate <= endDate;
      
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [history, searchQuery, startDate, endDate]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(item => {
      const matchesSearch = 
        (item.ownerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.licensePlate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.vehicleType || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const ts = item.createdAt || item.timestamp || new Date().toISOString();
      const itemDate = ts.split('T')[0];
      const matchesStart = !startDate || itemDate >= startDate;
      const matchesEnd = !endDate || itemDate <= endDate;
      
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [vehicles, searchQuery, startDate, endDate]);

  const handleExport = (type: 'PDF' | 'CSV') => {
    const isPerson = activeTab === 'PERSONS';
    const data = isPerson ? filteredHistory : filteredVehicles;
    const title = isPerson ? 'Security Scan History' : 'Vehicle Access Logs';
    const cols = isPerson 
      ? [
          { key: 'timestamp', label: 'TIME' },
          { key: 'personName', label: 'NAME' },
          { key: 'personType', label: 'TYPE' },
          { key: 'scanType', label: 'ACTION' },
          { key: 'purpose', label: 'PURPOSE' }
        ]
      : [
          { key: 'createdAt', label: 'TIME' },
          { key: 'licensePlate', label: 'PLATE' },
          { key: 'vehicleType', label: 'VEHICLE' },
          { key: 'ownerName', label: 'OWNER' },
          { key: 'status', label: 'STATUS' }
        ];

    const subtitle = (startDate || endDate) 
      ? `Filtered from ${startDate || 'Start'} to ${endDate || 'Present'}` 
      : 'Full History Report';

    if (type === 'PDF') {
      exportToPdf({ title, subtitle, columns: cols, rows: data });
    } else {
      const csvData = data.map(row => {
        const mapped: any = {};
        cols.forEach(c => {
          mapped[c.label] = row[c.key];
        });
        return mapped;
      });
      exportToCsv(csvData, title.replace(/\s+/g, '_'));
    }
  };

  // 1. Loading State
  if (isLoading && history.length === 0) {
    return (
      <div className="space-y-8 animate-pulse text-left">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <SkeletonList count={6} />
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
          <h3 className="text-sm font-bold text-slate-900 uppercase">Audit Failed</h3>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Unable to synchronize access archives</p>
        </div>
        <Button onClick={loadData} variant="secondary" size="sm" className="rounded-xl px-6">Retry Sync</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Context & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1 text-left">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-blue-400 mb-1 leading-none uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest leading-none">Security Audit</span>
          </div>
          <h2 className="text-[28px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight uppercase">
            Access Archives
          </h2>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-wide leading-relaxed">
            Immutable registry of campus transactions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleExport('CSV')}
            className="rounded-xl px-4 text-[10px] uppercase font-bold tracking-widest bg-slate-50 border-slate-200"
          >
            CSV
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => handleExport('PDF')}
            className="rounded-xl px-4 text-[10px] uppercase font-bold tracking-widest shadow-blue-100"
          >
            PDF
          </Button>
        </div>
      </div>

      {/* 2. Control Layout: Tabs & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl w-full sm:w-fit border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('PERSONS')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === 'PERSONS' 
                  ? "bg-white dark:bg-slate-800 text-[var(--color-primary)] shadow-sm border border-slate-100 dark:border-slate-700" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <User className="w-3.5 h-3.5" />
              Individual Scans
            </button>
            <button
              onClick={() => setActiveTab('VEHICLES')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === 'VEHICLES' 
                  ? "bg-white dark:bg-slate-800 text-[var(--color-primary)] shadow-sm border border-slate-100 dark:border-slate-700" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Car className="w-3.5 h-3.5" />
              Vehicle Logs
            </button>
          </div>

          <div className="flex-1 w-full relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
               <Search className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              placeholder="SEARCH ARCHIVES (NAME, PLATE, PURPOSE...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-bold focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-300 uppercase tracking-widest transition-all outline-none"
            />
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-12 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap w-full sm:w-auto",
              showFilters ? "bg-blue-50 text-[var(--color-primary)] border-blue-100" : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
            )}
          >
            <Filter className={cn("w-3.5 h-3.5", showFilters && "animate-pulse")} />
            {showFilters ? 'Hide Window' : 'Date Window'}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2">Archive Start</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="w-full pl-11 pr-4 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-900 uppercase tracking-widest outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2">Archive End</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="w-full pl-11 pr-4 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-900 uppercase tracking-widest outline-none" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Transaction List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
             <Clock className="w-3.5 h-3.5 text-slate-400" />
             <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-none">Archived Transactions</h3>
          </div>
          {!isLoading && (activeTab === 'PERSONS' ? filteredHistory : filteredVehicles).length > 0 && (
            <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tabular-nums tracking-widest">
              {(activeTab === 'PERSONS' ? filteredHistory : filteredVehicles).length} LOGS
            </span>
          )}
        </div>

        {(activeTab === 'PERSONS' ? filteredHistory : filteredVehicles).length === 0 ? (
          <EmptyState 
            title={EMPTY_COPY.noRecordsFound} 
            description={searchQuery || startDate || endDate ? "No subjects matching audit criteria." : "Access logs will appear here upon activity."} 
            icon={<History className="w-12 h-12 text-slate-200" />} 
          />
        ) : (
          <div className="space-y-3">
             <AnimatePresence mode="popLayout">
               {(activeTab === 'PERSONS' ? filteredHistory : filteredVehicles).map((item, i) => {
                 const isEntry = activeTab === 'PERSONS' ? (item.scanType === 'ENTRY') : (item.status === 'ENTERED');
                 const name = activeTab === 'PERSONS' ? item.personName : item.ownerName;
                 const sub = activeTab === 'PERSONS' ? (item.purpose || 'Campus Access') : item.vehicleType;
                 const meta = activeTab === 'PERSONS' ? item.personType : item.licensePlate;

                 return (
                   <motion.div key={item.id || i} layout initial={transitions.page.initial} animate={transitions.page.animate}>
                     <Card hover className="group active:scale-[0.99] transition-all border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                       <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-4 flex-1 min-w-0">
                           <div className={cn(
                             'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 border font-bold text-[13px]',
                             isEntry ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 'bg-rose-50 text-rose-600 border-rose-100/50',
                           )}>
                             {name?.substring(0, 1).toUpperCase() || <Activity className="w-5 h-5" />}
                           </div>
                           <div className="flex-1 min-w-0 text-left">
                             <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight leading-none group-hover:text-[var(--color-primary)] transition-colors">
                               {name || 'Unknown Subject'}
                             </h4>
                             <div className="flex items-center gap-2 mt-2">
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px] opacity-80">{sub}</span>
                               <span className="text-slate-200">-</span>
                               <span className="text-[9px] font-bold text-[var(--color-primary)] dark:text-blue-400 bg-blue-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-100/30">
                                 {meta}
                               </span>
                             </div>
                           </div>
                         </div>
                         
                         <div className="text-right shrink-0">
                           <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200 tabular-nums uppercase leading-none">
                             {formatTime(item.timestamp || item.createdAt)}
                           </p>
                           <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase leading-none">
                             {formatDateTime(item.timestamp || item.createdAt).split(',')[0]}
                           </p>
                           <div className={cn(
                             "flex items-center justify-end gap-1.5 mt-2.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest",
                             isEntry ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : "bg-rose-50 text-rose-600 border-rose-100/50"
                           )}>
                             {isEntry ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                             {activeTab === 'PERSONS' ? item.scanType : item.status}
                           </div>
                         </div>
                       </div>
                     </Card>
                   </motion.div>
                 );
               })}
             </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
