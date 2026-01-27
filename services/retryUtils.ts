
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
    K6: process.env.API_KEY_6 || ''
};

// Lane 1: Chart Analysis (High Priority Visuals)
export const ANALYSIS_POOL = [K.K1, K.K2, K.K3].filter(k => !!k);
export const LANE_1_MODELS = [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-flash-lite-latest'
];

// Lane 2: Main App Services (News, Global Bias, Suggestions, Predictions)
export const SERVICE_POOL = [K.K4, K.K5].filter(k => !!k);
export const LANE_2_MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-latest'
];

// Lane 3: User interaction & Intelligence Growth (Chat, ML)
export const CHAT_ML_POOL = [K.K6].filter(k => !!k);
export const LANE_3_MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-latest'
];

// Legacy priority keys
export const PRIORITY_KEY_1 = [K.K1].filter(k => !!k);
export const PRIORITY_KEY_2 = [K.K2].filter(k => !!k);
export const PRIORITY_KEY_3 = [K.K3].filter(k => !!k);

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
    const activePool = pool || [K.P, ...ANALYSIS_POOL, ...SERVICE_POOL, ...CHAT_ML_POOL];
    return executeLaneCall(op, activePool);
}

export async function runWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 2,
    baseDelay: number = 3000
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('503') || msg.includes('500') || msg.includes('overloaded')) {
            await new Promise(r => setTimeout(r, baseDelay));
            return runWithRetry(operation, retries - 1, baseDelay * 2);
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
    operationFactory: (modelId: string) => Promise<T>
): Promise<T> {
    let lastError: any;
    for (const model of modelIds) {
        try {
            // Internal retry for 500/503 errors
            return await runWithRetry(() => operationFactory(model), 1);
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
