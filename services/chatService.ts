
import { GoogleGenAI, Chat, GenerateContentResponse, Tool } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, runWithModelFallback, initializeApiKey } from './retryUtils';

const BASE_SYSTEM_INSTRUCTION = `You are 'Oracle', a high-frequency trading AI and elite Trading Coach.
Confidence is mandatory. Treat capital as a $100k funded account. 1% risk per trade.
Back all claims with Google Search results.

**AGENTIC CAPABILITIES (LIVE MODE):**
- When in LIVE mode, you can control the application interface.
- You can navigate the user to different pages (Chart Analysis, Sniper, History, etc.).
- You can change the application theme.
- You can fetch real-time market vitals.
- If the user asks to "see", "go to", "switch to", or "analyze" a specific page, use the 'navigateTo' tool.

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

const LIVE_TOOLS: Tool[] = [
    { googleSearch: {} },
    {
        functionDeclarations: [
            {
                name: "navigateTo",
                description: "Navigates the user to a specific page in the application. Available pages: 'home', 'analysis', 'history', 'chat', 'products', 'session', 'journal', 'admin', 'autotrade', 'sniper', 'command_center'.",
                parameters: {
                    type: "object",
                    properties: {
                        page: {
                            type: "string",
                            description: "The name of the page to navigate to."
                        }
                    },
                    required: ["page"]
                }
            },
            {
                name: "toggleTheme",
                description: "Switches the application theme between dark and light mode.",
                parameters: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "getMarketVitals",
                description: "Fetches live system vitals including active keys, neural lanes, and win rate.",
                parameters: {
                    type: "object",
                    properties: {}
                }
            }
        ]
    }
];

let currentChat: Chat | null = null;
let currentApiKey = '';
let currentModel = CHAT_MODELS[0];
let isLiveModeActive = false;

export function initializeChat(apiKey: string, model: string, isLive: boolean = false): Chat {
    const ai = new GoogleGenAI({ apiKey });
    currentApiKey = apiKey;
    currentModel = model;
    isLiveModeActive = isLive;

    currentChat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: BASE_SYSTEM_INSTRUCTION + (isLive ? "\n\n**STATUS: LIVE MODE ENABLED.** You have direct control over the UI. Use tools proactively." : ""),
            tools: isLive ? LIVE_TOOLS : [{ googleSearch: {} }],
            temperature: 0.3,
        },
    });
    return currentChat;
}

export async function getChatInstance(isLive: boolean = false): Promise<Chat> {
    await initializeApiKey();
    const key = getChatPool()[0] || '';
    if (!currentChat || isLiveModeActive !== isLive) return initializeChat(key, CHAT_MODELS[0], isLive);
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
    onRetry?: (delayMs: number) => void,
    isLive: boolean = false
): Promise<AsyncIterable<GenerateContentResponse>> {
    return await executeLaneCall(async (apiKey) => {
        return await runWithModelFallback(CHAT_MODELS, async (modelId) => {
            if (!currentChat || currentApiKey !== apiKey || currentModel !== modelId || isLiveModeActive !== isLive) {
                initializeChat(apiKey, modelId, isLive);
            }
            return await currentChat!.sendMessageStream({ message: messageParts });
        }, onRetry);
    }, getChatPool);
}
