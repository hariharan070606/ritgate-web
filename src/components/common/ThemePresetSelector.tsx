import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Moon, Sun, ChevronDown, Check } from 'lucide-react';
import { useTheme, THEME_PRESETS, type ThemePresetId } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';

export default function ThemePresetSelector() {
  const { isDark, activePreset, applyPreset, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const active = THEME_PRESETS.find(p => p.id === activePreset) ?? THEME_PRESETS[0];
  const activePrimary = isDark ? active.dark.primary : active.light.primary;

  const handleSelect = (id: ThemePresetId) => {
    applyPreset(id);
    setIsOpen(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 dark:border-slate-800 overflow-hidden mb-4">
      {/* Header row: icon + title + dark toggle */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-[18px] h-[18px]" style={{ color: activePrimary }} />
          <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">App Theme</span>
        </div>
        <div className="flex items-center gap-2">
          {isDark
            ? <Moon className="w-4 h-4 text-violet-400" />
            : <Sun className="w-4 h-4 text-amber-500" />
          }
          <button
            onClick={toggleTheme}
            className="relative w-10 h-6 rounded-full transition-colors duration-300"
            style={{ backgroundColor: isDark ? activePrimary : '#E5E7EB' }}
          >
            <motion.div
              animate={{ x: isDark ? 18 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>
      </div>

      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="mx-3 mb-3 px-3.5 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-between w-[calc(100%-24px)] active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {active.preview.slice(0, 3).map((color, i) => (
              <div key={i} className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">{active.name}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {/* Active label row */}
      <div className="px-4 py-2.5 border-t border-slate-50 dark:border-slate-800 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activePrimary }} />
        <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
          {active.name} · {isDark ? 'Dark' : 'Light'}
        </span>
      </div>

      {/* Dropdown modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100%-48px)] max-w-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.12em]">
                  Select Theme
                </span>
              </div>

              <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                {THEME_PRESETS.map(preset => {
                  const isActive = activePreset === preset.id;
                  const presetPrimary = isDark ? preset.dark.primary : preset.light.primary;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelect(preset.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-4 transition-colors active:bg-slate-50 dark:active:bg-slate-800 text-left"
                      )}
                      style={isActive ? { backgroundColor: `${presetPrimary}12` } : undefined}
                    >
                      <div className="flex gap-1 shrink-0">
                        {preset.preview.map((color, i) => (
                          <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-[14px] font-bold leading-tight mb-0.5"
                          style={{ color: isActive ? presetPrimary : undefined }}
                        >
                          <span className={cn(!isActive && "text-slate-900 dark:text-white")}>
                            {preset.name}
                          </span>
                        </h4>
                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                          {preset.description}
                        </p>
                      </div>
                      {isActive && (
                        <Check className="w-5 h-5 shrink-0" style={{ color: presetPrimary }} />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-4 text-sm font-bold text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800"
              >
                Close
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
