
import React from 'react';
import { motion } from 'framer-motion';
import { ThemeToggleButton } from './ThemeToggleButton';
import { UserMetadata } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface AutoTradePageProps {
    onBack: () => void;
    userMetadata: UserMetadata | null;
}

export const AutoTradePage: React.FC<AutoTradePageProps> = ({ onBack, userMetadata }) => {
    const accessStatus = userMetadata?.access?.autoTrade || 'locked';

    const handleRequestAccess = async () => {
        if (!userMetadata?.uid) return;
        const path = `users/${userMetadata.uid}`;
        try {
            const userRef = doc(db, 'users', userMetadata.uid);
            await updateDoc(userRef, {
                'access.autoTrade': 'pending'
            });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, path);
        }
    };

    const renderLocked = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Auto Trade Locked</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                The Auto Trade feature is a premium service that requires administrative approval. 
                Request access to start using our automated trading systems.
            </p>
            <button 
                onClick={handleRequestAccess}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-500/30 transform active:scale-95"
            >
                Request Access
            </button>
        </div>
    );

    const renderPending = () => (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mb-6 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Access Pending</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                Your request for Auto Trade access has been received. 
                Please ensure you have completed the payment process. 
                An administrator will review your request shortly.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg border border-yellow-500/20 text-sm font-medium">
                Status: Awaiting Admin Approval
            </div>
        </div>
    );

    const renderGranted = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* GreyOne Link Card */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">GreyOne Terminal</h3>
                    <p className="text-green-100 text-sm mb-6">
                        Access the advanced GreyOne automated trading terminal for high-frequency execution.
                    </p>
                    <a 
                        href="https://grey-one.vercel.app" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-white text-green-700 rounded-lg font-bold text-sm hover:bg-green-50 transition-colors"
                    >
                        Launch GreyOne
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </motion.div>

                {/* MT5 Bot Card */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg"
                >
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">MT5 Neural Bot</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Our flagship MetaTrader 5 expert advisor utilizing neural networks for market prediction.
                    </p>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-blue-500">v4.2.0</span>
                        <button className="text-sm font-bold text-green-600 dark:text-green-400 hover:underline">Download EA</button>
                    </div>
                </motion.div>

                {/* Strategy Card */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg"
                >
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Scalp Master AI</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Automated scalping strategy optimized for low-spread pairs like EURUSD and USDJPY.
                    </p>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-purple-500">v1.5.1</span>
                        <button className="text-sm font-bold text-green-600 dark:text-green-400 hover:underline">Configure</button>
                    </div>
                </motion.div>
            </div>

            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-gray-200 dark:border-white/10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Auto Trade Performance</h3>
                <div className="h-64 flex items-end justify-between gap-2">
                    {[45, 60, 55, 75, 90, 85, 95, 110, 105, 120, 115, 130].map((height, i) => (
                        <div key={i} className="flex-grow flex flex-col items-center gap-2">
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ delay: i * 0.05, duration: 0.5 }}
                                className="w-full bg-gradient-to-t from-green-600/20 to-green-500 rounded-t-lg"
                            />
                            <span className="text-[10px] font-mono text-gray-500">M{i+1}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in">
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-6 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-green-400">
                        Auto Trade Center
                    </h1>
                    <div className="flex items-center space-x-2">
                        <ThemeToggleButton />
                    </div>
                </header>

                <main className="flex-grow">
                    {accessStatus === 'locked' && renderLocked()}
                    {accessStatus === 'pending' && renderPending()}
                    {accessStatus === 'granted' && renderGranted()}
                </main>

                <footer className="w-full text-center pt-12 pb-8 text-gray-600 dark:text-dark-text/60 text-sm">
                    <p>Automated trading involves significant risk of loss. Use at your own discretion.</p>
                    <p className="mt-2">
                        Support: <a href="mailto:ma8138498@gmail.com" className="font-medium text-green-600 dark:text-green-400 hover:underline">ma8138498@gmail.com</a>
                    </p>
                </footer>
            </div>
        </div>
    );
};
