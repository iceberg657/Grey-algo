
import React, { useState, useEffect, useRef } from 'react';
import { getOrRefreshGlobalAnalysis } from '../services/globalMarketService';
import { getOrRefreshSuggestions } from '../services/suggestionService';
import type { GlobalMarketAnalysis, AssetSuggestion } from '../types';
import { MarketTicker } from './MarketTicker';

// Hook to get current time and session
const useDateTime = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const day = now.toLocaleDateString(undefined, { weekday: 'long' });
    const date = now.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const getUtcOffsetString = () => {
        const offsetMinutes = -now.getTimezoneOffset();
        const offsetHours = offsetMinutes / 60;
        const sign = offsetHours >= 0 ? '+' : '-';
        const hours = Math.floor(Math.abs(offsetHours));
        return `UTC${sign}${String(hours).padStart(2, '0')}`;
    };

    const getActiveSessions = () => {
        const utcHour = now.getUTCHours();
        const sessions = [];
        // Asian Session (approx 23:00 - 08:00 UTC)
        if (utcHour >= 23 || utcHour < 8) sessions.push('Asian');
        // London Session (approx 07:00 - 16:00 UTC)
        if (utcHour >= 7 && utcHour < 16) sessions.push('London');
        // New York Session (approx 12:00 - 21:00 UTC)
        if (utcHour >= 12 && utcHour < 21) sessions.push('New York');
        return sessions.length > 0 ? sessions.join(' / ') : 'N/A';
    };

    return { day, date, time, utcOffset: getUtcOffsetString(), activeSessions: getActiveSessions() };
};

// Hook to get market status
const useMarketStatus = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkStatus = () => {
            const now = new Date();
            const dayUTC = now.getUTCDay(); // 0 = Sun, 6 = Sat
            const hourUTC = now.getUTCHours();

            // Market is closed on Saturday, Sunday before 22:00 UTC, and Friday after 22:00 UTC
            if (dayUTC === 6 || (dayUTC === 0 && hourUTC < 22) || (dayUTC === 5 && hourUTC >= 22)) {
                setIsOpen(false);
            } else {
                setIsOpen(true);
            }
        };

        checkStatus();
        const timer = setInterval(checkStatus, 60000); // Check every minute
        return () => clearInterval(timer);
    }, []);

    return { isOpen, statusText: isOpen ? 'Active' : 'Closed' };
};

const generateChartData = () => {
    const data = [];
    let value = 50 + Math.random() * 20;
    for (let i = 0; i < 50; i++) {
        data.push(value);
        value += (Math.random() - 0.5) * 5;
    }
    return data;
};

