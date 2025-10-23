import React, { useState, useEffect, useRef } from 'react';

// Hook to get current time and session
const useDateTime = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const day = now.toLocaleDateString(undefined, { weekday: 'long' });
    const date = now.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const getUtcOffsetString = () => {
        const offsetMinutes = -now.getTimezoneOffset();
        const offsetHours = offsetMinutes / 60;
        const sign = offsetHours >= 0 ? '+' : '-';
        // FIX: Ensure hours are correctly formatted with padding even if they are integers.
        const hours = Math.floor(Math.abs(offsetHours));
        return `UTC${sign}${String(hours).padStart(1, '0')}`;
    };

    const getActiveSessions = () => {
        const utcHour = now.getUTCHours();
        const sessions = [];
        // Asian Session (approx 23:00 - 08:00 UTC)
        if (utcHour >= 23 || utcHour < 8) sessions.push('Asian');
        // London Session (approx 07:00 - 16:00 UTC)
        if (utcHour >= 7 && utcHour < 16) sessions.push('London');
        // New York Session (approx 12:00 - 21:00 UTC)
        if (utcHour >= 12 && utcHour < 21) sessions.push('New York');
        return sessions.length > 0 ? sessions.join(' / ') : 'N/A';
    };

    return { day, date, time, utcOffset: getUtcOffsetString(), activeSessions: getActiveSessions() };
};

// Hook to get market status
const useMarketStatus = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkStatus = () => {
            const now = new Date();
            const dayUTC = now.getUTCDay(); // 0 = Sun, 6 = Sat
            const hourUTC = now.getUTCHours();

            // Market is closed on Saturday, Sunday before 22:00 UTC, and Friday after 22:00 UTC
            if (dayUTC === 6 || (dayUTC === 0 && hourUTC < 22) || (dayUTC === 5 && hourUTC >= 22)) {
                setIsOpen(false);
            } else {
                setIsOpen(true);
            }
        };

        checkStatus();
        const timer = setInterval(checkStatus, 60000); // Check every minute
        return () => clearInterval(timer);
    }, []);

    return { isOpen, statusText: isOpen ? 'Active' : 'Closed' };
};

const generateChartData = () => {
    const data = [];
    let value = 50 + Math.random() * 20;
    for (let i = 0; i < 50; i++) {
        data.push(value);
        value += (Math.random() - 0.5) * 5;
    }
    return data;
};

interface MarketOverviewProps {
    analysisCount: number;
    onResetCount: () => void;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ analysisCount, onResetCount }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null); // Using any for Chart.js instance
    const [timeRange, setTimeRange] = useState<'1H' | '1D' | '1W'>('1H');
    const { isOpen, statusText } = useMarketStatus();
    const { day, date, time, utcOffset, activeSessions } = useDateTime();

    useEffect(() => {
        if (!chartRef.current) return;
        const Chart = (window as any).Chart;
        if (!Chart) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, chartRef.current.clientHeight);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.5)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.1)');

        const data = {
            labels: Array(50).fill(''),
            datasets: [{
                data: generateChartData(),
                borderColor: '#3498db',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }]
        };

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500,
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
        
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [timeRange]); // Redraw chart when timeRange changes

    const handleTimeRangeChange = (range: '1H' | '1D' | '1W') => {
        if (range !== timeRange) {
            setTimeRange(range);
        }
    };

    return (
        <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-4 sm:p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl mb-8">
            <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="block cursor-pointer group">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">Market Overview</h2>
                    <div className="flex space-x-1 p-1 bg-gray-200/50 dark:bg-dark-bg/50 rounded-md text-xs">
                        {['1H', '1D', '1W'].map(range => (
                            <button
                                key={range}
                                onClick={(e) => {
                                    e.preventDefault(); 
                                    e.stopPropagation();
                                    handleTimeRangeChange(range as '1H' | '1D' | '1W');
                                }}
                                className={`px-2 py-1 rounded transition-colors ${timeRange === range ? 'bg-blue-500 text-white' : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-300/50 dark:hover:bg-dark-bg/80'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-40">
                    <canvas ref={chartRef}></canvas>
                </div>
            </a>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Market Status Card */}
                <div className="bg-dark-card/60 p-4 rounded-xl shadow-lg border border-green-500/10 flex flex-col justify-between min-h-[120px]">
                    <div className="flex justify-between items-start">
                        <span className="text-xs uppercase font-semibold text-dark-text-secondary tracking-wider">Market Status</span>
                        <div className="bg-blue-500/20 p-1.5 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-white">{statusText}</h3>
                        <div className="flex items-center mt-1">
                            <div className="relative flex items-center justify-center w-3 h-3 mr-2">
                                {isOpen && <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>}
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>
                            <span className="text-sm text-dark-text-secondary">{isOpen ? 'Weekdays' : 'Weekends / Off-hours'}</span>
                        </div>
                    </div>
                </div>

                {/* Current Day Card */}
                <div className="bg-dark-card/60 p-4 rounded-xl shadow-lg border border-green-500/10 flex flex-col justify-between min-h-[120px]">
                    <div className="flex justify-between items-start">
                        <span className="text-xs uppercase font-semibold text-dark-text-secondary tracking-wider">Current Day</span>
                         <div className="bg-blue-500/20 p-1.5 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-grow flex flex-col justify-center">
                        <h3 className="text-3xl font-bold text-white">{day}</h3>
                        <div className="flex items-center mt-1">
                             <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                             <p className="text-sm text-dark-text-secondary">{date}</p>
                        </div>
                    </div>
                    <div className="flex items-end justify-between mt-1">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full">{activeSessions}</span>
                        <div className="text-right">
                           <span className="font-mono text-base text-dark-text">{time}</span>
                           <span className="font-mono text-xs text-dark-text-secondary ml-1">{utcOffset}</span>
                        </div>
                    </div>
                </div>
                
                 {/* Analysis Count Card */}
                <div className="bg-dark-card/60 p-4 rounded-xl shadow-lg border border-green-500/10 flex flex-col justify-between min-h-[120px] relative group">
                    <div className="flex justify-between items-start">
                        <span className="text-xs uppercase font-semibold text-dark-text-secondary tracking-wider">Session Analysis</span>
                        <div className="bg-blue-500/20 p-1.5 rounded-lg">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-grow flex flex-col items-center justify-center">
                        <h3 className="text-5xl font-bold text-white tracking-tighter">{analysisCount}</h3>
                        <p className="text-sm text-dark-text-secondary mt-1">Analyses performed</p>
                    </div>
                    <button 
                        onClick={onResetCount} 
                        className="absolute bottom-2 right-2 text-xs font-medium text-blue-400 hover:underline focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Reset analysis count"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
};