
/**
 * GreyAlpha Lane Orchestrator with Neural Cooldown & Model Cascading
 */

let API_KEY: string | null = null;
let USE_STRICT_MODE = false;
const KEYS: Record<string, string | null> = {
    k1: null, k2: null, k3: null, k4: null, k5: null, k6: null, k7: null, k8: null, k9: null
};

let initializationPromise: Promise<void> | null = null;

export async function initializeApiKey() {
    if (API_KEY || KEYS.k1) return;
    
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        // 0. Check for custom user setting key from LocalStorage
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('greyquant_user_settings');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.geminiApiKey && parsed.geminiApiKey.trim().length > 10) {
                        const customKey = parsed.geminiApiKey.trim();
                        API_KEY = customKey;
                        KEYS.k1 = customKey;
                        USE_STRICT_MODE = !!parsed.useStrictKeyMode;
                        console.log(`[LaneOrchestrator] Using CUSTOM user override API key (Strict: ${USE_STRICT_MODE}).`);
                    }
                }
            } catch (e) {
                console.warn("[LaneOrchestrator] Failed to parse user settings for custom key.");
            }
        }

        // 1. Check for Vite environment variables (Client-side build/Vercel)                
        const envKeys = {
            k1: (typeof window !== 'undefined') ? (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY_1 || import.meta.env.VITE_API_KEY) : undefined,
            k2: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_2 : undefined,
            k3: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_3 : undefined,
            k4: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_4 : undefined,
            k5: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_5 : undefined,
            k6: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_6 : undefined,
            k7: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_7 : undefined,
            k8: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_8 : undefined,
            k9: (typeof window !== 'undefined') ? import.meta.env.VITE_API_KEY_9 : undefined,
        };

        const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';

        if (isValid(envKeys.k1)) {
            API_KEY = envKeys.k1?.trim();
            // Assign all valid env keys to KEYS
            Object.entries(envKeys).forEach(([key, val]) => {
                if (isValid(val)) (KEYS as any)[key] = (val as string).trim();
            });
            if (!KEYS.k1 && API_KEY) KEYS.k1 = API_KEY;
            if (API_KEY) return;
        }

        // 2. Fallback to server endpoint (Local development or Proxy)
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                if (isValid(config.apiKey)) {
                    API_KEY = config.apiKey.trim();
                }
                if (config.keys) {
                    Object.entries(config.keys).forEach(([key, val]) => {
                        if (isValid(val)) (KEYS as any)[key] = (val as string).trim();
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to fetch API key from server, checking process.env...');
        }

        // 3. Last resort: check process.env (for browser-side environments with polyfills)
        try {
            if (!API_KEY && typeof process !== 'undefined' && process.env) {
                const pEnv = process.env as any;
                const bestKey = pEnv.GEMINI_API_KEY || pEnv.API_KEY_1 || pEnv.API_KEY;
                if (isValid(bestKey)) {
                    API_KEY = bestKey.trim();
                    KEYS.k1 = isValid(pEnv.API_KEY_1) ? pEnv.API_KEY_1.trim() : API_KEY;
                    if (isValid(pEnv.API_KEY_2)) KEYS.k2 = pEnv.API_KEY_2.trim();
                    if (isValid(pEnv.API_KEY_3)) KEYS.k3 = pEnv.API_KEY_3.trim();
                    if (isValid(pEnv.API_KEY_4)) KEYS.k4 = pEnv.API_KEY_4.trim();
                    if (isValid(pEnv.API_KEY_5)) KEYS.k5 = pEnv.API_KEY_5.trim();
                    if (isValid(pEnv.API_KEY_6)) KEYS.k6 = pEnv.API_KEY_6.trim();
                    if (isValid(pEnv.API_KEY_7)) KEYS.k7 = pEnv.API_KEY_7.trim();
                    if (isValid(pEnv.API_KEY_8)) KEYS.k8 = pEnv.API_KEY_8.trim();
                    if (isValid(pEnv.API_KEY_9)) KEYS.k9 = pEnv.API_KEY_9.trim();
                }
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

export async function getApiKey() {
    await initializeApiKey();
    return K.K9() || API_KEY || '';
}

// Helper to get unique keys from a list of potential keys
const getUniqueKeys = (keys: string[]) => {
    return Array.from(new Set(keys.filter(k => !!k && k.length > 5)));
};

// 1. CHART ANALYSIS (Strictly Prioritize Lane Rotation)
export const getAnalysisPool = () => getUniqueKeys([K.K1(), K.K2(), K.K3(), K.K4()]); 
export const ANALYSIS_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3-flash',
    'gemini-3.1-flash-lite'
];

// 2. CHAT & NEWS (Key 5)
// Note: Predictor has been removed, so K5 is repurposed for Chat/News
export const getChatPool = () => getUniqueKeys([K.K2(), K.K5(), K.K1()]); // Prioritize K2, then K5, then K1
export const CHAT_MODELS = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
];

// 3. AI ASSETS SUGGESTION (Key 6)
export const getSuggestionPool = () => getUniqueKeys([K.K2(), K.K6()]); // Prioritize K2
export const SUGGESTION_MODELS = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash'
];

// Shared Pools
export const getServicePool = () => getChatPool(); // News uses Chat Pool (K5)
export const getSuggestionStructurePool = () => getUniqueKeys([K.K2(), K.K5(), K.K1()]); // Global Market now prioritizes Key 2

export const LANE_2_MODELS = [
    'gemini-2.0-flash', 
    'gemini-1.5-flash'
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
    pool?: string[] | (() => string[])
): Promise<T> {
    await initializeApiKey();
    const resolvedPool = typeof pool === 'function' ? pool() : (pool || getAnalysisPool());
    
    // Deduplicate and filter pool
    const uniquePool = Array.from(new Set((resolvedPool || []).filter(k => !!k && k.length > 5)));
    
    // Fallback if resolved pool is empty
    const activePool = uniquePool.length > 0 ? uniquePool : [K.K2(), K.K1(), K.P()];
    
    // STRICT MODE OVERRIDE
    if (USE_STRICT_MODE && API_KEY) {
        if (!isThrottled(API_KEY)) {
            try {
                console.log(`[LaneOrchestrator] STRICT MODE ACTIVE. Using primary custom key.`);
                return await operationFactory(API_KEY);
            } catch (error: any) {
                const errorMsg = (error.message || '').toLowerCase();
                const isQuota = errorMsg.includes('429') || error.status === 429 || errorMsg.includes('quota') || (typeof error === 'string' && error.includes('429'));
                
                if (isQuota) {
                    console.warn(`[LaneOrchestrator] Custom Strict Key EXHAUSTED. Temporarily falling back to pool...`);
                    cooldownMap.set(API_KEY, Date.now() + 60000); // 1 min penalty
                } else {
                    throw error;
                }
            }
        }
    }

    let lastError: any = null;

    const availableKeys = activePool.filter(k => !isThrottled(k));
    
    // If all keys are throttled, we try them anyway as a last resort, 
    // but we should prioritize the one that was throttled longest ago.
    const keysToTry = availableKeys.length > 0 ? availableKeys : activePool;

    console.log(`[LaneOrchestrator] Attempting call with pool size: ${keysToTry.length}`);

    for (const apiKey of keysToTry) {
        try {
            console.log(`[LaneOrchestrator] Using key ending in ...${apiKey.slice(-4)}`);
            return await operationFactory(apiKey);
        } catch (error: any) {
            lastError = error;
            const errorMsg = String(error.message || error || '').toLowerCase();
            const isQuota = errorMsg.includes('429') || 
                           error.status === 429 || 
                           errorMsg.includes('quota') || 
                           errorMsg.includes('resource_exhausted') ||
                           errorMsg.includes('limit reached');
            
            if (isQuota) {
                console.warn(`[LaneOrchestrator] Quota hit for key ending in ...${apiKey.slice(-4)}. Throttling for ${COOLDOWN_DURATION/1000}s.`);
                cooldownMap.set(apiKey, Date.now() + COOLDOWN_DURATION);
                continue; 
            }
            
            // If it's a 400 Bad Request, checking if it's actually an "invalid key" error
            // If it is, we should throttle this key and MOVE TO NEXT.
            if (error.status === 400 || errorMsg.includes('invalid') || errorMsg.includes('bad request') || errorMsg.includes('key')) {
                console.warn(`[LaneOrchestrator] Potential invalid key/request for ...${apiKey.slice(-4)}. Throttling and rotating.`);
                cooldownMap.set(apiKey, Date.now() + 86400000); // 24h cooldown for likely dead keys
                continue;
            }
            
            // For other errors, try next key
            console.warn(`[LaneOrchestrator] Error with key ...${apiKey.slice(-4)}: ${errorMsg.substring(0, 100)}. Trying next key...`);
            continue;
        }
    }
    throw lastError || new Error("All Neural Lanes are currently congested or exhausted.");
}

export async function executeGeminiCall<T>(op: (k: string) => Promise<T>, pool?: string[]): Promise<T> {
    await initializeApiKey(); // Ensure API key is initialized
    const activePool = pool || getAnalysisPool();
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
                const errorMsg = String(error.message || error || '').toLowerCase();
                const isQuota = errorMsg.includes('429') || 
                               error.status === 429 || 
                               errorMsg.includes('quota') || 
                               errorMsg.includes('resource_exhausted') ||
                               errorMsg.includes('limit reached') ||
                               errorMsg.includes('finish_reason: length');
                
                // If it's a 429 (Quota), 400 (Invalid Argument/Model Limit), OR a persistent 5xx/Network error
                if (
                    isQuota || 
                    error.status === 400 ||
                    error.status === 404 ||
                    (error.status && error.status >= 500) ||
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
