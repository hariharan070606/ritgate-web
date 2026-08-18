import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, ArrowRight, RotateCcw, Check, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';
import { cn } from '../../utils/cn';

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromDate: string;
  toDate: string;
  onApply: (from: string, to: string, label: string) => void;
  onReset: () => void;
  title?: string;
}

type PresetKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function DateRangeModal({
  isOpen,
  onClose,
  fromDate: initialFromDate,
  toDate: initialToDate,
  onApply,
  onReset,
  title = 'Select Date Range',
}: DateRangeModalProps) {
  const [from, setFrom] = useState(initialFromDate);
  const [to, setTo] = useState(initialToDate);
  const [activePreset, setActivePreset] = useState<PresetKey>('today');

  // Format YYYY-MM-DD helper
  const toDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFrom(initialFromDate);
      setTo(initialToDate);
      if (!initialFromDate && !initialToDate) {
        setActivePreset('today');
      } else {
        setActivePreset('custom');
      }
    }
  }, [isOpen, initialFromDate, initialToDate]);

  const selectPreset = (preset: PresetKey) => {
    setActivePreset(preset);
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let label = "Today's logs";

    if (preset === 'today') {
      startDate = now;
      endDate = now;
      label = "Today's logs";
    } else if (preset === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      label = 'Yesterday';
    } else if (preset === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      endDate = now;
      label = 'Last 7 Days';
    } else if (preset === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      endDate = now;
      label = 'Last 30 Days';
    }

    const fromStr = toDateString(startDate);
    const toStr = toDateString(endDate);
    setFrom(fromStr);
    setTo(toStr);
  };

  const handleApply = () => {
    if (!from || !to) return;
    let label = `${formatDateDisplay(from)} → ${formatDateDisplay(to)}`;
    if (activePreset === 'today') label = "Today's logs";
    else if (activePreset === 'yesterday') label = 'Yesterday';
    else if (activePreset === 'week') label = 'Last 7 Days';
    else if (activePreset === 'month') label = 'Last 30 Days';

    onApply(from, to, label);
    onClose();
  };

  const handleReset = () => {
    setFrom('');
    setTo('');
    setActivePreset('today');
    onReset();
    onClose();
  };

  const calculateDays = () => {
    if (!from || !to) return null;
    try {
      const diffTime = Math.abs(new Date(to).getTime() - new Date(from).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
    } catch {
      return null;
    }
  };

  const daySpan = calculateDays();

  return (
    <Modal isOpen={isOpen} onClose={onClose} showClose={false} size="md" className="p-0 overflow-hidden">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[18px] font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-[12px] font-semibold text-slate-400 mt-0.5">
                Select quick timeframe or choose custom range
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets Grid */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            Quick Filter Presets
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week', label: 'Last 7 Days' },
              { key: 'month', label: 'Last 30 Days' },
            ].map((p) => {
              const isSelected = activePreset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => selectPreset(p.key as PresetKey)}
                  className={cn(
                    'h-10 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border',
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md dark:bg-blue-600 dark:border-blue-500'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Range Display Banner */}
        <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Selected Timeframe</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                {from ? formatDateDisplay(from) : 'Start Date'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                {to ? formatDateDisplay(to) : 'End Date'}
              </span>
            </div>
          </div>
          {daySpan && (
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[11px] font-black uppercase tracking-wider shrink-0">
              {daySpan}
            </span>
          )}
        </div>

        {/* Custom Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setActivePreset('custom');
                }}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => {
                  setTo(e.target.value);
                  setActivePreset('custom');
                }}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 h-12 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!from || !to}
            className="flex-1 h-12 rounded-xl bg-slate-950 hover:bg-black text-white dark:bg-blue-600 dark:hover:bg-blue-700 font-black text-sm uppercase tracking-wider shadow-lg shadow-slate-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Apply Filter</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
