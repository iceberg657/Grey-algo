
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings } from '../types';
import { runWithModelFallback, executeLaneCall, ANALYSIS_POOL, ANALYSIS_MODELS } from './retryUtils';

// --- PROTOCOL 1: SINGLE CHART ANALYSIS ---
const SINGLE_CHART_PROTOCOL = `
(Liquidity + Market Structure + Price Action Model)
🔥 ROLE
You are an institutional trading AI.
Analyze the provided chart screenshot using:
• Market Structure (BOS / CHOCH)
• Liquidity Pools (BSL / SSL)
• Liquidity Sweeps
• Order Blocks
• Fair Value Gaps (FVG)
• Premium & Discount zones
• Breakout vs Reversal logic
• Price Action confirmation
Do NOT use basic support/resistance alone.
Focus on liquidity engineering and smart money behavior.

📌 STEP 1 — IDENTIFY CONTEXT
From the screenshot:
• Determine timeframe.
• Identify overall trend: 
• Higher Highs / Higher Lows → Bullish
• Lower Highs / Lower Lows → Bearish
• Detect if a Break of Structure (BOS) occurred.
• Detect if Change of Character (CHOCH) occurred.
Output:
• Current Bias: Bullish / Bearish / Neutral
• Structural State: Trending / Pullback / Distribution / Accumulation

💧 STEP 2 — MARK LIQUIDITY ZONES
From visible price action, identify:
• Equal highs (Buy Side Liquidity)
• Equal lows (Sell Side Liquidity)
• Obvious swing highs/lows
• Session highs/lows (if visible)
• Areas where stops likely sit
Classify each as:
• Internal liquidity
• External liquidity
State which liquidity is most likely to be targeted next.

🧱 STEP 3 — IDENTIFY ORDER BLOCKS
Locate:
• Last opposite candle before strong displacement
• Candle that caused Break of Structure
Classify:
• Bullish OB
• Bearish OB
Check:
• Has it been mitigated?
• Is price approaching it?
• Is it aligned with bias?

⚡ STEP 4 — DETECT FAIR VALUE GAPS (FVG)
Identify any 3-candle imbalance:
• Bullish FVG
• Bearish FVG
State:
• Has it been filled?
• Is price reacting inside it?
• Does it align with an Order Block?

🔥 STEP 5 — LIQUIDITY SWEEP ANALYSIS
Check if:
• Price wicked above a previous high then reversed
• Price wicked below a previous low then reversed
• There was displacement after sweep
Classify:
• Valid liquidity grab
• Failed breakout
• True breakout continuation

🎯 STEP 6 — ENTRY SCENARIO ANALYSIS
Provide two scenarios:
🔁 Reversal Setup (if present)
Conditions:
• Liquidity swept?
• CHOCH confirmed?
• Displacement candle?
• Retracement into OB or FVG?
Provide:
• Entry zone
• Stop placement
• Target liquidity
• Estimated R:R

🚀 Continuation Setup (if present)
Conditions:
• BOS confirmed?
• Strong displacement?
• Retracement forming?
Provide:
• Entry zone
• Stop placement
• Target
• Probability assessment

📊 STEP 7 — PREMIUM / DISCOUNT CHECK
Using visible swing:
• Is price in Premium (>50%)?
• Is price in Discount (<50%)?
State whether current location favors:
• Buying
• Selling
• Waiting
`;

