
import React, { useState, useEffect } from 'react';
import type { MarketStatsData, StatTimeframe } from '../types';
import { fetchMarketStatistics, getAvailableAssets } from '../services/marketStatsService';
import { ThemeToggleButton } from './ThemeToggleButton';
import { Loader } from './Loader';

interface MarketStatisticsPageProps {
    onBack: () => void;
    onLogout: () => void;
}

const TimeframeSelector: React.FC<{
    selected: StatTimeframe;
    onSelect: (tf: StatTimeframe) => void;
}> = ({ selected, onSelect }) => (
    <div className="flex bg-gray-200/50 dark:bg-dark-bg/60 p-1 rounded-lg">
        {(['15m', '1H', '4H', '1D'] as StatTimeframe[]).map((tf) => (
            <button
                key={tf}
                onClick={() => onSelect(tf)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    selected === tf
                        ? 'bg-white dark:bg-dark-card text-green-600 dark:text-green-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:text-dark-text-secondary dark:hover:text-white'
                }`}
            >
                {tf}
            </button>
        ))}
    </div>
);

const SentimentCircle: React.FC<{ 
    score: number; 
    label: string; 
    size?: 'sm' | 'md' | 'lg';
    displayValue?: string | number; 
}> = ({ score, label, size = 'lg', displayValue }) => {
    // Color Logic: Red (Sell) | Blue (Neutral) | Green (Buy)
    let colorClass = 'text-blue-500';
    let strokeClass = 'stroke-blue-500';
    
    if (score < 40) {
        colorClass = 'text-red-500';
        strokeClass = 'stroke-red-500';
    } else if (score >= 60) {
        colorClass = 'text-green-500';
        strokeClass = 'stroke-green-500';
    }

    // Size Configuration
    let radius = 40;
    let strokeWidth = 8;
    let textSize = 'text-3xl';
    let widthClass = 'w-32';
    let heightClass = 'h-32';
    let labelSize = 'text-lg';
    let containerPad = 'p-4';

    if (size === 'sm') {
        radius = 28;
        strokeWidth = 5;
        textSize = 'text-xl';
        widthClass = 'w-20';
        heightClass = 'h-20';
        labelSize = 'text-xs';
        containerPad = 'p-2';
    } else if (size === 'md') {
        radius = 36;
        strokeWidth = 6;
        textSize = 'text-2xl';
        widthClass = 'w-28';
        heightClass = 'h-28';
        labelSize = 'text-sm';
        containerPad = 'p-3';
    }
    // lg uses defaults (w-32, etc)

    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    // Handle long values (like BTC prices) scaling down
    const valueToShow = displayValue !== undefined ? displayValue : score;
    const valueStr = String(valueToShow);
    if (valueStr.length > 5) {
        if (size === 'lg') textSize = 'text-2xl';
        else if (size === 'md') textSize = 'text-sm';
        else textSize = 'text-[10px]';
    }

    return (
        <div className={`flex flex-col items-center justify-center ${containerPad}`}>
            <div className={`relative ${widthClass} ${heightClass}`}>
                <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}>
                    <circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className={`${strokeClass} transition-all duration-1000 ease-out`}
                    />
                </svg>
                {/* Perfect centering using absolute inset */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${textSize} font-bold ${colorClass} transition-all duration-300`}>{valueToShow}</span>
                </div>
            </div>
            <h3 className={`mt-2 font-bold ${labelSize} uppercase ${colorClass} text-center`}>{label}</h3>
            {size === 'lg' && <p className="text-xs text-gray-500 dark:text-dark-text-secondary text-center">Community Vote</p>}
        </div>
    );
};

const SupportResistanceLevels: React.FC<{ 
    currentPrice: number; 
    levels: { s1: number; s2: number; s3: number; r1: number; r2: number; r3: number } 
}> = ({ currentPrice, levels }) => {
    return (
        <div className="w-full p-4 bg-gray-50/50 dark:bg-dark-bg/40 rounded-xl border border-gray-200 dark:border-green-500/10">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 text-center uppercase tracking-wider">Key Levels</h4>
            <div className="space-y-1 relative">
                {/* Resistance */}
                <div className="flex justify-between text-xs text-red-400"><span>R3</span> <span className="font-mono">{levels.r3}</span></div>
                <div className="flex justify-between text-xs text-red-400 opacity-80"><span>R2</span> <span className="font-mono">{levels.r2}</span></div>
                <div className="flex justify-between text-xs text-red-400 opacity-60"><span>R1</span> <span className="font-mono">{levels.r1}</span></div>
                
                {/* Current Price Line */}
                <div className="py-2 flex items-center">
                    <div className="h-px bg-blue-500/50 flex-grow"></div>
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full font-mono">{currentPrice}</span>
                    <div className="h-px bg-blue-500/50 flex-grow"></div>
                </div>

                {/* Support */}
                <div className="flex justify-between text-xs text-green-400 opacity-60"><span>S1</span> <span className="font-mono">{levels.s1}</span></div>
                <div className="flex justify-between text-xs text-green-400 opacity-80"><span>S2</span> <span className="font-mono">{levels.s2}</span></div>
                <div className="flex justify-between text-xs text-green-400"><span>S3</span> <span className="font-mono">{levels.s3}</span></div>
            </div>
        </div>
    );
};

// Helper to convert textual signal to a score for the gauge (0-100)
const getSignalScore = (signal?: string) => {
    if (!signal) return 50;
    const s = signal.toLowerCase();
    if (s.includes('strong buy')) return 95;
    if (s.includes('buy')) return 75;
    if (s.includes('strong sell')) return 5;
    if (s.includes('sell')) return 25;
    return 50;
};

export const MarketStatisticsPage: React.FC<MarketStatisticsPageProps> = ({ onBack, onLogout }) => {
    const assets = getAvailableAssets();
    const [selectedCategory, setSelectedCategory] = useState<'Majors' | 'Minors' | 'Commodities'>('Majors');
    const [selectedAsset, setSelectedAsset] = useState<string>(assets.Majors[0]);
    const [timeframe, setTimeframe] = useState<StatTimeframe>('1H');
    const [data, setData] = useState<MarketStatsData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!assets[selectedCategory].includes(selectedAsset)) {
            setSelectedAsset(assets[selectedCategory][0]);
        }
    }, [selectedCategory]);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            if (!isMounted) return;
            setData(null); // Clear previous data immediately to avoid stale renders
            setLoading(true);
            try {
                const stats = await fetchMarketStatistics(selectedAsset, timeframe);
                if (isMounted) setData(stats);
            } catch (error) {
                console.error(error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [selectedAsset, timeframe]);

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-green-400">
                        Market Statistics
                    </h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                        <button onClick={onLogout} className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium">
                            Logout
                        </button>
                    </div>
                </header>

                <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl flex-grow flex flex-col">
                    {/* Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                            {(Object.keys(assets) as Array<keyof typeof assets>).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-colors ${
                                        selectedCategory === cat
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 dark:bg-dark-bg/60 text-gray-600 dark:text-dark-text-secondary hover:bg-gray-300 dark:hover:bg-dark-bg'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <TimeframeSelector selected={timeframe} onSelect={setTimeframe} />
                    </div>

                    {/* Asset Selection */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        {assets[selectedCategory].map(asset => (
                            <button
                                key={asset}
                                onClick={() => setSelectedAsset(asset)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                    selectedAsset === asset
                                        ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                                        : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-dark-text-secondary hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                            >
                                {asset}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex-grow flex items-center justify-center min-h-[400px]">
                            <Loader />
                        </div>
                    ) : data ? (
                        // Using key={selectedAsset} ensures a complete re-render when switching assets,
                        // preventing animation glitches or stale data display.
                        <div key={selectedAsset} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                            {/* Left Col: Sentiment & Support/Resistance */}
                            <div className="space-y-6">
                                <div className="text-center md:text-left">
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{data.symbol}</h2>
                                    <p className="text-xl font-mono text-gray-600 dark:text-green-400 mt-1">${data.price}</p>
                                </div>
                                <div className="p-4 bg-white/50 dark:bg-dark-card/40 rounded-xl border border-gray-200 dark:border-green-500/10">
                                    <SentimentCircle score={data.sentimentScore} label={data.sentimentLabel} size="lg" />
                                </div>
                                
                                {data.supportResistance && (
                                    <SupportResistanceLevels currentPrice={data.price} levels={data.supportResistance} />
                                )}
                            </div>

                            {/* Middle Col: Technical Indicators */}
                            <div className="bg-gray-50/50 dark:bg-dark-bg/40 p-5 rounded-xl border border-gray-200 dark:border-green-500/10">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-green-400 mb-4 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Technical Indicators
                                </h3>
                                
                                {/* Gauge Grid: RSI, Stoch, SMA50, SMA200 */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white/40 dark:bg-dark-card/30 p-2 rounded-lg border border-gray-200 dark:border-gray-700/50 flex justify-center">
                                        <SentimentCircle score={data.indicators.rsi} label="RSI (14)" size="md" />
                                    </div>
                                    <div className="bg-white/40 dark:bg-dark-card/30 p-2 rounded-lg border border-gray-200 dark:border-gray-700/50 flex justify-center">
                                        <SentimentCircle score={data.indicators.stochastic.k} label="Stoch %K" size="md" />
                                    </div>
                                    <div className="bg-white/40 dark:bg-dark-card/30 p-2 rounded-lg border border-gray-200 dark:border-gray-700/50 flex justify-center">
                                        <SentimentCircle 
                                            score={getSignalScore(data.indicators.ma50.signal)} 
                                            label="SMA 50" 
                                            displayValue={data.indicators.ma50.value}
                                            size="md" 
                                        />
                                    </div>
                                    <div className="bg-white/40 dark:bg-dark-card/30 p-2 rounded-lg border border-gray-200 dark:border-gray-700/50 flex justify-center">
                                        <SentimentCircle 
                                            score={getSignalScore(data.indicators.ma200.signal)} 
                                            label="SMA 200" 
                                            displayValue={data.indicators.ma200.value}
                                            size="md" 
                                        />
                                    </div>
                                    
                                    {/* ADX / ATR Bar */}
                                    <div className="bg-white/40 dark:bg-dark-card/30 p-2 rounded-lg border border-gray-200 dark:border-gray-700/50 col-span-2 flex justify-around items-center">
                                         <div className="text-center">
                                            <span className="block text-xs font-bold text-gray-500 uppercase">ADX</span>
                                            <span className={`text-xl font-bold ${data.indicators.adx.value > 25 ? 'text-green-500' : 'text-gray-400'}`}>{data.indicators.adx.value}</span>
                                            <span className="block text-[10px] text-gray-400">{data.indicators.adx.trend}</span>
                                         </div>
                                         <div className="text-center">
                                            <span className="block text-xs font-bold text-gray-500 uppercase">ATR</span>
                                            <span className="text-xl font-bold text-blue-400">{data.indicators.atr}</span>
                                            <span className="block text-[10px] text-gray-400">Pips</span>
                                         </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Col: News & Patterns */}
                            <div className="flex flex-col gap-6">
                                {/* News Section */}
                                <div className="bg-gray-50/50 dark:bg-dark-bg/40 p-5 rounded-xl border border-gray-200 dark:border-green-500/10">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-green-400 mb-4 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h3m-3 4h3m-3 4h3m-3 4h3" />
                                        </svg>
                                        Today's Events
                                    </h3>
                                    {data.todaysEvents.length > 0 ? (
                                        <ul className="space-y-3">
                                            {data.todaysEvents.map((event, i) => (
                                                <li key={i} className={`p-3 rounded-lg border ${
                                                    event.impact === 'High' ? 'bg-red-500/10 border-red-500/30' : 
                                                    event.impact === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30' : 
                                                    'bg-gray-200/50 dark:bg-dark-card/50 border-transparent'
                                                }`}>
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-semibold text-sm text-gray-800 dark:text-dark-text">{event.name}</span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                            event.impact === 'High' ? 'bg-red-500 text-white' : 
                                                            event.impact === 'Medium' ? 'bg-yellow-500 text-black' : 
                                                            'bg-gray-400 text-white'
                                                        }`}>{event.impact}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                                        {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary italic text-center py-4">
                                            No major economic events scheduled for today affecting {data.symbol}.
                                        </p>
                                    )}
                                </div>

                                {/* Candlestick Patterns Section */}
                                <div className="bg-gray-50/50 dark:bg-dark-bg/40 p-5 rounded-xl border border-gray-200 dark:border-green-500/10">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-green-400 mb-4 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        Candlestick Patterns
                                    </h3>
                                    {data.patterns && data.patterns.length > 0 ? (
                                        <ul className="space-y-3">
                                            {data.patterns.map((pattern, i) => (
                                                <li key={i} className={`p-3 rounded-lg border flex items-center justify-between ${
                                                    pattern.signal === 'Bullish' ? 'bg-green-500/10 border-green-500/30' : 
                                                    pattern.signal === 'Bearish' ? 'bg-red-500/10 border-red-500/30' : 
                                                    'bg-blue-500/10 border-blue-500/30'
                                                }`}>
                                                    <div>
                                                        <span className={`font-bold text-sm block ${
                                                            pattern.signal === 'Bullish' ? 'text-green-600 dark:text-green-400' :
                                                            pattern.signal === 'Bearish' ? 'text-red-600 dark:text-red-400' :
                                                            'text-blue-500'
                                                        }`}>
                                                            {pattern.name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 dark:text-dark-text-secondary">{pattern.description}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                                        pattern.signal === 'Bullish' ? 'bg-green-500 text-white' :
                                                        pattern.signal === 'Bearish' ? 'bg-red-500 text-white' :
                                                        'bg-blue-500 text-white'
                                                    }`}>
                                                        {pattern.signal}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary italic text-center py-4">
                                            No significant candlestick patterns detected on the {data.timeframe} timeframe.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-red-400">Failed to load data.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
