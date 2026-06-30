
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    MessageSquare, 
    Zap, 
    Target, 
    ShieldAlert, 
    Calculator, 
    BookOpen, 
    Package, 
    History, 
    Book, 
    LogOut,
    Settings,
    Activity,
    Compass,
    Bell,
    ExternalLink,
    ChevronRight,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { SignalGeneratorForm } from './SignalGeneratorForm';
import { AgentAnalysisLoader } from './AgentAnalysisLoader';
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
import { analyzeRCA } from '../utils/rcaEngine';
import { QuantEnginePipeline, MarketSeries } from '../utils/advancedExecutionEngines';
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
    onNavigateToBlueprint: () => void;
    onNavigateToNotifications: () => void;
    onOpenSettings?: () => void;
    onAssetSelect?: (asset: string) => void;
    userMetadata: UserMetadata | null;
    systemSettings: any | null;
}

const NavButton: React.FC<{
    onClick: () => void;
    'aria-label': string;
    icon: React.ReactNode;
    label: string;
    index: number;
    highlight?: boolean;
    isLocked?: boolean;
}> = ({ onClick, 'aria-label': ariaLabel, icon, label, index, highlight, isLocked }) => (
    <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        onClick={onClick}
        aria-label={ariaLabel}
        className={`group relative flex flex-col items-center justify-center gap-2 p-4 rounded-3xl transition-all duration-500 border backdrop-blur-3xl hover:-translate-y-1 hover:scale-105 active:scale-95 shadow-xl ${
            highlight 
                ? 'bg-emerald-500/80 text-white border-emerald-400/50 hover:bg-emerald-500/90 shadow-emerald-500/30' 
                : 'text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 border-white/40 dark:border-white/10 hover:bg-white/80 dark:hover:bg-slate-700/60 hover:text-emerald-500 dark:hover:text-emerald-400'
        }`}
    >
        {isLocked && (
            <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-1 shadow-lg z-20 border border-white/20 shadow-rose-500/30">
                <ShieldAlert size={10} />
            </div>
        )}
        <div className={`transition-transform duration-500 group-hover:rotate-6 ${highlight ? 'text-white' : 'text-slate-400 group-hover:text-emerald-500'}`}>
            {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-1">{label}</span>
        
        {highlight && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-white/40 rounded-full blur-sm" />
        )}
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
    onNavigateToBlueprint,
    onNavigateToNotifications,
    onOpenSettings,
    onAssetSelect,
    userMetadata,
    systemSettings
}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [criticalError, setCriticalError] = useState<Error | null>(null);
    const [analysisCount, setAnalysisCount] = useState<number>(0);
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [liveSignals, setLiveSignals] = useState<any[]>([]);
    const [bullishSuggestions, setBullishSuggestions] = useState<MomentumAsset[]>(() => {
        const cached = localStorage.getItem('greyquant_asset_suggestions_v3');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                return parsed.data?.bullish || [];
            } catch (e) { return []; }
        }
        return [];
    });
    const [bearishSuggestions, setBearishSuggestions] = useState<MomentumAsset[]>(() => {
        const cached = localStorage.getItem('greyquant_asset_suggestions_v3');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                return parsed.data?.bearish || [];
            } catch (e) { return []; }
        }
        return [];
    });
    
    const [userSettings, setUserSettings] = useState<UserSettings>(() => {
        try {
            const saved = localStorage.getItem('greyquant_user_settings');
            return saved ? JSON.parse(saved) : {} as UserSettings;
        } catch { return {} as UserSettings; }
    });

    useEffect(() => {
        const syncSettings = () => {
            try {
                const saved = localStorage.getItem('greyquant_user_settings');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (JSON.stringify(parsed) !== JSON.stringify(userSettings)) {
                        setUserSettings(parsed);
                    }
                }
            } catch (e) {
                console.error('[HomePage] Failed to sync settings', e);
            }
        };

        syncSettings();
        const interval = setInterval(syncSettings, 1000);
        return () => clearInterval(interval);
    }, [userSettings]);

    if (criticalError) throw criticalError;


    const [isTwelveDataConfigured, setIsTwelveDataConfigured] = useState<boolean | null>(null);

    useEffect(() => {
        const checkStatus = () => {
            setIsTwelveDataConfigured(false);
        };

        // Initial check
        checkStatus();
        
        // Remove loop
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

    // Fetch Active Trade Notifications for Dashboard Display
    useEffect(() => {
        if (!userMetadata?.uid) return;
        
        const q = query(
            collection(db, 'users', userMetadata.uid, 'trade_notifications'),
            where('status', '==', 'ACTIVE'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLiveSignals(activeNotifs);
        }, (err) => {
            console.error('[HomePage] Live Signals fetch failed:', err);
        });

        return () => unsubscribe();
    }, [userMetadata?.uid]);

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

    const handleOpenSettings = () => {
        if (onOpenSettings) onOpenSettings();
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
            
            // Find global trend for the asset if it exists in suggestions
            let globalTrend = undefined;
            const rawAsset = requestData.asset?.toUpperCase() || "";
            const cleanAsset = rawAsset.replace(/^FRX|^FX:|^CRY:|^INDEX:|^OTC_/, '').replace('/', '');
            
            if (cleanAsset) {
                const combined = [...bullishSuggestions, ...bearishSuggestions];
                const match = combined.find(a => {
                    const suggSymbol = a.symbol.toUpperCase().replace(/^FX:|^CRY:|^INDEX:/, '').replace('/', '');
                    return suggSymbol === cleanAsset || 
                           cleanAsset.includes(suggSymbol) || 
                           suggSymbol.includes(cleanAsset);
                });
                if (match) {
                    globalTrend = {
                        symbol: match.symbol,
                        momentum: match.momentum,
                        reason: match.reason,
                        trend1Hr: match.trend1Hr || 'Neutral',
                        trend4Hr: match.trend4Hr || 'Neutral'
                    };
                }
            }
            
            // Fetch live market data for confluence
            let marketData = null;
            let rcaData = null;
            let advancedQuantSignal = null;
            if (requestData.asset) {
                // Determine interval based on trading style
                let interval = '1h';
                let derivGranularity = 3600;
                if (requestData.tradingStyle === 'Scalping') { interval = '5min'; derivGranularity = 300; }
                else if (requestData.tradingStyle === 'Day Trading') { interval = '15min'; derivGranularity = 900; }
                else if (requestData.tradingStyle === 'Swing Trading') { interval = '4h'; derivGranularity = 14400; }
                
                // Clean asset name for Twelve Data
                let symbol = requestData.asset.toUpperCase().replace(/\s/g, '');
                if (symbol === 'GOLD' || symbol === 'XAUUSD') symbol = 'XAU/USD';
                else if (symbol === 'US30' || symbol === 'DJI') symbol = 'DJI';
                else if (symbol === 'NAS100' || symbol === 'NDX') symbol = 'NDX';
                else if (symbol === 'SPX500' || symbol === 'SPX') symbol = 'SPX';
                else if (symbol === 'UK100' || symbol === 'FTSE' || symbol === 'FTSE100') symbol = 'FTSE';
                else if (symbol === 'GER40' || symbol === 'DAX') symbol = 'DAX';
                else if (symbol === 'USOIL' || symbol === 'WTI') symbol = 'WTI';
                else if (symbol === 'UKOIL' || symbol === 'BRENT') symbol = 'BRENT';
                else if (symbol.length === 6 && !symbol.includes('/')) {
                    symbol = `${symbol.substring(0, 3)}/${symbol.substring(3, 6)}`;
                }
                
                marketData = await fetchMarketData(symbol, interval);

                // Try to fetch Deriv data for RCA Markov Engine evaluation
                try {
                    // Try to use a Deriv compatible symbol format
                    let derivSymbol = requestData.asset.toUpperCase().replace(/\s|-|\//g, '');
                    if (derivSymbol === 'GOLD' || derivSymbol === 'XAUUSD') derivSymbol = 'frxXAUUSD';
                    else if (derivSymbol === 'FTSE100' || derivSymbol === 'FTSE' || derivSymbol === 'UK100') derivSymbol = 'OTC_FTSE'; // Deriv notation for FTSE
                    
                    const tokenParam = userSettings?.derivApiToken ? `&token=${encodeURIComponent(userSettings.derivApiToken)}` : '';
                    const derivRes = await fetch(`/api/derivData?symbol=${derivSymbol}&history=true&granularity=${derivGranularity}&count=200${tokenParam}`);
                    if (derivRes.ok) {
                        const d = await derivRes.json();
                        if (d && d.candles && d.candles.length >= 50) {
                            rcaData = analyzeRCA(d.candles);
                            
                            try {
                                const pipeline = new QuantEnginePipeline();
                                const mSeries: MarketSeries = {
                                    symbol: derivSymbol,
                                    bars: d.candles.map((c: any) => ({ open: c.open, high: c.high, low: c.low, close: c.close, volume: 1, timestamp: new Date(c.epoch * 1000) }))
                                };
                                const isForex = !['US30', 'NAS100', 'SPX500', 'CRASH', 'BOOM', 'OTC_'].some(s => derivSymbol.toUpperCase().includes(s));
                                const assetClass = isForex ? 'FOREX' : 'INDICES';
                                
                                const strategies: ('SMT' | 'STAT_ARB' | 'VELOCITY' | 'INDEX_SMT' | 'INDEX_STAT_ARB' | 'INDEX_LEAD_LAG')[] = isForex 
                                    ? ['SMT', 'STAT_ARB', 'VELOCITY']
                                    : ['INDEX_SMT', 'INDEX_STAT_ARB', 'INDEX_LEAD_LAG'];
                                    
                                const { getStrategyStability } = await import('../utils/backtestEngine');
                                const stableStrategies = strategies.filter(strategyId => 
                                    getStrategyStability(strategyId, assetClass, derivGranularity) === 'STABLE'
                                );

                                const signals = [];
                                for (const strategy of (stableStrategies.length > 0 ? stableStrategies : strategies)) {
                                    try {
                                        const sig = pipeline.processLiveExecution(
                                            strategy, mSeries, mSeries, mSeries,
                                            derivGranularity / 60,
                                            userSettings?.autotrade?.maxRiskPerTrade || 10000
                                        );
                                        if (sig && sig.signal !== 'NEUTRAL') {
                                            signals.push({ strategy, ...sig });
                                        }
                                    } catch (e) {
                                        console.warn(`RCA Quant execution failed for ${strategy}:`, e);
                                    }
                                }

                                if (signals.length > 0) {
                                    signals.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
                                    advancedQuantSignal = signals[0];
                                    console.log(`[RCA] Selected Advanced Signal from ${advancedQuantSignal.strategy}:`, advancedQuantSignal);
                                }
                            } catch (err) {
                                console.error("Advanced Quant Engine error in RCA:", err);
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Deriv RCA fetch failed, continuing without RCA quant data:", e);
                }
            }

            const fullRequest: AnalysisRequest = {
                ...requestData,
                userSettings,
                learnedStrategies,
                twelveDataQuote: marketData,
                quantData: rcaData,
                advancedQuantSignal,
                globalTrend
            };

            let data;
            // RPD Optimization (ALGORITHMIC VETO): Intercept and reject highly probable fakeouts directly locally
            if (rcaData?.confluenceConfidence < 40 && rcaData?.quantMath?.fakeoutProbability > 0.8) {
                console.log('[RCA] ALGORITHMIC VETO TRIGGERED: Skipping AI Execution to save RPD token limit.');
                data = {
                    id: Date.now().toString(),
                    type: 'ai',
                    signal: 'NEUTRAL',
                    asset: requestData.asset,
                    confidence: rcaData.confluenceConfidence,
                    reasoning: [
                        "Analysis auto-blocked locally by Quant Statistics Engine to save your daily AI limits.",
                        "The mathematical footprint displays over 80% statistical probability of a trap/fakeout.",
                        "Machine learning algorithms identified this zone as a statistically poor edge.",
                        "We saved your core account margin. Stay flat."
                    ],
                    entryRange: { min: 0, max: 0 },
                    stopLoss: 0,
                    takeProfits: [0, 0],
                    timestamp: Date.now(),
                    insight: "Algorithmic safety net activated. Market conditions rejected.",
                    recommendedPositions: '0',
                    formattedLotSize: '0.00',
                    grade: 'NO TRADE'
                };
            } else {
                const resultsContext = await Promise.all([
                    generateTradingSignal(fullRequest),
                    new Promise(resolve => setTimeout(resolve, 12000)) // Minimum 12s thorough analysis
                ]);
                data = resultsContext[0];
            }
            
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
    }, [onAnalysisComplete, userMetadata, bullishSuggestions, bearishSuggestions]);
    
    const iconClasses = "h-5 w-5 group-hover:rotate-12 transition-transform";
    const isAdmin = userMetadata?.role === 'admin';

    const navItems = [
        {
            onClick: onNavigateToChat,
            label: 'Oracle',
            ariaLabel: 'Open Oracle Chat',
            isLocked: systemSettings?.chatLocked && !isAdmin,
            icon: <MessageSquare size={20} />
        },
        {
            onClick: onNavigateToAutoTrade,
            label: 'Auto',
            ariaLabel: 'Open Auto Trade Terminal',
            highlight: true,
            isLocked: (systemSettings?.autoTradeLocked || userMetadata?.access?.autoTrade === 'locked') && !isAdmin,
            icon: <Zap size={20} />
        },
        {
            onClick: onNavigateToSniper,
            label: 'Sniper',
            ariaLabel: 'Open Sniper Live Trade',
            highlight: true,
            isLocked: (systemSettings?.sniperLocked || userMetadata?.access?.sniperLiveTrade === 'locked') && !isAdmin,
            icon: <Target size={20} />
        },
        {
            onClick: onNavigateToNotifications,
            label: 'Signals',
            ariaLabel: 'Open Trade Notifications',
            icon: <Bell size={20} />
        },
        ...(isAdmin ? [{
            onClick: onNavigateToAdmin,
            label: 'Admin',
            ariaLabel: 'Open Admin Control Center',
            icon: <ShieldAlert size={20} />
        }] : []),
        {
            onClick: onNavigateToBlueprint,
            label: 'Blueprint',
            ariaLabel: 'Open Trading Blueprint',
            icon: <Compass size={20} />
        },
        {
            onClick: onNavigateToProducts,
            label: 'Vault',
            ariaLabel: 'Open GreyAlpha Products',
            isLocked: userMetadata?.access?.products === 'locked' && !isAdmin,
            icon: <Package size={20} />
        },
        {
            onClick: onNavigateToHistory,
            label: 'History',
            ariaLabel: 'View analysis history',
            icon: <History size={20} />
        },
        {
            onClick: onNavigateToJournal,
            label: 'Journal',
            ariaLabel: 'Open Performance Journal',
            icon: <Book size={20} />
        },
        {
            onClick: onLogout,
            label: 'Exit',
            ariaLabel: 'Logout',
            icon: <LogOut size={20} />
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50/15 dark:bg-[#070b14]/50 text-slate-800 dark:text-slate-200 font-sans flex flex-col transition-colors duration-500 pb-20 overflow-x-hidden backdrop-blur-xl">
            <PacificTimeClock />
            
            {/* Broadcast Banner */}
            <AnimatePresence>
                {broadcasts.length > 0 && (
                    <motion.div 
                        initial={{ y: -100 }}
                        animate={{ y: 20 }}
                        exit={{ y: -100 }}
                        className="fixed top-0 left-1/2 -translate-x-1/2 z-[120] bg-emerald-600 text-white py-2 px-6 rounded-full shadow-2xl flex items-center gap-3 border border-emerald-400/30 backdrop-blur-md"
                    >
                        <Bell size={12} className="animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                            Neural Broadcast: {broadcasts[0].message}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100]"
                    >
                        <AgentAnalysisLoader />
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
            </AnimatePresence>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className={`w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 flex-grow flex flex-col ${broadcasts.length > 0 ? 'pt-20' : ''}`}
            >
                <header className="flex flex-col items-center mb-16 relative">
                    <div className="absolute top-0 right-0 flex items-center gap-3">
                        {isTwelveDataConfigured !== null && (
                            <button 
                                onClick={handleOpenSettings}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-sm backdrop-blur-md ${isTwelveDataConfigured ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse'}`} 
                                title={isTwelveDataConfigured ? "Twelve Data Connected" : "Connection Refused"}
                            >
                                <span className={`w-1 h-1 rounded-full ${isTwelveDataConfigured ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                <span className="hidden sm:inline">{isTwelveDataConfigured ? 'Network: Live' : 'Network: Offline'}</span>
                            </button>
                        )}
                        <ThemeToggleButton />
                    </div>

                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="relative cursor-pointer group"
                        onClick={handleOpenSettings}
                    >
                        <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <h1 className="text-5xl sm:text-6xl font-black tracking-tightest text-slate-900 dark:text-white transition-all duration-500 italic uppercase">
                            Grey<span className="text-emerald-500">Alpha</span>
                        </h1>
                    </motion.div>
                    
                    <div className="mt-4 flex items-center gap-4 text-slate-400 dark:text-slate-500">
                        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800" />
                        <p 
                            className="text-[9px] font-bold uppercase tracking-[0.6em] whitespace-nowrap"
                            style={{ fontFamily: 'system-ui', fontStyle: 'normal', textDecorationLine: 'none' }}
                        >
                            Autonomous Trading Hub
                        </p>
                        <div className="h-px w-8 bg-slate-200 dark:bg-slate-800" />
                    </div>
                </header>

                <nav className="mb-16 grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
                    {navItems.map((item, idx) => (
                        <NavButton
                            key={item.label}
                            onClick={item.onClick}
                            aria-label={item.ariaLabel}
                            icon={item.icon}
                            label={item.label}
                            index={idx}
                            highlight={item.highlight}
                            isLocked={item.isLocked}
                        />
                    ))}
                </nav>

                <main className="grid grid-cols-1 gap-12">
                   <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                   >
                       <MarketOverview 
                            analysisCount={analysisCount} 
                            onResetCount={handleResetAnalysisCount} 
                            onAssetSelect={onAssetSelect}
                            bullishSuggestions={bullishSuggestions}
                            bearishSuggestions={bearishSuggestions}
                            onSuggestionsUpdate={(bull, bear) => {
                                setBullishSuggestions(bull);
                                setBearishSuggestions(bear);
                            }}
                       />
                   </motion.div>



                   {userSettings.showDashboardSignals !== false && (
                   <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="relative group w-full animate-fade-in"
                   >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <Bell size={14} className="text-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Signals Scanner</span>
                        </div>

                        <div className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden transition-all duration-700 hover:shadow-emerald-500/5">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-30" />
                            
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Live Setup Alerts
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                        Continuous mechanical scans searching for high-probability market setups.
                                    </p>
                                </div>
                                <button
                                    onClick={onNavigateToNotifications}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-105 active:scale-95"
                                >
                                    Manage Scanner Console
                                    <ChevronRight size={14} />
                                </button>
                            </div>

                            {liveSignals.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 dark:bg-slate-900/40 rounded-[24px] border border-dashed border-slate-200 dark:border-white/5">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 relative mb-4">
                                        <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                                        <Activity size={20} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                        Scanner Active
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Sifting liquidity pools & trend structure... No active signals found yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {liveSignals.slice(0, 6).map((sig) => (
                                        <div 
                                            key={sig.id}
                                            className="p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-[24px] border border-slate-100 dark:border-white/5 hover:border-emerald-500/20 transition-all flex flex-col justify-between"
                                        >
                                            <div className="flex items-center justify-between">
                                                 <div className="flex items-center gap-2.5">
                                                     <div className={`p-2 rounded-xl ${sig.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                         {sig.direction === 'BUY' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                     </div>
                                                     <div>
                                                         <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                                             {sig.asset}
                                                             <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
                                                                 {sig.timeframe}
                                                             </span>
                                                         </h4>
                                                         <span className="text-[10px] text-slate-400 font-medium">
                                                             {sig.pattern || 'SMC Setup'}
                                                         </span>
                                                     </div>
                                                 </div>
                                                 <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${sig.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                     {sig.direction}
                                                 </span>
                                             </div>

                                             <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-100/50 dark:bg-white/5 rounded-2xl p-2.5 font-mono text-xs">
                                                 <div>
                                                     <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Entry</span>
                                                     <span className="font-bold text-slate-800 dark:text-slate-200">
                                                         {sig.entry?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                                                     </span>
                                                 </div>
                                                 <div>
                                                     <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Take Profit</span>
                                                     <span className={`font-bold ${sig.direction === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                         {sig.takeProfit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                                                     </span>
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                    </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="relative group lg:max-w-4xl lg:mx-auto w-full"
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <TrendingUp size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analysis Core</span>
                        </div>

                        <div className="bg-white dark:bg-slate-950 p-6 sm:p-10 rounded-[40px] border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden transition-all duration-700 hover:shadow-emerald-500/5">
                             <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-30" />
                             
                            {error ? (
                                 <div className="min-h-[400px] flex flex-col items-center justify-center relative z-10">
                                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-3xl mb-8">
                                        <ErrorMessage message={error} />
                                    </div>
                                    <button
                                        onClick={handleReconnect}
                                        className="px-8 py-4 bg-rose-500 hover:bg-rose-400 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-rose-500/20 active:scale-95"
                                    >
                                        Restore Neural Link
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
                   </motion.div>
                </main>
            </motion.div>
            
            <footer className="w-full text-center mt-20 px-4 pb-12 text-slate-400 dark:text-slate-600">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-6 mb-6">
                        <div className="h-px w-12 bg-slate-100 dark:bg-slate-900" />
                        <Activity size={20} className="opacity-20 translate-y-1" />
                        <div className="h-px w-12 bg-slate-100 dark:bg-slate-900" />
                    </div>
                    <p className="max-w-sm mx-auto text-[9px] font-bold uppercase tracking-[0.4em] leading-loose opacity-60">
                        Operational parameters within bounds. Terminal status: <span className="text-emerald-500">Synchronized</span>.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;

