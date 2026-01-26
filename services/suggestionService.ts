
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { runWithModelFallback, executeLiteGeminiCall } from './retryUtils';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_STORAGE_KEY_PROFIT = 'greyquant_asset_suggestions_profit';
const SUGGESTION_TIMESTAMP_KEY_PROFIT = 'greyquant_suggestion_timestamp_profit';

const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const getSuggestionPrompt = (profitMode: boolean) => {
    const timeString = new Date().toUTCString();
    const modeDesc = profitMode ? "PROFIT MODE: A+ HIGH-PROBABILITY SETUPS" : "High-Potential Assets";
    return `Act as an Elite Prop Firm Scanner. SCAN for ${modeDesc} at ${timeString}.
Return exactly 3 assets in a JSON array: [{ "symbol": "string", "type": "string", "reason": "string", "volatilityWarning": boolean }]`;
};

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    try {
        const models = ['gemini-flash-lite-latest'];

        const response = await executeLiteGeminiCall<GenerateContentResponse>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            return await runWithModelFallback<GenerateContentResponse>(models, (modelId) => ai.models.generateContent({
                model: modelId,
                contents: getSuggestionPrompt(profitMode),
                config: {
                    tools: [{googleSearch: {}}],
                    temperature: profitMode ? 0.2 : 0.6,
                },
            }));
        });

        const text = response.text?.trim();
        if (!text) return [];

        let jsonString = text;
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        } else return [];

        const suggestions: AssetSuggestion[] = JSON.parse(jsonString);
        return suggestions.slice(0, 3);
    } catch (e) {
        console.error("Suggestion Error:", e);
        throw e;
    }
}

export function getStoredSuggestions(profitMode: boolean): { suggestions: AssetSuggestion[], nextUpdate: number } | null {
    try {
        const storageKey = profitMode ? SUGGESTION_STORAGE_KEY_PROFIT : SUGGESTION_STORAGE_KEY;
        const timeKey = profitMode ? SUGGESTION_TIMESTAMP_KEY_PROFIT : SUGGESTION_TIMESTAMP_KEY;
        const stored = localStorage.getItem(storageKey);
        const timestamp = localStorage.getItem(timeKey);
        if (!stored || !timestamp) return null;
        const nextUpdate = parseInt(timestamp, 10) + SUGGESTION_DURATION_MS;
        if (Date.now() > nextUpdate) return null;
        return { suggestions: JSON.parse(stored), nextUpdate };
    } catch { return null; }
}

export async function getOrRefreshSuggestions(profitMode: boolean = false): Promise<{ suggestions: AssetSuggestion[], nextUpdate: number }> {
    const stored = getStoredSuggestions(profitMode);
    if (stored) return stored;
    const suggestions = await fetchAssetSuggestions(profitMode);
    const now = Date.now();
    if (suggestions.length > 0) {
        const storageKey = profitMode ? SUGGESTION_STORAGE_KEY_PROFIT : SUGGESTION_STORAGE_KEY;
        const timeKey = profitMode ? SUGGESTION_TIMESTAMP_KEY_PROFIT : SUGGESTION_TIMESTAMP_KEY;
        localStorage.setItem(storageKey, JSON.stringify(suggestions));
        localStorage.setItem(timeKey, now.toString());
    }
    return { suggestions, nextUpdate: now + SUGGESTION_DURATION_MS };
}
