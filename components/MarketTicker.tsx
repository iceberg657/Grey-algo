
import React, { useState, useEffect } from 'react';
import type { MarketDataItem } from '../types';
import { getMarketData } from '../services/marketDataService';

interface TickerItemProps {
    item: MarketDataItem;
    onClick: (symbol: string) => void;
}

const TickerItem: React.FC<TickerItemProps> = ({ item, onClick }) => {
    const isPositive = item.change >= 0;
    const pricePrecision = item.symbol.includes('JPY') ? 2 : (item.price > 1000 ? 1 : 4);

    return (
        <div 
            onClick={() => onClick(item.symbol)}
            className="flex items-center flex-shrink-0 mr-8 text-sm cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 px-2 py-1 rounded transition-colors"
        >
            <span className="font-semibold text-gray-800 dark:text-dark-text/90 mr-3">{item.symbol}</span>
            <span className="font-mono text-gray-800 dark:text-dark-text mr-3">{item.price.toFixed(pricePrecision)}</span>
            <div className={`flex items-center font-mono ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <span className="mr-1">{isPositive ? '▲' : '▼'}</span>
                <span>{Math.abs(item.change).toFixed(pricePrecision)} ({Math.abs(item.changePercent).toFixed(2)}%)</span>
            </div>
        </div>
    );
};

export const MarketTicker: React.FC<{ onAssetClick?: (s: string) => void }> = ({ onAssetClick }) => {
    const [data, setData] = useState<MarketDataItem[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const marketData = await getMarketData();
            if (marketData.length > 0) setData(marketData);
        };

        fetchData();
        // Reduced polling significantly to save quota
        const intervalId = setInterval(fetchData, 20000); 
        return () => clearInterval(intervalId);
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
