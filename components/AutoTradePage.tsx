import React from 'react';
import { motion } from 'framer-motion';
import { ThemeToggleButton } from './ThemeToggleButton';
import { UserMetadata } from '../types';

interface AutoTradePageProps {
    onBack: () => void;
    userMetadata: UserMetadata | null;
}

export const AutoTradePage: React.FC<AutoTradePageProps> = ({ onBack, userMetadata }) => {
    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in bg-slate-50 dark:bg-[#0f172a]">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-8 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div className="text-center">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white uppercase tracking-widest">
                            Auto Trade Center
                        </h1>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-[0.3em] mt-1">
                            Algorithmic Trading Hub
                        </p>
                    </div>
                    <ThemeToggleButton />
                </header>

                <main className="space-y-12">
                    {/* GreyOne Link Card */}
                    <motion.div 
                        whileHover={{ y: -5 }}
                        className="bg-gradient-to-br from-green-600 to-emerald-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-48 w-48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black mb-4 uppercase tracking-widest">GreyOne Terminal</h3>
                            <p className="text-green-100 text-lg mb-8 max-w-2xl">
                                Access the advanced GreyOne automated trading terminal for high-frequency execution and institutional-grade market analysis.
                            </p>
                            <a 
                                href="https://grey-one.vercel.app" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-8 py-4 bg-white text-green-700 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-50 transition-all shadow-lg"
                            >
                                Launch GreyOne Terminal
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* MT5 Bot Card */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl"
                        >
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-widest">MT5 Neural Bot</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
                                Our flagship MetaTrader 5 expert advisor utilizing neural networks for high-probability market prediction and execution.
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">v4.2.0 Stable</span>
                                <button className="text-sm font-black uppercase tracking-widest text-green-600 dark:text-green-400 hover:underline">Download EA</button>
                            </div>
                        </motion.div>

                        {/* Strategy Card */}
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-white dark:bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl"
                        >
                            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-widest">Scalp Master AI</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
                                Automated scalping strategy optimized for low-spread pairs like EURUSD and USDJPY with dynamic SL/TP management.
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-widest text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full">v1.5.1 Active</span>
                                <button className="text-sm font-black uppercase tracking-widest text-green-600 dark:text-green-400 hover:underline">Configure</button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Performance Chart */}
                    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Bot Performance</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center">
                                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                                    <span className="text-xs font-bold text-gray-500">Profit</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-64 flex items-end justify-between gap-2">
                            {[45, 60, 55, 75, 90, 85, 95, 110, 105, 120, 115, 130].map((height, i) => (
                                <div key={i} className="flex-grow flex flex-col items-center gap-2">
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}%` }}
                                        transition={{ delay: i * 0.05, duration: 0.5 }}
                                        className="w-full bg-gradient-to-t from-green-600/20 to-green-500 rounded-t-lg"
                                    />
                                    <span className="text-[10px] font-black text-gray-400">M{i+1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                <footer className="w-full text-center pt-12 pb-8 text-gray-600 dark:text-dark-text/60 text-sm">
                    <p>Automated trading involves significant risk of loss. Use at your own discretion.</p>
                </footer>
            </div>
        </div>
    );
};
