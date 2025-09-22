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
        <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="flex items-end justify-center h-28 space-x-2">
                <CandleIcon color="#3b82f6" className="animate-bounce-candle" />
                <CandleIcon color="#2563eb" className="animate-bounce-candle [animation-delay:-0.5s]" />
                <CandleIcon color="#3b82f6" className="animate-bounce-candle [animation-delay:-0.25s]" />
            </div>
            <p className="mt-6 text-lg font-semibold text-gray-700 dark:text-dark-text">AI is Analyzing the Market...</p>
            <p key={message} className="text-sm text-gray-600 dark:text-dark-text/70 animate-fade-in min-h-[20px]">
                {message}
            </p>
        </div>
    );
};