const ANALYSIS_COUNT_KEY = 'greyquant_analysisCount';

/**
 * Retrieves the analysis count from localStorage.
 * @returns The current analysis count.
 */
export const getAnalysisCount = (): number => {
    try {
        const count = localStorage.getItem(ANALYSIS_COUNT_KEY);
        return count ? parseInt(count, 10) : 0;
    } catch (error) {
        console.error("Failed to get analysis count from localStorage", error);
        return 0;
    }
};

/**
 * Increments the analysis count in localStorage.
 * @returns The new analysis count.
 */
export const incrementAnalysisCount = (): number => {
    const currentCount = getAnalysisCount();
    const newCount = currentCount + 1;
    try {
        localStorage.setItem(ANALYSIS_COUNT_KEY, newCount.toString());
    } catch (error) {
        console.error("Failed to save analysis count to localStorage", error);
    }
    return newCount;
};

/**
 * Resets the analysis count in localStorage to zero.
 */
export const resetAnalysisCount = (): void => {
    try {
        localStorage.setItem(ANALYSIS_COUNT_KEY, '0');
    } catch (error) {
        console.error("Failed to reset analysis count in localStorage", error);
    }
};