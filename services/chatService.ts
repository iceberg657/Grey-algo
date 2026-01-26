
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { getStoredGlobalAnalysis } from './globalMarketService';
import { runWithModelFallback, executeChatGeminiCall } from './retryUtils';

const BASE_SYSTEM_INSTRUCTION = `You are 'Oracle', an apex-level trading AI.
**Core Directives:**
1. **Confidence:** Speak in absolutes.
2. **Prop Firm Mindset:** Your primary goal is to generate $1.5k-$4k in daily profit. You treat the user's capital as a $100k funded account.
3. **Risk Protocol:** You strictly enforce a 1% risk per trade rule.
4. **Time Horizon:** You advise on trades that resolve within **30 minutes to 3 hours** to capture session momentum.
5. **Data-Driven:** Use Google Search to back up every claim with facts.
`;

function getDynamicSystemInstruction(): string {
    const now = new Date();
    const globalData = getStoredGlobalAnalysis();
    let globalContextStr = "Global Context: Unavailable.";
    if (globalData) globalContextStr = `Global Context: ${globalData.globalSummary}`;
    return `${BASE_SYSTEM_INSTRUCTION}\nTime: ${now.toUTCString()}\n${globalContextStr}`;
}

let chat: Chat | null = null;
let currentChatModel = 'gemma-3-4b';
let currentApiKey = '';

// Requested configuration: gemma-3-4b for chat
export const CHAT_MODELS = ['gemma-3-4b', 'gemini-3-flash-preview'];

export function initializeChat(apiKey: string, model: string = 'gemma-3-4b'): Chat {
    const ai = new GoogleGenAI({ apiKey });
    currentChatModel = model;
    currentApiKey = apiKey;
    chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: getDynamicSystemInstruction(),
            tools: model.startsWith('gemini') ? [{ googleSearch: {} }] : undefined,
            temperature: 0.2,
        },
    });
    return chat;
}

export function getChatInstance(): Chat {
    const key = process.env.API_KEY_2 || process.env.API_KEY;
    if (!key) throw new Error("No API Key available");
    if (!chat) return initializeChat(key);
    return chat;
}

export function resetChat(): void {
    chat = null;
    currentApiKey = '';
}

export async function sendMessageStreamWithRetry(messageParts: any): Promise<AsyncIterable<GenerateContentResponse>> {
    return await executeChatGeminiCall<AsyncIterable<GenerateContentResponse>>(async (apiKey) => {
        return await runWithModelFallback<AsyncIterable<GenerateContentResponse>>(CHAT_MODELS, async (modelId) => {
            if (!chat || currentChatModel !== modelId || currentApiKey !== apiKey) {
                 initializeChat(apiKey, modelId);
            }
            return await chat!.sendMessageStream({ message: messageParts });
        });
    });
}
