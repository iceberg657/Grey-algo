
import { GoogleGenAI, Chat } from "@google/genai";
import { getStoredGlobalAnalysis } from './globalMarketService';

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

export function initializeChat(): Chat {
    if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chat = ai.chats.create({
            model: 'gemini-2.5-flash', // Flash for speed in chat
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
