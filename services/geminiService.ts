
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, getAnalysisPool, ANALYSIS_MODELS } from './retryUtils';
import { validateAndFixTPSL } from '../utils/riskRewardCalculator';
import { buildCompleteTradeSetup } from '../utils/tradeSetup';
import { MARKET_CONFIGS } from '../utils/marketConfigs';

const AI_TRADING_PLAN = (rrRatio: string, asset: string, strategies: string[]) => {
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];

  const learnedContext = strategies.length > 0 
    ? `\n🧠 **INTERNAL LEARNED STRATEGIES (PRIORITIZE):**\n${strategies.map(s => `- ${s}`).join('\n')}\n` 
    : "";

  const aggressiveness = "AGGRESSIVE HUNTER. Prioritize Volatility, Liquidity Sweeps, and Breakouts. Accept higher risk for A+ Setups.";

  return `
🔥 **CORE OBJECTIVE: ${aggressiveness}**

You are an elite quantitative analyst with 85% domain mastery in **Deriv Synthetic Indices**.
${learnedContext}

**DERIV SYNTHETIC MASTERY (CRITICAL RULES):**

1.  **BOOM INDICES (300/500/1000):**
    *   **ALGORITHM:** Price ticks down slowly and SPIKES up violently.
    *   **STRATEGY:** Spike Catching. DO NOT SELL (tick scalping is -EV).
    *   **SETUP:** Buy Limit at previous spike origin, Order Block, or 2.0 SD Extension below mean.
    *   **INVALIDATION:** If price closes a full 1M candle below the zone.

2.  **CRASH INDICES (300/500/1000):**
    *   **ALGORITHM:** Price ticks up slowly and SPIKES down violently.
    *   **STRATEGY:** Spike Catching. DO NOT BUY (tick scalping is -EV).
    *   **SETUP:** Sell Limit at previous resistance/spike base, or 2.0 SD Extension above mean.

3.  **VOLATILITY INDICES (V75, V100, V50, etc.):**
    *   **ALGORITHM:** Pure fractal price action. No spikes/ticks bias.
    *   **STRATEGY:** Market Structure Shift (MSS) + FVG. Respects psychological levels (e.g., 450,000 on V75).
    *   **V75 SPECIFIC:** Highly volatile. Needs wide stops. Respects H4 Order Blocks.

4.  **STEP INDEX:**
    *   **ALGORITHM:** Moves in 0.1 increments. Very smooth trends.
    *   **STRATEGY:** Deep Retracements (61.8% - 78.6% Fib). Trend continuation.

5.  **RANGE BREAK:**
    *   **STRATEGY:** Box Breakout. Wait for consolidation to break, retest the box, then enter.

---

📊 **SCORING MATRIX (Mental Calculation):**
1.  **Live Market Data (50% Weight):** Use Google Search to get real-time price action, order flow, and news sentiment for the asset. This is the most critical factor.
2.  **Chart Analysis (50% Weight):**
    *   **Market Structure (30pts):** Is price alignment valid on the provided charts?
    *   **Key Levels (25pts):** Order Blocks, Breakers, FVGs identified on the charts.
    *   **Momentum (20pts):** Volume exhaustion, candlestick patterns on the charts.

**THRESHOLD:**
- **Score > 60:** VALID SETUP. Issue BUY/SELL Signal.
- **Score > 80:** HIGH PROBABILITY (Sniper Entry).
- **Score < 60:** WEAK SETUP. (Only then return NEUTRAL).

**NEUTRAL AVOIDANCE:**
If price is ranging or unclear:
1.  **Zoom Out:** Find the nearest Major HTF POI.
2.  **Order:** Set a LIMIT ORDER at that POI.
3.  **Do NOT** return Neutral unless the chart is literally unreadable.

---

**ANALYSIS FRAMEWORK:**

**1. PRICE ACTION & STANDARD DEVIATION:**
- **Manipulation Check:** Look for "Judas Swings" (False moves).
- **Standard Deviation (SD):**
    - **Boom/Crash:** Use SD to find oversold/overbought tick conditions before a spike.
    - **Volatility:** Use SD for Mean Reversion trades.

**2. TIMEFRAME:**
- Determine Primary Direction. Boom/Crash Analysis MUST prioritize the Spike direction (Buy for Boom, Sell for Crash).

**3. FUNDAMENTAL CONTEXT:**
- **Synthetics:** Pure technicals. Check "News" field for "Simulated Volatility Events" or just state "Algorithm Normal".
- **Forex/Crypto:** Check Real Economic Events.

🎯 **ENTRY & EXIT CALCULATION:**

**CRITICAL: You MUST calculate TP/SL based on the Risk:Reward ratio of ${rrRatio}**

**For ${asset} specific rules:**
- Minimum SL Distance: ${marketConfig.minStopLoss} points/pips.
- **Entry Logic:** 
  - **Limit Order (Recommended):** Place at the "Optimal" level (OB/FVG).
  - **Market Execution:** Only if a spike/move just started and structure is confirmed.

**TP Calculation Formula (MUST BE DISTINCT):**
- **TP1:** 1R (Secure Profit).
- **TP2:** Target Ratio (e.g. 3R).
- **TP3:** Extended Run (e.g. 5R) or next Liquidity Pool.

**Time Estimation:**
- Synthetics move fast.
- Scalping (10 to 15min): Trades last minutes.
- Scalping (15 to 30min): Trades last up to an hour.
- Day Trading (1 to 2hrs): Trades last a few hours.
- Day Trading (2 to 4hrs): Trades can last for a full session.

---

**JSON OUTPUT (RAW ONLY - NO MARKDOWN):**
{
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "confidence": number (0-100),
  "asset": "${asset}",
  "timeframe": "Identified from chart (e.g., M5, M15, H1)",
  
  "priceAction": {
    "marketStructure": "Uptrend/Downtrend/Ranging",
    "keySupport": number,
    "keyResistance": number,
    "candlestickPattern": "Name",
    "orderBlocks": ["OB @ price"],
    "fvg": ["FVG @ price"],
    "liquidityZones": ["Highs/Lows"],
    "standardDeviationCheck": "e.g., Price is -2.5 SD (Oversold)"
  },
  
  "chartPatterns": {
    "identified": ["Pattern names"],
    "significance": "Logic"
  },
  
  "technicalAnalysis": {
    "trend": "Bullish/Bearish",
    "ema50Position": "Above/Below",
    "ema200Position": "Above/Below",
    "momentum": "Strong/Weak",
    "keyLevels": [number, number, number]
  },
  
  "fundamentalContext": {
    "sentiment": "Bullish/Bearish",
    "recentNews": "Algo Status or News",
    "upcomingEvents": "N/A for Synthetics",
    "correlationNotes": "N/A"
  },
  
  "entryPoints": [Aggressive_Entry, Optimal_SD_Entry, Safe_Deep_Entry],
  "entryType": "Limit Order", 
  "stopLoss": number,
  "takeProfits": [TP1, TP2, TP3],
  
  "timeframeRationale": "Why this duration",
  
  "reasoning": [
    "Structure analysis...",
    "Standard Deviation logic...",
    "Why entry/exit was chosen..."
  ],
  
  "checklist": [
    "Structure Confirmed",
    "Spike Zone Validated (if Boom/Crash)",
    "Standard Deviation Extreme",
    "Risk:Reward ${rrRatio}"
  ],
  
  "invalidationScenario": "Level breakdown",
  "sentiment": { "score": number, "summary": "string" },
  "economicEvents": [],
  "sources": []
}
`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = AI_TRADING_PLAN(
          request.riskRewardRatio, 
          request.asset || "",
          request.learnedStrategies || []
        );
        
        const promptParts: any[] = [{ text: promptText }];
        
        if (request.isMultiDimensional && request.images.higher) {
            promptParts.push(
                { text: "HTF CHART (Higher Timeframe for Bias)" }, 
                { inlineData: { 
                    data: request.images.higher.data, 
                    mimeType: request.images.higher.mimeType 
                }}
            );
        }
        
        promptParts.push(
            { text: "PRIMARY CHART (Main Analysis Timeframe)" }, 
            { inlineData: { 
                data: request.images.primary.data, 
                mimeType: request.images.primary.mimeType 
            }}
        );
        


        const response = await runWithModelFallback<GenerateContentResponse>(
            ANALYSIS_MODELS, 
            (modelId) => ai.models.generateContent({
                model: modelId,
                contents: [{ parts: promptParts }],
                config: { 
                    tools: [{googleSearch: {}}], 
                    temperature: 0.2 
                },
            })
        );

        let text = response.text || '';
        text = text.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start === -1 || end === -1) {
            throw new Error("Neural alignment failure - Invalid JSON response");
        }
        
        const data = JSON.parse(text.substring(start, end + 1));

        // Extract Grounding Metadata (Real Search Results)
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const groundingSources = groundingChunks
            .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
            .map((chunk: any) => ({
                uri: chunk.web.uri,
                title: chunk.web.title
            }));
        
        const combinedSources = [...(data.sources || []), ...groundingSources];
        const uniqueSources = Array.from(new Map(combinedSources.map((s: any) => [s.uri, s])).values());

        // Sanitization
        if (data.confidence && data.confidence > 0 && data.confidence <= 1) {
            data.confidence = Math.round(data.confidence * 100);
        } else if (data.confidence) {
            data.confidence = Math.round(data.confidence);
        }
        
        if (data.sentiment?.score && data.sentiment.score > 0 && data.sentiment.score <= 1) {
            data.sentiment.score = Math.round(data.sentiment.score * 100);
        } else if (data.sentiment?.score) {
            data.sentiment.score = Math.round(data.sentiment.score);
        }
        
        let safeEconomicEvents = [];
        if (Array.isArray(data.economicEvents)) {
            safeEconomicEvents = data.economicEvents.filter((e: any) => e.name && e.date);
        }

        // Logic to boost confidence artificially if it's too low but signal is valid
        let finalConfidence = data.confidence || 0;
        if (data.signal !== 'NEUTRAL' && finalConfidence < 70) {
             finalConfidence = Math.min(85, finalConfidence + 15);
        }

        const rawSignal = {
            asset: data.asset || request.asset || "Unknown",
            timeframe: data.timeframe || "N/A",
            signal: data.signal || 'NEUTRAL',
            confidence: finalConfidence,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Limit Order",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            reasoning: data.reasoning || [],
            checklist: data.checklist || [],
            invalidationScenario: data.invalidationScenario || "Structure break",
            sentiment: data.sentiment || { score: 50, summary: "Neutral" },
            economicEvents: safeEconomicEvents,
            sources: uniqueSources,
            
            priceAction: data.priceAction || {},
            chartPatterns: data.chartPatterns || {},
            technicalAnalysis: data.technicalAnalysis || {},
            fundamentalContext: data.fundamentalContext || {},
            timeframeRationale: data.timeframeRationale || ""
        };
        
        return validateAndFixTPSL(rawSignal, request.riskRewardRatio);
    }, getAnalysisPool());
}

export async function generateTradingSignal(
    request: AnalysisRequest
): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    
    console.log('🚀 Starting Analysis with:', {
        asset: request.asset,
        riskRewardRatio: request.riskRewardRatio,
        hasUserSettings: !!request.userSettings,

    });
    
    // 1. Get comprehensive AI analysis
    const rawSignal = await callGeminiDirectly(request);
    
    console.log('📊 Raw AI Signal:', {
        signal: rawSignal.signal,
        confidence: rawSignal.confidence,
        entry: rawSignal.entryPoints[1],
        sl: rawSignal.stopLoss,
        tps: rawSignal.takeProfits
    });

    // 2. Apply position sizing and risk management
    const settings: UserSettings = request.userSettings || {
        accountType: 'Funded',
        accountBalance: 100000,
        riskPerTrade: 1.0,
        targetPercentage: 10,
        dailyDrawdown: 5,
        maxDrawdown: 10,
        timeLimit: 30,
        riskRewardRatio: request.riskRewardRatio
    };

    const completeSetup = buildCompleteTradeSetup(
        rawSignal,
        settings,
        0, // Track this in your app state
        0  // Track this in your app state
    );
    
    return completeSetup;
}
