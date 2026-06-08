import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  title: string;
  currentColor: string;
}

const PRESET_COLORS = [
  '#22D3EE', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#6B7280', // Gray
  '#1F2937', // Dark Gray
  '#FFFFFF', // White
];

export default function ColorPickerModal({
  visible,
  onClose,
  onSelectColor,
  title,
  currentColor,
}: ColorPickerModalProps) {
  const [customColor, setCustomColor] = useState('');

  const handleSelectColor = (color: string) => {
    onSelectColor(color);
    onClose();
  };

  const handleCustomColor = () => {
    if (customColor.match(/^#[0-9A-F]{6}$/i)) {
      onSelectColor(customColor);
      setCustomColor('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-6 space-y-6">
                {/* Preset Colors */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">
                    Preset Colors
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleSelectColor(color)}
                        className={cn(
                          'aspect-square rounded-xl transition-all duration-150',
                          'border-2 flex items-center justify-center',
                          currentColor === color
                            ? 'border-[var(--color-primary)] dark:border-blue-400 scale-105'
                            : 'border-slate-200 dark:border-slate-700 hover:scale-105',
                        )}
                        style={{ backgroundColor: color }}
                      >
                        {currentColor === color && (
                          <Check className="w-6 h-6 text-white drop-shadow-lg" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">
                    Custom Color
                  </h4>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#000000"
                      maxLength={7}
                      className="flex-1 h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] dark:focus:ring-blue-400 transition-shadow"
                    />
                    <button
                      onClick={handleCustomColor}
                      className="px-6 h-12 rounded-xl bg-[var(--color-primary)] hover:bg-blue-900 text-white font-semibold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
