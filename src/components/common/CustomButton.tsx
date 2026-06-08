import React from 'react';
import { cn } from '../../utils/cn';

interface CustomButtonProps {
  onPress: () => void;
  title: string;
  type?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  onPress,
  title,
  type = 'primary',
  loading = false,
  disabled = false,
  className,
  icon,
}) => {
  const getButtonClasses = () => {
    const baseClasses = 'h-14 rounded-2xl font-bold text-base uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl';
    
    if (disabled || loading) {
      return cn(baseClasses, 'bg-gray-400 text-white cursor-not-allowed', className);
    }

    switch (type) {
      case 'secondary':
        return cn(baseClasses, 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700', className);
      case 'danger':
        return cn(baseClasses, 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700', className);
      case 'ghost':
        return cn(baseClasses, 'bg-transparent border-2 border-blue-700 text-blue-700 hover:bg-blue-50 shadow-none', className);
      default:
        return cn(baseClasses, 'bg-[var(--color-primary)] text-white hover:opacity-90', className);
    }
  };

  return (
    <button
      onClick={onPress}
      disabled={disabled || loading}
      className={getButtonClasses()}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </>
      )}
    </button>
  );
};

export default CustomButton;
