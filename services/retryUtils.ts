
/**
 * GreyAlpha Lane Orchestrator with Neural Cooldown & Model Cascading
 */

let API_KEY: string | null = null;
let USE_STRICT_MODE = false;
const KEYS: Record<string, string | null> = {
    k1: null, k2: null, k3: null, k4: null, k5: null, k6: null, k7: null, k8: null, k9: null, k10: null
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
            } catch {
                console.warn("[LaneOrchestrator] Failed to parse user settings for custom key.");
            }
        }

        // 1. Check for Vite environment variables (Client-side build/Vercel)                
        const meta = import.meta as any;
        const envKeys = {
            k1: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY_1 || process.env.VITE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_GEMINI_API_KEY || meta.env.VITE_API_KEY_1 || meta.env.VITE_API_KEY || meta.env.GEMINI_API_KEY || meta.env.API_KEY_1 || meta.env.API_KEY) : undefined,
            k2: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_2 || process.env.API_KEY_2) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_2 || meta.env.API_KEY_2) : undefined,
            k3: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_3 || process.env.API_KEY_3) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_3 || meta.env.API_KEY_3) : undefined,
            k4: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_4 || process.env.API_KEY_4) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_4 || meta.env.API_KEY_4) : undefined,
            k5: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_5 || process.env.API_KEY_5) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_5 || meta.env.API_KEY_5) : undefined,
            k6: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_6 || process.env.API_KEY_6) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_6 || meta.env.API_KEY_6) : undefined,
            k7: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_7 || process.env.API_KEY_7) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_7 || meta.env.API_KEY_7) : undefined,
            k8: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_8 || process.env.API_KEY_8) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_8 || meta.env.API_KEY_8) : undefined,
            k9: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_9 || process.env.API_KEY_9) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_9 || meta.env.API_KEY_9) : undefined,
            k10: (typeof process !== 'undefined' && process.env) ? (process.env.VITE_API_KEY_10 || process.env.API_KEY_10) : (typeof window !== 'undefined' && meta && meta.env) ? (meta.env.VITE_API_KEY_10 || meta.env.API_KEY_10) : undefined
        };

        const isValid = (k: any) => typeof k === 'string' && k.trim().length > 5 && k !== 'undefined' && k !== 'null';
        // Assign all valid env keys to KEYS
        Object.entries(envKeys).forEach(([key, val]) => {
            if (isValid(val)) (KEYS as any)[key] = (val as string).trim();
        });
        if (isValid(envKeys.k1)) {
            API_KEY = envKeys.k1?.trim();
        }
        if (!KEYS.k1 && API_KEY) { KEYS.k1 = API_KEY; }

        // 2. Fallback to server endpoint (Local development or Proxy)
        // We ALWAYS try to fetch from server to get non-VITE keys or updated values
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
        } catch (e) {
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
                    if (isValid(pEnv.API_KEY_10)) KEYS.k10 = pEnv.API_KEY_10.trim();
                }
            }
        } catch (e) {
        }
        
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
    K9: () => KEYS.k9 || '',
    K10: () => KEYS.k10 || ''
};

export async function getApiKey() {
    await initializeApiKey();
    const key = K.K9() || API_KEY || '';
    return (typeof key === 'string' && key.length > 5) ? key : '';
}

// Helper to get unique keys from a list of potential keys
const getUniqueKeys = (keys: string[]) => {
    return Array.from(new Set(keys.filter(k => !!k && k.length > 5)));
};

// 1. CHART ANALYSIS (Keys 1-4)
export const getAnalysisPool = () => getUniqueKeys([K.K1(), K.K2(), K.K3(), K.K4()]); 
export const ANALYSIS_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemma-4-31b',
    'gemma-4-26b',
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
];

// 2. SNIPER PAGE
export const getSniperPool = () => {
    const keys = getUniqueKeys([K.K3(), K.K10()]);
    // Fallback to primary keys if sniper-specific lanes are empty
    return keys.length > 0 ? keys : getAnalysisPool();
};
export const SNIPER_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-3.5-flash-lite',  // Model 5
    'gemini-3.1-flash-lite',  // Model 6
];

export interface SniperModelOption {
    id: string;
    label: string;
    sublabel: string;
    isDefault?: boolean;
    isRed?: boolean;
    isBlue?: boolean;
    color: string;
}

export const SNIPER_MODEL_CONFIGS: SniperModelOption[] = [
    {
        id: 'gemini-3.5-flash-lite',
        label: 'Model 5',
        sublabel: 'Gemini 3.5 Flash Lite',
        isDefault: true,
        isBlue: true,
        color: 'sky'
    },
    {
        id: 'gemini-3.1-flash-lite',
        label: 'Model 6',
        sublabel: 'Gemini 3.1 Flash Lite',
        isBlue: true,
        color: 'sky'
    }
];

