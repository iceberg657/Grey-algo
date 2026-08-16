import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const MODELS_TO_TRY = [
  'gemini-3.7-flash',       // Model 1
  'gemini-3.6-flash',       // Model 2
  'gemini-3.5-flash',       // Model 3
  'gemini-3-flash-preview', // Model 4
  'gemini-3.5-flash-lite',  // Model 5
  'gemini-3.1-flash-lite',  // Model 6
  'gemma-4-26b',            // Model 7
  'gemma-4-31b',            // Model 8
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

  const { contents, systemInstruction, temperature = 0.3, selectedModel, apiKey: clientApiKey } = req.body;

  const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

  // Explicit instruction: Use API Key 5 and 6 primarily for the Chat page, with reserve pool as fallback
  const primaryChatKeys = [
    process.env.API_KEY_5,
    process.env.GEMINI_API_KEY_5,
    process.env.API_KEY_6,
    process.env.GEMINI_API_KEY_6,
    clientApiKey,
  ].filter(isValid).map((k: any) => k.trim());

  // Reserve fallback keys in case keys 5 and 6 hit 429 quota exhaustion
  const reserveKeys = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_7,
    process.env.API_KEY_8,
    process.env.API_KEY_9,
    process.env.API_KEY_10,
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
  ].filter(isValid).map((k: any) => k.trim());

  // Deduplicate keys preserving primary order first
  const uniqueKeys = Array.from(new Set([...primaryChatKeys, ...reserveKeys]));

  if (uniqueKeys.length === 0) {
    console.error('[ChatProxy] No valid API key (5 or 6) found.');
    return res.status(400).json({ error: 'Gemini API key (Key 5 or 6) not configured or invalid on server.' });
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

  // Prioritize selectedModel if requested by user, followed by the rest of the cascade pool
  const chosenModel = typeof selectedModel === 'string' && selectedModel.trim().length > 0 ? selectedModel.trim() : 'gemini-3.7-flash';
  const baseSequence = [
    chosenModel,
    ...MODELS_TO_TRY.filter(m => m !== chosenModel && !chosenModel.startsWith(m))
  ];

  const modelSequence: string[] = [];
  for (const m of baseSequence) {
    for (const alias of getModelAliases(m)) {
      if (!modelSequence.includes(alias)) modelSequence.push(alias);
    }
  }

  let success = false;
  let lastError: any = null;

  for (const model of modelSequence) {
    for (const apiKey of uniqueKeys) {
      try {
        console.log(`[ChatProxy] Streaming with model: ${model} (key: ...${apiKey.slice(-4)})`);
        const ai = new GoogleGenAI({ apiKey });

        const isGemma = model.includes('gemma');
        let contentsForModel = formattedContents;

        if (isGemma && systemInstruction) {
          const systemPromptHeader = `[INSTITUTIONAL DIRECTIVES - MANDATORY PROTOCOL & FORMATTING]:\n${systemInstruction}\n\n[USER INQUIRY / TASK]:\n`;
          if (Array.isArray(formattedContents) && formattedContents.length > 0) {
            const firstTurn = formattedContents[0];
            const parts = firstTurn.parts && Array.isArray(firstTurn.parts) ? firstTurn.parts : [{ text: String(firstTurn) }];
            contentsForModel = [
              {
                role: 'user',
                parts: [
                  { text: systemPromptHeader },
                  ...parts
                ]
              },
              ...formattedContents.slice(1)
            ];
          }
        }

        const stream = await ai.models.generateContentStream({
          model: model,
          contents: contentsForModel,
          config: {
            systemInstruction: isGemma ? undefined : systemInstruction,
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
        console.warn(`[ChatProxy] Model ${model} note with key ...${apiKey.slice(-4)}:`, err?.message || err);
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
