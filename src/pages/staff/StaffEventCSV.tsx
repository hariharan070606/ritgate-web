import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, Upload, X, CheckCircle2, AlertCircle,
  Users, Send, Paperclip, Info, Download
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useActionLock } from '../../context/ActionLockContext';
import { createBulkGatePass } from '../../services/api.service';
import PageHeader from '../../components/common/PageHeader';
import { cn } from '../../utils/cn';
import { nowIST, nowISTPlus } from '../../utils/dateUtils';

interface ParsedStudent {
  regNo: string;
  name: string;
  valid: boolean;
  error?: string;
}

const TEMPLATE_CSV = `regNo,name\n21CSR001,STUDENT ONE\n21CSR002,STUDENT TWO`;

function parseCSV(text: string): ParsedStudent[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('regno') || firstLine.includes('reg no') || firstLine.includes('rollno');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map(line => {
    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const regNo = parts[0] || '';
    const name = parts[1] || '';
    const valid = /^[A-Z0-9]{5,15}$/i.test(regNo);
    return { regNo, name, valid, error: valid ? undefined : 'Invalid Reg No format' };
  });
}

export default function StaffEventCSV() {
  usePageTitle('Event CSV Upload');
  const { getUserId } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { withLock } = useActionLock();
  const staffCode = getUserId();

  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [fileName, setFileName] = useState('');
  const [csvError, setCsvError] = useState('');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const attachmentRef = React.useRef<HTMLInputElement>(null);

  const validStudents = parsedStudents.filter(s => s.valid);
  const invalidStudents = parsedStudents.filter(s => !s.valid);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setCsvError('No valid rows found in CSV. Check format.');
          setParsedStudents([]);
        } else {
          setParsedStudents(parsed);
        }
      } catch {
        setCsvError('Failed to parse CSV. Ensure it is comma-separated.');
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'event_participants_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitEventCSV = async () => {
    if (!purpose.trim()) return showToastError('Missing Fields', 'Please enter the event purpose');
    if (validStudents.length === 0) return showToastError('No Valid Entries', 'Upload a CSV with at least one valid registration number');

    await withLock(async () => {
      try {
        const res = await createBulkGatePass({
          staffCode,
          purpose: purpose.trim(),
          reason: reason.trim() || purpose.trim(),
          exitDateTime: nowIST(),
          returnDateTime: nowISTPlus(24),
          students: validStudents.map(s => s.regNo),
          includeStaff: true,
          attachmentUri: attachmentUri || undefined,
        });
        if (res.success) {
          showToastSuccess('Event Submitted', `Bulk pass dispatched for ${validStudents.length} students`);
          setParsedStudents([]);
          setFileName('');
          setPurpose('');
          setReason('');
          setAttachmentUri(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (attachmentRef.current) attachmentRef.current.value = '';
        } else showToastError('Failed', res.message);
      } catch { showToastError('Error', 'Network request failed'); }
    }, 'Submitting event pass...');
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-950 min-h-screen">
      <PageHeader title="Event CSV Upload" />

      <div className="px-5 py-6 pb-28 space-y-5">
        {/* Info banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-[24px] p-4 flex gap-3">
          <Info className="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-black text-[var(--color-primary)] mb-1">CSV Format</p>
            <p className="text-[12px] font-medium text-blue-600 dark:text-blue-400 leading-relaxed">
              Upload a CSV with columns: <strong>regNo, name</strong>. First row can be a header. One student per row.
            </p>
          </div>
        </div>

        {/* Template download */}
        <button
          onClick={downloadTemplate}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-black">Download CSV Template</span>
        </button>

        {/* CSV Upload */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Participants CSV</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          {fileName ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-300 flex-1 truncate">{fileName}</span>
              <button
                onClick={() => {
                  setParsedStudents([]); setFileName(''); setCsvError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 px-4 py-8 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              <Upload className="w-8 h-8" />
              <span className="text-[13px] font-black uppercase tracking-widest">Upload CSV File</span>
              <span className="text-[11px] font-medium">Tap to select from device</span>
            </button>
          )}
          {csvError && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-[12px] font-bold text-rose-600 dark:text-rose-400">{csvError}</p>
            </div>
          )}
        </div>

        {/* Parsed preview */}
        <AnimatePresence>
          {parsedStudents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* Summary */}
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center border border-emerald-100 dark:border-emerald-800">
                  <p className="text-[24px] font-black text-emerald-600 leading-none">{validStudents.length}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Valid</p>
                </div>
                <div className={cn('flex-1 rounded-2xl p-4 text-center border', invalidStudents.length > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800')}>
                  <p className={cn('text-[24px] font-black leading-none', invalidStudents.length > 0 ? 'text-rose-500' : 'text-slate-300')}>{invalidStudents.length}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Invalid</p>
                </div>
              </div>

              {/* List */}
              <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden max-h-[260px] overflow-y-auto">
                <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Parsed Participants ({parsedStudents.length})</p>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {parsedStudents.map((s, i) => (
                    <div key={i} className={cn('flex items-center gap-3 px-5 py-3', !s.valid ? 'bg-rose-50/30 dark:bg-rose-900/10' : '')}>
                      {s.valid
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-[13px] font-black truncate', s.valid ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400')}>
                          {s.regNo || '(empty)'}
                        </p>
                        {s.name && <p className="text-[11px] font-bold text-slate-400 truncate">{s.name}</p>}
                        {s.error && <p className="text-[10px] font-bold text-rose-500">{s.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Purpose */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Purpose</label>
          <input
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="Ex: Annual Sports Day, Industrial Visit..."
            className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none"
          />
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Additional context..."
            className="w-full h-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-[14px] font-bold text-slate-900 dark:text-white outline-none resize-none"
          />
        </div>

        {/* Attachment */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Supporting Document <span className="text-slate-300 normal-case font-bold">(optional)</span></label>
          <input ref={attachmentRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setAttachmentUri(reader.result as string);
            reader.readAsDataURL(file);
          }} className="hidden" />
          {attachmentUri ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
              <Paperclip className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[13px] font-bold text-amber-700 dark:text-amber-300 flex-1 truncate">
                {attachmentRef.current?.files?.[0]?.name || 'Document attached'}
              </span>
              <button onClick={() => { setAttachmentUri(null); if (attachmentRef.current) attachmentRef.current.value = ''; }}
                className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => attachmentRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-amber-400 hover:text-amber-500 transition-colors">
              <Paperclip className="w-4 h-4 shrink-0" />
              <span className="text-[13px] font-bold">Attach permission letter, circular...</span>
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={submitEventCSV}
          disabled={validStudents.length === 0}
          className="w-full h-14 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[15px] uppercase tracking-widest shadow-xl shadow-blue-100 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50"
        >
          Dispatch {validStudents.length} Passes
        </button>
      </div>
    </div>
  );
}
