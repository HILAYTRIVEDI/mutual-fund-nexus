'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`relative p-2 rounded-xl border transition-all duration-300 ${isDark
                    ? 'bg-[var(--bg-hover)] border-[var(--border-primary)] hover:bg-white/10'
                    : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDark ? (
                <Moon size={20} className="text-[var(--text-secondary)]" />
            ) : (
                <Sun size={20} className="text-yellow-500" />
            )}
        </button>
    );
}
