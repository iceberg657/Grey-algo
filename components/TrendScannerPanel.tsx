import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    TrendingUp, TrendingDown, RefreshCw, Search, AlertCircle, Info, CheckCircle2, 
    Compass, Award, Cpu, BookOpen, Activity, ArrowRight, Server, ChevronRight,
    FileText
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { initializeApiKey, getSniperKey } from '../services/retryUtils';

interface Candle {
    epoch: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface MarketAsset {
    symbol: string;
    name: string;
    category: 'crypto' | 'forex_majors' | 'forex_minors' | 'indices' | 'synthetics' | 'metals';
}

const ASSET_CATEGORIES: { id: MarketAsset['category']; label: string }[] = [
    { id: 'forex_majors', label: 'Forex Majors' },
    { id: 'forex_minors', label: 'Forex Minors' },
    { id: 'metals', label: 'Metals' },
    { id: 'crypto', label: 'Cryptocurrency' },
    { id: 'indices', label: 'Indices' },
    { id: 'synthetics', label: 'Synthetic Indices' }
];

const ASSETS: MarketAsset[] = [
    // Forex Majors
    { symbol: 'EURUSD', name: 'EUR/USD (Euro / US Dollar)', category: 'forex_majors' },
    { symbol: 'GBPUSD', name: 'GBP/USD (Pound / US Dollar)', category: 'forex_majors' },
    { symbol: 'USDJPY', name: 'USD/JPY (US Dollar / Japanese Yen)', category: 'forex_majors' },
    { symbol: 'AUDUSD', name: 'AUD/USD (Australian Dollar / US Dollar)', category: 'forex_majors' },
    
    // Forex Minors
    { symbol: 'USDCAD', name: 'USD/CAD (US Dollar / Canadian Dollar)', category: 'forex_minors' },
    { symbol: 'USDCHF', name: 'USD/CHF (US Dollar / Swiss Franc)', category: 'forex_minors' },
    { symbol: 'NZDUSD', name: 'NZD/USD (New Zealand Dollar / US Dollar)', category: 'forex_minors' },
    
    // Metals
    { symbol: 'XAUUSD', name: 'XAU/USD (Gold)', category: 'metals' },
    { symbol: 'XAGUSD', name: 'XAG/USD (Silver)', category: 'metals' },
    { symbol: 'XPTUSD', name: 'XPT/USD (Platinum)', category: 'metals' },
    { symbol: 'XPDUSD', name: 'XPD/USD (Palladium)', category: 'metals' },
    
    // Crypto
    { symbol: 'BTCUSD', name: 'BTC/USD (Bitcoin)', category: 'crypto' },
    { symbol: 'ETHUSD', name: 'ETH/USD (Ethereum)', category: 'crypto' },
    { symbol: 'LTCUSD', name: 'LTC/USD (Litecoin)', category: 'crypto' },
    
    // Indices
    { symbol: 'US30', name: 'Dow Jones 30 (US30)', category: 'indices' },
    { symbol: 'NAS100', name: 'Nasdaq 100 (NAS100)', category: 'indices' },
    { symbol: 'SPX500', name: 'S&P 500 (SP500)', category: 'indices' },
    { symbol: 'UK100', name: 'FTSE 100 (UK100)', category: 'indices' },
    { symbol: 'GER Germany 40', name: 'Germany 40 (DAX)', category: 'indices' },
    { symbol: 'JPN225', name: 'Nikkei 225 (JPN225)', category: 'indices' },
    
    // Synthetics
    { symbol: 'R_10', name: 'Volatility 10 Index', category: 'synthetics' },
    { symbol: 'R_25', name: 'Volatility 25 Index', category: 'synthetics' },
    { symbol: 'R_50', name: 'Volatility 50 Index', category: 'synthetics' },
    { symbol: 'R_75', name: 'Volatility 75 Index', category: 'synthetics' },
    { symbol: 'R_100', name: 'Volatility 100 Index', category: 'synthetics' },
    { symbol: 'BOOM300', name: 'Boom 300 Index', category: 'synthetics' },
    { symbol: 'CRASH300', name: 'Crash 300 Index', category: 'synthetics' }
];

const TIMEFRAMES = [
    { label: '1m', value: '60' },
    { label: '5m', value: '300' },
    { label: '15m', value: '900' },
    { label: '30m', value: '1800' },
    { label: '1H', value: '3600' },
    { label: '4H', value: '14400' },
    { label: '1D', value: '86400' }
];

// Technical analysis interfaces
interface TechnicalAnalysisResult {
    symbol: string;
    lastPrice: number;
    priceChange: number;
    priceChangePercent: number;
    ema20: number;
    ema50: number;
    rsi: number;
    trend: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
    confluenceScore: number;
    support: number;
    resistance: number;
    isStale: boolean;
    candles: Candle[];
    fvg?: 'BULLISH' | 'BEARISH' | 'NONE';
    liquidityPool?: 'EQUAL_HIGHS' | 'EQUAL_LOWS' | 'NONE';
}

export const TrendScannerPanel: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<MarketAsset['category']>('forex_majors');
    const [selectedTimeframe, setSelectedTimeframe] = useState<string>('3600'); // Default 1H
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
    
