
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignalGeneratorForm } from './SignalGeneratorForm';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { generateTradingSignal } from '../services/geminiService';
import type { SignalData, AnalysisRequest, UserSettings, UserMetadata, Broadcast } from '../types';
import { ThemeToggleButton } from './ThemeToggleButton';
import { MarketOverview } from './MarketOverview';
import { getAnalysisCount, incrementAnalysisCount, resetAnalysisCount } from '../services/analysisCountService';
import { RiskCalculator } from './RiskCalculator';
import { CheatSheet } from './CheatSheet';
import { SettingsModal } from './SettingsModal';
import { PacificTimeClock } from './PacificTimeClock';
import { resetNeuralLanes } from '../services/retryUtils';
import { getLearnedStrategies } from '../services/learningService';
import { fetchMarketData } from '../services/twelveDataService';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface HomePageProps {
    onLogout: () => void;
    onAnalysisComplete: (data: Omit<SignalData, 'id' | 'timestamp'>, primaryImageDataUrl: string) => void;
    onNavigateToHistory: () => void;
    onNavigateToChat: () => void;
    onNavigateToProducts: () => void; 
    onNavigateToJournal: () => void;
    onNavigateToAdmin: () => void;
    onNavigateToAutoTrade: () => void;
    onNavigateToSniper: () => void;
    onAssetSelect?: (asset: string) => void;
    userMetadata: UserMetadata | null;
}

const NavButton: React.FC<{
    onClick: () => void;
    'aria-label': string;
    icon: React.ReactNode;
    label: string;
    index: number;
    highlight?: boolean;
}> = ({ onClick, 'aria-label': ariaLabel, icon, label, index, highlight }) => (
    <motion.button
        initial={{ opacity: 0, rotateY: -90 }}
        animate={{ opacity: 1, rotateY: 0 }}
        transition={{ delay: 0.1 + index * 0.05, duration: 0.5 }}
        onClick={onClick}
        aria-label={ariaLabel}
        className={`group flex items-center justify-center h-14 w-14 md:w-auto md:px-5 md:py-2.5 rounded-2xl transition-all duration-300 border backdrop-blur-md hover:scale-110 active:scale-95 shadow-[0_4px_16px_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_16px_0_rgba(0,0,0,0.2)] ${
            highlight 
                ? 'bg-green-600 text-white border-green-500 hover:bg-green-500' 
                : 'text-green-600 dark:text-green-400 bg-white/80 dark:bg-slate-800/40 border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-700/50'
        }`}
    >
        {icon}
        <span className="hidden md:inline md:ml-3 text-xs font-black uppercase tracking-widest">{label}</span>
    </motion.button>
);

