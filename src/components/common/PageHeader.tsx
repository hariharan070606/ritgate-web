import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  /** Right-side custom element */
  right?: React.ReactNode;
}

export default function PageHeader({ title, onBack, right }: PageHeaderProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      className="sticky inset-x-0 top-0 z-[90] bg-white/94 dark:bg-slate-950/95 border-b border-slate-100 dark:border-slate-800 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl shrink-0 md:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="relative flex items-center justify-between h-[64px] px-4">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-white active:scale-90 transition-transform shrink-0 z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="absolute left-16 right-16 text-center text-[18px] font-black text-slate-900 dark:text-white tracking-tight leading-none truncate uppercase">
          {title}
        </h1>

        <div className="ml-auto shrink-0 z-10 flex items-center gap-2">
          {right}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme mode"
            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-white active:scale-90 transition-transform shrink-0"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
}
