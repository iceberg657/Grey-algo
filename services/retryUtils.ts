
export async function runWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 5, // Increased from 3 to 5 to handle strict limits
    baseDelay: number = 4000 // Increased from 2s to 4s to allow quota refill (5 RPM = 12s/req)
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;

        const errorMessage = error.message || '';
        const isQuotaError = 
            errorMessage.includes('429') || 
            error.status === 429 || 
            errorMessage.includes('Quota exceeded') ||
            errorMessage.includes('RESOURCE_EXHAUSTED') ||
            errorMessage.includes('Too Many Requests');
            
        const isServerOverloaded = 
            errorMessage.includes('503') || 
            error.status === 503 ||
            errorMessage.toLowerCase().includes('overloaded') ||
            errorMessage.toLowerCase().includes('busy') ||
            errorMessage.toLowerCase().includes('internal error');

        if (isQuotaError || isServerOverloaded) {
            let delay = baseDelay;
            const match = errorMessage.match(/retry in ([\d.]+)s/);
            if (match && match[1]) {
                // If the API tells us how long to wait, wait that amount + buffer
                delay = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
            } else {
                // Exponential backoff with jitter
                delay = baseDelay * Math.pow(1.5, 5 - retries) + (Math.random() * 1000);
            }

            console.warn(`[Gemini API] ${isQuotaError ? 'Quota limit hit' : 'Server overloaded'}. Retrying in ${(delay/1000).toFixed(1)}s... (${retries} attempts left)`);
            
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
            console.log(`[Attempting Model] ${model}`);
            // Use strict retries for the first models, but try harder on the last fallback
            const retries = model === modelIds[modelIds.length - 1] ? 5 : 2; 
            return await runWithRetry(() => operationFactory(model), retries);
        } catch (error: any) {
            console.warn(`[Model Failed] ${model}:`, error.message);
            lastError = error;
            
            // Proceed to next model in loop
        }
    }
    throw lastError;
}