    const [scannedData, setScannedData] = useState<Record<string, TechnicalAnalysisResult>>({});
    const [loadingSymbols, setLoadingSymbols] = useState<Record<string, boolean>>({});
    const [globalLoading, setGlobalLoading] = useState<boolean>(false);
    
    // AI Advice State
    const [aiAdvisorText, setAiAdvisorText] = useState<string>('');
    const [isGeneratingAdvice, setIsGeneratingAdvice] = useState<boolean>(false);
    const [adviceSymbol, setAdviceSymbol] = useState<string>('');
    const [adviceTimeframe, setAdviceTimeframe] = useState<string>('');
    const [customInstructions, setCustomInstructions] = useState<string>(() => {
        return localStorage.getItem('greyquant_scanner_custom_instructions') || '';
    });

    useEffect(() => {
        localStorage.setItem('greyquant_scanner_custom_instructions', customInstructions);
    }, [customInstructions]);

    // Filtered symbol list
    const filteredAssets = useMemo(() => {
        return ASSETS.filter(asset => {
            const matchesCategory = asset.category === selectedCategory;
            const matchesSearch = asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  asset.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && (searchQuery ? matchesSearch : true);
        });
    }, [selectedCategory, searchQuery]);

    // Ensure selected symbol matches category
    useEffect(() => {
        if (filteredAssets.length > 0) {
            const hasSelectedInFiltered = filteredAssets.some(a => a.symbol === selectedSymbol);
            if (!hasSelectedInFiltered) {
                setSelectedSymbol(filteredAssets[0].symbol);
            }
        }
    }, [selectedCategory, filteredAssets]);

    // Calculate Exponential Moving Average (EMA)
    const calculateEMA = (prices: number[], period: number): number[] => {
        if (prices.length < period) return [];
        const k = 2 / (period + 1);
        let emaArray: number[] = [];
        
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        let prevEma = sum / period;
        emaArray.push(prevEma);

        for (let i = period; i < prices.length; i++) {
            const ema = prices[i] * k + prevEma * (1 - k);
            emaArray.push(ema);
            prevEma = ema;
        }
        return emaArray;
    };

