export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, contents, config, apiKey: clientApiKey } = req.body;
  
  // Prioritize client key (rotated by frontend), fallback to standard GEMINI_API_KEY, then others
  const apiKey = (clientApiKey && clientApiKey.length > 5) 
    ? clientApiKey 
    : (process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY);
  
  if (!apiKey || apiKey.length < 5) {
    console.error('[GeminiProxy] No valid API key found');
    return res.status(400).json({ error: 'Gemini API key not configured or invalid' });
  }

  try {
    console.log(`[GeminiProxy] Analyzing with model: ${model}...`);
    
    // Extract root-level properties from config
    const { tools, systemInstruction, ...generationConfig } = config || {};
    
    const requestBody = {
      contents,
      generationConfig,
    };
    
    if (tools) requestBody.tools = tools;
    if (systemInstruction) requestBody.systemInstruction = systemInstruction;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

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
