import React, { useState, useCallback, useEffect } from 'react';
import { SignalGeneratorForm } from './SignalGeneratorForm';
import { SignalDisplay } from './SignalDisplay';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { generateTradingSignal } from '../services/geminiService';
import type { SignalData, AnalysisRequest } from '../types';

interface ChartAnalyzerPageProps {
    onLogout: () => void;
}

export const ChartAnalyzerPage: React.FC<ChartAnalyzerPageProps> = ({ onLogout }) => {
    const [signalData, setSignalData] = useState<SignalData | null>(null);
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

    const handleClearAnalysis = () => {
        setSignalData(null);
        setError(null);
    };

    const handleGenerateSignal = useCallback(async (request: AnalysisRequest) => {
        setIsLoading(true);
        setError(null);
        setSignalData(null);

        try {
            const data = await generateTradingSignal(request);
            setSignalData(data);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <div className="min-h-screen text-gray-800 dark:text-gray-200 font-sans p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300">
            <div className="w-full max-w-md mx-auto">
                <header className="text-center mb-8 relative">
                     <div className="absolute top-0 left-0">
                         <button 
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-red-500">
                        Grey Algo Chart Analyzer
                    </h1>
                    <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                        Upload your chart and let AI find your next trade.
                    </p>
                    <div className="absolute top-0 right-0">
                        <button 
                            onClick={onLogout} 
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm p-2"
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main>
                   <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-2xl">
                        <SignalGeneratorForm onSubmit={handleGenerateSignal} isLoading={isLoading} />
                        
                        <div className="mt-8 pt-8 border-t border-gray-300 dark:border-gray-700/50 min-h-[200px] relative">
                             {(signalData || error) && !isLoading && (
                                <button 
                                    onClick={handleClearAnalysis}
                                    className="absolute -top-5 right-0 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs p-1 flex items-center font-medium"
                                    aria-label="Clear analysis"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    Clear
                                </button>
                            )}
                            <div className="flex items-center justify-center">
                                {isLoading && <Loader />}
                                {error && <ErrorMessage message={error} />}
                                {signalData && !isLoading && <SignalDisplay data={signalData} />}
                                {!signalData && !isLoading && !error && (
                                    <div className="text-center text-gray-600 dark:text-gray-500">
                                        <h3 className="text-base font-medium text-gray-800 dark:text-gray-300">Your trade analysis will appear here.</h3>
                                        <p className="mt-1 text-sm">Upload a chart and click "Analyze" to begin.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                   </div>
                </main>
            </div>
            <footer className="text-center mt-auto pt-12 text-gray-600 dark:text-gray-500 text-sm">
                <p>This is a trading advise.</p>
            </footer>
        </div>
    );
};