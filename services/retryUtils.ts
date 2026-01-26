
/**
 * Neural Link Orchestrator: Manages a pool of API keys to bypass individual quota limits.
 */

// Gather all configured keys from the environment
const KEY_POOL = [
    process.env.API_KEY,
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5,
].filter((key): key is string => !!key && key.trim() !== '');

// Shuffle the pool on module load to distribute initial load across keys
const SHUFFLED_POOL = [...KEY_POOL].sort(() => Math.random() - 0.5);

// Specific keys for background tasks to satisfy the "use two api" requirement
// and prevent background polling from saturating the primary analysis keys.
const LITE_POOL = [
    process.env.API_KEY_1 || process.env.API_KEY || '',
    process.env.API_KEY_2 || process.env.API_KEY || ''
].filter(k => !!k && k.trim() !== '');

/**
 * A wrapper to execute a Gemini API operation with Intelligent Key Rotation.
 */
export async function executeGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    if (SHUFFLED_POOL.length === 0) {
        throw new Error("Neural Link Offline: No API keys detected in system environment.");
    }

    let lastError: any = null;
    
    for (let i = 0; i < SHUFFLED_POOL.length; i++) {
        const apiKey = SHUFFLED_POOL[i];
        try {
            return await operationFactory(apiKey);
        } catch (error: any) {
            const errorMessage = error.message || '';
            const isQuotaError = 
                errorMessage.includes('429') || 
                error.status === 429 || 
                errorMessage.toLowerCase().includes('quota') ||
                errorMessage.toLowerCase().includes('resource_exhausted');

            if (isQuotaError) {
                console.warn(`[Neural Link] Node ${i + 1} Saturated. Re-routing...`);
                lastError = error;
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error("Unknown Neural Link failure.");
}

/**
 * Dedicated executor for background "Lite" tasks.
 * Uses a smaller subset of keys to isolate background traffic.
 */
export async function executeLiteGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    if (LITE_POOL.length === 0) return executeGeminiCall(operationFactory);

    let lastError: any = null;
    for (let i = 0; i < LITE_POOL.length; i++) {
        const apiKey = LITE_POOL[i];
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
    // If lite keys fail, try the general pool as a last resort
    return executeGeminiCall(operationFactory);
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
            errorMessage.toLowerCase().includes('overloaded') ||
            errorMessage.toLowerCase().includes('busy');

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
