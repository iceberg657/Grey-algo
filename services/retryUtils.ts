
/**
 * GreyAlpha Lane Orchestrator with Neural Cooldown & Model Cascading
 */

let API_KEY: string | null = null;
const KEYS: Record<string, string | null> = {
    k1: null, k2: null, k3: null, k4: null, k5: null, k6: null, k7: null
};

export async function initializeApiKey() {
    if (API_KEY || KEYS.k1) return;
    
    // 1. Check for Vite environment variables (Client-side build/Vercel)
    // Note: On Vercel, these must be prefixed with VITE_ to be visible to the browser
    const envKeys = {
        k1: import.meta.env.VITE_API_KEY_1 || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY,
        k2: import.meta.env.VITE_API_KEY_2,
        k3: import.meta.env.VITE_API_KEY_3,
        k4: import.meta.env.VITE_API_KEY_4,
        k5: import.meta.env.VITE_API_KEY_5,
        k6: import.meta.env.VITE_API_KEY_6,
        k7: import.meta.env.VITE_API_KEY_7,
    };

    if (envKeys.k1) {
        API_KEY = envKeys.k1;
        Object.assign(KEYS, envKeys);
        // If we found at least one client-side key, we're good
        if (API_KEY) return;
    }

    // 2. Fallback to server endpoint (Local development or Proxy)
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            API_KEY = config.apiKey;
            if (config.keys) {
                // Map server keys (k1, k2...) to our internal store
                KEYS.k1 = config.keys.k1 || API_KEY;
                KEYS.k2 = config.keys.k2;
                KEYS.k3 = config.keys.k3;
                KEYS.k4 = config.keys.k4;
                KEYS.k5 = config.keys.k5;
                KEYS.k6 = config.keys.k6;
                KEYS.k7 = config.keys.k7;
            }
        }
    } catch (error) {
        console.warn('Failed to fetch API key from server, checking process.env...');
    }

    // 3. Last resort: check process.env (for some environments that might inject it)
    if (!API_KEY && typeof process !== 'undefined') {
        API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY;
        KEYS.k1 = process.env.API_KEY_1 || API_KEY;
        KEYS.k2 = process.env.API_KEY_2;
        KEYS.k3 = process.env.API_KEY_3;
        KEYS.k4 = process.env.API_KEY_4;
        KEYS.k5 = process.env.API_KEY_5;
        KEYS.k6 = process.env.API_KEY_6;
        KEYS.k7 = process.env.API_KEY_7;
    }

    if (!API_KEY && !KEYS.k1) {
        throw new Error('API key not available. Please check server configuration or environment variables.');
    }
}

const K = {
    P: () => KEYS.k1 || API_KEY || '',
    K1: () => KEYS.k1 || API_KEY || '',
    K2: () => KEYS.k2 || KEYS.k1 || API_KEY || '',
    K3: () => KEYS.k3 || KEYS.k1 || API_KEY || '',
    K4: () => KEYS.k4 || KEYS.k1 || API_KEY || '',
    K5: () => KEYS.k5 || KEYS.k1 || API_KEY || '',
    K6: () => KEYS.k6 || KEYS.k1 || API_KEY || '',
    K7: () => KEYS.k7 || KEYS.k1 || API_KEY || ''
};

// 1. CHART ANALYSIS (Keys 1, 2, 3, 4)
// Models: 3.0 Pro -> 3.0 Flash -> 2.5 Pro -> 2.5 Flash -> 2.0 Flash
export const getAnalysisPool = () => [K.K1(), K.K2(), K.K3(), K.K4()].filter(k => !!k);
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
export const getChatPool = () => [K.K5()].filter(k => !!k);
export const CHAT_MODELS = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
];

// 3. AI ASSETS SUGGESTION (Key 6)
// Models: 2.5 Flash -> Lite -> 2.0
export const getSuggestionPool = () => [K.K6()].filter(k => !!k);
export const SUGGESTION_MODELS = [
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-2.0-flash'
];

// Shared Pools
export const getServicePool = () => getChatPool(); // News uses Chat Pool (K5)
export const getSuggestionStructurePool = () => getChatPool(); // Global Market uses Chat Pool (K5) to save other keys

export const LANE_2_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-2.5-flash'
];

// Helper export for TTS (Prioritize Key 3 within Analysis pool logic or standalone)
export const getTtsKey = () => [K.K3()].filter(k => !!k);

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
    const activePool = pool.length > 0 ? pool : [K.P()];
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
    await initializeApiKey(); // Ensure API key is initialized
    const activePool = pool || [K.P(), ...getAnalysisPool()];
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
