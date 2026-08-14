import { Request, Response } from 'express';

const STANDARD_FLASH_CASCADE = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

const LITE_CASCADE = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, contents, config, apiKey: clientApiKey } = req.body;
  const rawModel = typeof model === 'string' ? model.replace(/^models\//, '') : 'gemini-3.7-flash';
  const isLite = rawModel.includes('lite');

  const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

  // Analysis Keys pool (Keys 1-4, Key 10, and GEMINI_API_KEY)
  const candidateKeys = [
    process.env.API_KEY_10,
    process.env.GEMINI_API_KEY_10,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    clientApiKey,
  ].filter(isValid).map((k: any) => k.trim());

  const uniqueKeys = Array.from(new Set(candidateKeys));

  if (uniqueKeys.length === 0) {
    console.error('[GeminiProxy] No valid API key found.');
    return res.status(400).json({ error: 'Gemini API key not configured or invalid.' });
  }

  // Model sequence selection:
  // Standard mode uses the full 3.x Flash cascade (3.7-flash -> 3.6-flash -> 3.5-flash -> ...)
  // Lite mode uses the Flash-Lite models only (3.5-flash-lite -> 3.1-flash-lite)
  const modelSequence = isLite 
    ? (LITE_CASCADE.includes(rawModel) ? [rawModel, ...LITE_CASCADE.filter(m => m !== rawModel)] : LITE_CASCADE)
    : (STANDARD_FLASH_CASCADE.includes(rawModel) ? [rawModel, ...STANDARD_FLASH_CASCADE.filter(m => m !== rawModel)] : STANDARD_FLASH_CASCADE);

  const { GoogleGenAI } = await import('@google/genai');

  let lastError: any = null;

  for (const targetModel of modelSequence) {
    for (const apiKey of uniqueKeys) {
      try {
        console.log(`[GeminiProxy] Analyzing with ${targetModel} (key: ...${apiKey.slice(-4)}) [Mode: ${isLite ? 'Lite' : 'Standard Flash'}]`);
        const ai = new GoogleGenAI({ apiKey });

        const sdkResponse = await ai.models.generateContent({
          model: targetModel,
          contents: contents,
          config: config,
        });

        if (sdkResponse && sdkResponse.candidates && sdkResponse.candidates.length > 0) {
          return res.status(200).json(sdkResponse);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiProxy] Model ${targetModel} attempt with key ...${apiKey.slice(-4)} failed:`, err?.message || err);
      }
    }
  }

  console.error('[GeminiProxy] All model attempts failed:', lastError);
  res.status(lastError?.status || 500).json({
    error: 'Internal server error during Gemini proxy',
    details: lastError?.message || String(lastError),
  });
}
