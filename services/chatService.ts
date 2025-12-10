
import { GoogleGenAI, Chat, Content } from "@google/genai";
import { getStoredGlobalAnalysis } from './globalMarketService';
import { runWithModelFallback, executeGeminiCall, PRIORITY_KEY_2 } from './retryUtils';

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

// Chat instance storage must be keyed by API Key to ensure we don't try to use a chat created with Key A on Key B
// However, SDK doesn't expose getting the key back easily.
// Strategy: We will re-create the chat session if we switch keys.
let chat: Chat | null = null;
let currentChatModel = 'gemini-2.5-flash';
let currentApiKey = '';

// STRICTLY use gemini-2.5-flash for Chat
export const CHAT_MODELS = ['gemini-2.5-flash'];

export function initializeChat(apiKey: string, model: string = 'gemini-2.5-flash'): Chat {
    const ai = new GoogleGenAI({ apiKey });
    currentChatModel = model;
    currentApiKey = apiKey;
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

export function getChatInstance(): Chat {
    // For initial UI render, we might not have a key picked yet. 
    // Just grab the first available key to return an instance for structure,
    // but actual calls will go through sendMessageStreamWithRetry which handles rotation.
    const key = process.env.API_KEY_1 || process.env.API_KEY_2 || process.env.API_KEY;
    if (!key) throw new Error("No API Key available");
    
    if (!chat) return initializeChat(key);
    return chat;
}

export function resetChat(): void {
    chat = null;
    currentApiKey = '';
}

/**
 * Sends a message using robust key and model fallback.
 */
export async function sendMessageStreamWithRetry(messageParts: any) {
    
    // Prioritize Key 2 for Chat
    return await executeGeminiCall(async (apiKey) => {
        
        return await runWithModelFallback(CHAT_MODELS, async (modelId) => {
            
            // If we switched keys OR models, we must recreate the chat instance.
            // Note: This does lose 'history' in the AI's internal memory for this specific turn 
            // if we fail over mid-conversation, but it's better than crashing.
            if (!chat || currentChatModel !== modelId || currentApiKey !== apiKey) {
                 console.log(`[Chat] Initializing session with Model: ${modelId} (Key ends in ...${apiKey.slice(-4)})`);
                 initializeChat(apiKey, modelId);
            }
            
            return await chat!.sendMessageStream({ message: messageParts });
        });
    }, PRIORITY_KEY_2);
}