export function findSniperModelConfig(modelId?: string): SniperModelOption {
    if (!modelId) return SNIPER_MODEL_CONFIGS[0];
    const clean = modelId.toLowerCase().replace(/^models\//, '');
    
    // Model 5: Gemini 3.5 Flash Lite
    if ((clean.includes('3.5') && clean.includes('lite')) || clean === 'model-5' || clean === 'model 5') {
        return SNIPER_MODEL_CONFIGS[0];
    }
    // Model 6: Gemini 3.1 Flash Lite
    if ((clean.includes('3.1') && clean.includes('lite')) || clean === 'model-6' || clean === 'model 6') {
        return SNIPER_MODEL_CONFIGS[1];
    }
    const exact = SNIPER_MODEL_CONFIGS.find(m => m.id === clean || m.id === modelId);
    if (exact) return exact;
    return SNIPER_MODEL_CONFIGS[0];
}


export const getChatPool = () => {
    const keys = getUniqueKeys([K.K5(), K.K6()]);
    return keys.length > 0 ? keys : getAnalysisPool();
};

export const CHAT_MODELS = [
    'gemini-3.7-flash',       // Model 1
    'gemini-3.6-flash',       // Model 2
    'gemini-3.5-flash',       // Model 3
    'gemini-3-flash-preview', // Model 4
    'gemini-3.5-flash-lite',  // Model 5
    'gemini-3.1-flash-lite',  // Model 6
    'gemma-4-26b',            // Model 7
    'gemma-4-31b'             // Model 8
];

export interface ChatModelOption {
    id: string;
    label: string;
    sublabel: string;
    tag?: string;
    isDefault?: boolean;
    isRed?: boolean;
    isGreen?: boolean;
    isBlue?: boolean;
    color: string;
}

export const CHAT_MODEL_CONFIGS: ChatModelOption[] = [
    {
        id: 'gemini-3.7-flash',
        label: 'Model 1',
        sublabel: 'Gemini 3.7 Flash',
        isDefault: true,
        isGreen: true,
        color: 'emerald'
    },
    {
        id: 'gemini-3.6-flash',
        label: 'Model 2',
        sublabel: 'Gemini 3.6 Flash',
        isGreen: true,
        color: 'emerald'
    },
    {
        id: 'gemini-3.5-flash',
        label: 'Model 3',
        sublabel: 'Gemini 3.5 Flash',
        isGreen: true,
        color: 'emerald'
    },
    {
        id: 'gemini-3-flash-preview',
        label: 'Model 4',
        sublabel: 'Gemini 3.0 Flash',
        isGreen: true,
        color: 'emerald'
    },
    {
        id: 'gemini-3.5-flash-lite',
        label: 'Model 5',
        sublabel: 'Gemini 3.5 Flash Lite',
        isBlue: true,
        color: 'sky'
    },
    {
        id: 'gemini-3.1-flash-lite',
        label: 'Model 6',
        sublabel: 'Gemini 3.1 Flash Lite',
        isBlue: true,
        color: 'sky'
    },
    {
        id: 'gemma-4-26b',
        label: 'Model 7',
        sublabel: 'Gemma 4 26B',
        isRed: true,
        color: 'red'
    },
    {
        id: 'gemma-4-31b',
        label: 'Model 8',
        sublabel: 'Gemma 4 31B',
        isRed: true,
        color: 'red'
    }
];

export function findChatModelConfig(modelId?: string): ChatModelOption {
    if (!modelId) return CHAT_MODEL_CONFIGS[0];
    const clean = modelId.toLowerCase().replace(/^models\//, '');
    
    // Model 7: Gemma 4 26B
    if (clean.includes('gemma') && (clean.includes('26b') || clean.includes('model 7') || clean === 'model-7')) {
        return CHAT_MODEL_CONFIGS[6];
    }
    // Model 8: Gemma 4 31B
    if (clean.includes('gemma') && (clean.includes('31b') || clean.includes('model 8') || clean === 'model-8')) {
        return CHAT_MODEL_CONFIGS[7];
    }
    // Model 5: Gemini 3.5 Flash Lite
    if ((clean.includes('3.5') && clean.includes('lite')) || clean === 'model-5' || clean === 'model 5') {
        return CHAT_MODEL_CONFIGS[4];
    }
    // Model 6: Gemini 3.1 Flash Lite
    if ((clean.includes('3.1') && clean.includes('lite')) || clean === 'model-6' || clean === 'model 6') {
        return CHAT_MODEL_CONFIGS[5];
    }
    // Model 4: Gemini 3.0 Flash
    if (clean.includes('3.0') || clean === 'model-4' || clean === 'model 4' || clean.includes('preview')) {
        return CHAT_MODEL_CONFIGS[3];
    }
    // Model 3: Gemini 3.5 Flash
    if (clean.includes('3.5') && !clean.includes('lite') || clean === 'model-3' || clean === 'model 3') {
        return CHAT_MODEL_CONFIGS[2];
    }
    // Model 2: Gemini 3.6 Flash
    if (clean.includes('3.6') || clean === 'model-2' || clean === 'model 2') {
        return CHAT_MODEL_CONFIGS[1];
    }
    
    const exact = CHAT_MODEL_CONFIGS.find(m => m.id === clean || m.id === modelId);
    if (exact) return exact;
    return CHAT_MODEL_CONFIGS[0];
}

export const getAntigravityPool = () => getUniqueKeys([K.K7(), K.K8()]).length > 0 ? getUniqueKeys([K.K7(), K.K8()]) : getAnalysisPool();
export const getPilotPool = () => getUniqueKeys([K.K8(), K.K9()]).length > 0 ? getUniqueKeys([K.K8(), K.K9()]) : getAnalysisPool();
export const getBetaPool = () => getUniqueKeys([K.K9(), K.K10()]).length > 0 ? getUniqueKeys([K.K9(), K.K10()]) : getAnalysisPool();
export const getSuggestionPool = () => getBetaPool();
export const getDeltaPool = () => getBetaPool();
export const getGammaPool = () => getBetaPool();
export const getTtsPool = () => getBetaPool();
export const getSniperKey = async () => getApiKey();

export const PILOT_MODELS = ANALYSIS_MODELS;
export const LEARNING_MODELS = ANALYSIS_MODELS;
export const SUGGESTION_MODELS = ANALYSIS_MODELS;
export const MARKET_MODELS = ANALYSIS_MODELS;
export const SUMMARY_MODELS = ANALYSIS_MODELS;
export const EMBEDDING_MODELS = ['text-embedding-004'];
export const TTS_MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-2.0-flash', 'gemini-3.5-flash-lite'];

export const resetNeuralLanes = () => {
    console.log('[LaneOrchestrator] Neural lanes reset.');
};

export const executeGeminiCall = executeLaneCall;

export async function runWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 2000
): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            if (attempt < maxRetries) {
                await new Promise(res => setTimeout(res, delayMs * attempt));
            }
        }
    }
    throw lastError;
}

