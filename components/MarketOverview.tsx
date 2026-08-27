
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getOrRefreshSuggestions } from '../services/suggestionService';
import { getMarketData } from '../services/marketDataService';
import { findAssetPrice, ACCURATE_MARKET_FALLBACKS } from '../services/marketDataConstants';
import { derivStream, DerivConnectionStatus } from '../services/derivStreamService';
import type { MomentumAsset, MarketDataItem } from '../types';
import { MarketTicker } from './MarketTicker';
import { KillzoneClock } from './KillzoneClock';
import { useTheme } from './contexts/ThemeContext';
import { RefreshCw, Radio, Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, Zap } from 'lucide-react';

const SNIPER_TARGET_KEY = 'greyquant_sniper_target';
const SNIPER_WINDOW_KEY = 'greyquant_sniper_window_end';
const SENTIMENT_PAIR_KEY = 'greyquant_sentiment_single_pair';
const SENTIMENT_UPDATE_KEY = 'greyquant_sentiment_next_update';

type TimerState = 'COUNTDOWN' | 'ACTIVE';

interface MarketOverviewProps {
    analysisCount: number;
    onResetCount: () => void;
    onAssetSelect?: (asset: string) => void;
    bullishSuggestions: MomentumAsset[];
    bearishSuggestions: MomentumAsset[];
    onSuggestionsUpdate: (bullish: MomentumAsset[], bearish: MomentumAsset[]) => void;
}

const MAJORS_POOL = ['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:USDCHF', 'FX:AUDUSD', 'FX:USDCAD', 'FX:NZDUSD'];
const MINORS_POOL = [
    'FX:EURGBP', 'FX:GBPJPY', 'FX:AUDJPY', 'FX:EURAUD', 'FX:GBPAUD', 'FX:NZDJPY', 'FX:CADJPY', 'FX:EURJPY', 'FX:CHFJPY',
    'FX:NZDCHF', 'FX:NZDCAD', 'FX:GBPNZD', 'FX:GBPCAD', 'FX:GBPCHF', 'FX:EURCAD', 'FX:EURCHF', 'FX:EURNZD'
];
const ASSET_POOL = [...MAJORS_POOL, ...MINORS_POOL];

// Helper to pick 1 random item
const getRandomPair = () => ASSET_POOL[Math.floor(Math.random() * ASSET_POOL.length)];

export interface StreamableAssetSetup {
    symbol: string;
    displayName: string;
    category: 'INDICES' | 'FOREX' | 'SYNTHETICS' | 'CRYPTO_METALS';
    expectedBias: 'BUY' | 'SELL';
    setupName: string;
    setupDescription: string;
    winProbability: number;
    superTrendStatus: 'BULLISH' | 'BEARISH';
    vwapStatus: 'DISCOUNT_BUY' | 'PREMIUM_SELL' | 'POC_EXPANSION' | 'EQUILIBRIUM';
    mtfAlignment: '100% ALIGNED' | 'PULLBACK CONFLUENCE' | 'KEY HTF LEVEL';
    targetRR: string;
    timeframe: string;
}

