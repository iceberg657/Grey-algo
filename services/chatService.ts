
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, runWithModelFallback, initializeApiKey } from './retryUtils.js';
import { BASE_SYSTEM_INSTRUCTION } from './identity.js';

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
