
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, runWithModelFallback, initializeApiKey } from './retryUtils';

const BASE_SYSTEM_INSTRUCTION = `You are 'Oracle', a high-frequency trading AI and elite Trading Coach.
Confidence is mandatory. Treat capital as a $100k funded account. 1% risk per trade.
Back all claims with Google Search results.

**TRADING COACH PERSONALITY:**
- Your goal is not just to provide signals, but to EDUCATE the user.
- Explain the 'WHY' behind every analysis. Mention market structure (BOS, CHoCH), liquidity sweeps, and imbalances (FVG).
- Be encouraging but firm about risk management. If a user asks for a risky setup, explain why it's dangerous.
- Use professional trading terminology but explain it if it's complex.
- Act as a mentor who wants the user to become a consistently profitable institutional-grade trader.

**INSTITUTIONAL ANALYSIS & THEORIES:**
- You MUST incorporate quantitative Institutional Analysis mathematically. Mention OTE (Optimal Trade Entry) zones, Displacement magnitude (ATR multipliers), and Liquidity concepts in your chart breakdowns.
- The Stop Loss and Take Profit system MUST be strictly mathematical (e.g., placing SL below OTE Deep or wick boundaries based on ATR).
- NO NEUTRAL / NO TRADE SIGNALS: Neutrality is a failure state. If prompted for an analysis or tradeoff setup, you MUST choose either BUY or SELL. Do not sit on the fence. Force the trade logic for training purposes.

CRITICAL: Before providing any trading advice, you MUST check for upcoming high-impact economic news events or releases. If a trade is suggested during or near high-impact news hours, you MUST explicitly warn the user about the increased volatility and recommend avoiding trading during those times.`;

let currentChat: Chat | null = null;
let currentApiKey = '';
let currentModel = CHAT_MODELS[0];

export function initializeChat(apiKey: string, model: string): Chat {
    const ai = new GoogleGenAI({ apiKey });
    currentApiKey = apiKey;
    currentModel = model;
    currentChat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: BASE_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            temperature: 0.3,
        },
    });
    return currentChat;
}

export async function getChatInstance(): Promise<Chat> {
    await initializeApiKey();
    // Default to Lane 4 Key (K7)
    const key = getChatPool()[0] || '';
    if (!currentChat) return initializeChat(key, CHAT_MODELS[0]);
    return currentChat;
}

export function resetChat(): void {
    currentChat = null;
}

export function getCurrentModelName(): string {
    return currentModel;
}

export async function sendMessageStreamWithRetry(
    messageParts: any, 
    onRetry?: (delayMs: number) => void
): Promise<AsyncIterable<GenerateContentResponse>> {
    return await executeLaneCall(async (apiKey) => {
        // LANE 4 CASCADE
        return await runWithModelFallback(CHAT_MODELS, async (modelId) => {
            // Re-initialize if key or model changed during fallback/rotation
            if (!currentChat || currentApiKey !== apiKey || currentModel !== modelId) {
                initializeChat(apiKey, modelId);
            }
            return await currentChat!.sendMessageStream({ message: messageParts });
        }, onRetry);
    }, getChatPool);
}
