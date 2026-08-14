import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const MODELS_TO_TRY = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contents, systemInstruction, temperature = 0.3, apiKey: clientApiKey } = req.body;

  const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

  // Gather server keys pool
  const serverKeys = [
    process.env.GEMINI_API_KEY,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5,
    process.env.API_KEY_6,
    process.env.API_KEY_7,
    process.env.API_KEY_8,
    process.env.API_KEY_9,
    process.env.API_KEY_10,
    clientApiKey,
  ].filter(isValid).map((k: any) => k.trim());

  // Deduplicate keys
  const uniqueKeys = Array.from(new Set(serverKeys));

  if (uniqueKeys.length === 0) {
    return res.status(400).json({ error: 'Gemini API key not configured or invalid on server.' });
  }

  // Set up SSE headers for streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Ensure prompt structure
  const formattedContents = Array.isArray(contents) 
    ? (contents.length > 0 && contents[0].parts ? contents : [{ role: 'user', parts: contents }])
    : [{ role: 'user', parts: [{ text: String(contents) }] }];

  let success = false;
  let lastError: any = null;

  for (const model of MODELS_TO_TRY) {
    for (const apiKey of uniqueKeys) {
      try {
        console.log(`[ChatProxy] Streaming with model: ${model} (key: ...${apiKey.slice(-4)})`);
        const ai = new GoogleGenAI({ apiKey });

        const stream = await ai.models.generateContentStream({
          model: model,
          contents: formattedContents,
          config: {
            systemInstruction: systemInstruction,
            temperature: temperature,
          }
        });

        let chunkCount = 0;
        for await (const chunk of stream) {
          if (chunk.text) {
            chunkCount++;
            res.write(`data: ${JSON.stringify({ text: chunk.text, model })}\n\n`);
            if (typeof (res as any).flush === 'function') {
              (res as any).flush();
            }
          }
        }

        if (chunkCount > 0) {
          success = true;
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[ChatProxy] Model ${model} failed with key ...${apiKey.slice(-4)}:`, err?.message || err);
        // Continue to next key or next model
      }
    }
  }

  if (!success) {
    console.error('[ChatProxy] All models exhausted on server:', lastError);
    res.write(`data: ${JSON.stringify({ error: lastError?.message || 'All models exhausted' })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
