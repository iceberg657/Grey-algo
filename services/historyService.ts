import type { SignalData } from '../types';

const HISTORY_KEY = 'analysisHistory';

/**
 * Retrieves the analysis history from localStorage.
 * @returns An array of SignalData objects, sorted from newest to oldest.
 */
export const getHistory = (): SignalData[] => {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        if (!historyJson) {
            return [];
        }
        const history = JSON.parse(historyJson) as SignalData[];
        // Ensure data is sorted newest first, in case it was manually tampered with
        return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Failed to parse history from localStorage", error);
        return [];
    }
};

/**
 * Saves a new analysis result to the history in localStorage.
 * @param data The new analysis data from the AI.
 * @returns The saved data including the new id and timestamp.
 */
export const saveAnalysis = (data: Omit<SignalData, 'id' | 'timestamp'>): SignalData => {
    const history = getHistory();
    const now = Date.now();
    
    const newEntry: SignalData = {
        ...data,
        id: now.toString(),
        timestamp: now,
    };

    // Add the new entry to the beginning of the array
    history.unshift(newEntry);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save analysis to localStorage", error);
    }

    return newEntry;
};


/**
 * Clears all analysis history from localStorage.
 */
export const clearHistory = (): void => {
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Failed to clear history from localStorage", error);
    }
};
