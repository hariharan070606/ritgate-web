import { useRef, useState } from 'react';
import { UploadCloud, X, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { compressImageSrc, fileToDataUrl, isDecodableImage } from '../../utils/imageCompression';
import { cn } from '../../utils/cn';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface VisitorPhotoUploadProps {
  /** Compressed JPEG data URL, or '' when none selected. */
  value: string;
  onChange: (photo: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

/**
 * Photo upload for pre-registered guests — file selection only (no live
 * camera). Validates type, size, and that the bytes actually decode as an
 * image, then compresses. Supports preview, replace, and remove.
 */
export default function VisitorPhotoUpload({
  value,
  onChange,
  label = 'Visitor Photo',
  required = false,
  className,
}: VisitorPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file?: File) => {
    setError('');
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Image must be under 5MB.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!(await isDecodableImage(dataUrl))) {
        setError('This image appears to be corrupted. Please choose another.');
        return;
      }
      onChange(await compressImageSrc(dataUrl));
    } catch {
      setError('Could not read this file. Please try another one.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={pick}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <img
            src={value}
            alt="Uploaded visitor"
            className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-md dark:ring-slate-900"
          />
          <p className="flex items-center gap-1.5 text-[13px] font-black text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" /> Photo ready
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="group flex min-h-[82px] w-full items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/78 px-4 py-4 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] transition-all hover:border-blue-300 hover:bg-blue-50/45 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-blue-800"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-transform group-hover:-translate-y-0.5 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-black text-slate-900 dark:text-white">
              {busy ? 'Processing…' : 'Upload visitor photograph'}
            </p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">Supports JPG, PNG, WEBP (Max. 5MB)</p>
          </div>
        </button>
      )}

      {error && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-rose-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
