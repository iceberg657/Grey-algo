
/**
 * Neural Link Orchestrator: Manages task-specific API key pools.
 */

// Mapping of keys from environment
export const KEYS = {
    PRIMARY: process.env.API_KEY || '',
    K1: process.env.API_KEY_1 || '',
    K2: process.env.API_KEY_2 || '',
    K3: process.env.API_KEY_3 || '',
    K4: process.env.API_KEY_4 || '',
    K5: process.env.API_KEY_5 || ''
};

// Pool for background/lite tasks: API Key 1 and 2
export const LITE_POOL = [KEYS.K1, KEYS.K2].filter(k => !!k);

// Pool for Chat: API Key 4
export const CHAT_POOL = [KEYS.K4].filter(k => !!k);

// Pool for Chart Analysis: API Key 3 (primary) then API Key 5 (fallback)
export const CHART_POOL = [KEYS.K3, KEYS.K5].filter(k => !!k);

/**
 * Specialized executor for background "Lite" tasks (News, Predictor, Global, Suggestions).
 * Uses API_KEY_1 and API_KEY_2.
 */
export async function executeLiteGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const pool = LITE_POOL.length > 0 ? LITE_POOL : [KEYS.PRIMARY];
    let lastError: any = null;
    for (const apiKey of pool) {
        try {
            return await operationFactory(apiKey);
        } catch (error: any) {
            if (error.message?.includes('429') || error.status === 429) {
                lastError = error;
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error("Lite Pool Exhausted.");
}

/**
 * Specialized executor for Chat.
 * Uses API_KEY_4.
 */
export async function executeChatGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const pool = CHAT_POOL.length > 0 ? CHAT_POOL : [KEYS.PRIMARY];
    try {
        return await operationFactory(pool[0]);
    } catch (error: any) {
        // If K4 fails and we have a primary, fallback as last resort
        if (KEYS.PRIMARY && pool[0] !== KEYS.PRIMARY) {
            return await operationFactory(KEYS.PRIMARY);
        }
        throw error;
    }
}

/**
 * Specialized executor for Chart Analysis.
 * Uses API_KEY_3 then switches to API_KEY_5.
 */
export async function executeChartGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const pool = CHART_POOL.length > 0 ? CHART_POOL : [KEYS.PRIMARY];
    let lastError: any = null;
    for (const apiKey of pool) {
        try {
            return await operationFactory(apiKey);
        } catch (error: any) {
            if (error.message?.includes('429') || error.status === 429) {
                lastError = error;
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error("Chart Analysis Pool Exhausted.");
}

export async function runWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    baseDelay: number = 2000
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;
        const errorMessage = error.message || '';
        const isRetryable = 
            errorMessage.includes('503') || 
            errorMessage.includes('500') ||
            errorMessage.toLowerCase().includes('overloaded');

        if (isRetryable) {
            const delay = baseDelay * Math.pow(2, 3 - retries) + (Math.random() * 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
            return runWithRetry(operation, retries - 1, baseDelay); 
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
            if (error.message?.includes('quota') || error.message?.includes('429')) break;
        }
    }
    throw lastError;
}

// Keeping original export for components still using it
export async function executeGeminiCall<T>(f: (k: string) => Promise<T>): Promise<T> {
    return executeLiteGeminiCall(f);
}
