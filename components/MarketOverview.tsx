
import React, { useState, useEffect, useRef } from 'react';
import { getOrRefreshSuggestions } from '../services/suggestionService';
import type { AssetSuggestion } from '../types';
import { MarketTicker } from './MarketTicker';
import { KillzoneClock } from './KillzoneClock';

// --- Safe Trading Timer Logic ---
const SNIPER_TARGET_KEY = 'greyquant_sniper_target';
const SNIPER_WINDOW_KEY = 'greyquant_sniper_window_end';

type TimerState = 'COUNTDOWN' | 'ACTIVE';

const SafeTradingTimer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<string>('--:--:--');
    const [targetTimeString, setTargetTimeString] = useState<string>('');
    const [status, setStatus] = useState<TimerState>('COUNTDOWN');
    
    const generateNewTarget = (baseTime: number) => {
        const minMinutes = 30;
        const maxMinutes = 120;
        const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
        return baseTime + (randomMinutes * 60 * 1000);
    };

    const tick = () => {
        const now = Date.now();
        let targetStr = localStorage.getItem(SNIPER_TARGET_KEY);
        let windowEndStr = localStorage.getItem(SNIPER_WINDOW_KEY);

        let target = targetStr ? parseInt(targetStr, 10) : null;
        let windowEnd = windowEndStr ? parseInt(windowEndStr, 10) : null;

        if (!target) {
            const newTarget = generateNewTarget(now);
            localStorage.setItem(SNIPER_TARGET_KEY, newTarget.toString());
            localStorage.removeItem(SNIPER_WINDOW_KEY);
            target = newTarget;
            windowEnd = null;
        }

        if (now < target) {
            setStatus('COUNTDOWN');
            const diff = target - now;
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            const date = new Date(target);
            setTargetTimeString(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
            if (windowEnd && now < windowEnd) {
                setStatus('ACTIVE');
                setTimeLeft('00:00:00');
                setTargetTimeString('NOW');
            } else if (windowEnd && now >= windowEnd) {
                const newTarget = generateNewTarget(now);
                localStorage.setItem(SNIPER_TARGET_KEY, newTarget.toString());
                localStorage.removeItem(SNIPER_WINDOW_KEY);
            } else if (!windowEnd) {
                const timeSinceTarget = now - target;
                const MAX_LATE_THRESHOLD = 10 * 60 * 1000;
                if (timeSinceTarget > MAX_LATE_THRESHOLD) {
                    const newTarget = generateNewTarget(now);
                    localStorage.setItem(SNIPER_TARGET_KEY, newTarget.toString());
                    localStorage.removeItem(SNIPER_WINDOW_KEY);
                } else {
                    const activeMinutes = Math.floor(Math.random() * (5 - 3 + 1)) + 3;
                    const newWindowEnd = now + (activeMinutes * 60 * 1000);
                    localStorage.setItem(SNIPER_WINDOW_KEY, newWindowEnd.toString());
                    setStatus('ACTIVE');
                    setTimeLeft('00:00:00');
                    setTargetTimeString('NOW');
                }
            }
        }
    };

    useEffect(() => {
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    const isReady = status === 'ACTIVE';

    return (
        <div className={`mb-8 rounded-2xl border-2 relative overflow-hidden transition-all duration-500 shadow-2xl ${isReady ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'bg-black/40 border-white/5'}`}>
            <div className="flex flex-col sm:flex-row items-center justify-between p-5 relative z-10 gap-6">
                <div className="flex items-center gap-5">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl border-2 transition-all ${isReady ? 'border-green-400 bg-green-500/20 animate-pulse' : 'border-blue-400/30 bg-blue-500/10'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 ${isReady ? 'text-green-400' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isReady ? 'text-green-400' : 'text-blue-400/70'}`}>
                            {isReady ? 'Precision Entry Window Active' : 'Neural Calibration Protocol'}
                        </h3>
                        <p className={`text-xl font-black uppercase tracking-tight mt-1 ${isReady ? 'text-white' : 'text-gray-400'}`}>
                            {isReady ? 'EXECUTE ALPHA SETUP NOW' : 'WAITING FOR LIQUIDITY'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
                    <div className="text-center">
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Time To Sync</span>
                        <span className={`font-mono text-3xl font-black ${isReady ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                            {timeLeft}
                        </span>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="text-center">
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Sync Target</span>
                        <span className="font-mono text-xl font-black text-yellow-500">
                            {targetTimeString}
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
    );
};

const useMarketStatus = () => {
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        const checkStatus = () => {
            const now = new Date();
            const dayUTC = now.getUTCDay();
            const hourUTC = now.getUTCHours();
            if (dayUTC === 6 || (dayUTC === 0 && hourUTC < 22) || (dayUTC === 5 && hourUTC >= 22)) {
                setIsOpen(false);
            } else {
                setIsOpen(true);
            }
        };
        checkStatus();
        const timer = setInterval(checkStatus, 60000);
        return () => clearInterval(timer);
    }, []);
    return { isOpen, statusText: isOpen ? 'OPERATIONAL' : 'OFFLINE' };
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
    profitMode: boolean; 
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ analysisCount, onResetCount, onAssetSelect, profitMode }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    const [timeRange, setTimeRange] = useState<'1H' | '1D' | '1W'>('1H');
    const { isOpen, statusText } = useMarketStatus();
    const [suggestions, setSuggestions] = useState<AssetSuggestion[]>([]);
    const [suggestionTimer, setSuggestionTimer] = useState<string>('--:--');
    const [isUpdatingSuggestions, setIsUpdatingSuggestions] = useState(false);
    const [hasInitialLoad, setHasInitialLoad] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let timerInterval: ReturnType<typeof setInterval>;
        const fetchSuggestions = async () => {
            setIsUpdatingSuggestions(true);
            try {
                const { suggestions: data, nextUpdate } = await getOrRefreshSuggestions(profitMode);
                if (isMounted) {
                    setSuggestions(data || []);
                    setHasInitialLoad(true);
                    if (timerInterval) clearInterval(timerInterval);
                    timerInterval = setInterval(() => {
                        const now = Date.now();
                        const diff = nextUpdate - now;
                        if (diff <= 0) {
                            setSuggestionTimer('Scanning');
                            clearInterval(timerInterval);
                            fetchSuggestions();
                        } else {
                            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            const secs = Math.floor((diff % (1000 * 60)) / 1000);
                            setSuggestionTimer(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
                        }
                    }, 1000);
                }
            } catch (e) {
                console.error("Failed to load suggestions", e);
                if (isMounted) setSuggestions([]);
            } finally {
                if (isMounted) setIsUpdatingSuggestions(false);
            }
        };
        fetchSuggestions();
        return () => { isMounted = false; if (timerInterval) clearInterval(timerInterval); };
    }, [profitMode]);

    useEffect(() => {
        if (!chartRef.current) return;
        const Chart = (window as any).Chart;
        if (!Chart) return;
        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        const gradient = ctx.createLinearGradient(0, 0, 0, chartRef.current.clientHeight);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
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
        if (chartInstance.current) chartInstance.current.destroy();
        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
        return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
    }, [timeRange]);

    return (
        <div className="bg-white/80 dark:bg-dark-card/90 backdrop-blur-2xl p-4 sm:p-8 rounded-2xl border-2 border-white/5 shadow-2xl mb-12">
            
            <SafeTradingTimer />

            <div className="mb-8">
                <MarketTicker onAssetClick={onAssetSelect} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-black/20 p-6 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Global Sentiment Arc</h2>
                        <div className="flex space-x-2 bg-black/30 p-1 rounded-xl">
                            {['1H', '1D', '1W'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range as '1H' | '1D' | '1W')}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${timeRange === range ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-40">
                        <canvas ref={chartRef}></canvas>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5 h-full flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">System State</span>
                            <div className={`flex items-center gap-2 text-[10px] font-black px-2 py-1 rounded-full ${isOpen ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                {statusText}
                            </div>
                        </div>
                        <div className="text-center py-4">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] block mb-2">Daily Iterations</span>
                            <span className="text-5xl font-black text-white tracking-tighter font-mono">{analysisCount}</span>
                        </div>
                        <button 
                            onClick={onResetCount} 
                            className="text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors text-center block w-full mt-2"
                        >
                            Reset Logs
                        </button>
                    </div>
                </div>
            </div>

            <div className="col-span-full mb-8">
                <KillzoneClock />
            </div>

             <div className={`p-6 rounded-2xl border-2 relative overflow-hidden transition-all duration-300 ${profitMode ? 'bg-yellow-900/10 border-yellow-500/30' : 'bg-black/40 border-green-500/20'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none"></div>
                
                <div className="flex flex-wrap justify-between items-center mb-6 relative z-10 gap-4">
                    <div>
                        <h3 className={`text-lg font-black flex items-center gap-3 uppercase tracking-tighter ${profitMode ? 'text-yellow-500' : 'text-green-500'}`}>
                             <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${profitMode ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${profitMode ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                            </span>
                            {profitMode ? 'Tactical Alpha Scanner' : 'Neural Asset Queue'}
                        </h3>
                    </div>
                     <div className="text-right">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Queue Refresh</span>
                        <span className={`font-mono text-lg font-black ${profitMode ? 'text-yellow-400' : 'text-green-400'}`}>{suggestionTimer}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                    {isUpdatingSuggestions ? (
                         <div className="col-span-full py-8 text-center text-gray-500 text-xs font-black uppercase tracking-widest animate-pulse">
                            Processing Market Topography...
                        </div>
                    ) : suggestions.map((asset, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => onAssetSelect && onAssetSelect(asset.symbol)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.05] active:scale-95 flex flex-col gap-3 ${profitMode ? 'bg-black/40 hover:bg-yellow-500/10 border-yellow-500/20 shadow-xl shadow-yellow-500/5' : 'bg-black/40 hover:bg-green-500/10 border-white/5'}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-black text-white text-lg tracking-tight">{asset.symbol}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${profitMode ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-300'}`}>{asset.type}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium leading-tight line-clamp-2">{asset.reason}</p>
                            <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                                <span className="text-[9px] font-black text-gray-500 uppercase">Analysis Ready</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${profitMode ? 'text-yellow-500' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
