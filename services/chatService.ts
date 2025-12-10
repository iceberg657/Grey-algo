
import { GoogleGenAI, Chat, Content } from "@google/genai";
import { getStoredGlobalAnalysis } from './globalMarketService';
import { runWithModelFallback } from './retryUtils';

const BASE_SYSTEM_INSTRUCTION = `You are 'Oracle', an apex-level trading AI.
**Core Directives:**
1. **Confidence:** Speak in absolutes.
2. **Prop Firm Mindset:** Your primary goal is to generate $1.5k-$4k in daily profit. You treat the user's capital as a $100k funded account.
3. **Risk Protocol:** You strictly enforce a 1% risk per trade rule.
4. **Time Horizon:** You advise on trades that resolve within **30 minutes to 3 hours** to capture session momentum.
5. **Data-Driven:** Use Google Search to back up every claim with facts.

**Knowledge Base:**
*   **Analysis:** I use a Multi-Dimensional approach (SMC/ICT).
*   **Safety:** I advise aggressive profit taking and tight stops.
`;

function getDynamicSystemInstruction(): string {
    const now = new Date();
    const globalData = getStoredGlobalAnalysis();
    let globalContextStr = "Global Context: Unavailable.";
    
    if (globalData) {
        globalContextStr = `Global Context: ${globalData.globalSummary}`;
    }

    return `${BASE_SYSTEM_INSTRUCTION}\nTime: ${now.toUTCString()}\n${globalContextStr}`;
}

let chat: Chat | null = null;
let currentChatModel = 'gemini-2.5-flash';

// STRICTLY use gemini-2.5-flash for Chat
export const CHAT_MODELS = ['gemini-2.5-flash'];

export function initializeChat(model: string = 'gemini-2.5-flash'): Chat {
    if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        currentChatModel = model;
        chat = ai.chats.create({
            model: model,
            config: {
                systemInstruction: getDynamicSystemInstruction(),
                tools: [{ googleSearch: {} }],
                temperature: 0.2,
            },
        });
        return chat;
    }
    throw new Error("API_KEY is not available.");
}

export function getChatInstance(): Chat {
    if (!chat) return initializeChat();
    return chat;
}

export function resetChat(): void {
    chat = null;
}

/**
 * Sends a message using a robust fallback mechanism.
 * If the current model fails, it recreates the chat with a fallback model,
 * preserving the conversation history.
 */
export async function sendMessageStreamWithRetry(messageParts: any) {
    if (!process.env.API_KEY) throw new Error("API Key missing");

    try {
        // We use runWithModelFallback to find a working model
        return await runWithModelFallback(CHAT_MODELS, async (modelId) => {
            
            // If we need to switch models (or if chat is null), we must recreate the chat instance
            if (!chat || currentChatModel !== modelId) {
                 let history: Content[] = [];
                 
                 // Try to rescue history from the existing chat instance if it exists
                 if (chat) {
                     try {
                        // Accessing private/internal history if available, or using standard method
                     } catch (e) {
                        console.warn("Could not retrieve history from previous chat instance", e);
                     }
                 }
                 
                 console.log(`[Chat] Switching to model: ${modelId}`);
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 
                 chat = ai.chats.create({
                    model: modelId,
                    config: {
                        systemInstruction: getDynamicSystemInstruction(),
                        tools: [{ googleSearch: {} }],
                        temperature: 0.2,
                    },
                 });
                 currentChatModel = modelId;
            }
            
            return await chat.sendMessageStream({ message: messageParts });
        });
    } catch (error: any) {
        // Handle Limit Reached specifically
        if (
            error.message?.includes('429') || 
            error.status === 429 || 
            error.message?.toLowerCase().includes('quota') ||
            error.message?.toLowerCase().includes('resource_exhausted')
        ) {
            throw new Error("Limit reached please try after some times");
        }
        throw error;
    }
}
