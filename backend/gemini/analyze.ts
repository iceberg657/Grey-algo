import { Request, Response } from 'express';

const STANDARD_FLASH_CASCADE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemma-4-31b',
  'gemma-4-26b',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

const LITE_CASCADE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemma-4-26b',
  'gemma-4-31b',
];

function getModelAliases(model: string): string[] {
  const clean = model.replace(/^models\//, '');
  if (clean === 'gemma-4-26b') return ['gemma-4-26b-a4b-it', 'models/gemma-4-26b-a4b-it'];
  if (clean === 'gemma-4-31b') return ['gemma-4-31b-it', 'models/gemma-4-31b-it'];
  return [model];
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, contents, config, apiKey: clientApiKey } = req.body;
  const rawModel = typeof model === 'string' ? model.replace(/^models\//, '') : 'gemini-3.5-flash-lite';
  const isLite = rawModel.includes('lite') || rawModel.includes('gemma');

  const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

  // Analysis Keys pool (Keys 1-4, Key 10, and GEMINI_API_KEY)
  const candidateKeys = [
    process.env.API_KEY_10,
    process.env.GEMINI_API_KEY_10,
    process.env.API_KEY_3,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
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
  // Prioritize the requested model first, then the remaining models in cascade
  const baseSequence = isLite 
    ? (LITE_CASCADE.includes(rawModel) ? [rawModel, ...LITE_CASCADE.filter(m => m !== rawModel)] : [rawModel, ...LITE_CASCADE])
    : (STANDARD_FLASH_CASCADE.includes(rawModel) ? [rawModel, ...STANDARD_FLASH_CASCADE.filter(m => m !== rawModel)] : [rawModel, ...STANDARD_FLASH_CASCADE]);

  const modelSequence: string[] = [];
  for (const m of baseSequence) {
    for (const alias of getModelAliases(m)) {
      if (!modelSequence.includes(alias)) modelSequence.push(alias);
    }
  }

  const { GoogleGenAI } = await import('@google/genai');

  let lastError: any = null;

  for (const targetModel of modelSequence) {
    for (const apiKey of uniqueKeys) {
      try {
        console.log(`[GeminiProxy] Analyzing with ${targetModel} (key: ...${apiKey.slice(-4)}) [Mode: ${isLite ? 'Sniper/Lite' : 'Standard Flash'}]`);
        const ai = new GoogleGenAI({ apiKey });

        const isGemmaModel = targetModel.toLowerCase().includes('gemma');
        const effectiveConfig: any = config ? { ...config } : {};
        let contentsForModel = contents;

        if (isGemmaModel) {
          // Gemma models in Google AI API do NOT support OpenAPI responseSchema or systemInstruction in config
          let schemaString = '';
          if (effectiveConfig.responseSchema) {
            schemaString = `\n[MANDATORY JSON RESPONSE SCHEMA]:\n` + JSON.stringify(effectiveConfig.responseSchema) + `\n\nYou must return a valid JSON object matching the above schema.\n\n`;
            delete effectiveConfig.responseSchema;
          }
          
          if (schemaString && Array.isArray(contents) && contents.length > 0) {
             const firstContent = { ...contents[0] };
             if (firstContent.parts && Array.isArray(firstContent.parts)) {
                 firstContent.parts = [ { text: schemaString }, ...firstContent.parts ];
             } else {
                 firstContent.parts = [ { text: schemaString + "\n" + JSON.stringify(firstContent) } ];
             }
             contentsForModel = [firstContent, ...contents.slice(1)];
             // If we already appended it, reset it so systemInstruction block doesn't add it again
             schemaString = '';
          }

          if (effectiveConfig.systemInstruction) {
            const sysInst = typeof effectiveConfig.systemInstruction === 'string'
              ? effectiveConfig.systemInstruction
              : JSON.stringify(effectiveConfig.systemInstruction);
            delete effectiveConfig.systemInstruction;

            if (Array.isArray(contents) && contents.length > 0) {
              const firstContent = { ...contents[0] };
              if (firstContent.parts && Array.isArray(firstContent.parts)) {
                firstContent.parts = [
                  { text: schemaString },
                  { text: `[SYSTEM INSTRUCTIONS]:\n${sysInst}\n\n` },
                  ...firstContent.parts
                ];
              } else {
                firstContent.parts = [{ text: schemaString + `[SYSTEM INSTRUCTIONS]:\n${sysInst}\n\n${JSON.stringify(firstContent)}` }];
              }
              contentsForModel = [firstContent, ...contents.slice(1)];
            }
          }

          effectiveConfig.responseMimeType = 'application/json';
        }

        const sdkResponse = await ai.models.generateContent({
          model: targetModel,
          contents: contentsForModel,
          config: effectiveConfig,
        });

        if (sdkResponse && sdkResponse.candidates && sdkResponse.candidates.length > 0) {
          const plainResponse = JSON.parse(JSON.stringify(sdkResponse));
          plainResponse.text = sdkResponse.text;
          return res.status(200).json(plainResponse);
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
