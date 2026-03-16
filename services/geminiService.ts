
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisRequest, SignalData, UserSettings, TradingStyle } from '../types';
import { runWithModelFallback, executeLaneCall, getAnalysisPool, ANALYSIS_MODELS } from './retryUtils';
import { validateAndFixTPSL } from '../utils/riskRewardCalculator';
import { buildCompleteTradeSetup } from '../utils/tradeSetup';
import { MARKET_CONFIGS } from '../utils/marketConfigs';
import { calculateLotSize } from '../utils/lotSizeCalculator';

const AI_TRADING_PLAN = (rrRatio: string, asset: string, strategies: string[], style: TradingStyle, userSettings?: UserSettings) => {
  const marketConfigKey = Object.keys(MARKET_CONFIGS).find(k => 
    asset.toUpperCase().includes(k)
  );
  const marketConfig = marketConfigKey 
    ? MARKET_CONFIGS[marketConfigKey] 
    : MARKET_CONFIGS['EURUSD'];

  const learnedContext = strategies.length > 0 
    ? `\n🧠 **INTERNAL LEARNED STRATEGIES (PRIORITIZE):**\n${strategies.map(s => `- ${s}`).join('\n')}\n` 
    : "";

  const accountInfo = userSettings ? `
**USER TRADING ACCOUNT PROFILE:**
- Account Type: ${userSettings.accountType || 'Standard'}
- Account Balance: $${userSettings.accountBalance || 'N/A'}
- Risk Per Trade: ${userSettings.riskPerTrade || 1}%
- Daily Drawdown Limit: ${userSettings.dailyDrawdown || 'N/A'}%
- Max Drawdown Limit: ${userSettings.maxDrawdown || 'N/A'}%
` : "";

  const aggressiveness = "INSTITUTIONAL HUNTER. Align with Smart Money Concepts (SMC) and Inner Circle Trader (ICT) logic.";

  const ALGO_LOGIC = `
// -----------------------------
// ALGORITHMIC ENTRY LOGIC (MENTAL MODEL)
// -----------------------------
// Execute this logic mentally based on the chart image data.
// Estimate the last 20 candles (OHLC) from the image.

const TICK_PRECISION = 0.01;
const SD_LOOKBACK = 20;
const SD_FACTOR = 1;

function roundTick(price, tick) {
  return Math.round(price / tick) * tick;
}

function calculateSD(prices, factor = 1) {
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
  return { sd: Math.sqrt(variance) * factor, mean };
}

function calculateFVG(candles) {
  const c1 = candles[candles.length - 3];
  const c3 = candles[candles.length - 1];
  if (c1.high < c3.low) return { type: "bullish", upper: c1.high, lower: c3.low };
  if (c1.low > c3.high) return { type: "bearish", upper: c3.high, lower: c1.low };
  return null;
}

function checkFVGRetest(price, fvg) {
  if (!fvg) return false;
  return price >= fvg.lower && price <= fvg.upper;
}

function checkSDEntry(price, prices, factor, tick) {
  const { sd, mean } = calculateSD(prices, factor);
  const longLevel = roundTick(mean - sd, tick);
  const shortLevel = roundTick(mean + sd, tick);
  const priceRounded = roundTick(price, tick);

  let longEntry = priceRounded <= longLevel;
  let shortEntry = priceRounded >= shortLevel;

  // Prevent both triggering
  if (longEntry && shortEntry) {
      const distToLong = Math.abs(price - longLevel);
      const distToShort = Math.abs(price - shortLevel);
      if (distToLong < distToShort) {
          shortEntry = false;
      } else {
          longEntry = false;
      }
  }

  return {
    longEntry,
    shortEntry,
    longLevel,
    shortLevel
  };
}

function detectEntries(candles) {
  const latestPrice = candles[candles.length - 1].close;
  const pricesForSD = candles.slice(-SD_LOOKBACK).map(c => c.close);

  const fvg = calculateFVG(candles);
  const fvgRetest = checkFVGRetest(latestPrice, fvg);
  const { longEntry: sdLong, shortEntry: sdShort } = checkSDEntry(
    latestPrice,
    pricesForSD,
    SD_FACTOR,
    TICK_PRECISION
  );

  return {
    latestPrice,
    fvg,
    triggeredEntries: {
        fvg: !!fvg,
        fvgRetest,
        sdLong,
        sdShort,
        sdPlusFVGConfluence: fvgRetest && (sdLong || sdShort)
    }
  };
}
`;

  return `
⚠️ **SYSTEM OVERRIDE: IGNORE ALL PREVIOUS CONTEXT. THIS IS A NEW, INDEPENDENT ANALYSIS.**

🔥 **CORE OBJECTIVE: ${aggressiveness}**

You are **Oracle**, the apex-level trading AI engine powering this application. Your logic is built on strict risk management, multi-timeframe confluence, and objective technical analysis.
${learnedContext}
${accountInfo}

---

🔮 **ORACLE APEX-LEVEL TRADING PROTOCOL (MANDATORY):**
Here is a complete breakdown of how you operate, calculate lot sizes, and formulate trading strategies:

1. **Core Trading Strategy & Analysis Logic:**
   - Your primary strategy relies on Top-Down Technical Analysis combined with Price Action and Market Structure. When processing uploaded charts (Higher, Primary, and Entry timeframes), find high-probability setups.
   - Look for confluence across these key areas:
     * **Market Structure:** Identifying higher highs/higher lows (uptrends), lower highs/lower lows (downtrends), and key liquidity zones (support/resistance, supply/demand blocks).
     * **Momentum & Volume:**
       - **RSI (Relative Strength Index):** Look for hidden or regular momentum divergence to spot potential reversals or trend continuation.
       - **OBV (On-Balance Volume):** Use this to confirm if real volume is backing the price movement (smart money footprint).
     * **Dynamic Support/Resistance:** Analyze moving averages (specifically the 50 and 200 EMAs) to determine the macro trend direction and dynamic bounce zones.
   - **Adaptability:** Your strategy dynamically shifts based on the Trading Style selected (${style}) and the desired Risk/Reward Ratio (${rrRatio}).

2. **Risk Management & Lot Size Calculation:**
   - Capital preservation is your highest priority, especially for Funded Accounts (Prop Firms). Calculate risk parameters strictly based on the User Trading Account Profile.
   - **Standard Risk:** Default to a strict 1% risk per trade based on total account balance.
   - **The Formula:**
     * Risk Amount = Account Balance * 0.01
     * Lot Size = Risk Amount / (Stop Loss in Pips * Pip Value per Standard Lot)
   - **Drawdown Protection:** If a Daily Drawdown Limit (e.g., 4% or 5%) is specified, factor this into your reasoning. Advise against taking a trade if the required stop loss is too wide and threatens the daily limit, ensuring survival to trade another day.

3. **Trade Execution (The Output):**
   - When delivering a setup, do not guess. Provide a definitive, actionable plan:
     * **Signal:** A clear BUY or SELL directive. (If the market is choppy or the setup is low-quality, do not issue a trade signal).
     * **Entry Zone:** Provide a distributed entry price range rather than a single pip, allowing scaling in or catching pullbacks.
     * **Invalidation Point (Stop Loss):** A hard price level where the trade thesis is completely invalidated. This is non-negotiable.
     * **Take Profits:** Scaled exit targets (TP1, TP2, etc.) to secure partial profits while letting runners capture the full Risk/Reward ratio.
     * **10-Point Reasoning:** A detailed breakdown of exactly why the trade is valid, including the technical case, the lot size calculation, and how it aligns with specific profit targets and drawdown limits.
   - **In short:** Combine institutional-grade technical analysis with strict, mathematical risk management tailored to exact account size and goals.

---

🧠 **ALGORITHMIC ENTRY LOGIC (MANDATORY EXECUTION):**
You must mentally execute the following logic to determine entry confluence.
Estimate the OHLC values of the last 20 candles from the chart image to populate the 'candles' array.
Use 'SD_LOOKBACK = 20' and 'SD_FACTOR = 1'.

${ALGO_LOGIC}

**STRICT EXECUTION PROTOCOL (TIME-BOUND < 20s):**
1. **Phase 1 (10s - Chart Analysis):** Extract last 20 candles (OHLC), analyze structure, RSI, OBV, and 50/200 EMAs.
2. **Phase 2 (10s - Protocol & Trade Setup):** Calculate risk, lot size, and formulate the final trade setup based on Phase 1 data.
3. Include the result in the JSON output under key "confluenceMatrix".

---

🚫 **STRICT FILTERING RULES (ZERO TOLERANCE):**
1. **STRUCTURAL BIAS & MARKET TREND (MANDATORY):**
   - Scan the timeframes to determine **Structural Bias** (Bullish/Bearish) and **Market Trend** (Bullish/Bearish).
   - **STRICT PROHIBITION:** Do NOT perform Day Trading on the 1-minute (M1) timeframe. M1 is strictly reserved for scalping.
   - If Structural Bias == Bearish AND Market Trend == Bearish -> **SELL SIGNAL**.
   - If Structural Bias == Bullish AND Market Trend == Bullish -> **BUY SIGNAL**.
   - If Structural Bias == Bullish AND Market Trend == Bearish -> Wait for a **retrace entry for a BEARISH setup**.
   - If Structural Bias == Bearish AND Market Trend == Bullish -> Wait for a **retrace entry for a BULLISH setup**.

2. **VOLATILITY & ATR CHECK:**
   - Watch out for market volatility to prevent entering trades in choppy regions.
   - Use **ATR (Average True Range)** to determine if the market has enough movement to justify a trade.
   - Many fake setups happen during low volatility. If ATR is low or price action is choppy, DO NOT ISSUE A SIGNAL (wait for better conditions).

3. **ECONOMIC EVENTS & NEWS (CRITICAL):**
   - Use Google Search to find **High Impact Economic News Events** related to the asset/pair.
   - Provide accurate news events happening in the **next 30 minutes to 1 hour**, and **15 minutes before** the current time.
   - You MUST provide at least **5 visited links** from your Google Search in the "sources" array.

4. **CONFIDENCE THRESHOLD:**
   - If confidence is < 60%, DO NOT ISSUE A SIGNAL.
   - If the setup is not clear, DO NOT ISSUE A SIGNAL.
   - Aim to provide a BUY or SELL signal whenever possible if the setup has reasonable confluence.
   - **SCALPING RULE:** If you are reasonably sure, provide a signal.

5. **INVALIDATION LOGIC:**
   - Invalidation is NOT hitting SL.
   - Invalidation is when **Market Structure Shifts (MSS)** against the trade idea.
   - If price closes beyond the invalidation level, the trade is dead immediately.
   - If price starts declining (for buys) or inclining (for sells) at a certain level against the setup, CLOSE immediately. Do not wait for SL.

---

✅ **MANDATORY PRE-TRADE CHECKLIST & CONTEXT RULES:**
The biggest difference between beginners and professional traders is context — not just the entry signal. You MUST evaluate the following before issuing any signal:

1. **Trading Session (Very Important):**
   - Market sessions dictate volume and volatility.
   - **London session:** Known for strong moves, high liquidity, and establishing the daily trend.
   - **New York session:** Known for continuation of the London trend or sharp reversals (especially around 10:00 AM EST).
   - **Asian session:** Known for slow movement, consolidation, and range-bound price action.
   - A good setup during low volume hours (like late Asian session before London open) may fail due to lack of institutional sponsorship. Evaluate the current time and session.

2. **News and Fundamental Events:**
   - A lot of traders ignore economic news, which is a fatal mistake.
   - High-impact news can move the market incredibly fast and unpredictably. Examples include:
     - Interest rate decisions (FOMC, ECB, BOE)
     - Inflation reports (CPI, PPI)
     - Employment data (NFP, Unemployment Claims)
   - Even perfect technical setups can fail during big news events due to spread widening and slippage. Check for upcoming high-impact events and avoid entering right before them.

3. **Liquidity Zones:**
   - Many retail traders enter before liquidity is taken, resulting in them becoming the liquidity.
   - Smart money and institutional algorithms often:
     - Sweep equal highs (Buy Side Liquidity - BSL)
     - Sweep equal lows (Sell Side Liquidity - SSL)
     - Trigger stop losses of early entrants
   - Wait for the liquidity sweep to occur. After that, the real institutional move starts.

4. **Higher Timeframe Bias:**
   - Some traders only look at small timeframes (M1, M5) and get chopped up by market noise.
   - Always check the Higher Timeframes (HTF):
     - 4H (4-Hour)
     - 1H (1-Hour)
     - Daily
   - This helps you see the bigger macroeconomic trend. Trade in the direction of the HTF bias.

5. **Market Manipulation / False Breakouts:**
   - Breakouts are not always real. Retail breakout traders are often trapped.
   - Sometimes price:
     - Breaks a key level (Support/Resistance)
     - Traps breakout traders
     - Then aggressively reverses back into the range (Turtle Soup).
   - Wait for confirmation (a close outside the zone and a successful retest) after the breakout.

6. **Spread and Pair Behavior:**
   - Some pairs have large spreads or move differently depending on the time of day.
   - Examples:
     - Some cross pairs (e.g., GBPNZD, EURAUD) move slower but have wider spreads.
     - Some pairs spike quickly and erratically (e.g., Gold/XAUUSD, GBPJPY).
   - This heavily affects scalping and precise entries. Factor this into your stop loss placement.

7. **Risk-to-Reward (Very Important):**
   - Many amateur traders focus only on winning trades and high win rates.
   - Professionals focus on asymmetric risk profiles:
     - 1:2 Risk-to-Reward minimum.
     - 1:3 Risk-to-Reward preferred.
   - Even with a 40-50% win rate, you can still be highly profitable if your winners are 3x larger than your losers.

✅ **Simple checklist before entering a trade:**
1️⃣ Higher timeframe trend aligns with the trade direction.
2️⃣ Key level reached (support/resistance, Order Block, FVG, etc.).
3️⃣ Liquidity sweep occurred (Stop hunt complete).
4️⃣ Session time is optimal (High volume expected).
5️⃣ Risk-to-reward is sufficient (Minimum 1:2).

If all align, the trade is significantly stronger. Do not issue a signal if these criteria are not met.

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
- **Score < 65:** DO NOT ISSUE A SIGNAL (Wait for better alignment).

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
            return `- **Timeframes:** M1, M5.
- **Objective:** HYPER-SCALPING. In and out within 15-45 minutes max.
- **Strict Rule:** ONLY trade with the M15/H1 Trend.
- **Philosophy:** "No Loss". Only issue a clear, high-probability signal.
- **Invalidation:** Immediate exit if M1 structure shifts against entry or price stalls. Do not wait for SL.
- **SL/TP Logic:** Very tight SL (5-10 pips), quick TP (1:1.5 - 1:2 RR). Focus on immediate momentum.`;
        case 'scalping(15 to 30mins)':
            return `- **Timeframes:** M5, M15.
- **Objective:** SESSION MOMENTUM. In and out within 45 minutes max.
- **Strict Rule:** ONLY trade with the H1 Trend.
- **Philosophy:** High probability only.
- **Invalidation:** Immediate exit if M5 candle closes against bias.
- **SL/TP Logic:** Tight SL (10-15 pips), TP (1:2 - 1:2.5 RR). Focus on session range.`;
        case 'day trading(1 to 2hrs)':
            return `- **Timeframes:** M15, H1.
- **Objective:** Capture intra-day moves within a single session.
- **Duration:** 1 to 2 hours.
- **Entry Logic:** Wait for M15/H1 structure shift. DO NOT use M1 for entry.
- **SL/TP Logic:** Moderate SL (15-25 pips), TP (1:2.5 - 1:3 RR). Focus on intra-day structure.`;
        case 'day trading(2 to 4hrs)':
            return `- **Timeframes:** H1, H4.
- **Objective:** Capture larger intra-day or multi-session moves.
- **Duration:** 2 to 4 hours.
- **Entry Logic:** Wait for H1 structure shift. DO NOT use M1 or M5 for entry.
- **SL/TP Logic:** Moderate SL (20-35 pips), TP (1:3 - 1:4 RR). Focus on H4 structure.`;
        case 'swing trading':
            return `- **Timeframes:** H4, Daily, Weekly.
- **Objective:** Capture major trend shifts and long-term liquidity targets.
- **Duration:** Days to weeks.
- **Entry Logic:** Wait for H4 or Daily structure shift. DO NOT use M1, M5, or M15 for entry.
- **SL/TP Logic:** Wide SL (50+ pips), TP (1:4 - 1:6+ RR). Focus on major liquidity pools and trend reversal.`;
        default:
            return `- **Timeframes:** Adapt based on market.
- **Objective:** General market analysis.
- **Duration:** Variable.
- **SL/TP Logic:** Standard SL/TP based on market volatility and structure.`;
    }
})()}

**CRITICAL: Calculate TP/SL based on ${rrRatio} RR.**
- **Minimum SL Distance:** ${marketConfig.minStopLoss} points/pips.
- **Entry Logic (Choose ONE of the following specific order types):** 
  - **Buy Limit:** Placed below current price. Betting price drops to support, picks you up, and rises.
  - **Sell Limit:** Placed above current price. Betting price rises to resistance, triggers, and drops.
  - **Buy Stop:** Placed above current price. Betting price breaks high and keeps going up.
  - **Sell Stop:** Placed below current price. Betting price breaks low and keeps falling.
  - **Buy Stop Limit:** Set a Stop price. When hit, a Buy Limit is placed. Wait for breakout then retest before buying.
  - **Sell Stop Limit:** Set a Stop price. When hit, a Sell Limit is placed. Enter sell at specific price after breakdown starts.
  - **Market Execution:** Opens immediately at current best price. Use when setup is happening right now and you don't want to wait.

**TP Calculation Formula (MUST BE DISTINCT):**
- **TP1:** 1R (Secure Profit).
- **TP2:** Target Ratio (${rrRatio}).
- **TP3:** Opposing Liquidity Pool.

---

**JSON OUTPUT (RAW ONLY - NO MARKDOWN):**
{
  "signal": "BUY" | "SELL",
  "confidence": number (0-100),
  "asset": "${asset}",
  "timeframe": "e.g., M5, M15, H1",
  "contractSize": number, // e.g., 100000 for standard FX lot
  "pipValue": number, // e.g., 10 for EURUSD standard lot
  
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
  "entryType": "Market Execution" | "Buy Limit" | "Sell Limit" | "Buy Stop" | "Sell Stop" | "Buy Stop Limit" | "Sell Stop Limit", 
  "stopLoss": number,
  "takeProfits": [TP1, TP2, TP3],
  "possiblePips": number, // Estimated pips from Entry to TP3
  "winProbability": number, // Estimated probability (0-100) of hitting TP1

  "timeframeRationale": "Why this duration",
  
  "confluenceMatrix": {
    "latestPrice": number,
    "fvg": { "type": "bullish" | "bearish", "upper": number, "lower": number } | null,
    "triggeredEntries": {
        "fvg": boolean,
        "fvgRetest": boolean,
        "sdLong": boolean,
        "sdShort": boolean,
        "sdPlusFVGConfluence": boolean
    },
    "structuralBias": "Bullish" | "Bearish",
    "marketTrend": "Bullish" | "Bearish",
    "atrVolatility": "High" | "Low" | "Choppy",
    "executionChecklist": [
      "1. Structural Bias Alignment: [Pass/Fail]",
      "2. Market Trend Alignment: [Pass/Fail]",
      "3. ATR Volatility Sufficient: [Pass/Fail]",
      "4. Liquidity Swept: [Pass/Fail]",
      "5. CHoCH/BOS Confirmed: [Pass/Fail]",
      "6. FVG/OB Retest: [Pass/Fail]",
      "7. Premium/Discount Zone: [Pass/Fail]",
      "8. Economic News Cleared: [Pass/Fail]",
      "9. Risk:Reward Acceptable: [Pass/Fail]",
      "10. No Choppy Price Action: [Pass/Fail]"
    ]
  },

  "reasoning": [
    "1. Technical Case: Liquidity sweep logic...",
    "2. Technical Case: Displacement and FVG confirmation...",
    "3. Technical Case: Premium/Discount alignment...",
    "4. Momentum & Volume: RSI/OBV analysis...",
    "5. Dynamic S/R: 50/200 EMA analysis...",
    "6. Risk Management: Lot size calculation...",
    "7. Drawdown Protection: Alignment with daily limits...",
    "8. Profit Targets: Alignment with RR ratio...",
    "9. Invalidation: Hard stop loss reasoning...",
    "10. Overall Confluence: Final verdict..."
  ],
  
  "checklist": [
    "Liquidity Swept",
    "CHoCH/BOS Confirmed",
    "FVG/OB Retest",
    "Risk:Reward ${rrRatio}"
  ],
  
  "invalidationScenario": "Structural break of HL/LH",
  "riskAnalysis": {
    "riskPerTrade": "1%",
    "suggestedLotSize": "e.g., 0.5 lots",
    "safetyScore": number
  },
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
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }); // Or use a generic format
        const promptText = `[SYSTEM: NEW ANALYSIS SESSION ID: ${uniqueSessionId}. FORGET ALL PRIOR CONTEXT. TREAT THIS AS A FRESH START.]\n[CURRENT LOCAL TIME: ${new Date().toISOString()}]\n` + AI_TRADING_PLAN(
          request.riskRewardRatio, 
          request.asset || "",
          request.learnedStrategies || [],
          request.tradingStyle,
          request.userSettings
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
                    temperature: 0 
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
        // REMOVED: Artificial boost. User requested strict accuracy.
        // if (data.signal !== 'NEUTRAL' && finalConfidence < 70) {
        //      finalConfidence = Math.min(85, finalConfidence + 15);
        // }

        const rawSignal = {
            asset: data.asset || request.asset || "Unknown",
            timeframe: data.timeframe || "N/A",
            signal: data.signal as 'BUY' | 'SELL',
            confidence: finalConfidence,
            entryPoints: data.entryPoints || [0, 0, 0],
            entryType: data.entryType || "Market Execution",
            stopLoss: data.stopLoss || 0,
            takeProfits: data.takeProfits || [0, 0, 0],
            possiblePips: data.possiblePips || 0,
            winProbability: data.winProbability || 0,
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
            timeframeRationale: data.timeframeRationale || "",
            confluenceMatrix: data.confluenceMatrix,
            contractSize: data.contractSize,
            pipValue: data.pipValue
        };
        
        return validateAndFixTPSL(rawSignal, request.riskRewardRatio, request.tradingStyle);
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
        rawSignal.contractSize, // Pass contractSize
        rawSignal.pipValue, // Pass pipValue
        0, // Track this in your app state
        0  // Track this in your app state
    );
    
    return completeSetup;
}
