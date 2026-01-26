
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { getStoredGlobalAnalysis } from './globalMarketService';
import { executeLaneCall, CHAT_ML_POOL } from './retryUtils';

const BASE_SYSTEM_INSTRUCTION = `You are 'Oracle', a high-frequency trading AI.
Confidence is mandatory. Treat capital as a $100k funded account. 1% risk per trade.
Back all claims with Google Search results.`;

let chat: Chat | null = null;
let currentApiKey = '';

export function initializeChat(apiKey: string): Chat {
    const ai = new GoogleGenAI({ apiKey });
    currentApiKey = apiKey;
    chat = ai.chats.create({
        model: 'gemini-2.0-flash',
        config: {
            systemInstruction: BASE_SYSTEM_INSTRUCTION,
            tools: [{ googleSearch: {} }],
            temperature: 0.3,
        },
    });
    return chat;
}

export function getChatInstance(): Chat {
    const key = process.env.API_KEY_6 || process.env.API_KEY || '';
    if (!chat) return initializeChat(key);
    return chat;
}

export function resetChat(): void {
    chat = null;
}

export async function sendMessageStreamWithRetry(messageParts: any): Promise<AsyncIterable<GenerateContentResponse>> {
    return await executeLaneCall(async (apiKey) => {
        if (!chat || currentApiKey !== apiKey) {
            initializeChat(apiKey);
        }
        return await chat!.sendMessageStream({ message: messageParts });
    }, CHAT_ML_POOL);
}
