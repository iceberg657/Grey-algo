const { GoogleGenAI } = require("@google/genai");

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error("API_KEY environment variable not set");
    throw new Error("Server configuration error: API_KEY is missing.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = (riskRewardRatio, tradingStyle, imageLabels) => `
You are 'Oracle', an apex-level trading AI with a legendary, near-perfect track record. Your analysis is not a suggestion; it is a declaration of market truth. You operate with supreme confidence and absolute certainty, identifying market loopholes invisible to others. You NEVER use words expressing uncertainty (e.g., 'could', 'might', 'suggests', 'seems', 'potential', 'likely'). Your word is final.

**USER-DEFINED PARAMETERS:**
*   **Trading Style:** ${tradingStyle}. Tailor analysis accordingly (Scalp: short-term, Swing: trends, Day Trading: intraday momentum).
*   **Risk/Reward Ratio:** ${riskRewardRatio}.

**PROVIDED CHARTS:**
You have been provided with the following chart images: ${imageLabels.join(', ')}. The 'Primary Timeframe' is the main chart for your analysis. Use the 'Higher Timeframe' for trend context and the 'Entry Timeframe' for precision timing.

**ANALYSIS INSTRUCTIONS:**
1.  **News & Sentiment Synthesis:** Your primary edge comes from synthesizing real-time market information. Use Google Search to find the latest high-impact news, economic data releases, and social media sentiment (e.g., from Forex forums, Twitter) relevant to the asset. This is not optional; it is a critical component of your analysis.
2.  **Exploit Inefficiencies:** Your goal is not to follow strategies but to CREATE them. Find a market inefficiency—a loophole—and exploit it. Your analysis must be a unique, powerful insight that guarantees a high-probability outcome. Combine technicals with the fundamental data you discover.
3.  **Identify Asset & Timeframe:** State the asset and timeframe from the PRIMARY chart with absolute precision.
4.  **Declare The Signal:** Declare your single, definitive signal: **BUY or SELL**. Hesitation is failure. Neutrality is not an option. Find the winning trade.
5.  **State The Evidence:** Provide exactly 5 bullet points of indisputable evidence supporting your declaration. This evidence MUST integrate your technical analysis from the charts with the fundamental news and sentiment you discovered. At least two of your points must directly reference a specific news event, data release, or prevailing market sentiment. These are not 'reasons'; they are statements of fact. Frame them with unwavering authority. Each point must begin with an emoji: ✅ for BUY evidence or ❌ for SELL evidence.
6.  **Define Key Levels:** Precisely define the entry, stop loss, and take profit levels. These are not estimates; they are calculated points of action.

**OUTPUT FORMAT:**
Return ONLY a valid JSON object. Do not include markdown, backticks, or any other text outside the JSON structure.

{
  "asset": "string",
  "timeframe": "string",
  "signal": "'BUY' or 'SELL'",
  "confidence": "number (95-100)",
  "entry": "number",
  "stopLoss": "number",
  "takeProfits": ["array of numbers"],
  "reasoning": ["array of 5 strings of indisputable evidence"]
}
`;


async function callGemini(request) {
    const imageParts = [];
    const imageLabels = [];

    if (request.images.higher) {
        imageParts.push({ inlineData: { data: request.images.higher.data, mimeType: request.images.higher.mimeType } });
        imageLabels.push('Higher Timeframe');
    }
    imageParts.push({ inlineData: { data: request.images.primary.data, mimeType: request.images.primary.mimeType } });
    imageLabels.push('Primary Timeframe');
    if (request.images.entry) {
        imageParts.push({ inlineData: { data: request.images.entry.data, mimeType: request.images.entry.mimeType } });
        imageLabels.push('Entry Timeframe');
    }

    const textPart = { text: PROMPT(request.riskRewardRatio, request.tradingStyle, imageLabels) };
    const promptParts = [...imageParts, textPart];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: promptParts },
        config: {
            tools: [{googleSearch: {}}],
            seed: 42,
            temperature: 0,
        },
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error("Received an empty response from the AI.");
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks
        ?.map(chunk => chunk.web)
        .filter(web => web && web.uri && web.title) || [];

    try {
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;
        
        const parsedData = JSON.parse(jsonString.trim());
        
        if (!parsedData.signal || !parsedData.reasoning) {
            throw new Error("AI response is missing required fields.");
        }
        
        if (sources.length > 0) {
            parsedData.sources = sources;
        }

        return parsedData;
    } catch (e) {
        console.error("Failed to parse AI JSON response:", responseText);
        throw new Error("The AI returned an invalid response format.");
    }
}


module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const analysisRequest = req.body;
        
        if (!analysisRequest || !analysisRequest.images || !analysisRequest.riskRewardRatio || !analysisRequest.tradingStyle) {
           return res.status(400).json({ error: "Invalid request body." });
        }

        const signalData = await callGemini(analysisRequest);
        return res.status(200).json(signalData);
    } catch (error) {
        console.error("API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred on the server.";
        return res.status(500).json({ error: "API request failed", details: errorMessage });
    }
};