
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader } from './Loader';
import { fetchMarketIntelligence } from '../services/intelligenceService';
import type { IntelligenceReport } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';

interface MarketIntelligenceProps {
    onBack: () => void;
    onOpenSettings?: () => void;
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ onBack, onOpenSettings }) => {
    const [reports, setReports] = useState<IntelligenceReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIntelligence = async () => {
        setIsLoading(true);
        setError(null);
        
        // Timeout after 120 seconds
        const timeout = setTimeout(() => {
            if (isLoading) {
                setError("Market scan is taking longer than usual. Please check your internet or try again.");
                setIsLoading(false);
            }
        }, 120000);

        try {
            const data = await fetchMarketIntelligence();
            setReports(data);
        } catch (err: any) {
            console.error(err);
            const msg = err.message || "";
            if (msg.includes("429") || msg.includes("quota")) {
                setError("System limit reached. Please wait a few minutes or switch API keys.");
            } else if (msg.includes("timeout") || msg.includes("abort")) {
                setError("Connection timed out. Market data is currently heavy.");
            } else {
                setError("Failed to fetch global market intelligence. Our Neural Lanes might be congested.");
            }
        } finally {
            clearTimeout(timeout);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadIntelligence();
        const interval = setInterval(loadIntelligence, 3600000); // 1 hour
        return () => clearInterval(interval);
    }, []);

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'High': return 'text-red-500 bg-red-500/10 border-red-500/30';
            case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
            case 'Low': return 'text-green-500 bg-green-500/10 border-green-500/30';
            default: return 'text-gray-400';
        }
    };

    const getActionColor = (action: string) => {
        return action === 'Ready to trade' 
            ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' 
            : 'bg-slate-700 text-slate-300';
    };

    const getTrendIcon = (trend: string) => {
        if (trend === 'Bullish') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/></svg>;
        if (trend === 'Bearish') return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd"/></svg>;
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>;
    };

    return (
        <div className="min-h-screen text-slate-800 dark:text-slate-200 font-sans flex flex-col p-4 sm:p-8 animate-fade-in relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            <header className="relative z-10 mb-12 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 hover:border-green-500/30 dark:hover:border-green-500/30 transition-all group shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 dark:text-slate-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-green-600 dark:text-green-500">
                            Market Intelligence <span className="text-gray-400 dark:text-white dark:opacity-40">v2.0</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 dark:text-white text-slate-800">Autonomous Quantitative Surveillance</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <ThemeToggleButton />
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Status</p>
                        <p className="text-xs font-bold text-green-500 dark:text-green-400 flex items-center justify-end gap-2">
                             ACTIVE SURVEILLANCE
                             <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        </p>
                    </div>
                    <button 
                        onClick={loadIntelligence}
                        disabled={isLoading}
                        className="px-4 sm:px-6 py-2.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-900/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Scanning...' : 'Manual Scan'}
                    </button>
                </div>
            </header>

            <main className="relative z-10 flex-grow">
                {isLoading && reports.length === 0 ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center">
                        <Loader />
                        <p className="mt-8 text-xs font-black uppercase tracking-[0.5em] text-green-500/50 animate-pulse">
                            Deep Scanning Global Assets...
                        </p>
                    </div>
                ) : error ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-xl mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-red-400 font-bold mb-4">{error}</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                            <button onClick={loadIntelligence} className="px-6 py-2 bg-red-600 rounded-xl text-xs font-black uppercase tracking-widest text-white">Retry Connection</button>
                            {onOpenSettings && (
                                <button onClick={onOpenSettings} className="px-6 py-2 bg-slate-800 border border-slate-600 rounded-xl text-xs font-black uppercase tracking-widest text-white">Switch API Key</button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {reports.map((report, idx) => (
                                <motion.div
                                    key={report.asset}
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white/80 dark:bg-slate-900/40 p-6 rounded-3xl relative group border border-gray-200 dark:border-white/5 hover:border-green-500/30 dark:hover:border-green-500/30 transition-all duration-500 shadow-sm"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                {report.asset}
                                            </h2>
                                            <div className={`mt-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase inline-block ${getRiskColor(report.newsRisk)}`}>
                                                News Risk: {report.newsRisk}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Quality Grade</div>
                                            <div className="text-2xl font-black text-green-600 dark:text-green-500">
                                                {report.setupQuality}<span className="text-[10px] opacity-40 ml-0.5">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">Trend 1H</div>
                                            <div className="flex items-center gap-2">
                                                {getTrendIcon(report.trend.h1)}
                                                <span className={`text-xs font-black uppercase ${report.trend.h1 === 'Bullish' ? 'text-green-600 dark:text-green-400' : report.trend.h1 === 'Bearish' ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                                                    {report.trend.h1}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">Trend 4H</div>
                                            <div className="flex items-center gap-2">
                                                {getTrendIcon(report.trend.h4)}
                                                <span className={`text-xs font-black uppercase ${report.trend.h4 === 'Bullish' ? 'text-green-600 dark:text-green-400' : report.trend.h4 === 'Bearish' ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                                                    {report.trend.h4}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-3">POI Zones identified</div>
                                        <div className="flex flex-wrap gap-2">
                                            {report.poiZones.map((zone, zIdx) => (
                                                <div key={zIdx} className={`px-2 py-1 rounded-lg text-[9px] font-bold border ${zone.type === 'demand' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                    {zone.type === 'demand' ? 'DEMAND' : 'SUPPLY'} @ {zone.priceRange.upper}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-6 bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-transparent">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                            "{report.summary}"
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-4">
                                            {report.metrics?.rsi && (
                                                <div className="text-[9px] font-bold">
                                                    <span className="text-slate-500 mr-1">RSI</span>
                                                    <span className={report.metrics.rsi > 70 ? 'text-red-500 dark:text-red-400' : report.metrics.rsi < 30 ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}>
                                                        {report.metrics.rsi}
                                                    </span>
                                                </div>
                                            )}
                                            {report.metrics?.adx && (
                                                <div className="text-[9px] font-bold">
                                                    <span className="text-slate-500 mr-1">ADX</span>
                                                    <span className="text-slate-900 dark:text-white">{report.metrics.adx}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getActionColor(report.action)}`}>
                                            {report.action}
                                        </div>
                                    </div>

                                    {/* Glass Overlay Shine */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/50 dark:via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-3xl"></div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            <footer className="relative z-10 mt-12 py-8 border-t border-gray-200 dark:border-white/5 text-center transition-colors">
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">
                    Neural Intelligence Loop active. Next scan in 60 minutes.
                </p>
            </footer>
        </div>
    );
};
