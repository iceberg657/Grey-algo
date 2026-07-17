
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

export interface AccountSettings {
    accountBalance: number;      // e.g., 2000 USD
    riskPerTradePercent: number; // e.g., 2 (%)
    profitTargetPercent: number; // e.g., 5 (%)
    dailyDrawdownPercent: number; // e.g., 2.5 (%)
    maxDrawdownPercent: number;   // e.g., 5 (%)
}

export interface UserSettings extends Partial<AccountSettings> {
    accountType: 'Real' | 'Funded';
    accountBalance: number;
    accountSize?: number; // Alias often used interchangeably
    riskPerTrade: number; // Maps to riskPerTradePercent
    targetPercentage: number; // Maps to profitTargetPercent
    dailyDrawdown: number; // Maps to dailyDrawdownPercent
    maxDrawdown: number; // Maps to maxDrawdownPercent
    timeLimit: number; // days
    
    // Advanced Settings
    allowedMarkets?: string[];
    maxDailyLoss?: number; // Percent
    maxTradesPerDay?: number;
    tradingSession?: TradingSessionConfig;
    riskRewardRatio?: string;
    partialClose?: PartialCloseConfig;
    tradeMode?: 'Aggressive' | 'Sniper';
    executionAlgorithm?: 'Standard' | 'TWAP' | 'VWAP' | 'Smart Order Router (SOR)' | 'Implementation Shortfall';
    twelveDataApiKey?: string;
    derivApiToken?: string;
    tradeNotificationDerivToken?: string;
    geminiApiKey?: string;
    useStrictKeyMode?: boolean;
    deepThinking?: boolean;
    language?: string;
    streamingMode?: 'Standard' | 'Advanced';
    enableCTrader?: boolean;
    showDashboardSignals?: boolean;
    playSoundOnNotification?: boolean;
    ctraderClientId?: string;
    ctraderClientSecret?: string;
    ctraderRedirectUri?: string;
}

export interface GlobalTrendInfo {
    momentum: 'Bullish' | 'Bearish';
    reason: string;
    trend1Hr: 'Bullish' | 'Bearish' | 'Neutral';
    trend4Hr: 'Bullish' | 'Bearish' | 'Neutral';
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

    advancedQuantSignal?: any; // Contains the TieredSignal from advanced quant execution
    
    globalContext?: string;
    globalTrend?: GlobalTrendInfo;
    learnedStrategies?: string[];
    userSettings?: UserSettings;
    twelveDataQuote?: any;
    quantData?: any;
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

export interface InstitutionalDriver {
    category: string;
    details: string;
    bias: 'Bullish' | 'Bearish' | 'Neutral';
}

export interface FundamentalDriver {
    category: string;
    details: string;
    bias: 'Bullish' | 'Bearish' | 'Neutral';
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

export interface DemandSupplyZone {
    type: "demand" | "supply";
    priceRange: { upper: number; lower: number };
    confirmed: boolean;
    strength: "weak" | "medium" | "strong";
}

export interface VerificationStep {
    passed: boolean;
    reasoning: string;
}

export interface VerificationProtocol {
    higherTimeframeCheck: VerificationStep;
    liquiditySweepCheck: VerificationStep;
    riskRewardCheck: VerificationStep;
}

export interface Trade {
    id?: string;
    uid: string;
    asset: string;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    timestamp: number;
    outcome: 'Win' | 'Loss' | 'No Trade' | 'Pending';
    notes?: string;
    signalData: SignalData;
}

export interface SignalData {
    id: string;
    timestamp: number;
    asset: string;
    timeframe: string;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    priceAtSignal?: number;
    entryPoints: number[];
    entryRange?: { min: number; max: number };
    entryType: 'Market Execution' | 'Buy Limit' | 'Sell Limit' | 'Buy Stop' | 'Sell Stop' | 'Buy Stop Limit' | 'Sell Stop Limit';
    expirationTime?: string;
    triggerConditions?: {
        breakoutLevel: number;
        retestLogic: string;
        entryTriggerCandle: string;
    };
    stopLoss: number;
    takeProfits: number[];
    rrLevels?: {
        risk: number;
        reward1: number;
        reward2: number;
        reward3: number;
        riskPips?: number;
        tp1?: number;
        tp2?: number;
        tp3?: number;
        rrRatios?: { tp1: string; tp2: string; tp3: string };
        breakeven?: number;
        partialClose?: string;
    };
    heatmapData?: { price: number; volume: number; type: 'ask' | 'bid' }[];
    positionProtocol?: string;
    reasoning: string[];
    insight: string;
    checklist?: string[];
    invalidationScenario?: string;
    counterArgumentRejection?: string;
    riskAnalysis?: RiskAnalysis;
    sentiment?: Sentiment;
    sources?: {
        uri: string;
        title: string;
    }[];
    usedBroker?: string;
    
