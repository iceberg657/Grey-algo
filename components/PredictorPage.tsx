

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PredictedEvent } from '../types';
import { getPredictedEvents } from '../services/predictorService';
import { ErrorMessage } from './ErrorMessage';

interface PredictorPageProps {
    onBack: () => void;
    onLogout: () => void;
}

// FIX: Add a type for the countdown object to fix type inference issues downstream.
// This ensures that `timeLeft` is not inferred as `{}`, which causes `Object.entries`
// to return a value of type `unknown`.
interface TimeLeft {
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
}

const useCountdown = (targetDate: string) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft: TimeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    // FIX: Explicitly type the useState hook with `TimeLeft`. This prevents TypeScript
    // from inferring the type as `{}` when `calculateTimeLeft` returns an empty
    // object, which would cause `Object.entries` to produce a value of type `unknown`.
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    return timeLeft;
};

const CountdownDisplay: React.FC<{ targetDate: string }> = ({ targetDate }) => {
    const timeLeft = useCountdown(targetDate);

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
        // FIX: The `value` from `Object.entries` can be inferred as `unknown`. Using a `typeof`
        // check acts as a type guard, correctly narrowing `value` to type `number` and allowing
        // the comparison to proceed without a type error.
        if (typeof value !== 'number' || value < 0) return null;
        return (
            <div key={interval} className="flex flex-col items-center">
                <span className="text-xl font-mono font-bold text-dark-text">{String(value).padStart(2, '0')}</span>
                <span className="text-xs uppercase text-dark-text/60">{interval}</span>
            </div>
        );
    });

    return (
        <div className="flex justify-center space-x-3">
            {Object.keys(timeLeft).length ? timerComponents : <span className="text-xl font-bold text-red-400">Event in Progress</span>}
        </div>
    );
};

const ConfidenceGauge: React.FC<{ value: number }> = ({ value }) => {
    const circumference = 2 * Math.PI * 45; // 2 * pi * r
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle cx="50" cy="50" r="45" className="stroke-current text-green-500/10" strokeWidth="10" fill="transparent" />
                {/* Progress circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="stroke-current text-green-400"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-300">{value}</span>
                <span className="text-xs text-green-300">%</span>
            </div>
        </div>
    );
};


const PredictionCard: React.FC<{ event: PredictedEvent, index: number }> = ({ event, index }) => {
    const isBuy = event.predictedDirection === 'BUY';
    const animationDelay = `${index * 100}ms`;

    return (
        <div 
            className="bg-dark-bg/40 p-5 rounded-xl border border-green-500/20 shadow-lg space-y-4 animate-fade-in"
            style={{ animationDelay }}
        >
            <div className="text-center border-b border-green-500/20 pb-3">
                <h3 className="font-bold text-lg text-green-400">{event.name}</h3>
                <p className="text-xs text-dark-text/70">{new Date(event.date).toLocaleString()}</p>
            </div>
            
            <CountdownDisplay targetDate={event.date} />

            <div>
                <span className="text-xs text-dark-text/60 uppercase text-center block mb-2">Affected Assets</span>
                <div className="flex flex-wrap justify-center gap-2">
                    {event.affectedAsset.split(',').map(asset => (
                        <span key={asset.trim()} className="px-2 py-1 bg-green-500/20 text-green-300 text-sm font-mono rounded-md shadow-sm">
                            {asset.trim()}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex justify-around items-center pt-2">
                <div className={`flex flex-col items-center justify-center text-4xl font-extrabold ${isBuy ? 'animate-glowing-text-green' : 'animate-glowing-text-red'}`}>
                    {event.predictedDirection}
                </div>
                <div className="flex flex-col items-center justify-center">
                     <span className="text-xs text-dark-text/60 uppercase mb-1">Confidence</span>
                     <ConfidenceGauge value={event.confidence} />
                </div>
            </div>
            
            <div className="pt-4 text-center border-t border-green-500/20">
                 <p className="text-sm text-dark-text/90 italic">"{event.reasoning}"</p>
            </div>
        </div>
    );
};

const PredictorLoader: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-center p-4 h-full">
        <svg width="120" height="120" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2"/>
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="141.37" strokeDashoffset="141.37" filter="url(#glow)">
                <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" from="282.74" to="0" dur="2s" repeatCount="indefinite"/>
            </circle>
            <text x="50" y="55" textAnchor="middle" fill="#6ee7b7" fontSize="16" fontWeight="bold">AI</text>
        </svg>
        <p className="mt-6 text-lg font-semibold text-dark-text">Scanning for Market Catalysts...</p>
        <p className="text-sm text-dark-text/70 animate-fade-in">Oracle is analyzing the future...</p>
    </div>
);

export const PredictorPage: React.FC<PredictorPageProps> = ({ onBack, onLogout }) => {
    const [events, setEvents] = useState<PredictedEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPredictions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedEvents = await getPredictedEvents();
            setEvents(fetchedEvents);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch predictions.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPredictions();
    }, [fetchPredictions]);

    const renderContent = () => {
        if (isLoading) {
            return <PredictorLoader />;
        }
        if (error) {
            return (
                 <div className="p-4"><ErrorMessage message={error} /></div>
            );
        }
        if (events.length === 0) {
            return (
                <div className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-green-400">No High-Impact Events Found</h3>
                    <p className="mt-1 text-sm text-dark-text-secondary">No predictable catalysts were found in the near future.</p>
                </div>
            );
        }
        return (
            <ul className="space-y-4">
                {events.map((event, index) => (
                    <li key={event.date + event.name}>
                        <PredictionCard event={event} index={index} />
                    </li>
                ))}
            </ul>
        );
    };

    return (
         <div className="min-h-screen text-dark-text font-sans p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300 animate-fade-in">
             <div className="w-full max-w-2xl mx-auto">
                 <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-2xl font-bold text-green-400">Market Catalyst Predictor</h1>
                    <button onClick={onLogout} className="text-green-400 hover:text-green-300 text-sm font-medium" aria-label="Logout">
                        Logout
                    </button>
                 </header>

                <main className="bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-green-500/20 shadow-2xl space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={fetchPredictions}
                            disabled={isLoading}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-500 disabled:opacity-50 transition-colors"
                            aria-label="Scan for new catalysts"
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.898 2.186l-1.42.355a5.002 5.002 0 00-8.48-1.852l-1.332.333A1.01 1.01 0 014 5V3a1 1 0 01-1-1H2a1 1 0 01-1-1V1a1 1 0 011-1h2zm12 16a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.898-2.186l1.42-.355a5.002 5.002 0 008.48 1.852l1.332-.333A1.01 1.01 0 0116 15v2a1 1 0 011 1h1a1 1 0 011 1v1a1 1 0 01-1 1h-2z" clipRule="evenodd" /></svg>
                            )}
                            Scan for Catalysts
                        </button>
                    </div>
                    <div className="max-h-[65vh] overflow-y-auto pr-2">
                        {renderContent()}
                    </div>
                </main>
             </div>
        </div>
    );
};