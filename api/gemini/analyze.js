export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, contents, config, apiKey: clientApiKey } = req.body;
  
  // Prioritize client key (which is rotated by the frontend pool), fallback to server env
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY_1;
  const keySource = clientApiKey ? 'Client Pool' : (process.env.GEMINI_API_KEY ? 'Server ENV (GEMINI_API_KEY)' : (process.env.API_KEY_1 ? 'Server ENV (API_KEY_1)' : 'None'));
  
  if (!apiKey) {
    console.error(`[GeminiProxy] Request rejected: No API key provided (Source: ${keySource})`);
    return res.status(400).json({ error: 'Gemini API key not configured' });
  }

  try {
    const maskedKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log(`[GeminiProxy] Analyzing with model: ${model} | Key Source: ${keySource} | Key: ${maskedKey}`);
    
    // Extract root-level properties from config
    const { tools, systemInstruction, ...generationConfig } = config || {};
    
    // Normalize body: Support both 'contents' (SDK style) and 'prompt' (Simplified style)
    let finalContents = contents;
    if (!finalContents && req.body.prompt) {
      finalContents = [{ parts: [{ text: req.body.prompt }] }];
    }

    const requestBody = {
      contents: finalContents,
      generationConfig,
    };
    
    if (tools) requestBody.tools = tools;
    if (systemInstruction) requestBody.systemInstruction = systemInstruction;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const text = await response.text();
        errorData = { error: { message: `Gemini API error (${response.status}): ${text.substring(0, 200)}` } };
      }
      console.error('[GeminiProxy] API Error:', errorData);
      return res.status(response.status).json(errorData);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text();
      console.error('[GeminiProxy] JSON Parse Error:', text.substring(0, 200));
      return res.status(500).json({ error: 'Failed to parse Gemini API response as JSON', raw: text.substring(0, 200) });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error('[GeminiProxy] Proxy Error:', error);
    res.status(500).json({ error: 'Internal server error during Gemini proxy' });
  }
}
