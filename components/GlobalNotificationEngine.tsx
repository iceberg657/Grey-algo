import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ArrowUpRight, ArrowDownRight, X, ChevronRight, Target } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { runMechanicalAnalysis } from '../utils/mechanicalBacktester';
import { UserMetadata } from '../types';
import { generateAntigravityResearch } from '../services/geminiService';

interface GlobalNotificationEngineProps {
    userMetadata: UserMetadata | null;
    onNavigateToNotifications: () => void;
}

interface NotificationConfig {
    assets: string[];
    dailyLimit: number;
    enabled: boolean;
    timeframes: string[];
    tradingWindowStart: string;
    tradingWindowEnd: string;
    notificationLifetime: number; // minutes
    riskReward: number;
    executionType?: 'Market Execution' | 'Limit / Stop Order';
    strategy?: string;
}

const DEFAULT_SESSION_ASSETS: Record<string, string[]> = {
    Asian: ['USDJPY', 'GBPJPY', 'EURJPY', 'AUDUSD', 'NZDUSD', 'BTCUSD', 'ETHUSD', 'LTCUSD'],
    London: ['EURUSD', 'GBPUSD', 'EURGBP', 'GBPJPY', 'EURJPY', 'GBPCHF', 'XAUUSD', 'UK100', 'Germany40', 'France40', 'Europe50'],
    'New York': ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'USDCHF', 'AUDUSD', 'XAUUSD', 'SILVER', 'BRENT', 'WTI', 'US30', 'NAS100', 'SPX500', 'BTCUSD', 'ETHUSD']
};

const getAllowedAssetsForCurrentSession = (
    utcHour: number, 
    settings: { asianAssets: string[]; londonAssets: string[]; nyAssets: string[] } | null
) => {
    const activeSessions: ('Asian' | 'London' | 'New York')[] = [];
    if (utcHour >= 0 && utcHour < 9) activeSessions.push('Asian');
    if (utcHour >= 7 && utcHour < 16) activeSessions.push('London');
    if (utcHour >= 12 && utcHour < 21) activeSessions.push('New York');

    const allowed = new Set<string>();

    const hasUserConfig = settings && (
        (settings.asianAssets && settings.asianAssets.length > 0) ||
        (settings.londonAssets && settings.londonAssets.length > 0) ||
        (settings.nyAssets && settings.nyAssets.length > 0)
    );

    if (activeSessions.length === 0) {
        return null;
    }

    if (hasUserConfig && settings) {
        activeSessions.forEach(session => {
            if (session === 'Asian' && settings.asianAssets) {
                settings.asianAssets.forEach(a => allowed.add(a.toUpperCase().replace(/[^A-Z0-9]/g, '')));
            }
            if (session === 'London' && settings.londonAssets) {
                settings.londonAssets.forEach(a => allowed.add(a.toUpperCase().replace(/[^A-Z0-9]/g, '')));
            }
            if (session === 'New York' && settings.nyAssets) {
                settings.nyAssets.forEach(a => allowed.add(a.toUpperCase().replace(/[^A-Z0-9]/g, '')));
            }
        });
    } else {
        activeSessions.forEach(session => {
            const defaults = DEFAULT_SESSION_ASSETS[session];
            if (defaults) {
                defaults.forEach(a => allowed.add(a.toUpperCase().replace(/[^A-Z0-9]/g, '')));
            }
        });
    }

    return Array.from(allowed);
};

