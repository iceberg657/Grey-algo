
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
    globalContext?: string;
    learnedStrategies?: string[];
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
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    entryPoints: number[];
    stopLoss: number;
    takeProfits: number[];
    expectedDuration: string; // New field for time duration
    reasoning: string[];
    checklist?: string[];
    invalidationScenario?: string;
    sentiment?: Sentiment;
    economicEvents?: EconomicEvent[];
    sources?: {
        uri: string;
        title: string;
    }[];
}

export interface AssetSuggestion {
    symbol: string;
    type: 'Major' | 'Minor' | 'Crypto' | 'Commodity' | 'Index' | 'Stock';
    reason: string;
    volatilityWarning: boolean;
}

// FIX: Add MarketDataItem interface for use in market data services and components.
export interface MarketDataItem {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
}

export interface GlobalMarketSector {
    name: string;
    asset: string;
    bias: 'Bullish' | 'Bearish' | 'Neutral';
    reason: string;
}

export interface GlobalMarketAnalysis {
    timestamp: number;
    sectors: GlobalMarketSector[];
    globalSummary: string;
}

export interface NewsArticle {
    title: string;
    summary: string;
    url: string;
    source: string;
    date: string; // ISO 8601 format
}

export type TradingStyle = 'Scalp' | 'Short Term' | 'Day Trading';

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    images?: string[]; // Data URL for rendering
}

export interface PredictedEvent {
    name: string;
    date: string; // ISO 8601 format with timezone
    eventDurationHours: number;
    affectedAsset: string;
    predictedDirection: 'BUY' | 'SELL';
    confidence: number; // 80-100
    reasoning: string;
}

// --- New Types for Market Statistics ---

export type StatTimeframe = '15m' | '1H' | '4H' | '1D';

export interface TechnicalIndicators {
    ma50: { value: number; signal: 'Buy' | 'Sell' | 'Neutral' };
    ma200: { value: number; signal: 'Buy' | 'Sell' | 'Neutral' };
    stochastic: { k: number; d: number; signal: 'Overbought' | 'Oversold' | 'Neutral' };
    atr: number;
    adx: { value: number; trend: 'Strong' | 'Weak' | 'Ranging' };
    rsi: number;
}

export interface CandlestickPattern {
    name: string;
    signal: 'Bullish' | 'Bearish' | 'Neutral';
    description: string;
}

export interface MarketStatsData {
    symbol: string;
    timeframe: StatTimeframe;
    price: number;
    sentimentScore: number; // 0-100 (0=Strong Sell, 50=Neutral, 100=Strong Buy)
    sentimentLabel: 'Strong Sell' | 'Sell' | 'Neutral' | 'Buy' | 'Strong Buy';
    indicators: TechnicalIndicators;
    supportResistance: {
        s1: number;
        s2: number;
        s3: number;
        r1: number;
        r2: number;
        r3: number;
    };
    todaysEvents: EconomicEvent[];
    patterns: CandlestickPattern[];
}
