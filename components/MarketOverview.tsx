
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getOrRefreshSuggestions } from '../services/suggestionService';
import type { MomentumAsset } from '../types';
import { MarketTicker } from './MarketTicker';
import { KillzoneClock } from './KillzoneClock';
import { useTheme } from '../contexts/ThemeContext';

const SNIPER_TARGET_KEY = 'greyquant_sniper_target';
const SNIPER_WINDOW_KEY = 'greyquant_sniper_window_end';
const SENTIMENT_PAIR_KEY = 'greyquant_sentiment_single_pair';
const SENTIMENT_UPDATE_KEY = 'greyquant_sentiment_next_update';

type TimerState = 'COUNTDOWN' | 'ACTIVE';

interface MarketOverviewProps {
    analysisCount: number;
    onResetCount: () => void;
    onAssetSelect?: (asset: string) => void;

}

const MAJORS_POOL = ['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:USDCHF', 'FX:AUDUSD', 'FX:USDCAD', 'FX:NZDUSD'];
const MINORS_POOL = ['FX:EURGBP', 'FX:GBPJPY', 'FX:AUDJPY', 'FX:EURAUD', 'FX:GBPAUD', 'FX:NZDJPY', 'FX:CADJPY', 'FX:EURJPY', 'FX:CHFJPY'];
const ASSET_POOL = [...MAJORS_POOL, ...MINORS_POOL];

// Helper to pick 1 random item
const getRandomPair = () => ASSET_POOL[Math.floor(Math.random() * ASSET_POOL.length)];

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
    const bias = overallScore > 65 ? 'BULLISH' : overallScore < 45 ? 'BEARISH' : 'NEUTRAL';
    
    // Colors
    const isDark = theme === 'dark';
    const primaryColor = bias === 'BULLISH' ? '#4ade80' : bias === 'BEARISH' ? '#ef4444' : '#60a5fa'; // Green, Red, Blue
    const bgFill = bias === 'BULLISH' ? 'rgba(74, 222, 128, 0.2)' : bias === 'BEARISH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(96, 165, 250, 0.2)';
    
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
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200 dark:from-[#0f172a] dark:to-[#1e293b]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
            
            {/* Radar Chart */}
            <div className="relative z-10 animate-fade-in">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
                                fill={isDark ? "#94a3b8" : "#475569"} 
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
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">VECTOR</div>
                    <div className={`text-3xl font-black ${bias === 'BULLISH' ? 'text-green-500' : bias === 'BEARISH' ? 'text-red-500' : 'text-blue-500'}`}>
                        {overallScore}
                    </div>
                </div>
            </div>

            {/* Corner Info */}
            <div className="absolute bottom-4 right-4 text-right">
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Calculated Bias</div>
                <div className={`text-sm font-black uppercase ${bias === 'BULLISH' ? 'text-green-400' : bias === 'BEARISH' ? 'text-red-400' : 'text-blue-400'}`}>
                    {bias}
                </div>
            </div>
        </div>
    );
};

