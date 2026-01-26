
import React, { useState, useCallback, useEffect } from 'react';
import { SignalGeneratorForm } from './SignalGeneratorForm';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { generateTradingSignal } from '../services/geminiService';
import type { SignalData, AnalysisRequest } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';
import { MarketOverview } from './MarketOverview';
import { getAnalysisCount, incrementAnalysisCount, resetAnalysisCount } from '../services/analysisCountService';
import { RiskCalculator } from './RiskCalculator';
import { CheatSheet } from './CheatSheet';

interface HomePageProps {
    onLogout: () => void;
    onAnalysisComplete: (data: Omit<SignalData, 'id' | 'timestamp'>) => void;
    onNavigateToHistory: () => void;
    onNavigateToNews: () => void;
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
}> = ({ onClick, 'aria-label': ariaLabel, icon, label }) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        className="group flex items-center justify-center h-14 w-14 md:w-auto md:px-4 md:py-2 rounded-full md:rounded-lg text-green-400 hover:bg-dark-card/80 transition-all duration-300 border-2 border-transparent hover:border-green-500/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-dark-bg"
    >
        {icon}
        <span className="hidden md:inline md:ml-2 text-sm font-semibold">{label}</span>
    </button>
);

export const HomePage: React.FC<HomePageProps> = ({ onLogout, onAnalysisComplete, onNavigateToHistory, onNavigateToNews, onNavigateToChat, onNavigateToPredictor, onNavigateToCharting, onNavigateToProducts, onAssetSelect }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisCount, setAnalysisCount] = useState<number>(0);
    const [profitMode, setProfitMode] = useState<boolean>(false);
    const [showRiskCalc, setShowRiskCalc] = useState<boolean>(false);
    const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);

    useEffect(() => {
        setAnalysisCount(getAnalysisCount());
    }, []);

    const handleResetAnalysisCount = useCallback(() => {
        resetAnalysisCount();
        setAnalysisCount(0);
    }, []);

    const handleGenerateSignal = useCallback(async (request: AnalysisRequest) => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await generateTradingSignal(request);
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
    
    const iconClasses = "h-6 w-6 group-hover:scale-110 transition-transform";

    const navItems = [
        {
            onClick: onNavigateToPredictor,
            label: 'Predictor',
            ariaLabel: 'Open Catalyst Predictor',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        },
        {
            onClick: onNavigateToCharting,
            label: 'Charting',
            ariaLabel: 'Open Charting Platform',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
        },
        {
            onClick: onNavigateToChat,
            label: 'Chat',
            ariaLabel: 'Open Oracle Chat',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        },
        {
            onClick: () => setShowRiskCalc(true),
            label: 'Risk Calc',
            ariaLabel: 'Open Position Size Calculator',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        },
        {
            onClick: () => setShowCheatSheet(true),
            label: 'Academy',
            ariaLabel: 'Open Tactical Academy',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        },
        {
            onClick: onNavigateToProducts,
            label: 'Products',
            ariaLabel: 'Open GreyAlpha Products',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
        },
        {
            onClick: onNavigateToNews,
            label: 'News',
            ariaLabel: 'View market news',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h3m-3 4h3m-3 4h3m-3 4h3" /></svg>
        },
        {
            onClick: onNavigateToHistory,
            label: 'History',
            ariaLabel: 'View analysis history',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            onClick: onLogout,
            label: 'Logout',
            ariaLabel: 'Logout',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
        },
    ];

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300">
            {isLoading && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
                    <Loader />
                </div>
            )}
            
            {showRiskCalc && <RiskCalculator onClose={() => setShowRiskCalc(false)} />}
            {showCheatSheet && <CheatSheet onClose={() => setShowCheatSheet(false)} />}

            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="text-center mb-6 relative">
                     <div className="absolute top-0 right-0">
                        <ThemeToggleButton />
                    </div>
                    <svg className="h-16 w-16 mx-auto mb-4" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
                            <style>
                                {`
                                    .sparkle {
                                        animation: sparkle-anim 2.5s ease-in-out infinite;
                                        transform-origin: center;
                                    }
                                    @keyframes sparkle-anim {
                                        0%, 100% { opacity: 0; transform: scale(0.5); }
                                        50% { opacity: 1; transform: scale(1.2); }
                                    }
                                `}
                            </style>
                        </defs>

                        {/* Sparkles */}
                        <path d="M38 14 L40 10 L42 14 L46 16 L42 18 L40 22 L38 18 L34 16 Z" fill="#6ee7b7" className="sparkle" style={{ animationDelay: '0s' }} />
                        <path d="M18 50 L20 46 L22 50 L26 52 L22 54 L20 58 L18 54 L14 52 Z" fill="#a7f3d0" className="sparkle" style={{ animationDelay: '1.2s' }} />

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
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight animated-gradient-text animate-animated-gradient">
                        GreyAlpha
                    </h1>
                    <p className="mt-3 text-lg text-gray-600 dark:text-dark-text/80">
                        AI-powered quantitative trading and market analysis.
                    </p>
                </header>

                <nav className="mb-8 flex justify-center items-center flex-wrap gap-3 sm:gap-4">
                    {navItems.map(item => (
                        <NavButton
                            key={item.label}
                            onClick={item.onClick}
                            aria-label={item.ariaLabel}
                            icon={item.icon}
                            label={item.label}
                        />
                    ))}
                </nav>

                <main>
                   <MarketOverview 
                        analysisCount={analysisCount} 
                        onResetCount={handleResetAnalysisCount} 
                        onAssetSelect={onAssetSelect}
                        profitMode={profitMode}
                   />
                   <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl">
                        {error ? (
                             <div className="min-h-[400px] flex flex-col items-center justify-center">
                                <ErrorMessage message={error} />
                                <button
                                    onClick={() => setError(null)}
                                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <SignalGeneratorForm 
                                onSubmit={handleGenerateSignal} 
                                isLoading={isLoading} 
                                profitMode={profitMode}
                                onProfitModeChange={setProfitMode}
                            />
                        )}
                   </div>
                </main>
            </div>
            <footer className="w-full text-center pt-12 pb-8 px-4 sm:px-6 lg:px-8 text-gray-600 dark:text-dark-text/60 text-sm">
                <p>This is not financial advice. All analysis is for informational purposes only.</p>
                <p className="mt-2">
                    Contact: <a href="mailto:ma8138498@gmail.com" className="font-medium text-green-600 dark:text-green-400 hover:underline">ma8138498@gmail.com</a>
                </p>
            </footer>
        </div>
    );
};
