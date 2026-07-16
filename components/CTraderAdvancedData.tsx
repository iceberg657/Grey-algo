import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity, Database, Lock, Eye, BarChart3, TrendingUp, TrendingDown, ShieldAlert, Award, Zap } from 'lucide-react';
import { useAuthContext } from './contexts/AuthContext';
import { calculateL2OrderbookMetrics, detectAbsorptions, L2Metrics, AbsorptionLevel } from '../utils/orderflowEngine';

interface Props {
    symbol: string;
    onDepthUpdate?: (depth: { bids: [number, number][], asks: [number, number][] } | null) => void;
}

export const CTraderAdvancedData: React.FC<Props> = ({ symbol, onDepthUpdate }) => {
    const { userMetadata } = useAuthContext();
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
    const [spot, setSpot] = useState<{ bid?: number, ask?: number } | null>(null);
    const [depth, setDepth] = useState<{ bids: [number, number][], asks: [number, number][] } | null>(null);
    const [absorptions, setAbsorptions] = useState<AbsorptionLevel[]>([]);
    const [activeTab, setActiveTab] = useState<'book' | 'metrics' | 'stops' | 'absorptions'>('book');
    const [errorMsg, setErrorMsg] = useState('');
    const eventSourceRef = useRef<EventSource | null>(null);

    const isGranted = userMetadata?.access?.advancedStreaming === 'granted' || userMetadata?.role === 'admin';

    useEffect(() => {
        if (!isGranted || !symbol) return;

        const connectStream = () => {
            const token = localStorage.getItem('ctrader_access_token');
            const accountId = localStorage.getItem('ctrader_account_id');
            const environment = localStorage.getItem('ctrader_environment') || 'demo';

            if (!token || !accountId) {
                setStatus('error');
                setErrorMsg('cTrader not connected. Please connect in settings.');
                return;
            }

            const cleanSymbol = (raw: string) => {
                let clean = raw.toUpperCase().replace('/', '').replace('-', '');
                if (clean.startsWith('FRX')) {
                    clean = clean.substring(3);
                }
                if (clean === 'GOLD') return 'XAUUSD';
                if (clean === 'SILVER') return 'XAGUSD';
                if (clean === 'PLATINUM') return 'XPTUSD';
                if (clean === 'PALLADIUM') return 'XPDUSD';
                return clean;
            };
            const activeSymbol = cleanSymbol(symbol);

            // Fetch historical trendbars to compute historical absorption nodes
            fetch(`/api/ctrader/trendbars?symbol=${activeSymbol}&period=M1&accountId=${accountId}&environment=${environment}&count=60`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.candles) {
                    const abs = detectAbsorptions(data.candles);
                    setAbsorptions(abs);
                }
            })
            .catch(e => console.warn("[CTraderAdvancedData] Failed to fetch trendbars for absorptions:", e));

            setStatus('connecting');
            const url = `/api/ctrader/stream?token=${encodeURIComponent(token)}&accountId=${accountId}&environment=${environment}&symbols=${activeSymbol}`;
            
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'connected') {
                        setStatus('connected');
                    } else if (data.type === 'spot' && data.data) {
                        const spotData = data.data;
                        const bid = spotData.bidDecimal !== undefined ? spotData.bidDecimal : (spotData.bid ? spotData.bid / 100000 : undefined);
                        const ask = spotData.askDecimal !== undefined ? spotData.askDecimal : (spotData.ask ? spotData.ask / 100000 : undefined);
                        if (bid || ask) {
                            setSpot({ bid, ask });
                        }
                    } else if (data.type === 'depth' && data.data) {
                        const parsedDepth = {
                            bids: data.data.bids || [],
                            asks: data.data.asks || []
                        };
                        setDepth(parsedDepth);
                        if (onDepthUpdate) {
                            onDepthUpdate(parsedDepth);
                        }
                    } else if (data.type === 'error') {
                        setStatus('error');
                        setErrorMsg(data.error || 'Stream error');
                    }
                } catch (e) {
                    console.error("Parse error from stream:", e);
                }
            };

            es.onerror = () => {
                setStatus('error');
                setErrorMsg('Connection lost. Reconnecting...');
                es.close();
                setTimeout(connectStream, 5000); // Reconnect
            };
        };

        connectStream();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (onDepthUpdate) {
                onDepthUpdate(null);
            }
        };
    }, [symbol, isGranted]);

    if (!isGranted) {
        return (
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col items-center justify-center text-center opacity-70">
                <Lock className="text-slate-400 mb-3" size={24} />
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 dark:text-white mb-2">Advanced Streaming Locked</h4>
                <p className="text-xs font-medium text-slate-500 max-w-sm">
                    Access to cTrader Level 2 Orderbook, live ticks, and advanced spot tracking is disabled. Contact administrator for permissions.
                </p>
            </div>
        );
    }

    const currentPrice = spot?.bid || 0;
    const l2Metrics: L2Metrics = calculateL2OrderbookMetrics(depth, currentPrice);

    return (
        <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col gap-6 text-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                        <Database size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-widest text-white flex items-center gap-2">
                            cTrader Open API
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Level 2 Order Flow Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {status === 'connected' ? 'LIVE ORDER FLOW' : status}
                    </span>
                </div>
            </div>

            {errorMsg && status === 'error' && (
                <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-xl border border-red-500/20">
                    {errorMsg}
                </div>
            )}

            {/* Spot Pricing Ticker */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 bg-slate-900 border border-slate-800/60 p-4 rounded-2xl relative overflow-hidden">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Top of Book Bid</span>
                    <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">{spot?.bid ? spot.bid.toFixed(5) : '---'}</span>
                    <div className="absolute right-3 bottom-3 opacity-20 text-emerald-400"><TrendingUp size={16} /></div>
                </div>
                <div className="flex flex-col gap-1 bg-slate-900 border border-slate-800/60 p-4 rounded-2xl relative overflow-hidden">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Top of Book Ask</span>
                    <span className="text-xl font-black text-rose-400 font-mono tracking-tight">{spot?.ask ? spot.ask.toFixed(5) : '---'}</span>
                    <div className="absolute right-3 bottom-3 opacity-20 text-rose-400"><TrendingDown size={16} /></div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                <button 
                    onClick={() => setActiveTab('book')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'book' ? 'bg-slate-800 text-white shadow-md border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Orderbook
                </button>
                <button 
                    onClick={() => setActiveTab('metrics')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'metrics' ? 'bg-slate-800 text-white shadow-md border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Imbalance Ratio
                </button>
                <button 
                    onClick={() => setActiveTab('stops')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'stops' ? 'bg-slate-800 text-white shadow-md border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Stop Clusters
                </button>
                <button 
                    onClick={() => setActiveTab('absorptions')}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'absorptions' ? 'bg-slate-800 text-white shadow-md border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Absorptions
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[180px]">
                {/* 1. LEVEL 2 ORDERBOOK */}
                {activeTab === 'book' && (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-6">
                            {/* Bids */}
                            <div>
                                <div className="text-[10px] font-bold text-emerald-400 mb-2 border-b border-emerald-500/20 pb-1 uppercase tracking-wider flex justify-between">
                                    <span>Bids (SMC Support)</span>
                                    <span>Vol</span>
                                </div>
                                <div className="space-y-1.5">
                                    {depth?.bids && depth.bids.length > 0 ? (
                                        depth.bids.slice(0, 5).map((bid, i) => (
                                            <div key={i} className="flex justify-between text-xs font-mono">
                                                <span className="text-slate-400">{(bid[1] || 0).toLocaleString()}</span>
                                                <span className="text-emerald-400 font-bold">{bid[0].toFixed(5)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-slate-500 italic py-2">Waiting for bids...</div>
                                    )}
                                </div>
                            </div>
                            {/* Asks */}
                            <div>
                                <div className="text-[10px] font-bold text-rose-400 mb-2 border-b border-rose-500/20 pb-1 uppercase tracking-wider flex justify-between">
                                    <span>Ask Prices</span>
                                    <span>Vol</span>
                                </div>
                                <div className="space-y-1.5">
                                    {depth?.asks && depth.asks.length > 0 ? (
                                        depth.asks.slice(0, 5).map((ask, i) => (
                                            <div key={i} className="flex justify-between text-xs font-mono">
                                                <span className="text-rose-400 font-bold">{ask[0].toFixed(5)}</span>
                                                <span className="text-slate-400">{(ask[1] || 0).toLocaleString()}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-slate-500 italic py-2">Waiting for asks...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. ORDER FLOW IMBALANCE */}
                {activeTab === 'metrics' && (
                    <div className="flex flex-col gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-300">Imbalance Metrics</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${l2Metrics.skew === 'BULLISH_SUPPORT' ? 'bg-emerald-500/20 text-emerald-400' : l2Metrics.skew === 'BEARISH_RESISTANCE' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                                {l2Metrics.skew === 'BULLISH_SUPPORT' ? 'BULLISH SKEW' : l2Metrics.skew === 'BEARISH_RESISTANCE' ? 'BEARISH SKEW' : 'BALANCED'}
                            </span>
                        </div>

                        {/* Skew Percentage Bar */}
                        <div className="space-y-2 mt-2">
                            <div className="flex justify-between text-[11px] font-bold font-mono">
                                <span className="text-emerald-400">Bids: {((l2Metrics.bidDepth / (l2Metrics.bidDepth + l2Metrics.askDepth || 1)) * 100).toFixed(1)}%</span>
                                <span className="text-rose-400">Asks: {((l2Metrics.askDepth / (l2Metrics.bidDepth + l2Metrics.askDepth || 1)) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                                <div 
                                    className="h-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${(l2Metrics.bidDepth / (l2Metrics.bidDepth + l2Metrics.askDepth || 1)) * 100}%` }}
                                />
                                <div 
                                    className="h-full bg-rose-500 transition-all duration-300"
                                    style={{ width: `${(l2Metrics.askDepth / (l2Metrics.bidDepth + l2Metrics.askDepth || 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-800/80 pt-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bid Liquidity</span>
                                <span className="text-xs font-black font-mono mt-0.5">{l2Metrics.bidDepth.toLocaleString()} units</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ask Liquidity</span>
                                <span className="text-xs font-black font-mono mt-0.5">{l2Metrics.askDepth.toLocaleString()} units</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-relaxed mt-2 italic">
                            💡 **Predictive Edge:** An imbalance above 1.5x signifies institutional limit order support, absorbing market sellers and signaling an impending bullish rebound.
                        </p>
                    </div>
                )}

                {/* 3. STOP CLUSTERS / LIQUIDITY POOLS */}
                {activeTab === 'stops' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estimated Institutional Stop Clusters</span>
                            <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                                <ShieldAlert size={10} /> Liquidity Targets
                            </span>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {l2Metrics.detectedStopClusters && l2Metrics.detectedStopClusters.length > 0 ? (
                                l2Metrics.detectedStopClusters.map((cluster, i) => (
                                    <div key={i} className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${cluster.type === 'BUY_STOP_LIQUIDITY' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                                            <div>
                                                <div className="font-bold font-mono text-white">{cluster.price.toFixed(5)}</div>
                                                <div className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                                                    {cluster.type === 'BUY_STOP_LIQUIDITY' ? 'BUY STOPS' : 'SELL STOPS'} POOL
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cluster.probability === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                {cluster.probability} PROB
                                            </span>
                                            <div className="text-[9px] text-slate-400 font-mono mt-1">{(cluster.size).toLocaleString()} Lots</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-slate-500 italic text-center py-6">
                                    No stop clusters detected in near price range depth. Larger market sweep target indicators are plotting on the main chart profile.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. ABSORPTION DETECTION */}
                {activeTab === 'absorptions' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Order Flow Absorption Footprints</span>
                            <span className="text-[9px] text-violet-400 font-bold flex items-center gap-1">
                                <Award size={10} /> Institutional Soaking
                            </span>
                        </div>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {absorptions && absorptions.length > 0 ? (
                                absorptions.map((abs, i) => (
                                    <div key={i} className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded-lg ${abs.type === 'BULLISH_ABSORPTION' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                <Zap size={12} />
                                            </div>
                                            <div>
                                                <div className="font-bold font-mono text-white">{abs.price.toFixed(5)}</div>
                                                <div className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                                                    {abs.type === 'BULLISH_ABSORPTION' ? 'BULLISH' : 'BEARISH'} ABSORPTION LEVEL
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black font-mono text-indigo-400">
                                                {abs.strength}% STRENGTH
                                            </span>
                                            <div className="text-[9px] text-slate-400 font-mono mt-1">Vol: {Math.round(abs.volume).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-slate-500 italic text-center py-6">
                                    Scanning historical trendbar nodes for absorption footprints...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
