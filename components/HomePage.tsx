
import React, { useState, useCallback, useEffect } from 'react';
import { SignalGeneratorForm } from './SignalGeneratorForm';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { generateTradingSignal } from '../services/geminiService';
import type { SignalData, AnalysisRequest, UserSettings } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';
import { MarketOverview } from './MarketOverview';
import { getAnalysisCount, incrementAnalysisCount, resetAnalysisCount } from '../services/analysisCountService';
import { RiskCalculator } from './RiskCalculator';
import { CheatSheet } from './CheatSheet';
import { SettingsModal } from './SettingsModal';
import { PacificTimeClock } from './PacificTimeClock';

interface HomePageProps {
    onLogout: () => void;
    onAnalysisComplete: (data: Omit<SignalData, 'id' | 'timestamp'>) => void;
    onNavigateToHistory: () => void;
    onNavigateToChat: () => void;
    onNavigateToPredictor: () => void;
    onNavigateToCharting: () => void;
    onNavigateToProducts: () => void; 
    onAssetSelect?: (asset: string) => void;
}

const NavButton: React.FC<{
    onClick: () => void;
    'aria-label': string;
    icon: React.ReactNode;
    label: string;
    delay: string;
}> = ({ onClick, 'aria-label': ariaLabel, icon, label, delay }) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        style={{ animationDelay: delay }}
        className="opacity-0 animate-flip-3d group flex items-center justify-center h-14 w-14 md:w-auto md:px-5 md:py-2.5 rounded-2xl text-green-400 bg-gray-200/50 dark:bg-dark-card/40 backdrop-blur-md transition-all duration-300 border border-white/5 hover:border-green-500/50 hover:scale-110 active:scale-95 shadow-lg"
    >
        {icon}
        <span className="hidden md:inline md:ml-3 text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
);

