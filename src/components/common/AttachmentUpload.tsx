import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

interface AttachmentUploadProps {
  value?: string;
  onChange: (value: string, fileName?: string) => void;
  fileName?: string;
  label?: string;
  className?: string;
}

export default function AttachmentUpload({
  value,
  onChange,
  fileName,
  label = 'Attachment',
  className,
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const readFile = (file?: File) => {
    if (!file) return;
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are supported.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('File size must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ''), file.name);
    reader.onerror = () => setError('Could not read this file. Please try another one.');
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
          {label} <span className="normal-case tracking-normal font-bold text-slate-400">(Optional)</span>
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('', undefined)}
            className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(event) => readFile(event.target.files?.[0])}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          readFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'group flex min-h-[70px] sm:min-h-[80px] cursor-pointer items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border border-dashed bg-white/80 px-3 py-3 sm:px-4 sm:py-4 shadow-sm outline-none transition-all duration-200 dark:bg-slate-900/80',
          isDragging || value
            ? 'border-blue-400 bg-blue-50/70 ring-4 ring-blue-500/10 dark:border-blue-600 dark:bg-blue-950/25'
            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/45 dark:border-slate-800 dark:hover:border-blue-800',
        )}
      >
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-transform group-hover:-translate-y-0.5 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
          {value ? <FileText className="h-5 w-5 sm:h-6 sm:w-6" /> : <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] sm:text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
            {value ? fileName || 'Attachment selected' : 'Choose file or drag here'}
          </p>
          <p className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-slate-400">
            PDF, JPG, PNG (Max 10MB)
          </p>
        </div>

        <span className="hidden shrink-0 rounded-xl border border-blue-100 bg-white px-3.5 py-1.5 text-[11px] font-black text-blue-700 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-blue-200 sm:inline-flex dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300">
          Choose File
        </span>
      </div>

      {error && <p className="px-1 text-[11px] font-bold text-rose-500">{error}</p>}
    </div>
  );
}
