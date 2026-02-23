
export interface ImagePart {
    data: string; // base64 encoded data
    mimeType: string;
}

export interface TradingSessionConfig {
    enabled: boolean;
    startHour: number;
    endHour: number;
}

export interface PartialCloseConfig {
    tp1Percent: number;
    tp2Percent: number;
    tp3Percent: number;
    moveToBreakeven: boolean;
}

export interface UserSettings {
    accountType: 'Real' | 'Funded';
    accountBalance: number;
    accountSize?: number; // Alias often used interchangeably
    riskPerTrade: number;
    targetPercentage: number;
    dailyDrawdown: number;
    maxDrawdown: number;
    timeLimit: number; // days
    
    // Advanced Settings
    allowedMarkets?: string[];
    maxDailyLoss?: number; // Percent
    maxTradesPerDay?: number;
    tradingSession?: TradingSessionConfig;
    riskRewardRatio?: string;
    partialClose?: PartialCloseConfig;
}

export interface AnalysisRequest {
    images: {
        higher?: ImagePart;
        primary: ImagePart;

    };
    asset?: string;
    riskRewardRatio: string;
    tradingStyle: TradingStyle;
    isMultiDimensional: boolean;

    globalContext?: string;
    learnedStrategies?: string[];
    userSettings?: UserSettings;
}

export interface MarketConfig {
    minStopLoss: number;
    maxStopLoss: number;
    tp1Distance: number;
    tp2Distance: number;
    tp3Distance: number;
    minTimeframe: string;
    spikeThreshold?: number;
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
    reasoning: string[];
    checklist?: string[];
    invalidationScenario?: string;
    riskAnalysis?: RiskAnalysis;
    sentiment?: Sentiment;
    economicEvents?: EconomicEvent[];
    sources?: {
        uri: string;
        title: string;
    }[];
    
    // Extended Trade Setup Fields
    calculatedRR?: string;
    riskRewardRatio?: string;
    lotSize?: number;
    formattedLotSize?: string;
    riskAmount?: number;
    potentialProfit?: number[];
    totalPotentialProfit?: number;
    partialCloseAmounts?: number[];
    partialCloseSizes?: string[];
    moveToBreakeven?: boolean;
    isValid?: boolean;
    validationMessage?: string;
    assetCategory?: string;
    contractSize: number;
    pipValue: number;

    // AI Analysis Details
    priceAction?: any;
    chartPatterns?: any;
    technicalAnalysis?: any;
    fundamentalContext?: any;
    timeframeRationale?: string;
}

export interface MomentumAsset {
    symbol: string;
    momentum: 'Bullish' | 'Bearish';
    reason: string;
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

export type TradingStyle = 'scalping(1 to 15mins)' | 'scalping(15 to 30mins)' | 'day trading(1 to 2hrs)' | 'day trading(2 to 4hrs)' | 'swing trading';

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    images?: string[]; // Data URL for rendering
}