interface MarketOverviewProps {
    analysisCount: number;
    onResetCount: () => void;
    onAssetSelect?: (asset: string) => void;
    profitMode: boolean; // Add Profit Mode Prop
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ analysisCount, onResetCount, onAssetSelect, profitMode }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null); // Using any for Chart.js instance
    const [timeRange, setTimeRange] = useState<'1H' | '1D' | '1W'>('1H');
    const { isOpen, statusText } = useMarketStatus();
    const { day, date, time, utcOffset, activeSessions } = useDateTime();
    const [globalAnalysis, setGlobalAnalysis] = useState<GlobalMarketAnalysis | null>(null);
    const [isUpdatingGlobal, setIsUpdatingGlobal] = useState(false);
    
    // Suggestion State
    const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
    const [suggestionTimer, setSuggestionTimer] = useState<string>('--:--');
    const [isUpdatingSuggestions, setIsUpdatingSuggestions] = useState(false);
    const [hasInitialLoad, setHasInitialLoad] = useState(false);

    // Fetch Global Market Analysis with 1hr auto-refresh logic
    useEffect(() => {
        const fetchAnalysis = async () => {
            if (isUpdatingGlobal) return;
            setIsUpdatingGlobal(true);
            try {
                const data = await getOrRefreshGlobalAnalysis();
                setGlobalAnalysis(data);
            } catch (e) {
                console.error("Failed to load global analysis", e);
            } finally {
                setIsUpdatingGlobal(false);
            }
        };

        fetchAnalysis();
        
        // Check every 1 minute if the 1-hour cache has expired, if so, refresh
        const interval = setInterval(() => {
            fetchAnalysis();
        }, 60000); 

        return () => clearInterval(interval);
    }, []);

    // Fetch Suggestions logic
    useEffect(() => {
        let isMounted = true;
        let timerInterval: ReturnType<typeof setInterval>;

        const fetchSuggestions = async () => {
            setIsUpdatingSuggestions(true);
            try {
                const { suggestions: data, nextUpdate } = await getOrRefreshSuggestions(profitMode);
                
                if (isMounted) {
                    setSuggestions(data);
                    setHasInitialLoad(true);
                    
                    // Start countdown
                    if (timerInterval) clearInterval(timerInterval);
                    timerInterval = setInterval(() => {
                        const now = Date.now();
                        const diff = nextUpdate - now;
                        if (diff <= 0) {
                            setSuggestionTimer('Rescanning...');
                            clearInterval(timerInterval);
                            fetchSuggestions(); // Recursive call to refresh
                        } else {
                            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            const secs = Math.floor((diff % (1000 * 60)) / 1000);
                            setSuggestionTimer(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                        }
                    }, 1000);
                }

            } catch (e) {
                console.error("Failed to load suggestions", e);
            } finally {
                if (isMounted) setIsUpdatingSuggestions(false);
            }
        };

        fetchSuggestions();

        return () => {
            isMounted = false;
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [profitMode]); // Refetch when profitMode changes

    useEffect(() => {
        if (!chartRef.current) return;
        const Chart = (window as any).Chart;
        if (!Chart) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, chartRef.current.clientHeight);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.5)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.1)');

        const data = {
            labels: Array(50).fill(''),
            datasets: [{
                data: generateChartData(),
                borderColor: '#3498db',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }]
        };

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500,
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
        
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [timeRange]); // Redraw chart when timeRange changes

    const handleTimeRangeChange = (range: '1H' | '1D' | '1W') => {
        if (range !== timeRange) {
            setTimeRange(range);
        }
    };

    const getBiasColor = (bias: string) => {
        if (bias === 'Bullish') return 'text-green-400 border-green-500/30 bg-green-500/10';
        if (bias === 'Bearish') return 'text-red-400 border-red-500/30 bg-red-500/10';
        return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    };

    return (
        <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-3 sm:p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl mb-8">
            
            <div className="mb-6">
                <MarketTicker onAssetClick={onAssetSelect} />
            </div>

            <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="block cursor-pointer group">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">Market Overview</h2>
                    <div className="flex space-x-1 p-1 bg-gray-200/50 dark:bg-dark-bg/50 rounded-md text-xs">
                        {['1H', '1D', '1W'].map(range => (
                            <button
                                key={range}
                                onClick={(e) => {
                                    e.preventDefault(); 
                                    e.stopPropagation();
                                    handleTimeRangeChange(range as '1H' | '1D' | '1W');
                                }}
                                className={`px-2 py-1 rounded transition-colors ${timeRange === range ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-300/50 dark:hover:bg-dark-bg/80'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-40">
                    <canvas ref={chartRef}></canvas>
                </div>
            </a>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Market Status Card */}
                <div className="bg-dark-card/60 p-4 rounded-xl shadow-lg border border-green-500/10 flex flex-col justify-between min-h-[auto] md:min-h-[120px]">
                    <div className="flex justify-between items-start mb-2 md:mb-0">
                        <span className="text-xs uppercase font-semibold text-dark-text-secondary tracking-wider">Market Status</span>
                        <div className="bg-blue-500/20 p-1.5 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white">{statusText}</h3>
                        <div className="flex items-center mt-1">
                            <div className="relative flex items-center justify-center w-3 h-3 mr-2">
                                {isOpen && <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>
                            <span className="text-sm text-dark-text-secondary">{isOpen ? 'Weekdays' : 'Weekends / Off-hours'}</span>
                        </div>
                    </div>
                </div>

                {/* Current Day Card */}
                <div className="bg-dark-card/60 p-4 rounded-xl shadow-lg border border-green-500/10 flex flex-col justify-between min-h-[auto] md:min-h-[120px]">
                    <div className="flex justify-between items-start mb-2 md:mb-0">
                        <span className="text-xs uppercase font-semibold text-dark-text-secondary tracking-wider">Current Day</span>
                         <div className="bg-blue-500/20 p-1.5 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-grow flex flex-col justify-center">
                        <h3 className="text-2xl sm:text-3xl font-bold text-white">{day}</h3>
                        <div className="flex items-center mt-1">
                             <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                             <p className="text-sm text-dark-text-secondary">{date}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-end justify-between mt-1 gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full">{activeSessions}</span>
                        <div className="text-right">
                           <span className="font-mono text-base text-dark-text">{time}</span>
                           <span className="font-mono text-xs text-dark-text-secondary ml-1">{utcOffset}</span>
                        </div>
                    </div>
                </div>
                
                 {/* Analysis Count Card */}
                <div className="bg-dark-card/60 p-4 rounded-xl shadow-lg border border-green-500/10 flex flex-col justify-between min-h-[auto] md:min-h-[120px] relative group">
                    <div className="flex justify-between items-start mb-2 md:mb-0">
                        <span className="text-xs uppercase font-semibold text-dark-text-secondary tracking-wider">Session Analysis</span>
                        <div className="bg-blue-500/20 p-1.5 rounded-lg">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-grow flex flex-col items-center justify-center py-2">
                        <h3 className="text-4xl sm:text-5xl font-bold text-white tracking-tighter">{analysisCount}</h3>
                        <p className="text-sm text-dark-text-secondary mt-1">Analyses performed</p>
                    </div>
                    <button 
                        onClick={onResetCount} 
                        className="absolute bottom-2 right-2 text-xs font-medium text-blue-400 hover:underline focus:outline-none md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        aria-label="Reset analysis count"
                    >
                        Reset
                    </button>
                </div>
            </div>

             {/* AI Suggestions Section */}
             <div className={`mt-4 p-4 rounded-xl border relative overflow-hidden transition-all duration-300 ${profitMode ? 'bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-yellow-500/40' : 'bg-gradient-to-r from-gray-900 to-slate-900 border-green-500/30'}`}>
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                
                <div className="flex flex-wrap justify-between items-center mb-4 relative z-10 gap-2">
                    <div>
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${profitMode ? 'text-yellow-400' : 'text-green-400'}`}>
                             <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${profitMode ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${profitMode ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                            </span>
                            {profitMode ? 'PROFIT MODE: A+ Setups' : 'AI Asset Suggestions'}
                        </h3>
                        <p className="text-xs text-gray-400">{profitMode ? 'Strict filtering for highest probability trades' : 'High-probability setups (80%+) for this session'}</p>
                    </div>
                     <div className="text-right">
                        <span className="text-xs text-gray-500 block">Next Scan</span>
                        <span className={`font-mono font-bold ${profitMode ? 'text-yellow-300' : 'text-green-300'}`}>{suggestionTimer}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                    {isUpdatingSuggestions ? (
                         <div className="col-span-full py-4 text-center text-gray-500 text-sm italic animate-pulse">
                            {profitMode ? 'Scanning for A+ Setups...' : 'Scanning global markets...'}
                        </div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((asset, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => onAssetSelect && onAssetSelect(asset.symbol)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${profitMode ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{asset.symbol}</span>
                                        <span className={`text-[10px] px-1.5 rounded ${profitMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>{asset.type}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{asset.reason}</p>
                                </div>
                                <div className="text-right">
                                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${profitMode ? 'text-yellow-500' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        ))
                    ) : hasInitialLoad ? (
                         <div className="col-span-full py-6 text-center text-gray-400 text-sm bg-white/5 rounded-lg border border-white/5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold block text-gray-300">No {profitMode ? 'A+' : 'high-probability'} setups found.</span>
                            <span className="text-xs mt-1 block opacity-70">AI scanned for {profitMode ? 'perfect conditions' : '80%+ win-rate trades'} and found none. Preserving capital.</span>
                        </div>
                    ) : (
                         <div className="col-span-full py-4 text-center text-gray-500 text-sm italic">
                            Initializing Scanner...
                        </div>
                    )}
                </div>
            </div>

            {/* Global Market Structure Section */}
            <div className="mt-6 pt-6 border-t border-gray-300 dark:border-green-500/20">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-dark-text">
                        Global Market Structure
                        {isUpdatingGlobal && <span className="ml-2 text-xs font-normal text-blue-400 animate-pulse">(Updating...)</span>}
                    </h3>
                    <span className="text-xs text-dark-text-secondary bg-dark-bg/40 px-2 py-1 rounded">Auto-Updates Hourly</span>
                </div>
                
                {globalAnalysis ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {globalAnalysis.sectors.map((sector) => (
                                <div key={sector.asset} className={`p-3 rounded-xl border flex flex-col justify-between ${getBiasColor(sector.bias)}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-xs font-bold uppercase opacity-70">{sector.name}</span>
                                            <h4 className="font-bold text-lg">{sector.asset}</h4>
                                        </div>
                                        <span className="text-xs font-bold px-2 py-1 rounded bg-black/20">{sector.bias}</span>
                                    </div>
                                    <p className="text-xs opacity-90 leading-tight">{sector.reason}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-blue-100/90">
                                <span className="font-bold text-blue-300">Global Context:</span> {globalAnalysis.globalSummary}
                            </p>
                        </div>
                         <p className="text-right text-[10px] text-dark-text-secondary mt-1">Last Updated: {new Date(globalAnalysis.timestamp).toLocaleTimeString()}</p>
                    </div>
                ) : (
                    <div className="flex justify-center py-8">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                )}
            </div>
        </div>
    );
};
