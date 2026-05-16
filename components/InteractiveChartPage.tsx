import React from 'react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';

interface InteractiveChartPageProps {
    symbol?: string;
    onBack?: () => void;
}

export const InteractiveChartPage: React.FC<InteractiveChartPageProps> = ({ symbol = 'NASDAQ:AAPL', onBack }) => {
    return (
        <div className="flex flex-col h-full w-full bg-slate-900 p-4">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex justify-start w-1/3">
                    {onBack && (
                        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm font-medium">
                            &larr; Back to Dashboard
                        </button>
                    )}
                </div>
                <h2 className="text-xl font-bold text-white tracking-widest uppercase text-center w-1/3">Interactive Chart Matrix</h2>
                <div className="text-xs text-blue-400 opacity-70 text-right w-1/3">Powered by TradingView</div>
            </div>
            <div className="flex-grow w-full rounded-xl overflow-hidden border border-slate-700 shadow-xl" style={{ minHeight: '600px' }}>
                <AdvancedRealTimeChart
                    symbol={symbol}
                    theme="dark"
                    autosize
                    hide_side_toolbar={false}
                    details
                    hotlist
                    calendar
                    show_popup_button
                    popup_width="1000"
                    popup_height="650"
                />
            </div>
        </div>
    );
};
