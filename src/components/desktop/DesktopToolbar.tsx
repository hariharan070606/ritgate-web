import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DesktopToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  className?: string;
}

export default function DesktopToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
  className,
}: DesktopToolbarProps) {
  return (
    <div className={cn('desktop-toolbar animate-fade-up w-full flex items-center justify-between gap-4', className)}>
      {onSearchChange && (
        <div className="relative min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500 stroke-[2.5] dark:text-slate-300" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="desktop-input pl-11 hover:border-blue-200"
          />
        </div>
      )}
      {children && (
        <div className="flex flex-row items-center gap-3 shrink-0 whitespace-nowrap">
          {children}
        </div>
      )}
    </div>
  );
}
