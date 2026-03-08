
import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'greyquant_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
            return (storedTheme as Theme) || 'dark';
        } catch (error) {
            console.warn(`Could not read theme from localStorage: ${error}`);
            return 'dark';
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
             console.error(`Could not save theme to localStorage: ${error}`);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    
    const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
