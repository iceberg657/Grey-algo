
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, CHAT_POOL, CHAT_MODELS, runWithModelFallback } from './retryUtils';

const BASE_SYSTEM_INSTRUCTION = `You are 'Oracle', a high-frequency trading AI.
Confidence is mandatory. Treat capital as a $100k funded account. 1% risk per trade.
Back all claims with Google Search results.`;

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

export function getChatInstance(): Chat {
    // Default to Lane 4 Key (K7)
    const key = process.env.API_KEY_7 || process.env.API_KEY || '';
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
    }, CHAT_POOL);
}
