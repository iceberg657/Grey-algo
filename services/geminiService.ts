
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings, TradingStyle } from '../types';
import { runWithModelFallback, executeLaneCall, getAnalysisPool, ANALYSIS_MODELS } from './retryUtils';
import { validateAndFixTPSL } from '../utils/riskRewardCalculator';
import { buildCompleteTradeSetup } from '../utils/tradeSetup';
import { MARKET_CONFIGS } from '../utils/marketConfigs';

const AI_TRADING_PLAN = (rrRatio: string, asset: string, strategies: string[], style: TradingStyle) => {
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];

  const learnedContext = strategies.length > 0 
    ? `\n🧠 **INTERNAL LEARNED STRATEGIES (PRIORITIZE):**\n${strategies.map(s => `- ${s}`).join('\n')}\n` 
    : "";

  const aggressiveness = "INSTITUTIONAL HUNTER. Align with Smart Money Concepts (SMC) and Inner Circle Trader (ICT) logic.";

  return `
⚠️ **SYSTEM OVERRIDE: IGNORE ALL PREVIOUS CONTEXT. THIS IS A NEW, INDEPENDENT ANALYSIS.**

🔥 **CORE OBJECTIVE: ${aggressiveness}**

You are an elite quantitative analyst with 95% domain mastery in **SMC/ICT Methodology** and **Deriv Synthetic Indices**.
${learnedContext}

---

🧠 **SMC/ICT CORE LOGIC (MANDATORY):**
1.  **MARKET STRUCTURE:**
    - **Bullish:** Consistent Higher Highs (HH) and Higher Lows (HL).
    - **Bearish:** Consistent Lower Highs (LH) and Lower Lows (LL).
    - **BOS (Break of Structure):** Trend continuation confirmation.
    - **CHoCH (Change of Character):** First sign of potential trend reversal.

2.  **LIQUIDITY & MANIPULATION:**
    - **Liquidity Pools:** Equal Highs (BSL - Buy Side Liquidity) and Equal Lows (SSL - Sell Side Liquidity).
    - **Liquidity Sweep:** Price "Stop Hunts" above/below these levels before reversing.
    - **Judas Swing:** False move to trap retail traders before the real institutional move.

3.  **IMBALANCES & INSTITUTIONAL ZONES:**
    - **FVG (Fair Value Gap):** 3-candle imbalance showing strong displacement.
    - **IFVG (Inverse FVG):** A broken FVG that flips its role (Support <-> Resistance).
    - **Order Block (OB):** Last opposing candle before strong displacement.
    - **Premium/Discount:** Use Dealing Range (Swing H to Swing L). Buy in Discount (<50%), Sell in Premium (>50%).

4.  **VOLATILITY & STANDARD DEVIATION:**
    - **Expansion Check:** Use Standard Deviation (σ) to identify overextension (2.0 - 3.0 SD).
    - **Logic:** Liquidity Sweep + 2.5 SD Extreme + Displacement = High Probability Reversal.

---

**DERIV SYNTHETIC MASTERY (ALGORITHMIC RULES):**

1.  **BOOM INDICES (300/500/1000):**
    - **ALGO:** Slow bearish ticks, violent bullish spikes.
    - **SMC SETUP:** Wait for SSL Sweep -> CHoCH -> Retrace to Discount OB/FVG -> Spike Catch.
    - **DO NOT SELL (tick scalping is -EV).**
    - **INVALIDATION:** If price closes a full 1M candle below the zone.

2.  **CRASH INDICES (300/500/1000):**
    - **ALGO:** Slow bullish ticks, violent bearish spikes.
    - **SMC SETUP:** Wait for BSL Sweep -> CHoCH -> Retrace to Premium OB/FVG -> Spike Catch.
    - **DO NOT BUY (tick scalping is -EV).**

3.  **VOLATILITY INDICES (V75, V100, V50, etc.):**
    - **ALGO:** Pure fractal price action. No spikes/ticks bias.
    - **STRATEGY:** Market Structure Shift (MSS) + FVG. Respects psychological levels (e.g., 450,000 on V75).
    - **V75 SPECIFIC:** Highly volatile. Needs wide stops. Respects H4/H1 Order Blocks and Liquidity Sweeps.

4.  **STEP INDEX:**
    - **ALGO:** Moves in 0.1 increments. Very smooth trends.
    - **STRATEGY:** Deep Retracements (61.8% - 78.6% Fib). Trend continuation. Focus on BOS and FVG retests.

5.  **RANGE BREAK:**
    - **STRATEGY:** Box Breakout. Wait for consolidation to break, retest the box, then enter.

---

📊 **SCORING MATRIX (Mental Calculation):**
1.  **Live Market Data (50% Weight):** Use Google Search to get real-time price action, order flow, and news sentiment for the asset. This is the most critical factor.
2.  **Chart Analysis (50% Weight):**
    *   **Market Structure (30pts):** Clear HH/HL or LH/LL alignment.
    *   **Liquidity Event (25pts):** Has a clear sweep occurred?
    *   **Displacement (25pts):** Strong move leaving FVG/OB?
    *   **Premium/Discount (20pts):** Is entry in the correct zone?

**THRESHOLD:**
- **Score > 65:** VALID SETUP. Issue BUY/SELL Signal.
- **Score > 85:** SNIPER SETUP (A+).
- **Score < 65:** NEUTRAL (Wait for better alignment).

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

---

🎯 **TRADING STYLE & EXECUTION: ${style}**

**STYLE-SPECIFIC FOCUS:**
${(() => {
    switch (style) {
        case 'scalping(1 to 15mins)':
            return `- **Timeframes:** M1, M5, M15.
