
import React from 'react';
import { SignalDisplay } from './SignalDisplay';
import type { SignalData } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';

interface AnalysisPageProps {
    data: SignalData;
    onBack: () => void;
    onLogout: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ data, onBack, onLogout }) => {
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
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in pb-20">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-12 flex justify-between items-center">
                    <button onClick={onBack} className="group flex items-center text-sm font-black text-gray-600 dark:text-green-400 hover:text-green-300 transition-all uppercase tracking-widest">
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
                    </div>
                    <div className="flex items-center space-x-3">
                        <ThemeToggleButton />
                        <button
                            onClick={onLogout}
                            className="bg-gray-100 dark:bg-white/5 border border-white/5 text-gray-500 dark:text-green-400 hover:bg-red-500/10 hover:text-red-400 px-4 py-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
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
                        bg-white/90 dark:bg-dark-card/90 backdrop-blur-2xl p-6 sm:p-10 rounded-2xl border-2 
                        transition-all duration-500 transform shadow-2xl relative overflow-hidden
                        ${accentBorderClass}
                    `}>
                        {/* Interactive Scanline */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent h-[200%] pointer-events-none animate-shimmer"></div>
                        
                        <SignalDisplay data={data} />
                    </div>
                    
                    {/* Decorative Data Streamers */}
                    <div className="absolute top-1/2 -left-12 transform -rotate-90 hidden lg:block">
                        <span className="text-[10px] font-mono text-gray-500 opacity-30 uppercase tracking-[1em]">SYSTEM_STABLE_V4.2</span>
                    </div>
                </main>
            </div>
            
            <footer className="w-full text-center mt-12 px-4 sm:px-6 lg:px-8 text-gray-600 dark:text-dark-text/40 text-[10px] font-black uppercase tracking-[0.3em]">
                 <div className="flex flex-col items-center">
                    <p className="max-w-xl mx-auto opacity-70 mb-2">
                        Institutional analysis strictly for data validation. Follow the edge. Preserve the capital.
                    </p>
                    <p className="mt-2 text-green-600 dark:text-green-400">
                        ma8138498@gmail.com
                    </p>
                 </div>
            </footer>
        </div>
    );
};
