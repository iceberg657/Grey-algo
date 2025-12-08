
import React from 'react';
import type { OrderBook } from '../types';

interface MarketDepthProps {
    orderBook: OrderBook;
}

export const MarketDepth: React.FC<MarketDepthProps> = ({ orderBook }) => {
    // Ensure we have data to calculate max volume
    const allVolumes = [...orderBook.bids.map(b => b.volume), ...orderBook.asks.map(a => a.volume)];
    const maxVol = allVolumes.length > 0 ? Math.max(...allVolumes) : 1;

    return (
        <div className="bg-gray-50/50 dark:bg-dark-bg/40 p-4 rounded-xl border border-gray-200 dark:border-green-500/10">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 text-center uppercase tracking-wider flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Market Depth
            </h4>
            <div className="flex flex-col space-y-0.5 text-xs font-mono">
                <div className="flex justify-between px-2 text-[10px] text-gray-400 mb-1">
                    <span>Price</span>
                    <span>Vol</span>
                </div>
                
                {/* Asks - Red - Render in reverse order so lowest ask is at bottom (closest to spread) */}
                {[...orderBook.asks].reverse().map((ask, i) => (
                    <div key={`ask-${i}`} className="relative flex justify-between items-center py-1 px-2 group">
                        {/* Background Bar */}
                        <div
                            className="absolute top-0 right-0 h-full bg-red-500/10 dark:bg-red-500/20 transition-all duration-500 group-hover:bg-red-500/20"
                            style={{ width: `${(ask.volume / maxVol) * 100}%` }}
                        />
                        <span className="relative z-10 text-red-500 dark:text-red-400 font-semibold">{ask.price.toFixed(5).replace(/0+$/, '')}</span>
                        <span className="relative z-10 text-gray-600 dark:text-gray-400">{ask.volume.toFixed(2)}</span>
                    </div>
                ))}

                {/* Spread / Current Price Divider */}
                <div className="py-1.5 flex items-center justify-center text-gray-400 text-[10px] uppercase tracking-widest border-y border-dashed border-gray-300 dark:border-gray-700 my-1 bg-gray-100/50 dark:bg-black/20">
                    Spread
                </div>

                {/* Bids - Green */}
                {orderBook.bids.map((bid, i) => (
                    <div key={`bid-${i}`} className="relative flex justify-between items-center py-1 px-2 group">
                        {/* Background Bar */}
                        <div
                            className="absolute top-0 right-0 h-full bg-green-500/10 dark:bg-green-500/20 transition-all duration-500 group-hover:bg-green-500/20"
                            style={{ width: `${(bid.volume / maxVol) * 100}%` }}
                        />
                        <span className="relative z-10 text-green-600 dark:text-green-400 font-semibold">{bid.price.toFixed(5).replace(/0+$/, '')}</span>
                        <span className="relative z-10 text-gray-600 dark:text-gray-400">{bid.volume.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
