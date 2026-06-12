import { cn } from '../../utils/cn';

interface DesktopSegmentedTabsProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string; count?: number }>;
  onChange: (value: T) => void;
  className?: string;
}

export default function DesktopSegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  className,
}: DesktopSegmentedTabsProps<T>) {
  return (
    <div className={cn('hidden lg:flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1 dark:bg-slate-900/80', className)}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-[0.14em] transition-all',
              active
                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-blue-300 dark:ring-slate-700'
                : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            {option.label}
            {typeof option.count !== 'undefined' && (
              <span className={cn('ml-2 tabular-nums', active ? 'text-slate-950 dark:text-white' : 'text-slate-400')}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
