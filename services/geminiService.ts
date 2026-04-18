
import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings, TradingStyle } from '../types';
import { runWithModelFallback, executeLaneCall, getAnalysisPool, ANALYSIS_MODELS } from './retryUtils';
import { validateAndFixTPSL } from '../utils/riskRewardCalculator';
import { buildCompleteTradeSetup } from '../utils/tradeSetup';
import { MARKET_CONFIGS } from '../utils/marketConfigs';
import { calculateLotSize } from '../utils/lotSizeCalculator';
import { logTrade } from './tradeLogger';
import { auth } from '../firebase';
import { getLearnedStrategies, getNeuralProtocol } from './learningService';

const AI_TRADING_PLAN = (rrRatio: string, asset: string, strategies: string[], style: TradingStyle, userSettings?: UserSettings, twelveDataQuote?: any, protocol: string | null = null) => {
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];

  const learnedContext = strategies.length > 0 
    ? `\n🧠 **PAST LESSONS:**\n${strategies.map(s => `- ${s}`).join('\n')}\n` 
    : "";

  const twelveDataContext = twelveDataQuote && !twelveDataQuote.error ? `
📡 **MARKET INDICATORS (Twelve Data):**
- Symbol: ${twelveDataQuote.symbol}
- Price: ${twelveDataQuote.close}
- RSI: ${twelveDataQuote.rsi}
- ATR: ${twelveDataQuote.atr}
- ADX: ${twelveDataQuote.adx}
` : "";

  const accountInfo = userSettings ? `
👤 **ACCOUNT PROFILE:**
- Balance: $${userSettings.accountBalance || '10,000'}
- Risk: ${userSettings.riskPerTrade || 1}%
` : "";

  const zScoreContext = twelveDataQuote?.close ? `
- PRICE CONTEXT: ${twelveDataQuote.close} (Twelve Data)` : "";

  return `[SYSTEM: SMC NEURAL SNIPER ENGINE ACTIVATED]
[TIMESTAMP: ${new Date().toISOString()}]

You are the GREY-ALPHA Neural Sniper. You execute based on **SMART MONEY CONCEPTS (SMC)** and Institutional Order Flow. 
Your objective is to identify high-probability entries while preserving capital.

${learnedContext}
${twelveDataContext}
${accountInfo}

**TRADING METHODOLOGY (SMC):**
1. **STRUCTURE:** Identify BOS (Break of Structure) and CHoCH (Change of Character).
2. **POI:** Use H4/H1 to find unmitigated Order Blocks (OB) and Fair Value Gaps (FVG).
3. **LIQUIDITY:** Enter only AFTER a sweep of Liquidity (Equal Highs/Lows, Trendline).
4. **INDUCEMENT:** Avoid entering too early. Identify where retail stop losses are being hunted.

**TRADING STYLE: ${style}**

**MANDATORY RISK RULES:**
1. **LOT SIZE:** Calculate a precise \`formattedLotSize\` (e.g. "0.10") for the account balance.
2. **POSITIONS:** Split into \`recommendedPositions\` (e.g. 2). Provide \`positionLotSize\` (e.g. "0.05 per pos").
3. **STRICT RR:** TP1 must be exactly 1:3 RR. TP2 must be exactly 1:4 RR. 
4. **STOP LOSS:** Must be tight and logical to protect capital.

**CRITICAL DATA:**
- ASSET: ${asset}
- PRICE: ${twelveDataQuote?.close || 'See Image'}${zScoreContext}

**OUTPUT FORMAT:**
Return ONLY a JSON object matching this structure:
{
  "signal": "BUY" | "SELL" | "NEUTRAL",
  "confidence": number (0-99),
  "asset": "${asset}",
  "timeframe": "string",
  "entryRange": {"min": number, "max": number},
  "entryType": "Market Execution" | "Limit",
  "expirationTime": "string or null",
  "stopLoss": number,
  "takeProfits": [number, number],
  "formattedLotSize": "string",
  "recommendedPositions": number,
  "positionLotSize": "string",
  "reasoning": [
    "SMC context (OB/FVG)",
    "Liquidity analysis",
    "Risk management logic"
  ],
  "checklist": ["Order Block", "FVG", "Liquidity Sweep", "MSS"],
  "triggerConditions": {
    "breakoutLevel": number,
    "retestLogic": "string"
  }
}`;
};

async function runWithRetry<T>(fn: (modelId: string) => Promise<T>, models: string[]): Promise<T> {
  let lastError: any;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (error) {
      console.error(`Model ${model} failed:`, error);
      lastError = error;
      // Continue to next model
    }
  }
  throw lastError;
}

