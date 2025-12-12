
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AssetSuggestion } from '../types';
import { runWithModelFallback, executeGeminiCall, PRIORITY_KEY_3 } from './retryUtils';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_STORAGE_KEY_PROFIT = 'greyquant_asset_suggestions_profit';
const SUGGESTION_TIMESTAMP_KEY_PROFIT = 'greyquant_suggestion_timestamp_profit';

const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes total cycle

const getSuggestionPrompt = (profitMode: boolean) => {
    const now = new Date();
    const timeString = now.toUTCString();
    
    if (profitMode) {
        return `
Act as an Elite Prop Firm Algo Scanner operating in **PROFIT MODE**.
Your task is to **ACTIVELY SCAN** global markets to identify **3 A+ HIGH-PROBABILITY SETUPS** RIGHT NOW.

**REAL-TIME CONTEXT:**
- **Current Server Time (UTC):** ${timeString}

**PROFIT MODE CRITERIA (STRICT):**
1.  **Trend Alignment:** Assets MUST be trending on H4/Daily. No counter-trend trades.
2.  **Liquidity:** Look for recent liquidity sweeps (Stop Hunts) followed by displacement.
3.  **Volatility:** Avoid assets with low volume. Focus on London/NY session movers.
4.  **No News:** Ensure no high-impact news is expected in the next hour.

**MANDATORY OUTPUT REQUIREMENT:**
Return exactly 3 assets. If the market is choppy, find the "safest" setups at major HTF support/resistance.

**Output Format (Strict JSON Array):**
[
  {
    "symbol": "string (e.g. 'EUR/USD', 'US30', 'XAU/USD')",
    "type": "'Major' | 'Minor' | 'Commodity' | 'Index' | 'Stock'",
    "reason": "Start with 'PROFIT MODE:'. Ex: 'PROFIT MODE: Bullish sweep of H1 lows, aligned with D1 trend.'",
    "volatilityWarning": boolean
  }
]
`;
    }

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

export async function fetchAssetSuggestions(profitMode: boolean): Promise<AssetSuggestion[]> {
    try {
        // Profit Mode uses Pro model for better reasoning; Standard uses Flash for speed.
        const models = profitMode 
            ? ['gemini-3-pro-preview', 'gemini-2.5-flash'] 
            : ['gemini-2.5-flash'];

        // Prioritize Key 3 for Suggestions
        const response = await executeGeminiCall<GenerateContentResponse>(async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            
            return await runWithModelFallback<GenerateContentResponse>(models, (modelId) => ai.models.generateContent({
                model: modelId,
                contents: getSuggestionPrompt(profitMode),
                config: {
                    tools: [{googleSearch: {}}],
                    temperature: profitMode ? 0.2 : 0.6, // Lower temperature for Profit Mode (Strictness)
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

export function getStoredSuggestions(profitMode: boolean): { suggestions: AssetSuggestion[], nextUpdate: number } | null {
    try {
        const storageKey = profitMode ? SUGGESTION_STORAGE_KEY_PROFIT : SUGGESTION_STORAGE_KEY;
        const timeKey = profitMode ? SUGGESTION_TIMESTAMP_KEY_PROFIT : SUGGESTION_TIMESTAMP_KEY;

        const stored = localStorage.getItem(storageKey);
        const timestamp = localStorage.getItem(timeKey);
        
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

export async function getOrRefreshSuggestions(profitMode: boolean = false): Promise<{ suggestions: AssetSuggestion[], nextUpdate: number }> {
    const stored = getStoredSuggestions(profitMode);
    if (stored) return stored;

    const suggestions = await fetchAssetSuggestions(profitMode);
    const now = Date.now();
    
    // Only save if we actually got results
    if (suggestions.length > 0) {
        const storageKey = profitMode ? SUGGESTION_STORAGE_KEY_PROFIT : SUGGESTION_STORAGE_KEY;
        const timeKey = profitMode ? SUGGESTION_TIMESTAMP_KEY_PROFIT : SUGGESTION_TIMESTAMP_KEY;

        localStorage.setItem(storageKey, JSON.stringify(suggestions));
        localStorage.setItem(timeKey, now.toString());
    }

    return {
        suggestions,
        nextUpdate: now + SUGGESTION_DURATION_MS
    };
}