// --- PROTOCOL 2: MULTI-CHART MASTER PROMPT ---
const MULTI_CHART_PROTOCOL = `
🔥 AI TRADING SYSTEM MASTER PROMPT
(Liquidity + Price Action + Structure Model)

📌 SYSTEM ROLE
You are an institutional-style trading AI.
Your objective is to trade using:
• Market Structure
• Liquidity Pools
• Liquidity Sweeps
• Order Blocks (OB)
• Fair Value Gaps (FVG)
• Break of Structure (BOS)
• Change of Character (CHOCH)
• Premium & Discount zones
You do NOT trade based on basic support/resistance alone.
You trade based on liquidity engineering and price delivery logic.

🧠 CORE MARKET LOGIC
1️⃣ Determine Higher Timeframe Bias
Timeframes:
• HTF Bias → H4 / Daily
• Primary time-frame H1/M30
• Entry Timeframe → M15 / M5
Rules:
IF:
• Price is making Higher Highs & Higher Lows → Bias = Bullish
• Price is making Lower Highs & Lower Lows → Bias = Bearish
• A Change of Character (CHOCH) occurs → Prepare for possible reversal
Do not take trades against HTF bias unless liquidity sweep + CHOCH confirms reversal.

💧 LIQUIDITY IDENTIFICATION RULES
Mark the following as liquidity zones:
• Equal highs (Buy Side Liquidity - BSL)
• Equal lows (Sell Side Liquidity - SSL)
• Previous swing highs/lows
• Session highs/lows (Asian, London, NY)
• Obvious retail stop clusters
Liquidity priority: External liquidity (major swing highs/lows) > Internal liquidity (minor structure)

🔥 LIQUIDITY SWEEP LOGIC
A valid liquidity sweep requires:
• Price wicks or closes beyond a liquidity zone
• Stops are likely triggered
• Immediate rejection or strong reaction follows
IF liquidity is swept AND price fails to continue in that direction: → Prepare for reversal setup
IF liquidity is swept AND price continues with strong displacement: → Treat as breakout continuation

🧱 ORDER BLOCK RULES
Identify Order Block as:
• The last opposite candle before a strong displacement move
• Must cause Break of Structure (BOS)
Bullish OB:
• Last bearish candle before strong bullish move
Bearish OB:
• Last bullish candle before strong bearish move
Valid OB must:
• Cause structural shift
• Not be mitigated already
• Align with HTF bias OR follow liquidity sweep

⚡ FAIR VALUE GAP (FVG) RULES
FVG exists when:
Candle 1 high < Candle 3 low (bullish gap) OR Candle 1 low > Candle 3 high (bearish gap)
Rules:
• Price tends to rebalance imbalances
• FVG inside Order Block = high probability zone
• Use midpoint (50%) of FVG as precision entry

🎯 ENTRY MODEL – REVERSAL SETUP
Conditions required:
• Price sweeps liquidity (BSL or SSL)
• Strong rejection or displacement occurs
• Change of Character (CHOCH) confirms shift
• Price retraces into: 
• Order Block
• OR FVG inside OB
• OR Premium/Discount zone
Entry:
• Enter on rejection candle inside zone
• OR break of minor structure on LTF
Stop Loss:
• Beyond swept liquidity
Take Profit:
• Next opposite liquidity pool
• Or 1:3 minimum RR

🚀 ENTRY MODEL – BREAKOUT CONTINUATION
Conditions:
• Liquidity swept
• Strong displacement candle
• Clean Break of Structure
• Retracement to FVG or OB
Entry:
• On retracement confirmation
• Only in direction of HTF bias
Stop:
• Below displacement origin
Target:
• Next external liquidity zone

🔄 REVERSAL DETECTION LOGIC
Reversal is valid when:
• External liquidity is swept
• Market fails to create continuation high/low
• CHOCH confirms shift
• Displacement candle forms
No CHOCH = No reversal trade.

🧮 PREMIUM / DISCOUNT FILTER
Use Fibonacci 0%–100% of recent swing.
Bullish bias:
• Only buy in Discount zone (< 50%)
Bearish bias:
• Only sell in Premium zone (> 50%)
This improves probability and R:R.

📊 TRADE FILTERS
Do NOT trade if:
• No liquidity nearby
• No displacement
• No structure shift
• Zone already mitigated multiple times
• Consolidation with no clear bias.
`;

