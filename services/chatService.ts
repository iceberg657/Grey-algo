
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { executeLaneCall, getChatPool, CHAT_MODELS, initializeApiKey } from './retryUtils.js';
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
            systemInstruction: model.includes('gemma') ? undefined : BASE_SYSTEM_INSTRUCTION,
            temperature: 0.3,
        },
    });
    return currentChat;
}

export async function getChatInstance(preferredModel?: string): Promise<Chat> {
    await initializeApiKey();
    const key = getChatPool()[0] || '';
    const targetModel = preferredModel || currentModel || CHAT_MODELS[0];
    if (!currentChat || currentModel !== targetModel) {
        return initializeChat(key, targetModel);
    }
    return currentChat;
}

export function resetChat(): void {
    currentChat = null;
    messageCount = 0;
}

export function getCurrentModelName(): string {
    return currentModel;
}

export function setCurrentModelName(model: string): void {
    currentModel = model;
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
    onRetry?: (delayMs: number) => void,
    preferredModel?: string
): Promise<AsyncIterable<any>> {
    const sanitizedParts = sanitizeMessageParts(messageParts);
    const chosenModel = preferredModel || currentModel || CHAT_MODELS[0];
    currentModel = chosenModel;

    // Resilient async generator that cascades across CHAT_MODELS if a 429 or stream failure occurs
    async function* resilientStream(): AsyncGenerator<any> {
        await initializeApiKey();
        const pool = getChatPool();
        const clientKey = pool[0] || '';

        // Priority sequence: requested preferred model first, then fallback through CHAT_MODELS
        const modelsToTry = preferredModel && CHAT_MODELS.includes(preferredModel)
            ? [preferredModel, ...CHAT_MODELS.filter(m => m !== preferredModel)]
            : CHAT_MODELS;

        // 1. Try server SSE proxy first (/api/gemini/chat with Key 5 and 6)
        try {
            const proxyRes = await fetch('/api/gemini/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: Array.isArray(sanitizedParts) ? sanitizedParts : [{ text: String(sanitizedParts) }],
                    systemInstruction: BASE_SYSTEM_INSTRUCTION,
                    temperature: 0.3,
                    selectedModel: chosenModel,
                    apiKey: clientKey
                })
            });

            if (proxyRes.ok && proxyRes.body) {
                const reader = proxyRes.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';
                let yieldedAny = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data:')) continue;
                        const dataStr = trimmed.replace(/^data:\s*/, '');
                        if (dataStr === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.error) {
                                throw new Error(parsed.error);
                            }
                            if (parsed.model) {
                                currentModel = parsed.model;
                            }
                            if (parsed.text) {
                                yieldedAny = true;
                                yield {
                                    text: parsed.text,
                                    model: parsed.model || currentModel,
                                    candidates: [{
                                        content: { parts: [{ text: parsed.text }] }
                                    }]
                                };
                            }
                        } catch (e: any) {
                            if (e.message && e.message.includes('All models exhausted')) throw e;
                        }
                    }
                }

                if (yieldedAny) {
                    return; // Completed via server proxy SSE
                }
            }
        } catch (proxyErr: any) {
            console.warn('[chatService] Server SSE proxy unavailable or exhausted, falling back to client lane cascade:', proxyErr?.message || proxyErr);
            if (onRetry) onRetry(500);
        }

        // 2. Direct client-side cascade fallback
        let lastError: any = null;

        const resolveModelId = (id: string) => {
            if (id === 'gemma-4-26b') return 'gemma-4-26b-a4b-it';
            if (id === 'gemma-4-31b') return 'gemma-4-31b-it';
            return id;
        };

        for (const modelId of modelsToTry) {
            const actualModelId = resolveModelId(modelId);
            try {
                const stream = await executeLaneCall(async (apiKey) => {
                    messageCount++;
                    if (!currentChat || currentApiKey !== apiKey || currentModel !== modelId || messageCount > MAX_CONVERSATION_TURNS) {
                        initializeChat(apiKey, actualModelId);
                    }

                    try {
                        if (actualModelId.includes('gemma')) {
                            // Gemma fallback using generateContentStream with prepended prompt
                            const ai = new GoogleGenAI({ apiKey });
                            const gemmaPrompt = `[INSTITUTIONAL DIRECTIVES - MANDATORY PROTOCOL & FORMATTING]:\n${BASE_SYSTEM_INSTRUCTION}\n\n[USER INQUIRY / TASK]:\n`;
                            const rawParts = Array.isArray(sanitizedParts) ? sanitizedParts : [{ text: String(sanitizedParts) }];
                            const contents = [{ role: 'user', parts: [{ text: gemmaPrompt }, ...rawParts] }];
                            return await ai.models.generateContentStream({
                                model: actualModelId,
                                contents: contents,
                                config: {
                                    temperature: 0.3,
                                }
                            });
                        }
                        return await currentChat!.sendMessageStream({ message: sanitizedParts });
                    } catch (err: any) {
                        console.warn(`[chatService] Stream initialization failed on ${modelId}, using direct generateContentStream fallback:`, err?.message || err);
                        resetChat();
                        const ai = new GoogleGenAI({ apiKey });
                        const isGemma = actualModelId.includes('gemma');
                        const rawParts = Array.isArray(sanitizedParts) ? sanitizedParts : [{ text: String(sanitizedParts) }];
                        const contents = isGemma 
                            ? [{ role: 'user', parts: [{ text: `[INSTITUTIONAL DIRECTIVES - MANDATORY PROTOCOL & FORMATTING]:\n${BASE_SYSTEM_INSTRUCTION}\n\n[USER INQUIRY / TASK]:\n` }, ...rawParts] }]
                            : (Array.isArray(sanitizedParts) ? sanitizedParts : [{ parts: [sanitizedParts] }]);
                        return await ai.models.generateContentStream({
                            model: actualModelId,
                            contents: contents,
                            config: {
                                systemInstruction: isGemma ? undefined : BASE_SYSTEM_INSTRUCTION,
                                temperature: 0.3,
                            }
                        });
                    }
                }, pool);

                let yieldedAny = false;
                for await (const chunk of stream) {
                    yieldedAny = true;
                    currentModel = modelId;
                    yield {
                        ...chunk,
                        text: chunk.text,
                        model: modelId
                    };
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

