
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PredictedEvent } from '../types';
import { ErrorMessage } from './ErrorMessage';
import { ThemeToggleButton } from './ThemeToggleButton';

type ActiveTab = 'now' | 'today' | 'future';

interface PredictorPageProps {
    onBack: () => void;
    onLogout: () => void;
    events: PredictedEvent[];
    isLoading: boolean;
    error: string | null;
    onFetchPredictions: () => void;
}

const DateTimeDisplay: React.FC<{ startDate: Date; durationHours: number }> = ({ startDate, durationHours }) => {
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

    const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

    const dateStr = new Intl.DateTimeFormat('en-GB', dateOptions).format(startDate);
    const startTimeStr = new Intl.DateTimeFormat('en-US', timeOptions).format(startDate);
    const endTimeStr = new Intl.DateTimeFormat('en-US', timeOptions).format(endDate);

    const now = new Date();
    const isHappeningNow = now >= startDate && now <= endDate;

    if (isHappeningNow) {
        return (
            <p className="text-sm font-semibold text-center text-red-400 animate-pulse">
                EVENT IN PROGRESS (Ends {endTimeStr})
            </p>
        );
    }
    
    return (
        <p className="text-xs text-dark-text/70 text-center">
            {dateStr}, Start: {startTimeStr} End: {endTimeStr}
        </p>
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
    const startDate = new Date(event.date);

    return (
        <div 
            className="bg-dark-bg/40 p-5 rounded-xl border border-green-500/20 shadow-lg space-y-4 animate-fade-in h-full flex flex-col"
            style={{ animationDelay }}
        >
            <div className="text-center border-b border-green-500/20 pb-3 space-y-2">
                <h3 className="font-bold text-lg text-green-400 break-words">{event.name}</h3>
                <DateTimeDisplay startDate={startDate} durationHours={event.eventDurationHours} />
            </div>

            <div className="flex-grow">
                <span className="text-xs text-dark-text/60 uppercase text-center block mb-2">Affected Assets</span>
                <div className="flex flex-wrap justify-center gap-2">
                    {event.affectedAsset.split(',').map(asset => (
                        <span key={asset.trim()} className="px-2 py-1 bg-green-500/20 text-green-300 text-sm font-mono rounded-md shadow-sm whitespace-nowrap">
                            {asset.trim()}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex justify-around items-center pt-2">
                <div className={`flex flex-col items-center justify-center text-3xl sm:text-4xl font-extrabold ${isBuy ? 'animate-glowing-text-green' : 'animate-glowing-text-red'}`}>
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

export const PredictorPage: React.FC<PredictorPageProps> = ({ onBack, onLogout, events, isLoading, error, onFetchPredictions }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('now');

    const { eventsNow, eventsToday, eventsFuture } = useMemo(() => {
        const now = new Date();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(todayStart.getDate() + 1);

        const nowList: PredictedEvent[] = [];
        const todayList: PredictedEvent[] = [];
        const futureList: PredictedEvent[] = [];

        events.forEach(event => {
            const startDate = new Date(event.date);
            if (isNaN(startDate.getTime())) return;

            const endDate = new Date(startDate.getTime() + event.eventDurationHours * 3600 * 1000);

            if (now >= startDate && now <= endDate) {
                nowList.push(event);
            } else if (startDate > now && startDate < tomorrowStart) {
                todayList.push(event);
            } else if (startDate >= tomorrowStart) {
                futureList.push(event);
            }
        });
        
        futureList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        todayList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return { eventsNow: nowList, eventsToday: todayList, eventsFuture: futureList };
    }, [events]);

    useEffect(() => {
        if (!isLoading && !error) {
            if (eventsNow.length > 0) setActiveTab('now');
            else if (eventsToday.length > 0) setActiveTab('today');
            else setActiveTab('future');
        }
    }, [isLoading, error, eventsNow.length, eventsToday.length]);

    const TabButton: React.FC<{ tab: ActiveTab; label: string; count: number }> = ({ tab, label, count }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-card focus:ring-green-500/80 whitespace-nowrap ${
                activeTab === tab
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-transparent text-dark-text-secondary hover:bg-dark-bg/80'
            }`}
        >
            {label} <span className={`ml-1.5 inline-block px-2 py-0.5 text-xs rounded-full ${activeTab === tab ? 'bg-white/20' : 'bg-dark-bg/90'}`}>{count}</span>
        </button>
    );

    const groupEventsByDate = (events: PredictedEvent[]) => {
        const groups: Record<string, PredictedEvent[]> = {};
        events.forEach(event => {
            const date = new Date(event.date);
            const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }
            groups[dateStr].push(event);
        });
        return groups;
    };

    const renderEventList = (list: PredictedEvent[], emptyMessage: string, emptySubMessage: string) => {
        if (list.length === 0) {
            return (
                <div className="text-center py-16 animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-green-400">{emptyMessage}</h3>
                    <p className="mt-1 text-sm text-dark-text-secondary">{emptySubMessage}</p>
                </div>
            );
        }

        // Grouped display for Future tab
        if (activeTab === 'future') {
             const grouped = groupEventsByDate(list);
             return (
                <div className="space-y-6 pb-4">
                    {Object.entries(grouped).map(([dateLabel, groupEvents], groupIndex) => (
                        <div key={dateLabel} className="animate-fade-in" style={{ animationDelay: `${groupIndex * 100}ms` }}>
                             <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-sm py-2 mb-3 border-b border-green-500/30">
                                <h3 className="text-lg font-bold text-green-400 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {dateLabel}
                                </h3>
                             </div>
                             <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {groupEvents.map((event, index) => (
                                    <li key={event.date + event.name + index}>
                                        <PredictionCard event={event} index={index} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
             );
        }

        return (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {list.map((event, index) => (
                    <li key={event.date + event.name}>
                        <PredictionCard event={event} index={index} />
                    </li>
                ))}
            </ul>
        );
    };

    const renderMainContent = () => {
        if (isLoading && events.length === 0) return <PredictorLoader />;
        if (error) return <div className="p-4"><ErrorMessage message={error} /></div>;
        if (events.length === 0 && !isLoading) {
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

        let contentToRender;
        switch(activeTab) {
            case 'now':
                contentToRender = renderEventList(eventsNow, "No Events In Progress", "Check back later or view upcoming events.");
                break;
            case 'today':
                contentToRender = renderEventList(eventsToday, "No More Events Scheduled Today", "Check the 'Tomorrow & Beyond' tab for future catalysts.");
                break;
            case 'future':
                contentToRender = renderEventList(eventsFuture, "No Future Events Found", "The calendar for the upcoming week is clear.");
                break;
            default:
                contentToRender = null;
        }

        return (
            <>
                <div className="flex overflow-x-auto space-x-2 p-1 bg-dark-bg/40 rounded-lg mb-4 no-scrollbar">
                    <TabButton tab="now" label="In Progress" count={eventsNow.length} />
                    <TabButton tab="today" label="Later Today" count={eventsToday.length} />
                    <TabButton tab="future" label="Tomorrow & Beyond" count={eventsFuture.length} />
                </div>
                {contentToRender}
            </>
        );
    };

    return (
         <div className="min-h-screen text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in overflow-hidden">
             <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex-grow flex flex-col">
                 <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-xl sm:text-2xl font-bold text-green-400 truncate">Catalyst Predictor</h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                        <button onClick={onLogout} className="text-green-400 hover:text-green-300 text-sm font-medium" aria-label="Logout">
                            Logout
                        </button>
                    </div>
                 </header>

                <main className="bg-dark-card/60 backdrop-blur-lg p-3 sm:p-6 rounded-2xl border border-green-500/20 shadow-2xl space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={onFetchPredictions}
                            disabled={isLoading}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-500 disabled:opacity-50 transition-colors"
                            aria-label="Scan for new catalysts"
                        >
                            {isLoading ? (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.898 2.186l-1.42.355a5.002 5.002 0 00-8.48-1.852l-1.332.333A1.01 1.01 0 014 5V3a1 1 0 01-1-1H2a1 1 0 01-1-1V1a1 1 0 011-1h2zm12 16a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.898-2.186l1.42-.355a5.002 5.002 0 008.48 1.852l1.332-.333A1.01 1.01 0 0116 15v2a1 1 0 011 1h1a1 1 0 01-1 1h-2z" clipRule="evenodd" /></svg>
                            )}
                            Scan
                        </button>
                    </div>
                    <div className="max-h-[65vh] overflow-y-auto pr-2">
                        {renderMainContent()}
                    </div>
                </main>
             </div>
        </div>
    );
};
