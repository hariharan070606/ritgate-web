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
  sm: 'p-4',           // 16px
  md: 'p-4 sm:p-5',    // 16px/20px
  lg: 'p-5 sm:p-6',    // 20px/24px
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
        'native-card transition-all duration-200',
        glass
          ? 'bg-white/10 backdrop-blur-md border-white/20 shadow-lg'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm',
        (hover || onClick) && 'cursor-pointer hover:shadow-base',
        paddings[padding],
        className,
      )}
    >
      {children}
    </Comp>
  );
}
