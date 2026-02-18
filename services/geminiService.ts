
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';
import { validateAndFixTPSL } from '../utils/riskRewardCalculator';
import { buildCompleteTradeSetup } from '../utils/tradeSetup';
import { MARKET_CONFIGS } from '../utils/marketConfigs';

const AI_TRADING_PLAN = (rrRatio: string, asset: string, strategies: string[], profitMode: boolean) => {
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];

  const learnedContext = strategies.length > 0 
    ? `\n🧠 **INTERNAL LEARNED STRATEGIES (PRIORITIZE):**\n${strategies.map(s => `- ${s}`).join('\n')}\n` 
    : "";

  const aggressiveness = profitMode 
    ? "AGGRESSIVE HUNTER. Prioritize Volatility, Liquidity Sweeps, and Breakouts. Accept higher risk for A+ Setups." 
    : "BALANCED STRATEGIST. Prioritize Trend Following and key S/R rejections.";

  return `
🔥 **CORE OBJECTIVE: ${aggressiveness}**

You are an elite quantitative analyst. Your goal is to find a trade setup.
${learnedContext}

**FUNDAMENTAL ASSET RULES (CRITICAL):**
- **BOOM (500/1000):** Market structure consists of small tick drops and massive spikes UP.
  - **BIAS:** Strongly favor **BUY** Limit orders at Support/Spike zones.
  - **WARNING:** DO NOT SELL (Counter-trend is extremely high risk).
- **CRASH (500/1000):** Market structure consists of small tick rises and massive spikes DOWN.
  - **BIAS:** Strongly favor **SELL** Limit orders at Resistance/Spike zones.
  - **WARNING:** DO NOT BUY (Counter-trend is extremely high risk).
- **VOLATILITY INDICES:** Pure price action, respect key levels strictly.

📊 **SCORING MATRIX (Mental Calculation - Do not output scores, use them for decision):**
1. **Market Structure (30pts):** Is price making HH/HL (Buy) or LH/LL (Sell)?
2. **Key Levels (25pts):** Is price rejecting a Support/Resistance/Order Block?
3. **Momentum/Candles (25pts):** Are there engulfing bars, wicks, or strong displacement?
4. **Context (20pts):** Trend alignment, volume, or void fills.

**THRESHOLD:**
- **Score > 60:** VALID SETUP. Issue BUY/SELL Signal.
- **Score > 80:** HIGH PROBABILITY (Sniper Entry).
- **Score < 60:** WEAK SETUP. (Only then return NEUTRAL).

**CRITICAL INSTRUCTION FOR "NEUTRAL" AVOIDANCE:**
If the current price is "in the middle of nowhere" (Neutral):
1. **DO NOT** just return Neutral.
2. **INSTEAD**, Identify the nearest valid Point of Interest (POI) above or below.
3. Issue a **LIMIT ORDER** (Buy Limit / Sell Limit) at that specific POI.
4. *Only* return NEUTRAL if the market is completely untradeable (e.g., tight 5-pip consolidation).

---

**ANALYSIS FRAMEWORK:**

**1. PRICE ACTION:**
- Identify liquidity pools (Equal Highs/Lows). Price often gravitates there.
- Mark the most recent "Break of Structure" (BOS).
- Locate "Fair Value Gaps" (FVG) or imbalances.

**2. TIMEFRAME:**
- Determine the Primary Direction based on the chart provided.

**3. FUNDAMENTAL CONTEXT (REQUIRED - USE GOOGLE SEARCH):**
- **MANDATORY:** Identify the next 3 specific high-impact economic events (e.g., CPI, NFP, Rate Decisions) relevant to ${asset} in the next 24-48 hours.
- If high impact news is within 1 hour, note high risk.

🎯 **ENTRY & EXIT CALCULATION:**

**CRITICAL: You MUST calculate TP/SL based on the Risk:Reward ratio of ${rrRatio}**

**For ${asset} specific rules:**
- Minimum SL Distance: ${marketConfig.minStopLoss} points/pips
- **Entry Logic:** 
  - If Momentum is strong -> Market Execution (Current Price).
  - If Overextended -> Limit Order (Pullback to nearest OB/FVG).
- SL MUST be beyond the invalidation point (below support for buys, above resistance for sells).

**TP Calculation Formula:**
If Risk:Reward is ${rrRatio}:
- Calculate SL distance from entry
- TP1 = Entry ± (SL_Distance × ${rrRatio.split(':')[1]} × 0.33)
- TP2 = Entry ± (SL_Distance × ${rrRatio.split(':')[1]} × 0.66)  
- TP3 = Entry ± (SL_Distance × ${rrRatio.split(':')[1]} × 1.00)

**Time Estimation (REQUIRED):**
Based on timeframe analysis (Fast Execution Focus):
- M1/M5 trades: Target ~30m
- M15 trades: Target ~1h
- H1 trades: Target ~3h

**CRITICAL OUTPUT RULE:**
Provide A SINGLE time value (e.g., "~45m", "~2h").
DO NOT provide a range (e.g., "1-2 hours").

---

**JSON OUTPUT (RAW ONLY - NO MARKDOWN):**
{
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "confidence": number (0-100),
  "asset": "${asset}",
  "timeframe": "Identified from chart (e.g., M5, M15, H1)",
  
  "priceAction": {
    "marketStructure": "Uptrend/Downtrend/Ranging/Choppy",
    "keySupport": number,
    "keyResistance": number,
    "candlestickPattern": "Pattern name (e.g., Bullish Engulfing, Pin Bar)",
    "orderBlocks": ["OB1 @ price", "OB2 @ price"],
    "fvg": ["FVG1 @ price range"],
    "liquidityZones": ["Equal highs @ price", "Equal lows @ price"]
  },
  
  "chartPatterns": {
    "identified": ["Pattern names"],
    "significance": "How they support the trade direction"
  },
  
  "technicalAnalysis": {
    "trend": "Bullish/Bearish/Neutral",
    "ema50Position": "Above/Below/At",
    "ema200Position": "Above/Below/At",
    "momentum": "Strong Bullish/Weak Bullish/Neutral/Weak Bearish/Strong Bearish",
    "keyLevels": [number, number, number]
  },
  
  "fundamentalContext": {
    "sentiment": "Bullish/Bearish/Neutral",
    "recentNews": "Brief summary if relevant",
    "upcomingEvents": "Any high-impact news in 24h?",
    "correlationNotes": "Related asset movements"
  },
  
  "entryPoints": [Optimal_Entry, Market_Entry, Conservative_Entry],
  "entryType": "Market Execution" | "Limit Order", 
  "stopLoss": number (calculated with proper distance),
  "takeProfits": [TP1, TP2, TP3] (calculated using R:R ${rrRatio}),
  
  "expectedDuration": "Single time estimate (e.g., ~45m, ~2h)",
  "timeframeRationale": "Why this duration based on chart timeframe and volatility",
  
  "reasoning": [
    "Price action and market structure analysis with specific levels",
    "Chart patterns and their implications",
    "Technical indicator confluence (EMAs, momentum, key levels)",
    "Fundamental context and sentiment analysis",
    "Entry trigger, TP/SL calculation, and time estimation logic"
  ],
  
  "checklist": [
    "HTF Bias Confirmed",
    "Price Action Setup Valid",
    "Technical Indicators Aligned",
    "Fundamental Context Supportive",
    "Risk:Reward Favorable (${rrRatio})"
  ],
  
  "invalidationScenario": "Specific price level or condition that negates the setup",
  "sentiment": { "score": number (0-100), "summary": "string" },
  "economicEvents": [
    { "name": "Event Name", "date": "YYYY-MM-DD HH:MM", "impact": "High/Medium/Low" }
  ],
  "sources": [{"uri": "Full URL", "title": "Page Title"}]
}
`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = AI_TRADING_PLAN(
          request.riskRewardRatio, 
          request.asset || "",
          request.learnedStrategies || [],
          request.profitMode || false
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
        
        if (request.isMultiDimensional && request.images.entry) {
            promptParts.push(
                { text: "ENTRY CHART (Lower Timeframe for Precision Entry)" }, 
                { inlineData: { 
                    data: request.images.entry.data, 
                    mimeType: request.images.entry.mimeType 
                }}
            );
        }

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
            expectedDuration: data.expectedDuration || "Unknown",
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
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(
    request: AnalysisRequest
): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    
    console.log('🚀 Starting Analysis with:', {
        asset: request.asset,
        riskRewardRatio: request.riskRewardRatio,
        hasUserSettings: !!request.userSettings,
        profitMode: request.profitMode
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
