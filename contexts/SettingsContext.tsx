
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { UserSettings } from '../types';

interface SettingsContextType {
    settings: UserSettings;
    updateSettings: (newSettings: UserSettings) => void;
}

const SETTINGS_STORAGE_KEY = 'greyalpha_user_settings';

const DEFAULT_SETTINGS: UserSettings = {
    accountType: 'Real',
    balance: 100000,
    dailyDrawdownLimit: 5,
    maxDrawdownLimit: 10,
    currency: 'USD'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<UserSettings>(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
            return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    const updateSettings = (newSettings: UserSettings) => {
        setSettings(newSettings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
