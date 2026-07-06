import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, AlertTriangle, Filter, Clock, TrendingUp, Info, Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';

interface EconomicEvent {
    id: string;
    dayOffset: number; // 0 = Today, 1 = Tomorrow, 2 = Next Day, 3 = Day after next
    time: string;
    currency: string;
    event: string;
    importance: 'HIGH' | 'MEDIUM' | 'LOW';
    previous: string;
    forecast: string;
    actual: string;
    notes: string;
}

export const UpcomingEventsPanel: React.FC = () => {
    const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
    const [selectedImpact, setSelectedImpact] = useState<string>('ALL');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    
    // Live Calendar State
    const [events, setEvents] = useState<EconomicEvent[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLive, setIsLive] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Generate date strings dynamically based on current client date
    const dateList = useMemo(() => {
        const list = [];
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        for (let i = 0; i < 4; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            let label = '';
            if (i === 0) label = 'Today';
            else if (i === 1) label = 'Tomorrow';
            else label = daysOfWeek[date.getDay()];

            list.push({
                offset: i,
                dayLabel: label,
                fullDate: `${daysOfWeek[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
            });
        }
        return list;
    }, []);

    // Highly comprehensive listing of major recurring economic indicator events
    const rawFallbackEvents: EconomicEvent[] = useMemo(() => {
        return [
            // Today (Day 0)
            {
                id: "evt-0-1",
                dayOffset: 0,
                time: "13:30",
                currency: "USD",
                event: "Core CPI (MoM / YoY)",
                importance: "HIGH",
                previous: "0.3% / 3.4%",
                forecast: "0.2% / 3.3%",
                actual: "Pending",
                notes: "Primary measure of consumer price inflation. Strongly impacts Federal Reserve interest rate policy and USD volatility."
            },
            {
                id: "evt-0-2",
                dayOffset: 0,
                time: "13:30",
                currency: "USD",
                event: "Unemployment Claims",
                importance: "MEDIUM",
                previous: "228K",
                forecast: "225K",
                actual: "Pending",
                notes: "Weekly measure of newly unemployed individuals filing for state benefits. Early indicator of labor market health."
            },
            {
                id: "evt-0-3",
                dayOffset: 0,
                time: "13:45",
                currency: "EUR",
                event: "ECB Interest Rate Decision",
                importance: "HIGH",
                previous: "4.00%",
                forecast: "3.75%",
                actual: "Pending",
                notes: "The Governing Council's benchmark refinancing rate. Dictates eurozone liquidity, bond yields, and EUR direction."
            },
            {
                id: "evt-0-4",
                dayOffset: 0,
                time: "14:30",
                currency: "EUR",
                event: "ECB Press Conference",
                importance: "HIGH",
                previous: "-",
                forecast: "-",
                actual: "Pending",
                notes: "ECB President Lagarde's live briefing. Crucial for understanding policy context, forward guidance, and inflation outlook."
            },
            {
                id: "evt-0-5",
                dayOffset: 0,
                time: "08:00",
                currency: "GBP",
                event: "GDP (MoM)",
                importance: "HIGH",
                previous: "0.2%",
                forecast: "0.1%",
                actual: "Pending",
                notes: "Broadest measure of national economic output. Essential benchmark for BOE monetary policy stance."
            },

            // Tomorrow (Day 1)
            {
                id: "evt-1-1",
                dayOffset: 1,
                time: "13:30",
                currency: "USD",
                event: "Non-Farm Employment Change (NFP)",
                importance: "HIGH",
                previous: "175K",
                forecast: "185K",
                actual: "Pending",
                notes: "Monthly measurement of jobs created outside farming. The single most volatile market event on Forex and Indices."
            },
            {
                id: "evt-1-2",
                dayOffset: 1,
                time: "13:30",
                currency: "USD",
                event: "Unemployment Rate",
                importance: "HIGH",
                previous: "3.9%",
                forecast: "3.9%",
                actual: "Pending",
                notes: "Percentage of total labor force actively seeking employment. Key variable in the dual mandate of the Fed."
            },
            {
                id: "evt-1-3",
                dayOffset: 1,
                time: "00:50",
                currency: "JPY",
                event: "BOJ Summary of Opinions",
                importance: "MEDIUM",
                previous: "-",
                forecast: "-",
                actual: "Pending",
                notes: "Detailed summary of Bank of Japan's rate setting consensus, offering clues on future yen normalization."
            },
            {
                id: "evt-1-4",
                dayOffset: 1,
                time: "13:30",
                currency: "CAD",
                event: "Employment Change & Unemployment Rate",
                importance: "HIGH",
                previous: "47K / 6.1%",
                forecast: "25K / 6.2%",
                actual: "Pending",
                notes: "Canadian labor market indicator. Heavily influences BOC policy cycles and CAD/USD crosses."
            },

            // Day 2
            {
                id: "evt-2-1",
                dayOffset: 2,
                time: "09:30",
                currency: "GBP",
                event: "Claimant Count Change",
                importance: "MEDIUM",
                previous: "8.9K",
                forecast: "10.2K",
                actual: "Pending",
                notes: "Unemployment benefit claims change. Essential labor parameter for Sterling."
            },
            {
                id: "evt-2-2",
                dayOffset: 2,
                time: "10:00",
                currency: "EUR",
                event: "ZEW Economic Sentiment",
                importance: "MEDIUM",
                previous: "47.0",
                forecast: "48.1",
                actual: "Pending",
                notes: "German institutional investor optimism index. Leading gauge of overall Eurozone growth health."
            },
            {
                id: "evt-2-3",
                dayOffset: 2,
                time: "13:30",
                currency: "USD",
                event: "Core Retail Sales (MoM)",
                importance: "HIGH",
                previous: "0.2%",
                forecast: "0.3%",
                actual: "Pending",
                notes: "Percentage change of total sales in retail outlets excluding automobiles. Measures consumer spending power."
            },

            // Day 3
            {
                id: "evt-3-1",
                dayOffset: 3,
                time: "01:30",
                currency: "AUD",
                event: "Employment Change & Unemployment Rate",
                importance: "HIGH",
                previous: "38K / 4.0%",
                forecast: "30K / 4.0%",
                actual: "Pending",
                notes: "Australian employment indicators. Directly dictates RBA hawkish/hawkish posture and Aussie cross-volatility."
            },
            {
                id: "evt-3-2",
                dayOffset: 3,
                time: "13:30",
                currency: "USD",
                event: "Core PPI (MoM)",
                importance: "MEDIUM",
                previous: "0.5%",
                forecast: "0.2%",
                actual: "Pending",
                notes: "Producer inflation. Leading indicator for CPI since raw material price increases push consumer price peaks."
            },
            {
                id: "evt-3-3",
                dayOffset: 3,
                time: "19:00",
                currency: "USD",
                event: "FOMC Economic Projections & Statement",
                importance: "HIGH",
                previous: "-",
                forecast: "-",
                actual: "Pending",
                notes: "Federal Open Market Committee statement outlining official interest rate decision and forward inflation expectations."
            }
        ];
    }, []);

    const fetchLiveCalendar = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setFetchError(null);
        try {
            const response = await fetch(`/api/economic-calendar?clientDate=${encodeURIComponent(new Date().toISOString())}`);
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            const resData = await response.json();
            if (resData.isLive && resData.data && resData.data.length > 0) {
                setEvents(resData.data);
                setIsLive(true);
            } else {
                setEvents(rawFallbackEvents);
                setIsLive(false);
            }
        } catch (err: any) {
            console.error("Failed to fetch live economic calendar, falling back to static:", err);
            setEvents(rawFallbackEvents);
            setIsLive(false);
            setFetchError(err.message || 'Error loading live calendar');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveCalendar(true);
    }, [rawFallbackEvents]);

    // Filtered events
    const filteredEvents = useMemo(() => {
        return events.filter(evt => {
            const currencyMatch = selectedCurrency === 'ALL' || evt.currency === selectedCurrency;
            const impactMatch = selectedImpact === 'ALL' || evt.importance === selectedImpact;
            return currencyMatch && impactMatch;
        });
    }, [events, selectedCurrency, selectedImpact]);

    const getImpactStyles = (importance: string) => {
        switch (importance) {
            case 'HIGH':
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            case 'MEDIUM':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'LOW':
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            default:
                return 'bg-slate-100 text-slate-500';
        }
    };

    return (
        <div className="w-full flex flex-col gap-6">
            
            {/* Header Filters & Connection Status */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <Filter className="text-rose-500" size={16} />
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Filter Calendar</h4>
                    </div>
                    <div className="flex items-center gap-2">
                        {isLive ? (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Wifi size={10} /> Live (Gemini Grounded)
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <WifiOff size={10} /> Offline (Simulation)
                            </span>
                        )}
                        <button
                            onClick={() => fetchLiveCalendar(true)}
                            disabled={isLoading}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                            title="Refresh calendar data"
                        >
                            <RefreshCw size={12} className={`${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    {/* Currency Selector */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-850">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Asset:</span>
                        {['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map(curr => (
                            <button
                                key={curr}
                                onClick={() => setSelectedCurrency(curr)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                                    selectedCurrency === curr 
                                    ? 'bg-rose-500 text-white' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                                }`}
                            >
                                {curr}
                            </button>
                        ))}
                    </div>

                    {/* Impact Selector */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-950 px-2.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-850">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Impact:</span>
                        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(imp => (
                            <button
                                key={imp}
                                onClick={() => setSelectedImpact(imp)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                                    selectedImpact === imp 
                                    ? 'bg-rose-500 text-white' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                                }`}
                            >
                                {imp}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dynamic Calendar Sections */}
            <div className="flex flex-col gap-8">
                {dateList.map(dateObj => {
                    const dayEvents = filteredEvents.filter(evt => evt.dayOffset === dateObj.offset);
                    
                    return (
                        <div key={dateObj.offset} className="flex flex-col gap-4">
                            {/* Section Title */}
                            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                                <Calendar className="text-rose-500" size={18} />
                                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                                    {dateObj.dayLabel} 
                                    <span className="text-xs text-slate-500 font-bold font-mono lowercase tracking-normal">({dateObj.fullDate})</span>
                                </h3>
                                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full ml-auto">
                                    {dayEvents.length} Events
                                </span>
                            </div>

                            {/* Events List / Grid */}
                            {dayEvents.length === 0 ? (
                                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 italic py-4 bg-slate-50/40 dark:bg-slate-900/10 rounded-2xl text-center border border-dashed border-slate-200 dark:border-slate-800">
                                    No scheduled major releases for this currency / impact profile today.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {dayEvents.map(evt => {
                                        const isSelected = selectedEventId === evt.id;
                                        return (
                                            <motion.div
                                                layout
                                                key={evt.id}
                                                onClick={() => setSelectedEventId(isSelected ? null : evt.id)}
                                                className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                                                    isSelected 
                                                    ? 'bg-rose-500/5 border-rose-500/35 shadow-lg shadow-rose-500/5' 
                                                    : 'bg-white dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-75 hover:bg-slate-50/30 dark:hover:bg-slate-900/80'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-4 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl">
                                                            {evt.currency}
                                                        </span>
                                                        <span className="text-slate-400 text-xs font-mono font-bold flex items-center gap-1">
                                                            <Clock size={12} /> {evt.time}
                                                        </span>
                                                    </div>

                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${getImpactStyles(evt.importance)}`}>
                                                        {evt.importance} IMPACT
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                                                    {evt.event}
                                                </h4>

                                                {/* Metric Details */}
                                                <div className="grid grid-cols-3 gap-2 mt-4 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-850/60">
                                                    <div>
                                                        <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Previous</div>
                                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">{evt.previous}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Forecast</div>
                                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">{evt.forecast}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Actual</div>
                                                        <div className="text-xs font-black text-rose-500 dark:text-rose-400 mt-1 flex items-center justify-center gap-1">
                                                            {evt.actual === 'Pending' ? (
                                                                <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                                                            ) : null}
                                                            {evt.actual}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expandable explanation with dynamic prompt guidance */}
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
                                                    >
                                                        <p className="flex items-start gap-2">
                                                            <Info className="text-rose-500 shrink-0 mt-0.5" size={14} />
                                                            <span>{evt.notes}</span>
                                                        </p>
                                                        <div className="mt-3 bg-rose-500/10 text-rose-700 dark:text-rose-400 p-2.5 rounded-xl font-bold flex items-center gap-2">
                                                            <TrendingUp size={14} />
                                                            <span>Tactical Recommendation: Avoid executing market orders on {evt.currency} pairs within 5 minutes of release. Prefer setting Limit Orders.</span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
