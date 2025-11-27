
import React, { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
    "Synthesizing multi-strategy analysis...",
    "Scanning for candlestick patterns...",
    "Calculating support & resistance levels...",
    "Leveraging real-time market data...",
    "Evaluating market structure...",
    "Checking RSI and MACD indicators...",
    "Identifying liquidity zones...",
    "Finalizing high-conviction signal...",
];

// 3D Cylinder Candle Component
const Candle3D = ({ colorStart, colorEnd, className }: { colorStart: string, colorEnd: string, className?: string }) => (
    <svg className={`w-12 h-32 ${className}`} viewBox="0 0 40 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.3))' }}>
        <defs>
            <linearGradient id={`grad-body-${colorStart}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={colorStart} stopOpacity="0.8" />
                <stop offset="50%" stopColor={colorEnd} />
                <stop offset="100%" stopColor={colorStart} stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id={`grad-top-${colorStart}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorEnd} stopOpacity="0.4" />
                <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
        </defs>
        
        {/* Wick Top */}
        <line x1="20" y1="5" x2="20" y2="20" stroke={colorEnd} strokeWidth="2" strokeLinecap="round" />
        
        {/* Candle Body (Cylinder Main) */}
        <rect x="10" y="20" width="20" height="60" fill={`url(#grad-body-${colorStart})`} />
        
        {/* Candle Top (Ellipse) */}
        <ellipse cx="20" cy="20" rx="10" ry="3" fill={`url(#grad-top-${colorStart})`} />
        
        {/* Candle Bottom (Ellipse) */}
        <ellipse cx="20" cy="80" rx="10" ry="3" fill={colorStart} />
        
        {/* Wick Bottom */}
        <line x1="20" y1="80" x2="20" y2="95" stroke={colorEnd} strokeWidth="2" strokeLinecap="round" />
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
        <div className="flex flex-col items-center justify-center text-center p-4 perspective-container">
            <div className="flex items-end justify-center h-36 space-x-4 mb-4" style={{ perspective: '1000px' }}>
                <div className="animate-bounce-candle">
                    <Candle3D colorStart="#1e3a8a" colorEnd="#60a5fa" /> {/* Blue */}
                </div>
                <div className="animate-bounce-candle [animation-delay:-0.5s]">
                    <Candle3D colorStart="#14532d" colorEnd="#4ade80" /> {/* Green */}
                </div>
                <div className="animate-bounce-candle [animation-delay:-0.25s]">
                    <Candle3D colorStart="#1e3a8a" colorEnd="#60a5fa" /> {/* Blue */}
                </div>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-700 dark:text-dark-text animate-pulse">AI is Analyzing the Market...</p>
            <p key={message} className="text-sm text-gray-500 dark:text-dark-text/60 animate-fade-in min-h-[24px] font-mono mt-2">
                {message}
            </p>
        </div>
    );
};
