
import React, { useState, useCallback, useEffect } from 'react';
import { SignalGeneratorForm } from './SignalGeneratorForm';
import { SignalDisplay } from './SignalDisplay';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { generateTradingSignal } from '../services/geminiService';
import type { SignalData, AnalysisRequest } from '../types';

const formatAnalysisForClipboard = (data: SignalData) => {
    return `
🚨 **SIGNAL ALERT: ${data.asset}** 🚨
--------------------------------
**BIAS:** ${data.signal} ${data.signal === 'BUY' ? '🟢' : data.signal === 'SELL' ? '🔴' : '⚪'}
**CONFIDENCE:** ${data.confidence}%
**TIMEFRAME:** ${data.timeframe}
**STYLE:** ${data.entryType}

📍 **ENTRY:** ${data.entryPoints.join(' | ')}
🛑 **STOP LOSS:** ${data.stopLoss}
🎯 **TAKE PROFIT:** ${data.takeProfits.join(' | ')}

📝 **LOGIC:**
${data.reasoning.map((r, i) => `${i+1}. ${r}`).join('\n')}

⚠️ **INVALIDATION:** ${data.invalidationScenario}

📊 **SENTIMENT:** ${data.sentiment?.summary || 'N/A'}
`.trim();
};

interface ChartAnalyzerPageProps {
    onLogout: () => void;
}

export const ChartAnalyzerPage: React.FC<ChartAnalyzerPageProps> = ({ onLogout }) => {
    const [signalData, setSignalData] = useState<SignalData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [profitMode, setProfitMode] = useState<boolean>(false);
    const [lastRequest, setLastRequest] = useState<AnalysisRequest | null>(null);
    const [isCopied, setIsCopied] = useState(false);

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
        // We keep lastRequest so user can still re-analyze if they want, or maybe clear it? 
        // Let's keep it for now.
    };

    const handleGenerateSignal = useCallback(async (request: AnalysisRequest) => {
        setIsLoading(true);
        setError(null);
        setSignalData(null);
        setLastRequest(request);

        try {
            const data = await generateTradingSignal(request);
            const fullData: SignalData = {
                ...data,
                id: Date.now().toString(),
                timestamp: Date.now()
            };
            setSignalData(fullData);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleReAnalyze = useCallback(() => {
        if (lastRequest) {
            handleGenerateSignal(lastRequest);
        }
    }, [lastRequest, handleGenerateSignal]);

    const handleCopyAnalysis = useCallback(() => {
        if (!signalData) return;
        const text = formatAnalysisForClipboard(signalData);
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, [signalData]);

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300">
            <div className="w-full max-w-md mx-auto">
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
                        <g className="animate-candle-down origin-center">
                            <path d="M20 12V20" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                            <rect x="16" y="20" width="8" height="18" rx="1" fill="#dc2626"/>
                            <path d="M20 38V48" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
                        </g>
                        <g className="animate-candle-up origin-center [animation-delay:0.2s]">
                            <path d="M44 16V26" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"/>
                            <rect x="40" y="26" width="8" height="18" rx="1" fill="#22c55e"/>
                            <path d="M44 44V52" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"/>
                        </g>
                    </svg>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight animated-gradient-text animate-animated-gradient">
                        GreyAlpha Chart Analyzer
                    </h1>
                    <p className="mt-3 text-lg text-gray-600 dark:text-dark-text/80">
                        Upload your chart and let AI find your next trade.
                    </p>
                    <div className="absolute top-0 right-0">
                        <button 
                            onClick={onLogout} 
                            className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm p-2"
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main>
                   <div className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl">
                        <SignalGeneratorForm 
                            onSubmit={handleGenerateSignal} 
                            isLoading={isLoading} 
                            profitMode={profitMode}
                            onProfitModeChange={setProfitMode}
                        />
                        
                        <div className="mt-8 pt-8 border-t border-gray-300 dark:border-green-500/50 min-h-[200px] relative">
                             {(signalData || error) && !isLoading && (
                                <div className="absolute -top-5 right-0 flex gap-4">
                                    {lastRequest && (
                                        <button 
                                            onClick={handleReAnalyze}
                                            className="text-gray-500 dark:text-green-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-xs p-1 flex items-center font-medium"
                                            aria-label="Re-analyze chart"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            Re-Analyze
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleCopyAnalysis}
                                        className="text-gray-500 dark:text-green-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-xs p-1 flex items-center font-medium"
                                        aria-label="Copy analysis"
                                    >
                                        {isCopied ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                Copy
                                            </>
                                        )}
                                    </button>
                                    <button 
                                        onClick={handleClearAnalysis}
                                        className="text-gray-500 dark:text-green-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs p-1 flex items-center font-medium"
                                        aria-label="Clear analysis"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        Clear
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center justify-center">
                                {isLoading && <Loader />}
                                {error && <ErrorMessage message={error} />}
                                {signalData && !isLoading && <SignalDisplay data={signalData} />}
                                {!signalData && !isLoading && !error && (
                                    <div className="text-center">
                                        <h3 className="text-base font-medium text-gray-800 dark:text-green-400">Your trade analysis will appear here.</h3>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">Upload a chart and click "Analyze" to begin.</p>
                                    </div>
                                )}
                            </div>
                        </div>
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
