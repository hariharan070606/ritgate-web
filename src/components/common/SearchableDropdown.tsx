import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DropdownItem {
  label: string;
  value: string;
}

interface SearchableDropdownProps {
  items: DropdownItem[];
  selectedValue: string;
  onSelect: (value: string, label: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableDropdown({
  items,
  selectedValue,
  onSelect,
  placeholder = 'Select...',
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  const selectedLabel = items.find(i => i.value === selectedValue)?.label || '';

  const handleSelect = (item: DropdownItem) => {
    onSelect(item.value, item.label);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 min-h-[50px] rounded-xl border-1.5 transition-all outline-none",
          disabled ? "bg-slate-50 border-slate-200 opacity-60 flex cursor-not-allowed" : 
          isOpen ? "bg-white border-[var(--color-primary)] shadow-[0_0_0_2px_rgba(79,70,229,0.1)]" : "bg-white border-[var(--color-primary)]"
        )}
      >
        <span className={cn(
          "text-[15px] font-medium truncate",
          selectedValue ? "text-slate-900" : "text-slate-400"
        )}>
          {selectedLabel || placeholder}
        </span>
        {isOpen ? (
          <ChevronUp className="w-[18px] h-[18px] text-[var(--color-primary)]" />
        ) : (
          <ChevronDown className="w-[18px] h-[18px] text-[var(--color-primary)]" />
        )}
      </button>

      {/* Backdrop for mobile feel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/30 pointer-events-auto sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 z-[150] mt-1 bg-white border-1.5 border-[var(--color-primary)] rounded-xl shadow-xl overflow-hidden max-h-[300px] overflow-y-auto"
          >
            <div className="flex flex-col">
              {items.length === 0 ? (
                <div className="p-5 text-center text-sm text-slate-400 font-medium lowercase tracking-wide">
                  No options
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = item.value === selectedValue;
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3.5 text-left transition-colors border-b last:border-b-0 border-slate-50",
                        isSelected ? "bg-blue-50/50" : "hover:bg-slate-50 active:bg-slate-100"
                      )}
                    >
                      <span className={cn(
                        "text-[15px]",
                        isSelected ? "text-[var(--color-primary)] font-bold" : "text-slate-700 font-medium"
                      )}>
                        {item.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
