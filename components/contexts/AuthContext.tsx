import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
    isLoggedIn: boolean;
    login: () => void;
    logout: () => void;
}

const AUTH_STORAGE_KEY = 'greyquant_isLoggedIn';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        try {
            // Check localStorage on initial load
            return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
        } catch (error) {
            console.warn(`Could not read login state from localStorage: ${error}`);
            return false;
        }
    });

    // Listen for storage changes to sync across tabs
    useEffect(() => {
        const syncLoginState = (event: StorageEvent) => {
            if (event.key === AUTH_STORAGE_KEY) {
                setIsLoggedIn(event.newValue === 'true');
            }
        };

        window.addEventListener('storage', syncLoginState);
        return () => {
            window.removeEventListener('storage', syncLoginState);
        };
    }, []);

    const login = () => {
        try {
            // Set login state in localStorage
            window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
            setIsLoggedIn(true);
        } catch (error) {
            console.error(`Could not save login state to localStorage: ${error}`);
        }
    };

    const logout = () => {
        try {
            // Remove login state from localStorage
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
            setIsLoggedIn(false);
        } catch (error) {
            console.error(`Could not remove login state from localStorage: ${error}`);
        }
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
