
import React, { useState, useEffect } from 'react';

export const PacificTimeClock: React.FC = () => {
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleString('en-US', {
                timeZone: 'America/Los_Angeles',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            });
            setTime(timeString + ' PST');
        };

        updateClock();
        const intervalId = setInterval(updateClock, 1000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="hidden sm:block fixed top-3 left-3 z-30 pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md text-slate-800 dark:text-white px-2.5 py-1 rounded-full shadow-xs border border-gray-200 dark:border-white/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="font-mono text-[10px] font-bold tracking-wider">{time}</p>
            </div>
        </div>
    );
};
