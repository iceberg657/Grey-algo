
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
                delay = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
            } else {
                delay = baseDelay * 2;
            }

            console.warn(`[Gemini API] ${isQuotaError ? 'Quota limit' : 'Server overloaded'}. Retrying in ${delay}ms... (${retries} attempts left)`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return runWithRetry(operation, retries - 1, delay); 
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
            // We use runWithRetry with fewer retries for the first models to failover faster
            // If it's the last model, we retry more aggressively.
            const retries = model === modelIds[modelIds.length - 1] ? 3 : 1; 
            return await runWithRetry(() => operationFactory(model), retries);
        } catch (error: any) {
            console.warn(`[Model Failed] ${model}:`, error.message);
            lastError = error;
            
            // Proceed to next model in loop
        }
    }
    throw lastError;
}
