import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemma-4-26b',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });
    for await (const chunk of responseStream) {
      console.log(chunk.text);
    }
  } catch (e) {
    console.error('ERROR 26b:', e.message);
  }
}
test();
