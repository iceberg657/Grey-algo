import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const models = await ai.models.list();
  const names = [];
  for await (const m of models) {
    names.push(m.name);
  }
  console.log(names.filter(n => n.includes('gemma')));
}
test();
