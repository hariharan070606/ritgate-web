import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  QrCode, 
  Phone, 
  FileText, 
  User, 
  Copy, 
  CheckCircle2, 
  X,
  RefreshCw,
  Clock
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getVisitorRequestsForSecurity } from '../../services/api.service';
import TopMenuBar from '../../components/common/TopMenuBar';
import TopRefreshControl from '../../components/common/TopRefreshControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

interface VisitorRequest {
  id: number;
  name: string;
  phone: string;
  purpose: string;
  personToMeet: string;
  department?: string;
  numberOfPeople?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  qrCode?: string;
  manualCode?: string;
  createdAt: string;
}

export default function SecurityVisitorQR() {
  usePageTitle('Visitor QR');
  const { user, logout, getUserId } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const securityId = getUserId();

  const [visitors, setVisitors] = useState<VisitorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRequest | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // In web we use the centralized apiService
      const response = await getVisitorRequestsForSecurity(securityId);
      if (response.success) {
        setVisitors(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load visitor requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = searchQuery === '' || 
      v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.phone?.includes(searchQuery);
    const matchesTab = activeTab === 'ALL' || v.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToastSuccess('Copied', 'Manual code copied to clipboard');
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <TopMenuBar 
        greeting="VISITOR CENTER"
        title="QR REGISTRY"
      />

      <div className="px-5 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text"
            placeholder="Search visitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm outline-none"
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-white dark:bg-slate-900 rounded-[22px] p-1.5 shadow-sm border border-slate-50 dark:border-slate-800">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <TopRefreshControl refreshing={refreshing} onRefresh={handleRefresh}>
        <div className="px-5 pt-4 pb-28">
          {loading ? (
            <SkeletonList count={5} />
          ) : filteredVisitors.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
               <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-200">
                  <Users className="w-10 h-10" />
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No visitors found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisitors.map((visitor) => (
                <motion.div 
                  key={visitor.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    if (visitor.status === 'APPROVED') {
                      setSelectedVisitor(visitor);
                      setShowQRModal(true);
                    }
                  }}
                  className={cn(
                    "bg-white dark:bg-slate-900 rounded-[28px] p-5 border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all",
                    visitor.status === 'APPROVED' ? "cursor-pointer" : "opacity-80"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-[var(--color-primary)] font-black text-lg">
                      {visitor.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-[16px] font-black text-slate-900 dark:text-white truncate tracking-tight uppercase">{visitor.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="text-[12px] font-bold text-slate-500 tabular-nums">{visitor.phone}</span>
                      </div>
                    </div>
                    <Badge variant={visitor.status === 'APPROVED' ? 'emerald' : visitor.status === 'REJECTED' ? 'red' : 'amber'}>
                      {visitor.status}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting With</p>
                       <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 truncate">{visitor.personToMeet}</p>
                    </div>
                    <div className="space-y-1 text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose</p>
                       <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 truncate">{visitor.purpose}</p>
                    </div>
                  </div>

                  {visitor.status === 'APPROVED' && (
                    <div className="mt-4 flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                      <QrCode className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Tap to View QR Pass</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </TopRefreshControl>

      {/* QR Modal */}
      <AnimatePresence>
        {showQRModal && selectedVisitor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center text-emerald-600 mb-4">
                  <QrCode className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Visitor Entry Pass</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">#{selectedVisitor.id}</p>
              </div>

              {/* QR Code Placeholder (Using lucide-react QrCode as visual) */}
              <div className="aspect-square bg-slate-50 dark:bg-black rounded-[32px] border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center p-6 mb-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pattern-grid-slate-900" />
                <QrCode className="w-full h-full text-slate-900 dark:text-white" />
              </div>

              {/* Manual Code Section */}
              {selectedVisitor.manualCode && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[24px] p-6 mb-8 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Manual Entry Code</span>
                    <button 
                      onClick={() => handleCopyCode(selectedVisitor.manualCode!)}
                      className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-800 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <p className="text-4xl font-black text-amber-800 dark:text-amber-300 tracking-[12px] tabular-nums leading-none ml-[12px]">
                      {selectedVisitor.manualCode}
                    </p>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Visitor</span>
                  <span className="text-[14px] font-black text-slate-900 dark:text-white">{selectedVisitor.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Valid For</span>
                  <span className="text-[14px] font-black text-slate-900 dark:text-white">{selectedVisitor.numberOfPeople || 1} Person</span>
                </div>
              </div>

              {/* Close */}
              <button 
                onClick={() => setShowQRModal(false)}
                className="w-full mt-10 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
