
import React, { useState } from 'react';

interface CheatSheetProps {
    onClose: () => void;
}

const CONCEPTS = [
    {
        category: 'Market Structure (SMC)',
        items: [
            { term: 'BOS (Break of Structure)', def: 'When price closes above a previous high (bullish) or below a previous low (bearish), confirming trend continuation.' },
            { term: 'CHoCH (Change of Character)', def: 'The first sign of a trend reversal. E.g., in an uptrend, price breaks the most recent higher low.' },
            { term: 'Liquidity Sweep (Stop Hunt)', def: 'Price briefly pierces a key High/Low to trigger stop losses, then aggressively reverses. A high-probability entry signal.' },
            { term: 'Order Block (OB)', def: 'The last opposing candle before a strong impulsive move. Institutional orders are often stacked here waiting for a retest.' },
            { term: 'FVG (Fair Value Gap)', def: 'A three-candle pattern where the 1st and 3rd candles do not overlap, leaving a gap. Price acts like a magnet to fill this imbalance.' },
        ]
    },
    {
        category: 'Risk Management',
        items: [
            { term: 'R:R (Risk to Reward)', def: 'The ratio of potential loss to potential gain. We target minimum 1:3 (Risk $1 to make $3).' },
            { term: 'BE (Breakeven)', def: 'Moving your Stop Loss to your entry price to eliminate risk once the trade moves in your favor.' },
            { term: 'Partial', def: 'Closing a portion of your position (e.g., 50%) at a specific target to secure profit while letting the rest run.' },
        ]
    },
    {
        category: 'Sessions',
        items: [
            { term: 'Asian Range', def: 'Usually consolidation. Sets the liquidity boundaries for the London session to target.' },
            { term: 'Judas Swing', def: 'A false move at the London Open (07:00-08:00 UTC) that traps traders before the real trend begins.' },
            { term: 'NY Reversal', def: 'New York session often reverses the trend set by London, or continues it after a deep pullback.' },
        ]
    }
];

export const CheatSheet: React.FC<CheatSheetProps> = ({ onClose }) => {
    const [openCategory, setOpenCategory] = useState<string>(CONCEPTS[0].category);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-2xl border border-gray-200 dark:border-blue-500/30 shadow-2xl overflow-hidden flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gray-100 dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Trader's Academy</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tactical Reference Guide</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col md:flex-row h-full overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-full md:w-1/3 bg-gray-50 dark:bg-slate-950/50 border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/5 overflow-y-auto">
                        {CONCEPTS.map((cat) => (
                            <button
                                key={cat.category}
                                onClick={() => setOpenCategory(cat.category)}
                                className={`w-full text-left px-4 py-4 text-sm font-semibold transition-colors border-l-4 ${
                                    openCategory === cat.category 
                                    ? 'bg-white dark:bg-slate-800/80 border-blue-500 text-blue-600 dark:text-blue-400' 
                                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                {cat.category}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-slate-900">
                        <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
                            {openCategory}
                        </h4>
                        
                        <div className="space-y-6">
                            {CONCEPTS.find(c => c.category === openCategory)?.items.map((item, idx) => (
                                <div key={idx} className="group">
                                    <h5 className="flex items-center text-sm font-bold text-gray-900 dark:text-green-400 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
                                        {item.term}
                                    </h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 ml-3.5 leading-relaxed">
                                        {item.def}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {openCategory === 'Market Structure (SMC)' && (
                            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-500/20">
                                <p className="text-xs text-blue-600 dark:text-blue-300 font-medium text-center italic">
                                    "Market structure is king. Indicators are secondary. Follow the footprints of smart money."
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
