
import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from './contexts/ThemeContext';
import { Sun, Moon, Sparkles, ChevronDown } from 'lucide-react';

export const ThemeToggleButton: React.FC = () => {
    const { theme, toggleTheme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const themeOptions: { id: Theme; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
        {
            id: 'light',
            label: 'Light',
            desc: 'Crisp & Clean High Contrast',
            color: 'text-amber-500',
            icon: <Sun className="w-4 h-4 text-amber-500" />
        },
        {
            id: 'dark',
            label: 'Dark',
            desc: 'Standard Slate Dark',
            color: 'text-emerald-400',
            icon: <Moon className="w-4 h-4 text-emerald-400" />
        },
        {
            id: 'midnight',
            label: 'Midnight',
            desc: 'Deep Obsidian Pitch Black',
            color: 'text-purple-400',
            icon: <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
        }
    ];

    const currentOption = themeOptions.find(o => o.id === theme) || themeOptions[1];

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/60 midnight:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-white/10 midnight:border-purple-500/20 rounded-full p-1 shadow-sm">
                <button 
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label={`Current theme: ${theme}. Click to switch theme.`}
                    title="Click to toggle theme (Light / Dark / Midnight)"
                >
                    {currentOption.icon}
                    <span className="capitalize tracking-wider text-[11px] font-black text-slate-800 dark:text-slate-200 midnight:text-purple-200">
                        {theme === 'midnight' ? 'Midnight' : theme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                </button>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    aria-label="Open theme selection menu"
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 midnight:bg-black/95 backdrop-blur-2xl border border-gray-200 dark:border-white/10 midnight:border-purple-500/30 shadow-2xl p-1.5 z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5 midnight:border-white/5 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 midnight:text-purple-300/60">Select Theme</span>
                    </div>
                    {themeOptions.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => {
                                setTheme(opt.id);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                theme === opt.id 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 midnight:bg-purple-500/15 midnight:text-purple-300 font-black' 
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 midnight:hover:bg-purple-950/40'
                            }`}
                        >
                            <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 midnight:bg-purple-950/60">
                                {opt.icon}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold tracking-wide">{opt.label}</span>
                                <span className="text-[9px] text-slate-400 midnight:text-slate-500 font-medium">{opt.desc}</span>
                            </div>
                            {theme === opt.id && (
                                <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 midnight:bg-purple-400 animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
