
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { runWithModelFallback, executeGeminiCall, PRIORITY_KEY_3 } from './retryUtils';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes total cycle

// Upgraded Model: Standard Flash for better instruction following and reasoning
const MODELS = ['gemini-2.5-flash'];

const getSuggestionPrompt = () => {
    const now = new Date();
    const timeString = now.toUTCString();
    
    return `
Act as an Elite Prop Firm Algo Scanner.
Your task is to **ACTIVELY SCAN** global markets to identify **3 High-Potential Assets** RIGHT NOW.

**REAL-TIME CONTEXT:**
- **Current Server Time (UTC):** ${timeString}

**MANDATORY OUTPUT REQUIREMENT:**
You **MUST** return exactly 3 assets. Do NOT return an empty list. Even if the market is choppy, identify the 3 best "Watchlist" candidates.

**Scanning Logic:**
1.  **Session Focus:** Prioritize assets active in the current session (Asian: JPY/AUD, London: GBP/EUR, NY: USD/CAD).
2.  **Technical Pattern:** Look for Liquidity Sweeps, FVG fills, or Breakouts.
3.  **Diversity:** Mix Majors, Indices, and Commodities if possible. Avoid Crypto unless major volatility is detected.

**Output Format (Strict JSON Array):**
[
  {
    "symbol": "string (e.g. 'EUR/USD', 'US30', 'XAU/USD')",
    "type": "'Major' | 'Minor' | 'Commodity' | 'Index' | 'Stock'",
    "reason": "Start with signal. Ex: 'Bullish: H1 Order Block retest with volume.'",
    "volatilityWarning": boolean (true if news is pending or spread is high)
  }
]
`;
};

export async function fetchAssetSuggestions(): Promise<AssetSuggestion[]> {
    try {
        // Prioritize Key 3 for Suggestions
        const response = await executeGeminiCall<GenerateContentResponse>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            return await runWithModelFallback<GenerateContentResponse>(MODELS, (modelId) => ai.models.generateContent({
                model: modelId,
                contents: getSuggestionPrompt(),
                config: {
                    tools: [{googleSearch: {}}],
                    temperature: 0.6, // Slightly creative to find setups
                },
            }));
        }, PRIORITY_KEY_3);

        const text = response.text?.trim();
        if (!text) return [];

        let jsonString = text;
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        } else {
            console.warn("Invalid JSON format from Suggestions AI");
            return [];
        }

        const suggestions: AssetSuggestion[] = JSON.parse(jsonString);
        // Ensure we limit to 3 just in case
        return suggestions.slice(0, 5);

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
    
    // Only save if we actually got results
    if (suggestions.length > 0) {
        localStorage.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(suggestions));
        localStorage.setItem(SUGGESTION_TIMESTAMP_KEY, now.toString());
    }

    return {
        suggestions,
        nextUpdate: now + SUGGESTION_DURATION_MS
    };
}
