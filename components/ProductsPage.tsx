
import React, { useState } from 'react';
import { ThemeToggleButton } from './ThemeToggleButton';

interface ProductsPageProps {
    onBack: () => void;
    onLogout: () => void;
}

interface Product {
    id: string;
    name: string;
    description: string;
    type: 'Indicator' | 'Bot' | 'Strategy';
    platform: 'TradingView' | 'MetaTrader 4' | 'Python';
    version: string;
    code: string;
}

const PRODUCTS: Product[] = [
    {
        id: 'ga-trend-catcher',
        name: 'GreyAlpha Trend Catcher',
        description: 'A classic trend-following system using EMA crossovers with visual buy/sell signals. Perfect for identifying trend reversals on H1 and H4 timeframes.',
        type: 'Indicator',
        platform: 'TradingView',
        version: 'v1.2',
        code: `//@version=5
indicator("GreyAlpha Trend Catcher", overlay=true)

// Settings
fastLen = input.int(9, "Fast EMA")
slowLen = input.int(21, "Slow EMA")

// Calculation
fast = ta.ema(close, fastLen)
slow = ta.ema(close, slowLen)

// Plotting
plot(fast, color=color.new(color.green, 0), title="Fast EMA")
plot(slow, color=color.new(color.red, 0), title="Slow EMA")

// Logic
longCondition = ta.crossover(fast, slow)
shortCondition = ta.crossunder(fast, slow)

// Visuals
plotshape(longCondition, title="Buy Signal", location=location.belowbar, color=color.green, style=shape.labelup, text="BUY", textcolor=color.white)
plotshape(shortCondition, title="Sell Signal", location=location.abovebar, color=color.red, style=shape.labeldown, text="SELL", textcolor=color.white)

alertcondition(longCondition, title="GA Buy Alert", message="GreyAlpha Trend Catcher: BUY Detected")
alertcondition(shortCondition, title="GA Sell Alert", message="GreyAlpha Trend Catcher: SELL Detected")`
    },
    {
        id: 'ga-volatility-beast',
        name: 'GreyAlpha Volatility Beast',
        description: 'Captures explosive moves by detecting Bollinger Band squeezes followed by aggressive breakouts. Best used for scalping on 5m and 15m charts.',
        type: 'Strategy',
        platform: 'TradingView',
        version: 'v2.0',
        code: `//@version=5
indicator("GreyAlpha Volatility Beast", overlay=true)

// Settings
length = input.int(20, "BB Length")
mult = input.float(2.0, "BB Mult")

// Calculations
[middle, upper, lower] = ta.bb(close, length, mult)
plot(upper, color=color.new(color.blue, 50), title="Upper Band")
plot(lower, color=color.new(color.blue, 50), title="Lower Band")

// Breakout Logic
bullishBreak = close > upper and close[1] <= upper[1]
bearishBreak = close < lower and close[1] >= lower[1]

// Volume Filter (Optional)
volSpike = volume > ta.sma(volume, 20) * 1.5

// Visuals
plotshape(bullishBreak and volSpike, title="Volatility Buy", location=location.belowbar, color=color.yellow, style=shape.triangleup, size=size.small, text="BREAK", textcolor=color.yellow)
plotshape(bearishBreak and volSpike, title="Volatility Sell", location=location.abovebar, color=color.purple, style=shape.triangledown, size=size.small, text="BREAK", textcolor=color.purple)

bgcolor(bullishBreak ? color.new(color.green, 90) : bearishBreak ? color.new(color.red, 90) : na)`
    }
];

export const ProductsPage: React.FC<ProductsPageProps> = ({ onBack, onLogout }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-green-400">
                        GreyAlpha Products
                    </h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                        <button
                            onClick={onLogout}
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium"
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Premium Trading Tools</h2>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-2 max-w-2xl mx-auto">
                            Exclusive indicators and automated scripts developed by the GreyAlpha Quantitative Team. 
                            Copy the code directly into your TradingView Pine Editor.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {PRODUCTS.map((product) => (
                            <div key={product.id} className="bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:border-green-500/50 transition-colors group">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{product.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                                        {product.platform}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {product.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-gray-400">{product.version}</span>
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                                        {product.description}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <a 
                                            href="https://www.tradingview.com/chart/" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-gray-500 hover:text-green-500 transition-colors flex items-center"
                                        >
                                            Open TradingView
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                        
                                        <button
                                            onClick={() => handleCopy(product.code, product.id)}
                                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all transform active:scale-95 ${
                                                copiedId === product.id
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'
                                            }`}
                                        >
                                            {copiedId === product.id ? (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                    </svg>
                                                    Copy Script
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
            <footer className="w-full text-center pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-gray-600 dark:text-dark-text/60 text-sm">
                <p>This is not financial advice. All analysis is for informational purposes only.</p>
                <p className="mt-2">
                    Contact: <a href="mailto:ma8138498@gmail.com" className="font-medium text-green-600 dark:text-green-400 hover:underline">ma8138498@gmail.com</a>
                </p>
            </footer>
        </div>
    );
};
