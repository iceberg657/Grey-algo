
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, runWithModelFallback, initializeApiKey } from './retryUtils.js';
import { BASE_SYSTEM_INSTRUCTION } from './identity.js';

let currentChat: Chat | null = null;
let currentApiKey = '';
let currentModel = CHAT_MODELS[0];
let messageCount = 0;

const MAX_PROMPT_LENGTH = 35000; // Safe threshold for single prompt text (~8-10k tokens)
const MAX_CONVERSATION_TURNS = 12; // Prune chat instance after 12 turns to prevent payload overload

export function initializeChat(apiKey: string, model: string): Chat {
    const ai = new GoogleGenAI({ apiKey });
    currentApiKey = apiKey;
    currentModel = model;
    messageCount = 0;
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
    const key = getChatPool()[0] || '';
    if (!currentChat) return initializeChat(key, CHAT_MODELS[0]);
    return currentChat;
}

export function resetChat(): void {
    currentChat = null;
    messageCount = 0;
}

export function getCurrentModelName(): string {
    return currentModel;
}

/**
 * Sanitizes long text prompts to prevent HTTP payload overflow or token limits.
 */
function sanitizeMessageParts(messageParts: any): any {
    if (Array.isArray(messageParts)) {
        return messageParts.map(part => {
            if (part && typeof part.text === 'string') {
                if (part.text.length > MAX_PROMPT_LENGTH) {
                    const head = part.text.slice(0, 16000);
                    const tail = part.text.slice(-16000);
                    const truncatedCount = part.text.length - 32000;
                    return {
                        ...part,
                        text: `${head}\n\n[... Note: ${truncatedCount} characters of middle input optimized for streaming stability ...]\n\n${tail}`
                    };
                }
            }
            return part;
        });
    }
    return messageParts;
}

export async function sendMessageStreamWithRetry(
    messageParts: any, 
    onRetry?: (delayMs: number) => void
): Promise<AsyncIterable<GenerateContentResponse>> {
    const sanitizedParts = sanitizeMessageParts(messageParts);

    return await executeLaneCall(async (apiKey) => {
        return await runWithModelFallback(CHAT_MODELS, async (modelId) => {
            // Auto-prune chat history if message count exceeds max turns to prevent massive payloads
            messageCount++;
            if (!currentChat || currentApiKey !== apiKey || currentModel !== modelId || messageCount > MAX_CONVERSATION_TURNS) {
                initializeChat(apiKey, modelId);
            }

            try {
                return await currentChat!.sendMessageStream({ message: sanitizedParts });
            } catch (err: any) {
                console.warn("[chatService] Chat stream failed, attempting direct model fallback generator:", err);
                // Reset chat state on structural failure to prevent stuck state
                resetChat();
                
                // Direct model streaming fallback in case SDK Chat state is corrupted or overloaded
                const ai = new GoogleGenAI({ apiKey });
                const contents = Array.isArray(sanitizedParts) ? sanitizedParts : [sanitizedParts];
                return await ai.models.generateContentStream({
                    model: modelId,
                    contents: contents,
                    config: {
                        systemInstruction: BASE_SYSTEM_INSTRUCTION,
                        tools: [{ googleSearch: {} }],
                        temperature: 0.3,
                    }
                });
            }
        }, onRetry);
    }, getChatPool);
}

