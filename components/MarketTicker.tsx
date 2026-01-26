
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
                {isPositive ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                )}
                <span className="ml-1">{item.change.toFixed(pricePrecision)} ({item.changePercent.toFixed(2)}%)</span>
            </div>
        </div>
    );
};

interface MarketTickerProps {
    onAssetClick?: (symbol: string) => void;
}

export const MarketTicker: React.FC<MarketTickerProps> = ({ onAssetClick }) => {
    const [data, setData] = useState<MarketDataItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const marketData = await getMarketData();
                setData(marketData);
                setError(null);
            } catch (err) {
                setError('Market data paused.');
                console.error(err);
            }
        };

        fetchData(); // Initial fetch
        // Increased from 5000 to 30000 to save quota
        const intervalId = setInterval(fetchData, 30000); 

        return () => clearInterval(intervalId);
    }, []);

    if (error) {
        return <div className="text-center text-red-400 text-[10px] p-1 opacity-50 uppercase font-bold">{error}</div>;
    }

    if (data.length === 0) {
        return <div className="h-8 animate-pulse bg-gray-200/20 rounded"></div>;
    }
    
    const tickerItems = [...data, ...data];

    return (
        <div className="w-full bg-gray-200/50 dark:bg-dark-card/50 backdrop-blur-sm p-3 rounded-lg border border-gray-300/50 dark:border-green-500/10 shadow-md overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
                {tickerItems.map((item, index) => (
                    <TickerItem 
                        key={`${item.symbol}-${index}`} 
                        item={item} 
                        onClick={(symbol) => onAssetClick && onAssetClick(symbol)}
                    />
                ))}
            </div>
        </div>
    );
};
