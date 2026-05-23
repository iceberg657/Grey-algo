
import { db } from '../firebase';
import { collection, query, where, getDocs, setDoc, doc, limit } from 'firebase/firestore';
import { executeLaneCall, getPilotPool, PILOT_MODELS } from './retryUtils';
import { GoogleGenAI } from '@google/genai';
import { fetchMarketData } from './twelveDataService';
import { MarketRegime } from '../utils/marketRegime';

export interface DailyRegime {
    id: string; // YYYY-MM-DD-PST
    timestamp: number;
    regime: MarketRegime;
    macroContext: string;
    assetsAnalyzed: string[];
}

export async function getDailyMarketRegime(): Promise<DailyRegime | null> {
    // 1. Get current date in PST
    const pstDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
    const id = `regime-${pstDate.replace(/\//g, '-')}`;

    try {
        const regimeRef = doc(db, 'market_regimes', id);
        const snapshot = await getDocs(query(collection(db, 'market_regimes'), where('id', '==', id), limit(1)));
        
        if (!snapshot.empty) {
            return snapshot.docs[0].data() as DailyRegime;
        }

        // 2. Not found, create it (Daily Tracking)
        console.log(`[AI Pilot] Tracking new market regime for ${pstDate}...`);
        return await trackDailyRegime(id);
    } catch (error) {
        console.error("[AI Pilot] Failed to retrieve daily regime:", error);
        return null;
    }
}

async function trackDailyRegime(id: string): Promise<DailyRegime | null> {
    const assetsToAnalyze = ['US30', 'UK100', 'EURUSD', 'BTCUSD', 'XAUUSD'];
    const marketSnapshots: any[] = [];

    // Fetch brief data for synthesis
    for (const asset of assetsToAnalyze) {
        try {
            const data = await fetchMarketData(asset, '1h');
            if (data && !data.error) {
                marketSnapshots.push({
                    symbol: asset,
                    price: data.close,
                    change: data.percent_change,
                    rsi: data.rsi,
                    trend: parseFloat(data.percent_change) > 0 ? 'BULLISH' : 'BEARISH'
                });
            }
        } catch (e) {
            console.warn(`[AI Pilot] Could not fetch data for ${asset} during regime tracking.`);
        }
    }

    if (marketSnapshots.length === 0) return null;

    const result = await executeLaneCall(async (apiKey) => {
        const genAI = new GoogleGenAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // Use Pro for macro synthesis

        const prompt = `
        System: You are the AI Pilot of GreyAlpha, an institutional trading system.
        Task: Analyze the current market snapshots and determine the "Global Market Regime" for today.
        
        Market Snapshots:
        ${JSON.stringify(marketSnapshots, null, 2)}

        Current Date (PST): ${id.replace('regime-', '')}

        Output a JSON object exactly matching this structure:
        {
            "regimeType": "RETAIL_TRAP_MONDAY" | "TREND_CONTINUATION" | "FRIDAY_REVERSAL_RISK" | "LOW_VOLATILITY_CHOP" | "YEAR_END_UNSTABLE" | "MEAN_REVERSION_RANGE",
            "description": "Short explanation of the regime bias.",
            "protocol": "Strategic instructions (e.g., 'Avoid breakouts', 'Target OTE 0.705')",
            "macroContext": "Detailed synthesis of institutional order flow across these assets.",
            "riskMultiplier": number (0.5 to 1.2)
        }
        `;

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid AI Pilot response");
        return JSON.parse(jsonMatch[0]);
    }, getPilotPool);

    const dailyRegime: DailyRegime = {
        id,
        timestamp: Date.now(),
        regime: {
            type: result.regimeType,
            description: result.description,
            suggestedAssets: assetsToAnalyze,
            riskMultiplier: result.riskMultiplier,
            protocol: result.protocol
        },
        macroContext: result.macroContext,
        assetsAnalyzed: assetsToAnalyze
    };

    try {
        await setDoc(doc(db, 'market_regimes', id), dailyRegime);
        console.log(`[AI Pilot] Successfully persisted daily regime: ${result.regimeType}`);
    } catch (e) {
        console.warn("[AI Pilot] Failed to persist daily regime to Firestore.");
    }

    return dailyRegime;
}
