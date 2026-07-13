import { GoogleGenAI } from '@google/genai';
import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contents, apiKey: clientApiKey } = req.body;
  
  const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

  // Prioritize client key
  const apiKey = (isValid(clientApiKey)) 
    ? clientApiKey.trim() 
    : (process.env.API_KEY_3 || process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY)?.trim();
  
  if (!apiKey || apiKey.length < 5) {
    console.error('[AntigravityProxy] No valid API key found.');
    return res.status(400).json({ error: 'Gemini API key not configured or invalid.' });
  }

  try {
    console.log(`[AntigravityProxy] Executing Antigravity Agent...`);
    const ai = new GoogleGenAI({ apiKey });
    
    // Format the prompt from the parts (assuming contents[0].parts[0].text is provided)
    const prompt = contents?.[0]?.parts?.[0]?.text || "Analyze the current market setup.";

    // The Interactions API calls model 'agents/antigravity'
    // It can take some time, but we don't have streaming via REST right now, so we wait for the final text
    const interaction = await ai.interactions.create({
      agent: 'antigravity-preview-05-2026',
      input: prompt,
      environment: { type: 'remote' },
    });

    let fullOutput = "";
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const textContent = step.content?.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          fullOutput += textContent.text;
        }
      }
    }

    res.status(200).json({
      candidates: [
        {
          content: {
            parts: [{ text: fullOutput }]
          }
        }
      ]
    });
  } catch (error: any) {
    console.error('[AntigravityProxy] Proxy Error:', error);
    res.status(500).json({ error: 'Internal server error during Antigravity execution', details: error.message });
  }
}