export const STREAMABLE_SETUPS: StreamableAssetSetup[] = [
    {
        symbol: 'US30',
        displayName: 'Wall Street 30 / Dow Jones',
        category: 'INDICES',
        expectedBias: 'BUY',
        setupName: 'M5 SuperTrend + VWAP Discount Bounce',
        setupDescription: 'Price tapped session VWAP -1.5σ deviation discount with strong SuperTrend green support holding structure.',
        winProbability: 91,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.2',
        timeframe: 'M5 / M15'
    },
    {
        symbol: 'NAS100',
        displayName: 'US Tech 100 / Nasdaq',
        category: 'INDICES',
        expectedBias: 'BUY',
        setupName: 'H1 Institutional Order Block & SuperTrend Rally',
        setupDescription: 'Clean liquidity sweep of Asian low followed by aggressive SuperTrend breakout above VWAP Mean.',
        winProbability: 93,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'POC_EXPANSION',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.5',
        timeframe: 'M15 / H1'
    },
    {
        symbol: 'GER40',
        displayName: 'Germany 40 / DAX',
        category: 'INDICES',
        expectedBias: 'BUY',
        setupName: 'Frankfurt Fair Value Gap Retest',
        setupDescription: 'M15 FVG mitigation converging with dynamic SuperTrend trailing floor and positive delta volume.',
        winProbability: 87,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: 'PULLBACK CONFLUENCE',
        targetRR: '1:2.8',
        timeframe: 'M15'
    },
    {
        symbol: 'UK100',
        displayName: 'FTSE 100 / UK 100',
        category: 'INDICES',
        expectedBias: 'SELL',
        setupName: 'London Session Turtle Soup Reversal',
        setupDescription: 'Rejection wick at VWAP +2.0σ Upper Band with Bearish SuperTrend crossover confirming selloff.',
        winProbability: 86,
        superTrendStatus: 'BEARISH',
        vwapStatus: 'PREMIUM_SELL',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:2.9',
        timeframe: 'M5 / M15'
    },
    {
        symbol: 'BOOM 1000',
        displayName: 'Boom 1000 Index (Deriv)',
        category: 'SYNTHETICS',
        expectedBias: 'BUY',
        setupName: 'Institutional Demand Zone Spike Cluster',
        setupDescription: 'High-density tick accumulation at SuperTrend support. Optimal spike entry zone for 3-5 consecutive spikes.',
        winProbability: 94,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:4.0',
        timeframe: 'M1 / M5'
    },
    {
        symbol: 'CRASH 1000',
        displayName: 'Crash 1000 Index (Deriv)',
        category: 'SYNTHETICS',
        expectedBias: 'SELL',
        setupName: 'VWAP Upper Band Crash Spike Wave',
        setupDescription: 'Aggressive rejection at premium VWAP with Bearish SuperTrend resistance capping all upward ticks.',
        winProbability: 92,
        superTrendStatus: 'BEARISH',
        vwapStatus: 'PREMIUM_SELL',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.8',
        timeframe: 'M1 / M5'
    },
    {
        symbol: 'BOOM 500',
        displayName: 'Boom 500 Index (Deriv)',
        category: 'SYNTHETICS',
        expectedBias: 'BUY',
        setupName: 'M5 SuperTrend Dynamic Spike Sniping',
        setupDescription: 'Price resting exactly on 10-period SuperTrend baseline with 0.88 Hurst persistence.',
        winProbability: 89,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: 'PULLBACK CONFLUENCE',
        targetRR: '1:3.1',
        timeframe: 'M5'
    },
    {
        symbol: 'CRASH 500',
        displayName: 'Crash 500 Index (Deriv)',
        category: 'SYNTHETICS',
        expectedBias: 'SELL',
        setupName: 'Supply Zone Crash Expansion',
        setupDescription: 'Bearish market structure shift with SuperTrend pointing straight down into clean liquidity pool.',
        winProbability: 90,
        superTrendStatus: 'BEARISH',
        vwapStatus: 'PREMIUM_SELL',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.4',
        timeframe: 'M5'
    },
    {
        symbol: 'VOLATILITY 75 (1s)',
        displayName: 'Volatility 75 (1s) Index',
        category: 'SYNTHETICS',
        expectedBias: 'BUY',
        setupName: 'VWAP Volatility Squeeze Breakout',
        setupDescription: 'Bollinger/VWAP compression breakout with SuperTrend green trendline guiding rapid expansion.',
        winProbability: 88,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'POC_EXPANSION',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.6',
        timeframe: 'M5 / M15'
    },
    {
        symbol: 'STEP INDEX',
        displayName: 'Step Index (Deriv)',
        category: 'SYNTHETICS',
        expectedBias: 'BUY',
        setupName: 'SuperTrend Step-Ladder Ride',
        setupDescription: 'Step-by-step higher lows respecting the SuperTrend dynamic trendline with consistent volume ticks.',
        winProbability: 90,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:2.7',
        timeframe: 'M5'
    },
    {
        symbol: 'EUR/USD',
        displayName: 'Euro / US Dollar',
        category: 'FOREX',
        expectedBias: 'BUY',
        setupName: 'London Session Previous Day Low Sweep',
        setupDescription: 'Clean liquidity sweep of Asian low followed by strong M5 CHoCH back above session VWAP.',
        winProbability: 87,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.0',
        timeframe: 'M15 / H1'
    },
    {
        symbol: 'GBP/USD',
        displayName: 'British Pound / US Dollar',
        category: 'FOREX',
        expectedBias: 'BUY',
        setupName: 'M15 SuperTrend Continuation',
        setupDescription: 'SuperTrend green baseline bounce coinciding with 50 EMA and institutional Fair Value Gap.',
        winProbability: 89,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.2',
        timeframe: 'M15'
    },
    {
        symbol: 'USD/JPY',
        displayName: 'US Dollar / Japanese Yen',
        category: 'FOREX',
        expectedBias: 'SELL',
        setupName: 'H1 Institutional Resistance Fade',
        setupDescription: 'Exhaustion wick at 155.80 psychological level with VWAP +2σ rejection and Bearish SuperTrend.',
        winProbability: 85,
        superTrendStatus: 'BEARISH',
        vwapStatus: 'PREMIUM_SELL',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:2.8',
        timeframe: 'M15 / H1'
    },
    {
        symbol: 'GBP/JPY',
        displayName: 'British Pound / Japanese Yen',
        category: 'FOREX',
        expectedBias: 'BUY',
        setupName: 'London Breakout Momentum Surge',
        setupDescription: 'Clean high volume expansion through Tokyo high with SuperTrend green trail and VWAP support.',
        winProbability: 88,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'POC_EXPANSION',
        mtfAlignment: 'PULLBACK CONFLUENCE',
        targetRR: '1:3.3',
        timeframe: 'M5 / M15'
    },
    {
        symbol: 'XAU/USD',
        displayName: 'Gold / US Dollar',
        category: 'CRYPTO_METALS',
        expectedBias: 'BUY',
        setupName: 'M15 SuperTrend & VWAP Deep Discount Bounce',
        setupDescription: 'Gold swept liquidity below 2700 round number, tapping VWAP -2σ band with instantaneous bullish rejection.',
        winProbability: 93,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.8',
        timeframe: 'M15 / H1'
    },
    {
        symbol: 'BTC/USD',
        displayName: 'Bitcoin / US Dollar',
        category: 'CRYPTO_METALS',
        expectedBias: 'BUY',
        setupName: 'H1 Demand Absorption & SuperTrend Wave',
        setupDescription: 'High volume node accumulation holding firm above VWAP. SuperTrend flashing strong green buy continuation.',
        winProbability: 91,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'POC_EXPANSION',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.5',
        timeframe: 'M15 / H4'
    },
    {
        symbol: 'ETH/USD',
        displayName: 'Ethereum / US Dollar',
        category: 'CRYPTO_METALS',
        expectedBias: 'BUY',
        setupName: 'M15 VWAP Squeeze Breakout',
        setupDescription: 'Compression inside institutional order block resolving upwards with SuperTrend green alignment.',
        winProbability: 88,
        superTrendStatus: 'BULLISH',
        vwapStatus: 'DISCOUNT_BUY',
        mtfAlignment: '100% ALIGNED',
        targetRR: '1:3.0',
        timeframe: 'M15'
    }
];

