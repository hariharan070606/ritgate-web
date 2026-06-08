import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export const PURPOSE_OPTIONS = [
  {
    value: 'Medical Appointment',
    label: 'Medical Appointment',
    description: 'Doctor, hospital, or clinic visit during college hours',
  },
  {
    value: 'Family Emergency',
    label: 'Family Emergency',
    description: 'Urgent personal or family situation requiring immediate departure',
  },
  {
    value: 'Official Meeting / Conference',
    label: 'Official Meeting / Conference',
    description: 'External meeting, seminar, or academic conference on behalf of the institution',
  },
  {
    value: 'Personal Work',
    label: 'Personal Work',
    description: 'General errands or personal tasks outside college hours',
  },
  {
    value: 'Others',
    label: 'Others',
    description: 'Any other reason not listed above',
  },
];

interface PurposeSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Extra class on the trigger button */
  className?: string;
  /** Visual style — matches the surrounding form */
  variant?: 'default' | 'compact' | 'outlined';
}

export default function PurposeSelect({
  value,
  onChange,
  error,
  className,
  variant = 'default',
}: PurposeSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = PURPOSE_OPTIONS.find(o => o.value === value);

  const triggerBase = cn(
    'w-full flex items-center justify-between gap-3 text-left transition-all outline-none',
    variant === 'compact'
      ? 'h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm'
      : variant === 'outlined'
      ? 'h-14 px-4 bg-white dark:bg-slate-900 border rounded-2xl text-[15px] font-bold shadow-sm focus:ring-2'
      : 'w-full h-14 px-4 bg-white dark:bg-slate-900 border rounded-2xl text-[14px] font-bold shadow-sm',
    error
      ? 'border-rose-400 focus:ring-rose-300/30'
      : open
      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10'
      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700',
    className,
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={triggerBase}
      >
        <span className={cn(
          'truncate',
          selected ? 'text-slate-900 dark:text-white' : 'text-slate-400',
        )}>
          {selected ? selected.label : 'Select purpose…'}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150',
          open && 'rotate-180',
        )} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[200] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[20px] shadow-xl overflow-hidden">
          {PURPOSE_OPTIONS.map(opt => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0',
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-slate-200 dark:border-slate-700',
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-[13px] font-black leading-tight',
                    isSelected ? 'text-[var(--color-primary)]' : 'text-slate-900 dark:text-white',
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-[11px] font-bold text-rose-500 px-1 mt-1">{error}</p>
      )}
    </div>
  );
}
