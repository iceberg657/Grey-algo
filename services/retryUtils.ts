
/**
 * GreyAlpha Lane Orchestrator
 * 
 * ANALYSIS_POOL: K1, K2, K3 -> Visual Reasoning
 * SERVICE_POOL: K4, K5 -> Background Polling/Search
 * CHAT_ML_POOL: K6 -> User Interaction & Learning
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

// Lane 2: Main App Services (News, Global Bias, Suggestions, Predictions)
export const SERVICE_POOL = [K.K4, K.K5].filter(k => !!k);

// Lane 3: User interaction & Intelligence Growth (Chat, ML)
export const CHAT_ML_POOL = [K.K6].filter(k => !!k);

// Specific Priority Key Pools for dedicated services
// Added exports to fix "Module './retryUtils' has no exported member 'PRIORITY_KEY_x'" errors.
export const PRIORITY_KEY_1 = [K.K1].filter(k => !!k);
export const PRIORITY_KEY_2 = [K.K2].filter(k => !!k);
export const PRIORITY_KEY_3 = [K.K3].filter(k => !!k);

export async function executeLaneCall<T>(
    operationFactory: (apiKey: string) => Promise<T>,
    pool: string[]
): Promise<T> {
    const activePool = pool.length > 0 ? pool : [K.P];
    let lastError: any = null;

    for (const apiKey of activePool) {
        try {
            return await operationFactory(apiKey);
        } catch (error: any) {
            lastError = error;
            if (error.message?.includes('429') || error.status === 429) {
                console.warn(`Lane congestion on key ending ${apiKey.slice(-4)}. Rotating...`);
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error("Selected Lane Capacity reached.");
}

/** Legacy Wrappers for backward compatibility **/
// Updated signature to accept optional pool parameter to fix "Expected 1 arguments, but got 2" errors.
export async function executeGeminiCall<T>(op: (k: string) => Promise<T>, pool?: string[]): Promise<T> {
    const activePool = pool || [K.P, ...ANALYSIS_POOL, ...SERVICE_POOL, ...CHAT_ML_POOL];
    return executeLaneCall(op, activePool);
}

export async function runWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 2,
    baseDelay: number = 2000
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

export async function runWithModelFallback<T>(
    modelIds: string[],
    operationFactory: (modelId: string) => Promise<T>
): Promise<T> {
    let lastError: any;
    for (const model of modelIds) {
        try {
            return await runWithRetry(() => operationFactory(model), 1);
        } catch (error: any) {
            lastError = error;
            if (error.message?.includes('429')) break;
        }
    }
    throw lastError;
}