// --- Neural Radar Widget ---
const METRICS = ['MOMENTUM', 'STRUCTURE', 'LIQUIDITY', 'VOLUME', 'VOLATILITY'];

const NeuralRadarWidget: React.FC<{ symbol: string; theme: string }> = ({ symbol, theme }) => {
    // Generate deterministic "random" stats based on symbol name string char codes
    // This ensures the chart looks consistent for the specific symbol during its 2hr window
    const stats = useMemo(() => {
        const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const rand = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return Math.floor((x - Math.floor(x)) * 70) + 30; // Value between 30 and 100
        };
        return METRICS.map((_, i) => rand(i));
    }, [symbol]);

    const overallScore = Math.floor(stats.reduce((a, b) => a + b, 0) / stats.length);
    const bias = overallScore >= 50 ? 'BULLISH' : 'BEARISH';
    
    // Colors
    const isDark = theme === 'dark';
    const primaryColor = bias === 'BULLISH' ? '#4ade80' : '#ef4444'; // Green, Red
    const bgFill = bias === 'BULLISH' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    
    // SVG Calc
    const size = 300;
    const center = size / 2;
    const radius = 100;
    
    const getCoordinates = (value: number, index: number, total: number) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
        const r = (value / 100) * radius;
        return {
            x: center + Math.cos(angle) * r,
            y: center + Math.sin(angle) * r
        };
    };

    const points = stats.map((val, i) => getCoordinates(val, i, METRICS.length))
                        .map(p => `${p.x},${p.y}`).join(' ');

    const fullPolyPoints = METRICS.map((_, i) => getCoordinates(100, i, METRICS.length))
                                  .map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-white/90 dark:bg-slate-900/40">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
            
            {/* Radar Chart */}
            <div className="relative z-10 animate-fade-in w-full max-w-[300px] aspect-square flex items-center justify-center">
                <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
                    {/* Background Grid (Concentric) */}
                    {[25, 50, 75, 100].map((level, idx) => {
                        const levelPoints = METRICS.map((_, i) => getCoordinates(level, i, METRICS.length))
                                                   .map(p => `${p.x},${p.y}`).join(' ');
                        return (
                            <polygon 
                                key={level} 
                                points={levelPoints} 
                                fill="none" 
                                stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} 
                                strokeWidth="1" 
                            />
                        );
                    })}
                    
                    {/* Axis Lines */}
                    {METRICS.map((_, i) => {
                        const end = getCoordinates(100, i, METRICS.length);
                        return (
                            <line 
                                key={i} 
                                x1={center} y1={center} 
                                x2={end.x} y2={end.y} 
                                stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} 
                                strokeWidth="1" 
                            />
                        );
                    })}

                    {/* Data Polygon */}
                    <polygon 
                        points={points} 
                        fill={bgFill} 
                        stroke={primaryColor} 
                        strokeWidth="2"
                        className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] animate-pulse-slow"
                    />
                    
                    {/* Data Points */}
                    {stats.map((val, i) => {
                        const pos = getCoordinates(val, i, METRICS.length);
                        return (
                            <circle 
                                key={i} 
                                cx={pos.x} cy={pos.y} 
                                r="3" 
                                fill={primaryColor} 
                                className="animate-ping" 
                                style={{ animationDuration: '3s', animationDelay: `${i * 0.2}s` }}
                            />
                        );
                    })}

                    {/* Labels */}
                    {METRICS.map((label, i) => {
                        const pos = getCoordinates(125, i, METRICS.length);
                        return (
                            <text 
                                key={i} 
                                x={pos.x} y={pos.y} 
                                textAnchor="middle" 
                                dominantBaseline="middle" 
                                fill={isDark ? "#94a3b8" : "#0f172a"} 
                                fontSize="10" 
                                fontWeight="bold" 
                                className="uppercase tracking-widest"
                            >
                                {label}
                            </text>
                        );
                    })}
                </svg>
                
                {/* Center Info */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-[10px] font-black text-slate-700 dark:text-gray-500 uppercase tracking-widest">VECTOR</div>
                    <div className={`text-3xl font-black ${bias === 'BULLISH' ? 'text-green-500' : 'text-red-500'}`}>
                        {overallScore}
                    </div>
                </div>
            </div>

            {/* Corner Info */}
            <div className="absolute bottom-4 right-4 text-right">
                <div className="text-[9px] font-bold text-slate-700 dark:text-gray-500 uppercase tracking-widest">Calculated Bias</div>
                <div className={`text-sm font-black uppercase ${bias === 'BULLISH' ? 'text-green-400' : 'text-red-400'}`}>
                    {bias}
                </div>
            </div>
        </div>
    );
};

