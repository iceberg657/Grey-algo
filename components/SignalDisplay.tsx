
import React, { useState, useEffect, useRef } from 'react';
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
}

const getSignalTextClasses = (signal: SignalData['signal']) => {
    switch(signal) {
        case 'BUY': return 'text-green-400 animate-glowing-text-green';
        case 'SELL': return 'text-red-400 animate-glowing-text-red';
        case 'NEUTRAL': return 'text-blue-400 dark:text-blue-300';
        default: return 'text-gray-800 dark:text-dark-text';
    }
};

const InfoCard: React.FC<InfoCardProps> = ({ label, value, className, isSignal = false, signalType, valueClassName, subValue, subValueClassName }) => (
    <TiltCard>
        <div className={`flex flex-col items-center justify-center p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 ${className} h-full min-h-[90px]`}>
            <span className="text-[10px] sm:text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider text-center">{label}</span>
            {isSignal ? (
                <span className={`mt-1 font-semibold text-xl sm:text-2xl ${getSignalTextClasses(signalType ?? 'NEUTRAL')}`}>
                    {value}
                </span>
            ) : (
                <span className={`text-base sm:text-lg font-mono mt-1 font-semibold text-center break-all ${valueClassName || 'text-gray-800 dark:text-dark-text'}`}>
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
);

const SentimentGauge: React.FC<{ score: number; summary: string }> = ({ score, summary }) => {
    const getTrendInfo = (s: number) => {
        if (s >= 85) return { label: 'Strong Bullish', color: 'text-green-500', bg: 'bg-green-500', icon: '🚀' };
        if (s >= 60) return { label: 'Bullish', color: 'text-green-400', bg: 'bg-green-400', icon: '↗️' };
        if (s <= 15) return { label: 'Strong Bearish', color: 'text-red-500', bg: 'bg-red-500', icon: '🔻' };
        if (s <= 40) return { label: 'Bearish', color: 'text-red-400', bg: 'bg-red-400', icon: '↘️' };
        return { label: 'Neutral', color: 'text-blue-400', bg: 'bg-blue-400', icon: '➡️' };
    };

    const trend = getTrendInfo(score);

    return (
        <div className="flex flex-col w-full p-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className={`text-2xl sm:text-3xl ${trend.color}`}>{trend.icon}</div>
                    <div>
                        <div className={`text-base sm:text-lg font-extrabold uppercase ${trend.color} leading-none`}>{trend.label}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider mt-1">Market Trend</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-xl sm:text-2xl font-bold ${trend.color} leading-none`}>{score}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase mt-1">Score</div>
                </div>
            </div>

            <div className="relative h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                <div 
                    className={`absolute top-0 left-0 h-full ${trend.bg} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono mb-4 opacity-70">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
            </div>

            <div className="bg-gray-100 dark:bg-black/20 p-3 rounded-lg border-l-2 border-gray-300 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed font-medium">
                    "{summary}"
                </p>
            </div>
        </div>
    );
};

const EventCard: React.FC<{ event: EconomicEvent }> = ({ event }) => {
    const impactColors = {
        High: 'bg-red-500/20 text-red-300 border-red-500/50',
        Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
        Low: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    };
    return (
        <div className={`p-3 rounded-lg border ${impactColors[event.impact]} flex justify-between items-center`}>
            <div>
                <p className="font-semibold text-xs sm:text-sm">{event.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(event.date).toLocaleString()}</p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/20 ml-2">{event.impact}</span>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="pt-4 mt-4 border-t border-gray-300 dark:border-green-500/30">
        <h3 className="flex items-center text-base font-semibold text-gray-800 dark:text-green-400 mb-3">
            {icon}
            <span className="ml-2">{title}</span>
        </h3>
        {children}
    </div>
);

export const SignalDisplay: React.FC<{ data: SignalData }> = ({ data }) => {
    const [ttsState, setTtsState] = useState<'idle' | 'waiting' | 'speaking'>('idle');
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            const { asset, signal, entryPoints, stopLoss, takeProfits, reasoning, checklist, invalidationScenario, sentiment, confidence, expectedDuration, entryType } = data;
            
            let probabilityLevel = "Low Probability";
            if (confidence >= 80) probabilityLevel = "High Probability, A plus setup";
            else if (confidence >= 65) probabilityLevel = "Medium Probability";

            let textToSpeak = `Analysis for ${asset}. Signal is ${signal}. Confidence is ${confidence} percent, classified as ${probabilityLevel}. Execution style is ${entryType || 'Standard'}. Expected duration is ${expectedDuration || 'not specified'}. The three entry points are ${entryPoints.join(', ')}. Stop loss is at ${stopLoss}. Take profits are at ${takeProfits.join(', ')}. Reasoning: ${reasoning.join(' ')}. Key Factors: ${checklist?.join('. ') ?? 'Not available'}. Invalidation Scenario: ${invalidationScenario ?? 'Not available'}. Sentiment score is ${sentiment?.score} percent.`;
            
            setTtsState('waiting');
            timeoutRef.current = setTimeout(async () => {
                try {
                    setTtsState('speaking');
                    await generateAndPlayAudio(textToSpeak.replace(/✅|❌|🔵/g, ''), () => setTtsState('idle'));
                } catch (error) {
                    setTtsState('idle');
                }
            }, 5000);
        }
    };

    const getEntryTypeBadge = () => {
        if (!data.entryType) return null;
        
        const type = data.entryType;
        let color = 'bg-gray-500 text-white';
        let label = type;
        let icon = null;

        if (type === 'Market Execution') {
            color = 'bg-blue-600 text-white animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]';
            label = 'MARKET EXECUTION (NOW)';
            icon = <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>;
        } else if (type === 'Pullback') {
            color = 'bg-orange-500 text-white border border-orange-400';
            label = 'WAIT FOR PULLBACK';
            icon = <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/></svg>;
        } else if (type === 'Breakout') {
            color = 'bg-purple-600 text-white';
            label = 'STOP ORDER (BREAKOUT)';
            icon = <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM5.88 6.63a1 1 0 10-1.42-1.42l1.06-1.06a1 1 0 101.42 1.42L5.88 6.63zM4 11a1 1 0 100-2H3a1 1 0 100 2h1zM9.503 15.52a1 1 0 101.42-1.42l-1.06-1.06a1 1 0 10-1.42 1.42l1.06 1.06zM14.5 11a1 1 0 100-2h-1a1 1 0 100 2h1zM12.83 5.5l1.06-1.06a1 1 0 00-1.42-1.42l-1.06 1.06a1 1 0 101.42 1.42z"/></svg>;
        }

        return (
            <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-md ${color}`}>
                {icon}
                {label}
            </div>
        );
    };

    const isBusy = ttsState !== 'idle';
    const confidenceDetails = data.confidence >= 80 
        ? { label: "High Probability", color: "text-green-400" } 
        : data.confidence >= 65 ? { label: "Medium Probability", color: "text-yellow-400" } 
        : { label: "Low Probability", color: "text-gray-400" };

    return (
        <div className="animate-fade-in text-sm max-w-full overflow-hidden">
            <header className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-dark-text break-words">{data.asset}</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-text/70">{data.timeframe} Timeframe</p>
                </div>
                 <button onClick={handleToggleSpeech} className="p-2.5 rounded-full bg-gray-200/80 dark:bg-dark-card/80 text-green-600 dark:text-green-400 hover:bg-gray-300 dark:hover:bg-dark-card transition-colors">
                    {isBusy ? <svg className="h-5 w-5 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg> : <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4.022 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356zM5.394 9.122a.5.5 0 00-.638.45l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.302-.262zM7.17 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208z"/><path fillRule="evenodd" d="M9.707 3.707a1 1 0 011.414 0l.443.443a1 1 0 010 1.414l-4.25 4.25a1 1 0 01-1.414 0L3.707 7.53a1 1 0 010-1.414l.443-.443a1 1 0 011.414 0l1.293 1.293L9.707 3.707zm5.553 3.53a.5.5 0 00-.45.638l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.49-.45zM13.829 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208zM15.978 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356z" clipRule="evenodd"/><path d="M11 12.333a1.5 1.5 0 01-3 0V7.5a1.5 1.5 0 013 0v4.833z"/></svg>}
                </button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                 <InfoCard label="Signal" value={data.signal} isSignal signalType={data.signal} className="col-span-2 md:col-span-1" />
                 <InfoCard label="Confidence" value={`${data.confidence}%`} subValue={confidenceDetails.label} subValueClassName={confidenceDetails.color} />
                 <InfoCard label="Stop Loss" value={data.stopLoss} valueClassName="text-red-500 dark:text-red-400" />
                 <InfoCard label="Duration" value={data.expectedDuration || "N/A"} valueClassName="text-blue-500 dark:text-blue-400 text-sm" subValue="Estimated" />
            </div>

            {data.expectedDuration && (
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg flex gap-3 animate-fade-in">
                    <div className="flex-shrink-0 mt-0.5 text-indigo-500 dark:text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">GreyAlpha Auto-Exit Protocol</h4>
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">If trade duration expires AND TP not hit &rarr; <span className="font-bold text-red-500 dark:text-red-400">close at market or BE</span>.</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 italic">No discretion. No emotion. No "just a little longer".</p>
                    </div>
                </div>
            )}

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                <TiltCard>
                    <div className="p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 h-full flex flex-col items-center">
                         <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider block text-center mb-2">Entry Points</span>
                         <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
                            {data.entryPoints.map((ep, i) => (
                                <div key={i} className="text-center bg-white/10 p-1.5 rounded-md">
                                    <span className="font-mono text-base sm:text-lg font-semibold text-gray-800 dark:text-dark-text">{ep}</span>
                                    <span className="block text-[10px] text-gray-500 dark:text-dark-text/60">Entry {i + 1}</span>
                                </div>
                            ))}
                         </div>
                         {getEntryTypeBadge()}
                    </div>
                </TiltCard>
                <TiltCard>
                    <div className="p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 h-full flex flex-col items-center justify-center">
                         <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider block text-center mb-2">Take Profit Targets</span>
                         <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6">
                            {data.takeProfits.map((tp, i) => (
                                <div key={i} className="text-center bg-white/10 p-1.5 rounded-md">
                                    <span className="font-mono text-base sm:text-lg font-semibold text-green-600 dark:text-green-400">{tp}</span>
                                    <span className="block text-[10px] text-gray-500 dark:text-dark-text/60">TP{i + 1}</span>
                                </div>
                            ))}
                         </div>
                    </div>
                </TiltCard>
            </div>

            <Section title="Reasoning" icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002 2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}>
                <ul className="space-y-2">
                    {data.reasoning.map((reason, i) => <li key={i} className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md text-sm border-l-4 border-green-500/50">{reason}</li>)}
                </ul>
            </Section>

            {data.checklist && data.invalidationScenario && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Section title="Key Factors" icon={<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}>
                        <ul className="space-y-1.5">
                            {data.checklist.map((item, i) => <li key={i} className="flex items-start text-xs sm:text-sm"><span className="text-green-500 mr-2 mt-0.5 flex-shrink-0">&#10003;</span><span>{item}</span></li>)}
                        </ul>
                    </Section>
                    <Section title="Invalidation" icon={<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}>
                        <p className="text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/20">{data.invalidationScenario}</p>
                    </Section>
                 </div>
            )}
        </div>
    );
};
