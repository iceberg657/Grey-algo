
export async function runWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    baseDelay: number = 2000
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries <= 0) throw error;

        // Check for common rate limit / quota exhaustion indicators
        const errorMessage = error.message || '';
        const isQuotaError = 
            errorMessage.includes('429') || 
            error.status === 429 || 
            errorMessage.includes('Quota exceeded') ||
            errorMessage.includes('RESOURCE_EXHAUSTED') ||
            errorMessage.includes('Too Many Requests');

        if (isQuotaError) {
            let delay = baseDelay;
            // Try to parse "retry in X s" from error message to be precise
            const match = errorMessage.match(/retry in ([\d.]+)s/);
            if (match && match[1]) {
                // Add a small buffer (500ms) to the requested wait time
                delay = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
            } else {
                // Exponential backoff if no specific time is provided
                // 1st retry: 2000ms, 2nd: 4000ms, 3rd: 8000ms
                delay = baseDelay * 2;
            }

            console.warn(`[Gemini API] Quota limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return runWithRetry(operation, retries - 1, delay); // Recurse with potentially updated delay
        }

        throw error;
    }
}