    // Extended Trade Setup Fields
    calculatedRR?: string;
    riskRewardRatio?: string;
    lotSize?: number;
    formattedLotSize?: string;
    riskAmount?: number;
    potentialProfit?: number[];
    totalPotentialProfit?: number;
    possiblePips?: number; // New field for estimated pips to target
    winProbability?: number; // Estimated probability of hitting the target
    recommendedPositions?: number; // Number of positions to split the trade into
    positionLotSize?: string; // Lot size per position
    neutralConditions?: {
        buyConditions: string[];
        sellConditions: string[];
        buySetupExample: {
            asset: string;
            signal: string;
            entry: string;
            sl: string;
            tp1: string;
            tp2: string;
            tp3: string;
            type: string;
            lotSize: string;
        };
        sellSetupExample: {
            asset: string;
            signal: string;
            entry: string;
            sl: string;
            tp1: string;
            tp2: string;
            tp3: string;
            type: string;
            lotSize: string;
        };
    };
    partialCloseAmounts?: number[];
    partialCloseSizes?: string[];
    moveToBreakeven?: boolean;
    isValid?: boolean;
    validationMessage?: string;
    assetCategory?: string;
    contractSize: number;
    pipValue: number;
    tradeMode?: 'Aggressive' | 'Sniper';

    // AI Analysis Details
    priceAction?: any;
    chartPatterns?: any;
    technicalAnalysis?: any;
    fundamentalContext?: any;
    timeframeRationale?: string;
    oteLevels?: { upper: number; lower: number }; // Added OTE levels
    visiblePriceRange?: { high: number; lower: number };
    candlestickPatterns?: string[];
    demandSupplyZones?: DemandSupplyZone[];
    confirmationPattern?: string;
    confluenceMatrix?: {
        latestPrice: number;
        fvg: { type: "bullish" | "bearish"; upper: number; lower: number } | null;
        triggeredEntries: {
            fvg: boolean;
            fvgRetest: boolean;
            sdLong: boolean;
            sdShort: boolean;
            sdPlusFVGConfluence: boolean;
        };
        ltfExecutionBias?: "Bullish" | "Bearish" | "Neutral";
        marketTrend?: "Bullish" | "Bearish" | "Neutral";
        atrVolatility?: "High" | "Low" | "Choppy";
        executionChecklist?: string[];
        // 90% Profitability Mandate Criteria
        multiTimeframeAlignment?: boolean;
        sessionVolume?: "High" | "Medium" | "Low";
        liquiditySweepConfirmed?: boolean;
        inducementIdentified?: boolean;
        // Truth Layer Indicators
        rsi?: number;
        sma?: number;
        stddev?: number;
        atr?: number;
        adx?: number;
    };
    neuralFilter?: {
        passed: boolean;
        confidenceBoost: number;
        reasoning: string;
    };
    verificationProtocol?: VerificationProtocol;

    institutionalDrivers?: InstitutionalDriver[];
    fundamentalDrivers?: FundamentalDriver[];
    marketStory?: string;
    twelveDataQuote?: any;
    timingCalibration?: {
        optimalSession: string;
        timeBasedEntryScore: number;
        interestWindow: string;
        hftActivityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
        institutionalVolumeExpected: boolean;
        setupValidityDuration: string;
        triggerHourUtc: string;
    };
}

export interface MomentumAsset {
    symbol: string;
    momentum: 'Bullish' | 'Bearish';
    reason: string;
    trend1Hr?: 'Bullish' | 'Bearish' | 'Neutral';
    trend4Hr?: 'Bullish' | 'Bearish' | 'Neutral';
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

export interface IntelligenceReport {
    asset: string;
    trend: {
        h1: 'Bullish' | 'Bearish' | 'Neutral';
        h4: 'Bullish' | 'Bearish' | 'Neutral';
    };
    poiZones: DemandSupplyZone[];
    newsRisk: 'Low' | 'Medium' | 'High';
    setupQuality: number; // 0-100
    action: 'Ready to trade' | 'Wait';
    summary: string;
    timestamp: number;
    metrics?: {
        rsi?: number;
        adx?: number;
        atr?: number;
    };
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
    timestamp?: number;
}

export interface UserMetadata {
    uid: string;
    email: string;
    role: 'user' | 'admin';
    analysisCount: number;
    isRevoked?: boolean;
    access: {
        autoTrade: 'locked' | 'pending' | 'granted';
        products: 'locked' | 'pending' | 'granted';
        sniperLiveTrade: 'locked' | 'pending' | 'granted';
        advancedStreaming: 'locked' | 'pending' | 'granted';
    };
    mt5Credentials?: {
        server: string;
        login: string;
        password?: string; // Encrypted
    };
    createdAt: number;
}

export interface GlobalStrategy {
    id?: string;
    rule: string;
    confidence: number;
    sourceCount: number;
    timestamp: number;
}

export interface AutoMLStrategy {
    id: string;
    name: string;
    description: string;
    rules: string;
    timestamp: number;
    performance: number;
    isActive: boolean;
}

export interface Broadcast {
    id?: string;
    message: string;
    timestamp: number;
    active: boolean;
}

export interface AdminSettings {
    maintenanceMode: boolean;
    chatLocked: boolean;
    sniperLocked: boolean;
    autoTradeLocked: boolean;
    updatedAt: number;
}

export interface AntigravityVerdict {
    verdict: 'PROCEED_BUY' | 'PROCEED_SELL' | 'VETO';
    confidence: number;
    flawsFound: string[];
    quantConnectStrategyId: string;
    dynamicLotMultiplier: string;
    dynamicRiskReward: string;
    executiveSummary: string;
    deepAnalysisMarkdown: string;
}

