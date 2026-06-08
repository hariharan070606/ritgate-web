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
      className="sticky top-0 z-[80] bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center h-[72px] px-4 gap-3">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-white active:scale-90 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="flex-1 text-[18px] font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
          {title}
        </h1>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
