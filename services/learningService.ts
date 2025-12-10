
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeGeminiCall, runWithRetry } from './retryUtils';

const STRATEGIES_STORAGE_KEY = 'greyquant_learned_strategies';
const DAILY_STATS_KEY = 'greyquant_learning_stats';

const LEARNING_PROMPT = `
You are an autonomous trading AI upgrading your core logic. 
Your task is to discover a new, high-utility trading concept, strategy, or pattern recognition technique that will improve your ability to **analyze chart screenshots**.

**Instructions:**
1. Use Google Search to find specific, high-probability trading concepts. Focus on:
   - **Advanced Chart Patterns:** (e.g., Wyckoff Schematics, Quasimodo patterns, Harmonic patterns, Head and Shoulders failures).
   - **Institutional Price Action (SMC/ICT):** (e.g., Order Blocks, Fair Value Gaps, Liquidity Sweeps, Breaker Blocks, Killzones).
   - **Candlestick Psychology:** Hidden rejection, volume-spread analysis (VSA), multi-candle rejection formations.
   - **Quantitative Strategies:** Mean Reversion, Momentum, Statistical Arbitrage strategies that have visual cues.
2. Select ONE specific concept.
3. Summarize this concept into a single, concise, **instructional rule** that you can apply when analyzing a chart image.
4. The rule must be actionable (e.g., "Identify a liquidity sweep of a previous high, wait for a displacement candle closing below the range, then enter on the retest of the breaker block.").

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
    try {
        const response = await executeGeminiCall<GenerateContentResponse>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            return await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: LEARNING_PROMPT,
                config: {
                    tools: [{ googleSearch: {} }],
                    temperature: 0.7, 
                },
            }));
        });

        const newStrategy = response.text?.trim();
        
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
