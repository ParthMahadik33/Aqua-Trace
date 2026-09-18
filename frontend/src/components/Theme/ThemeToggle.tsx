'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer border ${
        theme === 'dark'
          ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
      } ${className}`}
      title={theme === 'dark' ? 'Switch to Light Analyst Mode' : 'Switch to Dark Operations Mode'}
      aria-label="Toggle display theme"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] tracking-wider uppercase font-semibold">LIGHT</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-sky-600" />
          <span className="text-[10px] tracking-wider uppercase font-semibold">DARK</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
