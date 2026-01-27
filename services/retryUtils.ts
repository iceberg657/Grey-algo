
/**
 * GreyAlpha Lane Orchestrator with Neural Cooldown & Model Cascading
 */

const K = {
    P: process.env.API_KEY || '',
    K1: process.env.API_KEY_1 || '',
    K2: process.env.API_KEY_2 || '',
    K3: process.env.API_KEY_3 || '',
    K4: process.env.API_KEY_4 || '',
    K5: process.env.API_KEY_5 || '',
    K6: process.env.API_KEY_6 || '',
    K7: process.env.API_KEY_7 || ''
};

// 1. CHART ANALYSIS (Keys 1, 2, 3, 4)
// Models: 3.0 Pro -> 3.0 Flash -> 2.5 Pro -> 2.5 Flash -> 2.0 Flash
export const ANALYSIS_POOL = [K.K1, K.K2, K.K3, K.K4].filter(k => !!k);
export const ANALYSIS_MODELS = [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
];

// 2. PREDICTION (Key 5)
// Models: 2.5 Flash -> 2.0 Flash
export const PREDICTION_POOL = [K.K5].filter(k => !!k);
export const PREDICTION_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash'
];

// 3. AI ASSETS SUGGESTION (Key 6)
// Models: 2.5 Flash -> Lite -> 2.0
export const SUGGESTION_POOL = [K.K6].filter(k => !!k);
export const SUGGESTION_MODELS = [
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash'
];

// 4. CHAT (Key 7)
// Models: 2.5 Pro -> 2.5 Flash -> 2.0 Flash
export const CHAT_POOL = [K.K7].filter(k => !!k);
export const CHAT_MODELS = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
];

// Missing Exports Definitions
export const SERVICE_POOL = PREDICTION_POOL; // Shared with Prediction (Key 5)
export const SUGGESTION_STRUCTURE_POOL = CHAT_POOL; // Shared with Chat (Key 7)

export const LANE_2_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-2.5-flash'
];

// Helper export for TTS (Prioritize Key 3 within Analysis pool logic or standalone)
export const TTS_KEY = [K.K3].filter(k => !!k);

// Global Penalty Box for exhausted keys
const cooldownMap = new Map<string, number>();
const COOLDOWN_DURATION = 60000; // 60 seconds penalty for 429s

function isThrottled(key: string): boolean {
    const expiry = cooldownMap.get(key);
    if (!expiry) return false;
    if (Date.now() > expiry) {
        cooldownMap.delete(key);
        return false;
    }
    return true;
}

/**
 * Executes a call by rotating through API keys in a pool.
 * If a key hits 429, it goes to the Penalty Box.
 */
export async function executeLaneCall<T>(
    operationFactory: (apiKey: string) => Promise<T>,
    pool: string[]
): Promise<T> {
    const activePool = pool.length > 0 ? pool : [K.P];
    let lastError: any = null;

    const availableKeys = activePool.filter(k => !isThrottled(k));
    const keysToTry = availableKeys.length > 0 ? availableKeys : activePool;

    for (const apiKey of keysToTry) {
        try {
            return await operationFactory(apiKey);
        } catch (error: any) {
            lastError = error;
            const errorMsg = (error.message || '').toLowerCase();
            
            if (errorMsg.includes('429') || error.status === 429) {
                console.warn(`Neural Cooldown initiated for key ending in ...${apiKey.slice(-4)}`);
                cooldownMap.set(apiKey, Date.now() + COOLDOWN_DURATION);
                continue; 
            }
            throw error;
        }
    }
    throw lastError || new Error("All Neural Lanes are currently congested.");
}

export async function executeGeminiCall<T>(op: (k: string) => Promise<T>, pool?: string[]): Promise<T> {
    const activePool = pool || [K.P, ...ANALYSIS_POOL];
    return executeLaneCall(op, activePool);
}

export async function runWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 2,
    baseDelay: number = 3000,
    onRetry?: (delayMs: number) => void
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;
        const msg = (error.message || '').toLowerCase();
        
        // OPTIMIZATION: Do NOT retry 429s here. Let them bubble up to `runWithModelFallback`
        // so we can switch models immediately without waiting 3 seconds.
        if (msg.includes('503') || msg.includes('500') || msg.includes('overloaded')) {
            // Invoke callback if provided to notify UI of the wait time
            if (onRetry) {
                onRetry(baseDelay);
            }
            await new Promise(r => setTimeout(r, baseDelay));
            return runWithRetry(operation, retries - 1, baseDelay * 2, onRetry);
        }
        throw error;
    }
}

/**
 * Enhanced fallback that tries a different model series if one is quota-exhausted.
 * This is critical for bypassing model-specific free tier limits.
 */
export async function runWithModelFallback<T>(
    modelIds: string[],
    operationFactory: (modelId: string) => Promise<T>,
    onRetry?: (delayMs: number) => void
): Promise<T> {
    let lastError: any;
    for (const model of modelIds) {
        try {
            // Internal retry for 500/503 errors (network blips)
            return await runWithRetry(() => operationFactory(model), 1, 3000, onRetry);
        } catch (error: any) {
            lastError = error;
            const errorMsg = (error.message || '').toLowerCase();
            // If it's a 429 (Quota), we immediately cascade to the next model in the list
            if (errorMsg.includes('429') || error.status === 429) {
                console.log(`Model Quota Exhausted for ${model}. Cascading to next available model...`);
                continue;
            }
            break;
        }
    }
    throw lastError;
}