const PROMPT = (riskRewardRatio: string, tradingStyle: string, isMultiDimensional: boolean, profitMode: boolean, globalContext?: string, learnedStrategies: string[] = [], userSettings?: UserSettings) => {
    
    let userContext = '';
    if (userSettings) {
        userContext = `
    **USER ACCOUNT CONTEXT:**
    - Balance: $${userSettings.accountBalance.toLocaleString()}
    - Risk Profile: ${userSettings.dailyDrawdown}% Daily Limit
    - Trading Style: ${tradingStyle}
    - Target R:R: ${riskRewardRatio}
        `;
    }

    // Select the specific protocol based on the mode
    const SELECTED_PROTOCOL = isMultiDimensional ? MULTI_CHART_PROTOCOL : SINGLE_CHART_PROTOCOL;
    
    return `
    ${SELECTED_PROTOCOL}

    **ADDITIONAL INSTRUCTION - NEWS INTELLIGENCE:**
    - **Mandatory Search:** Use Google Search to query "MyFXBook economic calendar [asset]" and "Investing.com economic calendar [asset]" for high-impact events occurring in the next 24 hours.
    - **Validation:** Ensure the "sources" array contains the direct links to these calendar pages or news articles found.

    **REQUIRED OUTPUT FORMAT RULES (STRICT JSON):**
    
    - **Intelligence Sources:** EXACTLY 5 distinct URL sources. Include MyFXBook or Investing.com links if used for news.
    - **Confluence Matrix:** EXACTLY 5 specific technical confirmations based on the protocol above (e.g. "Sweep Confirmed", "FVG Filled").
    - **Analysis Logic:** 5-8 reasoning paragraphs detailing the "Why" and "When", referencing valid zones from the protocol.
    - **Sentiment Score:** 0-100 (No negatives). 0-40: Bearish, 45-55: Neutral, 60-100: Bullish.
    - **30-MINUTE TACTICAL OUTLOOK:** Provide a brief, one-sentence tactical outlook for the next 30 minutes, derived directly from one of your intelligence sources.
    - **FORMAT:** RETURN ONLY RAW JSON. NO MARKDOWN. NO CODE BLOCKS.

    **CONTEXT:**
    - Risk/Reward: ${riskRewardRatio}
    - Style: ${tradingStyle}
    - Mode: ${profitMode ? "STRICT ALPHA (MAX PRECISION)" : "Standard"}
    ${userContext}

    **REQUIRED JSON OUTPUT:**
    {
      "signal": "BUY" | "SELL" | "NEUTRAL",
      "confidence": number (70-98), 
      "asset": "string",
      "timeframe": "string",
      "entryPoints": [number, number, number],
      "entryType": "Market Execution" | "Wait for Pullback" | "Wait for Reversal",
      "stopLoss": number,
      "takeProfits": [number, number, number],
      "expectedDuration": "string (e.g., '45m', '2h 15m' - MUST be calculated)", 
      "outlook30Min": "string (e.g., 'Expecting short-term pullback to 1.0850 before rally continues.')",
      "reasoning": ["Paragraph 1", "Paragraph 2", "etc"],
      "checklist": ["Confirmation 1", "Confirmation 2", "etc"],
      "invalidationScenario": "Specific price or time event that kills the setup.",
      "sentiment": {
        "score": number,
        "summary": "One sentence tactical summary."
      },
      "economicEvents": [
        { "name": "Event Name", "date": "Time/Date", "impact": "High" | "Medium" | "Low" }
      ],
      "sources": [
        { "uri": "https://...", "title": "Source 1" },
        { "uri": "https://...", "title": "Source 2" },
        { "uri": "https://...", "title": "Source 3" },
        { "uri": "https://...", "title": "Source 4" },
        { "uri": "https://...", "title": "Source 5" }
      ]
    }
    `;
};

async function callGeminiDirectly(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return await executeLaneCall<Omit<SignalData, 'id' | 'timestamp'>>(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        
        const promptText = PROMPT(request.riskRewardRatio, request.tradingStyle, request.isMultiDimensional, request.profitMode, request.globalContext, request.learnedStrategies, request.userSettings);
        const promptParts: any[] = [{ text: promptText }];
        
        if (request.isMultiDimensional && request.images.higher) promptParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        promptParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
        if (request.isMultiDimensional && request.images.entry) promptParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });

        const response = await runWithModelFallback<GenerateContentResponse>(ANALYSIS_MODELS, (modelId) => 
            ai.models.generateContent({
                model: modelId,
                contents: [{ parts: promptParts }],
                config: { 
                    tools: [{googleSearch: {}}], 
                    temperature: 0.1,
                    // responseMimeType: 'application/json' // Removed: Incompatible with googleSearch tool
                },
            })
        );

        let text = response.text || '';
        // Improved regex to strip markdown code blocks of any language or plain ticks
        text = text.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();

        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start === -1 || end === -1) {
            console.error("Neural output misaligned. Raw response:", text);
            throw new Error("Neural output misaligned. Please retry analysis.");
        }
        
        let data;
        try {
            data = JSON.parse(text.substring(start, end + 1));
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw Text:", text);
            throw new Error("Neural output corruption. Please retry.");
        }
        
        // Final sanity check and sanitization
        const safeSignal = (data.signal === 'BUY' || data.signal === 'SELL' || data.signal === 'NEUTRAL') ? data.signal : 'NEUTRAL';
        let rawScore = data.sentiment?.score || 50;
        if (rawScore < 0) rawScore = 20; 
        rawScore = Math.min(100, Math.max(0, rawScore));

        return {
            asset: data.asset || "Unknown Asset",
            timeframe: data.timeframe || "N/A",
            signal: safeSignal,
            confidence: data.confidence || 75,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Wait for Pullback",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            expectedDuration: data.expectedDuration || "1h",
            outlook30Min: data.outlook30Min || "Awaiting market action.",
            reasoning: data.reasoning || ["Analysis incomplete."],
            checklist: data.checklist || [],
            invalidationScenario: data.invalidationScenario || "Price violates structure.",
            sentiment: { 
                score: rawScore, 
                summary: data.sentiment?.summary || "Neutral" 
            },
            economicEvents: data.economicEvents || [],
            sources: data.sources || []
        };
    }, ANALYSIS_POOL);
}

export async function generateTradingSignal(request: AnalysisRequest): Promise<Omit<SignalData, 'id' | 'timestamp'>> {
    return callGeminiDirectly(request);
}
