import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, contents, config, apiKey: clientApiKey } = req.body;
  
  const cleanModel = typeof model === 'string' ? model.replace(/^models\//, '') : 'gemini-2.5-flash';
  
  const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

  // Prioritize API_KEY_10 (as requested for the AI Analyst) and GEMINI_API_KEY_10, then fallback to client key or standard GEMINI_API_KEY
  const apiKey = (process.env.API_KEY_10 || process.env.GEMINI_API_KEY_10)?.trim() || 
    ((isValid(clientApiKey)) 
      ? clientApiKey.trim() 
      : (process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY)?.trim());
  
  if (!apiKey || apiKey.length < 5) {
    console.error('[GeminiProxy] No valid API key found. Checked client key and environment variables.');
    return res.status(400).json({ error: 'Gemini API key not configured or invalid. Please check your .env file or Settings.' });
  }

  try {
    console.log(`[GeminiProxy] Analyzing with model: ${cleanModel}...`);
    
    // Lazy import the SDK
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // The SDK config accepts tools, systemInstruction, temperature, maxOutputTokens, etc.
    const sdkResponse = await ai.models.generateContent({
      model: cleanModel,
      contents: contents,
      config: config
    });

    // The SDK GenerateContentResponse format natively matches the expected JSON (candidates array)
    res.status(200).json(sdkResponse);
  } catch (error: any) {
    console.error('[GeminiProxy] Proxy Error:', error);
    res.status(error?.status || 500).json({ 
      error: 'Internal server error during Gemini proxy', 
      details: error?.message || String(error)
    });
  }
}