export const HomePage: React.FC<HomePageProps> = ({ 
    onLogout, 
    onAnalysisComplete, 
    onNavigateToHistory, 
    onNavigateToChat, 
    onNavigateToProducts, 
    onNavigateToJournal, 
    onNavigateToAdmin, 
    onNavigateToAutoTrade,
    onNavigateToSniper,
    onAssetSelect,
    userMetadata 
}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [criticalError, setCriticalError] = useState<Error | null>(null);
    const [analysisCount, setAnalysisCount] = useState<number>(0);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

    if (criticalError) throw criticalError;

    const [showRiskCalc, setShowRiskCalc] = useState<boolean>(false);
    const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [isTwelveDataConfigured, setIsTwelveDataConfigured] = useState<boolean | null>(null);

    useEffect(() => {
        const checkStatus = async (retryCount = 0) => {
            // First check if we have a key in localStorage
            const storedSettings = localStorage.getItem('greyquant_user_settings');
            const userSettings = storedSettings ? JSON.parse(storedSettings) : null;
            const localKey = userSettings?.twelveDataApiKey;

            try {
                const res = await fetch('/api/twelveData?action=status');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned non-JSON response');
                }
                
                const data = await res.json();
                console.log('Twelve Data Status Response:', data);
                
                // Consider it configured if either the backend has it OR we have it locally
                const isConfigured = (data.configured && data.valid) || (!!localKey && localKey.length > 10);
                setIsTwelveDataConfigured(isConfigured);
                
                if (!isConfigured && retryCount === 0) {
                    console.warn('[TwelveData] API Key missing or invalid. Market confluence will be limited.');
                }
            } catch (err) {
                console.error('Twelve Data Status Error:', err);
                
                // Retry once after 2 seconds if it's a fetch failure
                if (retryCount < 1) {
                    setTimeout(() => checkStatus(retryCount + 1), 2000);
                    return;
                }

                // Fallback to local key check if fetch fails after retry
                setIsTwelveDataConfigured(!!localKey && localKey.length > 10);
            }
        };

        // Initial check
        checkStatus();

        // Check every 5 minutes (reduced from 10s to save credits)
        const interval = setInterval(checkStatus, 300000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        setAnalysisCount(userMetadata?.analysisCount || getAnalysisCount());
    }, [userMetadata]);

    useEffect(() => {
        const path = 'broadcasts';
        const q = query(
            collection(db, 'broadcasts'),
            where('active', '==', true),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const validBroadcasts: Broadcast[] = [];
            
            snapshot.docs.forEach(async (docSnap) => {
                const data = docSnap.data() as Broadcast;
                const age = now - data.timestamp;
                
                if (age <= 60000) {
                    validBroadcasts.push({ id: docSnap.id, ...data });
                }
            });
            
            setBroadcasts(validBroadcasts);
        }, (err) => {
            try {
                handleFirestoreError(err, OperationType.LIST, path);
            } catch (e) {
                setCriticalError(e as Error);
            }
        });
        return () => unsubscribe();
    }, []);

    // Timer to clear expired broadcasts from UI and server in real-time
    useEffect(() => {
        if (broadcasts.length === 0) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const expired = broadcasts.filter(b => (now - b.timestamp) > 60000);
            
            if (expired.length > 0) {
                const stillValid = broadcasts.filter(b => (now - b.timestamp) <= 60000);
                setBroadcasts(stillValid);
            }
        }, 5000); // Check every 5 seconds
        
        return () => clearInterval(interval);
    }, [broadcasts]);

    const handleResetAnalysisCount = useCallback(() => {
        resetAnalysisCount();
        setAnalysisCount(0);
        if (userMetadata) {
            updateDoc(doc(db, 'users', userMetadata.uid), { analysisCount: 0 });
        }
    }, [userMetadata]);

    const handleReconnect = () => {
        resetNeuralLanes(); // Fixes "Failed to fetch" by clearing retry blocks
        setError(null);
    };

    const handleGenerateSignal = useCallback(async (requestData: Omit<AnalysisRequest, 'userSettings' | 'globalContext' | 'learnedStrategies'>, primaryImageFile: File) => {
        setIsLoading(true);
        setError(null);

        const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });

        try {
            const primaryImageDataUrl = await fileToDataUrl(primaryImageFile);
            const storedSettings = localStorage.getItem('greyquant_user_settings');
            const userSettings = storedSettings ? JSON.parse(storedSettings) as UserSettings : undefined;

            const learnedStrategies = await getLearnedStrategies();
            
            // Fetch live market data for confluence
            let marketData = null;
            if (requestData.asset) {
                // Determine interval based on trading style
                let interval = '1h';
                if (requestData.tradingStyle === 'Scalping') interval = '5min';
                else if (requestData.tradingStyle === 'Day Trading') interval = '15min';
                else if (requestData.tradingStyle === 'Swing Trading') interval = '4h';
                
                // Clean asset name for Twelve Data
                let symbol = requestData.asset.toUpperCase();
                if (symbol === 'GOLD') symbol = 'XAU/USD';
                else if (symbol === 'XAUUSD') symbol = 'XAU/USD';
                else if (symbol === 'US30' || symbol === 'DJI') symbol = 'DJI';
                else if (symbol === 'NAS100' || symbol === 'NDX') symbol = 'NDX';
                else if (symbol === 'SPX500' || symbol === 'SPX') symbol = 'SPX';
                else if (symbol === 'UK100' || symbol === 'FTSE') symbol = 'FTSE';
                else if (symbol === 'GER40' || symbol === 'DAX') symbol = 'DAX';
                else if (symbol === 'USOIL' || symbol === 'WTI') symbol = 'WTI';
                else if (symbol === 'UKOIL' || symbol === 'BRENT') symbol = 'BRENT';
                else if (symbol.length === 6 && !symbol.includes('/')) {
                    symbol = `${symbol.substring(0, 3)}/${symbol.substring(3, 6)}`;
                }
                
                marketData = await fetchMarketData(symbol, interval);
            }

            const fullRequest: AnalysisRequest = {
                ...requestData,
                userSettings,
                learnedStrategies,
                twelveDataQuote: marketData
            };

            const data = await generateTradingSignal(fullRequest);
            const newCount = incrementAnalysisCount();
            setAnalysisCount(newCount);
            
            if (userMetadata) {
                await updateDoc(doc(db, 'users', userMetadata.uid), { analysisCount: newCount });
            }

            onAnalysisComplete(data, primaryImageDataUrl);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [onAnalysisComplete, userMetadata]);
    
    const iconClasses = "h-5 w-5 group-hover:rotate-12 transition-transform";
    const isAdmin = userMetadata?.role === 'admin';

    const navItems = [
        {
            onClick: onNavigateToChat,
            label: 'Chat',
            ariaLabel: 'Open Oracle Chat',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        },
        {
            onClick: onNavigateToAutoTrade,
            label: 'Auto Trade',
            ariaLabel: 'Open Auto Trade Terminal',
            highlight: true,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        },
        {
            onClick: onNavigateToSniper,
            label: 'Sniper',
            ariaLabel: 'Open Sniper Live Trade',
            highlight: true,
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /><circle cx="12" cy="12" r="3" /></svg>
        },
        ...(isAdmin ? [{
            onClick: onNavigateToAdmin,
            label: 'Admin',
            ariaLabel: 'Open Admin Control Center',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        }] : []),
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
            onClick: onNavigateToJournal,
            label: 'Journal',
            ariaLabel: 'Open Performance Journal',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
            
            {/* Broadcast Banner */}
            <AnimatePresence>
                {broadcasts.length > 0 && (
                    <motion.div 
                        initial={{ y: -100 }}
                        animate={{ y: 0 }}
                        exit={{ y: -100 }}
                        className="fixed top-0 left-0 right-0 z-[120] bg-green-600 text-white py-2 px-4 shadow-lg flex items-center justify-center gap-4"
                    >
                        <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-center">
                            SYSTEM BROADCAST: {broadcasts[0].message}
                        </p>
                        <span className="text-[8px] opacity-70 font-mono">
                            {new Date(broadcasts[0].timestamp).toLocaleTimeString()}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100]"
                    >
                        <Loader />
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {showRiskCalc && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[110]"
                    >
                        <RiskCalculator onClose={() => setShowRiskCalc(false)} />
                    </motion.div>
                )}
                {showCheatSheet && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[110]"
                    >
                        <CheatSheet onClose={() => setShowCheatSheet(false)} />
                    </motion.div>
                )}
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[110]"
                    >
                        <SettingsModal onClose={() => setShowSettings(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col perspective-1000 ${broadcasts.length > 0 ? 'pt-16' : ''}`}
            >
                <header className="text-center mb-10 relative">
                      <div className="absolute top-0 right-0 flex items-center gap-2">
                        {isTwelveDataConfigured !== null && (
                            <button 
                                onClick={() => setShowSettings(true)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${isTwelveDataConfigured ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 animate-pulse'}`} 
                                title={isTwelveDataConfigured ? "Twelve Data API Connected" : "Twelve Data API Key Missing - Click to Fix"}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${isTwelveDataConfigured ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <span className="hidden sm:inline">{isTwelveDataConfigured ? 'Twelve Data Active' : 'Twelve Data Offline'}</span>
                            </button>
                        )}
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
                            GreyAlpha
                        </h1>
                    </button>
                    <p className="mt-3 text-sm font-black text-gray-600 dark:text-dark-text/40 uppercase tracking-[0.4em]">
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
                            index={idx}
                            highlight={item.highlight}
                        />
                    ))}
                </nav>

                <main className="relative group">
                   <div>
                       <MarketOverview 
                            analysisCount={analysisCount} 
                            onResetCount={handleResetAnalysisCount} 
                            onAssetSelect={onAssetSelect}

                       />
                   </div>

                   <div>
                        {/* High-Tech HUD Brackets for Form */}
                        <div className="absolute -top-3 -left-3 w-10 h-10 border-t-4 border-l-4 z-10 border-green-500/50 transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1"></div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 border-t-4 border-r-4 z-10 border-green-500/50 transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-1"></div>
                        <div className="absolute -bottom-3 -left-3 w-10 h-10 border-b-4 border-l-4 z-10 border-green-500/50 transition-all duration-700 group-hover:-translate-x-1 group-hover:-translate-y-1"></div>
                        <div className="absolute -bottom-3 -right-3 w-10 h-10 border-b-4 border-r-4 z-10 border-green-500/50 transition-all duration-700 group-hover:translate-x-1 group-hover:-translate-y-1"></div>

                        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-6 sm:p-10 rounded-2xl border border-gray-200 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
                             {/* Interactive Scanline */}
                             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent h-[200%] pointer-events-none animate-shimmer"></div>
                             
                            {error ? (
                                 <div className="min-h-[400px] flex flex-col items-center justify-center relative z-10">
                                    <ErrorMessage message={error} />
                                    <button
                                        onClick={handleReconnect}
                                        className="mt-6 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-red-600 rounded-xl hover:bg-red-500 transition-all shadow-lg hover:shadow-red-500/30"
                                    >
                                        Reconnect Lane
                                    </button>
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <SignalGeneratorForm 
                                        onSubmit={(req, file) => handleGenerateSignal(req, file!)} 
                                        isLoading={isLoading} 

                                    />
                                </div>
                            )}
                        </div>
                   </div>
                </main>
            </motion.div>
            <footer className="w-full text-center mt-12 px-4 sm:px-6 lg:px-8 text-gray-700 dark:text-dark-text/40 text-[10px] font-black uppercase tracking-[0.3em]">
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

export default HomePage;

