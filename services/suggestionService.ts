
import { GoogleGenAI } from "@google/genai";
import type { AssetSuggestion } from '../types';

const SUGGESTION_STORAGE_KEY = 'greyquant_asset_suggestions';
const SUGGESTION_TIMESTAMP_KEY = 'greyquant_suggestion_timestamp';
const SUGGESTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const PROMPT = `
Act as an Elite Hedge Fund Algo with a balanced risk filter.
Your task is to identify **3 to 5 Tradeable Assets** that are currently forming **A+, A, or B-Grade Setups** (70% - 99% Win Probability) for the current market session.

**CRITICAL CRITERIA:**
1.  **Setup Quality Classifications:**
    *   **A+ Setup (Unicorn/High Conviction):** 90%+ Probability. The "Perfect Trade". Trend, Momentum, Structure (SMC/ICT), and Timeframe Alignment are flawless.
    *   **A-Setup (Sniper):** 80-89% Probability. Excellent structure and trend alignment.
    *   **B-Setup (Standard):** 70-79% Probability. Strong bias and clear direction, perhaps one minor confluence factor is average.
2.  **Technical Focus:** Look for:
    *   Clear Break of Structure (BOS) or Market Structure Shift (MSS).
    *   Retests of Order Blocks (OB) or Fair Value Gaps (FVG).
    *   Momentum divergence or clear trend continuation patterns.
3.  **Risk Management:** Ensure there are NO high-impact news events (Red Folder) scheduled in the next 1 hour for these specific assets.
4.  **Session Alignment:** Ensure the asset is active in the current session.

**Output Format:**
Return ONLY a valid JSON array.
[
  {
    "symbol": "string (e.g. 'EUR/USD')",
    "type": "'Major' | 'Minor' | 'Crypto' | 'Commodity'",
    "reason": "MUST START WITH LABEL. Ex: 'A+ Setup: Perfect H4/15m alignment with liquidity sweep' or 'B-Setup: Strong uptrend but nearing resistance'.",
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
