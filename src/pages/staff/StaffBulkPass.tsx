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
  X, 
  Send, 
  ShieldCheck,
  Plus,
  LayoutGrid,
  Check,
  Paperclip
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { getStudentsByStaffDepartment, createBulkGatePass } from '../../services/api.service';
import { cn } from '../../utils/cn';
import { SkeletonList } from '../../components/ui/Skeleton';
import { nowIST, nowISTPlus } from '../../utils/dateUtils';

interface Student {
  id: number;
  regNo: string;
  fullName: string;
  department: string;
  section?: string;
  year?: string;
}

interface StaffBulkPassProps {
  onBack: () => void;
}

export default function StaffBulkPass({ onBack }: StaffBulkPassProps) {
  const { getUserId, user } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const staffCode = getUserId();

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [includeStaff, setIncludeStaff] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [receiverId, setReceiverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await getStudentsByStaffDepartment(staffCode);
      if (res.success) {
        setStudents(res.students || []);
      }
    } catch { showToastError('Registry Error', 'Failed to load department registry'); }
    finally { setLoading(false); }
  };

  const getSectionKey = (s: Student) => s.section?.trim() || s.year?.trim() || 'General';

  const getFilteredStudents = () => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.regNo.toLowerCase().includes(q)
    );
  };

  const getGroupedStudents = () => {
    const filtered = getFilteredStudents();
    const map = new Map<string, Student[]>();
    for (const s of filtered) {
      const key = getSectionKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, students]) => ({ key, students }));
  };

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleStudent = (regNo: string) => {
    const next = new Set(selectedStudents);
    if (next.has(regNo)) { 
        next.delete(regNo); 
        if (receiverId === regNo) setReceiverId(null); 
    }
    else next.add(regNo);
    setSelectedStudents(next);
  };

  const toggleSectionAll = (sectionStudents: Student[]) => {
    const regNos = sectionStudents.map(s => s.regNo);
    const allSelected = regNos.every(r => selectedStudents.has(r));
    const next = new Set(selectedStudents);
    if (allSelected) {
      regNos.forEach(r => { next.delete(r); if (receiverId === r) setReceiverId(null); });
    } else {
      regNos.forEach(r => next.add(r));
    }
    setSelectedStudents(next);
  };

  const selectAllFiltered = () => {
    const filtered = getFilteredStudents();
    if (selectedStudents.size === filtered.length) {
      setSelectedStudents(new Set());
      setReceiverId(null);
    } else {
      setSelectedStudents(new Set(filtered.map(s => s.regNo)));
    }
  };

  const submitBulk = async () => {
    if (!purpose.trim() || !reason.trim()) return showToastError('Missing Fields', 'Please enter purpose and reason');
    if (selectedStudents.size === 0) return showToastError('No Selection', 'Select at least one student');
    if (!includeStaff && !receiverId) return showToastError('Missing Receiver', 'Select a QR holder from the group');

    await withLock(async () => {
      try {
        const res = await createBulkGatePass({
          staffCode,
          purpose: purpose.trim(),
          reason: reason.trim(),
          exitDateTime: nowIST(),
          returnDateTime: nowISTPlus(24),
          students: Array.from(selectedStudents),
          includeStaff,
          receiverId: includeStaff ? undefined : (receiverId || undefined),
          attachmentUri: attachmentUri || undefined,
        });
        if (res.success) {
          showToastSuccess('Success', `Bulk authorization sent for ${selectedStudents.size} students`);
          onBack();
        } else showToastError('Failed', res.message);
      } catch { showToastError('Error', 'Network request failed'); }
    }, 'Dispatching batch authorization...');
  };

  const groups = getGroupedStudents();

  return (
    <div className="space-y-6">
      <div className="bg-amber-600 rounded-[32px] p-6 text-white shadow-xl shadow-amber-100 dark:shadow-none">
         <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
               <Users className="w-7 h-7 text-white" />
            </div>
            <div>
               <h3 className="text-[18px] font-black leading-none mb-1">Bulk Student Pass</h3>
               <p className="text-[13px] font-bold text-amber-100 opacity-90 uppercase tracking-widest">Departmental Flow</p>
            </div>
         </div>
         <p className="text-[12px] font-medium leading-relaxed opacity-80 italic">
            You can select multiple students for a group exit. Staff member becomes the primary QR holder if toggled.
         </p>
      </div>

      <div className="space-y-5">
         <button
            onClick={() => { setIncludeStaff(!includeStaff); if (!includeStaff) setReceiverId(null); }}
            className={cn(
              "w-full flex items-center justify-between p-5 rounded-[24px] border transition-all",
              includeStaff ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"
            )}
          >
            <div className="flex items-center gap-4">
               <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", includeStaff ? "bg-amber-600" : "bg-slate-100 dark:bg-slate-800")}>
                  <ShieldCheck className={cn("w-5 h-5", includeStaff ? "text-white" : "text-slate-400")} />
               </div>
               <div className="text-left">
                  <p className={cn("text-[14px] font-black", includeStaff ? "text-amber-900 dark:text-white" : "text-slate-900 dark:text-white")}>Include Myself (Staff)</p>
                  <p className="text-[11px] font-bold text-slate-400">You will hold the primary QR code</p>
               </div>
            </div>
            <div className={cn("w-12 h-6 rounded-full relative transition-colors", includeStaff ? "bg-amber-600" : "bg-slate-200 dark:bg-slate-700")}>
               <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", includeStaff ? "left-7" : "left-1")} />
            </div>
         </button>

         <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select Students</label>
               <button onClick={selectAllFiltered} className="text-[11px] font-black text-amber-600 uppercase tracking-widest px-2 py-1">
                  {selectedStudents.size === getFilteredStudents().length && getFilteredStudents().length > 0 ? 'Deselect All' : 'Select All'}
               </button>
            </div>

            <div className="relative">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-4.5 h-4.5" />
               </div>
               <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full h-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 text-[14px] font-bold text-slate-900 dark:text-white shadow-sm outline-none"
               />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[200px] max-h-[350px] overflow-y-auto custom-scrollbar">
               {loading ? (
                  <SkeletonList count={4} />
               ) : groups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                     <Users className="w-10 h-10 text-slate-200 mb-3" />
                     <p className="text-[13px] font-bold text-slate-400">No students matching search</p>
                  </div>
               ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                     {groups.map(({ key, students: sectionStudents }) => {
                        const isCollapsed = collapsedSections.has(key);
                        const sectionSelected = sectionStudents.filter(s => selectedStudents.has(s.regNo)).length;
                        const allSectionSelected = sectionSelected === sectionStudents.length;

                        return (
                           <div key={key}>
                              <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/30">
                                 <button onClick={() => toggleSectionAll(sectionStudents)}>
                                    {allSectionSelected ? <CheckCircle2 className="w-5.5 h-5.5 text-amber-600" /> : <Circle className="w-5.5 h-5.5 text-slate-200" />}
                                 </button>
                                 <button onClick={() => toggleSection(key)} className="flex-1 flex items-center justify-between">
                                    <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase">Section {key}</span>
                                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                                 </button>
                              </div>
                              {!isCollapsed && (
                                 <div>
                                    {sectionStudents.map(student => {
                                       const isSelected = selectedStudents.has(student.regNo);
                                       return (
                                          <button
                                             key={student.regNo}
                                             onClick={() => toggleStudent(student.regNo)}
                                             className={cn("w-full flex items-center gap-4 px-6 py-3.5", isSelected ? "bg-amber-50/20" : "")}
                                          >
                                             {isSelected ? <CheckCircle2 className="w-5.5 h-5.5 text-amber-600 shrink-0" /> : <Circle className="w-5.5 h-5.5 text-slate-100 shrink-0" />}
                                             <div className="min-w-0 flex-1 text-left">
                                                <p className="text-[14px] font-black truncate text-slate-900 dark:text-white">{student.fullName}</p>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase">{student.regNo}</p>
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
         </div>

         {!includeStaff && selectedStudents.size > 0 && (
            <div className="space-y-3">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">QR Holder</label>
               <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-800/30 max-h-[200px] overflow-y-auto">
                  {Array.from(selectedStudents).map(regNo => {
                    const student = students.find(s => s.regNo === regNo);
                    if (!student) return null;
                    const isRcv = receiverId === regNo;
                    return (
                      <button
                        key={regNo}
                        onClick={() => setReceiverId(regNo)}
                        className={cn("w-full flex items-center gap-4 px-6 py-3.5", isRcv ? "bg-amber-50/50" : "")}
                      >
                         <div className={cn("w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0", isRcv ? "border-amber-500 bg-amber-500" : "border-slate-100")}>
                           {isRcv && <Check className="w-3.5 h-3.5 text-white" />}
                         </div>
                         <div className="flex-1 min-w-0 text-left">
                            <p className="text-[14px] font-black truncate text-slate-900 dark:text-white">{student.fullName}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase">{student.regNo}</p>
                         </div>
                      </button>
                    );
                  })}
               </div>
            </div>
         )}

         <div className="space-y-4">
            <div className="space-y-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose</label>
               <PurposeSelect value={purpose} onChange={setPurpose} />
            </div>
            <div className="space-y-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason</label>
               <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide more context..."
                  className="w-full h-24 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none resize-none"
               />
            </div>

            {/* Supporting Document */}
            <div className="space-y-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Supporting Document <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
               <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setAttachmentUri(reader.result as string);
                  reader.readAsDataURL(file);
               }} className="hidden" />
               {attachmentUri ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                     <Paperclip className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                     <span className="text-[13px] font-bold text-amber-700 dark:text-amber-300 flex-1 truncate">
                        {fileInputRef.current?.files?.[0]?.name || 'Document attached'}
                     </span>
                     <button onClick={() => { setAttachmentUri(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-500 hover:bg-amber-200 transition-colors">
                        <X className="w-3.5 h-3.5" />
                     </button>
                  </div>
               ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                     className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-colors">
                     <Paperclip className="w-4.5 h-4.5 shrink-0" />
                     <span className="text-[13px] font-bold">Attach permission letter, circular, etc.</span>
                  </button>
               )}
            </div>
         </div>

         <div className="pt-4">
            <button 
               onClick={submitBulk}
               disabled={selectedStudents.size === 0}
               className="w-full h-15 bg-amber-600 rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-xl shadow-amber-100 dark:shadow-none transition-all active:scale-[0.98]"
            >
               Dispatch {selectedStudents.size} Passes
            </button>
         </div>
      </div>
    </div>
  );
}
