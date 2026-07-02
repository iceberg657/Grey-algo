import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Play, Database, TrendingUp, TrendingDown, Target, Loader2, Save, CheckCircle2, History, Activity, StopCircle } from 'lucide-react';
import { runHistoricalDeepBacktest, BacktestTradeResult, runMechanicalAnalysis } from '../utils/mechanicalBacktester';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AutoBacktestPanelProps {
    userId?: string;
}

export const AutoBacktestPanel: React.FC<AutoBacktestPanelProps> = ({ userId }) => {
    const [mode, setMode] = useState<'historical' | 'forward'>('historical');
    const [assets, setAssets] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('auto_backtest_assets');
            return saved ? JSON.parse(saved) : ['US30', 'NAS100', 'XAUUSD'];
        } catch { return ['US30', 'NAS100', 'XAUUSD']; }
    });
    const [newAsset, setNewAsset] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [results, setResults] = useState<BacktestTradeResult[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Forward Testing State
    const [isForwardTesting, setIsForwardTesting] = useState(() => {
        try {
            const saved = localStorage.getItem('auto_forward_testing');
            return saved ? JSON.parse(saved) : false;
        } catch { return false; }
    });
    const [forwardTrades, setForwardTrades] = useState<BacktestTradeResult[]>(() => {
        try {
            const saved = localStorage.getItem('auto_forward_trades');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('auto_backtest_assets', JSON.stringify(assets));
    }, [assets]);

    useEffect(() => {
        localStorage.setItem('auto_forward_testing', JSON.stringify(isForwardTesting));
    }, [isForwardTesting]);

    useEffect(() => {
        localStorage.setItem('auto_forward_trades', JSON.stringify(forwardTrades));
    }, [forwardTrades]);

    const getDerivSymbol = (asset: string) => {
        const normalized = asset.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        if (normalized === 'BTC' || normalized === 'BTCUSD' || normalized === 'CRYBTCUSD') return 'cryBTCUSD';
        if (normalized === 'ETH' || normalized === 'ETHUSD' || normalized === 'CRYETHUSD') return 'cryETHUSD';
        if (normalized === 'LTC' || normalized === 'LTCUSD' || normalized === 'CRYLTCUSD') return 'cryLTCUSD';

        if (normalized === 'US30' || normalized === 'DOWJONES' || normalized === 'OTCUS30' || normalized === 'OTCDJI') return 'OTC_DJI';
        if (normalized === 'US100' || normalized === 'NASDAQ' || normalized === 'NDX' || normalized === 'OTCNDX' || normalized === 'NAS100') return 'OTC_NDX';
        if (normalized === 'US500' || normalized === 'SP500' || normalized === 'SPC' || normalized === 'OTCSPC') return 'OTC_SPC';
        if (normalized === 'UK100' || normalized === 'FTSE' || normalized === 'OTCFTSE') return 'OTC_FTSE';
        if (normalized === 'GERMANY40' || normalized === 'GER40' || normalized === 'DAX' || normalized === 'DAX40') return 'OTC_DAX';
        if (normalized === 'FRANCE40' || normalized === 'FRA40' || normalized === 'CAC' || normalized === 'CAC40') return 'OTC_FCHI';
        if (normalized === 'JAPAN225' || normalized === 'JPN225' || normalized === 'N225' || normalized === 'NIKKEI') return 'OTC_N225';
        if (normalized === 'AUSTRALIA200' || normalized === 'AUS200' || normalized === 'ASX200') return 'OTC_AS51';
        if (normalized === 'EUROPE50' || normalized === 'ESTX50' || normalized === 'EU50') return 'OTC_SX5E';

        if (normalized === 'XAUUSD' || normalized === 'GOLD') return 'frxXAUUSD';
        if (normalized === 'XAGUSD' || normalized === 'SILVER') return 'frxXAGUSD';
        if (normalized === 'BRENT' || normalized === 'XBRUSD') return 'frxXBRUSD';
        if (normalized === 'WTI' || normalized === 'XTIUSD') return 'frxXTIUSD';

        if (normalized === 'EURUSD' || normalized === 'GBPUSD' || normalized === 'USDJPY' || normalized === 'USDCAD' || normalized === 'USDCHF' || normalized === 'AUDUSD' || normalized === 'NZDUSD' || normalized === 'EURGBP' || normalized === 'EURJPY' || normalized === 'GBPJPY') {
            return 'frx' + normalized;
        }

        return normalized;
    };

    const handleAddAsset = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newAsset.trim().toUpperCase();
        if (trimmed && assets.length < 10 && !assets.includes(trimmed)) {
            setAssets([...assets, trimmed]);
            setNewAsset('');
        }
    };

    const handleRemoveAsset = (asset: string) => {
        setAssets(assets.filter(a => a !== asset));
    };

    const timeframes = [
        { label: '5m', seconds: 300 },
        { label: '15m', seconds: 900 },
        { label: '30m', seconds: 1800 },
        { label: '1h', seconds: 3600 }
    ];

    const getClientToken = () => {
        let clientToken = '';
        try {
            const storedSettings = localStorage.getItem('greyquant_user_settings');
            if (storedSettings) {
                const parsed = JSON.parse(storedSettings);
                if (parsed.derivApiToken) clientToken = parsed.derivApiToken;
            }
        } catch (e) {
            console.warn('Could not read user settings for Deriv token');
        }
        return clientToken;
    };

    const runTests = async () => {
        if (assets.length === 0) return;
        setIsTesting(true);
        setResults([]);
        setSaveSuccess(false);

        const newResults: BacktestTradeResult[] = [];
        const clientToken = getClientToken();

        try {
            for (const asset of assets) {
                const symbol = getDerivSymbol(asset);
                for (const tf of timeframes) {
                    try {
                        const res = await fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${tf.seconds}&count=1000${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`);
                        const data = await res.json();
                        if (data && data.candles && data.candles.length > 50) {
                            const tradeResults = runHistoricalDeepBacktest(asset, tf.label, data.candles, 10);
                            newResults.push(...tradeResults);
                        }
                    } catch (e) {
                        console.warn(`Failed to fetch backtest data for ${asset} at ${tf.label}`, e);
                    }
                }
            }
            // Sort by entry time descending
            newResults.sort((a, b) => b.entryTime - a.entryTime);
            setResults(newResults);
        } catch (error) {
            console.error("Backtest Error:", error);
        } finally {
            setIsTesting(false);
        }
    };

    // --- Forward Testing Logic ---
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isForwardTesting) {
            // Check markets every 60 seconds
            interval = setInterval(async () => {
                const isMonday = new Date().getDay() === 1;
                const clientToken = getClientToken();

                for (const asset of assets) {
                    const symbol = getDerivSymbol(asset);
                    for (const tf of timeframes) {
                        try {
                            const res = await fetch(`/api/derivData?symbol=${symbol}&history=true&granularity=${tf.seconds}&count=60${clientToken ? `&token=${encodeURIComponent(clientToken)}` : ''}`);
                            const data = await res.json();
                            if (data && data.candles && data.candles.length > 50) {
                                const currentPrice = data.candles[data.candles.length - 1].close;
                                
                                setForwardTrades(prev => {
                                    const updated = [...prev];
                                    
                                    // 1. Check open trades for this asset/tf
                                    let hasOpenTrade = false;
                                    for (let i = 0; i < updated.length; i++) {
                                        const trade = updated[i];
                                        if (trade.outcome === 'OPEN' && trade.setup.asset === asset && trade.setup.timeframe === tf.label) {
                                            hasOpenTrade = true;
                                            const high = data.candles[data.candles.length - 1].high;
                                            const low = data.candles[data.candles.length - 1].low;
                                            
                                            // Check SL / TP
                                            let closed = false;
                                            if (trade.setup.direction === 'BUY') {
                                                if (low <= trade.setup.stopLoss) {
                                                    trade.outcome = 'LOSS';
                                                    trade.exitPrice = trade.setup.stopLoss;
                                                    closed = true;
                                                } else if (high >= trade.setup.takeProfit) {
                                                    trade.outcome = 'WIN';
                                                    trade.exitPrice = trade.setup.takeProfit;
                                                    closed = true;
                                                }
                                            } else if (trade.setup.direction === 'SELL') {
                                                if (high >= trade.setup.stopLoss) {
                                                    trade.outcome = 'LOSS';
                                                    trade.exitPrice = trade.setup.stopLoss;
                                                    closed = true;
                                                } else if (low <= trade.setup.takeProfit) {
                                                    trade.outcome = 'WIN';
                                                    trade.exitPrice = trade.setup.takeProfit;
                                                    closed = true;
                                                }
                                            }

                                            if (closed) {
                                                trade.exitTime = Date.now();
                                                const riskAmount = Math.abs(trade.setup.entryRange.min - trade.setup.stopLoss);
                                                trade.pnl = trade.outcome === 'WIN' ? (riskAmount * trade.setup.riskRewardRatio) : -riskAmount;
                                                
                                                // Save to firebase
                                                if (userId) {
                                                    addDoc(collection(db, 'users', userId, 'trade_journals'), {
                                                        tradeSetup: trade.setup.pattern,
                                                        asset: trade.setup.asset,
                                                        timeframe: trade.setup.timeframe,
                                                        direction: trade.setup.direction,
                                                        entryPrice: trade.setup.entryRange.min,
                                                        exitPrice: trade.exitPrice,
                                                        stopLoss: trade.setup.stopLoss,
                                                        takeProfit: trade.setup.takeProfit,
                                                        outcome: trade.outcome,
                                                        pnl: trade.pnl,
                                                        logic: trade.setup.logic,
                                                        isAutoBacktest: false,
                                                        isForwardTest: true,
                                                        entryTime: trade.entryTime,
                                                        exitTime: trade.exitTime,
                                                        timestamp: serverTimestamp()
                                                    }).catch(e => console.error("Error saving forward trade", e));
                                                }
                                            }
                                        }
                                    }

                                    // 2. If no open trade, check for new setups
                                    if (!hasOpenTrade) {
                                        // Count daily trades to enforce 10 trades per day limit across all assets
                                        const dailyTrades = updated.filter(t => new Date(t.entryTime).toDateString() === new Date().toDateString()).length;
                                        
                                        if (dailyTrades < 10) {
                                            const setup = runMechanicalAnalysis(asset, tf.label, data.candles, isMonday);
                                            if (setup.direction !== 'FLAT') {
                                                updated.unshift({
                                                    setup,
                                                    outcome: 'OPEN',
                                                    pnl: 0,
                                                    exitPrice: 0,
                                                    entryTime: Date.now(),
                                                    exitTime: 0
                                                });
                                            }
                                        }
                                    }
                                    
                                    return updated;
                                });
                            }
                        } catch (e) {
                            console.warn(`Forward Test: Failed to fetch data for ${asset}`, e);
                        }
                    }
                }
            }, 60000); // 1 minute polling
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isForwardTesting, assets, userId]);

    const savePatterns = async () => {
        if (results.length === 0 || !userId) return;
        setIsSaving(true);
        try {
            const batchPromises = results.map(trade => 
                addDoc(collection(db, 'users', userId, 'trade_journals'), {
                    tradeSetup: trade.setup.pattern,
                    asset: trade.setup.asset,
                    timeframe: trade.setup.timeframe,
                    direction: trade.setup.direction,
                    entryPrice: trade.setup.entryRange.min,
                    exitPrice: trade.exitPrice,
                    stopLoss: trade.setup.stopLoss,
                    takeProfit: trade.setup.takeProfit,
                    outcome: trade.outcome,
                    pnl: trade.pnl,
                    logic: trade.setup.logic,
                    isAutoBacktest: true,
                    entryTime: trade.entryTime,
                    exitTime: trade.exitTime,
                    timestamp: serverTimestamp()
                })
            );
            await Promise.all(batchPromises);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${userId}/trade_journals`);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate basic stats for Historical
    const totalTrades = results.length;
    const wins = results.filter(r => r.outcome === 'WIN').length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
    const totalPnL = results.reduce((sum, r) => sum + (r.pnl || 0), 0).toFixed(2);

    // Calculate stats for Forward
    const fTotalTrades = forwardTrades.length;
    const fWins = forwardTrades.filter(r => r.outcome === 'WIN').length;
    const fWinRate = fTotalTrades > 0 ? ((fWins / fTotalTrades) * 100).toFixed(1) : '0.0';
    const fTotalPnL = forwardTrades.reduce((sum, r) => sum + (r.pnl || 0), 0).toFixed(2);
    const fOpen = forwardTrades.filter(r => r.outcome === 'OPEN').length;

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                        <History className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mechanical Analysis Hub</h3>
                        <p className="text-xs text-slate-500 font-medium">Walk-forward simulation & Journal generation</p>
                    </div>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setMode('historical')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'historical' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Historical Backtest
                    </button>
                    <button
                        onClick={() => setMode('forward')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${mode === 'forward' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Live Forward Test
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tracked Assets ({assets.length}/10)</label>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {assets.map(asset => (
                            <span key={asset} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2">
                                {asset}
                                <button onClick={() => handleRemoveAsset(asset)} className="text-slate-400 hover:text-rose-500">&times;</button>
                            </span>
                        ))}
                    </div>
                    <form onSubmit={handleAddAsset} className="flex gap-2">
                        <input
                            type="text"
                            value={newAsset}
                            onChange={(e) => setNewAsset(e.target.value)}
                            disabled={assets.length >= 10 || isForwardTesting}
                            placeholder="Add asset (e.g., US30)"
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={assets.length >= 10 || !newAsset.trim() || isForwardTesting}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            Add
                        </button>
                    </form>
                </div>

                {mode === 'historical' ? (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <p className="text-xs text-slate-500 max-w-sm">
                                Simulates up to 10 sequential trades per day chronologically. 
                                Records entry/exit and automatically compiles trade journals for analysis.
                            </p>
                            <button
                                onClick={runTests}
                                disabled={isTesting || assets.length === 0}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isTesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                                Run Deep Backtest
                            </button>
                        </div>

                        <AnimatePresence>
                            {results.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6"
                                >
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                                        <div className="flex flex-wrap gap-4">
                                            <div className="text-center bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Trades</div>
                                                <div className="text-lg font-black text-slate-900 dark:text-white">{totalTrades}</div>
                                            </div>
                                            <div className="text-center bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Win Rate</div>
                                                <div className="text-lg font-black text-slate-900 dark:text-white">{winRate}%</div>
                                            </div>
                                            <div className="text-center bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Est. PnL</div>
                                                <div className={`text-lg font-black ${parseFloat(totalPnL) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {parseFloat(totalPnL) > 0 ? '+' : ''}{totalPnL}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={savePatterns}
                                            disabled={isSaving || saveSuccess}
                                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                                        >
                                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                            {saveSuccess ? 'Journaled' : 'Generate Journals for Embedding'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {results.map((res, i) => (
                                            <TradeCard key={i} res={res} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <p className="text-xs text-slate-500 max-w-sm">
                                Continuously monitors live data for 24 hours. Automatically executes strategies on new ticks and logs results to the trade journal database for embeddings.
                            </p>
                            <button
                                onClick={() => setIsForwardTesting(!isForwardTesting)}
                                disabled={assets.length === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 ${
                                    isForwardTesting 
                                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                }`}
                            >
                                {isForwardTesting ? (
                                    <>
                                        <StopCircle className="w-5 h-5" /> Stop Forward Test
                                    </>
                                ) : (
                                    <>
                                        <Activity className="w-5 h-5 animate-pulse" /> Start 24h Forward Test
                                    </>
                                )}
                            </button>
                        </div>

                        {isForwardTesting && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Forward Tester Active (Polling every 60s)</span>
                                </div>
                                <span className="text-xs font-black text-emerald-500">{fOpen} Open Trades</span>
                            </div>
                        )}

                        <AnimatePresence>
                            {forwardTrades.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6"
                                >
                                    <div className="flex flex-wrap gap-4 mb-6">
                                        <div className="text-center bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Signals</div>
                                            <div className="text-lg font-black text-slate-900 dark:text-white">{fTotalTrades}</div>
                                        </div>
                                        <div className="text-center bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Win Rate</div>
                                            <div className="text-lg font-black text-slate-900 dark:text-white">{fWinRate}%</div>
                                        </div>
                                        <div className="text-center bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Realized PnL</div>
                                            <div className={`text-lg font-black ${parseFloat(fTotalPnL) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {parseFloat(fTotalPnL) > 0 ? '+' : ''}{fTotalPnL}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {forwardTrades.map((res, i) => (
                                            <TradeCard key={i} res={res} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </div>
    );
};

const TradeCard = ({ res }: { res: BacktestTradeResult }) => (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex flex-col gap-3 relative overflow-hidden">
        {res.outcome === 'OPEN' && (
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rotate-45 translate-x-8 -translate-y-8" />
        )}
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${res.setup.direction === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {res.setup.direction}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{res.setup.asset} ({res.setup.timeframe})</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {new Date(res.entryTime).toLocaleString()}
                    </span>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white text-sm">{res.setup.pattern}</h5>
                {res.setup.strategyName && <div className="text-[10px] font-bold text-slate-500 mt-0.5">Strategy: {res.setup.strategyName}</div>}
                {res.setup.logic && <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1" title={res.setup.logic}>{res.setup.logic}</div>}
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${
                res.outcome === 'WIN' 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : res.outcome === 'LOSS'
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse'
            }`}>
                {res.outcome === 'OPEN' && <Activity className="w-3 h-3" />}
                {res.outcome}
            </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Entry</div>
                <div className="text-xs font-black text-slate-900 dark:text-white">{(res.setup.entryRange.min).toFixed(4)}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Exit Price</div>
                <div className="text-xs font-black text-slate-900 dark:text-white">{res.exitPrice ? (res.exitPrice).toFixed(4) : '--'}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">SL</div>
                <div className="text-xs font-black text-rose-500">{res.setup.stopLoss.toFixed(4)}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">TP</div>
                <div className="text-xs font-black text-emerald-500">{res.setup.takeProfit.toFixed(4)}</div>
            </div>
        </div>
        <div className="text-[10px] text-slate-500 italic mt-1">{res.setup.logic}</div>
    </div>
);
