import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  helperText?: string;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, iconRight, helperText, className, id, required, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full space-y-1.5">
        <label
          htmlFor={inputId}
          className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 px-1 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative group">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-500 transition-colors z-10">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-12 px-4 text-sm font-semibold bg-white/72 dark:bg-slate-900/72',
              'border border-slate-200/80 rounded-2xl transition-all duration-[220ms] ease-out outline-none shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] backdrop-blur-xl',
              'text-slate-900 dark:text-white placeholder:text-slate-400',
              'focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-slate-800',
              icon && 'pl-11',
              iconRight && 'pr-11',
              error && 'ring-2 ring-rose-500/20 bg-rose-50/10',
              className,
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {iconRight}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn(
            "text-[12px] font-medium pl-1 animate-in fade-in slide-in-from-top-1 duration-200",
            error ? "text-rose-500" : "text-slate-400"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
