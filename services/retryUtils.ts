
/**
 * GreyAlpha Lane Orchestrator with Neural Cooldown & Model Cascading
 */

let API_KEY: string | null = null;
const KEYS: Record<string, string | null> = {
    k1: null, k2: null, k3: null, k4: null, k5: null, k6: null, k7: null, k8: null, k9: null
};

let initializationPromise: Promise<void> | null = null;

export async function initializeApiKey() {
    if (API_KEY || KEYS.k1) return;
    
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        // 1. Check for Vite environment variables (Client-side build/Vercel)
        const envKeys = {
            k1: import.meta.env.VITE_API_KEY_1 || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY,
            k2: import.meta.env.VITE_API_KEY_2,
            k3: import.meta.env.VITE_API_KEY_3,
            k4: import.meta.env.VITE_API_KEY_4,
            k5: import.meta.env.VITE_API_KEY_5,
            k6: import.meta.env.VITE_API_KEY_6,
            k7: import.meta.env.VITE_API_KEY_7,
            k8: import.meta.env.VITE_API_KEY_8,
            k9: import.meta.env.VITE_API_KEY_9,
        };

        if (envKeys.k1) {
            API_KEY = envKeys.k1;
            Object.assign(KEYS, envKeys);
            if (API_KEY) return;
        }

        // 2. Fallback to server endpoint (Local development or Proxy)
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                API_KEY = config.apiKey;
                if (config.keys) {
                    KEYS.k1 = config.keys.k1 || API_KEY;
                    KEYS.k2 = config.keys.k2;
                    KEYS.k3 = config.keys.k3;
                    KEYS.k4 = config.keys.k4;
                    KEYS.k5 = config.keys.k5;
                    KEYS.k6 = config.keys.k6;
                    KEYS.k7 = config.keys.k7;
                    KEYS.k8 = config.keys.k8;
                    KEYS.k9 = config.keys.k9;
                }
            }
        } catch (error) {
            console.warn('Failed to fetch API key from server, checking process.env...');
        }

        // 3. Last resort: check process.env
        try {
            if (!API_KEY && typeof process !== 'undefined' && process.env) {
                API_KEY = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY_1 || (process.env as any).API_KEY;
                KEYS.k1 = (process.env as any).API_KEY_1 || API_KEY;
                KEYS.k2 = (process.env as any).API_KEY_2;
                KEYS.k3 = (process.env as any).API_KEY_3;
                KEYS.k4 = (process.env as any).API_KEY_4;
                KEYS.k5 = (process.env as any).API_KEY_5;
                KEYS.k6 = (process.env as any).API_KEY_6;
                KEYS.k7 = (process.env as any).API_KEY_7;
                KEYS.k8 = (process.env as any).API_KEY_8;
                KEYS.k9 = (process.env as any).API_KEY_9;
            }
        } catch (e) {}

        if (!API_KEY && !KEYS.k1) {
            console.error('API key not available in any environment.');
        }
    })();

    return initializationPromise;
}

const K = {
    P: () => KEYS.k1 || API_KEY || '',
    K1: () => KEYS.k1 || '',
    K2: () => KEYS.k2 || '',
    K3: () => KEYS.k3 || '',
    K4: () => KEYS.k4 || '',
    K5: () => KEYS.k5 || '',
    K6: () => KEYS.k6 || '',
    K7: () => KEYS.k7 || '',
    K8: () => KEYS.k8 || '',
    K9: () => KEYS.k9 || ''
};

// Helper to get unique keys from a list of potential keys
const getUniqueKeys = (keys: string[]) => {
    return Array.from(new Set(keys.filter(k => !!k && k.length > 5)));
};

// 1. CHART ANALYSIS (Keys 1, 2, 3, 4, 9)
export const getAnalysisPool = () => getUniqueKeys([K.K1(), K.K2(), K.K3(), K.K4(), K.K9()]);
export const ANALYSIS_MODELS = [
    'gemini-3.1-flash-lite-preview'
];

// 2. CHAT & NEWS (Key 5)
// Note: Predictor has been removed, so K5 is repurposed for Chat/News
export const getChatPool = () => getUniqueKeys([K.K5(), K.K1()]); // Fallback to K1 if K5 missing
export const CHAT_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

// 3. AI ASSETS SUGGESTION (Key 6)
export const getSuggestionPool = () => getUniqueKeys([K.K6(), K.K2()]); // Fallback to K2 if K6 missing
export const SUGGESTION_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
];

// Shared Pools
export const getServicePool = () => getChatPool(); // News uses Chat Pool (K5)
export const getSuggestionStructurePool = () => getChatPool(); // Global Market uses Chat Pool (K5) to save other keys

export const LANE_2_MODELS = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

// Helper export for TTS (Prioritize Key 3 within Analysis pool logic or standalone)
export const getTtsKey = () => [K.K3()].filter(k => !!k);

