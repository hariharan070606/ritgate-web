import React, { useState, useRef } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { motion } from 'framer-motion';
import { 
  FileText, 
  ArrowLeft, 
  Paperclip, 
  X,
  Plus,
  ShieldCheck,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { submitHODGatePass } from '../../services/api.service';
import { getRequestDate } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

interface HODNewPassRequestProps {
  user: any;
  onBack: () => void;
}

export default function HODNewPassRequest({ user, onBack }: HODNewPassRequestProps) {
  const { getUserId } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const hodCode = getUserId();

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; uri: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hodName = (user as any)?.hodName || (user as any)?.name || 'HOD Member';
  const initials = hodName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return showToastError('Limit Exceeded', 'Maximum file size is 5MB');
      const reader = new FileReader();
      reader.onload = () => setAttachment({ name: file.name, uri: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const submitRequest = async () => {
    if (!purpose.trim() || !reason.trim()) return showToastError('Missing Fields', 'Please fill all required fields');
    
    await withLock(async () => {
       try {
         const res = await submitHODGatePass(
            hodCode,
            purpose.trim(),
            reason.trim(),
            attachment?.uri
         );
         if (res.success) {
           showToastSuccess('Request Dispatched', 'Your authorization pass has been submitted for HR review.');
           setPurpose(''); setReason(''); setAttachment(null);
           onBack();
         } else showToastError('Failed', res.message);
       } catch { showToastError('Error', 'An internal error occurred'); }
    }, 'Dispatching authorization...');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-violet-600 rounded-[32px] p-6 text-white flex items-center gap-5 shadow-xl shadow-violet-100 dark:shadow-none">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center font-black text-[24px]">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[18px] font-black leading-none mb-1 truncate">{hodName}</h3>
          <p className="text-[13px] font-bold text-violet-100 opacity-90 uppercase tracking-widest">{user?.department || 'Department'}</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose / Title</label>
          <PurposeSelect value={purpose} onChange={setPurpose} />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Detailed Reason</label>
          <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide more context for your exit..."
            className="w-full min-h-[120px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[15px] font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500/10 shadow-sm resize-none"
          />
        </div>

        {/* Attachment */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Supporting Document (Optional)</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
          >
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf"
            />
            {attachment ? (
              <div className="flex flex-col items-center gap-2 p-4">
                <div className="relative w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <FileText className="w-6 h-6" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAttachment(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md scale-90 hover:scale-110 active:scale-95 transition-transform"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[13px] font-bold text-slate-600 truncate max-w-[200px]">{attachment.name}</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm mb-2 group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-[13px] font-bold text-slate-400">Click to upload doc</span>
                <span className="text-[10px] font-medium text-slate-300 mt-1 uppercase tracking-widest">Max size: 5MB</span>
              </>
            )}
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={submitRequest}
            className="w-full h-15 bg-violet-600 rounded-2xl text-white font-black text-[16px] uppercase tracking-widest shadow-xl shadow-violet-100 dark:shadow-none hover:bg-violet-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <ShieldCheck className="w-5 h-5" />
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}
