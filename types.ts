export interface AnalysisRequest {
    image: {
        data: string; // base64 encoded data
        mimeType: string;
    };
    riskRewardRatio: string;
}

export interface SignalData {
    instrument: string;
    timeframe: string;
    signal: 'BUY' | 'SELL';
    confidence: number;
    entry: number;
    stop_loss: number;
    take_profits: number[];
    reasons: string[];
    sources?: {
        uri: string;
        title: string;
    }[];
}

// FIX: Added the missing 'TradingStyle' type, which is used in 'constants.ts' and caused a compilation error.
export type TradingStyle = 'Scalp' | 'Swing' | 'Day Trading';