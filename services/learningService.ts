
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, CHAT_POOL, CHAT_MODELS, runWithModelFallback } from './retryUtils';

export const performAutoLearning = async (): Promise<string | null> => {
    try {
        return await executeLaneCall<string>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            // Auto Learning uses CHAT Models (2.5 Pro/Flash) via Key 7
            const response = await runWithModelFallback<GenerateContentResponse>(CHAT_MODELS, (modelId) => 
                ai.models.generateContent({
                    model: modelId,
                    contents: "Discover a new actionable SMC/ICT trading rule. Concise text output.",
                    config: { tools: [{ googleSearch: {} }], temperature: 0.7 },
                })
            );
            
            return response.text?.trim() || null;
        }, CHAT_POOL);
    } catch { return null; }
};

export const getLearnedStrategies = () => [];
export const getDailyStats = () => ({ date: '', count: 0, maxForDay: 15 });
export const canLearnMoreToday = () => true;
export const incrementDailyCount = () => {};
