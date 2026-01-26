
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, CHAT_ML_POOL, LANE_3_MODELS, runWithModelFallback } from './retryUtils';

const BASE_SYSTEM_INSTRUCTION = `You are 'Oracle', a high-frequency trading AI.
Confidence is mandatory. Treat capital as a $100k funded account. 1% risk per trade.
Back all claims with Google Search results.`;

let currentChat: Chat | null = null;
let currentApiKey = '';
let currentModel = LANE_3_MODELS[0];

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
    const key = process.env.API_KEY_6 || process.env.API_KEY || '';
    if (!currentChat) return initializeChat(key, LANE_3_MODELS[0]);
    return currentChat;
}

export function resetChat(): void {
    currentChat = null;
}

export async function sendMessageStreamWithRetry(messageParts: any): Promise<AsyncIterable<GenerateContentResponse>> {
    return await executeLaneCall(async (apiKey) => {
        // LANE 3 CASCADE: 2.5 Flash -> 2.5 Lite -> 2.0 Flash
        // We use model fallback to decide which model to initialize the chat with
        return await runWithModelFallback(LANE_3_MODELS, async (modelId) => {
            if (!currentChat || currentApiKey !== apiKey || currentModel !== modelId) {
                initializeChat(apiKey, modelId);
            }
            return await currentChat!.sendMessageStream({ message: messageParts });
        });
    }, CHAT_ML_POOL);
}
