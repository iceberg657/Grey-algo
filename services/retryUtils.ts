
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

// 2. CHAT & NEWS (Key 5)
// Models: 2.5 Pro -> 2.5 Flash -> 2.0 Flash
// Note: Predictor has been removed, so K5 is repurposed for Chat/News
export const CHAT_POOL = [K.K5].filter(k => !!k);
export const CHAT_MODELS = [
    'gemini-2.5-pro',
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

// Shared Pools
export const SERVICE_POOL = CHAT_POOL; // News uses Chat Pool (K5)
export const SUGGESTION_STRUCTURE_POOL = CHAT_POOL; // Global Market uses Chat Pool (K5) to save other keys

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
 * Manually reset the cooldown map. 
 * Used when the user clicks "Reconnect Lane" to force a fresh retry.
 */
export function resetNeuralLanes() {
    cooldownMap.clear();
    console.log("Neural Lanes (API Keys) have been manually reset.");
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
        // We DO retry 500s, 503s, and network/XHR errors which are often transient.
        if (
            msg.includes('503') || 
            msg.includes('500') || 
            msg.includes('overloaded') || 
            msg.includes('xhr error') || 
            msg.includes('rpc failed') ||
            msg.includes('fetch failed') ||
            msg.includes('network error')
        ) {
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
 * Loops through the model list `loopCount` times before failing.
 */
export async function runWithModelFallback<T>(
    modelIds: string[],
    operationFactory: (modelId: string) => Promise<T>,
    onRetry?: (delayMs: number) => void,
    loopCount: number = 2 // Try the whole sequence twice by default
): Promise<T> {
    let lastError: any;
    
    outerLoop: for (let i = 0; i < loopCount; i++) {
        for (let j = 0; j < modelIds.length; j++) {
            const model = modelIds[j];
            try {
                // Internal retry for 500/503 errors (network blips)
                return await runWithRetry(() => operationFactory(model), 1, 3000, onRetry);
            } catch (error: any) {
                lastError = error;
                const errorMsg = (error.message || '').toLowerCase();
                
                // If it's a 429 (Quota) OR a persistent 5xx/Network error after retries
                if (
                    errorMsg.includes('429') || 
                    error.status === 429 ||
                    errorMsg.includes('503') ||
                    errorMsg.includes('500') ||
                    errorMsg.includes('xhr error') ||
                    errorMsg.includes('rpc failed') ||
                    errorMsg.includes('fetch failed')
                ) {
                    
                    // Check if this is the last model in the list
                    if (j === modelIds.length - 1) {
                        // If we have loops remaining, wait 3s and restart the chain
                        if (i < loopCount - 1) {
                            console.log(`All models exhausted in pass ${i+1}. Waiting 3s before restarting chain...`);
                            if (onRetry) onRetry(3000); // Trigger UI Countdown
                            await new Promise(resolve => setTimeout(resolve, 3000));
                            continue outerLoop; // Jump to next outer iteration (restart from first model)
                        }
                    }
                    
                    console.log(`Model Quota/Network Exhausted for ${model} (${errorMsg.substring(0, 50)}...). Cascading...`);
                    continue; // Try next model in the list
                }
                
                // For non-retryable errors (e.g. 400 Bad Request), stop immediately
                break;
            }
        }
    }
    throw lastError;
}
