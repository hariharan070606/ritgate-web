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
      className="sticky inset-x-0 top-0 z-[90] bg-white/94 dark:bg-slate-950/95 border-b border-slate-100 dark:border-slate-800 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-xl shrink-0 md:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="relative flex items-center h-[64px] px-4 gap-3">
        <button
          onClick={onBack ?? (() => navigate(-1))}
          className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-white active:scale-90 transition-transform shrink-0 z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="absolute left-16 right-16 text-center text-[20px] font-black text-slate-900 dark:text-white tracking-tight leading-none truncate uppercase">
          {title}
        </h1>

        {right && <div className="ml-auto shrink-0 z-10">{right}</div>}
      </div>
    </header>
  );
}
