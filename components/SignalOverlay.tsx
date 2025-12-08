
import React, { useState, useEffect } from 'react';
import { getHistory } from '../services/historyService';
import type { SignalData } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';

interface SignalOverlayProps {
    onAnalyzeClick?: (imageData: string) => void;
}

export const SignalOverlay: React.FC<SignalOverlayProps> = ({ onAnalyzeClick }) => {
    const [latestAnalysis, setLatestAnalysis] = useState<SignalData | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        // Refresh analysis whenever the component mounts or re-renders
        const history = getHistory();
        if (history && history.length > 0) {
            setLatestAnalysis(history[0]);
        }
    }, []); // In a real app, you might want to subscribe to updates

    const handleCopy = (text: string | number, label: string) => {
        navigator.clipboard.writeText(String(text));
        setCopiedId(label);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const isBuy = latestAnalysis?.signal === 'BUY';
    const signalColor = isBuy ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' : 
                        latestAnalysis?.signal === 'SELL' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 
                        'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30';

    return (
        <div className="w-full h-14 bg-white dark:bg-[#0C0F1A] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-40 relative shadow-md transition-colors duration-300">
            {/* Left: Identity */}
            <div className="flex items-center space-x-4">
                {latestAnalysis ? (
                    <>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-wider">{latestAnalysis.asset}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{latestAnalysis.timeframe} • {new Date(latestAnalysis.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className={`px-3 py-1 rounded border ${signalColor} flex items-center`}>
                            <span className="text-xs font-bold">{latestAnalysis.signal}</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 dark:text-white tracking-wider">CHART VIEW</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">No active signal</span>
                    </div>
                )}
            </div>

            {/* Center: Data HUD */}
            <div className="hidden md:flex items-center space-x-6">
                {latestAnalysis && (
                    <>
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
                    </>
                )}
            </div>

            {/* Right: Tools */}
            <div className="flex items-center space-x-2">
                <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" title="Long Position Tool">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
                <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" title="Short Position Tool">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2"></div>
                <ThemeToggleButton />
            </div>
        </div>
    );
};

const DataPoint: React.FC<{ label: string; value: number | string; color: string; onCopy: () => void; isCopied: boolean }> = ({ label, value, color, onCopy, isCopied }) => (
    <div 
        onClick={onCopy}
        className="flex flex-col items-center cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-800/50 px-2 py-1 rounded transition-colors"
    >
        <span className="text-[9px] text-gray-500 font-mono tracking-wider mb-0.5">{label}</span>
        <div className="flex items-center">
            <span className={`text-sm font-mono font-medium ${color}`}>{value}</span>
            {isCopied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </div>
    </div>
);
