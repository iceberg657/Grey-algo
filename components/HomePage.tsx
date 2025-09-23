import React, { useState, useCallback, useEffect } from 'react';
import { SignalGeneratorForm } from './SignalGeneratorForm';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { generateTradingSignal } from '../services/geminiService';
import type { SignalData, AnalysisRequest } from '../types';

interface HomePageProps {
    onLogout: () => void;
    onAnalysisComplete: (data: Omit<SignalData, 'id' | 'timestamp'>) => void;
    onNavigateToHistory: () => void;
    onNavigateToNews: () => void;
    onNavigateToChat: () => void;
    onNavigateToPredictor: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onLogout, onAnalysisComplete, onNavigateToHistory, onNavigateToNews, onNavigateToChat, onNavigateToPredictor }) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleGenerateSignal = useCallback(async (request: AnalysisRequest) => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await generateTradingSignal(request);
            onAnalysisComplete(data);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [onAnalysisComplete]);

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300">
            <div className="w-full max-w-2xl mx-auto">
                <header className="text-center mb-8 relative">
                     <div className="absolute top-0 left-0">
                         <button 
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-500 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-dark-card transition-colors"
                            aria-label="Toggle theme"
                         >
                            {theme === 'dark' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            ) : (
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM5 11a1 1 0 100-2H4a1 1 0 100 2h1z" clipRule="evenodd" />
                                </svg>
                            )}
                         </button>
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
                        Grey Algo Chart Analyzer
                    </h1>
                    <p className="mt-3 text-lg text-gray-600 dark:text-dark-text/80">
                        Upload your chart and let AI find your next trade.
                    </p>
                    <div className="absolute top-0 right-0 flex items-center space-x-2">
                        <button 
                            onClick={onNavigateToPredictor}
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium p-2"
                            aria-label="Open Catalyst Predictor"
                        >
                            Predictor
                        </button>
                        <button 
                            onClick={onNavigateToChat}
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium p-2"
                            aria-label="Open Oracle Chat"
                        >
                            Chat
                        </button>
                        <button 
                            onClick={onNavigateToNews}
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium p-2"
                            aria-label="View market news"
                        >
                            News
                        </button>
                        <button 
                            onClick={onNavigateToHistory}
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium p-2"
                            aria-label="View analysis history"
                        >
                            History
                        </button>
                        <button 
                            onClick={onLogout} 
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium p-2"
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main>
                   <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl">
                        {isLoading ? (
                            <div className="min-h-[400px] flex items-center justify-center">
                                <Loader />
                            </div>
                        ) : error ? (
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
                            <SignalGeneratorForm onSubmit={handleGenerateSignal} isLoading={isLoading} />
                        )}
                   </div>
                </main>
            </div>
            <footer className="text-center mt-auto pt-12 text-gray-600 dark:text-dark-text/60 text-sm">
                <p>This is not financial advice. All analysis is for informational purposes only.</p>
                <p className="mt-2">
                    Contact: <a href="mailto:ma8138498@gmail.com" className="font-medium text-green-600 dark:text-green-400 hover:underline">ma8138498@gmail.com</a>
                </p>
            </footer>
        </div>
    );
};