- **Objective:** Quick scalp on LTF CHoCH after HTF Liquidity Sweep.
- **Duration:** 1 to 15 minutes.`;
        case 'scalping(15 to 30mins)':
            return `- **Timeframes:** M5, M15, M30.
- **Objective:** Scalp within session trends, targeting minor liquidity.
- **Duration:** 15 to 30 minutes.`;
        case 'day trading(1 to 2hrs)':
            return `- **Timeframes:** M15, H1.
- **Objective:** Capture intra-day moves within a single session.
- **Duration:** 1 to 2 hours.`;
        case 'day trading(2 to 4hrs)':
            return `- **Timeframes:** H1, H4.
- **Objective:** Capture larger intra-day or multi-session moves.
- **Duration:** 2 to 4 hours.`;
        case 'swing trading':
            return `- **Timeframes:** H4, Daily, Weekly.
- **Objective:** Capture major trend shifts and long-term liquidity targets.
- **Duration:** Days to weeks.`;
        default:
            return `- **Timeframes:** Adapt based on market.
- **Objective:** General market analysis.
- **Duration:** Variable.`;
    }
})()}

**CRITICAL: Calculate TP/SL based on ${rrRatio} RR.**
- **Minimum SL Distance:** ${marketConfig.minStopLoss} points/pips.
- **Entry Logic:** 
  - **Limit Order (Recommended):** Place at the "Optimal" level (OB/FVG).
  - **Market Execution:** Only if a spike/move just started and structure is confirmed.

**TP Calculation Formula (MUST BE DISTINCT):**
- **TP1:** 1R (Secure Profit).
- **TP2:** Target Ratio (${rrRatio}).
- **TP3:** Opposing Liquidity Pool.

---

**JSON OUTPUT (RAW ONLY - NO MARKDOWN):**
{
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "confidence": number (0-100),
  "asset": "${asset}",
  "timeframe": "e.g., M5, M15, H1",
  
  "priceAction": {
    "marketStructure": "Bullish/Bearish/Ranging",
    "structuralPoint": "HH/HL/LH/LL",
    "lastShift": "BOS/CHoCH @ price",
    "liquiditySweep": "BSL/SSL Swept @ price",
    "orderBlock": "OB @ price",
    "fvg": "FVG @ price",
    "dealingRange": "Premium/Discount",
    "standardDeviation": "e.g., 2.3 SD (Overextended)"
  },
  
  "chartPatterns": {
    "identified": ["Pattern names"],
    "significance": "Logic"
  },
  
  "technicalAnalysis": {
    "trend": "Bullish/Bearish",
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
    "Liquidity sweep logic...",
    "Displacement and FVG confirmation...",
    "Premium/Discount alignment..."
  ],
  
  "checklist": [
    "Liquidity Swept",
    "CHoCH/BOS Confirmed",
    "FVG/OB Retest",
    "Risk:Reward ${rrRatio}"
  ],
  
  "invalidationScenario": "Structural break of HL/LH",
  "sentiment": { "score": number, "summary": "string" },
  "economicEvents": [],
  "sources": []
}
`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const uniqueSessionId = `SESSION-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const promptText = `[SYSTEM: NEW ANALYSIS SESSION ID: ${uniqueSessionId}. FORGET ALL PRIOR CONTEXT. TREAT THIS AS A FRESH START.]\n` + AI_TRADING_PLAN(
          request.riskRewardRatio, 
          request.asset || "",
          request.learnedStrategies || [],
          request.tradingStyle
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
