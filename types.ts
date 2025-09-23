export interface ImagePart {
    data: string; // base64 encoded data
    mimeType: string;
}

export interface AnalysisRequest {
    images: {
        higher?: ImagePart;
        primary: ImagePart;
        entry?: ImagePart;
    };
    riskRewardRatio: string;
    tradingStyle: TradingStyle;
    isMultiDimensional: boolean;
}

export interface SignalData {
    id: string;
    timestamp: number;
    asset: string;
    timeframe: string;
    signal: 'BUY' | 'SELL';
    confidence: number;
    entry: number;
    stopLoss: number;
    takeProfits: number[];
    reasoning: string[];
    sources?: {
        uri: string;
        title: string;
    }[];
}

export interface NewsArticle {
    title: string;
    summary: string;
    url: string;
    source: string;
    date: string; // ISO 8601 format
}

export type TradingStyle = 'Scalp' | 'Swing' | 'Day Trading';