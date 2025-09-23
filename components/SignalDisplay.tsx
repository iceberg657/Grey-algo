import React from 'react';
import type { SignalData, EconomicEvent } from '../types';

interface InfoCardProps {
    label: string;
    value: React.ReactNode;
    className?: string;
    isSignal?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value, className, isSignal = false }) => (
    <div className={`flex flex-col items-center justify-center p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 ${className}`}>
        <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider">{label}</span>
        {isSignal ? (
            <span className={`mt-1 font-semibold text-2xl ${value === 'BUY' ? 'text-green-400 animate-glowing-text-green' : 'text-red-400 animate-glowing-text-red'}`}>
                {value}
            </span>
        ) : (
            <span className='text-lg font-mono text-gray-800 dark:text-dark-text mt-1 font-semibold'>
                {value}
            </span>
        )}
    </div>
);

const SentimentGauge: React.FC<{ score: number; summary: string }> = ({ score, summary }) => {
    const getSentiment = (s: number) => {
        if (s <= 35) return { label: 'Bearish', color: 'text-red-400', needleColor: 'dark:stroke-red-400 stroke-red-500' };
        if (s <= 65) return { label: 'Neutral', color: 'text-gray-400', needleColor: 'dark:stroke-gray-400 stroke-gray-500' };
        return { label: 'Bullish', color: 'text-green-400', needleColor: 'dark:stroke-green-400 stroke-green-500' };
    };

    const sentiment = getSentiment(score);
    const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

    return (
        <div className="pt-4">
            <h3 className="font-semibold mb-3 text-gray-800 dark:text-green-400 text-center text-lg border-b-2 border-transparent dark:border-green-500/50 pb-2">Market Sentiment</h3>
            <div className="p-4 bg-gray-200/30 dark:bg-dark-bg/40 rounded-lg text-center">
                <div className="relative w-48 h-24 mx-auto mb-2">
                    <svg viewBox="0 0 100 50" className="w-full h-full">
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" className="stop-red-500 dark:stop-red-400" />
                                <stop offset="50%" className="stop-gray-500 dark:stop-gray-400" />
                                <stop offset="100%" className="stop-green-500 dark:stop-green-400" />
                            </linearGradient>
                        </defs>
                        <path d="M 10 50 A 40 40 0 0 1 90 50" stroke="url(#gaugeGradient)" strokeWidth="8" fill="none" strokeLinecap="round" />
                        {/* Needle */}
                        <g transform={`rotate(${rotation} 50 50)`}>
                           <path d="M 50 50 L 50 15" className={`transition-transform duration-1000 ease-out ${sentiment.needleColor}`} strokeWidth="2" strokeLinecap="round" />
                           <circle cx="50" cy="50" r="3" className="dark:fill-green-400 fill-green-600" />
                        </g>
                    </svg>
                    <div className="absolute bottom-0 w-full text-center">
                        <p className={`text-xl font-bold ${sentiment.color}`}>{sentiment.label}</p>
                        <p className="text-xs text-gray-600 dark:text-dark-text/70">{score}/100</p>
                    </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-dark-text/90 italic">"{summary}"</p>
            </div>
        </div>
    );
};


const ImpactIcon: React.FC<{ impact: EconomicEvent['impact'] }> = ({ impact }) => {
    const styles = {
        High: 'text-red-400',
        Medium: 'text-yellow-400',
        Low: 'text-blue-400',
    };
    return (
         <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 flex-shrink-0 ${styles[impact]}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
        </svg>
    );
};

const EconomicEvents: React.FC<{ events: EconomicEvent[] }> = ({ events }) => {
    return (
        <div className="pt-4">
            <h3 className="font-semibold mb-3 text-gray-800 dark:text-green-400 text-center text-lg border-b-2 border-transparent dark:border-green-500/50 pb-2">Key Economic Events</h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-dark-text/90">
                {events.length > 0 ? events.map((event, index) => (
                    <li key={index} className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md flex items-center">
                       <ImpactIcon impact={event.impact} />
                       <div>
                         <p className="font-semibold">{event.name}</p>
                         <p className="text-xs text-gray-500 dark:text-dark-text/70">{new Date(event.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                       </div>
                    </li>
                )) : (
                    <li className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md text-center text-sm text-gray-500 dark:text-dark-text/70">
                        No high-impact events scheduled soon.
                    </li>
                )}
            </ul>
        </div>
    );
};


interface SignalDisplayProps {
    data: SignalData;
}

export const SignalDisplay: React.FC<SignalDisplayProps> = ({ data }) => {
    const isBuy = data.signal === 'BUY';

    return (
        <div className="w-full animate-fade-in space-y-6">
            <header className="text-center">
                 <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight animated-gradient-text animate-animated-gradient pb-2 mb-2">
                    {data.asset}
                </h2>
                 <p className="text-sm text-gray-500 dark:text-dark-text/70">{data.timeframe}</p>
            </header>

            <div className="grid grid-cols-2 gap-3 text-center">
                <InfoCard 
                    label="Signal" 
                    value={data.signal}
                    className={`border-2 ${isBuy ? 'border-green-500/50' : 'border-red-500/50'}`}
                    isSignal={true}
                />
                 <InfoCard 
                    label="Confidence" 
                    value={`${data.confidence}%`}
                 />
                 <InfoCard 
                    label="Entry" 
                    value={data.entry}
                 />
                 <InfoCard 
                    label="Stop Loss" 
                    value={<span className="text-red-500 dark:text-red-400">{data.stopLoss}</span>}
                 />
                 <div className="col-span-2 flex flex-col items-center justify-center p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50">
                     <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider">Take Profits</span>
                     <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-lg font-mono text-green-500 dark:text-green-400">
                        {data.takeProfits.map((tp, index) => (
                            <span key={index}>{tp}</span>
                        ))}
                     </div>
                 </div>
            </div>
            
            <div>
                <h3 className="font-semibold mb-3 text-gray-800 dark:text-green-400 text-center text-lg border-b-2 border-transparent dark:border-green-500/50 pb-2">Reasoning</h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-dark-text/90">
                    {data.reasoning.map((reason, index) => {
                        const emoji = reason.startsWith('✅') ? '✅' : reason.startsWith('❌') ? '❌' : '';
                        const text = reason.replace(/^(✅|❌)\s*/, '');
                        return (
                            <li key={index} className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md flex items-start">
                                <span className="w-5 text-left">{emoji}</span>
                                <span>{text}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>

            {data.sentiment && <SentimentGauge score={data.sentiment.score} summary={data.sentiment.summary} />}

            {data.economicEvents && <EconomicEvents events={data.economicEvents} />}

            {data.sources && data.sources.length > 0 && (
                <div className="pt-4 border-t border-gray-300 dark:border-green-500/50">
                    <h3 className="font-semibold mb-3 text-gray-800 dark:text-green-400 text-center text-lg border-b-2 border-transparent dark:border-green-500/50 pb-2">Sources</h3>
                    <ul className="space-y-2 text-sm">
                        {data.sources.map((source, index) => (
                            <li key={index} className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md">
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start text-green-600 dark:text-green-400 hover:underline"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <span>{source.title}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};