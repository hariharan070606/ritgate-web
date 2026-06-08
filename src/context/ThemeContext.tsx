import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';
import { storage } from '../utils/storage';

type ThemeMode = 'light' | 'dark';

export type ThemePresetId = 'ocean' | 'neon' | 'sunset' | 'minimal';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  preview: string[];
  light: { primary: string; primaryHover: string; primarySubtle: string };
  dark:  { primary: string; primaryHover: string; primarySubtle: string };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'ocean',
    name: 'Executive Blue',
    description: 'Corporate and reliable',
    preview: ['#1D4ED8', '#2563EB', '#0EA5E9'],
    light: { primary: '#1D4ED8', primaryHover: '#1E40AF', primarySubtle: 'rgba(29,78,216,0.08)' },
    dark:  { primary: '#60A5FA', primaryHover: '#93C5FD', primarySubtle: 'rgba(96,165,250,0.12)' },
  },
  {
    id: 'neon',
    name: 'Emerald Pro',
    description: 'Balanced and modern',
    preview: ['#059669', '#10B981', '#34D399'],
    light: { primary: '#059669', primaryHover: '#047857', primarySubtle: 'rgba(5,150,105,0.08)' },
    dark:  { primary: '#34D399', primaryHover: '#6EE7B7', primarySubtle: 'rgba(52,211,153,0.12)' },
  },
  {
    id: 'sunset',
    name: 'Royal Violet',
    description: 'Premium and refined',
    preview: ['#6D28D9', '#7C3AED', '#A78BFA'],
    light: { primary: '#6D28D9', primaryHover: '#5B21B6', primarySubtle: 'rgba(109,40,217,0.08)' },
    dark:  { primary: '#C4B5FD', primaryHover: '#A78BFA', primarySubtle: 'rgba(196,181,253,0.12)' },
  },
  {
    id: 'minimal',
    name: 'Slate Mono',
    description: 'Minimal enterprise look',
    preview: ['#0F172A', '#1E293B', '#475569'],
    light: { primary: '#0F172A', primaryHover: '#1E293B', primarySubtle: 'rgba(15,23,42,0.08)' },
    dark:  { primary: '#E2E8F0', primaryHover: '#F1F5F9', primarySubtle: 'rgba(226,232,240,0.12)' },
  },
];

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  activePreset: ThemePresetId;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  applyPreset: (preset: ThemePresetId) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyCSSVars(preset: ThemePreset, isDark: boolean) {
  const root = document.documentElement;
  const tokens = isDark ? preset.dark : preset.light;
  root.style.setProperty('--color-primary', tokens.primary);
  root.style.setProperty('--color-primary-hover', tokens.primaryHover);
  root.style.setProperty('--color-primary-subtle', tokens.primarySubtle);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = storage.getTheme();
    if (stored) return stored;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  const [activePreset, setActivePreset] = useState<ThemePresetId>(() => {
    const stored = localStorage.getItem('theme-preset') as ThemePresetId | null;
    return (stored && THEME_PRESETS.find(p => p.id === stored)) ? stored : 'ocean';
  });

  // Apply dark class + CSS vars whenever theme or preset changes
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    storage.setTheme(theme);

    const preset = THEME_PRESETS.find(p => p.id === activePreset) ?? THEME_PRESETS[0];
    applyCSSVars(preset, isDark);

    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      isDark ? '#0f172a' : preset.light.primary
    );
  }, [theme, activePreset]);

  // System preference listener
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!storage.getTheme()) setThemeState(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
  }, []);

  const applyPreset = useCallback((preset: ThemePresetId) => {
    setActivePreset(preset);
    localStorage.setItem('theme-preset', preset);
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState('light');
    setActivePreset('ocean');
    localStorage.setItem('theme-preset', 'ocean');
    storage.setTheme('light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', activePreset, toggleTheme, setTheme, applyPreset, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
