
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLiteGeminiCall, runWithRetry } from './retryUtils';

const STRATEGIES_STORAGE_KEY = 'greyquant_learned_strategies';
const DAILY_STATS_KEY = 'greyquant_learning_stats';

const LEARNING_PROMPT = `
Discover a new high-utility trading concept (SMC, ICT, Chart Patterns, or Quants).
Summarize it into ONE concise, actionable instructional rule for visual chart analysis.
Return ONLY the text of the rule.
`;

export interface DailyStats { date: string; count: number; maxForDay: number; }

export const getLearnedStrategies = (): string[] => {
    try {
        const stored = localStorage.getItem(STRATEGIES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

export const getDailyStats = (): DailyStats => {
    try {
        const stored = localStorage.getItem(DAILY_STATS_KEY);
        let stats = stored ? JSON.parse(stored) : null;
        const today = new Date().toISOString().split('T')[0];
        if (!stats || stats.date !== today) {
            stats = { date: today, count: 0, maxForDay: Math.floor(Math.random() * 6) + 10 };
            localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
        }
        return stats;
    } catch { return { date: new Date().toISOString().split('T')[0], count: 0, maxForDay: 12 }; }
};

export const canLearnMoreToday = (): boolean => {
    const stats = getDailyStats();
    return stats.count < stats.maxForDay;
};

export const incrementDailyCount = (): void => {
    const stats = getDailyStats();
    stats.count += 1;
    localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(stats));
};

export const performAutoLearning = async (): Promise<string | null> => {
    try {
        const response = await executeLiteGeminiCall<GenerateContentResponse>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            return await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: LEARNING_PROMPT,
                config: { tools: [{ googleSearch: {} }], temperature: 0.7 },
            }));
        });
        const newStrategy = response.text?.trim();
        if (newStrategy) {
            const strategies = getLearnedStrategies();
            if (strategies.length >= 5) strategies.shift();
            strategies.push(newStrategy);
            localStorage.setItem(STRATEGIES_STORAGE_KEY, JSON.stringify(strategies));
            return newStrategy;
        }
    } catch (e) { console.error("Learning Error:", e); }
    return null;
};
