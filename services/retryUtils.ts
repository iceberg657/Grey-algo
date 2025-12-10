
// Gather keys from environment variables. 
// We prioritize API_KEY_1 and API_KEY_2, falling back to API_KEY if others aren't set.
const AVAILABLE_KEYS = [
    process.env.API_KEY_1, 
    process.env.API_KEY_2, 
    process.env.API_KEY
].filter((key): key is string => !!key && key.trim() !== '');

/**
 * A wrapper to execute a Gemini API operation with:
 * 1. Automatic Key Rotation (Primary -> Secondary -> etc.)
 * 2. Model Fallback (via runWithModelFallback inside)
 * 3. 30-Second Minimum Wait on Total Failure
 */
export async function executeGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>
): Promise<T> {
    const startTime = Date.now();
    
    // If no keys are configured, throw immediately
    if (AVAILABLE_KEYS.length === 0) {
        throw new Error("No API Keys configured in Vercel.");
    }

    let lastError: any = null;

    // Iterate through available keys
    for (const apiKey of AVAILABLE_KEYS) {
        try {
            // Attempt the operation with the current key
            return await operationFactory(apiKey);
        } catch (error: any) {
            lastError = error;
            const errorMessage = error.message || '';
            
            // Check if this is a Quota/Rate Limit error
            const isQuotaError = 
                errorMessage.includes('429') || 
                error.status === 429 || 
                errorMessage.toLowerCase().includes('quota') ||
                errorMessage.toLowerCase().includes('resource_exhausted') ||
                errorMessage.toLowerCase().includes('too many requests');

            if (isQuotaError) {
                console.warn(`[Gemini API] Quota hit on key ending in ...${apiKey.slice(-4)}. Switching to backup key...`);
                // Continue to the next key in the loop
                continue;
            } else {
                // If it's not a quota error (e.g., Bad Request, 500), throw immediately
                throw error;
            }
        }
    }

    // If we exit the loop, it means ALL keys failed with Quota/Limit errors.
    
    // ENFORCE 30 SECOND DELAY RULE
    // We wait until 30 seconds have passed since the start of the attempt
    const elapsed = Date.now() - startTime;
    const remaining = 30000 - elapsed;
    if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
    }

    throw new Error("Limit reached please try after some times");
}

// Keep existing retry logic for internal model retries
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
        // We only retry standard server errors here, NOT 429s (handled by key rotation above)
        const isServerOverloaded = 
            errorMessage.includes('503') || 
            error.status === 503 ||
            errorMessage.toLowerCase().includes('overloaded') ||
            errorMessage.toLowerCase().includes('busy') ||
            errorMessage.toLowerCase().includes('internal error');

        if (isServerOverloaded) {
            const delay = baseDelay * Math.pow(1.5, 3 - retries) + (Math.random() * 1000);
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
            return await runWithRetry(() => operationFactory(model), 1); // Low internal retries, rely on key rotation
        } catch (error: any) {
            console.warn(`[Model Failed] ${model}:`, error.message);
            lastError = error;
            // Proceed to next model
        }
    }
    throw lastError;
}
