import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.example' });

async function run() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY || process.env.VITE_API_KEY_1;
    console.log("Using key:", apiKey ? apiKey.slice(0, 5) + "..." : "none");
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const chat = ai.chats.create({
            model: 'gemini-3.5-flash-lite',
            config: {
                systemInstruction: "You are an AI.",
                temperature: 0.3
            }
        });
        const res = await chat.sendMessage({ message: [{ text: "Hello!" }] });
        console.log(res.text);
    } catch (e: any) {
        console.error("Error with gemini-3.5-flash-lite:", e?.status, e?.message);
    }
}
run();
