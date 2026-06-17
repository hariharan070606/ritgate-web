import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { transitions } from '../../design-system/animations';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6',
};

/**
 * Card — Standardized container with strict radius and shadow rules.
 */
export default function Card({ children, className, hover = false, glass = false, padding = 'md', onClick }: CardProps) {
  const Comp = hover || onClick ? motion.div : 'div';

  const interactionProps = (hover || onClick) ? {
    whileHover: transitions.feedback.hover,
    whileTap: onClick ? transitions.feedback.tap : undefined,
    transition: { duration: transitions.feedback.duration },
  } : {};

  return (
    <Comp
      onClick={onClick}
      {...interactionProps}
      className={cn(
        'native-card lg:desktop-card transition-all duration-[220ms] ease-out',
        glass
          ? 'bg-white/60 backdrop-blur-2xl border-white/50 shadow-[0_24px_60px_-34px_rgba(37,99,235,0.55)]'
          : 'bg-white/80 dark:bg-slate-900/82 border-white/60 dark:border-slate-800/80 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.65)]',
        (hover || onClick) && 'cursor-pointer hover:-translate-y-1 hover:border-blue-200/80 hover:shadow-[0_24px_54px_-30px_rgba(37,99,235,0.38)]',
        paddings[padding],
        className,
      )}
    >
      {children}
    </Comp>
  );
}
