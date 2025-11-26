
import { GoogleGenAI } from "@google/genai";

const STRATEGIES_STORAGE_KEY = 'greyquant_learned_strategies';
const DAILY_STATS_KEY = 'greyquant_learning_stats';

const LEARNING_PROMPT = `
You are an autonomous trading AI upgrading your core logic. 
Your task is to discover a new, high-performance algorithmic trading strategy specifically from the **QuantConnect** ecosystem (quantconnect.com, including forums, tutorials, and documentation).

**Instructions:**
1. Use Google Search to find a specific, profitable trading strategy or concept discussed or documented on **QuantConnect**.
2. Focus on strategies with a demonstrable statistical edge (e.g., Mean Reversion, Momentum, Statistical Arbitrage, Machine Learning Alpha, or specific indicator combinations favored by quants).
3. Summarize this strategy into a single, concise, **instructional rule** that can be applied to technical chart analysis.
4. The rule must be actionable (e.g., "Identify x, confirm with y, then execute z").

**Output:**
Return ONLY the text of the rule. Do not include any introductory text, titles, or JSON formatting. Just the rule string.
`;

export interface DailyStats {
    date: string;
    count: number;
    maxForDay: number;
}

export const getLearnedStrategies = (): string[] => {
    try {
        const stored = localStorage.getItem(STRATEGIES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to read learned strategies", e);
        return [];
    }
};

/**
 * Retrieves or initializes the daily learning statistics.
 * Resets if the date has changed.
 */
export const getDailyStats = (): DailyStats => {
    try {
        const stored = localStorage.getItem(DAILY_STATS_KEY);
        let stats: DailyStats = stored ? JSON.parse(stored) : null;
        const today = new Date().toISOString().split('T')[0];

        if (!stats || stats.date !== today) {
            // Determine a random max between 10 and 15 for the new day
            const randomMax = Math.floor(Math.random() * (15 - 10 + 1)) + 10;
            stats = {
                date: today,
                count: 0,
                maxForDay: randomMax
            };
            localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
        }
        return stats;
    } catch {
        // Fallback
        return { date: new Date().toISOString().split('T')[0], count: 0, maxForDay: 12 };
    }
};

/**
 * Checks if the system is allowed to run another learning session today.
 */
export const canLearnMoreToday = (): boolean => {
    const stats = getDailyStats();
    return stats.count < stats.maxForDay;
};

/**
 * Increments the daily learning count.
 */
export const incrementDailyCount = (): void => {
    const stats = getDailyStats();
    stats.count += 1;
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
};

export const performAutoLearning = async (): Promise<string | null> => {
    if (!process.env.API_KEY) return null;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: LEARNING_PROMPT,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.7, 
            },
        });

        const newStrategy = response.text.trim();
        
        if (newStrategy) {
            const strategies = getLearnedStrategies();
            // Keep only the last 5 strategies to avoid context bloat
            if (strategies.length >= 5) {
                strategies.shift();
            }
            strategies.push(newStrategy);
            
            localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(strategies));
            
            return newStrategy;
        }
    } catch (e) {
        console.error("Auto Learning Failed:", e);
    }
    return null;
};
