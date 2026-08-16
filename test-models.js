import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.7-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    });
    for await (const chunk of responseStream) {
      console.log('3.7 SUCCESS:', chunk.text);
    }
  } catch (e) {
    console.error('ERROR 3.7:', e.message);
  }
}
test();
