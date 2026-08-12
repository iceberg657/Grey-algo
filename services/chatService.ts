
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

    // Resilient async generator that cascades across CHAT_MODELS if a 429 or stream failure occurs
    async function* resilientStream(): AsyncGenerator<GenerateContentResponse> {
        await initializeApiKey();
        const pool = getChatPool();
        let lastError: any = null;

        for (const modelId of CHAT_MODELS) {
            try {
                const stream = await executeLaneCall(async (apiKey) => {
                    messageCount++;
                    if (!currentChat || currentApiKey !== apiKey || currentModel !== modelId || messageCount > MAX_CONVERSATION_TURNS) {
                        initializeChat(apiKey, modelId);
                    }

                    try {
                        return await currentChat!.sendMessageStream({ message: sanitizedParts });
                    } catch (err: any) {
                        console.warn(`[chatService] Stream initialization failed on ${modelId}, using direct fallback:`, err?.message || err);
                        resetChat();
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
                }, pool);

                let yieldedAny = false;
                for await (const chunk of stream) {
                    yieldedAny = true;
                    yield chunk;
                }

                if (yieldedAny) {
                    return; // Successfully completed response stream
                }
            } catch (err: any) {
                lastError = err;
                const msg = String(err?.message || (typeof err === 'object' ? JSON.stringify(err) : err) || '').toLowerCase();
                const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted') || err?.status === 429;
                console.warn(`[chatService] Model ${modelId} hit error (Quota 429: ${isQuota}). Cascading to next model...`, err?.message || err);
                resetChat();
                if (onRetry) onRetry(1000);
            }
        }

        if (lastError) throw lastError;
    }

    return resilientStream();
}

