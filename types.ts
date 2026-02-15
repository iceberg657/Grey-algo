
export interface ImagePart {
    data: string; // base64 encoded data
    mimeType: string;
}

export interface UserSettings {
    accountType: 'Real' | 'Funded';
    accountBalance: number;
    riskPerTrade: number;
    targetPercentage: number;
    dailyDrawdown: number;
    maxDrawdown: number;
    timeLimit: number; // days
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
    profitMode: boolean; // New field for strict filtering
    globalContext?: string;
    learnedStrategies?: string[];
    userSettings?: UserSettings;
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

export interface RiskAnalysis {
    riskPerTrade: string;
    suggestedLotSize: string;
    safetyScore: number;
}

export interface SignalData {
    id: string;
    timestamp: number;
    asset: string;
    timeframe: string;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    entryPoints: number[];
    entryType: 'Market Execution' | 'Limit Order'; // New field
    stopLoss: number;
    takeProfits: number[];
    expectedDuration: string; // New field for time duration
    reasoning: string[];
    checklist?: string[];
    invalidationScenario?: string;
    predictedPath?: string; // SVG path data for predicted trajectory
    riskAnalysis?: RiskAnalysis;
    sentiment?: Sentiment;
    economicEvents?: EconomicEvent[];
    sources?: {
        uri: string;
        title: string;
    }[];
}

export interface AssetSuggestion {
    symbol: string;
    type: 'Major' | 'Minor' | 'Commodity' | 'Index' | 'Stock';
    reason: string;
    volatilityWarning: boolean;
}

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
