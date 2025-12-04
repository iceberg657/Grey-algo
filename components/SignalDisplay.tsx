
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
        <div className={`flex flex-col items-center justify-center p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 ${className} h-full`}>
            <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider">{label}</span>
            {isSignal ? (
                <span className={`mt-1 font-semibold text-2xl ${getSignalTextClasses(signalType ?? 'NEUTRAL')}`}>
                    {value}
                </span>
            ) : (
                <span className={`text-lg font-mono mt-1 font-semibold ${valueClassName || 'text-gray-800 dark:text-dark-text'}`}>
                    {value}
                </span>
            )}
            {subValue && (
                <span className={`text-[10px] font-bold uppercase mt-1 ${subValueClassName || 'text-gray-500'}`}>
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
        return { label: 'Sideways / Neutral', color: 'text-blue-400', bg: 'bg-blue-400', icon: '➡️' };
    };

    const trend = getTrendInfo(score);

    return (
        <div className="flex flex-col w-full p-2">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className={`text-3xl ${trend.color}`}>{trend.icon}</div>
                    <div>
                        <div className={`text-lg font-extrabold uppercase ${trend.color} leading-none`}>{trend.label}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider mt-1">Market Trend</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-bold ${trend.color} leading-none`}>{score}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase mt-1">Score</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                <div 
                    className={`absolute top-0 left-0 h-full ${trend.bg} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono mb-4 opacity-70">
                <span>Bearish (0)</span>
                <span>Neutral (50)</span>
                <span>Bullish (100)</span>
            </div>

            {/* Summary Box */}
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
        <div className={`p-3 rounded-lg border ${impactColors[event.impact]}`}>
            <p className="font-semibold text-sm">{event.name}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(event.date).toLocaleString()}</p>
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
        // Stop audio and clear timeout when component unmounts
        return () => {
            stopAudio();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    
    const handleToggleSpeech = async () => {
        if (ttsState === 'speaking') {
            stopAudio();
            setTtsState('idle');
        } else if (ttsState === 'waiting') {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setTtsState('idle');
        } else { // ttsState is 'idle'
            const { asset, signal, entryPoints, stopLoss, takeProfits, reasoning, checklist, invalidationScenario, sentiment, confidence, expectedDuration } = data;
            
            // Determine probability level for TTS
            let probabilityLevel = "Low Probability";
            if (confidence >= 80) probabilityLevel = "High Probability, A plus setup";
            else if (confidence >= 65) probabilityLevel = "Medium Probability";

            let textToSpeak = `
                Analysis for ${asset}.
                Signal is ${signal}.
            `;
            
            textToSpeak += `
                Confidence is ${confidence} percent, classified as ${probabilityLevel}.
                Expected duration is ${expectedDuration || 'not specified'}.
                The three entry points are ${entryPoints.join(', ')}.
                Stop loss is at ${stopLoss}.
                Take profits are at ${takeProfits.join(', ')}.
                Reasoning: ${reasoning.join(' ')}.
                Key Factors: ${checklist?.join('. ') ?? 'Not available'}.
                Invalidation Scenario: ${invalidationScenario ?? 'Not available'}.
                Sentiment score is ${sentiment?.score} percent. Summary: ${sentiment?.summary}.
            `;
            
            setTtsState('waiting');
            timeoutRef.current = setTimeout(async () => {
                try {
                    setTtsState('speaking');
                    await generateAndPlayAudio(textToSpeak.replace(/✅|❌|🔵/g, ''), () => {
                        setTtsState('idle');
                    });
                } catch (error) {
                    console.error("TTS Error:", error);
                    alert("Failed to generate audio. Please check the console for details.");
                    setTtsState('idle');
                }
            }, 5000);
        }
    };

    const isBusy = ttsState !== 'idle';
    
    // Determine classification display
    const getConfidenceDetails = (score: number) => {
        if (score >= 80) return { label: "High Probability", color: "text-green-400" };
        if (score >= 65) return { label: "Medium Probability", color: "text-yellow-400" };
        return { label: "Low Probability", color: "text-gray-400" };
    };
    
    const confidenceDetails = getConfidenceDetails(data.confidence);

    return (
        <div className="animate-fade-in text-sm">
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-text">{data.asset}</h2>
                    <p className="text-sm text-gray-500 dark:text-dark-text/70">{data.timeframe} Timeframe</p>
                </div>
                 <button
                    onClick={handleToggleSpeech}
                    disabled={!process.env.API_KEY}
                    className="p-2.5 rounded-full bg-gray-200/80 dark:bg-dark-card/80 text-green-600 dark:text-green-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={isBusy ? "Stop reading analysis" : "Read analysis aloud"}
                >
                    {isBusy ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4.022 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356zM5.394 9.122a.5.5 0 00-.638.45l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.302-.262zM7.17 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208z" /><path fillRule="evenodd" d="M9.707 3.707a1 1 0 011.414 0l.443.443a1 1 0 010 1.414l-4.25 4.25a1 1 0 01-1.414 0L3.707 7.53a1 1 0 010-1.414l.443-.443a1 1 0 011.414 0l1.293 1.293L9.707 3.707zm5.553 3.53a.5.5 0 00-.45.638l.216 1.082a.5.5 0 00.94-.188l-.216-1.082a.5.5 0 00-.49-.45zM13.829 8.356a.5.5 0 00-.687.396l.128.64a.5.5 0 00.94-.188l-.128-.64a.5.5 0 00-.253-.208zM15.978 10.155a.5.5 0 00-.544.544l.288 1.443a.5.5 0 00.94-.188l-.288-1.443a.5.5 0 00-.396-.356z" clipRule="evenodd" /><path d="M11 12.333a1.5 1.5 0 01-3 0V7.5a1.5 1.5 0 013 0v4.833z" /></svg>
                    )}
                </button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                 <InfoCard label="Signal" value={data.signal} isSignal signalType={data.signal} className="col-span-2 md:col-span-1" />
                 <InfoCard 
                    label="Confidence" 
                    value={`${data.confidence}%`} 
                    subValue={confidenceDetails.label}
                    subValueClassName={confidenceDetails.color}
                />
                 <InfoCard label="Stop Loss" value={data.stopLoss} valueClassName="text-red-500 dark:text-red-400" />
                 <InfoCard 
                    label="Duration" 
                    value={data.expectedDuration || "N/A"} 
                    valueClassName="text-blue-500 dark:text-blue-400 text-sm"
                    subValue="Estimated"
                 />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                <TiltCard>
                    <div className="p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 h-full">
                         <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider block text-center mb-2">Entry Points</span>
                         <div className="flex justify-center items-center gap-6">
                            {data.entryPoints.map((ep, i) => (
                                <div key={i} className="text-center">
                                    <span className="font-mono text-lg font-semibold text-gray-800 dark:text-dark-text">{ep}</span>
                                    <span className="block text-xs text-gray-500 dark:text-dark-text/60">Entry {i + 1}</span>
                                </div>
                            ))}
                         </div>
                    </div>
                </TiltCard>
                <TiltCard>
                    <div className="p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 h-full">
                         <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider block text-center mb-2">Take Profit Targets</span>
                         <div className="flex justify-around items-center">
                            {data.takeProfits.map((tp, i) => (
                                <div key={i} className="text-center">
                                    <span className="font-mono text-lg font-semibold text-green-600 dark:text-green-400">{tp}</span>
                                    <span className="block text-xs text-gray-500 dark:text-dark-text/60">TP{i + 1}</span>
                                </div>
                            ))}
                         </div>
                    </div>
                </TiltCard>
            </div>

            <Section title="Reasoning" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002 2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}>
                <ul className="space-y-2">
                    {data.reasoning.map((reason, i) => <li key={i} className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md">{reason}</li>)}
                </ul>
            </Section>

            {data.checklist && data.invalidationScenario && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Section title="Key Factors Checklist" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}>
                        <ul className="space-y-1.5">
                            {data.checklist.map((item, i) => <li key={i} className="flex items-start"><span className="text-green-500 mr-2 mt-1">&#10003;</span><span>{item}</span></li>)}
                        </ul>
                    </Section>
                    <Section title="Invalidation Scenario" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}>
                        <p>{data.invalidationScenario}</p>
                    </Section>
                 </div>
            )}
            
            {(data.sentiment || (data.economicEvents && data.economicEvents.length > 0)) && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.sentiment && (
                         <Section title="Market Sentiment" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>}>
                            <SentimentGauge score={data.sentiment.score} summary={data.sentiment.summary} />
                         </Section>
                    )}
                     {data.economicEvents && data.economicEvents.length > 0 && (
                        <Section title="Upcoming Events" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}>
                            <div className="space-y-2">
                                {data.economicEvents.map((event, i) => <EventCard key={i} event={event} />)}
                            </div>
                        </Section>
                     )}
                </div>
            )}

            {data.sources && data.sources.length > 0 && (
                 <Section title="Sources" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>}>
                    <ul className="space-y-1">
                        {data.sources.map((source, i) => (
                            <li key={i} className="flex items-start overflow-hidden">
                                <span className="mr-2 text-gray-500">•</span>
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block flex-1">{source.title}</a>
                            </li>
                        ))}
                    </ul>
                 </Section>
            )}
        </div>
    );
};
