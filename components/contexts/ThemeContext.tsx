
import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';

export type Theme = 'light' | 'dark' | 'midnight';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
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
        const body = window.document.body;
        root.classList.remove('light', 'dark', 'midnight');
        body.classList.remove('light', 'dark', 'midnight');
        
        if (theme === 'light') {
            root.classList.add('light');
            body.classList.add('light');
        } else if (theme === 'midnight') {
            // Include dark so standard dark variant works + midnight for ultra-dark
            root.classList.add('dark', 'midnight');
            body.classList.add('dark', 'midnight');
        } else {
            root.classList.add('dark');
            body.classList.add('dark');
        }

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
             console.error(`Could not save theme to localStorage: ${error}`);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => {
            if (prevTheme === 'light') return 'dark';
            if (prevTheme === 'dark') return 'midnight';
            return 'light';
        });
    };
    
    const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme]);

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
