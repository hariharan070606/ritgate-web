import React, { useState } from 'react';
import PurposeSelect from '../../components/common/PurposeSelect';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { submitHODGatePass } from '../../services/api.service';
import { cn } from '../../utils/cn';
import AttachmentUpload from '../../components/common/AttachmentUpload';

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
  const [attachmentUri, setAttachmentUri] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | undefined>();

  const hodName = (user as any)?.hodName || (user as any)?.name || 'HOD Member';
  const initials = hodName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const submitRequest = async () => {
    if (!purpose.trim() || !reason.trim()) return showToastError('Missing Fields', 'Please fill all required fields');
    
    await withLock(async () => {
       try {
         const res = await submitHODGatePass(
            hodCode,
            purpose.trim(),
            reason.trim(),
            attachmentUri || undefined
         );
         if (res.success) {
           showToastSuccess('Request Dispatched', 'Your authorization pass has been submitted for HR review.');
           setPurpose(''); setReason(''); setAttachmentUri(''); setAttachmentName(undefined);
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

        <AttachmentUpload
          value={attachmentUri}
          fileName={attachmentName}
          onChange={(value, name) => {
            setAttachmentUri(value);
            setAttachmentName(name);
          }}
        />



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
