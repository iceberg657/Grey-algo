import { Type } from '@google/genai';

export const SignalDataSchema = {
  type: Type.OBJECT,
  properties: {
    signal: { type: Type.STRING, enum: ["BUY", "SELL", "NEUTRAL"] },
    confidence: { type: Type.NUMBER },
    asset: { type: Type.STRING },
    timeframe: { type: Type.STRING },
    entryPoints: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    entryType: { type: Type.STRING, enum: ["Market Execution", "Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop", "Buy Stop Limit", "Sell Stop Limit"] },
    expirationTime: { type: Type.STRING, nullable: true },
    triggerConditions: {
      type: Type.OBJECT,
      properties: {
        breakoutLevel: { type: Type.NUMBER, nullable: true },
        retestLogic: { type: Type.STRING },
        entryTriggerCandle: { type: Type.STRING }
      }
    },
    stopLoss: { type: Type.NUMBER },
    takeProfits: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    possiblePips: { type: Type.NUMBER },
    winProbability: { type: Type.NUMBER },
    timeframeRationale: { type: Type.STRING },
    fundamentalContext: {
      type: Type.OBJECT,
      properties: {
        sentiment: { type: Type.STRING },
        recentNews: { type: Type.STRING },
        upcomingEvents: { type: Type.STRING },
        correlationNotes: { type: Type.STRING }
      }
    },
    institutionalDrivers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          details: { type: Type.STRING },
          bias: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] }
        }
      }
    },
    fundamentalDrivers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          details: { type: Type.STRING },
          bias: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] }
        }
      }
    },
    marketStory: { type: Type.STRING },
    confluenceMatrix: {
        type: Type.OBJECT,
        properties: {
            latestPrice: { type: Type.NUMBER },
            fvg: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, upper: { type: Type.NUMBER }, lower: { type: Type.NUMBER } }, nullable: true },
            triggeredEntries: { type: Type.OBJECT, properties: { fvg: { type: Type.BOOLEAN }, fvgRetest: { type: Type.BOOLEAN }, sdLong: { type: Type.BOOLEAN }, sdShort: { type: Type.BOOLEAN }, sdPlusFVGConfluence: { type: Type.BOOLEAN } } },
            ltfExecutionBias: { type: Type.STRING },
            marketTrend: { type: Type.STRING },
            atrVolatility: { type: Type.STRING },
            rsi: { type: Type.NUMBER },
            sma: { type: Type.NUMBER },
            stddev: { type: Type.NUMBER },
            atr: { type: Type.NUMBER },
            adx: { type: Type.NUMBER },
            truthLayerAlignment: { type: Type.BOOLEAN },
            multiTimeframeAlignment: { type: Type.BOOLEAN },
            sessionVolume: { type: Type.STRING },
            liquiditySweepConfirmed: { type: Type.BOOLEAN },
            inducementIdentified: { type: Type.BOOLEAN },
            executionChecklist: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
    },
    verificationProtocol: {
        type: Type.OBJECT,
        properties: {
            higherTimeframeCheck: { type: Type.OBJECT, properties: { passed: { type: Type.BOOLEAN }, reasoning: { type: Type.STRING } } },
            liquiditySweepCheck: { type: Type.OBJECT, properties: { passed: { type: Type.BOOLEAN }, reasoning: { type: Type.STRING } } },
            riskRewardCheck: { type: Type.OBJECT, properties: { passed: { type: Type.BOOLEAN }, reasoning: { type: Type.STRING } } }
        }
    },
    neuralFilter: {
        type: Type.OBJECT,
        properties: {
            passed: { type: Type.BOOLEAN },
            confidenceBoost: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
        }
    },
    reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
    invalidationScenario: { type: Type.STRING },
    counterArgumentRejection: { type: Type.STRING },
    riskAnalysis: {
        type: Type.OBJECT,
        properties: {
            riskPerTrade: { type: Type.STRING },
            suggestedLotSize: { type: Type.STRING },
            safetyScore: { type: Type.NUMBER }
        }
    },
    sentiment: {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING }
        }
    },
    economicEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
    sources: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedPositions: { type: Type.NUMBER }
  },
  required: [
    "signal", "confidence", "asset", "timeframe", "entryPoints", "entryType", 
    "stopLoss", "takeProfits", "possiblePips", "winProbability", "triggerConditions"
  ]
};

export const SniperDataSchema = {
  type: Type.OBJECT,
  properties: {
    signal: { type: Type.STRING, enum: ["BUY", "SELL"] },
    confidence: { type: Type.NUMBER },
    asset: { type: Type.STRING },
    timeframe: { type: Type.STRING },
    entryRange: { 
        type: Type.OBJECT, 
        properties: { min: { type: Type.NUMBER }, max: { type: Type.NUMBER } },
        required: ["min", "max"]
    },
    entryType: { type: Type.STRING, enum: ["Market Execution", "Buy Limit", "Sell Limit", "Buy Stop", "Sell Stop"] },
    expirationTime: { type: Type.STRING, nullable: true },
    stopLoss: { type: Type.NUMBER },
    takeProfits: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    formattedLotSize: { type: Type.STRING },
    recommendedPositions: { type: Type.NUMBER },
    positionLotSize: { type: Type.STRING },
    reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
    checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
    candlestickPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
    confirmationPattern: { type: Type.STRING },
    neuralFilter: {
        type: Type.OBJECT,
        properties: {
            passed: { type: Type.BOOLEAN },
            confidenceBoost: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
        }
    },
    triggerConditions: {
        type: Type.OBJECT,
        properties: {
            breakoutLevel: { type: Type.NUMBER, nullable: true },
            retestLogic: { type: Type.STRING },
            entryTriggerCandle: { type: Type.STRING }
        }
    }
  },
  required: [
    "signal", "confidence", "asset", "timeframe", "entryRange", "entryType", 
    "stopLoss", "takeProfits", "formattedLotSize", "recommendedPositions", "positionLotSize", "reasoning", "checklist", "triggerConditions"
  ]
};
