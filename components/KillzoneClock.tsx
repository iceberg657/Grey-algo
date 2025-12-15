
import React, { useState, useEffect } from 'react';

const SESSIONS = [
    { name: 'Asia', start: 0, end: 9, color: 'bg-yellow-500', labelColor: 'text-yellow-500' }, // 00:00 - 09:00 UTC
    { name: 'London', start: 7, end: 16, color: 'bg-blue-500', labelColor: 'text-blue-500' }, // 07:00 - 16:00 UTC
    { name: 'New York', start: 12, end: 21, color: 'bg-green-500', labelColor: 'text-green-500' }, // 12:00 - 21:00 UTC
];

export const KillzoneClock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        const timer = setInterval(() => updateTime(), 1000);
        updateTime();
        return () => clearInterval(timer);
    }, []);

    const updateTime = () => {
        const now = new Date();
        setCurrentTime(now);
        
        const utcHour = now.getUTCHours();
        
        // Determine Status
        let activeSessions = [];
        if (utcHour >= 0 && utcHour < 9) activeSessions.push('Asia');
        if (utcHour >= 7 && utcHour < 16) activeSessions.push('London');
        if (utcHour >= 12 && utcHour < 21) activeSessions.push('New York');

        if (activeSessions.includes('London') && activeSessions.includes('New York')) {
            setStatus('🔥 PEAK VOLUME (LDN/NY OVERLAP)');
        } else if (activeSessions.includes('London')) {
            setStatus('🚀 LONDON SESSION');
        } else if (activeSessions.includes('New York')) {
            setStatus('📈 NEW YORK SESSION');
        } else if (activeSessions.includes('Asia')) {
            setStatus('🌙 ASIAN SESSION (LOW VOL)');
        } else {
            setStatus('💤 MARKET QUIET');
        }
    };

    const currentUtcHour = currentTime.getUTCHours() + (currentTime.getUTCMinutes() / 60);
    const progressPercent = (currentUtcHour / 24) * 100;

    return (
        <div className="w-full bg-dark-card/60 rounded-xl border border-gray-200/20 dark:border-green-500/10 p-4 shadow-lg mb-4">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Global Market Clock (UTC)</h4>
                    <div className="text-xl font-mono font-bold text-white mt-1">
                        {currentTime.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false })}
                        <span className="text-xs text-gray-500 ml-2 font-normal">UTC</span>
                    </div>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded bg-black/20 animate-pulse ${
                    status.includes('PEAK') ? 'text-green-400 border border-green-500/50' : 'text-gray-400'
                }`}>
                    {status}
                </div>
            </div>

            {/* Timeline Visualizer */}
            <div className="relative h-12 w-full bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 mt-3">
                {/* Grid Lines (every 4 hours) */}
                {[0, 4, 8, 12, 16, 20].map(h => (
                    <div key={h} className="absolute top-0 bottom-0 w-px bg-gray-700" style={{ left: `${(h/24)*100}%` }}>
                        <span className="absolute bottom-0.5 left-1 text-[9px] text-gray-600">{h}</span>
                    </div>
                ))}

                {/* Session Bars */}
                {SESSIONS.map(session => (
                    <div
                        key={session.name}
                        className={`absolute h-2 top-2 rounded-full opacity-80 ${session.color}`}
                        style={{
                            left: `${(session.start / 24) * 100}%`,
                            width: `${((session.end - session.start) / 24) * 100}%`,
                            top: session.name === 'Asia' ? '8px' : session.name === 'London' ? '18px' : '28px'
                        }}
                    >
                        <span className={`absolute -right-0 -top-[1px] text-[8px] font-bold uppercase ${session.labelColor} hidden sm:block`} style={{ right: '102%' }}>
                            {session.name.substring(0,3)}
                        </span>
                    </div>
                ))}

                {/* Current Time Cursor */}
                <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    style={{ left: `${progressPercent}%` }}
                >
                    <div className="absolute -top-1 -left-[3px] w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
            </div>
            
            <div className="flex justify-between mt-2 text-[9px] text-gray-500 uppercase font-mono">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
            </div>
        </div>
    );
};