export const GlobalNotificationEngine: React.FC<GlobalNotificationEngineProps> = ({ 
    userMetadata, 
    onNavigateToNotifications 
}) => {
    const [config, setConfig] = useState<NotificationConfig | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [activeToast, setActiveToast] = useState<any | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [userSettings, setUserSettings] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('greyquant_user_settings');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
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
                console.error('[GlobalNotificationEngine] Failed to sync settings', e);
            }
        };

        syncSettings();
        const interval = setInterval(syncSettings, 2000);
        return () => clearInterval(interval);
    }, [userSettings]);

    const configRef = useRef<NotificationConfig | null>(null);
    const notifsRef = useRef<any[]>([]);
    const [blueprintSettings, setBlueprintSettings] = useState<{
        asianAssets: string[];
        londonAssets: string[];
        nyAssets: string[];
    } | null>(null);
    const blueprintSettingsRef = useRef<typeof blueprintSettings>(null);

    useEffect(() => {
        configRef.current = config;
    }, [config]);

    useEffect(() => {
        notifsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        blueprintSettingsRef.current = blueprintSettings;
    }, [blueprintSettings]);

    // Subscribe to session/blueprint settings from Firestore
    useEffect(() => {
        if (!userMetadata?.uid) {
            setBlueprintSettings(null);
            return;
        }

        const blueprintDocRef = doc(db, 'users', userMetadata.uid, 'settings', 'blueprint');
        const unsubscribe = onSnapshot(blueprintDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBlueprintSettings({
                    asianAssets: data.asianAssets || [],
                    londonAssets: data.londonAssets || [],
                    nyAssets: data.nyAssets || []
                });
            } else {
                setBlueprintSettings({
                    asianAssets: [],
                    londonAssets: [],
                    nyAssets: []
                });
            }
        }, (err) => {
            console.error('[GlobalNotificationEngine] Failed to load blueprint settings:', err);
        });

        return () => unsubscribe();
    }, [userMetadata?.uid]);

    // 1. Sync Configuration from localStorage periodically (every 3s)
    useEffect(() => {
        const syncConfig = () => {
            try {
                const saved = localStorage.getItem('trade_notification_config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (JSON.stringify(parsed) !== JSON.stringify(configRef.current)) {
                        setConfig(parsed);
                    }
                } else {
                    // Fallback default config if not initialized yet
                    const defaultConfig: NotificationConfig = {
                        assets: ['US30', 'NAS100', 'XAUUSD'],
                        dailyLimit: 3,
                        enabled: false,
                        timeframes: ['5m', '15m'],
                        tradingWindowStart: '00:00',
                        tradingWindowEnd: '23:59',
                        notificationLifetime: 3,
                        riskReward: 1.5,
                        executionType: 'Market Execution',
                        strategy: 'trend'
                    };
                    localStorage.setItem('trade_notification_config', JSON.stringify(defaultConfig));
                    setConfig(defaultConfig);
                }
            } catch (e) {
                console.error('[GlobalNotificationEngine] Failed to sync config', e);
            }
        };

        syncConfig();
        const interval = setInterval(syncConfig, 3000);
        return () => clearInterval(interval);
    }, []);

    // Helper functions for scanner
    const getDerivSymbol = (asset: string) => {
        const normalized = asset.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (normalized === 'US30' || normalized === 'DOWJONES') return 'OTC_DJI';
        if (normalized === 'NAS100' || normalized === 'US100') return 'OTC_NDX';
        if (normalized === 'XAUUSD' || normalized === 'GOLD') return 'frxXAUUSD';
        if (normalized.match(/^(EUR|GBP|USD|JPY|AUD|NZD|CHF|CAD){2}$/)) return 'frx' + normalized;
        return normalized;
    };

    const getClientToken = () => {
        try {
            const stored = localStorage.getItem('greyquant_user_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.tradeNotificationDerivToken || parsed.derivApiToken || '';
            }
        } catch { return ''; }
        return '';
    };

    const playNotificationSound = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;
            
            // First tone
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            gain1.gain.setValueAtTime(0.5, now); // Increased from 0.12
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.15);
            
            // Second tone
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, now + 0.08); // A5
            gain2.gain.setValueAtTime(0.5, now + 0.08); // Increased from 0.12
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.35);
        } catch (err) {
            console.error('[GlobalNotificationEngine] Sound playback failed:', err);
        }
    };

    const showDeviceNotification = (notif: any) => {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`GreyAlpha Signal: ${notif.asset} (${notif.direction})`, {
                    body: `${notif.pattern || 'Setup Alert'} on ${notif.timeframe} timeframe.\nEntry Range: ${notif.entry?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                    icon: '/favicon.ico',
                    tag: notif.id
                });
            }
        } catch (err) {
            console.error('[GlobalNotificationEngine] Device notification failed:', err);
        }
    };

    // Auto-request notification permissions on mount if default
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(err => {
                console.error('[GlobalNotificationEngine] Permission request failed:', err);
            });
        }
    }, []);

    // 2. Fetch/Subscribe to active notifications subcollection
    useEffect(() => {
        if (!userMetadata?.uid) {
            setNotifications([]);
            return;
        }

        const q = query(
            collection(db, 'users', userMetadata.uid, 'trade_notifications'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (isInitialLoad) {
                setIsInitialLoad(false);
            } else {
                // Find newly added ones
                const addedDocs = snapshot.docChanges()
                    .filter(change => change.type === 'added')
                    .map(change => ({ id: change.doc.id, ...change.doc.data() }));

                const now = Date.now();
                // Filter for ACTIVE notifications added in the last 20 seconds
                const freshNotif = addedDocs.find((n: any) => {
                    const t = n.timestamp?.toMillis ? n.timestamp.toMillis() : n.timestamp || now;
                    return n.status === 'ACTIVE' && (now - t) < 20000;
                });

                if (freshNotif) {
                    setActiveToast(freshNotif);
                    if (userSettings.playSoundOnNotification !== false) {
                        playNotificationSound();
                    }
                    showDeviceNotification(freshNotif);
                }
            }
            setNotifications(notifs);
        }, (err) => {
            console.error('[GlobalNotificationEngine] Firestore onSnapshot failed:', err);
        });

        return () => unsubscribe();
    }, [userMetadata?.uid, isInitialLoad]);

    // 3. Main Scanning Engine Loop
    useEffect(() => {
        if (!userMetadata?.uid || !config || !config.enabled) return;

        const runScannerOnce = async () => {
            const currentConfig = configRef.current;
            const currentNotifs = notifsRef.current;
            if (!currentConfig || !currentConfig.enabled) return;

            // Check time window
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = currentConfig.tradingWindowStart.split(':').map(Number);
            const [endH, endM] = currentConfig.tradingWindowEnd.split(':').map(Number);
            const startTotal = startH * 60 + startM;
            const endTotal = endH * 60 + endM;

            let isWithinWindow = false;
            if (startTotal <= endTotal) {
                isWithinWindow = currentTime >= startTotal && currentTime <= endTotal;
            } else {
                isWithinWindow = currentTime >= startTotal || currentTime <= endTotal;
            }
            if (!isWithinWindow) return;

            // Filter today's notifications
            const todayStr = now.toDateString();
            const todaysNotifs = currentNotifs.filter(n => {
                if (!n.timestamp) return false;
                const date = new Date(n.timestamp?.toMillis ? n.timestamp.toMillis() : n.timestamp);
                return date.toDateString() === todayStr;
            });

            const isMonday = now.getDay() === 1;

            // Determine session-aware allowed assets for current hour
            const allowedSessionAssets = getAllowedAssetsForCurrentSession(now.getUTCHours(), blueprintSettingsRef.current);

            for (const asset of currentConfig.assets) {
                // Session-awareness check
                if (allowedSessionAssets && !allowedSessionAssets.includes(asset.toUpperCase().replace(/[^A-Z0-9]/g, ''))) {
                    console.log(`[GlobalNotificationEngine] Skipping ${asset} because it is not active in the current trading session(s).`);
                    continue;
                }

                // Check Daily Limit per asset (e.g. 10 signals per instrument daily)
                const todaysAssetNotifs = todaysNotifs.filter(n => n.asset === asset);
                if (todaysAssetNotifs.length >= currentConfig.dailyLimit) {
                    console.log(`[GlobalNotificationEngine] Daily limit of ${currentConfig.dailyLimit} reached today for ${asset}. Skipping.`);
                    continue;
                }

                // Ensure only one timeframe analysis is active per asset at any time
                const activeForAsset = currentNotifs.find(n => n.asset === asset && n.status === 'ACTIVE');
                if (activeForAsset) {
                    console.log(`[GlobalNotificationEngine] Active signal already exists for ${asset} on timeframe ${activeForAsset.timeframe}. Skipping scan.`);
                    continue;
                }

                const normalizedAsset = getDerivSymbol(asset);
                let triggeredForAssetThisCycle = false;

                for (const tf of currentConfig.timeframes) {
                    if (triggeredForAssetThisCycle) {
                        console.log(`[GlobalNotificationEngine] Already triggered signal for ${asset} in this cycle. Skipping timeframe ${tf}.`);
                        break;
                    }

                    const tfSeconds = tf === '1m' ? 60 : tf === '5m' ? 300 : tf === '15m' ? 900 : tf === '30m' ? 1800 : 3600;

                    try {
                        const clientToken = getClientToken();
                        const res = await fetch(`/api/derivTradeNotification?symbol=${normalizedAsset}&history=true&granularity=${tfSeconds}&count=500${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`, { cache: 'no-store' });
                        if (!res.ok) continue;
                        const data = await res.json();

                        if (data && data.candles && data.candles.length > 50) {
                            const setup = runMechanicalAnalysis(asset, tf, data.candles, isMonday, config.riskReward, 'notification', config.strategy || 'trend');

                            if (setup.direction !== 'FLAT') {
                                // Prevent duplicate or opposing notifications within a strict cooldown period for same asset/tf
                                const recentSignal = currentNotifs.find(n => 
                                    n.asset === asset && 
                                    n.timeframe === tf && 
                                    n.timestamp && 
                                    (Date.now() - (n.timestamp?.toMillis ? n.timestamp.toMillis() : n.timestamp)) < (tf === '1m' ? 300000 : 1800000) // 5 mins for 1m, 30 mins for others
                                );

                                if (!recentSignal) {
                                    const entry = setup.entryRange.min;
                                    const riskAmount = Math.abs(entry - setup.stopLoss);
                                    let adjustedTP = setup.takeProfit;

                                    if (setup.direction === 'BUY') {
                                        adjustedTP = entry + (riskAmount * currentConfig.riskReward);
                                    } else {
                                        adjustedTP = entry - (riskAmount * currentConfig.riskReward);
                                    }

                                    let antigravityVerdict = '';
                                    try {
                                        const mockQuantData = {
                                            trend: setup.direction === 'BUY' ? 'BULLISH' : 'BEARISH',
                                            weightedScore: { totalScore: 78 },
                                            orderflowMetrics: { imbalanceRatio: setup.direction === 'BUY' ? 1.4 : 0.7 },
                                            markovRegime: { currentRegime: 'High Volatility Trend' },
                                            liquiditySweep: setup.pattern.includes('Sweep') || setup.logic.includes('swept'),
                                            ote: { bullish: setup.direction === 'BUY' ? 'YES' : 'NO', bearish: setup.direction === 'SELL' ? 'YES' : 'NO' }
                                        };
                                        const queryStr = `Analyze scanning signal: Mechanical setup is a ${setup.direction} on ${asset} (${tf}) with entry range starting at ${entry}. Dynamic parameters are requested.`;
                                        antigravityVerdict = await generateAntigravityResearch(
                                            queryStr, 
                                            asset, 
                                            mockQuantData, 
                                            undefined, 
                                            `Signal context: Setup pattern detected was ${setup.pattern}. Detailed logical condition: ${setup.logic}. Timeframe is ${tf}. Execution model is ${currentConfig.executionType || 'Market Execution'}.`
                                        );
                                    } catch (err) {
                                        console.error('[GlobalNotificationEngine] Antigravity verification failed:', err);
                                        antigravityVerdict = 'Antigravity strategy mapping unavailable.';
                                    }

                                    const newNotif = {
                                        asset,
                                        timeframe: tf,
                                        direction: setup.direction,
                                        entry,
                                        stopLoss: setup.stopLoss,
                                        takeProfit: adjustedTP,
                                        pattern: setup.pattern,
                                        logic: setup.logic,
                                        strategyName: setup.strategyName,
                                        riskReward: currentConfig.riskReward,
                                        executionType: currentConfig.executionType || 'Market Execution',
                                        status: 'ACTIVE',
                                        timestamp: serverTimestamp(),
                                        expiresAt: Date.now() + (currentConfig.notificationLifetime * 60000),
                                        antigravityVerdict
                                    };

                                    await addDoc(collection(db, 'users', userMetadata.uid, 'trade_notifications'), newNotif);
                                    console.log(`[GlobalNotificationEngine] Added setup for ${asset} ${tf} with Antigravity verdict: ${setup.direction}`);
                                    
                                    triggeredForAssetThisCycle = true;
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[GlobalNotificationEngine] Scanner asset check failed:', asset, tf, e);
                    }
                }
            }
        };

        // Run scanner immediately on load or toggle enabled, then every 60s
        runScannerOnce();
        const interval = setInterval(runScannerOnce, 60000);
        return () => clearInterval(interval);
    }, [userMetadata?.uid, config?.enabled]);

    // 4. Check for Expired Notifications subcollection (every 10s)
    useEffect(() => {
        if (!userMetadata?.uid) return;

        const checkExpired = async () => {
            const now = Date.now();
            const activeNotifs = notifications.filter(n => n.status === 'ACTIVE');

            for (const notif of activeNotifs) {
                if (now > notif.expiresAt) {
                    try {
                        await updateDoc(doc(db, 'users', userMetadata.uid, 'trade_notifications', notif.id), {
                            status: 'MISSED'
                        });
                    } catch (e) {
                        console.error('[GlobalNotificationEngine] Failed to expire notification', notif.id, e);
                    }
                }
            }
        };

        const interval = setInterval(checkExpired, 10000);
        return () => clearInterval(interval);
    }, [notifications, userMetadata?.uid]);

    return (
        <AnimatePresence>
            {activeToast && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="fixed top-6 right-6 z-[9999] w-full max-w-sm overflow-hidden rounded-3xl bg-[#0b0f19] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] backdrop-blur-xl"
                >
                    {/* Glowing highlight bar based on signal direction */}
                    <div className={`h-1.5 w-full ${activeToast.direction === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    
                    <div className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center p-2.5 rounded-2xl ${activeToast.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {activeToast.direction === 'BUY' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                                        {activeToast.asset}
                                        <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded-full bg-white/5 uppercase tracking-wider">
                                            {activeToast.timeframe}
                                        </span>
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                        <Target size={12} className="text-emerald-500" />
                                        {activeToast.pattern || 'Mechanical Setup'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setActiveToast(null)}
                                className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 bg-white/5 rounded-2xl p-3 border border-white/5">
                            <div>
                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Entry Range</span>
                                <span className="text-xs font-bold text-slate-200 font-mono">
                                    {activeToast.entry?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Take Profit</span>
                                <span className={`text-xs font-bold font-mono ${activeToast.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {activeToast.takeProfit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                    LIVE SIGNAL
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setActiveToast(null);
                                    onNavigateToNotifications();
                                }}
                                className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors group"
                            >
                                Trade Terminal
                                <ChevronRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
