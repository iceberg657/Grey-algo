import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.example' });

async function run() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY || process.env.VITE_API_KEY_1;
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: "Hello",
        });
        console.log(JSON.stringify(res, null, 2));
    } catch (e: any) {}
}
run();