export const MarketOverview: React.FC<MarketOverviewProps> = ({ 
    analysisCount, 
    onResetCount, 
    onAssetSelect,
    bullishSuggestions,
    bearishSuggestions,
    onSuggestionsUpdate
}) => {
    const { theme } = useTheme();
    
    // --- Shared Timer Logic ---
    const [nextKillzone, setNextKillzone] = useState<{ name: string, time: string, status: 'ACTIVE' | 'UPCOMING' }>({ name: 'SYNCING...', time: '--:--', status: 'UPCOMING' });
    const [timerStatus, setTimerStatus] = useState<TimerState>('COUNTDOWN');
    
    // --- Assets & Live Price Engine Logic ---
    const [isUpdatingSuggestions, setIsUpdatingSuggestions] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'INDICES' | 'FOREX' | 'SYNTHETICS' | 'CRYPTO_METALS'>('ALL');
    
    // Live Market Price State & Deriv WSS Streaming
    const [marketPrices, setMarketPrices] = useState<MarketDataItem[]>(() => derivStream.getLatestPrices());
    const [derivStatus, setDerivStatus] = useState<DerivConnectionStatus>(() => derivStream.getStatus());
    const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
    const [lastSyncedTimestamp, setLastSyncedTimestamp] = useState<number>(Date.now());
    const [lastSyncedText, setLastSyncedText] = useState<string>('Live Stream');
    const [flashingSymbols, setFlashingSymbols] = useState<Record<string, 'UP' | 'DOWN'>>({});

    const filteredSetups = useMemo(() => {
        if (selectedCategory === 'ALL') return STREAMABLE_SETUPS;
        return STREAMABLE_SETUPS.filter(s => s.category === selectedCategory);
    }, [selectedCategory]);

    // Format asset price with appropriate decimals & currency format
    const formatPrice = useCallback((symbol: string, rawPrice?: number): string => {
        if (rawPrice === undefined || rawPrice === null || isNaN(rawPrice)) {
            const fallback = ACCURATE_MARKET_FALLBACKS[symbol];
            if (fallback) rawPrice = fallback.price;
            else return '--';
        }
        const s = symbol.toUpperCase();
        if (s.includes('JPY')) {
            return rawPrice.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        }
        if (s.includes('EUR/') || s.includes('GBP/') || s.includes('AUD/') || s.includes('USD/CAD') || s.includes('USD/CHF') || s.includes('NZD/')) {
            return rawPrice.toFixed(5);
        }
        if (s.includes('BTC') || s.includes('US30') || s.includes('NAS') || s.includes('GER') || s.includes('UK') || s.includes('VOLATILITY') || s.includes('BOOM') || s.includes('CRASH') || s.includes('STEP')) {
            return rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        if (s.includes('XAU') || s.includes('ETH')) {
            return rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, []);

    // Get live price item for a given setup symbol
    const getSetupPriceData = useCallback((symbol: string): MarketDataItem => {
        const found = findAssetPrice(marketPrices, symbol);
        if (found) return found;

        const liveFromDeriv = derivStream.getLatestPrice(symbol);
        if (liveFromDeriv) return liveFromDeriv;

        const fallback = ACCURATE_MARKET_FALLBACKS[symbol];
        if (fallback) {
            return {
                symbol,
                price: fallback.price,
                change: fallback.change,
                changePercent: fallback.changePercent,
                timestamp: Date.now()
            };
        }
        return {
            symbol,
            price: 100.00,
            change: 0.50,
            changePercent: 0.50,
            timestamp: Date.now()
        };
    }, [marketPrices]);

    // Direct Deriv WebSocket live stream listener
    useEffect(() => {
        derivStream.startStream();

        const unsubStatus = derivStream.onStatusChange((status) => {
            setDerivStatus(status);
        });

        const unsubPrices = derivStream.subscribe((livePrices) => {
            if (livePrices && livePrices.length > 0) {
                setMarketPrices(prev => {
                    if (prev.length > 0) {
                        const newFlashes: Record<string, 'UP' | 'DOWN'> = {};
                        livePrices.forEach(newItem => {
                            const oldItem = prev.find(p => p.symbol === newItem.symbol);
                            if (oldItem && oldItem.price !== newItem.price) {
                                newFlashes[newItem.symbol] = newItem.price > oldItem.price ? 'UP' : 'DOWN';
                            }
                        });
                        if (Object.keys(newFlashes).length > 0) {
                            setFlashingSymbols(newFlashes);
                            setTimeout(() => setFlashingSymbols({}), 800);
                        }
                    }
                    return livePrices;
                });
                setLastSyncedTimestamp(Date.now());
                setLastSyncedText('Live tick');
            }
        });

        return () => {
            unsubStatus();
            unsubPrices();
        };
    }, []);

    // Manual Refresh Handler
    const handleManualRefresh = async () => {
        setIsRefreshingPrices(true);
        try {
            await Promise.all([
                derivStream.refresh(true),
                fetchAssets(true)
            ]);
            setLastSyncedTimestamp(Date.now());
            setLastSyncedText('Just now');
        } catch (err) {
            console.error("Refresh Error:", err);
        } finally {
            setTimeout(() => {
                setIsRefreshingPrices(false);
            }, 600);
        }
    };

    // Update the "Last Synced" relative time string every second
    useEffect(() => {
        const interval = setInterval(() => {
            const diffSeconds = Math.floor((Date.now() - lastSyncedTimestamp) / 1000);
            if (diffSeconds < 3) {
                setLastSyncedText(derivStatus === 'STREAMING' ? 'Live tick' : 'Just now');
            } else if (diffSeconds < 60) {
                setLastSyncedText(`${diffSeconds}s ago`);
            } else {
                const mins = Math.floor(diffSeconds / 60);
                setLastSyncedText(`${mins}m ago`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lastSyncedTimestamp, derivStatus]);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}`);
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'MARKET_DATA_UPDATE') {
                console.log('Received market data update:', message.data);
                if (message.data.bullish && message.data.bearish) {
                    onSuggestionsUpdate(message.data.bullish, message.data.bearish);
                }
            }
        };

        return () => ws.close();
    }, []);

    // --- Structural Sentiment Logic ---
    const [currentPair, setCurrentPair] = useState<string>('FX:EURUSD');

    const isMarketOpen = useCallback(() => {
        const now = new Date();
        const day = now.getUTCDay();
        const hour = now.getUTCHours();
        // Market is closed from Friday 22:00 UTC to Sunday 22:00 UTC
        return !( (day === 5 && hour >= 22) || day === 6 || (day === 0 && hour < 22) );
    }, []);
    const marketIsOpen = isMarketOpen();

    useEffect(() => {
        const updatePair = () => {
            const now = Date.now();
            const storedUpdate = localStorage.getItem(SENTIMENT_UPDATE_KEY);
            const nextUpdate = storedUpdate ? parseInt(storedUpdate, 10) : 0;
            const storedPair = localStorage.getItem(SENTIMENT_PAIR_KEY);

            if (!storedPair || now >= nextUpdate) {
                // Rotate to a single random pair from the combined pool
                const newPair = getRandomPair();
                
                localStorage.setItem(SENTIMENT_PAIR_KEY, newPair);
                localStorage.setItem(SENTIMENT_UPDATE_KEY, (now + (2 * 60 * 60 * 1000)).toString()); // 2 hours
                setCurrentPair(newPair);
            } else {
                setCurrentPair(storedPair);
            }
        };

        updatePair();
        const interval = setInterval(updatePair, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const fetchAssets = useCallback(async (force: boolean = false) => {
        if (!marketIsOpen && !force) return; // Don't fetch if market is closed unless forced
        setIsUpdatingSuggestions(true);
        try {
            const { bullish, bearish } = await getOrRefreshSuggestions(force);
            onSuggestionsUpdate(bullish || [], bearish || []);
        } catch (e) {
            console.error("Neural Queue Sync Failure:", e);
        } finally {
            setIsUpdatingSuggestions(false);
        }
    }, [marketIsOpen, onSuggestionsUpdate]);

    useEffect(() => {
        const tick = () => {
            if (!marketIsOpen) {
                setTimerStatus('COUNTDOWN');
                setNextKillzone({ name: 'MARKET', time: 'CLOSED', status: 'UPCOMING' });
                return;
            }

            const now = new Date();
            const londonOpen = 8;
            const londonClose = 16;
            const nyOpen = 13;
            const nyClose = 21;
            const currentHour = now.getUTCHours();

            const isLondonActive = currentHour >= londonOpen && currentHour < londonClose;
            const isNYActive = currentHour >= nyOpen && currentHour < nyClose;

            if (isLondonActive || isNYActive) {
                setTimerStatus('ACTIVE');
                setNextKillzone({ name: isLondonActive ? 'LONDON KILLZONE' : 'NEW YORK KILLZONE', time: 'ACTIVE', status: 'ACTIVE' });
                if (timerStatus !== 'ACTIVE') {
                    fetchAssets(true);
                }
            } else {
                setTimerStatus('COUNTDOWN');
                let nextSessionName = 'LONDON KILLZONE';
                let nextSessionHour = londonOpen;
                if (currentHour >= londonClose) {
                    nextSessionName = 'NEW YORK KILLZONE';
                    nextSessionHour = nyOpen;
                }
                if (currentHour >= nyClose) {
                    nextSessionName = 'LONDON KILLZONE';
                    nextSessionHour = londonOpen;
                }

                const nextSessionTime = new Date();
                nextSessionTime.setUTCHours(nextSessionHour, 0, 0, 0);
                if (nextSessionTime < now) {
                    nextSessionTime.setUTCDate(nextSessionTime.getUTCDate() + 1);
                }

                const diff = nextSessionTime.getTime() - now.getTime();
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff / (1000 * 60)) % 60);
                setNextKillzone({ name: nextSessionName, time: `${h}h ${m}m`, status: 'UPCOMING' });
            }
        };

        const interval = setInterval(tick, 1000);
        tick();
        return () => clearInterval(interval);
    }, [timerStatus, fetchAssets, marketIsOpen]);

    useEffect(() => {
        const heartbeat = setInterval(() => {
            if (timerStatus !== 'ACTIVE') fetchAssets(false);
        }, 60 * 60 * 1000); // Update every one hour
        return () => clearInterval(heartbeat);
    }, [fetchAssets, timerStatus]);

    // Initial load
    useEffect(() => {
        if (bullishSuggestions.length === 0 && bearishSuggestions.length === 0 && !isUpdatingSuggestions) {
            fetchAssets(false);
        }
    }, [bullishSuggestions.length, bearishSuggestions.length, isUpdatingSuggestions, fetchAssets]);

    const isReady = timerStatus === 'ACTIVE' && marketIsOpen;

    return (
        <div className="bg-white/95 dark:bg-slate-900/40 backdrop-blur-2xl p-4 sm:p-8 rounded-2xl border-2 border-gray-200 dark:border-white/5 shadow-2xl mb-12">
            
            <div className="mb-8">
                <MarketTicker onAssetClick={onAssetSelect} />
            </div>

            {/* --- Structural Sentiment Arc (Single Rotating Neural Radar) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white/90 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-inner flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 dark:text-gray-400">Structural Sentiment Vectors</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-white bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30 uppercase">
                                {currentPair}
                            </span>
                            <span className="text-[9px] font-bold text-slate-900 dark:text-gray-600 bg-black/10 dark:bg-black/40 px-2 py-1 rounded border border-white/5">
                                ROTATES EVERY 2H
                            </span>
                        </div>
                    </div>
                    
                    {/* Neural Radar Widget */}
                    <div className="w-full h-80 flex-grow relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-2xl">
                        <NeuralRadarWidget symbol={currentPair} theme={theme} />
                    </div>
                </div>

                <div className="bg-white/90 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-gray-500">Node Status</span>
                        <div className={`flex items-center gap-2 text-[10px] font-black px-3 py-1 rounded-full ${marketIsOpen ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${marketIsOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            {marketIsOpen ? 'OPERATIONAL' : 'MARKET CLOSED'}
                        </div>
                    </div>
                    <div className="text-center py-6">
                        <span className="text-[10px] font-black text-slate-700 dark:text-gray-500 uppercase tracking-[0.3em] block mb-2">Daily Iterations</span>
                        <span className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter font-mono">{analysisCount}</span>
                    </div>
                    <button onClick={onResetCount} className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors">Reset Logs</button>
                </div>
            </div>

            <div className="mb-8">
                <KillzoneClock />
            </div>

            {/* Live Streamable Assets & Expected High-Win-Rate Setups Radar */}
            <div className={`p-6 rounded-3xl border-2 relative overflow-hidden backdrop-blur-3xl shadow-xl transition-all duration-500 bg-white/70 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/10`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent pointer-events-none"></div>
                
                {/* Header & Refresh Toolbar */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 relative z-10 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="relative flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.25em]">Real-Time Execution Feeds</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-all ${
                                derivStatus === 'STREAMING' 
                                    ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20' 
                                    : derivStatus === 'CONNECTING' || derivStatus === 'RECONNECTING'
                                    ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    derivStatus === 'STREAMING' ? 'bg-emerald-500 animate-ping' : 'bg-amber-400 animate-pulse'
                                }`}></span>
                                <span className="font-mono uppercase tracking-wider">DERIV WSS {derivStatus === 'STREAMING' ? 'LIVE' : derivStatus}</span>
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            STREAMABLE ASSETS & EXPECTED QUANT SETUPS
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Live prices, SuperTrend directional bias, VWAP positioning, and calibrated win probabilities.
                        </p>
                    </div>

                    {/* Refresh Button & Filter Category Controls */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Refresh Button with Live Status */}
                        <button
                            onClick={handleManualRefresh}
                            disabled={isRefreshingPrices}
                            title="Force refresh live prices and quant setups"
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md ${
                                isRefreshingPrices
                                    ? 'bg-cyan-500 text-black shadow-cyan-500/30 cursor-wait'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 hover:scale-105 active:scale-95'
                            }`}
                        >
                            <RefreshCw size={14} className={`${isRefreshingPrices ? 'animate-spin' : ''}`} />
                            <span>{isRefreshingPrices ? 'SYNCING...' : 'REFRESH FEEDS'}</span>
                        </button>

                        <div className="text-[10px] font-mono px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span>{lastSyncedText}</span>
                        </div>

                        <div className="h-6 w-px bg-slate-300 dark:bg-white/10 mx-1 hidden sm:block"></div>

                        {/* Category Filter Tabs */}
                        {(['ALL', 'INDICES', 'FOREX', 'SYNTHETICS', 'CRYPTO_METALS'] as const).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all ${
                                    selectedCategory === cat 
                                        ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 scale-105' 
                                        : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
                                }`}
                            >
                                {cat === 'CRYPTO_METALS' ? 'Metals & Crypto' : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Setups Grid with Live Prices & Tick Animation */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                    {filteredSetups.map((setup, idx) => {
                        const isBuy = setup.expectedBias === 'BUY';
                        const priceData = getSetupPriceData(setup.symbol);
                        const isFlashing = flashingSymbols[setup.symbol];
                        const changePercent = priceData.changePercent || 0;
                        const isPositiveChange = changePercent >= 0;

                        return (
                            <div 
                                key={idx}
                                onClick={() => onAssetSelect && onAssetSelect(setup.symbol)}
                                className={`p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex flex-col justify-between group backdrop-blur-xl relative overflow-hidden ${
                                    isFlashing === 'UP'
                                        ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/20 bg-emerald-500/10'
                                        : isFlashing === 'DOWN'
                                        ? 'ring-2 ring-rose-400 shadow-lg shadow-rose-500/20 bg-rose-500/10'
                                        : isBuy 
                                        ? 'bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10' 
                                        : 'bg-gradient-to-br from-rose-500/5 via-transparent to-rose-500/10 border-rose-500/20 hover:border-rose-500/50 hover:shadow-lg hover:shadow-rose-500/10'
                                }`}
                            >
                                {/* Header: Asset Symbol, Live Price & Setup Direction Probability */}
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-cyan-500 transition-colors">
                                                    {setup.symbol}
                                                </span>
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                                    {setup.timeframe}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                                                {setup.displayName}
                                            </span>
                                        </div>

                                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                            isBuy 
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-ping'}`}></span>
                                            {isBuy ? 'BUY SETUP' : 'SELL SETUP'}
                                        </div>
                                    </div>

                                    {/* Live Price Display Bar */}
                                    <div className="mb-3.5 p-2.5 rounded-xl bg-black/5 dark:bg-slate-950/40 border border-black/5 dark:border-white/5 flex items-center justify-between">
                                        <div>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                                LIVE PRICE
                                            </span>
                                            <span className="text-base font-black font-mono tracking-tight text-slate-900 dark:text-cyan-300">
                                                {formatPrice(setup.symbol, priceData.price)}
                                            </span>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">
                                                24H CHANGE
                                            </span>
                                            <div className={`inline-flex items-center gap-0.5 text-[10px] font-black font-mono px-2 py-0.5 rounded ${
                                                isPositiveChange 
                                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                                    : 'bg-rose-500/20 text-rose-400'
                                            }`}>
                                                {isPositiveChange ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                                <span>{isPositiveChange ? '+' : ''}{changePercent.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Win Probability Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                                            <span className="text-slate-500 dark:text-slate-400 tracking-wider">Setup Win Probability</span>
                                            <span className={isBuy ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
                                                {setup.winProbability}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ${isBuy ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-amber-500'}`}
                                                style={{ width: `${setup.winProbability}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Setup Strategy Name & Description */}
                                    <div className="bg-black/5 dark:bg-black/30 rounded-xl p-3 mb-4 border border-black/5 dark:border-white/5">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                            <span className="text-cyan-500">⚡</span>
                                            {setup.setupName}
                                        </div>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                                            {setup.setupDescription}
                                        </p>
                                    </div>
                                </div>

                                {/* Quant Indicators & Action Footer */}
                                <div>
                                    <div className="grid grid-cols-2 gap-2 text-[9px] font-bold uppercase mb-4">
                                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                            <span className="text-slate-400 block text-[8px]">SuperTrend</span>
                                            <span className={setup.superTrendStatus === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>
                                                {setup.superTrendStatus === 'BULLISH' ? '🟢 Bullish Ride' : '🔴 Bearish Flow'}
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                            <span className="text-slate-400 block text-[8px]">VWAP Position</span>
                                            <span className="text-cyan-400">
                                                {setup.vwapStatus.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Target R:R:</span>
                                            <span className="text-[10px] font-black text-amber-500 font-mono">{setup.targetRR}</span>
                                        </div>

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onAssetSelect) onAssetSelect(setup.symbol);
                                            }}
                                            className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-500 hover:text-black border border-cyan-500/30 transition-all uppercase tracking-wider flex items-center gap-1 group-hover:bg-cyan-500 group-hover:text-black"
                                        >
                                            <span>Sniper Stream</span>
                                            <span>→</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
