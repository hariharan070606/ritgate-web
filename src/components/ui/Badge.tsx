import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { STATUS_MAP } from '../../config/api.config';

interface BadgeProps {
  status?: string;
  variant?: 'amber' | 'orange' | 'blue' | 'green' | 'red' | 'gray' | 'indigo' | 'emerald' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Badge — Standardized status indicators with vibrant colors.
 */
export default function Badge({ status, variant, size = 'sm', pulse = false, className, children }: BadgeProps) {
  const mapped = status ? (STATUS_MAP[status] || STATUS_MAP['PENDING']) : null;
  const isPending = status ? (status.startsWith('PENDING') || status === 'APPROVED_BY_STAFF' || status === 'APPROVED_BY_HOD') : false;

  const colorVariants: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/30',
    orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800/30',
    blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-[var(--color-primary)]/30',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/30',
    red: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800/30',
    gray: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/30',
    indigo: 'bg-blue-100 text-[var(--color-primary)] border-blue-200 dark:bg-indigo-900/40 dark:text-blue-400 dark:border-[var(--color-primary)]/30',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/30',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/30',
    warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/30',
    danger: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800/30',
  };

  const activeVariant = variant || mapped?.color || 'gray';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-[8px] whitespace-nowrap border uppercase tracking-wider',
        colorVariants[activeVariant] || colorVariants.gray,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[12px]',
        className,
      )}
    >
      {(pulse || isPending) && (
        <span className={cn(
          'w-1 h-1 rounded-full animate-pulse mr-0.5',
          activeVariant === 'amber' && 'bg-amber-500',
          activeVariant === 'orange' && 'bg-orange-500',
          activeVariant === 'blue' && 'bg-blue-500',
          activeVariant === 'green' && 'bg-emerald-500',
          activeVariant === 'red' && 'bg-rose-500',
          activeVariant === 'gray' && 'bg-slate-500',
          activeVariant === 'indigo' && 'bg-blue-500',
          activeVariant === 'emerald' && 'bg-emerald-500',
        )} />
      )}
      {children || mapped?.label}
    </span>
  );
}
