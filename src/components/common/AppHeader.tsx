import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface AppHeaderProps {
  label?: string;
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
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky inset-x-0 top-0 z-[90] flex h-[82px] shrink-0 items-center overflow-visible border-b border-white/55 bg-white/76 shadow-[0_18px_48px_-44px_rgba(15,23,42,0.75)] backdrop-blur-2xl dark:border-slate-800/75 dark:bg-[#0b1120]/82',
        className,
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between gap-4 px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            {label && (
              <p className="text-[12px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                {label}
              </p>
            )}
            <p className="sr-only">{subtitle}</p>
            <h1 className="truncate text-[26px] font-black uppercase leading-tight tracking-[-0.01em] text-slate-950 dark:text-white">
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
