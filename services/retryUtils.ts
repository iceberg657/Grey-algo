
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

        if (isQuotaError) {
            let delay = baseDelay;
            const match = errorMessage.match(/retry in ([\d.]+)s/);
            if (match && match[1]) {
                delay = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
            } else {
                delay = baseDelay * 2;
            }

            console.warn(`[Gemini API] Quota limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
            
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
            // If it's the last model, we might retry more.
            const retries = model === modelIds[modelIds.length - 1] ? 3 : 0; 
            return await runWithRetry(() => operationFactory(model), retries);
        } catch (error: any) {
            console.warn(`[Model Failed] ${model}:`, error.message);
            lastError = error;
            
            // If strictly a quota error, we move to next model immediately (due to 0 retries above)
            // If it's another error (like 500), we also move to next model.
        }
    }
    throw lastError;
}
