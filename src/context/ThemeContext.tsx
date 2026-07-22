import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';
import { storage } from '../utils/storage';

type ThemeMode = 'light' | 'dark';

export type ThemePresetId = 'ocean' | 'neon' | 'sunset' | 'minimal';

interface PresetTokens {
  primary: string;
  primaryHover: string;
  primarySubtle: string;
  gradient: string;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  preview: string[];
  light: PresetTokens;
  dark: PresetTokens;
}

// 4 professional schemes — each with a tuned Light and Dark variant.
// `gradient` is used for filled accents (sidebar active item, primary buttons)
// where white text must stay legible; `primary` is the accent for icons,
// links and borders (lighter in dark for contrast).
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'ocean',
    name: 'Executive Blue',
    description: 'Corporate and reliable',
    preview: ['#2563EB', '#3B82F6', '#38BDF8'],
    light: { primary: '#2563EB', primaryHover: '#1D4ED8', primarySubtle: 'rgba(37,99,235,0.10)', gradient: 'linear-gradient(135deg,#3B82F6,#2563EB)' },
    dark:  { primary: '#60A5FA', primaryHover: '#93C5FD', primarySubtle: 'rgba(96,165,250,0.14)', gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)' },
  },
  {
    id: 'neon',
    name: 'Emerald Pro',
    description: 'Fresh and focused',
    preview: ['#059669', '#10B981', '#34D399'],
    light: { primary: '#059669', primaryHover: '#047857', primarySubtle: 'rgba(5,150,105,0.10)', gradient: 'linear-gradient(135deg,#10B981,#059669)' },
    dark:  { primary: '#34D399', primaryHover: '#6EE7B7', primarySubtle: 'rgba(52,211,153,0.14)', gradient: 'linear-gradient(135deg,#10B981,#047857)' },
  },
  {
    id: 'sunset',
    name: 'Royal Violet',
    description: 'Premium and refined',
    preview: ['#7C3AED', '#8B5CF6', '#A78BFA'],
    light: { primary: '#7C3AED', primaryHover: '#6D28D9', primarySubtle: 'rgba(124,58,237,0.10)', gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' },
    dark:  { primary: '#A78BFA', primaryHover: '#C4B5FD', primarySubtle: 'rgba(167,139,250,0.14)', gradient: 'linear-gradient(135deg,#7C3AED,#6D28D9)' },
  },
  {
    id: 'minimal',
    name: 'Graphite',
    description: 'Minimal enterprise look',
    preview: ['#334155', '#475569', '#94A3B8'],
    light: { primary: '#334155', primaryHover: '#1E293B', primarySubtle: 'rgba(51,65,85,0.10)', gradient: 'linear-gradient(135deg,#334155,#0F172A)' },
    dark:  { primary: '#CBD5E1', primaryHover: '#E2E8F0', primarySubtle: 'rgba(203,213,225,0.12)', gradient: 'linear-gradient(135deg,#475569,#334155)' },
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
  // Filled action surfaces (buttons, active nav) always use the unified
  // mild dark gradient (near-black → dark gray, left→right) — never a
  // preset accent color — so button backgrounds stay consistent everywhere.
  root.style.setProperty('--gradient-primary', UNIFIED_ACTION_GRADIENT);
}

const UNIFIED_ACTION_GRADIENT = '#000000';

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
