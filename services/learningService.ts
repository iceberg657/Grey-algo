
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, CHAT_POOL, CHAT_MODELS, runWithModelFallback } from './retryUtils';

const STORAGE_KEY = 'greyalpha_automl_stats';
const STRATEGIES_KEY = 'greyalpha_learned_strategies';
const MAX_SESSIONS_PER_DAY = 2;

interface DailyStats {
    date: string;
    count: number;
    maxForDay: number;
}

export const getDailyStats = (): DailyStats => {
    try {
        const str = localStorage.getItem(STORAGE_KEY);
        const now = new Date();
        const today = now.toDateString();
        
        if (str) {
            const data = JSON.parse(str);
            if (data.date === today) {
                return { ...data, maxForDay: MAX_SESSIONS_PER_DAY };
            }
        }
        // Reset or Initialize for new day
        const newStats = { date: today, count: 0, maxForDay: MAX_SESSIONS_PER_DAY };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
        return newStats;
    } catch {
        return { date: new Date().toDateString(), count: 0, maxForDay: MAX_SESSIONS_PER_DAY };
    }
};

export const incrementDailyCount = () => {
    const stats = getDailyStats();
    stats.count += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const canLearnMoreToday = () => {
    const stats = getDailyStats();
    return stats.count < stats.maxForDay;
};

export const getLearnedStrategies = (): string[] => {
    try {
        const stored = localStorage.getItem(STRATEGIES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveStrategy = (strategy: string) => {
    const current = getLearnedStrategies();
    // Keep unique and limit to latest 20 to avoid context bloat
    if (!current.includes(strategy)) {
        const updated = [strategy, ...current].slice(0, 20);
        localStorage.setItem(STRATEGIES_KEY, JSON.stringify(updated));
    }
};

export const performAutoLearning = async (): Promise<string | null> => {
    if (!canLearnMoreToday()) return null;

    try {
        return await executeLaneCall<string>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            // Auto Learning uses CHAT Models via Chat Pool (now Key 5)
            const response = await runWithModelFallback<GenerateContentResponse>(CHAT_MODELS, (modelId) => 
                ai.models.generateContent({
                    model: modelId,
                    contents: "Discover a new actionable SMC/ICT trading rule or insight based on recent market behavior. Output strictly the rule in one concise sentence.",
                    config: { tools: [{ googleSearch: {} }], temperature: 0.7 },
                })
            );
            
            const strategy = response.text?.trim() || null;
            if (strategy) {
                saveStrategy(strategy);
            }
            return strategy;
        }, CHAT_POOL);
    } catch { return null; }
};