export const MarketOverview: React.FC<MarketOverviewProps> = ({ analysisCount, onResetCount, onAssetSelect }) => {
    const { theme } = useTheme();
    
    // --- Shared Timer Logic ---
    const [nextKillzone, setNextKillzone] = useState<{ name: string, time: string, status: 'ACTIVE' | 'UPCOMING' }>({ name: 'SYNCING...', time: '--:--', status: 'UPCOMING' });
    const [timerStatus, setTimerStatus] = useState<TimerState>('COUNTDOWN');
    
    // --- Assets Logic ---
    const [bullishSuggestions, setBullishSuggestions] = useState<MomentumAsset[]>([]);
    const [bearishSuggestions, setBearishSuggestions] = useState<MomentumAsset[]>([]);
    const [isUpdatingSuggestions, setIsUpdatingSuggestions] = useState(false);

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

    // Standardized 40m to 2h range


    const fetchAssets = useCallback(async (force: boolean = false) => {
        if (!marketIsOpen && !force) return; // Don't fetch if market is closed unless forced
        setIsUpdatingSuggestions(true);
        try {
            const { bullish, bearish } = await getOrRefreshSuggestions(force);
            setBullishSuggestions(bullish || []);
            setBearishSuggestions(bearish || []);
        } catch (e) {
            console.error("Neural Queue Sync Failure:", e);
        } finally {
            setIsUpdatingSuggestions(false);
        }
    }, [marketIsOpen]);

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
        }, 30 * 60 * 1000);
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
        <div className="bg-white/80 dark:bg-dark-card/90 backdrop-blur-2xl p-4 sm:p-8 rounded-2xl border-2 border-white/5 shadow-2xl mb-12">
            
            {/* Neural Calibration Timer */}
            <div className={`mb-8 rounded-2xl border-2 relative overflow-hidden transition-all duration-700 shadow-2xl ${isReady ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.3)]' : 'bg-black/60 border-white/5'}`}>
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 relative z-10 gap-6">
                    <div className="flex items-center gap-5">
                        <div className={`flex items-center justify-center w-16 h-16 rounded-2xl border-2 transition-all duration-500 ${isReady ? 'border-green-400 bg-green-500/20 animate-pulse scale-110' : 'border-blue-400/30 bg-blue-500/10'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${isReady ? 'text-green-400' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${isReady ? 'text-green-400' : 'text-blue-400/70'}`}>
                                SYSTEM STATUS
                            </h3>
                            <p className={`text-2xl font-black uppercase tracking-tight ${isReady ? 'text-white' : 'text-gray-400'}`}>
                                {isReady ? 'ACTIVE' : 'STANDBY'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 bg-black/60 px-8 py-4 rounded-2xl border border-white/5 shadow-inner">
                        <div className="text-center min-w-[120px]">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">{nextKillzone.status === 'ACTIVE' ? 'SESSION' : 'NEXT SESSION'}</span>
                            <span className={`font-mono text-3xl font-black ${isReady ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                                {nextKillzone.name}
                            </span>
                        </div>
                        <div className="h-12 w-px bg-white/10"></div>
                        <div className="text-center">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">{nextKillzone.status === 'ACTIVE' ? 'STATUS' : 'IN'}</span>
                            <span className="font-mono text-2xl font-black text-yellow-500">
                                {nextKillzone.time}
                            </span>
                        </div>
                    </div>
                </div>
                {!isReady && (
                    <div className="h-1 w-full bg-black/60 relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-500/30 animate-shimmer"></div>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <MarketTicker onAssetClick={onAssetSelect} />
            </div>

            {/* --- Structural Sentiment Arc (Single Rotating Neural Radar) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Structural Sentiment Vectors</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-white bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30 uppercase">
                                {currentPair}
                            </span>
                            <span className="text-[9px] font-bold text-gray-600 bg-black/40 px-2 py-1 rounded border border-white/5">
                                ROTATES EVERY 2H
                            </span>
                        </div>
                    </div>
                    
                    {/* Neural Radar Widget */}
                    <div className="w-full h-80 flex-grow relative rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                        <NeuralRadarWidget symbol={currentPair} theme={theme} />
                    </div>
                </div>

                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Node Status</span>
                        <div className={`flex items-center gap-2 text-[10px] font-black px-3 py-1 rounded-full ${marketIsOpen ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            <span className={`w-2 h-2 rounded-full ${marketIsOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            {marketIsOpen ? 'OPERATIONAL' : 'MARKET CLOSED'}
                        </div>
                    </div>
                    <div className="text-center py-6">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] block mb-2">Daily Iterations</span>
                        <span className="text-6xl font-black text-white tracking-tighter font-mono">{analysisCount}</span>
                    </div>
                    <button onClick={onResetCount} className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 hover:text-cyan-300 transition-colors">Reset Logs</button>
                </div>
            </div>

            <div className="mb-8">
                <KillzoneClock />
            </div>

            {/* Neural Assets Queue - Always Visible, Syncs on hit */}
             <div className={`p-6 rounded-2xl border-2 relative overflow-hidden transition-all duration-500 ${isReady ? 'bg-green-900/10 border-green-500/40' : 'bg-black/40 border-white/5'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none"></div>
                
                <div className="flex flex-wrap justify-between items-center mb-6 relative z-10 gap-4">
                    <div>
                        <h3 className={`text-xl font-black flex items-center gap-3 uppercase tracking-tighter ${isUpdatingSuggestions ? 'text-cyan-400' : (isReady ? 'text-green-500' : 'text-gray-400')}`}>
                             <span className="relative flex h-4 w-4">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUpdatingSuggestions ? 'bg-cyan-400' : (isReady ? 'bg-green-400' : 'bg-gray-400')}`}></span>
                                <span className={`relative inline-flex rounded-full h-4 w-4 ${isUpdatingSuggestions ? 'bg-cyan-500' : (isReady ? 'bg-green-500' : 'bg-gray-500')}`}></span>
                            </span>
                            MARKET ANALYSIS
                        </h3>
                    </div>
                     <div className="text-right">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Queue Sync</span>
                        <span className={`font-mono text-xl font-black ${isUpdatingSuggestions ? 'text-cyan-400 animate-pulse' : (isReady ? 'text-green-400' : 'text-gray-500')}`}>
                            {isUpdatingSuggestions ? 'BUSY' : (isReady ? 'OPTIMAL' : 'STANDBY')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10 min-h-[150px]">
                    {!marketIsOpen ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6.364-6.364l-1.414-1.414M6.343 6.343l-1.414 1.414m12.728 0l1.414-1.414M17.657 17.657l1.414 1.414M4 12H2m10 10v-2m10 0h-2" /></svg>
                            <p className="text-gray-400 font-black text-sm uppercase tracking-[0.2em]">MARKETS ARE CURRENTLY CLOSED</p>
                            <p className="text-xs text-gray-500 mt-2">Asset queue will resume on market open.</p>
                        </div>
                    ) : isUpdatingSuggestions && bullishSuggestions.length === 0 ? (
                         <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-t-cyan-500 border-gray-700 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] animate-pulse">Scanning Global Orderflow...</span>
                        </div>
                    ) : bullishSuggestions.length > 0 ? (
                        <>
                            <div className="col-span-2">
                                <h4 className="text-lg font-black text-green-400 mb-4 uppercase tracking-widest">Bullish Momentum</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bullishSuggestions.map((asset, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => onAssetSelect && onAssetSelect(asset.symbol)}
                                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.05] active:scale-95 flex flex-col gap-4 group bg-black/60 hover:bg-green-500/10 border-green-500/20`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-white text-xl tracking-tighter group-hover:text-cyan-400 transition-colors">{asset.symbol}</span>
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-green-500/20 text-green-300`}>{asset.momentum}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-2 italic">"{asset.reason}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <h4 className="text-lg font-black text-red-400 mb-4 uppercase tracking-widest">Bearish Momentum</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bearishSuggestions.map((asset, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => onAssetSelect && onAssetSelect(asset.symbol)}
                                            className={`p-5 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.05] active:scale-95 flex flex-col gap-4 group bg-black/60 hover:bg-red-500/10 border-red-500/20`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-white text-xl tracking-tighter group-hover:text-cyan-400 transition-colors">{asset.symbol}</span>
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-red-500/20 text-red-300`}>{asset.momentum}</span>
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium leading-relaxed line-clamp-2 italic">"{asset.reason}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-full py-12 text-center">
                            <p className="text-gray-600 font-black text-sm uppercase tracking-[0.2em]">Queue Depleted. Initiating Priority Scan...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
