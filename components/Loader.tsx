import React, { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
    "Synthesizing multi-strategy analysis...",
    "Fetching live OHLCV from Twelve Data...",
    "Calculating support & resistance levels...",
    "Cross-referencing vision with raw market data...",
    "Evaluating market structure...",
    "Checking RSI and MACD indicators...",
    "Identifying liquidity zones...",
    "Finalizing high-conviction signal...",
];

const CandleIcon = ({ color, className }: { color: string, className?: string }) => (
    <svg className={`w-8 h-24 ${className}`} viewBox="0 0 32 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0V16" stroke={color} strokeWidth="4" strokeLinecap="round"/>
        <rect x="8" y="16" width="16" height="64" rx="2" fill={color}/>
        <path d="M16 80V96" stroke={color} strokeWidth="4" strokeLinecap="round"/>
    </svg>
);


export const Loader: React.FC = () => {
    const [message, setMessage] = useState(LOADING_MESSAGES[0]);

    useEffect(() => {
        let index = 0;
        const intervalId = setInterval(() => {
            index = (index + 1) % LOADING_MESSAGES.length;
            setMessage(LOADING_MESSAGES[index]);
        }, 2500); // Change message every 2.5 seconds

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 liquid-glass rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full mx-4">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse"></div>
                <div className="flex items-end justify-center h-28 space-x-3 relative z-10">
                    <CandleIcon color="#10b981" className="animate-bounce-candle" />
                    <CandleIcon color="#059669" className="animate-bounce-candle [animation-delay:-0.5s]" />
                    <CandleIcon color="#10b981" className="animate-bounce-candle [animation-delay:-0.25s]" />
                </div>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-green-400 mb-2">Neural Processing</h2>
            <p key={message} className="text-xs font-mono text-slate-600 dark:text-dark-text/50 animate-fade-in min-h-[40px] px-4 leading-relaxed uppercase tracking-widest">
                {message}
            </p>
            <div className="mt-6 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-shimmer w-full"></div>
            </div>
        </div>
    );
};