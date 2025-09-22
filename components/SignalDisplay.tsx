import React from 'react';
import type { SignalData } from '../types';

interface InfoCardProps {
    label: string;
    value: React.ReactNode;
    className?: string;
    isSignal?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value, className, isSignal = false }) => (
    <div className={`flex flex-col items-center justify-center p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50 ${className}`}>
        <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider">{label}</span>
        <span className={`mt-1 font-semibold ${isSignal ? 'text-2xl ' + (value === 'BUY' ? 'text-green-500' : 'text-red-500') : 'text-lg font-mono text-gray-800 dark:text-dark-text'}`}>
            {value}
        </span>
    </div>
);

interface SignalDisplayProps {
    data: SignalData;
}

export const SignalDisplay: React.FC<SignalDisplayProps> = ({ data }) => {
    const isBuy = data.signal === 'BUY';

    return (
        <div className="w-full animate-fade-in space-y-6">
            <header className="text-center">
                 {/* FIX: Changed data.instrument to data.asset to match SignalData type */}
                 <h2 className="text-xl font-bold text-gray-900 dark:text-green-400 border-b-2 border-transparent dark:border-green-500/50 pb-2 mb-2">{data.asset}</h2>
                 <p className="text-sm text-gray-500 dark:text-dark-text/70">{data.timeframe}</p>
            </header>

            <div className="grid grid-cols-2 gap-3 text-center">
                <InfoCard 
                    label="Signal" 
                    value={data.signal}
                    className={`border-2 ${isBuy ? 'border-green-500/50' : 'border-red-500/50'}`}
                    isSignal={true}
                />
                 <InfoCard 
                    label="Confidence" 
                    value={`${data.confidence}%`}
                 />
                 <InfoCard 
                    label="Entry" 
                    value={data.entry}
                 />
                 <InfoCard 
                    label="Stop Loss" 
                    // FIX: Changed data.stop_loss to data.stopLoss to match SignalData type
                    value={<span className="text-red-500 dark:text-red-400">{data.stopLoss}</span>}
                 />
                 <div className="col-span-2 flex flex-col items-center justify-center p-3 rounded-lg bg-gray-200/50 dark:bg-dark-bg/50">
                     <span className="text-xs text-gray-600 dark:text-dark-text/70 uppercase tracking-wider">Take Profits</span>
                     <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-lg font-mono text-green-500 dark:text-green-400">
                        {/* FIX: Changed data.take_profits to data.takeProfits to match SignalData type */}
                        {data.takeProfits.map((tp, index) => (
                            <span key={index}>{tp}</span>
                        ))}
                     </div>
                 </div>
            </div>
            
            <div>
                {/* FIX: Changed "10 Reasons" to "Reasoning" for accuracy. */}
                <h3 className="font-semibold mb-3 text-gray-800 dark:text-green-400 text-center text-lg border-b-2 border-transparent dark:border-green-500/50 pb-2">Reasoning</h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-dark-text/90">
                    {/* FIX: Changed data.reasons to data.reasoning to match SignalData type */}
                    {data.reasoning.map((reason, index) => {
                        const emoji = reason.startsWith('✅') ? '✅' : reason.startsWith('❌') ? '❌' : '';
                        const text = reason.replace(/^(✅|❌)\s*/, '');
                        return (
                            <li key={index} className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md flex items-start">
                                <span className="w-5 text-left">{emoji}</span>
                                <span>{text}</span>
                            </li>
                        )
                    })}
                </ul>
            </div>

            {data.sources && data.sources.length > 0 && (
                <div className="pt-4 border-t border-gray-300 dark:border-green-500/50">
                    <h3 className="font-semibold mb-3 text-gray-800 dark:text-green-400 text-center text-lg border-b-2 border-transparent dark:border-green-500/50 pb-2">Sources</h3>
                    <ul className="space-y-2 text-sm">
                        {data.sources.map((source, index) => (
                            <li key={index} className="bg-gray-200/30 dark:bg-dark-bg/40 p-3 rounded-md">
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start text-green-600 dark:text-green-400 hover:underline"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <span>{source.title}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};