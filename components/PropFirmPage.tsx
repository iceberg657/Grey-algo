import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggleButton } from './ThemeToggleButton';
import { UserMetadata } from '../types';

interface PropFirmPageProps {
    onBack: () => void;
    userMetadata: UserMetadata | null;
}

export const PropFirmPage: React.FC<PropFirmPageProps> = ({ onBack, userMetadata }) => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [server, setServer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!login || !password || !server) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/connect-mt5', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    login,
                    password,
                    server,
                    uid: userMetadata?.uid,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to connect');
            }

            setSuccess('Successfully connected to Prop Firm account!');
            setLogin('');
            setPassword('');
            setServer('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-gray-800 dark:text-dark-text font-sans flex flex-col transition-colors duration-300 animate-fade-in bg-slate-50 dark:bg-[#0f172a]">
            <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col">
                <header className="relative mb-8 flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-green-400 hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div className="text-center">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white uppercase tracking-widest">
                            Prop Firm Connect
                        </h1>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-[0.3em] mt-1">
                            Link Your Trading Account
                        </p>
                    </div>
                    <ThemeToggleButton />
                </header>

                <main className="flex-grow flex items-center justify-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-xl w-full max-w-md"
                    >
                        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-6 mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        
                        <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-8">
                            Connect MT4/MT5 Account
                        </h2>

                        {userMetadata?.mt5Credentials && (
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-600 dark:text-blue-400 text-sm text-center">
                                Currently connected to: <strong>{userMetadata.mt5Credentials.login}</strong> on <strong>{userMetadata.mt5Credentials.server}</strong>
                                <br/>
                                <span className="text-xs opacity-80 mt-1 block">Submitting this form will update your connection.</span>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm text-center">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleConnect} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Account ID (Login)
                                </label>
                                <input
                                    type="text"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                                    placeholder="e.g. 12345678"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Broker Server
                                </label>
                                <input
                                    type="text"
                                    value={server}
                                    onChange={(e) => setServer(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all dark:text-white"
                                    placeholder="e.g. MetaQuotes-Demo"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    'Connect Account'
                                )}
                            </button>
                        </form>
                    </motion.div>
                </main>
            </div>
        </div>
    );
};
