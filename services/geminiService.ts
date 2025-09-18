import type { AnalysisRequest, SignalData } from '../types';

export async function generateTradingSignal(request: AnalysisRequest): Promise<SignalData> {
    try {
        const response = await fetch("/api/fetchData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            // Try to parse a more specific error message from the backend API route
            const errorData = await response.json().catch(() => ({})); // Gracefully handle non-json error responses
            const errorMessage = errorData.details || `The server responded with an error: ${response.status}`;
            throw new Error(errorMessage);
        }

        const data: SignalData = await response.json();
        return data;

    } catch (error) {
        console.error("Service Error:", error);
        // Re-throw a user-friendly error message for the UI component to catch
        const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred.";
        throw new Error(`Failed to generate trading signal: ${errorMessage}`);
    }
}
