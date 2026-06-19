import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DesktopStatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Optional small caption shown under the value (e.g. "today") */
  hint?: string;
  tone?: 'amber' | 'emerald' | 'rose' | 'blue' | 'slate';
  active?: boolean;
  onClick?: () => void;
}

const tones = {
  amber: {
    chip: 'bg-amber-50/90 text-amber-600 border-amber-100 shadow-amber-100/70 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-900/40',
    glow: 'bg-amber-400/15 dark:bg-amber-400/10',
    bar: 'bg-amber-500',
    ring: 'ring-amber-500/25 border-amber-200 dark:border-amber-800',
  },
  emerald: {
    chip: 'bg-emerald-50/90 text-emerald-600 border-emerald-100 shadow-emerald-100/70 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-900/40',
    glow: 'bg-emerald-400/15 dark:bg-emerald-400/10',
    bar: 'bg-emerald-500',
    ring: 'ring-emerald-500/25 border-emerald-200 dark:border-emerald-800',
  },
  rose: {
    chip: 'bg-rose-50/90 text-rose-600 border-rose-100 shadow-rose-100/70 dark:bg-rose-950/35 dark:text-rose-300 dark:border-rose-900/40',
    glow: 'bg-rose-400/15 dark:bg-rose-400/10',
    bar: 'bg-rose-500',
    ring: 'ring-rose-500/25 border-rose-200 dark:border-rose-800',
  },
  blue: {
    chip: 'bg-blue-50/90 text-blue-700 border-blue-100 shadow-blue-100/70 dark:bg-blue-950/35 dark:text-blue-300 dark:border-blue-900/40',
    glow: 'bg-blue-400/15 dark:bg-blue-400/10',
    bar: 'bg-blue-600',
    ring: 'ring-blue-500/25 border-blue-200 dark:border-blue-800',
  },
  slate: {
    chip: 'bg-slate-50/90 text-slate-600 border-slate-100 shadow-slate-100/70 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700',
    glow: 'bg-slate-400/10',
    bar: 'bg-slate-500',
    ring: 'ring-slate-400/25 border-slate-300 dark:border-slate-600',
  },
};

export default function DesktopStatCard({ label, value, icon: Icon, hint, tone = 'blue', active, onClick }: DesktopStatCardProps) {
  const Comp = onClick ? 'button' : 'div';
  const t = tones[tone];
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'desktop-stat-card group text-left animate-fade-up',
        onClick && 'cursor-pointer',
        active && cn('ring-2', t.ring),
      )}
    >
      {/* Soft tone glow */}
      <div className={cn('pointer-events-none absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl transition-opacity duration-300 opacity-70 group-hover:opacity-100', t.glow)} />

      {/* Active accent bar */}
      {active && <span className={cn('absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 rounded-r-full', t.bar)} />}

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-[30px] font-extrabold leading-none mt-2 tabular-nums text-slate-950 dark:text-white">{value}</p>
          {hint && <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-2 truncate">{hint}</p>}
        </div>
        <div className={cn('w-12 h-12 rounded-full border flex items-center justify-center shrink-0 shadow-lg transition-transform duration-200 group-hover:scale-105', t.chip)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Comp>
  );
}