    // Calculate Relative Strength Index (RSI)
    const calculateRSI = (prices: number[], period: number = 14): number => {
        if (prices.length <= period) return 50;
        let gains = 0;
        let losses = 0;

        for (let i = 1; i <= period; i++) {
            const diff = prices[i] - prices[i - 1];
            if (diff > 0) gains += diff;
            else losses -= diff;
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period + 1; i < prices.length; i++) {
            const diff = prices[i] - prices[i - 1];
            let gain = diff > 0 ? diff : 0;
            let loss = diff < 0 ? -diff : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    };

    // Technical indicator analysis pipeline
    const analyzeCandles = (symbol: string, candles: Candle[]): TechnicalAnalysisResult => {
        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        
        const lastPrice = closes[closes.length - 1] || 0;
        const previousClose = closes[closes.length - 2] || lastPrice;
        const initialClose = closes[Math.max(0, closes.length - 24)] || closes[0] || lastPrice; // 24 periods ago change
        
        const priceChange = lastPrice - previousClose;
        const priceChangePercent = previousClose ? (priceChange / previousClose) * 100 : 0;

        // EMAs
        const ema20List = calculateEMA(closes, 20);
        const ema50List = calculateEMA(closes, 50);
        
        const lastEma20 = ema20List[ema20List.length - 1] || lastPrice;
        const lastEma50 = ema50List[ema50List.length - 1] || lastPrice;

        // RSI
        const rsiValue = calculateRSI(closes, 14);

        // Support and Resistance (last 30 periods local swing extremes)
        const recentHighs = highs.slice(-30);
        const recentLows = lows.slice(-30);
        const resistance = recentHighs.length > 0 ? Math.max(...recentHighs) : lastPrice;
        const support = recentLows.length > 0 ? Math.min(...recentLows) : lastPrice;

        // Confluence Scoring Algorithm (0 - 100 Bullish strength score)
        let score = 50; // Base Neutral

        // 1. Moving Averages crossover filter (Max 25 pts)
        if (lastEma20 > lastEma50) {
            score += 15;
            // Stronger cross definition
            if (lastEma20 > lastEma50 * 1.001) score += 10;
        } else {
            score -= 15;
            if (lastEma20 < lastEma50 * 0.999) score -= 10;
        }

        // 2. Location relative to EMA filters (Max 20 pts)
        if (lastPrice > lastEma20) score += 10;
        else score -= 10;

        if (lastPrice > lastEma50) score += 10;
        else score -= 10;

        // 3. Momentum indicators (RSI) (Max 25 pts)
        if (rsiValue > 50) {
            score += 10;
            if (rsiValue > 60 && rsiValue < 75) {
                // Perfect Bullish acceleration
                score += 15;
            } else if (rsiValue >= 75) {
                // Overbought cautious
                score += 5;
            }
        } else {
            score -= 10;
            if (rsiValue < 40 && rsiValue > 25) {
                // Perfect Bearish acceleration
                score -= 15;
            } else if (rsiValue <= 25) {
                // Oversold cautious
                score -= 5;
            }
        }

        // 4. Trend Slope (Price 10 periods ago vs now) (Max 30 pts)
        const midPeriodClose = closes[closes.length - 10] || lastPrice;
        if (lastPrice > midPeriodClose) {
            score += 15;
        } else {
            score -= 15;
        }

        // Bound score [0, 100]
        const finalScore = Math.max(0, Math.min(100, score));

        // Determine trend state
        let trend: TechnicalAnalysisResult['trend'] = 'NEUTRAL';
        if (finalScore >= 80) trend = 'STRONG_BULLISH';
        else if (finalScore >= 60) trend = 'BULLISH';
        else if (finalScore <= 20) trend = 'STRONG_BEARISH';
        else if (finalScore <= 40) trend = 'BEARISH';

        // Check staleness (Last candle timestamp vs client time)
        const lastCandle = candles[candles.length - 1];
        const isStale = lastCandle ? (Math.floor(Date.now() / 1000) - lastCandle.epoch > parseInt(selectedTimeframe) * 3) : false;


        // Check for FVG in the last 10 candles
        let fvgStatus: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
        for (let i = candles.length - 1; i >= Math.max(0, candles.length - 10); i--) {
            const c1 = candles[i - 2];
            const c3 = candles[i];
            if (c1 && c3) {
                if (c1.high < c3.low) fvgStatus = 'BULLISH';
                else if (c1.low > c3.high) fvgStatus = 'BEARISH';
            }
            if (fvgStatus !== 'NONE') break;
        }

        // Check for Liquidity Pools (Equal Highs / Equal Lows)
        let liquidityPool: 'EQUAL_HIGHS' | 'EQUAL_LOWS' | 'NONE' = 'NONE';
        const maxHigh = Math.max(...recentHighs);
        const minLow = Math.min(...recentLows);
        
        const highsNearMax = recentHighs.filter(h => (maxHigh - h) / maxHigh < 0.0005);
        const lowsNearMin = recentLows.filter(l => (l - minLow) / minLow < 0.0005);
        
        if (highsNearMax.length >= 2) {
            liquidityPool = 'EQUAL_HIGHS';
        } else if (lowsNearMin.length >= 2) {
            liquidityPool = 'EQUAL_LOWS';
        }

        return {
            symbol,
            lastPrice,
            priceChange,
            priceChangePercent,
            ema20: lastEma20,
            ema50: lastEma50,
            rsi: rsiValue,
            trend,
            confluenceScore: finalScore,
            support,
            resistance,
            isStale,
            candles,
            fvg: fvgStatus,
            liquidityPool
        };
    };

    // Scan a single asset from Deriv
    const scanAsset = async (symbol: string, forceSilent = false) => {
        if (!forceSilent) {
            setLoadingSymbols(prev => ({ ...prev, [symbol]: true }));
        }
        
        try {
            // Count = 100 for proper indicators smoothing (especially 50 EMA and RSI)
            const query = `/api/derivData?symbol=${symbol}&history=true&granularity=${selectedTimeframe}&count=100`;
            const res = await fetch(query);
            if (!res.ok) throw new Error(`HTTP status ${res.status}`);
            
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            if (data.candles && data.candles.length > 0) {
                const analysis = analyzeCandles(symbol, data.candles);
                setScannedData(prev => ({ ...prev, [symbol]: analysis }));
            }
        } catch (err) {
            console.error(`Error scanning ${symbol} on timeframe ${selectedTimeframe}:`, err);
        } finally {
            if (!forceSilent) {
                setLoadingSymbols(prev => ({ ...prev, [symbol]: false }));
            }
        }
    };

    // Scan all visible symbols
    const scanAllVisible = async () => {
        setGlobalLoading(true);
        const promises = filteredAssets.map(asset => scanAsset(asset.symbol, false));
        await Promise.all(promises);
        setGlobalLoading(false);
    };

    // Scan active symbols when Category or Timeframe changes
    useEffect(() => {
        scanAllVisible();
    }, [selectedCategory, selectedTimeframe]);

    // Keep active selected asset refreshed
    const activeAnalysis = scannedData[selectedSymbol];

    // Trigger AI Agent to formulate institutional opinion
    const triggerAIAssistant = async () => {
        if (!activeAnalysis) return;
        
        setIsGeneratingAdvice(true);
        setAiAdvisorText('');
        setAdviceSymbol(selectedSymbol);
        setAdviceTimeframe(selectedTimeframe);
        
        try {
            await initializeApiKey();
            const sniperKey = getSniperKey();
            
            const timeFrameLabel = TIMEFRAMES.find(t => t.value === selectedTimeframe)?.label || '1H';
            const recentCandlesDesc = activeAnalysis.candles.slice(-10).map((c, i) => {
                const date = new Date(c.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `[${date}] O:${c.open.toFixed(4)} H:${c.high.toFixed(4)} L:${c.low.toFixed(4)} C:${c.close.toFixed(4)}`;
            }).join('\n');

            let prompt = `You are GreyAlpha, an elite algorithmic, institutional quantitative trading advisor.
Analyze the following technical snapshot and recent market OHLC data retrieved via Deriv for ${selectedSymbol} on the ${timeFrameLabel} timeframe:

MARKET METRICS:
- Current Price: ${activeAnalysis.lastPrice.toFixed(4)}
- Session Price Change: ${activeAnalysis.priceChangePercent.toFixed(3)}%
- EMA 20: ${activeAnalysis.ema20.toFixed(4)}
- EMA 50: ${activeAnalysis.ema50.toFixed(4)}
- Relative Strength Index (RSI 14): ${activeAnalysis.rsi.toFixed(1)} (Bias: ${activeAnalysis.rsi > 70 ? 'Overbought' : activeAnalysis.rsi < 30 ? 'Oversold' : 'Neutral Momentum'})
- Swing Support: ${activeAnalysis.support.toFixed(4)}
- Swing Resistance: ${activeAnalysis.resistance.toFixed(4)}
- Math-Model Trend Bias: ${activeAnalysis.trend} (Confluence: ${activeAnalysis.confluenceScore}/100)
- Institutional Liquidity Pools: ${activeAnalysis.liquidityPool === 'EQUAL_HIGHS' ? 'EQUAL HIGHS DETECTED' : activeAnalysis.liquidityPool === 'EQUAL_LOWS' ? 'EQUAL LOWS DETECTED' : 'None Detected'}
- Institutional Imbalances (FVG): ${activeAnalysis.fvg === 'BULLISH' ? 'BULLISH FVG DETECTED' : activeAnalysis.fvg === 'BEARISH' ? 'BEARISH FVG DETECTED' : 'None Detected'}

RECENT OHLC HISTORICAL CANDLES:
${recentCandlesDesc}`;

            if (customInstructions && customInstructions.trim()) {
                prompt += `\n\nADDITIONAL USER ANALYSIS DIRECTIVES & NOTES:
The user has provided the following custom context or analysis guidelines. You MUST incorporate these notes and follow them strictly in your in-depth analysis:
"${customInstructions.trim()}"`;
            }

            prompt += `\n\nTASK:
Provide a highly professional, highly in-depth, and precise strategic trading plan giving a clean setup for the ${timeFrameLabel} timeframe. Strictly keep it to 4 clean sections:
1. **Institutional Trap Analysis**: Formulate a comprehensive, in-depth argument for why this asset is structurally Bullish or Bearish from an institutional perspective (Smart Money Concepts). Focus heavily on analyzing the detected Liquidity Pools and FVGs to identify potential counter-trend Stop Hunts before entry.
2. **Key Battle Zones**: Specify a tactical Entry Zone (POIs/Order Blocks). If Equal Highs/Lows are present, position entries AFTER the expected liquidity sweep. Provide exact mathematical Stop Loss and Take Profit zones.
3. **Execution Directive**: Give an immediate operational guideline emphasizing Lower Timeframe (LTF) Confirmation (e.g., 'Wait for CHoCH on LTF after liquidity sweep', 'LIMIT BUY at FVG mitigation').
4. **Timing & Patience Threshold**: Explicitly state if the user should execute/analyze and trade immediately, or wait for some certain amount of time or specific criteria before doing so (e.g., 'WAIT 30-45 minutes for London open', 'WAIT for NY Session sweep', 'WAIT for FVG mitigation', 'TRADE IMMEDIATELY - setup is active'). Give clear temporal suggestions or wait-time criteria.

Be objective, authoritative, and direct. Do not include any standard financial disclaimers or flowery introductions. Use elegant Markdown.`;

            // Server-side Gemini API call proxy for premium secure processing
            const response = await fetch('/api/gemini/antigravity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    apiKey: sniperKey,
                })
            });

            if (!response.ok) {
                throw new Error(`Proxy error: ${response.status}`);
            }

            const data = await response.json();
            const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No tactical analysis received.';
            setAiAdvisorText(textResult);
        } catch (err: any) {
            console.error('Failed to fetch AI advise:', err);
            setAiAdvisorText(`**Institutional Link Severed**: ${err.message || 'Error communicating with Gemini intelligence'}. Please ensure your GEMINI_API_KEY is configured in your settings page.`);
        } finally {
            setIsGeneratingAdvice(false);
        }
    };

    // Clear stale advisor states when switching symbol
    useEffect(() => {
        setAiAdvisorText('');
    }, [selectedSymbol, selectedTimeframe]);

    // Format epoch
    const formatEpoch = (epoch: number) => {
        const d = new Date(epoch * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getTrendBadge = (trend: TechnicalAnalysisResult['trend']) => {
        switch (trend) {
            case 'STRONG_BULLISH':
                return (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        <TrendingUp size={11} /> Strong Buy
                    </span>
                );
            case 'BULLISH':
                return (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 px-2.5 py-1 rounded-full">
                        <TrendingUp size={11} /> Mild Buy
                    </span>
                );
            case 'STRONG_BEARISH':
                return (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2.5 py-1 rounded-full">
                        <TrendingDown size={11} /> Strong Sell
                    </span>
                );
            case 'BEARISH':
                return (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-rose-500/5 text-rose-400 border border-rose-500/10 px-2.5 py-1 rounded-full">
                        <TrendingDown size={11} /> Mild Sell
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/50 dark:border-slate-700 px-2.5 py-1 rounded-full">
                        Consolidating
                    </span>
                );
        }
    };

    // Interactive Sparkline Generator
    const renderSparkline = (candles: Candle[]) => {
        if (!candles || candles.length === 0) return null;
        const prices = candles.map(c => c.close);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;

        const width = 120;
        const height = 40;
        const padding = 2;

        const points = prices.map((price, idx) => {
            const x = (idx / (prices.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((price - min) / range) * (height - padding * 2) - padding;
            return `${x},${y}`;
        }).join(' ');

        const isBullish = prices[prices.length - 1] >= prices[0];
        const strokeColor = isBullish ? '#10b981' : '#f43f5e';

        return (
            <svg width={width} height={height} className="overflow-visible">
                <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.5"
                    points={points}
                />
            </svg>
        );
    };

    // Technical Chart Drawing
    const renderFullChart = (candles: Candle[], ema20Val: number, ema50Val: number) => {
        if (!candles || candles.length < 10) return null;
        
        // Take last 30 candles for clean presentation
        const visibleCandles = candles.slice(-30);
        const prices = visibleCandles.map(c => c.close);
        const highs = visibleCandles.map(c => c.high);
        const lows = visibleCandles.map(c => c.low);
        
        const absoluteMin = Math.min(...lows);
        const absoluteMax = Math.max(...highs);
        const range = absoluteMax - absoluteMin || 1;
        
        const chartWidth = 500;
        const chartHeight = 220;
        const paddingY = 20;
        const usableHeight = chartHeight - paddingY * 2;
        
        // Compute coordinate mappings
        const getX = (index: number) => (index / (visibleCandles.length - 1)) * (chartWidth - 40) + 20;
        const getY = (val: number) => chartHeight - ((val - absoluteMin) / range) * usableHeight - paddingY;

        // Generate line path for EMA 20 and EMA 50
        // To draw overlay, we calculate EMA list over the visible elements
        const ema20Coords: string[] = [];
        const ema50Coords: string[] = [];
        
        visibleCandles.forEach((candle, idx) => {
            // Re-calculate local EMA point mapping
            const globalIndex = candles.indexOf(candle);
            
            // Get EMA lists
            const localCloses = candles.slice(0, globalIndex + 1).map(c => c.close);
            const ema20Arr = calculateEMA(localCloses, 20);
            const ema50Arr = calculateEMA(localCloses, 50);
            
            const currentEma20 = ema20Arr[ema20Arr.length - 1];
            const currentEma50 = ema50Arr[ema50Arr.length - 1];
            
            if (currentEma20) ema20Coords.push(`${getX(idx)},${getY(currentEma20)}`);
            if (currentEma50) ema50Coords.push(`${getX(idx)},${getY(currentEma50)}`);
        });

        return (
            <div className="relative w-full overflow-hidden bg-slate-950 p-6 rounded-3xl border border-slate-850">
                <div className="absolute top-4 left-4 flex gap-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> Price</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-500"/> EMA 20</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500"/> EMA 50</span>
                </div>
                
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                    {/* Grid Lines */}
                    {[0.25, 0.5, 0.75].map((ratio, i) => {
                        const yVal = chartHeight - paddingY - ratio * usableHeight;
                        const labelPrice = absoluteMin + ratio * range;
                        return (
                            <g key={i}>
                                <line 
                                    x1="20" y1={yVal} x2={chartWidth - 20} y2={yVal} 
                                    stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" 
                                />
                                <text x={chartWidth - 5} y={yVal + 3} fill="#475569" fontSize="8" textAnchor="end" className="font-mono">
                                    {labelPrice.toFixed(selectedSymbol.includes('JPY') ? 2 : 4)}
                                </text>
                            </g>
                        );
                    })}

                    {/* EMA 50 Line */}
                    {ema50Coords.length > 1 && (
                        <polyline
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.25"
                            strokeOpacity="0.7"
                            points={ema50Coords.join(' ')}
                        />
                    )}

                    {/* EMA 20 Line */}
                    {ema20Coords.length > 1 && (
                        <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.25"
                            strokeOpacity="0.7"
                            points={ema20Coords.join(' ')}
                        />
                    )}

                    {/* Japanese Candlesticks */}
                    {visibleCandles.map((candle, idx) => {
                        const cx = getX(idx);
                        const cyOpen = getY(candle.open);
                        const cyClose = getY(candle.close);
                        const cyHigh = getY(candle.high);
                        const cyLow = getY(candle.low);
                        
                        const isBullish = candle.close >= candle.open;
                        const bodyColor = isBullish ? '#10b981' : '#ef4444';
                        const wickColor = isBullish ? '#10b981bb' : '#ef4444bb';
                        
                        const bodyWidth = Math.max(2, Math.floor(chartWidth / visibleCandles.length * 0.5));
                        const bodyY = Math.min(cyOpen, cyClose);
                        const bodyHeight = Math.max(1.5, Math.abs(cyOpen - cyClose));

                        return (
                            <g key={idx} className="group cursor-pointer">
                                <title>
                                    {`Time: ${formatEpoch(candle.epoch)}\nOpen: ${candle.open.toFixed(4)}\nHigh: ${candle.high.toFixed(4)}\nLow: ${candle.low.toFixed(4)}\nClose: ${candle.close.toFixed(4)}`}
                                </title>
                                {/* Shadow Wick */}
                                <line x1={cx} y1={cyHigh} x2={cx} y2={cyLow} stroke={wickColor} strokeWidth="1" />
                                {/* Candle Body */}
                                <rect 
                                    x={cx - bodyWidth / 2} y={bodyY} 
                                    width={bodyWidth} height={bodyHeight} 
                                    fill={bodyColor} rx="0.5" 
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col gap-6">
            
            {/* Control Hub Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                        <Cpu className="text-emerald-500 animate-pulse" size={18} /> Deriv Live Trend Scanner
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Algorithmic momentum scanner sourcing institutional feeds and OHLC datasets from Deriv.
                    </p>
                </div>

                <div className="flex flex-nowrap items-center gap-2 w-full md:w-auto overflow-hidden">
                    {/* Timeframe selector */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-850 overflow-x-auto scrollbar-none max-w-full flex-grow md:flex-grow-0">
                        {TIMEFRAMES.map(tf => (
                            <button
                                key={tf.value}
                                onClick={() => setSelectedTimeframe(tf.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                                    selectedTimeframe === tf.value 
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                                }`}
                            >
                                {tf.label}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={scanAllVisible}
                        disabled={globalLoading}
                        className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:text-emerald-500 rounded-2xl transition-colors disabled:opacity-50 flex-shrink-0"
                        title="Scan All Symbols"
                    >
                        <RefreshCw size={16} className={globalLoading ? "animate-spin text-emerald-500" : ""} />
                    </button>
                </div>
            </div>

            {/* Main Category Filter bar */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none border-b border-slate-200 dark:border-slate-800 pb-3">
                {ASSET_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                            selectedCategory === cat.id 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Double Column Bento Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Asset Browser (35% on Desktop) */}
                <div className="xl:col-span-4 flex flex-col gap-4 bg-white dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Quick search symbol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        />
                        <Search className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                    </div>

                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                        {filteredAssets.length === 0 ? (
                            <div className="text-center py-8 text-xs font-medium text-slate-400 italic">
                                No matching instruments found.
                            </div>
                        ) : (
                            filteredAssets.map(asset => {
                                const analysis = scannedData[asset.symbol];
                                const isLoading = loadingSymbols[asset.symbol];
                                const isSelected = selectedSymbol === asset.symbol;

                                return (
                                    <motion.div
                                        whileTap={{ scale: 0.99 }}
                                        key={asset.symbol}
                                        onClick={() => setSelectedSymbol(asset.symbol)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                            isSelected 
                                            ? 'bg-emerald-500/10 border-emerald-500/45 shadow-sm' 
                                            : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                                                    {asset.symbol}
                                                </span>
                                                {isLoading && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                                                {asset.name}
                                            </span>
                                        </div>

                                        {analysis ? (
                                            <div className="flex items-center gap-4 text-right">
                                                {/* Mini sparkline */}
                                                <div className="hidden sm:block opacity-60">
                                                    {renderSparkline(analysis.candles)}
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                                                        {analysis.lastPrice.toFixed(asset.symbol.includes('JPY') || asset.symbol.includes('BTC') ? 2 : 4)}
                                                    </span>
                                                    {getTrendBadge(analysis.trend)}
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    scanAsset(asset.symbol);
                                                }}
                                                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-xl hover:text-emerald-500 transition-colors"
                                            >
                                                Scan
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Detailed Trend Dashboard (65% on Desktop) */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    {activeAnalysis ? (
                        <div className="flex flex-col gap-6">
                            
                            {/* Big Stats Ribbon */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Quote</span>
                                    <span className="font-mono text-xl font-black text-slate-950 dark:text-white">
                                        {activeAnalysis.lastPrice.toFixed(selectedSymbol.includes('JPY') || selectedSymbol.includes('BTC') ? 2 : 4)}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trend Bias</span>
                                    <div className="flex items-center gap-1.5">
                                        {getTrendBadge(activeAnalysis.trend)}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confluence Strength</span>
                                    <span className={`font-mono text-lg font-black ${
                                        activeAnalysis.confluenceScore >= 60 ? 'text-emerald-500' :
                                        activeAnalysis.confluenceScore <= 40 ? 'text-rose-500' : 'text-slate-500'
                                    }`}>
                                        {activeAnalysis.confluenceScore}%
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current RSI(14)</span>
                                    <span className={`font-mono text-lg font-bold ${
                                        activeAnalysis.rsi > 70 ? 'text-rose-500' :
                                        activeAnalysis.rsi < 30 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'
                                    }`}>
                                        {activeAnalysis.rsi.toFixed(1)}
                                    </span>
                                </div>
                            </div>


                            {/* Structural Trap Analysis */}
                            <div className="flex flex-col gap-3 mt-2">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                                        Institutional Liquidity & Structure
                                    </h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Liquidity Pools</span>
                                        <span className={`font-mono text-sm font-bold ${
                                            activeAnalysis.liquidityPool === 'EQUAL_HIGHS' ? 'text-amber-500' :
                                            activeAnalysis.liquidityPool === 'EQUAL_LOWS' ? 'text-indigo-400' : 'text-slate-500'
                                        }`}>
                                            {activeAnalysis.liquidityPool === 'EQUAL_HIGHS' ? '🚨 EQUAL HIGHS (Buy Stops)' : 
                                             activeAnalysis.liquidityPool === 'EQUAL_LOWS' ? '🚨 EQUAL LOWS (Sell Stops)' : 'None Detected'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imbalances (FVG)</span>
                                        <span className={`font-mono text-sm font-bold ${
                                            activeAnalysis.fvg === 'BULLISH' ? 'text-emerald-500' :
                                            activeAnalysis.fvg === 'BEARISH' ? 'text-rose-500' : 'text-slate-500'
                                        }`}>
                                            {activeAnalysis.fvg === 'BULLISH' ? '📈 BULLISH FVG' : 
                                             activeAnalysis.fvg === 'BEARISH' ? '📉 BEARISH FVG' : 'None Detected'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">LTF Confirmation</span>
                                        <span className="font-mono text-sm font-bold text-slate-400">
                                            {activeAnalysis.fvg !== 'NONE' || activeAnalysis.liquidityPool !== 'NONE' ? '⏳ WAIT FOR CHoCH' : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
\n                            {/* Chart Overlay */}
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                                        Market Candle Profile (Last 30 Periods)
                                    </h4>
                                    {activeAnalysis.isStale && (
                                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                                            <AlertCircle size={10} /> Market Closed / Stale Data
                                        </span>
                                    )}
                                </div>
                                {renderFullChart(activeAnalysis.candles, activeAnalysis.ema20, activeAnalysis.ema50)}
                            </div>

                            {/* Indicators Bento Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Core Technical Matrix */}
                                <div className="bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 flex flex-col gap-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-850 pb-2">
                                        Quantitative Signposts
                                    </h4>

                                    <div className="flex flex-col gap-3.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-400">EMA Crossover (20 / 50)</span>
                                            <span className={activeAnalysis.ema20 > activeAnalysis.ema50 ? "text-emerald-500" : "text-rose-500"}>
                                                {activeAnalysis.ema20 > activeAnalysis.ema50 ? "Bullish Alignment (Golden)" : "Bearish Alignment (Death)"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-400">Location Relative to EMA 20</span>
                                            <span className={activeAnalysis.lastPrice > activeAnalysis.ema20 ? "text-emerald-500" : "text-rose-500"}>
                                                {activeAnalysis.lastPrice > activeAnalysis.ema20 ? "Above EMA 20 (Support)" : "Below EMA 20 (Resistance)"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-400">Location Relative to EMA 50</span>
                                            <span className={activeAnalysis.lastPrice > activeAnalysis.ema50 ? "text-emerald-500" : "text-rose-500"}>
                                                {activeAnalysis.lastPrice > activeAnalysis.ema50 ? "Above EMA 50 (Strong Anchor)" : "Below EMA 50 (Bearing Down)"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-400">Calculated Local Resistance</span>
                                            <span className="font-mono text-slate-700 dark:text-slate-200">
                                                {activeAnalysis.resistance.toFixed(selectedSymbol.includes('JPY') || selectedSymbol.includes('BTC') ? 2 : 4)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-400">Calculated Local Support</span>
                                            <span className="font-mono text-slate-700 dark:text-slate-200">
                                                {activeAnalysis.support.toFixed(selectedSymbol.includes('JPY') || selectedSymbol.includes('BTC') ? 2 : 4)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* RSI Gauge Detail */}
                                <div className="bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-850 pb-2 mb-4">
                                            Relative Strength momentum
                                        </h4>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                                            <span>Oversold (&lt;30)</span>
                                            <span>Neutral</span>
                                            <span>Overbought (&gt;70)</span>
                                        </div>
                                        {/* Horizontal Scale */}
                                        <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-slate-850">
                                            <div className="absolute left-[30%] right-[30%] h-full bg-slate-200/40 dark:bg-slate-800/40 border-x border-dashed border-slate-300 dark:border-slate-700" />
                                            {/* Cursor mapping */}
                                            <div 
                                                className={`absolute top-0 bottom-0 w-2.5 rounded-full border border-white dark:border-slate-900 shadow ${
                                                    activeAnalysis.rsi > 70 ? 'bg-rose-500' :
                                                    activeAnalysis.rsi < 30 ? 'bg-emerald-500' : 'bg-blue-500'
                                                }`}
                                                style={{ left: `calc(${activeAnalysis.rsi}% - 5px)` }}
                                            />
                                        </div>
                                        <div className="mt-4 text-xs font-medium text-slate-500 leading-relaxed">
                                            {activeAnalysis.rsi > 70 ? (
                                                <p className="text-rose-500 font-semibold">🚨 Momentum is extremely high and overbought. Be careful with buying. Consider looking for trend exhaustion setup near high-resistance blocks.</p>
                                            ) : activeAnalysis.rsi < 30 ? (
                                                <p className="text-emerald-500 font-semibold">✅ Momentum is extremely depleted and oversold. Look for trend reversal indicators, structural breaks, or mitigation of deep support blocks.</p>
                                            ) : (
                                                <p>Market is trading inside normal boundaries (30 - 70). Standard trend mitigation protocols are active; buy the EMA pullbacks or sell resistance mitigation.</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                                        <Info size={14} className="text-blue-500 shrink-0" />
                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                            Sourced dynamically from Deriv websockets at epoch interval.
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Advisor AI block */}
                            <div className="bg-slate-950 text-white rounded-3xl p-6 border border-slate-850 flex flex-col gap-4 relative overflow-hidden">
                                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -left-20 -top-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Cpu className="text-emerald-500 animate-pulse" size={20} />
                                        <div>
                                            <h4 className="font-bold text-sm">GreyAlpha Smart-Money Advisor</h4>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">AI Confluence Analysis</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={triggerAIAssistant}
                                        disabled={isGeneratingAdvice}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                                    >
                                        {isGeneratingAdvice ? (
                                            <>
                                                <RefreshCw size={12} className="animate-spin" /> Analyzing...
                                            </>
                                        ) : aiAdvisorText ? (
                                            <>
                                                <RefreshCw size={12} /> Re-Analyze Asset
                                            </>
                                        ) : (
                                            <>
                                                <Compass size={12} /> Formulate Plan
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Custom Text Input space for sending instructions to AI */}
                                <div className="flex flex-col gap-2.5 bg-slate-900/40 p-4 rounded-2xl border border-slate-850/60 z-10">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                        <FileText size={14} className="text-emerald-500" />
                                        <span>Custom Analysis Directives & Prompts</span>
                                    </div>
                                    <textarea
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        placeholder="e.g., 'Focus on news correlation with USD index; suggest waiting 45 minutes.', or custom prompts like 'Look for liquidity sweeps above the current high...'"
                                        className="w-full bg-slate-950/80 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/35 transition-all resize-none min-h-[75px]"
                                    />
                                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                                        <span>Custom instructions are appended to GreyAlpha's secure Gemini analysis query.</span>
                                        {customInstructions && (
                                            <button 
                                                onClick={() => setCustomInstructions('')}
                                                className="text-rose-400/80 hover:text-rose-400 transition-colors font-bold"
                                            >
                                                Clear Notes
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="text-xs leading-relaxed text-slate-300 font-medium">
                                    {isGeneratingAdvice ? (
                                        <div className="flex flex-col gap-3 py-6 items-center justify-center text-slate-500 font-semibold italic">
                                            <Activity className="text-emerald-500 animate-bounce" size={24} />
                                            <span>Processing OHLC logs, plotting EMA structures, and auditing key liquidity blocks...</span>
                                        </div>
                                    ) : aiAdvisorText ? (
                                        <div className="prose prose-invert max-w-none text-slate-300">
                                            {/* Beautiful split formatting */}
                                            <div className="flex flex-col gap-4">
                                                {aiAdvisorText.split('\n\n').map((paragraph, i) => {
                                                    const cleanText = paragraph.replace(/\*\*/g, '');
                                                    const isHeading = paragraph.startsWith('**') || 
                                                                      paragraph.startsWith('1.') || 
                                                                      paragraph.startsWith('2.') || 
                                                                      paragraph.startsWith('3.') ||
                                                                      paragraph.startsWith('4.');
                                                    
                                                    return (
                                                        <div key={i} className={isHeading ? "text-slate-200 font-bold border-l-2 border-emerald-500 pl-3 py-0.5 mt-2" : "pl-1"}>
                                                            {cleanText}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-500 italic flex flex-col items-center gap-2">
                                            <Cpu size={24} className="text-slate-600" />
                                            <span>Click 'Formulate Plan' to deploy GreyAlpha's secure Gemini network, audit real-time order flow, and map key execution zones.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500 italic gap-3">
                            <Activity className="animate-pulse" size={32} />
                            <span>Scan asset from the sidebar to visualize historical data, plot mathematical indicators, and formulate tactical institutional advice.</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
