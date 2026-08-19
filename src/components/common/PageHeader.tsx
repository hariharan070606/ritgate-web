import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  /** Right-side custom element */
  right?: React.ReactNode;
}

export default function PageHeader({ title, onBack, right }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky inset-x-0 top-0 z-[90] bg-white/95 dark:bg-slate-950/95 border-b border-slate-100 dark:border-slate-800 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl shrink-0 md:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="relative flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 box-border">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-white active:scale-90 transition-transform shrink-0 z-10"
        >
          <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </button>

        <h1 className="absolute inset-x-12 sm:inset-x-16 text-center text-[15px] sm:text-[17px] font-black text-slate-900 dark:text-white tracking-wide leading-none truncate uppercase">
          {title}
        </h1>

        <div className="w-9 sm:w-10 shrink-0 z-10 flex items-center justify-end">
          {right || null}
        </div>
      </div>
    </header>
  );
}