// Global Penalty Box for exhausted keys
const cooldownMap = new Map<string, number>();
const COOLDOWN_DURATION = 30000; // Reduced to 30s for faster recovery

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
    pool: string[] | (() => string[])
): Promise<T> {
    await initializeApiKey();
    const resolvedPool = typeof pool === 'function' ? pool() : (pool || []);
    
    // Deduplicate and filter pool
    const uniquePool = Array.from(new Set((resolvedPool || []).filter(k => !!k && k.length > 5)));
    const activePool = uniquePool.length > 0 ? uniquePool : [K.P()];
    
    let lastError: any = null;

    const availableKeys = activePool.filter(k => !isThrottled(k));
    
    // If all keys are throttled, we try them anyway as a last resort, 
    // but we should prioritize the record of which was throttled longest ago.
    const keysToTry = availableKeys.length > 0 ? availableKeys : activePool;

    console.log(`[LaneOrchestrator] Attempting call with pool size: ${keysToTry.length} (Active: ${availableKeys.length})`);

    let keyIndex = 0;
    for (const apiKey of keysToTry) {
        keyIndex++;
        try {
            console.log(`[LaneOrchestrator] [Key ${keyIndex}/${keysToTry.length}] Attempting with key ...${apiKey.slice(-6)}`);
            return await operationFactory(apiKey);
        } catch (error: any) {
            lastError = error;
            const errorMsg = (error.message || '').toLowerCase();
            
            // If it's a 429 (Quota), 401 (Unauthorized), or 403 (Forbidden), we SHOULD rotate.
            const isQuotaError = errorMsg.includes('429') || error.status === 429 || errorMsg.includes('quota');
            const isInvalidKey = errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('api key') || errorMsg.includes('api_key_invalid') || errorMsg.includes('not valid');
            
            if (isQuotaError) {
                console.warn(`[LaneOrchestrator] Quota hit (Key ${keyIndex}). Throttling for ${COOLDOWN_DURATION/1000}s.`);
                cooldownMap.set(apiKey, Date.now() + COOLDOWN_DURATION);
                continue; 
            }
            
            if (isInvalidKey) {
                console.error(`[LaneOrchestrator] INVALID API KEY (Key ${keyIndex}): ...${apiKey.slice(-6)}. Skipping for 5 mins.`);
                cooldownMap.set(apiKey, Date.now() + (5 * 60 * 1000)); // 5 minute cooldown for truly bad keys
                continue;
            }
            
            // If it's a 400 (Bad Request) that is NOT about the key, it's likely a logic error or bad prompt - don't rotate
            if (error.status === 400 || errorMsg.includes('bad request')) {
                console.error(`[LaneOrchestrator] Fatal 400 Error (Key ${keyIndex}): ${errorMsg.substring(0, 150)}`);
                throw error;
            }
            
            // For other errors (5xx, network), try next key
            console.warn(`[LaneOrchestrator] Transient error (Key ${keyIndex}): ${errorMsg.substring(0, 50)}. Trying next...`);
            continue;
        }
    }
    throw lastError || new Error("All Neural Lanes are currently congested or exhausted.");
}

export async function executeGeminiCall<T>(op: (k: string) => Promise<T>, pool?: string[]): Promise<T> {
    await initializeApiKey(); // Ensure API key is initialized
    const activePool = pool || [K.P(), ...getAnalysisPool()];
    return executeLaneCall(op, activePool);
}

export async function runWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 1, // Reduced default retries
    baseDelay: number = 1000, // Reduced base delay
    onRetry?: (delayMs: number) => void
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;
        const msg = (error.message || '').toLowerCase();
        
        // OPTIMIZATION: Do NOT retry 429s here. Let them bubble up to `runWithModelFallback`
        // so we can switch models immediately without waiting.
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
            return runWithRetry(operation, retries - 1, baseDelay * 1.5, onRetry); // Reduced backoff multiplier
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
    loopCount: number = 1 // Reduced default loop count to 1 for speed
): Promise<T> {
    let lastError: any;
    
    outerLoop: for (let i = 0; i < loopCount; i++) {
        for (let j = 0; j < modelIds.length; j++) {
            const model = modelIds[j];
            try {
                // Internal retry for 500/503 errors (network blips)
                return await runWithRetry(() => operationFactory(model), 1, 1000, onRetry);
            } catch (error: any) {
                lastError = error;
                const errorMsg = (error.message || '').toLowerCase();
                
                // If it's a 429 (Quota), 400 (Invalid Argument/Model Limit), OR a persistent 5xx/Network error
                if (
                    errorMsg.includes('429') || 
                    error.status === 429 ||
                    error.status === 400 ||
                    error.status === 404 ||
                    (error.status && error.status >= 500) ||
                    errorMsg.includes('quota') ||
                    errorMsg.includes('invalid') ||
                    errorMsg.includes('unsupported') ||
                    errorMsg.includes('not found') ||
                    errorMsg.includes('404') ||
                    errorMsg.includes('503') ||
                    errorMsg.includes('500') ||
                    errorMsg.includes('xhr error') ||
                    errorMsg.includes('rpc failed') ||
                    errorMsg.includes('fetch failed') ||
                    errorMsg.includes('max tokens') ||
                    errorMsg.includes('finish_reason: length') ||
                    errorMsg.includes('unexpected token') ||
                    errorMsg.includes('not valid json') ||
                    errorMsg.includes('non-json') ||
                    errorMsg.includes('empty response') ||
                    errorMsg.includes('failed to parse')
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
