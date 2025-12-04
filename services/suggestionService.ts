
import { GoogleGenAI } from "@google/genai";
import type { AssetSuggestion } from '../types';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const PROMPT = `
Act as a Human Market Analyst.
Your task is to identify **2 to 5 high-probability assets** to trade within the current market session.

**Instructions:**
1.  **Analyze Time:** Check the current UTC time. Determine if it is Asian, London, or New York session.
2.  **Filter Assets:** 
    *   Select Major or Minor Forex pairs (e.g., EUR/USD, GBP/JPY) or key Commodities (Gold) that are liquid *right now*.
    *   **CRITICAL:** Use Google Search to check the economic calendar for the next 4 hours. **EXCLUDE** any pair that has "High Impact" news pending (e.g., NFP, CPI, Rate Decisions) to avoid gambling. If news is present, select a safe-haven or non-affected pair.
3.  **Selection Criteria:** Choose pairs showing clear technical structure or session momentum.
4.  **Limit:** Provide exactly 2, 3, 4, or 5 suggestions. No more.

**Output Format:**
Return ONLY a valid JSON array.
[
  {
    "symbol": "string (e.g. 'EUR/USD')",
    "type": "'Major' | 'Minor' | 'Crypto' | 'Commodity'",
    "reason": "Short, human-like reason (e.g. 'London open breakout expected, news clear').",
    "volatilityWarning": boolean (true if moderate news exists, false if clear)
  }
]
`;

export async function fetchAssetSuggestions(): Promise<AssetSuggestion[]> {
    if (!process.env.API_KEY) return [];

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: PROMPT,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.89, // Creative selection
            },
        });

        const text = response.text.trim();
        let jsonString = text;
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        }

        const suggestions: AssetSuggestion[] = JSON.parse(jsonString);
        return suggestions;

    } catch (e) {
        console.error("Failed to fetch asset suggestions", e);
        return [];
    }
}

export function getStoredSuggestions(): { suggestions: AssetSuggestion[], nextUpdate: number } | null {
    try {
        const stored = localStorage.getItem(SUGGESTION_STORAGE_KEY);
        const timestamp = localStorage.getItem(SUGGESTION_TIMESTAMP_KEY);
        
        if (!stored || !timestamp) return null;

        const nextUpdate = parseInt(timestamp, 10) + SUGGESTION_DURATION_MS;
        
        if (Date.now() > nextUpdate) return null; // Expired

        return {
            suggestions: JSON.parse(stored),
            nextUpdate
        };
    } catch {
        return null;
    }
}

export async function getOrRefreshSuggestions(): Promise<{ suggestions: AssetSuggestion[], nextUpdate: number }> {
    const stored = getStoredSuggestions();
    if (stored) return stored;

    const suggestions = await fetchAssetSuggestions();
    const now = Date.now();
    
    if (suggestions.length > 0) {
        localStorage.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(suggestions));
        localStorage.setItem(SUGGESTION_TIMESTAMP_KEY, now.toString());
    }

    return {
        suggestions,
        nextUpdate: now + SUGGESTION_DURATION_MS
    };
}
