
// Gather keys from environment variables.
const RAW_KEYS = [
    process.env.API_KEY_1, 
    process.env.API_KEY_2,
    process.env.API_KEY_3, 
    process.env.API_KEY
].filter((key): key is string => !!key && key.trim() !== '');

// Export Key Indices for clarity
export const PRIORITY_KEY_1 = 0; // Charts, News, Predictor
export const PRIORITY_KEY_2 = 1; // Stats, Chat, Global
export const PRIORITY_KEY_3 = 2; // Rest (Suggestions, Learning, TTS)

/**
 * A wrapper to execute a Gemini API operation with:
 * 1. Intelligent Key Selection (Prioritize specific key based on task)
 * 2. Automatic Key Rotation (Primary -> Secondary -> etc.)
 * 3. Model Fallback (via runWithModelFallback inside)
 * 4. 30-Second Minimum Wait on Total Failure
 * 
 * @param operationFactory The function performing the API call
 * @param priorityIndex The index of the key to try FIRST (0 = Key 1, 1 = Key 2, etc.)
 */
export async function executeGeminiCall<T>(
    operationFactory: (apiKey: string) => Promise<T>,
    priorityIndex: number = 0
): Promise<T> {
    const startTime = Date.now();
    
    // If no keys are configured, throw immediately
    if (RAW_KEYS.length === 0) {
        throw new Error("No API Keys configured in Vercel.");
    }

    // Reorder keys based on priority
    // If priority is 1 (Key 2), order becomes: [Key2, Key3, Key1, Default]
    // This ensures we try the assigned key first, but still have backups.
    const reorderedKeys = [...RAW_KEYS];
    if (priorityIndex > 0 && priorityIndex < reorderedKeys.length) {
        const preferred = reorderedKeys.splice(priorityIndex, 1)[0];
        reorderedKeys.unshift(preferred);
    }

    let lastError: any = null;

    // Iterate through available keys
    for (const apiKey of reorderedKeys) {
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
