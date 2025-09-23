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

export interface EconomicEvent {
    name: string;
    date: string; // ISO 8601 format
    impact: 'High' | 'Medium' | 'Low';
}

export interface Sentiment {
    score: number; // 0 (Bearish) to 100 (Bullish)
    summary: string;
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
    sentiment?: Sentiment;
    economicEvents?: EconomicEvent[];
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

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

export interface PredictedEvent {
    name: string;
    date: string; // ISO 8601 format with timezone
    affectedAsset: string;
    predictedDirection: 'BUY' | 'SELL';
    confidence: number; // 80-100
    reasoning: string;
}