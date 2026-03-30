import { GoogleGenAI, Type } from '@google/genai';

// Define the structure of the market data we will feed to Gemini
export interface MarketData {
  asset: string;
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  trendDirection: 'bullish' | 'bearish' | 'ranging';
  spreadPips: number;
  upcomingNews: boolean;
  currentSession: 'Asia' | 'London' | 'New York' | 'Overlap';
}

// Define the structure of the decision Gemini will return
export interface AiDecision {
  asset: string;
  mode: 'scalping' | 'intraday' | 'standby';
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
}

export class AiStrategyBrain {
  private ai: GoogleGenAI;

  constructor() {
    // Initialize the Gemini client using the environment variable
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Feeds live market data to Gemini 3.1 Flash Lite and asks for a trading strategy decision.
   */
  async analyzeMarket(data: MarketData[]): Promise<AiDecision> {
    const prompt = `
      You are the Chief Investment Officer for a proprietary trading firm.
      Your goal is to pass a prop firm challenge with a strict 5% daily drawdown limit.
      
      Review the following real-time market data for our monitored assets:
      ${JSON.stringify(data, null, 2)}
      
      Rules for your decision:
      1. If there is 'upcomingNews' for an asset, you MUST put it in 'standby' mode.
      2. If 'volatility' is 'high' or 'extreme' and the session is 'London' or 'New York', favor 'scalping'.
      3. If 'trendDirection' is clear but 'volatility' is 'medium', favor 'intraday'.
      4. If 'spreadPips' is greater than 1.5, do not scalp.
      
      Select the single best asset to trade right now, the mode to use, and the risk level.
    `;

    try {
      console.log('🧠 Asking Gemini 3.1 Flash Lite for strategy...');
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are an elite quantitative trading AI. You only output strict JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              asset: {
                type: Type.STRING,
                description: "The symbol of the chosen asset (e.g., 'US30', 'EURUSD').",
              },
              mode: {
                type: Type.STRING,
                description: "The trading style to deploy.",
                enum: ['scalping', 'intraday', 'standby']
              },
              riskLevel: {
                type: Type.STRING,
                description: "The risk profile for the execution engine.",
                enum: ['low', 'medium', 'high']
              },
              reasoning: {
                type: Type.STRING,
                description: "A 1-2 sentence explanation of why this decision was made based on the data.",
              }
            },
            required: ["asset", "mode", "riskLevel", "reasoning"]
          }
        }
      });

      const decisionText = response.text;
      if (!decisionText) throw new Error("No response from Gemini");

      const decision: AiDecision = JSON.parse(decisionText);
      console.log('✅ Gemini Decision Received:', decision);
      
      return decision;
    } catch (error) {
      console.error('❌ Error getting AI strategy:', error);
      // Fallback to safety if the AI fails
      return {
        asset: 'NONE',
        mode: 'standby',
        riskLevel: 'low',
        reasoning: 'API Error or Timeout. Defaulting to standby for safety.'
      };
    }
  }
}
