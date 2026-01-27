
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
        const history = JSON.parse(historyJson);

        // Robustness check: Ensure the stored data is an array.
        if (!Array.isArray(history)) {
            console.warn("Corrupted history data (not an array) in localStorage. Clearing history.");
            localStorage.removeItem(HISTORY_KEY);
            return [];
        }

        // Filter out any potential null/invalid entries just in case
        const validHistory = history.filter(item => item && typeof item === 'object' && item.timestamp);
        
        return validHistory.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
        console.error("Failed to parse history from localStorage. Clearing history.", error);
        // If parsing fails, the data is corrupted. Remove it to prevent future crashes.
        try {
            localStorage.removeItem(HISTORY_KEY);
        } catch (removeError) {
            console.error("Failed to remove corrupted history from localStorage.", removeError);
        }
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
