
import React, { useState, useEffect } from 'react';
import { getHistory } from '../services/historyService';
import type { SignalData } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';

interface SignalOverlayProps {
    onAnalyzeClick?: (imageData: string) => void;
    onBack?: () => void;
}

export const SignalOverlay: React.FC<SignalOverlayProps> = ({ onAnalyzeClick, onBack }) => {
    const [latestAnalysis, setLatestAnalysis] = useState<SignalData | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        const history = getHistory();
        if (history && history.length > 0) {
            setLatestAnalysis(history[0]);
        }
    }, []);

    const handleCopy = (text: string | number, label: string) => {
        navigator.clipboard.writeText(String(text));
        setCopiedId(label);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const isBuy = latestAnalysis?.signal === 'BUY';
    const signalColor = isBuy ? 'text-green-400' : latestAnalysis?.signal === 'SELL' ? 'text-red-400' : 'text-blue-400';
    const signalBg = isBuy ? 'bg-green-500/20' : latestAnalysis?.signal === 'SELL' ? 'bg-red-500/20' : 'bg-blue-500/20';

    // Collapsed State
    if (!isExpanded) {
        return (
            <button 
                onClick={() => setIsExpanded(true)}
                className="absolute top-4 left-4 z-40 bg-white/10 dark:bg-black/40 backdrop-blur-md border border-white/20 p-2 rounded-full shadow-lg hover:bg-white/20 transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
        );
    }

    return (
        <div className="absolute top-4 left-4 z-40 flex flex-col gap-2 max-w-[90vw] md:max-w-fit animate-fade-in">
            {/* Main HUD Card */}
            <div className="bg-white/90 dark:bg-[#0f172a]/80 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-3 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between w-full md:w-auto gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">ACTIVE SIGNAL</span>
                            {latestAnalysis ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-black text-gray-800 dark:text-white">{latestAnalysis.asset}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${signalBg} ${signalColor}`}>
                                        {latestAnalysis.signal}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-sm font-bold text-gray-400">No Active Analysis</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div className="hidden md:block w-px h-8 bg-gray-300 dark:bg-white/10"></div>

                {/* Data Points */}
                {latestAnalysis && (
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start overflow-x-auto">
                        <DataPoint 
                            label="ENTRY" 
                            value={latestAnalysis.entryPoints[0]} 
                            color="text-blue-600 dark:text-blue-400" 
                            onCopy={() => handleCopy(latestAnalysis.entryPoints[0], 'ENTRY')}
                            isCopied={copiedId === 'ENTRY'}
                        />
                        <DataPoint 
                            label="STOP" 
                            value={latestAnalysis.stopLoss} 
                            color="text-red-600 dark:text-red-400"
                            onCopy={() => handleCopy(latestAnalysis.stopLoss, 'STOP')}
                            isCopied={copiedId === 'STOP'}
                        />
                        <DataPoint 
                            label="TARGET" 
                            value={latestAnalysis.takeProfits[0]} 
                            color="text-green-600 dark:text-green-400"
                            onCopy={() => handleCopy(latestAnalysis.takeProfits[0], 'TARGET')}
                            isCopied={copiedId === 'TARGET'}
                        />
                    </div>
                )}

                {/* Tools (Visible on Mobile & Desktop) */}
                <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-gray-300 dark:border-white/10 pt-2 md:pt-0 md:pl-4 w-full md:w-auto justify-end">
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                            title="Back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                    )}
                    <ThemeToggleButton />
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                        title="Minimize HUD"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

const DataPoint: React.FC<{ label: string; value: number | string; color: string; onCopy: () => void; isCopied: boolean }> = ({ label, value, color, onCopy, isCopied }) => (
    <div 
        onClick={onCopy}
        className="flex flex-col cursor-pointer group relative min-w-[60px]"
    >
        <span className="text-[9px] text-gray-400 font-mono tracking-wider mb-0.5 uppercase">{label}</span>
        <div className="flex items-center bg-gray-100 dark:bg-black/20 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
            {isCopied && (
                <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm animate-fade-in">
                    Copied
                </span>
            )}
        </div>
    </div>
);
