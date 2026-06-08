import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldOff } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page Not Found');
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <ShieldOff className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        </div>

        <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em] mb-3">
          Error 404
        </p>
        <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
          Page Not Found
        </h1>
        <p className="text-[14px] font-medium text-slate-400 leading-relaxed max-w-[260px] mb-10">
          The route you're looking for doesn't exist or you don't have access to it.
        </p>

        <button
          onClick={() => navigate('/dashboard', { replace: true })}
          className="flex items-center gap-2.5 px-6 h-13 bg-[var(--color-primary)] rounded-2xl text-white font-black text-[14px] uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
}
