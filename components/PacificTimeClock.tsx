
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
        <div className="fixed top-4 left-4 z-[999] pointer-events-none">
            <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md text-slate-900 dark:text-white px-3 py-1.5 rounded-lg shadow-lg border border-gray-300 dark:border-white/10">
                <p className="font-mono text-sm font-bold tracking-wider">{time}</p>
            </div>
        </div>
    );
};
