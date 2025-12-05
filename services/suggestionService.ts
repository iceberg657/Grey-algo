
import { GoogleGenAI } from "@google/genai";
import type { AssetSuggestion } from '../types';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes total cycle

const SUGGESTION_PROMPT = `
Act as an Elite Hedge Fund Algo.
Your task is to **ACTIVELY SCAN** global markets (Forex, Commodities, Indices, Stocks) to identify **3 to 5 Tradeable Assets** that offer a **high probability of profit (80% - 90%)** within the current market session.

**CRITICAL CRITERIA:**
1.  **EXCLUDE CRYPTO:** Do NOT suggest Bitcoin, Ethereum, or any cryptocurrency. Focus ONLY on Forex (Majors/Minors), Commodities (Gold, Oil, Silver), Indices (US30, NAS100, SPX500, GER40), and Major Stocks (NVDA, TSLA, AAPL, etc).
2.  **Win Probability (80% - 90%):** Scan for assets where the technical edge is distinct and immediate.
    *   Do not list "watch and wait" setups. List "execution ready" setups.
    *   Look for strong alignment of Trend, Structure (SMC/ICT), and Momentum.
3.  **Active Execution:** The asset must be ready to trade NOW (e.g., retesting a level, breaking out, or rejecting a supply/demand zone).
4.  **Risk Management:** Verify no impending high-impact news (Red Folder) in the next hour for the specific asset.
5.  **No Results Protocol:** If ABSOLUTELY NO assets meet the 80%-90% criteria, return an empty array \`[]\`. Do not force a low-quality setup.

**Output Format:**
Return ONLY a valid JSON array.
[
  {
    "symbol": "string (e.g. 'EUR/USD', 'XAU/USD', 'US30', 'NVDA')",
    "type": "'Major' | 'Minor' | 'Commodity' | 'Index' | 'Stock'",
    "reason": "Start with probability label. Ex: '88% Prob: Clean retest of H4 order block' or '82% Prob: Bullish breakout with volume confirmation'.",
    "volatilityWarning": boolean (false)
  }
]
`;

export async function fetchAssetSuggestions(): Promise<AssetSuggestion[]> {
    if (!process.env.API_KEY) return [];

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        // Using gemini-2.5-flash for high-speed scanning
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: SUGGESTION_PROMPT,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.85, // Slightly high to ensure it finds creative technical matches
            },
        });

        const text = response.text.trim();
        let jsonString = text;
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        } else {
            // If no JSON array found, assume no results
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
    
    // Store even if empty, so we don't spam the API. Empty means "No setup found".
    localStorage.setItem(SUGGESTION_STORAGE_KEY, JSON.stringify(suggestions));
    localStorage.setItem(SUGGESTION_TIMESTAMP_KEY, now.toString());

    return {
        suggestions,
        nextUpdate: now + SUGGESTION_DURATION_MS
    };
}
