
/**
 * Neural Link Orchestrator: Manages task-specific API key pools and rotation.
 */

const K = {
    P: process.env.API_KEY || '',
    K1: process.env.API_KEY_1 || '',
    K2: process.env.API_KEY_2 || '',
    K3: process.env.API_KEY_3 || '',
    K4: process.env.API_KEY_4 || '',
    K5: process.env.API_KEY_5 || ''
};

// Lite Pool: API_KEY_1 and API_KEY_2
// Tasks: Predictor, News, Suggestions, Global Market
export const LITE_POOL = [K.K1, K.K2].filter(k => !!k);

// Chat Pool: API_KEY_2 and API_KEY_3
// Tasks: Oracle AI Chat
export const CHAT_POOL = [K.K2, K.K3].filter(k => !!k);

// Chart Pool: API_KEY_3, API_KEY_4, and API_KEY_5
// Tasks: Analyzing Chart Screenshots
export const CHART_POOL = [K.K3, K.K4, K.K5].filter(k => !!k);

/**
 * Specialized executor for background "Lite" tasks.
 */
export async function executeLiteGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const pool = LITE_POOL.length > 0 ? LITE_POOL : [K.P];
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
    throw lastError || new Error("Lite API Node Capacity Reached.");
}

/**
 * Specialized executor for Chat.
 */
export async function executeChatGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const pool = CHAT_POOL.length > 0 ? CHAT_POOL : [K.P];
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
    throw lastError || new Error("Chat Node Capacity Reached.");
}

/**
 * Specialized executor for Chart Analysis.
 */
export async function executeChartGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const pool = CHART_POOL.length > 0 ? CHART_POOL : [K.P];
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
    throw lastError || new Error("Chart Analysis Node Capacity Reached.");
}

/**
 * General purpose executor for other tasks.
 */
export async function executeGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const pool = [K.P, K.K1, K.K2, K.K3, K.K4, K.K5].filter(k => !!k);
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
    throw lastError || new Error("Neural Link Offline.");
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
        const isRetryable = msg.includes('503') || msg.includes('500') || msg.includes('overloaded');

        if (isRetryable) {
            const delay = baseDelay * Math.pow(2, 2 - retries);
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
            if (error.message?.includes('429')) break;
        }
    }
    throw lastError;
}
