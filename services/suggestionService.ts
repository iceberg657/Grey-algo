
import { GoogleGenAI } from "@google/genai";
import type { AssetSuggestion } from '../types';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes total cycle

const getSuggestionPrompt = () => {
    const now = new Date();
    const timeString = now.toUTCString();
    
    return `
Act as an Elite Prop Firm Algo Scanner.
Your task is to **ACTIVELY SCAN** global markets to identify **3 to 5 Tradeable Assets** that offer a **high probability of profit (80% - 90%)** RIGHT NOW.

**REAL-TIME CONTEXT:**
- **Current Server Time (UTC):** ${timeString}
- **Mission:** 24/5 Market Readiness. Find the active flow.

**CRITICAL CRITERIA (STRICT ENFORCEMENT):**
1.  **NO CRYPTO:** Do NOT suggest Bitcoin, Ethereum, or any cryptocurrency.
2.  **LIQUIDITY FILTER (Time-Based):**
    *   **Asian Session (UTC 22:00 - 07:00):** Prioritize **JPY, AUD, NZD** pairs. Look for retests of yesterdays highs/lows.
    *   **London Session (UTC 07:00 - 16:00):** Prioritize **EUR, GBP, CHF** pairs. Look for "Judas Swings" (sweeps of Asian range).
    *   **New York Session (UTC 12:00 - 21:00):** Prioritize **USD, CAD, Gold (XAUUSD), Indices (US30, NAS100)**. Look for reversals at London highs/lows.
    *   **Rollover Hour (UTC 21:00 - 22:00):** **DO NOT TRADE.** Spreads are too high. Return empty list if currently in this hour.
3.  **Win Probability (80% - 90%):**
    *   Scan for "A+ Setups" ONLY.
    *   **KEY ZONE REQUIREMENT:** The asset MUST be approaching or reacting to a Key Zone (Order Block, FVG, Support/Resistance). Do not suggest assets in the middle of a range.
4.  **Active Execution:** The asset must be ready to trade **NOW**. Not "watch list", but "execution ready".
5.  **No Results Protocol:** If NO assets meet the 80%-90% criteria or liquidity is too low, return an empty array \`[]\`.

**Output Format:**
Return ONLY a valid JSON array.
[
  {
    "symbol": "string (e.g. 'EUR/USD', 'US30', 'NVDA')",
    "type": "'Major' | 'Minor' | 'Commodity' | 'Index' | 'Stock'",
    "reason": "Start with probability. Ex: '88% Prob: [Session] Volume spike + H1 Order Block retest.'",
    "volatilityWarning": boolean (false)
  }
]
`;
};

export async function fetchAssetSuggestions(): Promise<AssetSuggestion[]> {
    if (!process.env.API_KEY) return [];

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        // Using gemini-2.5-flash for high-speed scanning
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: getSuggestionPrompt(),
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.7, 
            },
        });

        const text = response.text.trim();
        let jsonString = text;
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        } else {
            return [];
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
    
    localStorage.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(suggestions));
    localStorage.setItem(SUGGESTION_TIMESTAMP_KEY, now.toString());

    return {
        suggestions,
        nextUpdate: now + SUGGESTION_DURATION_MS
    };
}