export async function generateSniperLiveSignal(
  assetName: string,
  livePrice: number,
  query: string,
  style: TradingStyle,
  userSettings?: UserSettings,
  twelveDataQuote?: any,
  zScore?: number
): Promise<SignalData> {
  const strategies = await getLearnedStrategies() || [];
  const protocol = await getNeuralProtocol() || null;
  const rrRatio = "4.0"; // Focus on 1:4 max target as primary anchor

  const prompt = AI_TRADING_PLAN(rrRatio, assetName, strategies, style, userSettings, twelveDataQuote, protocol);

  return await executeLaneCall<SignalData>(async (apiKey) => {
    const response = await runWithModelFallback<GenerateContentResponse>(
      ANALYSIS_MODELS,
      async (modelId) => {
        const config: any = { 
          tools: [{googleSearch: {}}],
          temperature: 0.1,
          maxOutputTokens: 2048
        };
        
        try {
          const proxyRes = await fetch('/api/gemini/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: modelId,
              contents: [{ parts: [{ text: prompt }] }],
              config: config,
              apiKey: apiKey // Pass the rotated API key from the lane pool
            })
          });

          if (!proxyRes.ok) {
            const errorText = await proxyRes.text();
            throw new Error(`Proxy error: ${proxyRes.status} - ${errorText}`);
          }

          return await proxyRes.json();
        } catch (error) {
          console.error(`Detailed error for model ${modelId}:`, error);
          throw error;
        }
      }
    );

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const signal = extractJson(text);

    if (!signal || !signal.signal) {
      throw new Error(`Failed to parse AI signal. Full response: ${text.substring(0, 100)}...`);
    }

    // Server-side Math Enforcement Layer
    const currentPrice = livePrice || signal.entryRange?.min || (twelveDataQuote?.close ? parseFloat(twelveDataQuote.close) : 0);
    const midEntry = signal.entryRange ? (signal.entryRange.min + signal.entryRange.max) / 2 : currentPrice;
    
    // Calculate strict SL distance based on style if AI didn't provide good one
    const pipsToTarget = Math.abs(midEntry * 0.002); // 0.2% default buffer
    const rawSL = signal.stopLoss || (signal.signal === 'BUY' ? midEntry - pipsToTarget : midEntry + pipsToTarget);
    
    // Tighten SL for capital preservation
    const styleLimits = {
      'scalping(1 to 15mins)': 0.0015,
      'scalping(15 to 30mins)': 0.002,
      'day trading(1 to 2hrs)': 0.003,
      'day trading(2 to 4hrs)': 0.005,
      'swing trading': 0.01
    };
    const maxSlPercent = (styleLimits as any)[style] || 0.003;
    const currentSlDistance = Math.abs(midEntry - rawSL);
    let finalSL = rawSL;
    
    if (currentSlDistance > midEntry * maxSlPercent) {
      finalSL = signal.signal === 'BUY' ? midEntry - (midEntry * maxSlPercent) : midEntry + (midEntry * maxSlPercent);
    }
    
    const calibratedSlDistance = Math.abs(midEntry - finalSL);
    const finalTakeProfits = [
      midEntry + (signal.signal === 'BUY' ? calibratedSlDistance * 3 : -calibratedSlDistance * 3),
      midEntry + (signal.signal === 'BUY' ? calibratedSlDistance * 4 : -calibratedSlDistance * 4)
    ];

    const finalReasoning = Array.isArray(signal.reasoning) ? signal.reasoning : ["Analysis generated based on SMC structure."];
    finalReasoning.push(`[Neural Guard] Stop Loss calibrated to ${((calibratedSlDistance/midEntry)*100).toFixed(2)}% of price.`);
    finalReasoning.push(`[Alpha Sync] TP1 at 3:1 RR, TP2 at 4:1 RR exactly.`);

    const finalEntryRange = signal.entryRange || { min: midEntry * 0.9995, max: midEntry * 1.0005 };

    return {
      id: `sniper_${Date.now()}`,
      timestamp: Date.now(),
      asset: signal.asset || assetName,
      signal: signal.signal,
      confidence: signal.confidence || 0,
      timeframe: signal.timeframe || (style.includes('scalping') ? 'M5' : 'H1'),
      entryPoints: [midEntry],
      entryRange: finalEntryRange,
      stopLoss: finalSL,
      takeProfits: finalTakeProfits,
      reasoning: finalReasoning,
      checklist: Array.isArray(signal.checklist) ? signal.checklist : [],
      entryType: signal.entryType || 'Market Execution',
      expirationTime: signal.expirationTime,
      formattedLotSize: signal.formattedLotSize,
      recommendedPositions: signal.recommendedPositions,
      positionLotSize: signal.positionLotSize
    } as SignalData;
  }, getAnalysisPool());
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
  const { images, asset, riskRewardRatio, tradingStyle, twelveDataQuote } = request;
  
  // Reuse the sniper logic for standard signals to maintain consistency
  return generateSniperLiveSignal(
    asset || "Unknown Asset",
    twelveDataQuote?.close ? parseFloat(twelveDataQuote.close) : 0,
    "Standard Market Analysis",
    tradingStyle,
    request.userSettings,
    twelveDataQuote
  );
}

function extractJson(str: string): any {
    try {
        const jsonMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const rawJson = jsonMatch ? jsonMatch[1].trim() : str.trim();
        const start = rawJson.indexOf('{');
        const end = rawJson.lastIndexOf('}');
        if (start === -1 || end === -1) return null;
        const cleaned = rawJson.substring(start, end + 1);
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("JSON Extraction Error:", e);
        return null;
    }
}