export const HomePage: React.FC<HomePageProps> = ({ onLogout, onAnalysisComplete, onNavigateToHistory, onNavigateToChat, onNavigateToPredictor, onNavigateToCharting, onNavigateToProducts, onAssetSelect }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisCount, setAnalysisCount] = useState<number>(0);
    const [profitMode, setProfitMode] = useState<boolean>(false);
    const [showRiskCalc, setShowRiskCalc] = useState<boolean>(false);
    const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    useEffect(() => {
        setAnalysisCount(getAnalysisCount());
    }, []);

    const handleResetAnalysisCount = useCallback(() => {
        resetAnalysisCount();
        setAnalysisCount(0);
    }, []);

    const handleGenerateSignal = useCallback(async (requestData: Omit<AnalysisRequest, 'userSettings' | 'globalContext' | 'learnedStrategies'>) => {
        setIsLoading(true);
        setError(null);

        try {
            const storedSettings = localStorage.getItem('greyquant_user_settings');
            const userSettings = storedSettings ? JSON.parse(storedSettings) as UserSettings : undefined;

            const fullRequest: AnalysisRequest = {
                ...requestData,
                userSettings,
            };

            const data = await generateTradingSignal(fullRequest);
            const newCount = incrementAnalysisCount();
            setAnalysisCount(newCount);
            onAnalysisComplete(data);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [onAnalysisComplete]);
    
    const iconClasses = "h-5 w-5 group-hover:rotate-12 transition-transform";

    const navItems = [
        {
            onClick: onNavigateToPredictor,
            label: 'Predictor',
            ariaLabel: 'Open Catalyst Predictor',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        },
        {
            onClick: onNavigateToCharting,
            label: 'Charting',
            ariaLabel: 'Open Charting Platform',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
        },
        {
            onClick: onNavigateToChat,
            label: 'Chat',
            ariaLabel: 'Open Oracle Chat',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        },
        {
            onClick: () => setShowRiskCalc(true),
            label: 'Risk Calc',
            ariaLabel: 'Open Position Size Calculator',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        },
        {
            onClick: () => setShowCheatSheet(true),
            label: 'Academy',
            ariaLabel: 'Open Tactical Academy',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        },
        {
            onClick: onNavigateToProducts,
            label: 'Products',
            ariaLabel: 'Open GreyAlpha Products',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        },
        {
            onClick: onNavigateToHistory,
            label: 'History',
            ariaLabel: 'View analysis history',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            onClick: onLogout,
            label: 'Logout',
            ariaLabel: 'Logout',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
        },
    ];

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 pb-20">
            <PacificTimeClock />
            {isLoading && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
                    <Loader />
                </div>
            )}
            
            {showRiskCalc && <RiskCalculator onClose={() => setShowRiskCalc(false)} />}
            {showCheatSheet && <CheatSheet onClose={() => setShowCheatSheet(false)} />}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col perspective-1000">
                <header className="text-center mb-10 relative opacity-0 animate-flip-3d" style={{ animationDelay: '50ms' }}>
                     <div className="absolute top-0 right-0 flex items-center gap-2">
                        <ThemeToggleButton />
                    </div>
                    <button onClick={() => setShowSettings(true)} className="block mx-auto cursor-pointer group focus:outline-none focus:ring-2 focus:ring-green-400/50 rounded-2xl p-2" title="Open Settings">
                        <svg className="h-16 w-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <defs>
                                <filter id="brilliantGlow" x="-100%" y="-100%" width="300%" height="300%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0" result="glow" />
                                    <feComposite in="SourceGraphic" in2="glow" operator="over" />
                                </filter>
                                <linearGradient id="greenCandleFill" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#6ee7b7" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                                <linearGradient id="darkGreenCandleFill" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#059669" />
                                    <stop offset="100%" stopColor="#047857" />
                                </linearGradient>
                            </defs>
                            <g className="animate-bounce-candle origin-center [animation-delay:-0.2s]" filter="url(#brilliantGlow)">
                                <path d="M20 12V20" stroke="#065f46" strokeWidth="3" strokeLinecap="round"/>
                                <rect x="16" y="20" width="8" height="18" rx="1" fill="url(#darkGreenCandleFill)"/>
                                <path d="M20 38V48" stroke="#065f46" strokeWidth="3" strokeLinecap="round"/>
                            </g>
                            <g className="animate-bounce-candle origin-center" filter="url(#brilliantGlow)">
                                <path d="M44 16V26" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
                                <rect x="40" y="26" width="8" height="18" rx="1" fill="url(#greenCandleFill)"/>
                                <path d="M44 44V52" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
                            </g>
                        </svg>
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight animated-gradient-text animate-animated-gradient group-hover:brightness-110 transition-all italic uppercase tracking-[-0.05em]">
                            GreyAlpha Hub
                        </h1>
                    </button>
                    <p className="mt-3 text-sm font-black text-gray-500 dark:text-dark-text/40 uppercase tracking-[0.4em]">
                        Autonomous Neural Trading Architecture
                    </p>
                </header>

                <nav className="mb-12 flex justify-center items-center flex-wrap gap-3 sm:gap-4">
                    {navItems.map((item, idx) => (
                        <NavButton
                            key={item.label}
                            onClick={item.onClick}
                            aria-label={item.ariaLabel}
                            icon={item.icon}
                            label={item.label}
                            delay={`${100 + (idx * 50)}ms`}
                        />
                    ))}
                </nav>

                <main className="relative group">
                   <div className="opacity-0 animate-flip-3d" style={{ animationDelay: '400ms' }}>
                       <MarketOverview 
                            analysisCount={analysisCount} 
                            onResetCount={handleResetAnalysisCount} 
                            onAssetSelect={onAssetSelect}
                            profitMode={profitMode}
                       />
                   </div>

                   <div className="opacity-0 animate-flip-3d relative" style={{ animationDelay: '550ms' }}>
                        {/* High-Tech HUD Brackets for Form */}
                        <div className="absolute -top-3 -left-3 w-10 h-10 border-t-4 border-l-4 z-10 border-green-500/50 transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1"></div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 border-t-4 border-r-4 z-10 border-green-500/50 transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-1"></div>
                        <div className="absolute -bottom-3 -left-3 w-10 h-10 border-b-4 border-l-4 z-10 border-green-500/50 transition-all duration-700 group-hover:-translate-x-1 group-hover:translate-y-1"></div>
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 border-b-4 border-r-4 z-10 border-green-500/50 transition-all duration-700 group-hover:translate-x-1 group-hover:translate-y-1"></div>

                        <div className="bg-white/90 dark:bg-dark-card/90 backdrop-blur-2xl p-6 sm:p-10 rounded-2xl border-2 border-green-500/20 shadow-2xl relative overflow-hidden">
                             {/* Interactive Scanline */}
                             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent h-[200%] pointer-events-none animate-shimmer"></div>
                             
                            {error ? (
                                 <div className="min-h-[400px] flex flex-col items-center justify-center relative z-10">
                                    <ErrorMessage message={error} />
                                    <button
                                        onClick={() => setError(null)}
                                        className="mt-6 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-red-600 rounded-xl hover:bg-red-500 transition-all shadow-lg hover:shadow-red-500/30"
                                    >
                                        Reconnect Lane
                                    </button>
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <SignalGeneratorForm 
                                        onSubmit={handleGenerateSignal} 
                                        isLoading={isLoading} 
                                        profitMode={profitMode}
                                        onProfitModeChange={setProfitMode}
                                    />
                                </div>
                            )}
                        </div>
                   </div>
                </main>
            </div>
            <footer className="w-full text-center mt-12 px-4 sm:px-6 lg:px-8 text-gray-600 dark:text-dark-text/40 text-[10px] font-black uppercase tracking-[0.3em]">
                <div className="flex flex-col items-center">
                    <p className="max-w-xl mx-auto opacity-70">
                        Operational parameters within acceptable bounds. Preserve capital at all costs.
                    </p>
                    <p className="mt-4">
                        Contact Command: <a href="mailto:ma8138498@gmail.com" className="font-black text-green-600 dark:text-green-400 hover:underline">ma8138498@gmail.com</a>
                    </p>
                </div>
            </footer>
        </div>
    );
};
