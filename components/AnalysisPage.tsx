
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SignalDisplay } from './SignalDisplay';
import { AnnotatedChart } from './AnnotatedChart';
import type { SignalData } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';
import { updateTradeOutcome } from '../services/historyService';

interface AnalysisPageProps {
    data: SignalData;
    image: string | null;
    onBack: () => void;
    onLogout: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ data, image, onBack, onLogout }) => {
    const [outcome, setOutcome] = useState<'Win' | 'Loss' | 'No Trade' | 'Pending'>('Pending');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleOutcomeSelect = async (newOutcome: 'Win' | 'Loss' | 'No Trade') => {
        if (!data.id) return;
        setIsUpdating(true);
        try {
            await updateTradeOutcome(data.id, newOutcome);
            setOutcome(newOutcome);
        } catch (e) {
            console.error("Failed to update outcome:", e);
        } finally {
            setIsUpdating(false);
        }
    };

    const isBuy = data.signal === 'BUY';
    const isSell = data.signal === 'SELL';
    
    // Determine glow and border colors based on signal
    const accentBorderClass = isBuy 
        ? 'border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.15)]' 
        : isSell 
            ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.15)]' 
            : 'border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)]';

    const cornerClass = isBuy ? 'border-green-500' : isSell ? 'border-red-500' : 'border-blue-500';

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 pb-20"
        >
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-12 flex justify-between items-center">
                    <button onClick={onBack} className="group flex items-center text-sm font-black text-gray-700 dark:text-green-400 hover:text-green-300 transition-all uppercase tracking-widest">
                        <div className="bg-gray-200 dark:bg-green-500/10 p-2 rounded-full mr-3 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                            </svg>
                        </div>
                        GreyAlpha
                    </button>
                    <div className="flex flex-col items-center">
                         <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-[-0.05em] italic ${isBuy ? 'text-green-500' : isSell ? 'text-red-500' : 'text-blue-500'}`}>
                            QUANT DOSSIER
                        </h1>
                        <div className="flex items-center gap-1 mt-1">
                            <div className="h-1 w-12 bg-current opacity-50 rounded-full"></div>
                            <div className="h-1 w-2 bg-current opacity-30 rounded-full"></div>
                        </div>
                        {data.tradeMode && (
                            <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                data.tradeMode === 'Sniper' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                                : 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                            }`}>
                                {data.tradeMode === 'Sniper' ? '🎯 Sniper Mode' : '🔥 Aggressive Mode'}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <ThemeToggleButton />
                        <button
                            onClick={onLogout}
                            className="bg-white/80 dark:bg-slate-800/40 backdrop-blur-sm border border-gray-200 dark:border-white/10 text-gray-700 dark:text-green-400 hover:bg-red-500/20 hover:text-red-400 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-md"
                            aria-label="Logout"
                        >
                            Exit
                        </button>
                    </div>
                </header>

                <main className="relative group flex-grow perspective-1000">
                    {/* High-Tech HUD Brackets */}
                    <div className={`absolute -top-3 -left-3 w-10 h-10 border-t-4 border-l-4 z-10 transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1 ${cornerClass}`}></div>
                    <div className={`absolute -top-3 -right-3 w-10 h-10 border-t-4 border-r-4 z-10 transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-1 ${cornerClass}`}></div>
                    <div className={`absolute -bottom-3 -left-3 w-10 h-10 border-b-4 border-l-4 z-10 transition-all duration-700 group-hover:-translate-x-1 group-hover:translate-y-1 ${cornerClass}`}></div>
                    <div className={`absolute -bottom-3 -right-3 w-10 h-10 border-b-4 border-r-4 z-10 transition-all duration-700 group-hover:translate-x-1 group-hover:translate-y-1 ${cornerClass}`}></div>

                    <div className={`
                        bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-6 sm:p-10 rounded-2xl border border-gray-200 dark:border-white/10 
                        transition-all duration-500 transform shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden
                        ${accentBorderClass}
                    `}>
                        {/* Interactive Scanline */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent h-[200%] pointer-events-none animate-shimmer"></div>
                        
                        <SignalDisplay data={data} />

                        {image && (
                            <AnnotatedChart imageSrc={image} data={data} />
                        )}

                        {/* Trade Journaling Section */}
                        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-white/10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-widest text-gray-800 dark:text-green-400">
                                        Journal Outcome
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Marking your trade helps the AI learn and improve future signals.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        disabled={isUpdating || outcome !== 'Pending'}
                                        onClick={() => handleOutcomeSelect('Win')}
                                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            outcome === 'Win'
                                                ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-500'
                                        } disabled:opacity-50`}
                                    >
                                        Win
                                    </button>
                                    <button
                                        disabled={isUpdating || outcome !== 'Pending'}
                                        onClick={() => handleOutcomeSelect('Loss')}
                                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            outcome === 'Loss'
                                                ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-500'
                                        } disabled:opacity-50`}
                                    >
                                        Loss
                                    </button>
                                    <button
                                        disabled={isUpdating || outcome !== 'Pending'}
                                        onClick={() => handleOutcomeSelect('No Trade')}
                                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            outcome === 'No Trade'
                                                ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
                                                : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-blue-500/20 hover:text-blue-500'
                                        } disabled:opacity-50`}
                                    >
                                        No Trade
                                    </button>
                                </div>
                            </div>
                            
                            {outcome !== 'Pending' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center"
                                >
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
                                        ✓ Outcome Logged. Data sent to Oracle for Global Learning.
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </div>
                    
                    {/* Decorative Data Streamers */}
                    <div className="absolute top-1/2 -left-12 transform -rotate-90 hidden lg:block">
                        <span className="text-[10px] font-mono text-gray-600 dark:text-gray-500 opacity-30 uppercase tracking-[1em]">SYSTEM_STABLE_V4.2</span>
                    </div>
                </main>
            </div>
            
            <footer className="w-full text-center mt-12 px-4 sm:px-6 lg:px-8 text-gray-700 dark:text-dark-text/40 text-[10px] font-black uppercase tracking-[0.3em]">
                 <div className="flex flex-col items-center">
                    <p className="max-w-xl mx-auto opacity-70 mb-2">
                        Institutional analysis strictly for data validation. Follow the edge. Preserve the capital.
                    </p>
                    <p className="mt-2 text-green-600 dark:text-green-400">
                        ma8138498@gmail.com
                    </p>
                 </div>
            </footer>
        </motion.div>
    );
};
