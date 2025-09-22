import React from 'react';
import { SignalDisplay } from './SignalDisplay';
import type { SignalData } from '../types';

interface AnalysisPageProps {
    data: SignalData;
    onBack: () => void;
    onLogout: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ data, onBack, onLogout }) => {
    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans p-4 sm:p-6 lg:p-8 flex flex-col transition-colors duration-300 animate-fade-in">
            <div className="w-full max-w-2xl mx-auto">
                <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-green-400">
                        Analysis Result
                    </h1>
                    <button
                        onClick={onLogout}
                        className="text-gray-500 dark:text-green-400 hover:text-gray-900 dark:hover:text-green-300 transition-colors text-sm font-medium"
                        aria-label="Logout"
                    >
                        Logout
                    </button>
                </header>

                <main className="bg-white/60 dark:bg-dark-card/60 backdrop-blur-lg p-6 rounded-2xl border border-gray-300/20 dark:border-green-500/20 shadow-2xl">
                    <SignalDisplay data={data} />
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
