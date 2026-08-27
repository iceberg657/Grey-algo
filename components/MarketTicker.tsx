
import React, { useState, useEffect } from 'react';
import type { MarketDataItem } from '../types';
import { derivStream } from '../services/derivStreamService';

interface TickerItemProps {
    item: MarketDataItem;
    onClick: (symbol: string) => void;
}

const TickerItem: React.FC<TickerItemProps> = ({ item, onClick }) => {
    const isPositive = (item.change || 0) >= 0;
    const pricePrecision = item.symbol.includes('JPY') ? 3 : (item.symbol.includes('EUR/') || item.symbol.includes('GBP/') || item.symbol.includes('AUD/') || item.symbol.includes('USD/CAD') || item.symbol.includes('USD/CHF') ? 5 : (item.price > 1000 ? 2 : 2));

    return (
        <div 
            onClick={() => onClick(item.symbol)}
            className="flex items-center flex-shrink-0 mr-8 text-sm cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 px-2 py-1 rounded transition-colors group"
        >
            <span className="font-bold text-gray-900 dark:text-dark-text/90 mr-2 group-hover:text-cyan-400 transition-colors">{item.symbol}</span>
            <span className="font-mono font-black text-gray-900 dark:text-cyan-300 mr-2.5">{item.price.toFixed(pricePrecision)}</span>
            <div className={`flex items-center font-mono text-xs font-bold px-1.5 py-0.5 rounded ${isPositive ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10' : 'text-rose-700 dark:text-rose-400 bg-rose-500/10'}`}>
                <span className="mr-0.5">{isPositive ? '▲' : '▼'}</span>
                <span>{Math.abs(item.change || 0).toFixed(pricePrecision === 5 ? 4 : 2)} ({Math.abs(item.changePercent || 0).toFixed(2)}%)</span>
            </div>
        </div>
    );
};

export const MarketTicker: React.FC<{ onAssetClick?: (s: string) => void }> = ({ onAssetClick }) => {
    const [data, setData] = useState<MarketDataItem[]>([]);

    useEffect(() => {
        derivStream.startStream();
        const unsubscribe = derivStream.subscribe((streamedData) => {
            if (streamedData && streamedData.length > 0) {
                setData(streamedData);
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (data.length === 0) return null;
    const tickerItems = [...data, ...data, ...data];

    return (
        <div className="w-full bg-gray-200/50 dark:bg-dark-card/50 backdrop-blur-sm p-3 rounded-lg border border-gray-300/50 dark:border-green-500/10 shadow-md overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
                {tickerItems.map((item, index) => (
                    <TickerItem 
                        key={`${item.symbol}-${index}`} 
                        item={item} 
                        onClick={(s) => onAssetClick?.(s)}
                    />
                ))}
            </div>
        </div>
    );
};
