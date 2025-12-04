
import { GoogleGenAI } from "@google/genai";
import type { AssetSuggestion } from '../types';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const PROMPT = `
Act as an Elite Hedge Fund Algo with a strict risk filter.
Your task is to identify **2 to 5 "Sniper" assets** that are currently forming **A+ High Probability Setups** (80% - 90% Win Probability) for the current market session.

**CRITICAL CRITERIA:**
1.  **Win Probability:** You are NOT just suggesting active pairs. You are suggesting specific assets that, if analyzed technically right now, would present a pristine, high-confluence setup (80-90% win rate).
2.  **The "A+" Filter:** Look for:
    *   Perfect Trend Alignment (Multi-timeframe confluence).
    *   Clean Market Structure (No choppy/ranging consolidation).
    *   Clear Liquidity Sweeps or Order Block interactions.
3.  **Risk Management:** Ensure there are NO high-impact news events (Red Folder) scheduled in the next 2 hours for these specific assets. The setup must be technical, not fundamental gambling.
4.  **Session Alignment:** Ensure the asset is highly liquid in the current session (e.g., GBP pairs during London, USD during New York).

**Output Format:**
Return ONLY a valid JSON array.
[
  {
    "symbol": "string (e.g. 'EUR/USD')",
    "type": "'Major' | 'Minor' | 'Crypto' | 'Commodity'",
    "reason": "Specific technical reason for high probability (e.g. 'Clean H4 Order Block retest aligned with bullish DXY').",
    "volatilityWarning": boolean (false)
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
                temperature: 0.89, // High creativity to find unique confluence
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
