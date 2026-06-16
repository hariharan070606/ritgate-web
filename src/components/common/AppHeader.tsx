import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AppHeaderProps {
  label: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  className?: string;
}

export default function AppHeader({
  label,
  title,
  subtitle,
  actions,
  onMenuClick,
  sidebarCollapsed,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky inset-x-0 top-0 z-[90] flex h-[78px] shrink-0 items-center overflow-visible border-b border-slate-200 bg-white/94 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#0b1120]/95',
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-4 px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="flex min-w-0 items-center gap-4">
          {sidebarCollapsed && (
            <button
              onClick={onMenuClick}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Expand sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {label}
            </p>
            <p className="sr-only">{subtitle}</p>
            <h1 className="truncate text-[24px] font-black uppercase leading-tight tracking-tight text-slate-950 dark:text-white">
              {title}
            </h1>
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
