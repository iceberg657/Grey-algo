
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
        case 'NEUTRAL': return 'text-blue-400 dark:text-blue-300';
        default: return 'text-gray-800 dark:text-dark-text';
    }
};

const InfoCard: React.FC<InfoCardProps> = ({ label, value, className, isSignal = false, signalType, valueClassName, subValue, subValueClassName, delay = '0ms' }) => (
    <div className="opacity-0 animate-flip-3d" style={{ animationDelay: delay }}>
        <TiltCard>
            <div className={`flex flex-col items-center justify-center p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 border border-white/5 hover:border-green-500/30 transition-all transform hover:scale-[1.03] shadow-lg ${className} h-full min-h-[90px]`}>
                <span className="text-[10px] sm:text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider text-center font-bold">{label}</span>
                {isSignal ? (
                    <span className={`mt-1 font-black text-2xl sm:text-3xl ${getSignalTextClasses(signalType ?? 'NEUTRAL')}`}>
                        {value}
                    </span>
                ) : (
                    <span className={`text-base sm:text-lg font-mono mt-1 font-bold text-center break-all ${valueClassName || 'text-gray-800 dark:text-dark-text'}`}>
                        {value}
                    </span>
                )}
                {subValue && (
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1 text-center ${subValueClassName || 'text-gray-500'}`}>
                        {subValue}
                    </span>
                )}
            </div>
        </TiltCard>
    </div>
);

const SentimentGauge: React.FC<{ score: number; summary: string }> = ({ score, summary }) => {
    const trend = useMemo(() => {
        if (score >= 85) return { label: 'Strong Bullish', color: 'text-green-500', bg: 'bg-green-500', icon: '🚀' };
        if (score >= 60) return { label: 'Bullish', color: 'text-green-400', bg: 'bg-green-400', icon: '↗️' };
        if (score <= 15) return { label: 'Strong Bearish', color: 'text-red-500', bg: 'bg-red-500', icon: '🔻' };
        if (score <= 40) return { label: 'Bearish', color: 'text-red-400', bg: 'bg-red-400', icon: '↘️' };
        return { label: 'Neutral', color: 'text-blue-400', bg: 'bg-blue-400', icon: '➡️' };
    }, [score]);

    return (
        <div className="flex flex-col w-full p-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className={`text-2xl sm:text-3xl ${trend.color}`}>{trend.icon}</div>
                    <div>
                        <div className={`text-base sm:text-lg font-extrabold uppercase ${trend.color} leading-none`}>{trend.label}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider mt-1 font-bold">Structural Sentiment</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-xl sm:text-2xl font-bold ${trend.color} leading-none font-mono`}>{score}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase mt-1">AI Score</div>
                </div>
            </div>

            <div className="relative h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mb-1 shadow-inner">
                <div 
                    className={`absolute top-0 left-0 h-full ${trend.bg} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono mb-4 opacity-70 font-bold uppercase tracking-widest">
                <span>Bearish (10-40)</span>
                <span>Neutral</span>
                <span>Bullish (60-100)</span>
            </div>

            <div className="bg-gray-100 dark:bg-black/20 p-3 rounded-lg border-l-4 border-gray-400 dark:border-gray-600 shadow-sm">
                <p className="text-xs text-gray-600 dark:text-dark-text italic leading-relaxed font-medium">
                    "{summary}"
                </p>
            </div>
        </div>
    );
};

const EventCard: React.FC<{ event: EconomicEvent }> = ({ event }) => {
    const impact = event.impact.toLowerCase();
    const impactColor = impact.includes('high') 
        ? 'bg-red-500/20 text-red-300 border-red-500/50' 
        : impact.includes('medium') 
            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' 
            : 'bg-blue-500/20 text-blue-300 border-blue-500/50';

    return (
        <div className={`p-3 rounded-lg border ${impactColor} flex justify-between items-center shadow-md animate-fade-in`}>
            <div>
                <p className="font-bold text-xs sm:text-sm tracking-tight">{event.name}</p>
                <p className="text-[10px] opacity-70 mt-0.5 font-mono">{new Date(event.date).toLocaleString()}</p>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-black/30 border border-white/10 ml-2">{event.impact}</span>
        </div>
    );
};

export const Section: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode; delay?: string }> = ({ title, children, icon, delay = '0ms' }) => (
    <div className="pt-4 mt-4 border-t border-gray-300 dark:border-white/5 opacity-0 animate-flip-3d" style={{ animationDelay: delay }}>
        <h3 className="flex items-center text-base font-black text-gray-800 dark:text-green-400 mb-4 uppercase tracking-tighter">
            <span className="p-1.5 rounded-lg bg-green-500/10 mr-2 border border-green-500/20">
                {icon}
            </span>
            {title}
        </h3>
        {children}
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
    const recommendedEntryIndex = data.entryType === 'Limit Order' ? 0 : 1; 
    
    // Use pre-calculated data from SignalData if available (from tradeSetup.ts)
    const entry = data.entryPoints[recommendedEntryIndex] || data.entryPoints[0] || 0;
    const sl = data.stopLoss || 0;
    const tp3 = data.takeProfits[2] || data.takeProfits[0] || 0;
    
    const diffSL = Math.abs(entry - sl);
    const diffTP3 = Math.abs(tp3 - entry);
    
    const slDisplay = (diffSL * scalar).toFixed(precision);
    const tp3Display = (diffTP3 * scalar).toFixed(precision);
    
    const formatCurrency = (val?: number) => val != null ? `$${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00';

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
            const { asset, signal, stopLoss, takeProfits, reasoning, confidence, entryType, expectedDuration } = data;
            let textToSpeak = `Blueprint for ${asset}. Operational bias ${signal}. `;
            textToSpeak += `Strategic confidence ${confidence} percent. Execution protocol ${entryType}. Stop loss ${stopLoss}. Primary target ${takeProfits[0]}. Reasoning: ${reasoning[0]}`;
            setTtsState('waiting');
            timeoutRef.current = setTimeout(async () => {
                try {
                    setTtsState('speaking');
                    await generateAndPlayAudio(textToSpeak.replace(/✅|❌|🔵/g, ''), () => setTtsState('idle'));
                } catch { setTtsState('idle'); }
            }, 5000);
        }
    };

    const confidenceDetails = data.confidence >= 80 
        ? { label: "High Probability", color: "text-green-400" } 
        : { label: "Medium Probability", color: "text-yellow-400" };

    const hasEconomicEvents = Array.isArray(data.economicEvents) && data.economicEvents.length > 0;
    const hasSentiment = !!data.sentiment;

    return (
        <div className="text-sm max-w-full overflow-hidden relative">
            <header className="flex flex-wrap justify-between items-center mb-8 gap-4 opacity-0 animate-flip-3d" style={{ animationDelay: '50ms' }}>
                <div>
                    <h2 className="text-4xl sm:text-5xl font-black text-gray-800 dark:text-white break-words tracking-tighter drop-shadow-sm">{data.asset}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-dark-text/70 font-mono font-black uppercase tracking-widest bg-gray-200/50 dark:bg-white/5 px-2 py-0.5 rounded border border-white/5">{data.timeframe}</span>
                        <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_theme(colors.green.400)]"></span>
                        <span className="text-[10px] text-gray-400 font-mono bg-black/10 dark:bg-black/30 px-2 py-0.5 rounded uppercase">Protocol: {data.entryType}</span>
                    </div>
                </div>
                 <button
                    onClick={handleToggleSpeech}
                    disabled={!process.env.API_KEY}
                    className={`p-4 rounded-xl transition-all duration-300 shadow-xl border ${ttsState !== 'idle' ? 'bg-red-500 text-white animate-pulse border-red-400' : 'bg-gray-100 dark:bg-dark-card text-green-600 dark:text-green-400 border-white/10 hover:border-green-500/50 hover:scale-110 active:scale-95'}`}
                    aria-label="Read analysis aloud"
                >
                    {ttsState === 'idle' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                </button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <InfoCard label="Bias" value={data.signal} isSignal signalType={data.signal} className="col-span-2 md:col-span-1" delay="100ms" />
                 <InfoCard label="Precision" value={`${data.confidence}%`} subValue={confidenceDetails.label} subValueClassName={confidenceDetails.color} delay="200ms" />
                 <InfoCard label="Hard Stop" value={data.stopLoss} valueClassName="text-red-500 font-black" delay="300ms" />
                 <InfoCard label="Trade Horizon" value={data.expectedDuration} valueClassName="text-blue-500 dark:text-blue-400" subValue="Estimated Hold" delay="400ms" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '500ms' }}>
                    <TiltCard>
                        <div className="p-6 rounded-2xl bg-gray-200/50 dark:bg-dark-bg/60 border-2 border-white/5 h-full flex flex-col items-center shadow-inner group overflow-hidden relative">
                             <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30 group-hover:bg-blue-500 transition-colors"></div>
                             <span className="text-xs font-black text-gray-500 dark:text-dark-text/70 uppercase tracking-[0.2em] block text-center mb-6">Entry Cluster</span>
                             <div className="flex flex-wrap justify-center items-center gap-4">
                                {data.entryPoints.map((ep, i) => {
                                    const isRecommended = i === recommendedEntryIndex;
                                    return (
                                        <div key={i} className={`text-center bg-black/10 dark:bg-black/40 px-4 py-3 rounded-xl border min-w-[100px] shadow-lg relative ${isRecommended ? 'border-green-500/50 shadow-green-500/20' : 'border-white/5'}`}>
                                            {isRecommended && (
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                                                    Recommended
                                                </div>
                                            )}
                                            <span className={`font-mono text-xl font-black block ${isRecommended ? 'text-green-400' : 'text-gray-800 dark:text-white'}`}>{ep}</span>
                                            <span className="block text-[10px] text-gray-500 uppercase font-black mt-1">{i === 0 ? 'AGGRESSIVE' : i === 1 ? 'OPTIMAL' : 'SAFE'}</span>
                                        </div>
                                    );
                                })}
                             </div>
                             {data.entryType && (
                                <div className={`mt-6 inline-flex items-center px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl border border-white/10 ${data.entryType === 'Market Execution' ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`}>
                                    {data.entryType}
                                </div>
                             )}
                        </div>
                    </TiltCard>
                </div>
                <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '600ms' }}>
                    <TiltCard>
                        <div className="p-6 rounded-2xl bg-gray-200/50 dark:bg-dark-bg/60 border-2 border-white/5 h-full flex flex-col items-center shadow-inner group overflow-hidden relative">
                             <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30 group-hover:bg-green-500 transition-colors"></div>
                             <span className="text-xs font-black text-gray-500 dark:text-dark-text/70 uppercase tracking-[0.2em] block text-center mb-6">Liquidation Array</span>
                             <div className="flex flex-wrap justify-center items-center gap-4">
                                {data.takeProfits.map((tp, i) => (
                                    <div key={i} className="text-center bg-black/10 dark:bg-black/40 px-4 py-3 rounded-xl border border-white/5 min-w-[100px] shadow-lg">
                                        <span className="font-mono text-xl font-black text-green-600 dark:text-green-400 block">{tp}</span>
                                        <span className="block text-[10px] text-gray-500 uppercase font-black mt-1">TARGET 0{i + 1}</span>
                                    </div>
                                ))}
                             </div>
                             <div className="mt-6 text-[10px] font-black text-green-500/80 uppercase tracking-widest flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                 Secure partials at TP1
                             </div>
                        </div>
                    </TiltCard>
                </div>
            </div>

            {/* INTEGRATED QUANT METRICS SECTION */}
            <Section title="Quant Execution Metrics" delay="1000ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}>
                <div className="bg-gray-100 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-white/5 p-6 shadow-xl relative overflow-hidden font-mono">
                    <div className="grid grid-cols-1 gap-6">
                        
                        {/* Tactical Array (Full Width since Position Sizing is removed) */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Tactical Array</h4>
                            
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-red-500 uppercase">Risk Bound</span>
                                <span className="text-gray-800 dark:text-white font-bold">{slDisplay} <span className="text-[10px] text-gray-400">{unit}</span></span>
                            </div>
                            
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-green-500 uppercase">Reward Bound</span>
                                <span className="text-gray-800 dark:text-white font-bold">{tp3Display} <span className="text-[10px] text-gray-400">{unit}</span></span>
                            </div>
                            
                            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                <span className="text-sm font-bold text-blue-500 uppercase">Target Ratio</span>
                                <span className="text-gray-800 dark:text-white font-bold">{data.riskRewardRatio || "1:2"}</span>
                            </div>
                            
                            {data.riskAmount > 0 && (
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Est. Risk</span>
                                    <span className="font-bold text-red-500 dark:text-red-400">{formatCurrency(data.riskAmount)}</span>
                                </div>
                            )}
                            
                            {data.totalPotentialProfit > 0 && (
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 py-3">
                                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Est. Potential</span>
                                    <span className="font-bold text-green-500 dark:text-green-400">{formatCurrency(data.totalPotentialProfit)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Section>

            <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '1100ms' }}>
                <div className="mt-8">
                    <h3 className="text-green-400 font-bold uppercase tracking-widest flex items-center mb-6">
                        <span className="p-2 border border-green-500/30 rounded-lg mr-3 bg-green-500/10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </span>
                        ANALYSIS LOGIC (MIN. 5 NODES)
                    </h3>
                    <div className="space-y-4">
                        {data.reasoning.map((text, i) => (
                            <div key={i} className="flex p-5 rounded-2xl border border-white/5 bg-gray-900/40 dark:bg-[#0f172a]/60 relative overflow-hidden group hover:border-green-500/30 transition-all hover:bg-black/40">
                                <span className="text-3xl font-mono font-bold text-green-500 mr-6 opacity-80 flex-shrink-0">
                                    {(i + 1).toString().padStart(2, '0')}
                                </span>
                                <p className="text-gray-300 text-sm leading-relaxed font-medium pt-1.5">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Section title="Confluence Matrix" delay="1200ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}>
                    <div className="space-y-2">
                        {data.checklist?.map((item, i) => (
                            <div key={i} className="flex items-center bg-green-500/5 p-3 rounded-lg border border-green-500/20 shadow-sm transition-all hover:bg-green-500/10">
                                <span className="text-green-500 mr-4 font-black">✓</span>
                                <span className="text-xs sm:text-sm font-bold opacity-80">{item}</span>
                            </div>
                        ))}
                    </div>
                </Section>
                <Section title="Critical Invalidation" delay="1300ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}>
                    <div className="bg-red-500/5 p-5 rounded-2xl border-2 border-red-500/20 text-sm leading-relaxed italic font-bold text-red-600 dark:text-red-400 shadow-inner">
                        "{data.invalidationScenario}"
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                         <span className="text-[10px] font-black uppercase tracking-widest text-red-500/80">Abandon Protocol Active</span>
                    </div>
                </Section>
            </div>

            {(hasSentiment || hasEconomicEvents) && (
                 <div className={`grid grid-cols-1 ${hasSentiment && hasEconomicEvents ? 'md:grid-cols-2' : ''} gap-6 mt-4`}>
                    {hasSentiment && (
                         <Section title="Structural Bias" delay="1400ms" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 22v-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/></svg>}>
                            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner h-full flex flex-col justify-center">
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
                        {data.sources.map((source, i) => (
                            <li key={i} className="flex items-start bg-black/20 p-4 rounded-xl border border-white/5 hover:border-blue-500/50 transition-all group overflow-hidden shadow-sm">
                                <span className="mr-4 text-gray-500 flex-shrink-0 font-mono font-black">[{i+1}]</span>
                                <div className="flex-1 overflow-hidden">
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 group-hover:text-blue-300 truncate block text-xs sm:text-sm font-bold tracking-tight mb-1">
                                        {source.title || "External Source"}
                                    </a>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-gray-400 truncate block font-mono">
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