export async function executeLaneCall<T>(
    apiCall: (apiKey: string) => Promise<T>,
    poolFnOrArray: (() => string[]) | string[] = getAnalysisPool
): Promise<T> {
    await initializeApiKey();
    const pool = typeof poolFnOrArray === 'function' ? poolFnOrArray() : (Array.isArray(poolFnOrArray) ? poolFnOrArray : []);
    const activeKeys = pool.length > 0 ? pool : (API_KEY ? [API_KEY] : ['']);

    let lastError: any = null;
    for (const key of activeKeys) {
        try {
            return await apiCall(key);
        } catch (e: any) {
            lastError = e;
            const message = (e?.message || '').toLowerCase();
            if (
                message.includes('429') || 
                message.includes('quota') || 
                message.includes('exhausted') || 
                message.includes('rate limit') ||
                message.includes('fetch') ||
                message.includes('network') ||
                message.includes('timeout')
            ) {
                console.warn("[LaneOrchestrator] Key/Lane issue, rotating key in lane...", message);
                continue;
            }
            throw e;
        }
    }
    
    // If active keys failed, try one final attempt with empty key (server will use default GEMINI_API_KEY)
    if (activeKeys.length > 0 && activeKeys[0] !== '') {
        try {
            return await apiCall('');
        } catch (serverErr) {
            lastError = serverErr;
        }
    }

    if (lastError) throw lastError;
    return await apiCall('');
}

export async function runWithModelFallback<T>(
    models: string[],
    callFn: (model: string) => Promise<T>
): Promise<T> {
    let lastError: any = null;
    const modelList = models && models.length > 0 ? models : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    
    for (const model of modelList) {
        try {
            return await callFn(model);
        } catch (e: any) {
            lastError = e;
            const msg = (e?.message || '').toLowerCase();
            if (
                msg.includes('429') || 
                msg.includes('quota') || 
                msg.includes('overloaded') || 
                msg.includes('503') || 
                msg.includes('500') ||
                msg.includes('fetch') || 
                msg.includes('not found') || 
                msg.includes('404') || 
                msg.includes('timeout') || 
                msg.includes('empty response') || 
                msg.includes('failed to parse')
            ) {
                console.warn(`[LaneOrchestrator] Model ${model} failed (${e.message}), falling back to next model...`);
                continue;
            }
            throw e;
        }
    }
    throw lastError;
}
