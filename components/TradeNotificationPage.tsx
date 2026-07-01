import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Settings, Target, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import { UserMetadata } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { runMechanicalAnalysis } from '../utils/mechanicalBacktester';
import { ThemeToggleButton } from './ThemeToggleButton';

interface TradeNotificationPageProps {
    onBack: () => void;
    userMetadata: UserMetadata | null;
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
}

export const TradeNotificationPage: React.FC<TradeNotificationPageProps> = ({ onBack, userMetadata }) => {
    const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // Configuration State
    const [config, setConfig] = useState<NotificationConfig>(() => {
        try {
            const saved = localStorage.getItem('trade_notification_config');
            return saved ? JSON.parse(saved) : {
                assets: ['US30', 'NAS100', 'XAUUSD'],
                dailyLimit: 10,
                enabled: false,
                timeframes: ['15m'],
                tradingWindowStart: '00:00',
                tradingWindowEnd: '23:59',
                notificationLifetime: 3,
                riskReward: 2.0
            };
        } catch {
            return {
                assets: ['US30', 'NAS100', 'XAUUSD'],
                dailyLimit: 10,
                enabled: false,
                timeframes: ['15m'],
                tradingWindowStart: '00:00',
                tradingWindowEnd: '23:59',
                notificationLifetime: 3,
                riskReward: 2.0
            };
        }
    });

    const [newAsset, setNewAsset] = useState('');
    const [notifications, setNotifications] = useState<any[]>([]);

    const configRef = React.useRef(config);
    const notifsRef = React.useRef(notifications);

    useEffect(() => {
        configRef.current = config;
    }, [config]);

    useEffect(() => {
        notifsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        localStorage.setItem('trade_notification_config', JSON.stringify(config));
    }, [config]);

    const [engineStatus, setEngineStatus] = useState<{status: string, color: string, bg: string}>({status: 'Ready', color: 'text-emerald-500', bg: 'bg-emerald-500/10'});

    useEffect(() => {
        const interval = setInterval(() => {
            if (!config.enabled) {
                setEngineStatus({status: 'Engine Halted', color: 'text-slate-500', bg: 'bg-slate-500/10'});
                return;
            }
            
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = config.tradingWindowStart.split(':').map(Number);
            const [endH, endM] = config.tradingWindowEnd.split(':').map(Number);
            const startTotal = startH * 60 + startM;
            const endTotal = endH * 60 + endM;
            
            let isWithinWindow = false;
            if (startTotal <= endTotal) {
                isWithinWindow = currentTime >= startTotal && currentTime <= endTotal;
            } else {
                isWithinWindow = currentTime >= startTotal || currentTime <= endTotal;
            }
            
            if (!isWithinWindow) {
                setEngineStatus({status: 'Outside Trading Window', color: 'text-amber-500', bg: 'bg-amber-500/10'});
                return;
            }
            
            const todayStr = now.toDateString();
            const todaysNotifs = notifications.filter(n => {
                if (!n.timestamp) return false;
                const date = new Date(n.timestamp?.toMillis ? n.timestamp.toMillis() : n.timestamp);
                return date.toDateString() === todayStr;
            });
            
            if (todaysNotifs.length >= config.dailyLimit) {
                setEngineStatus({status: 'Daily Limit Reached', color: 'text-amber-500', bg: 'bg-amber-500/10'});
                return;
            }
            
            setEngineStatus({status: 'Scanning Market...', color: 'text-emerald-500', bg: 'bg-emerald-500/10 animate-pulse'});
        }, 1000);
        return () => clearInterval(interval);
    }, [config, notifications]);

    // Fetch Notifications History
    useEffect(() => {
        if (!userMetadata?.uid) return;
        const q = query(
            collection(db, 'users', userMetadata.uid, 'trade_notifications'),
            orderBy('timestamp', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifs);
        });
        return () => unsubscribe();
    }, [userMetadata?.uid]);

    // Main Engine Loop is now running globally via GlobalNotificationEngine at the app root level
    // to allow real-time background market scanning across all views.

    // Check for expired notifications
    useEffect(() => {
        const checkExpired = async () => {
            if (!userMetadata?.uid) return;
            const now = Date.now();
            const activeNotifs = notifications.filter(n => n.status === 'ACTIVE');
            
            for (const notif of activeNotifs) {
                if (now > notif.expiresAt) {
                    await updateDoc(doc(db, 'users', userMetadata.uid, 'trade_notifications', notif.id), {
                        status: 'MISSED'
                    });
                }
            }
        };

        const interval = setInterval(checkExpired, 10000);
        return () => clearInterval(interval);
    }, [notifications, userMetadata?.uid]);

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

    const handleAddAsset = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newAsset.trim().toUpperCase();
        if (trimmed && !config.assets.includes(trimmed) && config.assets.length < 10) {
            setConfig({ ...config, assets: [...config.assets, trimmed] });
            setNewAsset('');
        }
    };

    const handleRemoveAsset = (asset: string) => {
        if (config.assets.length > 3) {
            setConfig({ ...config, assets: config.assets.filter(a => a !== asset) });
        } else {
            alert('Minimum 3 assets required.');
        }
    };

    const handleToggleTimeframe = (tf: string) => {
        if (config.timeframes.includes(tf)) {
            if (config.timeframes.length > 1) {
                setConfig({ ...config, timeframes: config.timeframes.filter(t => t !== tf) });
            }
        } else {
            setConfig({ ...config, timeframes: [...config.timeframes, tf] });
        }
    };

    const markAsExecuted = async (id: string) => {
        if (!userMetadata?.uid) return;
        await updateDoc(doc(db, 'users', userMetadata.uid, 'trade_notifications', id), {
            status: 'EXECUTED'
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white font-sans transition-colors duration-300 pb-20">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-500" />
                        </button>
                        <div>
                            <h1 className="font-black uppercase tracking-widest text-lg flex items-center gap-2">
                                <Bell className="text-emerald-500" size={18} /> Trade Notifications
                            </h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                Live Algorithmic Broadcasts
                            </p>
                        </div>
                    </div>
                    <ThemeToggleButton />
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 mt-8">
                <div className="flex gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-0">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'config' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Settings size={14} /> Configuration Setup
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Bell size={14} /> Received Analysis
                        {notifications.filter(n => n.status === 'ACTIVE').length > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
                                {notifications.filter(n => n.status === 'ACTIVE').length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'config' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Config Panel */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-lg">System Parameters</h3>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={config.enabled}
                                        onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    />
                                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                    <span className="ml-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                                        {config.enabled ? 'Engine Active' : 'Engine Halted'}
                                    </span>
                                </label>
                            </div>

                            {/* Assets */}
                            <div className="mb-8">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                    Tracked Assets (Min 3, Max 10)
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {config.assets.map(asset => (
                                        <div key={asset} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <span className="text-xs font-bold">{asset}</span>
                                            <button 
                                                onClick={() => handleRemoveAsset(asset)}
                                                className="text-slate-400 hover:text-rose-500 ml-1"
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={handleAddAsset} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newAsset}
                                        onChange={(e) => setNewAsset(e.target.value)}
                                        disabled={config.assets.length >= 10}
                                        placeholder="Add asset (e.g. US30)"
                                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={config.assets.length >= 10 || !newAsset.trim()}
                                        className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-50"
                                    >
                                        Add
                                    </button>
                                </form>
                            </div>

                            {/* Daily Limit & Timeframes */}
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                        Daily Limit per Instrument
                                    </label>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="20" 
                                        value={config.dailyLimit}
                                        onChange={(e) => setConfig({...config, dailyLimit: parseInt(e.target.value)})}
                                        className="w-full accent-emerald-500"
                                    />
                                    <div className="text-center mt-2 font-bold">{config.dailyLimit} Signals / Instrument</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                        Notification Expiry
                                    </label>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="5" 
                                        value={config.notificationLifetime}
                                        onChange={(e) => setConfig({...config, notificationLifetime: parseInt(e.target.value)})}
                                        className="w-full accent-emerald-500"
                                    />
                                    <div className="text-center mt-2 font-bold">{config.notificationLifetime} Minutes</div>
                                </div>
                            </div>

                            {/* Timeframes */}
                            <div className="mb-8">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                    Timeframes Selection
                                </label>
                                <div className="flex gap-2">
                                    {['5m', '15m', '30m', '1h'].map(tf => (
                                        <button
                                            key={tf}
                                            onClick={() => handleToggleTimeframe(tf)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${config.timeframes.includes(tf) ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Trading Window */}
                            <div className="mb-8">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                    Trading Window (Local Time)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="time" 
                                        value={config.tradingWindowStart}
                                        onChange={(e) => setConfig({...config, tradingWindowStart: e.target.value})}
                                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-mono"
                                    />
                                    <span className="text-slate-400">to</span>
                                    <input 
                                        type="time" 
                                        value={config.tradingWindowEnd}
                                        onChange={(e) => setConfig({...config, tradingWindowEnd: e.target.value})}
                                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Risk Reward */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                    Risk : Reward Profile
                                </label>
                                <select 
                                    value={config.riskReward}
                                    onChange={(e) => setConfig({...config, riskReward: parseFloat(e.target.value)})}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="1">1:1</option>
                                    <option value="1.5">1:1.5</option>
                                    <option value="2">1:2</option>
                                    <option value="2.5">1:2.5</option>
                                    <option value="3">1:3</option>
                                    <option value="3.5">1:3.5</option>
                                    <option value="4">1:4</option>
                                    <option value="4.5">1:4.5</option>
                                    <option value="5">1:5</option>
                                </select>
                            </div>
                        </div>

                        {/* Summary / Stats */}
                        <div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                        <Target size={18} /> System Ready
                                    </h4>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${engineStatus.bg} ${engineStatus.color}`}>
                                        {engineStatus.status}
                                    </div>
                                </div>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300 opacity-80 leading-relaxed">
                                    The signal engine will continuously scan {config.assets.length} assets on {config.timeframes.length} timeframes between {config.tradingWindowStart} and {config.tradingWindowEnd}. 
                                    It will broadcast up to {config.dailyLimit} precise mechanical setups per instrument per day.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-400">No signals received yet</h3>
                                <p className="text-sm text-slate-500 mt-2">Make sure your engine is enabled in the configuration tab.</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={notif.id} 
                                    className={`p-6 rounded-3xl border ${
                                        notif.status === 'ACTIVE' 
                                            ? 'bg-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                                            : notif.status === 'MISSED'
                                            ? 'bg-rose-500/5 border-rose-500/20 opacity-70'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                                    }`}
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                                    notif.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                }`}>
                                                    {notif.direction}
                                                </span>
                                                <span className="text-sm font-bold">{notif.asset}</span>
                                                <span className="text-slate-400">•</span>
                                                <span className="text-sm font-bold text-slate-500">{notif.timeframe}</span>
                                            </div>
                                            <h4 className="font-bold text-lg">{notif.pattern}</h4>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                notif.status === 'ACTIVE' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse' :
                                                notif.status === 'MISSED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                            }`}>
                                                {notif.status}
                                            </div>
                                            <span className="text-xs font-mono text-slate-400">
                                                {new Date(notif.timestamp?.toMillis ? notif.timestamp.toMillis() : notif.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 bg-white/50 dark:bg-slate-950/50 rounded-2xl p-4 mb-4">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Entry Price</div>
                                            <div className="font-mono font-bold">{notif.entry.toFixed(4)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Stop Loss</div>
                                            <div className="font-mono font-bold text-rose-500">{notif.stopLoss.toFixed(4)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Take Profit (1:{notif.riskReward})</div>
                                            <div className="font-mono font-bold text-emerald-500">{notif.takeProfit.toFixed(4)}</div>
                                        </div>
                                    </div>

                                    {notif.status === 'ACTIVE' && (
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="text-xs font-bold text-yellow-500 flex items-center gap-1">
                                                <Clock size={14} /> 
                                                Expires in {Math.max(0, Math.ceil((notif.expiresAt - Date.now()) / 1000))}s
                                            </div>
                                            <button
                                                onClick={() => markAsExecuted(notif.id)}
                                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                            >
                                                Mark Executed
                                            </button>
                                        </div>
                                    )}
                                    {notif.status === 'MISSED' && (
                                        <div className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-2">
                                            <AlertTriangle size={14} /> Execution Gap: Missed opportunity.
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
