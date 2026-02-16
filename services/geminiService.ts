
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';
import { validateAndFixTPSL } from '../utils/riskRewardCalculator';
import { buildCompleteTradeSetup } from '../utils/tradeSetup';
import { MARKET_CONFIGS } from '../utils/marketConfigs';

const AI_TRADING_PLAN = (rrRatio: string, asset: string) => {
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];

  return `
🔥 **CORE OBJECTIVE: Professional Multi-Dimensional Trading Analysis**

You are analyzing ${asset || "the provided charts"} using a complete technical + fundamental approach.

📊 **MANDATORY ANALYSIS FRAMEWORK:**

**1. PRICE ACTION ANALYSIS (REQUIRED):**
- Identify current market structure (HH/HL for uptrend, LH/LL for downtrend)
- Locate key support and resistance levels from the chart
- Identify candlestick patterns (engulfing, pin bars, doji, hammers, shooting stars)
- Mark order blocks (OB), fair value gaps (FVG), and breaker blocks
- Identify liquidity pools (equal highs/lows that will be swept)

**2. CHART PATTERN RECOGNITION (REQUIRED):**
- Check for: Head & Shoulders, Double Top/Bottom, Triangles, Flags, Wedges
- Identify trend channels and breakout zones
- Note consolidation areas vs trending moves

**3. TECHNICAL INDICATORS (REQUIRED - Analyze from Chart):**
From the provided chart images, identify:
- Moving Averages (50 EMA, 200 EMA) - Is price above or below?
- Trend direction (uptrend, downtrend, ranging)
- Momentum signals (visible bullish/bearish momentum)
- Volume patterns (if visible on chart)
- Support/Resistance confluence zones

**4. FUNDAMENTAL CONTEXT (REQUIRED):**
Based on ${asset}:
- Current market sentiment for this asset
- Recent news impact (if any major events)
- Economic calendar awareness (high-impact news in next 24h?)
- Correlation with related assets (e.g., USD strength, gold vs USD)

**5. TIMEFRAME ANALYSIS:**
- Higher Timeframe (HTF): Overall bias and structure
- Primary Timeframe: Setup confirmation
- Entry Timeframe (M1/M5): Precise trigger point

🚨 **DECISION CRITERIA:**

**For BUY Signal (ALL must be TRUE):**
✓ HTF shows uptrend or bullish structure
✓ Price at or near support/demand zone
✓ Bullish candlestick pattern confirmed
✓ No major resistance immediately above
✓ Positive fundamental outlook
✓ No high-impact negative news scheduled

**For SELL Signal (ALL must be TRUE):**
✓ HTF shows downtrend or bearish structure
✓ Price at or near resistance/supply zone
✓ Bearish candlestick pattern confirmed
✓ No major support immediately below
✓ Negative fundamental outlook
✓ No high-impact positive news scheduled

**Return NEUTRAL if:**
- Conflicting signals between timeframes
- Price in consolidation/no clear structure
- Major news event imminent
- No clear candlestick confirmation
- Risk:Reward not favorable

🎯 **ENTRY & EXIT CALCULATION:**

**CRITICAL: You MUST calculate TP/SL based on the Risk:Reward ratio of ${rrRatio}**

**For ${asset} specific rules:**
- Minimum SL Distance: ${marketConfig.minStopLoss} points/pips
- Entry MUST be at a key level (support/resistance/OB/FVG)
- SL MUST be beyond the invalidation point (below support for buys, above resistance for sells)

**TP Calculation Formula:**
If Risk:Reward is ${rrRatio}:
- Calculate SL distance from entry
- TP1 = Entry ± (SL_Distance × ${rrRatio.split(':')[1]} × 0.33)
- TP2 = Entry ± (SL_Distance × ${rrRatio.split(':')[1]} × 0.66)  
- TP3 = Entry ± (SL_Distance × ${rrRatio.split(':')[1]} × 1.00)

**Time Estimation (REQUIRED):**
Based on timeframe analysis:
- M1 trades: ~15-45 minutes to TP
- M5 trades: ~45-120 minutes to TP
- M15 trades: ~2-6 hours to TP
- H1 trades: ~6-24 hours to TP

Provide single realistic estimate based on:
- Current volatility visible on chart
- Typical movement speed for ${asset}
- Distance to TP targets

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
  "entryType": "Limit Order",
  "stopLoss": number (calculated with proper distance),
  "takeProfits": [TP1, TP2, TP3] (calculated using R:R ${rrRatio}),
  
  "expectedDuration": "Single time estimate (e.g., ~45m, ~2h, ~8h)",
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
  "sources": []
}
`;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = AI_TRADING_PLAN(
          request.riskRewardRatio, 
          request.asset || ""
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
                    temperature: 0.1 
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
        
        // Ensure economicEvents is strictly typed or empty if malformed
        let safeEconomicEvents = [];
        if (Array.isArray(data.economicEvents)) {
            safeEconomicEvents = data.economicEvents.filter((e: any) => e.name && e.date);
        }

        const rawSignal = {
            asset: data.asset || request.asset || "Unknown",
            timeframe: data.timeframe || "N/A",
            signal: data.signal || 'NEUTRAL',
            confidence: data.confidence || 0,
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
            sources: data.sources || [],
            
            // Enhanced fields passed through for logging/storage, 
            // even if not displayed by current UI
            priceAction: data.priceAction || {},
            chartPatterns: data.chartPatterns || {},
            technicalAnalysis: data.technicalAnalysis || {},
            fundamentalContext: data.fundamentalContext || {},
            timeframeRationale: data.timeframeRationale || ""
        };
        
        // **CRITICAL: Validate and recalculate TP/SL if AI made mistakes**
        return validateAndFixTPSL(rawSignal, request.riskRewardRatio);
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(
    request: AnalysisRequest
): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    
    console.log('🚀 Starting Analysis with:', {
        asset: request.asset,
        riskRewardRatio: request.riskRewardRatio,
        hasUserSettings: !!request.userSettings
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
    // Use provided settings OR default to a standard funded account model
    // This prevents "CALC" errors when userSettings are missing from the request
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
    
    console.log('✅ Complete Trade Setup:', {
        asset: completeSetup.asset,
        signal: completeSetup.signal,
        confidence: completeSetup.confidence,
        accountSize: settings.accountSize || settings.accountBalance,
        riskPercent: settings.riskPerTrade,
        calculatedRR: completeSetup.calculatedRR,
        lotSize: completeSetup.lotSize,
        formattedLotSize: completeSetup.formattedLotSize,
        isValid: completeSetup.isValid
    });
    
    return completeSetup;
}
