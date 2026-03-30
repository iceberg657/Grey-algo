
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SignalData, EconomicEvent } from '../types';
import { generateAndPlayAudio, stopAudio } from '../services/ttsService';
import { TiltCard } from './TiltCard';

interface InfoCardProps {
    label: string;
    value: React.ReactNode;
    className?: string;
    isSignal?: boolean;
    signalType?: SignalData['signal'];
    valueClassName?: string;
    subValue?: string; 
    subValueClassName?: string;
    delay?: string;
}

const getSignalTextClasses = (signal: SignalData['signal']) => {
    switch(signal) {
        case 'BUY': return 'text-green-400 animate-glowing-text-green';
        case 'SELL': return 'text-red-400 animate-glowing-text-red';
        case 'NEUTRAL': return 'text-yellow-400 animate-glowing-text-yellow';
        default: return 'text-gray-800 dark:text-dark-text';
    }
};

const InfoCard: React.FC<InfoCardProps> = ({ label, value, className, isSignal = false, signalType, valueClassName, subValue, subValueClassName, delay = '0ms' }) => (
    <div className="opacity-0 animate-flip-3d" style={{ animationDelay: delay }}>
        <TiltCard>
            <div className={`flex flex-col items-center justify-center p-3 rounded-lg bg-white/90 dark:bg-slate-800/40 backdrop-blur-xl border border-gray-300 dark:border-white/10 hover:border-green-500/30 transition-all transform hover:scale-[1.03] shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] ${className} h-full min-h-[90px]`}>
                <span className="text-[10px] sm:text-xs text-slate-700 dark:text-dark-text/70 uppercase tracking-wider text-center font-bold">{label}</span>
                {isSignal ? (
                    <div className="flex items-center gap-2">
                        <span className={`mt-1 font-black text-2xl sm:text-3xl ${getSignalTextClasses(signalType ?? 'BUY')}`}>
                            {value}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-base sm:text-lg font-mono font-bold text-center break-all ${valueClassName || 'text-slate-900 dark:text-dark-text'}`}>
                            {value}
                        </span>
                        {typeof value === 'string' || typeof value === 'number' ? (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(value.toString());
                                    alert(`${label} copied!`);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-blue-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            </button>
                        ) : null}
                    </div>
                )}
                {subValue && (
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1 text-center ${subValueClassName || 'text-slate-600'}`}>
                        {subValue}
                    </span>
                )}
            </div>
        </TiltCard>
    </div>
);

