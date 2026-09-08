import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

// Generate simulated ~2,000 token test payload of market structure and orderbook quotes
function generate2KTokenBenchmarkPayload(): string {
  const chunks: string[] = [];
  chunks.push("DIAGNOSTIC BENCHMARK: 2,000 TOKEN MODEL STABILITY & THROUGHPUT TEST");
  chunks.push("Timestamp: " + new Date().toISOString());
  chunks.push("Evaluating Neural Link Ingestion Latency, Token Deserialization, and Structural Confluence Processing.");

  for (let i = 1; i <= 35; i++) {
    const epoch = 1715000000 + i * 900;
    const o = (39500 + Math.sin(i) * 150).toFixed(2);
    const h = (Number(o) + 35.5).toFixed(2);
    const l = (Number(o) - 28.2).toFixed(2);
    const c = (Number(o) + Math.cos(i) * 20).toFixed(2);
    const vol = Math.floor(800 + Math.random() * 1200);
    chunks.push(`[BAR_${i.toString().padStart(2, '0')}] epoch:${epoch} O:${o} H:${h} L:${l} C:${c} V:${vol} DOM_BID_VOL:${vol * 2} DOM_ASK_VOL:${Math.floor(vol * 1.8)} SPREAD_PIPS:1.2 IMBALANCE:1.15`);
  }

  chunks.push("TASK: Verify model integrity. Return JSON with status: 'ONLINE', latencyCheck: 'PASSED', tokenCapacity: 2000, and recommendedAction: 'EXECUTE'.");
  return chunks.join('\n');
}

export default async function healthTestHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model = 'gemini-3.5-flash', apiKey: clientApiKey } = req.body;
  const rawModel = typeof model === 'string' ? model.replace(/^models\//, '') : 'gemini-3.5-flash';

  const candidateKeys = [
    process.env.API_KEY_10,
    process.env.GEMINI_API_KEY_10,
    process.env.API_KEY_3,
    process.env.GEMINI_API_KEY,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_5,
    process.env.API_KEY_6,
    clientApiKey,
  ].filter(isValid).map((k: any) => k.trim());

  const uniqueKeys = Array.from(new Set(candidateKeys));

  if (uniqueKeys.length === 0) {
    return res.status(400).json({ 
      status: 'OFFLINE',
      error: 'Gemini API keys unavailable for latency probe.',
      latencyMs: 0,
      trafficHoldUp: true
    });
  }

  const testPayload = generate2KTokenBenchmarkPayload();
  const startTime = Date.now();

  const primaryKey = uniqueKeys[0];

  try {
    const ai = new GoogleGenAI({ apiKey: primaryKey });
    const response = await ai.models.generateContent({
      model: rawModel,
      contents: [{ role: 'user', parts: [{ text: testPayload }] }],
      config: {
        maxOutputTokens: 120,
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const latencyMs = Date.now() - startTime;
    const isHoldUp = latencyMs > 1500;
    const status = latencyMs < 600 ? 'OPTIMAL' : (latencyMs <= 1500 ? 'MODERATE' : 'HOLD_UP');

    return res.json({
      status,
      model: rawModel,
      latencyMs,
      trafficHoldUp: isHoldUp,
      testedTokens: 2048,
      throughput: Math.round(2048 / (latencyMs / 1000)),
      summary: isHoldUp 
        ? `Traffic hold-up detected (${latencyMs}ms latency). High data queue.` 
        : `Model online & stable (${latencyMs}ms latency, ~2,000 tokens tested).`,
      timestamp: Date.now()
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(502).json({
      status: 'OFFLINE',
      model: rawModel,
      latencyMs,
      trafficHoldUp: true,
      error: error?.message || 'Model probe timed out',
      summary: 'Model link offline or rate-limited. Hold-up active.',
      timestamp: Date.now()
    });
  }
}
