
import React, { useState, useEffect } from 'react';
import type { SignalData } from '../types';
import { getHistory, clearHistory, updateTradeOutcome } from '../services/historyService';
import { ThemeToggleButton } from './ThemeToggleButton';
import { Trophy, Skull, Activity, Check } from 'lucide-react';

interface HistoryPageProps {
    onSelectAnalysis: (data: SignalData) => void;
    onBack: () => void;
    onLogout: () => void;
}

const getSignalClasses = (signal: SignalData['signal']) => {
    switch (signal) {
        case 'BUY': return 'text-emerald-400 bg-emerald-900/40 border border-emerald-500/20';
        case 'SELL': return 'text-rose-400 bg-rose-900/40 border border-rose-500/20';
        default: return 'text-slate-400 bg-slate-900/40 border border-slate-500/20';
    }
};

const HistoryItem: React.FC<{ data: SignalData; onOutcomeUpdate: (id: string, outcome: 'Win' | 'Loss') => void }> = ({ data, onOutcomeUpdate }) => {
    return (
        <li 
            className="group bg-white/60 dark:bg-slate-800/20 backdrop-blur-sm border border-gray-200 dark:border-white/5 shadow-md p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 hover:shadow-xl hover:bg-white/80 dark:hover:bg-slate-800/40"
        >
            <div className="flex items-center gap-4 flex-grow">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    data.signal === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 
                    data.signal === 'SELL' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                }`}>
                    {data.signal === 'BUY' ? <Trophy className="w-5 h-5" /> : data.signal === 'SELL' ? <Skull className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                </div>
                <div>
                    <h4 className="font-black tracking-tight text-gray-900 dark:text-emerald-400">{data.asset}</h4>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
                        {new Date(data.timestamp).toLocaleString()} • {data.timeframe}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${getSignalClasses(data.signal)}`}>
                        {data.signal}
                    </span>
                    {data.outcome && data.outcome !== 'Pending' && (
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 ${
                            data.outcome === 'Win' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                            <Check className="w-3 h-3" /> {data.outcome}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onOutcomeUpdate(data.id, 'Win')}
                        className={`p-2 rounded-xl border transition-all ${
                            data.outcome === 'Win' 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20'
                        }`}
                        title="Mark as Win"
                    >
                        <Trophy className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onOutcomeUpdate(data.id, 'Loss')}
                        className={`p-2 rounded-xl border transition-all ${
                            data.outcome === 'Loss' 
                                ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' 
                                : 'bg-rose-500/5 border-rose-500/10 text-rose-600 dark:text-rose-500 hover:bg-rose-500/20'
                        }`}
                        title="Mark as Loss"
                    >
                        <Skull className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button 
                        onClick={() => {/* Use existing onSelect */}}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition-colors"
                        title="View Details"
                    >
                        <Activity className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </li>
    );
};

export const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectAnalysis, onBack, onLogout }) => {
    const [history, setHistory] = useState<SignalData[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    
    useEffect(() => {
        const fetchHistory = async () => {
            const data = await getHistory();
            setHistory(data);
        };
        fetchHistory();
    }, []);

    const handleOutcomeUpdate = async (id: string, outcome: 'Win' | 'Loss') => {
        try {
            await updateTradeOutcome(id, outcome);
            setHistory(prev => prev.map(item => item.id === id ? { ...item, outcome } : item));
        } catch (e) {
            console.error("Failed to update trade outcome:", e);
        }
    };

    const handleClearHistory = async () => {
        await clearHistory();
        setHistory([]);
        setShowClearConfirm(false);
    };

    const handleDownloadHistory = () => {
        if (history.length === 0) return;

        const headers = [
            "Timestamp", "Asset", "Timeframe", "Signal", "Confidence", 
            "Entry Points", "Stop Loss", "Take Profits", "Reasoning",
            "Checklist", "Invalidation Scenario", "Sources"
        ];
        
        const escapeCsvCell = (cellData: string | number) => {
            const stringData = String(cellData);
            if (/[",\n]/.test(stringData)) {
                return `"${stringData.replace(/"/g, '""')}"`;
            }
            return stringData;
        };

        const csvRows = history.map(row => {
            const timestamp = new Date(row.timestamp).toLocaleString();
            const takeProfits = row.takeProfits.join(' | ');
            const reasoning = row.reasoning.join(' | ');
            const checklist = row.checklist ? row.checklist.join(' | ') : '';
            const invalidation = row.invalidationScenario || '';
            const sources = row.sources ? row.sources.map(s => s.uri).join(' | ') : '';
            const entryPoints = row.entryPoints.join(' | ');

            return [
                escapeCsvCell(timestamp), escapeCsvCell(row.asset), escapeCsvCell(row.timeframe),
                escapeCsvCell(row.signal), row.confidence, escapeCsvCell(entryPoints), row.stopLoss,
                escapeCsvCell(takeProfits), escapeCsvCell(reasoning), 
                escapeCsvCell(checklist), escapeCsvCell(invalidation), escapeCsvCell(sources)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'greyalpha_analysis_history.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
         <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in">
             <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                 <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-700 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        New Analysis
                    </button>
                     <h1 className="text-2xl font-bold text-gray-800 dark:text-green-400">
                        Analysis History
                    </h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                        <button 
                            onClick={onLogout} 
                            className="text-gray-700 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium"
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    </div>
                 </header>

                <main className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-4">
                    {history.length > 0 ? (
                        <>
                            <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {history.map(item => (
                                    <HistoryItem 
                                        key={item.id} 
                                        data={item} 
                                        onOutcomeUpdate={handleOutcomeUpdate} 
                                    />
                                ))}
                            </ul>
                            <div className="pt-4 border-t border-gray-300 dark:border-green-500/30 flex justify-between items-center">
                                <button
                                    onClick={handleDownloadHistory}
                                    className="flex items-center text-xs font-medium text-green-600 dark:text-green-400 hover:underline"
                                    aria-label="Download history as CSV"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </button>
                                <div className="relative">
                                    {!showClearConfirm ? (
                                        <button
                                            onClick={() => setShowClearConfirm(true)}
                                            className="text-xs font-medium text-red-500 dark:text-red-400 hover:underline"
                                        >
                                            Clear History
                                        </button>
                                    ) : (
                                        <div className="flex items-center space-x-2 animate-fade-in">
                                            <span className="text-xs text-red-400">Are you sure?</span>
                                            <button 
                                                onClick={handleClearHistory}
                                                className="px-2 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-500"
                                            >
                                                Yes, Clear
                                            </button>
                                            <button 
                                                onClick={() => setShowClearConfirm(false)}
                                                className="px-2 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-lg font-medium text-gray-800 dark:text-green-400">No History Found</h3>
                            <p className="mt-1 text-sm text-gray-700 dark:text-dark-text-secondary">Your completed analyses will appear here.</p>
                        </div>
                    )}
                </main>
             </div>
        </div>
    );
};