const SentimentGauge: React.FC<{ score: number; summary: string }> = ({ score, summary }) => {
    const trend = useMemo(() => {
        if (score >= 85) return { label: 'STRONG BULLISH', color: 'text-green-500', bg: 'bg-green-500', icon: '🚀' };
        if (score >= 50) return { label: 'BULLISH', color: 'text-green-400', bg: 'bg-green-400', icon: '↗️' };
        if (score <= 15) return { label: 'STRONG BEARISH', color: 'text-red-500', bg: 'bg-red-500', icon: '🔻' };
        return { label: 'BEARISH', color: 'text-red-400', bg: 'bg-red-400', icon: '↘️' };
    }, [score]);

    return (
        <div className="flex flex-col w-full p-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className={`text-2xl sm:text-3xl ${trend.color}`}>{trend.icon}</div>
                    <div>
                        <div className={`text-base sm:text-lg font-extrabold uppercase ${trend.color} leading-none`}>{trend.label}</div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400 font-mono uppercase tracking-wider mt-1 font-bold">HTF Macro Bias</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-xl sm:text-2xl font-bold ${trend.color} leading-none font-mono`}>{score}</div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 font-mono uppercase mt-1">HTF Bias Score</div>
                </div>
            </div>

            <div className="relative h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mb-1 shadow-inner">
                <div 
                    className={`absolute top-0 left-0 h-full ${trend.bg} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-700 dark:text-gray-400 font-mono mb-4 opacity-70 font-bold uppercase tracking-widest">
                <span>BEARISH (0-49)</span>
                <span>BULLISH (50-100)</span>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-xl border border-gray-300 dark:border-white/10 shadow-[0_4px_16px_0_rgba(31,38,135,0.05)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                <p className="text-sm text-slate-900 dark:text-gray-300 italic leading-relaxed font-medium">
                    "{summary}"
                </p>
            </div>
        </div>
    );
};

const EventCard: React.FC<{ event: EconomicEvent }> = ({ event }) => {
    const impact = event.impact.toLowerCase();
    const impactClasses = impact.includes('high') 
        ? 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30 dark:border-red-500/50' 
        : impact.includes('medium') 
            ? 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 dark:border-yellow-500/50' 
            : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/50';

    return (
        <div className={`p-3 rounded-lg border ${impactClasses} flex justify-between items-center shadow-sm animate-fade-in`}>
            <div>
                <p className="font-bold text-xs sm:text-sm tracking-tight">{event.name}</p>
                <p className="text-[10px] opacity-70 mt-0.5 font-mono">{new Date(event.date).toLocaleString()}</p>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/10 ml-2">{event.impact}</span>
        </div>
    );
};

export const Section: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode; delay?: string }> = ({ title, children, icon, delay = '0ms' }) => (
    <div className="pt-4 mt-4 border-t border-gray-300 dark:border-white/5 opacity-0 animate-flip-3d" style={{ animationDelay: delay }}>
        <h3 className="flex items-center text-base font-black text-slate-900 dark:text-green-400 mb-4 uppercase tracking-tighter">
            <span className="p-1.5 rounded-lg bg-green-500/10 mr-2 border border-green-500/20">
                {icon}
            </span>
            {title}
        </h3>
        {children}
    </div>
);

const VerificationStepCard: React.FC<{ title: string; step: VerificationStep }> = ({ title, step }) => (
    <div className={`p-4 rounded-xl border ${step.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} backdrop-blur-sm shadow-md transition-all`}>
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-gray-200">{title}</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${step.passed ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {step.passed ? 'PASSED' : 'FAILED'}
            </span>
        </div>
        <p className="text-xs text-slate-800 dark:text-gray-300 leading-relaxed font-medium">{step.reasoning}</p>
    </div>
);

export const SignalDisplay: React.FC<{ data: SignalData }> = ({ data }) => {
    const [ttsState, setTtsState] = useState<'idle' | 'waiting' | 'speaking'>('idle');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Determine unit and precision for display
    const getUnitAndPrecision = (asset: string) => {
        const normalized = asset.toUpperCase();
        if (normalized.includes('JPY')) return { unit: 'Pips', precision: 1, scalar: 100 };
        if (['EUR','GBP','AUD','NZD','USD','CAD','CHF'].some(c => normalized.includes(c)) && !normalized.includes('XAU') && !normalized.includes('BTC')) {
            return { unit: 'Pips', precision: 1, scalar: 10000 };
        }
        if (normalized.includes('XAU') || normalized.includes('BTC') || normalized.includes('ETH')) {
            return { unit: 'Pts/$', precision: 2, scalar: 1 };
        }
        return { unit: 'Pts', precision: 2, scalar: 1 };
    };

    const { unit, precision, scalar } = getUnitAndPrecision(data.asset);
    
    // Determine Recommended Entry Index based on entryType
    const recommendedEntryIndex = data.entryType === 'Market Execution' ? 1 : 0; 
    
    // Use pre-calculated data from SignalData if available (from tradeSetup.ts)
    const entry = data.entryPoints[recommendedEntryIndex] || data.entryPoints[0] || 0;
    const sl = data.stopLoss || 0;
    const tp3 = data.takeProfits[2] || data.takeProfits[0] || 0;
    
    const diffSL = Math.abs(entry - sl);
    const diffTP3 = Math.abs(tp3 - entry);
    
    const slDisplay = (diffSL * scalar).toFixed(precision);
    const tp3Display = (diffTP3 * scalar).toFixed(precision);
    
    const formatCurrency = (val?: number) => val != null ? `$${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00';

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        alert(`${label} copied to clipboard!`);
    };

    const copyFullSignal = () => {
        const signalText = `
Asset: ${data.asset}
Signal: ${data.signal}
Entry: ${entry}
SL: ${sl}
TP1: ${data.takeProfits[0]}
TP2: ${data.takeProfits[1]}
TP3: ${data.takeProfits[2]}
Type: ${data.entryType}
Lot Size: ${data.formattedLotSize || 'N/A'}
        `.trim();
        copyToClipboard(signalText, 'Full Signal');
    };

    useEffect(() => {
        return () => {
            stopAudio();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);
    
    const handleToggleSpeech = async () => {
        if (ttsState === 'speaking') {
            stopAudio();
            setTtsState('idle');
        } else if (ttsState === 'waiting') {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setTtsState('idle');
        } else {
            const { asset, signal, stopLoss, takeProfits, reasoning, confidence, entryType, counterArgumentRejection } = data;
            let textToSpeak = `Blueprint for ${asset}. Operational bias ${signal}. `;
            textToSpeak += `Strategic confidence ${confidence} percent. Execution protocol ${entryType}. Stop loss ${stopLoss}. Primary target ${takeProfits[0]}. `;
            if (counterArgumentRejection) {
                textToSpeak += `Counter-argument rejected: ${counterArgumentRejection}. `;
            }
            textToSpeak += `Reasoning: ${reasoning[0]}`;
            setTtsState('waiting');
            timeoutRef.current = setTimeout(async () => {
                try {
                    setTtsState('speaking');
                    await generateAndPlayAudio(textToSpeak.replace(/✅|❌|🔵/g, ''), () => setTtsState('idle'));
                } catch { setTtsState('idle'); }
            }, 100); // Reduced delay to 100ms
        }
    };

    const confidenceDetails = data.confidence >= 80 
        ? { label: "High Probability", color: "text-green-400" } 
        : { label: "Medium Probability", color: "text-yellow-400" };

    const hasEconomicEvents = Array.isArray(data.economicEvents) && data.economicEvents.length > 0;
    const hasSentiment = !!data.sentiment;

    const getEntryTypeColor = (type: string) => {
        switch (type) {
            case 'Market Execution': return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'Buy Limit': return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'Sell Limit': return 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'Buy Stop': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'Sell Stop': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'Buy Stop Limit': return 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20';
            case 'Sell Stop Limit': return 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20';
            default: return 'text-gray-600 dark:text-gray-400 bg-black/10 dark:bg-black/30 border-transparent';
        }
    };

    const getEntryTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'Market Execution': return 'bg-purple-600 text-white animate-pulse shadow-[0_0_15px_rgba(147,51,234,0.4)]';
            case 'Buy Limit': return 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]';
            case 'Sell Limit': return 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]';
            case 'Buy Stop': return 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]';
            case 'Sell Stop': return 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]';
            case 'Buy Stop Limit': return 'bg-teal-600 text-white shadow-[0_0_15px_rgba(13,148,136,0.4)]';
            case 'Sell Stop Limit': return 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]';
            default: return 'bg-gray-600 text-white shadow-[0_0_15px_rgba(75,85,99,0.4)]';
        }
    };

    return (
        <div className="text-sm max-w-full overflow-hidden relative">
            <header className="flex flex-wrap justify-between items-center mb-8 gap-4 opacity-0 animate-flip-3d" style={{ animationDelay: '50ms' }}>
                <div>
                    <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white break-words tracking-tighter drop-shadow-sm">{data.asset}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs sm:text-sm text-slate-800 dark:text-dark-text/70 font-mono font-black uppercase tracking-widest bg-gray-200/50 dark:bg-white/60 px-2 py-0.5 rounded border border-gray-300 dark:border-white/20">{data.timeframe}</span>
                        <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_theme(colors.green.400)]"></span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getEntryTypeColor(data.entryType)}`}>Protocol: {data.entryType}</span>
                    </div>
                </div>
                 <button
                    onClick={handleToggleSpeech}
                    className={`p-4 rounded-xl transition-all duration-300 shadow-xl border ${ttsState !== 'idle' ? 'bg-red-500 text-white animate-pulse border-red-400' : 'bg-gray-100 dark:bg-dark-card text-green-600 dark:text-green-400 border-gray-200 dark:border-white/10 hover:border-green-500/50 hover:scale-110 active:scale-95'}`}
                    aria-label="Read analysis aloud"
                >
                    {ttsState === 'idle' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                </button>
                <button
                    onClick={copyFullSignal}
                    className="p-4 rounded-xl bg-blue-600 text-white shadow-xl hover:bg-blue-500 transition-all hover:scale-110 active:scale-95 border border-blue-400/30"
                    aria-label="Copy signal to clipboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                </button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <InfoCard 
                    label="Signal" 
                    value={
                        data.signal === 'BUY' ? 'BUY on a buy setup' : 
                        data.signal === 'SELL' ? 'SELL on a sell setup' : 
                        'NEUTRAL (NO TRADE)'
                    } 
                    isSignal 
                    signalType={data.signal} 
                    className="col-span-2 md:col-span-1" 
                    delay="100ms" 
                />
                 <InfoCard label="Confluence Score" value={`${data.confidence}%`} subValue={confidenceDetails.label} subValueClassName={confidenceDetails.color} delay="200ms" />
                 {data.signal !== 'NEUTRAL' && (
                    <InfoCard label="Hard Stop" value={data.stopLoss} valueClassName="text-red-500 font-black" delay="300ms" />
                 )}
                 {data.signal === 'NEUTRAL' && (
                    <InfoCard label="Status" value="WAITING" valueClassName="text-yellow-500 font-black" subValue="No Confluence" delay="300ms" />
                 )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '500ms' }}>
                    <TiltCard>
                        <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 h-full flex flex-col items-center shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] group overflow-hidden relative">
                             <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30 group-hover:bg-blue-500 transition-colors"></div>
                             <span className="text-xs font-black text-gray-600 dark:text-dark-text/70 uppercase tracking-[0.2em] block text-center mb-6">
                                {data.signal === 'NEUTRAL' ? 'Levels to Watch' : 'Entry Cluster'}
                             </span>
                             <div className="flex flex-wrap justify-center items-center gap-4">
                                {data.entryPoints.slice(0, data.signal === 'NEUTRAL' ? 3 : 1).map((ep, i) => {
                                    const isRecommended = i === recommendedEntryIndex && data.signal !== 'NEUTRAL';
                                    return (
                                        <div key={i} className={`text-center bg-white/60 dark:bg-slate-900/40 backdrop-blur-md px-4 py-3 rounded-xl border min-w-[100px] shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] relative ${isRecommended ? 'border-green-500/50 shadow-green-500/20' : 'border-gray-200 dark:border-white/10'}`}>
                                            {isRecommended && (
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                                                    Recommended
                                                </div>
                                            )}
                                            <span className={`font-mono text-xl font-black block ${isRecommended ? 'text-green-400' : 'text-gray-800 dark:text-white'}`}>{ep}</span>
                                            <span className="block text-[10px] text-gray-600 uppercase font-black mt-1">
                                                {data.signal === 'NEUTRAL' ? 'LEVEL' : 'ENTRY'}
                                            </span>
                                        </div>
                                    );
                                })}
                             </div>
                             {data.entryType && data.signal !== 'NEUTRAL' && (
                                <div className={`mt-6 inline-flex items-center px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl border border-white/10 ${getEntryTypeBadgeColor(data.entryType)}`}>
                                    {data.entryType}
                                </div>
                             )}
                        </div>
                    </TiltCard>
                </div>
                {data.signal !== 'NEUTRAL' && (
                    <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '600ms' }}>
                        <TiltCard>
                            <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 h-full flex flex-col items-center shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] group overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30 group-hover:bg-green-500 transition-colors"></div>
                                <span className="text-xs font-black text-gray-600 dark:text-dark-text/70 uppercase tracking-[0.2em] block text-center mb-6">Liquidation Array</span>
                                <div className="flex flex-wrap justify-center items-center gap-4">
                                    {data.takeProfits.slice(0, 2).map((tp, i) => (
                                        <div key={i} className="text-center bg-white/60 dark:bg-slate-900/40 backdrop-blur-md px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 min-w-[100px] shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                            <span className="font-mono text-xl font-black text-green-600 dark:text-green-400 block">{tp}</span>
                                            <span className="block text-[10px] text-gray-600 uppercase font-black mt-1">TARGET 0{i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 text-[10px] font-black text-green-500/80 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Risk-Free Protocol: Move SL to BE at Target 01
                                </div>
                            </div>
                        </TiltCard>
                    </div>
                )}
                {data.signal === 'NEUTRAL' && (
                    <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '600ms' }}>
                        <TiltCard>
                            <div className="p-6 rounded-2xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 h-full flex flex-col items-center shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] group overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500/30 group-hover:bg-yellow-500 transition-colors"></div>
                                <span className="text-xs font-black text-gray-600 dark:text-dark-text/70 uppercase tracking-[0.2em] block text-center mb-6">Market Stance</span>
                                <div className="text-center p-4">
                                    <p className="text-sm italic text-slate-700 dark:text-gray-300">
                                        The market is currently in a neutral state. No high-probability trade setups are present. Oracle recommends staying flat and monitoring the levels to watch for a clear breakout or structure shift.
                                    </p>
                                </div>
                                <div className="mt-6 text-[10px] font-black text-yellow-500/80 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                    Protocol: Wait for Confluence
                                </div>
                            </div>
                        </TiltCard>
                    </div>
                )}
            </div>

            {/* INTEGRATED QUANT METRICS SECTION */}
            <Section title="Quant Execution Metrics" delay="1000ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}>
                <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] relative overflow-hidden font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                            <span className="text-sm font-bold text-red-500 uppercase">Risk Bound</span>
                            <span className="text-gray-800 dark:text-white font-bold">
                                {data.signal === 'NEUTRAL' ? 'N/A' : <>{slDisplay} <span className="text-[10px] text-gray-500 dark:text-gray-400">{unit}</span></>}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                            <span className="text-sm font-bold text-green-500 uppercase">Reward Bound</span>
                            <span className="text-gray-800 dark:text-white font-bold">
                                {data.signal === 'NEUTRAL' ? 'N/A' : <>{tp3Display} <span className="text-[10px] text-gray-500 dark:text-gray-400">{unit}</span></>}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                            <span className="text-sm font-bold text-blue-500 uppercase">Target Ratio</span>
                            <span className="text-gray-800 dark:text-white font-bold">
                                {data.signal === 'NEUTRAL' ? 'N/A' : (data.riskRewardRatio || "1:2")}
                            </span>
                        </div>

                        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                            <span className="text-sm font-bold text-purple-500 uppercase">Entry Style</span>
                            <span className="text-gray-800 dark:text-white font-bold">
                                {data.signal === 'NEUTRAL' ? 'Awaiting Setup' : data.entryType}
                            </span>
                        </div>
                        
                        {data.lotSize && data.lotSize > 0 && data.signal !== 'NEUTRAL' && (
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-cyan-500 uppercase">Total Lot Size</span>
                                <span className="font-bold text-cyan-500 dark:text-cyan-400">{data.formattedLotSize}</span>
                            </div>
                        )}

                        {data.recommendedPositions && data.recommendedPositions > 0 && data.positionLotSize && data.signal !== 'NEUTRAL' && (
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3 bg-cyan-500/5 px-2 rounded-lg">
                                <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase">Positions</span>
                                <div className="text-right">
                                    <span className="font-black text-cyan-600 dark:text-cyan-400 text-base block">{data.recommendedPositions}x @ {data.positionLotSize}</span>
                                </div>
                            </div>
                        )}
                        
                        {data.riskAmount && data.riskAmount > 0 && data.signal !== 'NEUTRAL' && (
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">Est. Risk</span>
                                <span className="font-bold text-red-500 dark:text-red-400">{formatCurrency(data.riskAmount)}</span>
                            </div>
                        )}
                        
                        {data.totalPotentialProfit && data.totalPotentialProfit > 0 && data.signal !== 'NEUTRAL' && (
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">Est. Potential</span>
                                <span className="font-bold text-green-500 dark:text-green-400">{formatCurrency(data.totalPotentialProfit)}</span>
                            </div>
                        )}

                        {data.possiblePips !== undefined && data.possiblePips > 0 && data.signal !== 'NEUTRAL' && (
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-orange-500 uppercase">Possible Pips</span>
                                <span className="font-bold text-orange-500 dark:text-orange-400">{data.possiblePips} pips</span>
                            </div>
                        )}

                        {data.winProbability !== undefined && data.winProbability > 0 && data.signal !== 'NEUTRAL' && (
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-pink-500 uppercase">Win Probability</span>
                                <span className="font-bold text-pink-500 dark:text-pink-400">{data.winProbability}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </Section>

            {/* TRIGGER CONDITIONS SECTION */}
            {data.triggerConditions && (
                <Section title="Trigger Conditions" delay="1150ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
                    <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
                        <div className="space-y-4">
                            {data.triggerConditions.breakoutLevel !== null && data.triggerConditions.breakoutLevel !== undefined && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase min-w-[150px]">Breakout Level</span>
                                    <span className="font-mono font-bold text-orange-500 dark:text-orange-400 text-lg">{data.triggerConditions.breakoutLevel}</span>
                                </div>
                            )}
                            {data.triggerConditions.retestLogic && (
                                <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase min-w-[150px] mt-1">Retest Logic</span>
                                    <span className="text-gray-800 dark:text-gray-200 font-medium">{data.triggerConditions.retestLogic}</span>
                                </div>
                            )}
                            {data.triggerConditions.entryTriggerCandle && (
                                <div className="flex flex-col sm:flex-row sm:items-start gap-2 pt-1">
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase min-w-[150px] mt-1">Entry Trigger Candle</span>
                                    <span className="text-gray-800 dark:text-gray-200 font-medium">{data.triggerConditions.entryTriggerCandle}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            {data.demandSupplyZones && data.demandSupplyZones.length > 0 && (
                <Section title="Demand/Supply Analysis" delay="1250ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}>
                    <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] font-mono">
                        <div className="mb-4">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-[0.2em]">Confirmation Pattern</span>
                            <div className="mt-2 p-3 bg-white/60 dark:bg-slate-900/40 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-bold text-green-500 dark:text-green-400">
                                {data.confirmationPattern}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {data.demandSupplyZones.map((zone, i) => (
                                <div key={i} className="flex justify-between items-center bg-white/60 dark:bg-slate-900/40 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                                    <span className={`font-black uppercase text-xs ${zone.type === 'demand' ? 'text-green-500' : 'text-red-500'}`}>{zone.type}</span>
                                    <span className="text-xs text-gray-800 dark:text-gray-200">{zone.priceRange.lower} - {zone.priceRange.upper}</span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${zone.confirmed ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                        {zone.confirmed ? 'Confirmed' : 'Unconfirmed'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>
            )}

            {data.confluenceMatrix && (
                <Section title="Algorithmic Confluence" delay="1100ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}>
                    <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] font-mono">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* FVG Status */}
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">FVG Detected</span>
                                <span className={`font-bold ${data.confluenceMatrix.fvg ? 'text-green-500' : 'text-gray-600'}`}>
                                    {data.confluenceMatrix.fvg ? `${data.confluenceMatrix.fvg.type.toUpperCase()} (${data.confluenceMatrix.fvg.lower} - ${data.confluenceMatrix.fvg.upper})` : 'NONE'}
                                </span>
                            </div>
                            
                            {/* FVG Retest */}
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">FVG Retest</span>
                                <span className={`font-bold ${data.confluenceMatrix.triggeredEntries.fvgRetest ? 'text-green-500' : 'text-red-500'}`}>
                                    {data.confluenceMatrix.triggeredEntries.fvgRetest ? 'CONFIRMED' : 'NO'}
                                </span>
                            </div>

                            {/* SD Long */}
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">SD Long Entry</span>
                                <span className={`font-bold ${data.confluenceMatrix.triggeredEntries.sdLong ? 'text-green-500' : 'text-gray-600'}`}>
                                    {data.confluenceMatrix.triggeredEntries.sdLong ? 'TRIGGERED' : 'WAITING'}
                                </span>
                            </div>

                            {/* SD Short */}
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase">SD Short Entry</span>
                                <span className={`font-bold ${data.confluenceMatrix.triggeredEntries.sdShort ? 'text-green-500' : 'text-gray-600'}`}>
                                    {data.confluenceMatrix.triggeredEntries.sdShort ? 'TRIGGERED' : 'WAITING'}
                                </span>
                            </div>

                            {/* Confluence Status */}
                            <div className="col-span-1 md:col-span-2 mt-4 p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 text-center shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                <span className="block text-xs font-bold text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-2">SD + FVG Confluence</span>
                                <span className={`text-xl font-black ${data.confluenceMatrix.triggeredEntries.sdPlusFVGConfluence ? 'text-green-500 dark:text-green-400 animate-pulse' : 'text-gray-700 dark:text-gray-600'}`}>
                                    {data.confluenceMatrix.triggeredEntries.sdPlusFVGConfluence ? '✅ CONFLUENCE VERIFIED' : '❌ NO CONFLUENCE'}
                                </span>
                            </div>

                            {/* Market Context */}
                            {data.confluenceMatrix.ltfExecutionBias && (
                                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div className="p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 text-center shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                        <span className="block text-[10px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-1">LTF Execution Bias</span>
                                        <span className={`text-lg font-black ${data.confluenceMatrix.ltfExecutionBias.toLowerCase() === 'bullish' ? 'text-green-500' : data.confluenceMatrix.ltfExecutionBias.toLowerCase() === 'bearish' ? 'text-red-500' : 'text-yellow-500'}`}>
                                            {data.confluenceMatrix.ltfExecutionBias.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 text-center shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                        <span className="block text-[10px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-1">Market Trend</span>
                                        <span className={`text-lg font-black ${data.confluenceMatrix.marketTrend?.toLowerCase() === 'bullish' ? 'text-green-500' : 'text-red-500'}`}>
                                            {data.confluenceMatrix.marketTrend?.toUpperCase() || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 text-center shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                        <span className="block text-[10px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-1">ATR Volatility</span>
                                        <span className={`text-lg font-black ${data.confluenceMatrix.atrVolatility?.toLowerCase() === 'high' ? 'text-green-500' : data.confluenceMatrix.atrVolatility?.toLowerCase() === 'choppy' ? 'text-red-500' : 'text-yellow-500'}`}>
                                            {data.confluenceMatrix.atrVolatility?.toUpperCase() || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Execution Checklist */}
                            {data.confluenceMatrix.executionChecklist && data.confluenceMatrix.executionChecklist.length > 0 && (
                                <div className="col-span-1 md:col-span-2 mt-4">
                                    <h4 className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Execution Checklist</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {data.confluenceMatrix.executionChecklist.map((item, i) => {
                                            const isPass = item.toLowerCase().includes('pass');
                                            const isFail = item.toLowerCase().includes('fail');
                                            return (
                                                <div key={i} className="flex items-center bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-2.5 rounded-lg border border-gray-200 dark:border-white/10 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                                    <span className={`mr-3 font-black ${isPass ? 'text-green-500' : isFail ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {isPass ? '✓' : isFail ? '✗' : '○'}
                                                    </span>
                                                    <span className="text-xs font-bold opacity-80">{item.replace(/\[(Pass|Fail)\]/i, '').trim()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Section>
            )}

            {data.marketStory && (
                <Section title="Market Story" delay="1050ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
                    <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                        <p className="text-sm text-slate-900 dark:text-gray-300 leading-relaxed font-medium italic">
                            "{data.marketStory}"
                        </p>
                    </div>
                </Section>
            )}

            {(data.institutionalDrivers?.length || 0) > 0 && (
                <Section title="Institutional Key Drivers" delay="1075ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.institutionalDrivers?.map((driver, i) => (
                            <div key={i} className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{driver.category}</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${driver.bias === 'Bullish' ? 'bg-green-500/20 text-green-500' : driver.bias === 'Bearish' ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                        {driver.bias}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-800 dark:text-gray-300 font-medium leading-relaxed">{driver.details}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {(data.fundamentalDrivers?.length || 0) > 0 && (
                <Section title="Fundamental Key Drivers" delay="1090ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2 2 2 0 012 2v.65a3 3 0 01-3 3H8a5 5 0 01-5-5v-2.5a3.5 3.5 0 013.5-3.5c.147 0 .294.006.44.018z" /></svg>}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.fundamentalDrivers?.map((driver, i) => (
                            <div key={i} className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-500">{driver.category}</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${driver.bias === 'Bullish' ? 'bg-green-500/20 text-green-500' : driver.bias === 'Bearish' ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                        {driver.bias}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-800 dark:text-gray-300 font-medium leading-relaxed">{driver.details}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '1100ms' }}>
                <div className="mt-8">
                    <h3 className="text-green-600 dark:text-green-400 font-bold uppercase tracking-widest flex items-center mb-6">
                        <span className="p-2 border border-green-500/30 rounded-lg mr-3 bg-green-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </span>
                        10-POINT REASONING LOGIC
                    </h3>
                    <div className="space-y-4">
                        {data.reasoning?.map((text, i) => (
                            <div key={i} className="flex p-5 rounded-2xl border border-gray-300 dark:border-white/10 bg-white/95 dark:bg-slate-900/40 backdrop-blur-xl relative overflow-hidden group hover:border-green-500/30 transition-all hover:bg-white/40 dark:hover:bg-slate-800/60 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                <span className="text-3xl font-mono font-bold text-green-600 dark:text-green-500 mr-6 opacity-80 flex-shrink-0">
                                    {(i + 1).toString().padStart(2, '0')}
                                </span>
                                <p className="text-slate-900 dark:text-gray-300 text-sm leading-relaxed font-medium pt-1.5">
                                    {text.replace(/^\d+\.\s*/, '')}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Section title="Critical Invalidation" delay="1300ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}>
                    <div className="bg-red-500/10 backdrop-blur-sm p-5 rounded-2xl border border-red-500/30 text-sm leading-relaxed italic font-bold text-red-600 dark:text-red-400 shadow-md">
                        "{data.invalidationScenario}"
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-red-500/80">Abandon Protocol Active</span>
                    </div>
                </Section>
                {data.counterArgumentRejection && (
                    <Section title="Counter-Argument Rejection" delay="1350ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
                        <div className="bg-orange-500/10 backdrop-blur-sm p-5 rounded-2xl border border-orange-500/30 text-sm leading-relaxed font-medium text-orange-700 dark:text-orange-300 shadow-md">
                            <p className="italic">"Alternative scenario rejected: {data.counterArgumentRejection}"</p>
                        </div>
                    </Section>
                )}
            </div>


            {data.verificationProtocol && (
                <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '1400ms' }}>
                    <Section title="Verification Protocol" delay="1400ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <VerificationStepCard title="News & Session" step={data.verificationProtocol.newsAndSessionCheck} />
                            <VerificationStepCard title="Higher Timeframe" step={data.verificationProtocol.higherTimeframeCheck} />
                            <VerificationStepCard title="Liquidity Sweep" step={data.verificationProtocol.liquiditySweepCheck} />
                            <VerificationStepCard title="Risk/Reward" step={data.verificationProtocol.riskRewardCheck} />
                        </div>
                    </Section>
                </div>
            )}

            {(hasSentiment || hasEconomicEvents) && (
                 <div className={`grid grid-cols-1 ${hasSentiment && hasEconomicEvents ? 'md:grid-cols-2' : ''} gap-6 mt-4`}>
                    {hasSentiment && (
                         <Section title="HTF Macro Bias" delay="1400ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 22v-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/></svg>}>
                            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)] h-full flex flex-col justify-center">
                                <SentimentGauge score={data.sentiment!.score} summary={data.sentiment!.summary} />
                            </div>
                         </Section>
                    )}
                     {hasEconomicEvents && (
                        <Section title="Market Catalysts" delay="1500ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}>
                            <div className="space-y-3">
                                {data.economicEvents!.map((event, i) => <EventCard key={i} event={event} />)}
                            </div>
                        </Section>
                     )}
                </div>
            )}

            {Array.isArray(data.sources) && data.sources.length > 0 && (
                 <Section title="Intelligence Sources" delay="1600ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.937 7.937 0 0112 4c1.232 0 2.403.28 3.444.782l1.556-1.556a1 1 0 011.414 1.414l-1.556 1.556c.496 1.056.782 2.227.782 3.444 0 1.241-.3 2.413-.834 3.443L19.293 17.707a1 1 0 01-1.414 1.414l-3.483-3.484A7.935 7.935 0 0112 16a7.937 7.937 0 01-3-4.804l-1.556 1.556a1 1 0 01-1.414-1.414l1.556-1.556A7.935 7.935 0 014 12a7.937 7.937 0 013-4.804L5.444 5.64a1 1 0 011.414-1.414l1.556 1.556C9.403 5.084 10.574 4.804 12 4.804z" /></svg>}>
                    <ul className="space-y-3">
                        {data.twelveDataQuote && (
                            <li className="flex items-start bg-green-500/10 dark:bg-green-500/5 backdrop-blur-xl p-4 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-all group overflow-hidden shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                <span className="mr-4 text-green-600 dark:text-green-500 flex-shrink-0 font-mono font-black">[LIVE]</span>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-green-600 dark:text-green-400 text-xs sm:text-sm font-bold tracking-tight mb-1">
                                        Twelve Data Real-time Quote
                                    </div>
                                    <div className="text-[10px] text-green-700 dark:text-green-500 font-mono">
                                        Price: {data.twelveDataQuote.close || data.twelveDataQuote.price} | {data.twelveDataQuote.percent_change}% Change
                                    </div>
                                    <div className="text-[10px] text-green-700/70 dark:text-green-500/70 font-mono mt-1">
                                        RSI: {data.twelveDataQuote.rsi} | SMA: {data.twelveDataQuote.sma} ({data.twelveDataQuote.interval})
                                    </div>
                                </div>
                            </li>
                        )}
                        {data.sources.map((source, i) => (
                            <li key={i} className="flex items-start bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-500/50 transition-all group overflow-hidden shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.3)]">
                                <span className="mr-4 text-gray-600 dark:text-gray-500 flex-shrink-0 font-mono font-black">[{i+1}]</span>
                                <div className="flex-1 overflow-hidden">
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 group-hover:text-blue-400 dark:group-hover:text-blue-300 truncate block text-xs sm:text-sm font-bold tracking-tight mb-1">
                                        {source.title || "External Source"}
                                    </a>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-600 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 truncate block font-mono">
                                        {source.uri}
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                 </Section>
            )}
        </div>
    );
};
